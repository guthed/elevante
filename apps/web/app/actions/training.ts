'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import {
  recordFlashcardGrade,
  recordKnowledgeCheckAnswer,
  selectFlashcards,
  selectKnowledgeChecks,
} from '@/lib/data/training';
import type { TrainingMode } from '@/lib/supabase/database';

const startSchema = z.object({
  mode: z.enum(['flashcards', 'knowledge_checks']),
  lessonIds: z.array(z.string().uuid()).min(1).max(50),
  locale: z.enum(['sv', 'en']),
});

/**
 * Bygger en träningssession från ett lektionsurval och redirectar till den.
 * Urvalet sparas i training_sessions så att refresh inte blandar om korten
 * mitt i en session.
 */
export async function startTrainingSession(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.school_id) return;

  const parsed = startSchema.safeParse({
    mode: formData.get('mode')?.toString(),
    lessonIds: formData.getAll('lesson_ids').map((v) => v.toString()),
    locale: formData.get('locale')?.toString(),
  });
  if (!parsed.success) return;
  const { mode, lessonIds, locale } = parsed.data;

  const items =
    mode === 'flashcards'
      ? await selectFlashcards(profile.id, lessonIds)
      : await selectKnowledgeChecks(profile.id, lessonIds);
  if (items.length === 0) return;

  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from('training_sessions')
    .insert({
      student_id: profile.id,
      school_id: profile.school_id,
      mode: mode as TrainingMode,
      lesson_ids: lessonIds,
      item_ids: items.map((i) => i.id),
    })
    .select('id')
    .single();

  if (!session) return;

  const segment = mode === 'flashcards' ? 'repetera' : 'trana';
  redirect(`/${locale}/app/student/ova/${segment}/${(session as { id: string }).id}`);
}

const gradeSchema = z.object({
  lessonId: z.string().uuid(),
  flashcardId: z.string().uuid(),
  grade: z.enum(['again', 'hard', 'good']),
});

export type TrainingActionResult = { ok: boolean };

/** Betygsätter ett flashcard (driver SM-2-schemaläggningen). */
export async function gradeFlashcard(
  lessonId: string,
  flashcardId: string,
  grade: string,
): Promise<TrainingActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.school_id) return { ok: false };

  const parsed = gradeSchema.safeParse({ lessonId, flashcardId, grade });
  if (!parsed.success) return { ok: false };

  await recordFlashcardGrade(
    profile.id,
    profile.school_id,
    parsed.data.lessonId,
    parsed.data.flashcardId,
    parsed.data.grade,
  );
  return { ok: true };
}

const answerSchema = z.object({
  lessonId: z.string().uuid(),
  knowledgeCheckId: z.string().uuid(),
  correct: z.boolean(),
});

/** Loggar ett kunskapskollssvar. */
export async function answerKnowledgeCheck(
  lessonId: string,
  knowledgeCheckId: string,
  correct: boolean,
): Promise<TrainingActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.school_id) return { ok: false };

  const parsed = answerSchema.safeParse({ lessonId, knowledgeCheckId, correct });
  if (!parsed.success) return { ok: false };

  await recordKnowledgeCheckAnswer(
    profile.id,
    profile.school_id,
    parsed.data.lessonId,
    parsed.data.knowledgeCheckId,
    parsed.data.correct,
  );
  return { ok: true };
}
