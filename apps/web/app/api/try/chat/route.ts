import { z } from 'zod';
import { anthropicIsConfigured, streamRagRaw } from '@/lib/ai/anthropic';
import { decodeAnswerSoFar } from '@/lib/ai/stream-json';
import { selectedLessons, toSegments, type TrySegment } from '@/lib/try/lessons';
import { allow, clientKey } from '@/lib/try/ratelimit';

const Body = z.object({
  question: z.string().trim().min(2).max(300),
  lessonIds: z.array(z.string()).min(1).max(6),
});

const STOP = new Set([
  'och','att','det','som','en','ett','är','på','för','med','av','de','den','i','vad',
  'hur','varför','när','om','till','från','man','kan','så','the','and','is','of','to',
  'a','in','what','why','how','when','does','do','blir','vid','en','för',
]);

function tokens(s: string): string[] {
  return s.toLowerCase().match(/[a-zåäö]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? [];
}

/**
 * Väljer det segment vars ord överlappar mest med svar + fråga + koncept.
 * `concepts` är lektionens svenska koncept-taggar som RAG-svaret rörde vid —
 * de bildar en språkbrygga så att citat hittas även när svaret är på engelska.
 */
function pickCitation(
  segments: TrySegment[],
  answer: string,
  question: string,
  concepts: string[] = [],
): { ts: string; quote: string } | null {
  const want = new Set([
    ...tokens(answer),
    ...tokens(question),
    ...concepts.flatMap((c) => tokens(c)),
  ]);
  if (want.size === 0) return null;
  let best: { ts: string; quote: string } | null = null;
  let bestScore = 0;
  for (const seg of segments) {
    const score = tokens(seg.text).reduce((n, w) => n + (want.has(w) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      const quote = seg.text.length > 180 ? seg.text.slice(0, 180).trimEnd() + '…' : seg.text;
      best = { ts: seg.ts, quote };
    }
  }
  return bestScore > 0 ? best : null;
}

const REFUSAL = /togs inte upp|inte upp på den här|wasn.?t covered|not covered in (this|the) lesson/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: Request) {
  if (!allow(clientKey(req, 'chat'), 20, 60 * 60 * 1000)) {
    return json({ error: 'rate_limited' }, 429);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const parsed = Body.safeParse(payload);
  if (!parsed.success) return json({ error: 'bad_request' }, 400);

  const { question, lessonIds } = parsed.data;
  const lessons = selectedLessons(lessonIds);
  if (lessons.length === 0) return json({ error: 'bad_request' }, 400);

  // Ingen AI-nyckel → icke-strömmande offline-svar (klienten faller tillbaka).
  if (!anthropicIsConfigured()) return json({ offline: true });

  const chunks = lessons.map((l) => ({
    lessonId: l.id,
    lessonTitle: l.title.sv,
    content: l.transcript,
  }));
  const lessonConcepts = [...new Set(lessons.flatMap((l) => l.concepts))];
  const segments = lessons.flatMap((l) => toSegments(l.transcript));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      let raw = '';
      let sent = '';
      try {
        // concise: kampanjsidan vill ha korta, skimbara svar — till skillnad
        // från app-chatten, som får fulla utläggningar.
        for await (const delta of streamRagRaw(question, chunks, lessonConcepts, {
          concise: true,
        })) {
          raw += delta;
          const soFar = decodeAnswerSoFar(raw);
          if (soFar.length > sent.length) {
            send({ type: 'delta', text: soFar.slice(sent.length) });
            sent = soFar;
          }
        }

        // Finalisera: parsa hela JSON:en för koncept + slutgiltigt svar.
        const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        let answer = sent;
        let concepts: string[] = [];
        try {
          const p = JSON.parse(cleaned) as { answer?: string; concepts?: unknown };
          if (typeof p.answer === 'string') answer = p.answer;
          if (Array.isArray(p.concepts)) {
            concepts = p.concepts.filter((c): c is string => typeof c === 'string').slice(0, 3);
          }
        } catch {
          // Behåll strömmad `sent` som svar om JSON inte gick att parsa.
        }
        // Skölj ut ev. rest om finalen är längre än det vi hann strömma.
        if (answer.length > sent.length) {
          send({ type: 'delta', text: answer.slice(sent.length) });
          sent = answer;
        }

        if (answer.length === 0) {
          send({ type: 'done', error: true });
        } else {
          const citation = REFUSAL.test(answer)
            ? null
            : pickCitation(segments, answer, question, concepts);
          send({ type: 'done', citation });
        }
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
