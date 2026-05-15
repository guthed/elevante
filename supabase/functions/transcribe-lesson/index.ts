// Elevante: transcribe-lesson Edge Function
//
// Triggas av en webhook när lessons.audio_path uppdateras (eller manuellt
// via en POST från mobilappen efter upload). Kör hela pipelinen:
//
//   1. Hämta lesson + audio från Storage
//   2. Anropa Berget AI Whisper för transkribering
//   3. Chunka transcript (~500 tecken per chunk, 80 tecken overlap)
//   4. Anropa Berget AI embeddings för varje chunk
//   5. Insert i public.lesson_chunks
//   6. Update lessons.transcript_text + transcript_status='ready'
//   7. Radera audio från Storage (GDPR — råljud raderas efter transkribering)
//
// Funktionen är ett SKELETON. Den kör helt utan externa anrop om
// BERGET_AI_API_KEY saknas — då markeras lektionen som 'failed' med
// en tydlig felmeddelande, så pipelinen kan testas end-to-end utan keys.
//
// Om request-body innehåller transcript_text används det direkt: stegen
// audio-download + Whisper hoppas över. Används för att seeda demo-lektioner
// med ett färdigt transkript (ingen ljudfil finns att radera då).

import { createClient } from 'npm:@supabase/supabase-js@2';

type RequestBody = { lesson_id?: string; transcript_text?: string };

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BERGET_KEY = Deno.env.get('BERGET_AI_API_KEY');
const BERGET_BASE = Deno.env.get('BERGET_AI_BASE_URL') ?? 'https://api.berget.ai/v1';
const TRANSCRIBE_MODEL =
  Deno.env.get('BERGET_AI_TRANSCRIBE_MODEL') ?? 'KBLab/kb-whisper-large';
const EMBED_MODEL =
  Deno.env.get('BERGET_AI_EMBED_MODEL') ?? 'intfloat/multilingual-e5-large';
const BUCKET = 'elevante-audio';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function chunkText(text: string, size = 500, overlap = 80): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const end = Math.min(i + size, cleaned.length);
    chunks.push(cleaned.slice(i, end));
    if (end >= cleaned.length) break;
    i = end - overlap;
  }
  return chunks;
}

async function transcribeAudio(audio: Blob, filename: string): Promise<string> {
  if (!BERGET_KEY) {
    throw new Error('BERGET_AI_API_KEY saknas — kan inte transkribera');
  }
  const form = new FormData();
  form.append('file', audio, filename);
  form.append('model', TRANSCRIBE_MODEL);
  form.append('language', 'sv');
  form.append('response_format', 'json');

  const res = await fetch(`${BERGET_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${BERGET_KEY}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Berget transcribe failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { text?: string };
  return json.text ?? '';
}

async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (!BERGET_KEY || inputs.length === 0) return [];
  const res = await fetch(`${BERGET_BASE}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BERGET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });
  if (!res.ok) {
    throw new Error(`Berget embed failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { data?: { embedding: number[] }[] };
  return json.data?.map((d) => d.embedding) ?? [];
}

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-5-20250929';

const LESSON_CONTENT_SYSTEM_PROMPT = `Du är Elevante — en varm mentor som var med på lektionen och hjälper elever förstå vad som hände.

Du får ett transkript från en lektion. Ditt jobb är att:
1. Skriva en varm, kort sammanfattning (3-5 meningar) som om du pratar med eleven
2. Föreslå exakt två startfrågor som hjälper eleven börja utforska innehållet
3. Extrahera ett kort ämne (max 6 ord) som kan användas i lektionens titel
4. Lista 5-8 nyckelkoncept som behandlas i lektionen — de begrepp eleverna ska kunna efter lektionen

REGLER:
- Sammanfattningen är 3-5 meningar, max cirka 400 tecken
- Använd warm mentor-ton: "Idag handlade lektionen om...", "Anna gick igenom..."
- Hänvisa till läraren med förnamn när det framgår av transkriptet
- Citera lärarens egna konkreta exempel där möjligt
- Hitta ALDRIG på fakta som inte finns i transkriptet
- Frågor är pedagogiska ("Förklara skillnaden mellan...", "Beskriv hur...")
- Frågorna måste vara besvarbara enbart från transkriptet
- Ämnet är kort och deskriptivt (t.ex. "Ekosystem och näringsvävar")
- Koncepten är 1-4 ord vardera (t.ex. "Näringspyramid", "Biotiska faktorer", "Energiflöde")
- Koncept är nominalfraser eller substantiv, inte hela meningar

Svara ENDAST med valid JSON i detta format, ingen annan text:
{"topic": "<kort ämne>", "summary": "<3-5 meningar>", "questions": ["<fråga 1>", "<fråga 2>"], "concepts": ["<koncept 1>", "<koncept 2>", "<koncept 3>", "<koncept 4>", "<koncept 5>"]}`;

type LessonContent = {
  topic: string;
  summary: string;
  questions: [string, string];
  concepts: string[];
};

async function generateLessonContent(
  transcript: string,
  teacherName: string | null,
): Promise<LessonContent | null> {
  if (!ANTHROPIC_KEY) return null;

  const userMessage = teacherName
    ? `Lärare: ${teacherName}\n\nTranskript:\n${transcript}`
    : `Transkript:\n${transcript}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: LESSON_CONTENT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic lesson content failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { content?: { text?: string }[] };
  const raw = json.content?.[0]?.text ?? '';
  // Claude wrappar ibland JSON i ```json ... ``` trots instruktion — strippa fences
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned) as LessonContent;

  if (
    typeof parsed.topic !== 'string' ||
    typeof parsed.summary !== 'string' ||
    !Array.isArray(parsed.questions) ||
    parsed.questions.length !== 2 ||
    !Array.isArray(parsed.concepts) ||
    parsed.concepts.length < 4 ||
    parsed.concepts.length > 10 ||
    !parsed.concepts.every((c: unknown) => typeof c === 'string')
  ) {
    throw new Error('Anthropic response failed validation');
  }
  return parsed;
}

async function processLesson(
  lessonId: string,
  providedTranscript?: string,
): Promise<{ ok: boolean; detail: string }> {
  // 1. Hämta lesson
  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('id, school_id, audio_path, transcript_status, teacher_id, recorded_at, course_id')
    .eq('id', lessonId)
    .single();

  if (lessonErr || !lesson) {
    return { ok: false, detail: `Lesson not found: ${lessonErr?.message ?? lessonId}` };
  }
  if (!providedTranscript && !lesson.audio_path) {
    return { ok: false, detail: 'Lesson har varken audio_path eller transcript_text' };
  }

  let teacherName: string | null = null;
  if (lesson?.teacher_id) {
    const { data: teacher } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', lesson.teacher_id)
      .maybeSingle();
    teacherName = teacher?.full_name ?? null;
  }

  let courseName: string | null = null;
  if (lesson?.course_id) {
    const { data: course } = await supabase
      .from('courses')
      .select('name')
      .eq('id', lesson.course_id)
      .maybeSingle();
    courseName = course?.name ?? null;
  }

  // Markera processing
  await supabase
    .from('lessons')
    .update({ transcript_status: 'processing' })
    .eq('id', lessonId);

  try {
    let transcript: string;

    if (providedTranscript) {
      // Demo-seedning: transkriptet är redan färdigt, hoppa över ljud/Whisper.
      transcript = providedTranscript.trim();
      if (!transcript) {
        throw new Error('transcript_text är tomt');
      }
    } else {
      // 2. Hämta audio från Storage
      const { data: audioData, error: storageErr } = await supabase.storage
        .from(BUCKET)
        .download(lesson.audio_path!);
      if (storageErr || !audioData) {
        throw new Error(`Storage download failed: ${storageErr?.message}`);
      }

      // 3. Transkribera
      transcript = await transcribeAudio(
        audioData,
        lesson.audio_path!.split('/').pop() ?? 'audio.m4a',
      );
      if (!transcript) {
        throw new Error('Transcript är tom');
      }
    }

    // 4. Chunka
    const chunks = chunkText(transcript);
    if (chunks.length === 0) {
      throw new Error('Inga chunks att embedda');
    }

    // 5. Embeddings (batch om Berget stöder det, annars sekvensiellt)
    const embeddings = await embedTexts(chunks);
    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding-count mismatch: ${embeddings.length} vs ${chunks.length} chunks`,
      );
    }

    // 6. Spara lesson_chunks
    const chunkRows = chunks.map((content, idx) => ({
      lesson_id: lessonId,
      school_id: lesson.school_id,
      chunk_index: idx,
      content,
      embedding: embeddings[idx],
    }));
    const { error: insertErr } = await supabase
      .from('lesson_chunks')
      .insert(chunkRows);
    if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);

    // 6.5. AI-genererad sammanfattning, frågor, ämne och koncept
    let contentTitle: string | null = null;
    let contentSummary: string | null = null;
    let contentQuestions: string[] = [];
    let contentTopic: string | null = null;
    let contentConcepts: string[] = [];

    try {
      const content = await generateLessonContent(transcript, teacherName);
      if (content) {
        contentTopic = content.topic;
        contentSummary = content.summary;
        contentQuestions = content.questions;
        contentConcepts = content.concepts;

        const dateBasis = lesson.recorded_at ?? new Date().toISOString();
        const dateLabel = new Intl.DateTimeFormat('sv-SE', {
          day: 'numeric',
          month: 'long',
        }).format(new Date(dateBasis));
        contentTitle = `${dateLabel} — ${content.topic}`;
      }
    } catch (err) {
      console.error('Lesson content generation failed:', err);
      // Inte fatalt — gå vidare utan summary, fallback titel sätts nedan
      if (!contentTitle) {
        const dateBasis = lesson.recorded_at ?? new Date().toISOString();
        const dateLabel = new Intl.DateTimeFormat('sv-SE', {
          day: 'numeric',
          month: 'long',
        }).format(new Date(dateBasis));
        contentTitle = courseName ? `${dateLabel} — ${courseName}` : dateLabel;
      }
    }

    // 7. Uppdatera lessons med transcript_text och status
    await supabase
      .from('lessons')
      .update({
        transcript_text: transcript,
        transcript_updated_at: new Date().toISOString(),
        transcript_status: 'ready',
        summary: contentSummary,
        suggested_questions: contentQuestions,
        ai_generated_topic: contentTopic,
        concepts: contentConcepts,
        ...(contentTitle ? { title: contentTitle } : {}),
      })
      .eq('id', lessonId);

    // 8. Radera audio från Storage (GDPR) — bara om en ljudfil faktiskt fanns
    if (lesson.audio_path) {
      await supabase.storage.from(BUCKET).remove([lesson.audio_path]);
      await supabase
        .from('lessons')
        .update({ audio_path: null })
        .eq('id', lessonId);
    }

    return { ok: true, detail: `Transcribed ${chunks.length} chunks` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await supabase
      .from('lessons')
      .update({ transcript_status: 'failed' })
      .eq('id', lessonId);
    return { ok: false, detail: msg };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!body.lesson_id) {
    return new Response(JSON.stringify({ error: 'lesson_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = await processLesson(body.lesson_id, body.transcript_text);
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
