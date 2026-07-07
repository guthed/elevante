import { NextResponse } from 'next/server';
import { z } from 'zod';
import { answerWithRag } from '@/lib/ai/anthropic';
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
 * de bildar en språkbrygga så att citat hittas även när svaret är på engelska
 * (engelskt svar delar få ord med det svenska transkriptet, men koncepten är
 * alltid svenska och matchar transkriptet).
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

export async function POST(req: Request) {
  if (!allow(clientKey(req, 'chat'), 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const { question, lessonIds } = parsed.data;
  const lessons = selectedLessons(lessonIds);
  if (lessons.length === 0) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const chunks = lessons.map((l) => ({
    lessonId: l.id,
    lessonTitle: l.title.sv,
    content: l.transcript,
  }));
  const concepts = [...new Set(lessons.flatMap((l) => l.concepts))];

  const result = await answerWithRag(question, chunks, concepts);
  if (!result) {
    return NextResponse.json({ offline: true });
  }

  const isRefusal = REFUSAL.test(result.content);
  const segments = lessons.flatMap((l) => toSegments(l.transcript));

  return NextResponse.json({
    answer: result.content,
    citation: isRefusal
      ? null
      : pickCitation(segments, result.content, question, result.concepts),
  });
}
