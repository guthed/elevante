import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { PracticeQuestion } from '@/lib/supabase/database';
import { generatePracticeTest } from '@/lib/ai/anthropic';
import { selectedLessons } from '@/lib/try/lessons';
import { signQuestions, stripAnswers } from '@/lib/try/token';
import { allow, clientKey } from '@/lib/try/ratelimit';

const Body = z.object({
  lessonIds: z.array(z.string()).min(1).max(6),
  locale: z.enum(['sv', 'en']).default('sv'),
});

const QUESTION_COUNT = 5;

export async function POST(req: Request) {
  if (!allow(clientKey(req, 'test'), 8, 60 * 60 * 1000)) {
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

  const { lessonIds, locale } = parsed.data;
  const lessons = selectedLessons(lessonIds);
  if (lessons.length === 0) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const generated = await generatePracticeTest(
    lessons.map((l) => ({ id: l.id, title: l.title[locale], transcript: l.transcript })),
    QUESTION_COUNT,
    locale,
  );

  if (!generated) {
    return NextResponse.json({ offline: true });
  }

  // Sätt stabila id:n (modellen sätter dem inte).
  const questions: PracticeQuestion[] = generated.map((q, i) => ({ ...q, id: `q${i + 1}` }));

  return NextResponse.json({
    questions: stripAnswers(questions),
    token: signQuestions(questions),
  });
}
