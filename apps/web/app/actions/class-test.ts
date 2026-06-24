'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from '@/lib/supabase/server';
import type {
  ClassTest,
  PracticeQuestion,
  PracticeQuestionType,
  TestComposition,
} from '@/lib/supabase/database';
import {
  generateClassTest,
  regenerateClassTestQuestion,
  type ClassTestComposition,
} from '@/lib/ai/anthropic';

const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 20;

const createSchema = z.object({
  classId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  lessonIds: z.array(z.string().uuid()).min(1),
  total: z.number().int().min(MIN_QUESTIONS).max(MAX_QUESTIONS),
  closedPct: z.number().int().min(0).max(100),
  openPct: z.number().int().min(0).max(100),
  reasoningPct: z.number().int().min(0).max(100),
  locale: z.enum(['sv', 'en']),
});

/**
 * Räknar om andelar (%) till heltal per typ, summerar till `total`.
 * Largest-remainder så att summan blir exakt total.
 */
function compositionFromPercentages(
  total: number,
  closedPct: number,
  openPct: number,
  reasoningPct: number,
): { closed: number; open: number; reasoning: number } {
  const sum = closedPct + openPct + reasoningPct || 1;
  const raw = {
    closed: (closedPct / sum) * total,
    open: (openPct / sum) * total,
    reasoning: (reasoningPct / sum) * total,
  };
  const floored = {
    closed: Math.floor(raw.closed),
    open: Math.floor(raw.open),
    reasoning: Math.floor(raw.reasoning),
  };
  let remaining = total - (floored.closed + floored.open + floored.reasoning);
  type CompositionKey = 'closed' | 'open' | 'reasoning';
  const order: CompositionKey[] = ['closed', 'open', 'reasoning'];
  order.sort(
    (a: CompositionKey, b: CompositionKey) =>
      raw[b] - floored[b] - (raw[a] - floored[a]),
  );
  for (const key of order) {
    if (remaining <= 0) break;
    floored[key] += 1;
    remaining -= 1;
  }
  return floored;
}

/**
 * Skapar ett klassprov-utkast: genererar frågor från valda lektioners
 * transkript enligt typ-fördelningen och redirectar till editorn.
 */
export async function createClassTestDraft(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.school_id) return;
  if (profile.role !== 'teacher' && profile.role !== 'admin') return;

  const parsed = createSchema.safeParse({
    classId: formData.get('class_id')?.toString(),
    title: formData.get('title')?.toString() ?? '',
    lessonIds: formData.getAll('lesson_ids').map((v) => v.toString()),
    total: Number(formData.get('total')),
    closedPct: Number(formData.get('closed_pct')),
    openPct: Number(formData.get('open_pct')),
    reasoningPct: Number(formData.get('reasoning_pct')),
    locale: formData.get('locale')?.toString() ?? 'sv',
  });
  if (!parsed.success) return;
  const input = parsed.data;

  const supabase = await createSupabaseServerClient();

  const { data: lessonRows } = await supabase
    .from('lessons')
    .select('id, title, transcript_text')
    .in('id', input.lessonIds)
    .eq('class_id', input.classId)
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

  const counts = compositionFromPercentages(
    input.total,
    input.closedPct,
    input.openPct,
    input.reasoningPct,
  );
  const aiComposition: ClassTestComposition = {
    multiple_choice: counts.closed,
    open: counts.open,
    reasoning: counts.reasoning,
  };

  const generated = await generateClassTest(lessons, aiComposition);
  if (!generated || generated.length === 0) return;

  const questions: PracticeQuestion[] = generated.map((q, idx) => ({
    ...q,
    id: `q${idx + 1}`,
  }));
  const maxScore = questions.reduce((sum, q) => sum + q.max_points, 0);
  const composition: TestComposition = {
    closed: counts.closed,
    open: counts.open,
    reasoning: counts.reasoning,
  };

  const { data: test, error } = await supabase
    .from('class_tests')
    .insert({
      school_id: profile.school_id,
      class_id: input.classId,
      created_by: profile.id,
      title: input.title,
      lesson_ids: lessons.map((l) => l.id),
      composition,
      questions,
      max_score: maxScore,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error || !test) return;
  redirect(`/${input.locale}/app/${profile.role}/klassprov/${test.id}`);
}

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(['multiple_choice', 'short_answer', 'open', 'reasoning']),
  prompt: z.string().trim().min(1),
  lesson_id: z.string(),
  options: z.array(z.string()).length(4).nullable(),
  correct_index: z.number().int().min(0).max(3).nullable(),
  answer_key: z.string(),
  max_points: z.number().int().min(1).max(10),
});

/** Sparar lärarens redigerade frågor i ett utkast. */
export async function updateClassTestQuestions(
  testId: string,
  rawQuestions: unknown,
): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };

  const parsed = z.array(questionSchema).min(1).safeParse(rawQuestions);
  if (!parsed.success) return { ok: false };
  const questions = parsed.data as PracticeQuestion[];
  const maxScore = questions.reduce((sum, q) => sum + q.max_points, 0);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('class_tests')
    .update({ questions, max_score: maxScore })
    .eq('id', testId)
    .eq('status', 'draft');
  if (error) return { ok: false };

  revalidatePath(`/sv/app/teacher/klassprov/${testId}`);
  revalidatePath(`/en/app/teacher/klassprov/${testId}`);
  return { ok: true };
}

/** Regenererar en enskild fråga (samma typ) i ett utkast. */
export async function regenerateQuestion(
  testId: string,
  questionId: string,
): Promise<{ ok: boolean; question?: PracticeQuestion }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };

  const supabase = await createSupabaseServerClient();
  const { data: testRow } = await supabase
    .from('class_tests')
    .select('*')
    .eq('id', testId)
    .maybeSingle();
  const test = testRow as ClassTest | null;
  if (!test || test.status !== 'draft') return { ok: false };

  const target = test.questions.find((q) => q.id === questionId);
  if (!target) return { ok: false };

  const { data: lessonRows } = await supabase
    .from('lessons')
    .select('id, title, transcript_text')
    .in('id', test.lesson_ids)
    .eq('transcript_status', 'ready');
  const lessons = ((lessonRows ?? []) as {
    id: string;
    title: string | null;
    transcript_text: string | null;
  }[])
    .filter((l) => l.transcript_text && l.transcript_text.trim().length > 0)
    .map((l) => ({ id: l.id, title: l.title, transcript: l.transcript_text as string }));
  if (lessons.length === 0) return { ok: false };

  const fresh = await regenerateClassTestQuestion(
    lessons,
    target.type as PracticeQuestionType,
  );
  if (!fresh) return { ok: false };

  const replaced: PracticeQuestion = { ...fresh, id: questionId };
  const questions = test.questions.map((q) =>
    q.id === questionId ? replaced : q,
  );
  const maxScore = questions.reduce((sum, q) => sum + q.max_points, 0);

  const { error } = await supabase
    .from('class_tests')
    .update({ questions, max_score: maxScore })
    .eq('id', testId);
  if (error) return { ok: false };
  return { ok: true, question: replaced };
}

/** Publicerar ett utkast → eleverna i klassen kan göra provet. */
export async function publishClassTest(testId: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('class_tests')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', testId)
    .eq('status', 'draft');
  if (error) return { ok: false };

  revalidatePath(`/sv/app/teacher/klassprov/${testId}`);
  revalidatePath(`/en/app/teacher/klassprov/${testId}`);
  return { ok: true };
}

/** Stänger ett prov för fler inlämningar. */
export async function closeClassTest(testId: string): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('class_tests')
    .update({ status: 'closed' })
    .eq('id', testId)
    .eq('status', 'published');
  if (error) return { ok: false };

  revalidatePath(`/sv/app/teacher/klassprov/${testId}`);
  revalidatePath(`/en/app/teacher/klassprov/${testId}`);
  return { ok: true };
}
