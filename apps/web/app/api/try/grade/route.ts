import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { PracticeAnswer } from '@/lib/supabase/database';
import { gradePracticeTest } from '@/lib/ai/anthropic';
import { verifyQuestions } from '@/lib/try/token';
import { allow, clientKey } from '@/lib/try/ratelimit';

const Body = z.object({
  token: z.string().min(10),
  locale: z.enum(['sv', 'en']).default('sv'),
  answers: z
    .array(z.object({ question_id: z.string(), answer: z.string().max(1000) }))
    .min(1)
    .max(20),
});

export async function POST(req: Request) {
  if (!allow(clientKey(req, 'grade'), 8, 60 * 60 * 1000)) {
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

  const { token, locale, answers } = parsed.data;
  const questions = verifyQuestions(token);
  if (!questions) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const answerFor = new Map(answers.map((a) => [a.question_id, a.answer]));

  // Flerval rättas deterministiskt i kod.
  const graded: PracticeAnswer[] = [];
  const freeText: {
    question_id: string;
    prompt: string;
    answer_key: string;
    max_points: number;
    student_answer: string;
  }[] = [];

  for (const q of questions) {
    const given = (answerFor.get(q.id) ?? '').trim();
    if (q.type === 'multiple_choice') {
      const chosen = Number.parseInt(given, 10);
      const correct = Number.isInteger(chosen) && chosen === q.correct_index;
      graded.push({
        question_id: q.id,
        answer: given,
        points: correct ? q.max_points : 0,
        max_points: q.max_points,
        correct,
        feedback: '',
      });
    } else {
      freeText.push({
        question_id: q.id,
        prompt: q.prompt,
        answer_key: q.answer_key,
        max_points: q.max_points,
        student_answer: given,
      });
    }
  }

  let overallFeedback = '';
  if (freeText.length > 0) {
    const result = await gradePracticeTest(freeText, undefined, locale);
    if (!result) {
      // AI-rättningen gick inte att genomföra (saknad nyckel ELLER parse-fel).
      // Signalera det ärligt så klienten visar ett fel-läge — hellre det än en
      // påhittad nolla utan feedback, som ser ut som ett riktigt (uselt) betyg.
      return NextResponse.json({ offline: true });
    }
    overallFeedback = result.overall_feedback;
    const byId = new Map(result.grades.map((g) => [g.question_id, g]));
    for (const ft of freeText) {
      const g = byId.get(ft.question_id);
      graded.push({
        question_id: ft.question_id,
        answer: ft.student_answer,
        points: g ? Math.min(g.points, ft.max_points) : 0,
        max_points: ft.max_points,
        correct: null,
        feedback: g?.feedback ?? '',
      });
    }
  }

  // Sortera tillbaka i frågeordning.
  const order = new Map(questions.map((q, i) => [q.id, i]));
  graded.sort((a, b) => (order.get(a.question_id) ?? 0) - (order.get(b.question_id) ?? 0));

  const score = graded.reduce((s, a) => s + a.points, 0);
  const maxScore = questions.reduce((s, q) => s + q.max_points, 0);

  return NextResponse.json({ answers: graded, overallFeedback, score, maxScore });
}
