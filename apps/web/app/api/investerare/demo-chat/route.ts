import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { answerWithRag } from '@/lib/ai/anthropic';
import { INVESTOR_COOKIE, verifySession } from '@/lib/investor-access';
import {
  DEMO_TRANSCRIPT,
  DEMO_LESSON_TITLE,
  DEMO_CONCEPTS,
  DEMO_SEGMENTS,
} from '@/app/investerare/demo-transcript';

// Stoppord som inte ska räknas vid citat-matchningen.
const STOP = new Set([
  'och','att','det','som','en','ett','är','på','för','med','av','de','den','i','vad',
  'hur','varför','när','om','till','från','man','kan','så','the','and','is','of','to',
  'a','in','what','why','how','when','does','do','är','blir','vid',
]);

function tokens(s: string): string[] {
  return s.toLowerCase().match(/[a-zåäö]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? [];
}

/** Väljer det transkript-segment vars ord överlappar mest med svar + fråga. */
function pickCitation(answer: string, question: string): { ts: string; quote: string } | null {
  const want = new Set([...tokens(answer), ...tokens(question)]);
  if (want.size === 0) return null;
  let best: { ts: string; quote: string } | null = null;
  let bestScore = 0;
  for (const seg of DEMO_SEGMENTS) {
    const score = tokens(seg.text).reduce((n, w) => n + (want.has(w) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      const quote = seg.text.length > 150 ? seg.text.slice(0, 150).trimEnd() + '…' : seg.text;
      best = { ts: seg.ts, quote };
    }
  }
  return bestScore > 0 ? best : null;
}

export async function POST(req: Request) {
  // Grind: i prod (när INVESTOR_DECK_SECRET satt) krävs giltig investerar-session,
  // precis som decket. I dev (ingen secret) är den öppen.
  const secret = process.env.INVESTOR_DECK_SECRET;
  if (secret) {
    const token = (await cookies()).get(INVESTOR_COOKIE)?.value;
    if (!(await verifySession(token))) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const question = (body as { question?: unknown })?.question;
  if (typeof question !== 'string' || question.trim().length < 2) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const q = question.trim().slice(0, 300);
  const result = await answerWithRag(
    q,
    [{ lessonId: 'demo-ekologi', lessonTitle: DEMO_LESSON_TITLE.sv, content: DEMO_TRANSCRIPT }],
    DEMO_CONCEPTS,
  );

  // answerWithRag returnerar null om Anthropic inte är konfigurerat.
  if (!result) {
    return NextResponse.json({ offline: true });
  }

  // Vid nekande svar (strikt RAG: frågan låg utanför lektionen) ska inget
  // källcitat visas — det vore missvisande.
  const isRefusal = /togs inte upp|inte upp på den här|wasn.?t covered|not covered in (this|the) lesson/i.test(
    result.content,
  );

  return NextResponse.json({
    answer: result.content,
    citation: isRefusal ? null : pickCitation(result.content, q),
  });
}
