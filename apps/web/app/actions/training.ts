'use server';

import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import {
  backfillMissingTrainingMaterials,
  getOrCreateTrainingMaterials,
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

export type TrainingActionResult = { ok: boolean };

/**
 * FAS 1 av tvåstegsflödet. Avgör om något av de valda lektionerna saknar
 * träningsunderlag; om ja, schemalägger den faktiska genereringen via
 * `after()` och returnerar OMEDELBART UTAN att invänta den — Claude-anropet
 * (~70 s för en lektion, ~90-100 s för två parallellt, uppmätt 2026-08-18)
 * körs alltså aldrig på den öppna klient-anslutningen längre. Klienten
 * pollar /api/training/progress för att se när det är klart och anropar
 * sedan startTrainingSession (fas 2) — se OvaPicker.tsx.
 *
 * VIKTIGT: `after()` håller den här funktionsinvokeringen vid liv med
 * waitUntil så länge sidans (ova/page.tsx) maxDuration tillåter — inte
 * längre. Requesten mot KLIENTEN återvänder direkt, men själva Claude-
 * genereringen behöver fortfarande hela den tiden för att hinna klart INNAN
 * Vercel dödar invokeringen. Sänk inte page.tsx:s maxDuration under vad
 * backfillen faktiskt kan ta, annars avbryts genereringen i tysthet
 * mitt i (ingen throw, ingen loggad orsak — den ser bara ut att aldrig bli
 * klar och pollningens tak tar över istället).
 *
 * Om inget saknas returneras { ready: true } direkt — klienten går rakt
 * vidare till fas 2 utan att pollningen/progress-UI:t någonsin visas.
 */
export async function prepareTrainingSession(
  formData: FormData,
): Promise<{ ready: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.school_id) return { ready: false };

  const parsed = startSchema.safeParse({
    mode: formData.get('mode')?.toString(),
    lessonIds: formData.getAll('lesson_ids').map((v) => v.toString()),
    locale: formData.get('locale')?.toString(),
  });
  if (!parsed.success) return { ready: false };
  const { lessonIds } = parsed.data;

  const existing = await getOrCreateTrainingMaterials(lessonIds, { backfill: false });
  const haveFor = new Set(existing.map((m) => m.lesson_id));
  const missing = lessonIds.filter((id) => !haveFor.has(id));
  if (missing.length === 0) return { ready: true };

  after(async () => {
    try {
      await backfillMissingTrainingMaterials(missing);
    } catch (err) {
      console.error('prepareTrainingSession: backfill via after() misslyckades:', err);
    }
  });

  return { ready: false };
}

/**
 * FAS 2 av tvåstegsflödet. Bygger en träningssession från ett lektionsurval
 * och redirectar till den. Läser bara BEFINTLIGT underlag (backfill: false)
 * — genereringen är prepareTrainingSessions jobb (fas 1); vid det här laget
 * finns underlaget antingen redan, eller så gör det aldrig det den här
 * gången (klienten anropar fas 2 även om pollningens tak nås utan att allt
 * blev klart, se OvaPicker.tsx). Urvalet sparas i training_sessions så att
 * refresh inte blandar om korten mitt i en session. Returnerar { ok: false }
 * på varje valideringsmiss eller tomt urval (t.ex. en lektion vars backfill
 * misslyckades eller aldrig hann klart) — anroparen visar ett felmeddelande
 * istället för att sitta tyst. redirect() kastar (typad `never`) på
 * framgångsvägen, så det finns aldrig ett { ok: true } att returnera.
 */
export async function startTrainingSession(formData: FormData): Promise<TrainingActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.school_id) return { ok: false };

  const parsed = startSchema.safeParse({
    mode: formData.get('mode')?.toString(),
    lessonIds: formData.getAll('lesson_ids').map((v) => v.toString()),
    locale: formData.get('locale')?.toString(),
  });
  if (!parsed.success) return { ok: false };
  const { mode, lessonIds, locale } = parsed.data;

  const items =
    mode === 'flashcards'
      ? await selectFlashcards(profile.id, lessonIds, { backfill: false })
      : await selectKnowledgeChecks(profile.id, lessonIds, { backfill: false });
  if (items.length === 0) return { ok: false };

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

  if (!session) return { ok: false };

  const segment = mode === 'flashcards' ? 'repetera' : 'trana';
  redirect(`/${locale}/app/student/ova/${segment}/${(session as { id: string }).id}`);
}

const gradeSchema = z.object({
  lessonId: z.string().uuid(),
  flashcardId: z.string().uuid(),
  grade: z.enum(['again', 'hard', 'good']),
});

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
