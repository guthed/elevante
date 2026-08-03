import { z } from 'zod';
import { streamRagRaw } from '@/lib/ai/anthropic';
import { decodeAnswerSoFar, parseRagJson } from '@/lib/ai/stream-json';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import type { ChatSource } from '@/lib/supabase/database';
import {
  getPersonaSummary,
  mockedAnswer,
  refusalFor,
  retrieveContext,
  sourcesFrom,
  type ScopeContext,
} from '@/lib/rag/retrieve';

// Strömmande svar för app-chatten. Ersätter den blockerande vägen genom
// sendMessage(): Claude-anropet tar ~16s, och utan streaming såg eleven en tom
// "Skickar…" hela tiden. Nu syns första ordet efter ~1–2s.
//
// Cookie-scope: ALL Supabase-åtkomst som behöver cookies() sker innan strömmen
// returneras. Klienten som skapas här stänger om cookieStore, så den kan
// återanvändas inuti ReadableStream utan att cookies() anropas på nytt.

const Body = z.object({
  chatId: z.string().uuid(),
  question: z.string().trim().min(1).max(2000),
  /** True när frågan redan ligger i databasen (startChat redirectar direkt). */
  resume: z.boolean().optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return json({ error: 'unauthorized' }, 401);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const parsed = Body.safeParse(payload);
  if (!parsed.success) return json({ error: 'bad_request' }, 400);
  const { chatId, resume } = parsed.data;

  const supabase = await createSupabaseServerClient();

  // RLS gör att en elev bara ser sina egna chattar — en träff är ett ägarskapsbevis.
  const { data: chat } = await supabase
    .from('chats')
    .select('id, scope, lesson_id, course_id, lesson_ids')
    .eq('id', chatId)
    .maybeSingle();
  if (!chat) return json({ error: 'unauthorized' }, 401);

  let question = parsed.data.question;

  if (resume) {
    // Återupptagning: frågan ligger redan i databasen. Läs den därifrån i
    // stället för att lita på klienten, och vägra om den redan är besvarad —
    // annars kan resume-flaggan användas för att generera svar i oändlighet.
    const { data: last } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last || last.role !== 'user') return json({ error: 'bad_request' }, 400);
    question = last.content;
  } else {
    const { error: userInsertError } = await supabase
      .from('chat_messages')
      .insert({ chat_id: chatId, role: 'user', content: question });
    if (userInsertError) return json({ error: 'generic' }, 500);
  }

  const scopeContext: ScopeContext = {
    scope: chat.scope,
    lessonId: chat.lesson_id,
    courseId: chat.course_id,
    lessonIds: chat.lesson_ids,
  };

  const [personaSummary, retrieved] = await Promise.all([
    getPersonaSummary(profile.id),
    retrieveContext(question, scopeContext),
  ]);

  /** Skriver ner svaret och håller chatten uppdaterad. Körs efter att strömmen tömts. */
  async function persist(content: string, sources: ChatSource[], concepts: string[]) {
    await supabase.from('chat_messages').insert({
      chat_id: chatId,
      role: 'assistant',
      content,
      sources,
      concepts,
    });

    if (concepts.length > 0) {
      const { data: latestUserMsg } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('chat_id', chatId)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestUserMsg?.id) {
        await supabase
          .from('chat_messages')
          .update({ concepts })
          .eq('id', latestUserMsg.id);
      }
    }

    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        // Utan AI-nycklar: mockat svar i ett svep, så klienten har en enda kodväg.
        if (retrieved === null) {
          const mock = await mockedAnswer(question, scopeContext);
          send({ type: 'delta', text: mock.content });
          await persist(mock.content, mock.sources, mock.concepts);
          send({ type: 'done', sources: mock.sources });
          return;
        }

        // Inget relevant i elevens urval — refusal utan att blanda in modellen.
        if (retrieved.chunks.length === 0) {
          const text = refusalFor(scopeContext.scope);
          send({ type: 'delta', text });
          await persist(text, [], []);
          send({ type: 'done', sources: [] });
          return;
        }

        let raw = '';
        let sent = '';
        for await (const delta of streamRagRaw(
          question,
          retrieved.chunks,
          retrieved.lessonConcepts,
          { personaSummary },
        )) {
          raw += delta;
          const soFar = decodeAnswerSoFar(raw);
          if (soFar.length > sent.length) {
            send({ type: 'delta', text: soFar.slice(sent.length) });
            sent = soFar;
          }
        }

        const { answer, concepts } = parseRagJson(raw);
        const content = answer ?? sent;
        if (content.length > sent.length) {
          send({ type: 'delta', text: content.slice(sent.length) });
          sent = content;
        }

        if (content.length === 0) {
          send({ type: 'done', error: true });
          return;
        }

        const sources = sourcesFrom(retrieved.chunks);
        await persist(content, sources, concepts);
        send({ type: 'done', sources });
      } catch {
        send({ type: 'done', error: true });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
