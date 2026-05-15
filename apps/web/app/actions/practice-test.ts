'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import type {
  PracticeAnswer,
  PracticeQuestion,
  PracticeSubmission,
  PracticeTest,
} from '@/lib/supabase/database';
import {
  generatePracticeTest as aiGenerateTest,
  gradePracticeTest as aiGradeTest,
  type PracticeGradeInput,
} from '@/lib/ai/anthropic';

const MIN_QUESTIONS = 4;
const MAX_QUESTIONS = 12;

/**
 * Provplugg-testprov: generera ett övningsprov från ett lektionsurval.
 * ~2 frågor per vald lektion, klampat till [4, 12]. Redirectar till
 * /provplugg/[id] vid framgång.
 */
export async function createPracticeTest(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.school_id) return;

  const courseId = (formData.get('course_id') ?? '').toString();
  const locale = ((formData.get('locale') ?? 'sv').toString()) as 'sv' | 'en';
  const lessonIds = formData
    .getAll('lesson_ids')
    .map((v) => v.toString())
    .filter(Boolean);
  if (!courseId || lessonIds.length === 0) return;

  const supabase = await createSupabaseServerClient();

  const { data: lessonRows } = await supabase
    .from('lessons')
    .select('id, title, transcript_text')
    .in('id', lessonIds)
    .eq('transcript_status', 'ready');

  const lessons = ((lessonRows ?? []) as {
    id: string;
    title: string | null;
    transcript_text: string | null;
  }[])
    .filter((l) => l.transcript_text && l.transcript_text.trim().length > 0)
    .map((l) => ({
      id: l.id,
      title: l.title,
      transcript: l.transcript_text as string,
    }));

  if (lessons.length === 0) return;

  const questionCount = Math.min(
    MAX_QUESTIONS,
    Math.max(MIN_QUESTIONS, lessons.length * 2),
  );

  const generated = await aiGenerateTest(lessons, questionCount);
  if (!generated || generated.length === 0) return;

  const questions: PracticeQuestion[] = generated.map((q, idx) => ({
    ...q,
    id: `q${idx + 1}`,
  }));
  const maxScore = questions.reduce((sum, q) => sum + q.max_points, 0);

  const { data: test, error } = await supabase
    .from('practice_tests')
    .insert({
      school_id: profile.school_id,
      user_id: profile.id,
      course_id: courseId,
      lesson_ids: lessons.map((l) => l.id),
      status: 'generated',
      questions,
      max_score: maxScore,
    })
    .select('id')
    .single();

  if (error || !test) return;

  redirect(`/${locale}/app/student/provplugg/${test.id}`);
}

export type SubmitTestResult = { ok: boolean };

/**
 * Rättar ett inlämnat testprov: flervalsfrågor deterministiskt i kod,
 * övriga via Claude. Sparar poäng + feedback och markerar provet 'graded'.
 */
export async function submitPracticeTest(
  testId: string,
  rawAnswers: { question_id: string; answer: string }[],
): Promise<SubmitTestResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };

  const supabase = await createSupabaseServerClient();
  const { data: testRow } = await supabase
    .from('practice_tests')
    .select('*')
    .eq('id', testId)
    .maybeSingle();

  const test = testRow as PracticeTest | null;
  if (!test) return { ok: false };
  if (test.status === 'graded') return { ok: true };

  const answerByQuestion = new Map(
    rawAnswers.map((a) => [a.question_id, a.answer ?? '']),
  );

  // Flervalsfrågor rättas deterministiskt; övriga samlas för AI-rättning.
  const gradeInputs: PracticeGradeInput[] = [];
  for (const q of test.questions) {
    if (q.type === 'multiple_choice') continue;
    gradeInputs.push({
      question_id: q.id,
      prompt: q.prompt,
      answer_key: q.answer_key,
      max_points: q.max_points,
      student_answer: answerByQuestion.get(q.id) ?? '',
    });
  }

  const aiResult = gradeInputs.length > 0 ? await aiGradeTest(gradeInputs) : null;
  const gradeByQuestion = new Map(
    (aiResult?.grades ?? []).map((g) => [g.question_id, g]),
  );

  const answers: PracticeAnswer[] = test.questions.map((q) => {
    const studentAnswer = answerByQuestion.get(q.id) ?? '';

    if (q.type === 'multiple_choice') {
      const selectedIndex = Number.parseInt(studentAnswer, 10);
      const correct =
        Number.isInteger(selectedIndex) && selectedIndex === q.correct_index;
      const chosenLabel =
        q.options && selectedIndex >= 0 && selectedIndex < q.options.length
          ? q.options[selectedIndex]!
          : '';
      return {
        question_id: q.id,
        answer: chosenLabel,
        points: correct ? q.max_points : 0,
        max_points: q.max_points,
        correct,
        feedback: correct
          ? `Rätt. ${q.answer_key}`
          : `Inte rätt. ${q.answer_key}`,
      };
    }

    const grade = gradeByQuestion.get(q.id);
    const points = grade ? Math.min(grade.points, q.max_points) : 0;
    return {
      question_id: q.id,
      answer: studentAnswer,
      points,
      max_points: q.max_points,
      correct: null,
      feedback: grade?.feedback ?? 'Kunde inte rättas automatiskt.',
    };
  });

  const score = answers.reduce((sum, a) => sum + a.points, 0);

  const submission: PracticeSubmission = {
    answers,
    overall_feedback: aiResult?.overall_feedback ?? '',
  };

  const { error } = await supabase
    .from('practice_tests')
    .update({
      status: 'graded',
      submission,
      score,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', testId);

  if (error) return { ok: false };

  revalidatePath(`/sv/app/student/provplugg/${testId}`);
  revalidatePath(`/en/app/student/provplugg/${testId}`);
  return { ok: true };
}

/** Eleven delar ett rättat prov med sin lärare. */
export async function sharePracticeTest(
  testId: string,
): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('practice_tests')
    .update({ shared_with_teacher: true, shared_at: new Date().toISOString() })
    .eq('id', testId)
    .eq('user_id', profile.id);

  if (error) return { ok: false };

  revalidatePath(`/sv/app/student/provplugg/${testId}`);
  revalidatePath(`/en/app/student/provplugg/${testId}`);
  return { ok: true };
}
