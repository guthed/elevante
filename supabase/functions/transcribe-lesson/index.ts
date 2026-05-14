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

import { createClient } from 'npm:@supabase/supabase-js@2';

type RequestBody = { lesson_id?: string };

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

async function processLesson(lessonId: string): Promise<{ ok: boolean; detail: string }> {
  // 1. Hämta lesson
  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('id, school_id, audio_path, transcript_status')
    .eq('id', lessonId)
    .single();

  if (lessonErr || !lesson) {
    return { ok: false, detail: `Lesson not found: ${lessonErr?.message ?? lessonId}` };
  }
  if (!lesson.audio_path) {
    return { ok: false, detail: 'Lesson har ingen audio_path' };
  }

  // Markera processing
  await supabase
    .from('lessons')
    .update({ transcript_status: 'processing' })
    .eq('id', lessonId);

  try {
    // 2. Hämta audio från Storage
    const { data: audioData, error: storageErr } = await supabase.storage
      .from(BUCKET)
      .download(lesson.audio_path);
    if (storageErr || !audioData) {
      throw new Error(`Storage download failed: ${storageErr?.message}`);
    }

    // 3. Transkribera
    const transcript = await transcribeAudio(
      audioData,
      lesson.audio_path.split('/').pop() ?? 'audio.m4a',
    );
    if (!transcript) {
      throw new Error('Transcript är tom');
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

    // 7. Uppdatera lessons med transcript_text och status
    await supabase
      .from('lessons')
      .update({
        transcript_text: transcript,
        transcript_updated_at: new Date().toISOString(),
        transcript_status: 'ready',
      })
      .eq('id', lessonId);

    // 8. Radera audio från Storage (GDPR)
    await supabase.storage.from(BUCKET).remove([lesson.audio_path]);
    await supabase
      .from('lessons')
      .update({ audio_path: null })
      .eq('id', lessonId);

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

  const result = await processLesson(body.lesson_id);
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
