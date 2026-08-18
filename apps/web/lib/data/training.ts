import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sm2, type Sm2Grade } from '@/lib/training/sm2';
import type {
  FlashcardReviewState,
  TrainingFlashcard,
  TrainingKnowledgeCheck,
  TrainingMaterial,
} from '@/lib/supabase/database';

const FLASHCARDS_PER_SESSION = 20;
const KNOWLEDGE_CHECKS_PER_SESSION = 10;
// Exporterad så att /api/training/progress kan räkna ut samma `total`-tak som
// backfillen faktiskt kommer att uppnå denna request — ingen andra
// implementation av samma gräns.
export const MAX_BACKFILL_PER_REQUEST = 5;

export type TrainingLesson = { id: string; title: string | null; recordedAt: string | null };
export type TrainingCourse = {
  id: string;
  code: string;
  name: string;
  lessons: TrainingLesson[];
};

/**
 * Kurser med färdigtranskriberade lektioner — underlag för Öva-väljaren.
 * Samma urvalsregel som Provplugg: bara 'ready'-lektioner, eftersom en lektion
 * utan transkript inte kan ha (eller genereras) träningsunderlag.
 */
export async function getTrainingCourses(studentId: string): Promise<TrainingCourse[]> {
  const supabase = await createSupabaseServerClient();

  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('profile_id', studentId);
  const classIds = ((memberships ?? []) as { class_id: string }[]).map((r) => r.class_id);
  if (classIds.length === 0) return [];

  type LessonJoin = {
    id: string;
    title: string | null;
    recorded_at: string | null;
    courses: { id: string; code: string; name: string } | null;
  };

  const { data } = await supabase
    .from('lessons')
    .select('id, title, recorded_at, course_id, courses ( id, code, name )')
    .in('class_id', classIds)
    .is('archived_at', null)
    .eq('transcript_status', 'ready')
    .order('recorded_at', { ascending: true, nullsFirst: false })
    .limit(300);

  const byCourse = new Map<string, TrainingCourse>();
  for (const row of (data ?? []) as unknown as LessonJoin[]) {
    const course = row.courses;
    if (!course) continue;
    let entry = byCourse.get(course.id);
    if (!entry) {
      entry = { id: course.id, code: course.code, name: course.name, lessons: [] };
      byCourse.set(course.id, entry);
    }
    entry.lessons.push({ id: row.id, title: row.title, recordedAt: row.recorded_at });
  }
  return Array.from(byCourse.values()).filter((c) => c.lessons.length > 0);
}

/**
 * Hämtar träningsunderlag för lektionerna. Lektioner som saknar underlag
 * (transkriberade innan funktionen fanns) backfillas lat genom att anropa
 * SAMMA Edge Function-läge som pipelinen använder (`training_material_only`)
 * — det finns bara EN implementation av AI-anropet, i Deno-funktionen.
 */
export async function getOrCreateTrainingMaterials(
  lessonIds: string[],
): Promise<TrainingMaterial[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('training_materials')
    .select('*')
    .in('lesson_id', lessonIds);

  const existing = (data ?? []) as TrainingMaterial[];
  const haveFor = new Set(existing.map((m) => m.lesson_id));
  const missing = lessonIds.filter((id) => !haveFor.has(id));
  if (missing.length === 0) return existing;

  // Backfilla bara ett fåtal lektioner per request, INTE alla `missing`.
  // Varje anrop är en ograviterad, icke-strömmande Claude-generation (upp
  // till 8192 tokens) — Task 6:s urvalsformulär tillåter upp till 50
  // lektioner, och att köra 50 sådana anrop parallellt i en och samma
  // request riskerar rate limits hos Anthropic. Den här nedskalningen är
  // medveten och graciös, inte ett förbiseende: eleven får en fungerande
  // session av det underlag som redan finns (eller inget alls om allt
  // saknas första gången), och nästa besök till samma urval backfillar
  // nästa batch tills allt är genererat. Höj INTE den här gränsen utan att
  // också lösa rate limit-frågan.
  const toBackfill = missing.slice(0, MAX_BACKFILL_PER_REQUEST);

  const results = await Promise.allSettled(
    toBackfill.map((lessonId) =>
      supabase.functions.invoke('transcribe-lesson', {
        body: { lesson_id: lessonId, mode: 'training_material_only' },
      }),
    ),
  );

  // functions.invoke() avvisar (rejects) ALDRIG på ett HTTP-fel — ett 500-svar
  // från regenerateTrainingMaterial fångas internt och löser ut promisen med
  // { data: null, error }. En riktig genereringsmiss är annars omöjlig att
  // skilja från "lektionen fick inga kort" (Edge-funktionens egen validering
  // garanterar minst ett kort/fråga vid framgång, så ett tomt resultat betyder
  // nästan alltid ett osynligt fel) — logga därför båda felvägarna explicit.
  results.forEach((result, i) => {
    const lessonId = toBackfill[i];
    if (result.status === 'rejected') {
      console.error(
        `getOrCreateTrainingMaterials: backfill misslyckades för lektion ${lessonId}:`,
        result.reason,
      );
    } else if (result.value.error) {
      console.error(
        `getOrCreateTrainingMaterials: backfill misslyckades för lektion ${lessonId}:`,
        result.value.error,
      );
    }
  });

  const { data: refreshed } = await supabase
    .from('training_materials')
    .select('*')
    .in('lesson_id', toBackfill);

  return [...existing, ...((refreshed ?? []) as TrainingMaterial[])];
}

export type FlashcardSessionItem = TrainingFlashcard & {
  lessonId: string;
  lessonTitle: string | null;
};

export type KnowledgeCheckSessionItem = TrainingKnowledgeCheck & {
  lessonId: string;
  lessonTitle: string | null;
};

async function lessonTitles(lessonIds: string[]): Promise<Map<string, string | null>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('lessons').select('id, title').in('id', lessonIds);
  return new Map(
    ((data ?? []) as { id: string; title: string | null }[]).map((l) => [l.id, l.title]),
  );
}

/**
 * Väljer vilka flashcards eleven ska se: i första hand kort som är due enligt
 * SM-2, annars (om inget är due) alla kort — "träna ändå" ska aldrig ge en
 * tom session.
 */
export async function selectFlashcards(
  studentId: string,
  lessonIds: string[],
): Promise<FlashcardSessionItem[]> {
  const materials = await getOrCreateTrainingMaterials(lessonIds);
  const titles = await lessonTitles(lessonIds);

  const all: FlashcardSessionItem[] = materials.flatMap((m) =>
    m.flashcards.map((f) => ({
      ...f,
      lessonId: m.lesson_id,
      lessonTitle: titles.get(m.lesson_id) ?? null,
    })),
  );
  if (all.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const { data: stateRows } = await supabase
    .from('flashcard_review_state')
    .select('*')
    .eq('student_id', studentId)
    .in('lesson_id', lessonIds);

  const stateByCard = new Map(
    ((stateRows ?? []) as FlashcardReviewState[]).map((s) => [s.flashcard_id, s]),
  );
  const now = Date.now();

  const due = all.filter((card) => {
    const state = stateByCard.get(card.id);
    return !state || new Date(state.due_at).getTime() <= now;
  });

  const pool = due.length > 0 ? due : all;
  return pool.slice(0, FLASHCARDS_PER_SESSION);
}

/**
 * Väljer kunskapskollar viktade mot koncept eleven svarat sämst på. Frågor
 * eleven aldrig svarat på räknas som svagast och kommer först.
 */
export async function selectKnowledgeChecks(
  studentId: string,
  lessonIds: string[],
): Promise<KnowledgeCheckSessionItem[]> {
  const materials = await getOrCreateTrainingMaterials(lessonIds);
  const titles = await lessonTitles(lessonIds);

  const all: KnowledgeCheckSessionItem[] = materials.flatMap((m) =>
    m.knowledge_checks.map((k) => ({
      ...k,
      lessonId: m.lesson_id,
      lessonTitle: titles.get(m.lesson_id) ?? null,
    })),
  );
  if (all.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const { data: attemptRows } = await supabase
    .from('knowledge_check_attempts')
    .select('knowledge_check_id, correct')
    .eq('student_id', studentId)
    .in('lesson_id', lessonIds);

  const stats = new Map<string, { correct: number; total: number }>();
  for (const a of (attemptRows ?? []) as { knowledge_check_id: string; correct: boolean }[]) {
    const s = stats.get(a.knowledge_check_id) ?? { correct: 0, total: 0 };
    s.total += 1;
    if (a.correct) s.correct += 1;
    stats.set(a.knowledge_check_id, s);
  }

  // Lägst träffsäkerhet först; obesvarade (-1) allra först.
  const scored = all.map((check) => {
    const s = stats.get(check.id);
    return { check, accuracy: s && s.total > 0 ? s.correct / s.total : -1 };
  });
  scored.sort((a, b) => a.accuracy - b.accuracy);

  return scored.slice(0, KNOWLEDGE_CHECKS_PER_SESSION).map((s) => s.check);
}

/** Kör SM-2 och sparar nytt schemaläggningstillstånd för ett kort. */
export async function recordFlashcardGrade(
  studentId: string,
  schoolId: string,
  lessonId: string,
  flashcardId: string,
  grade: Sm2Grade,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('flashcard_review_state')
    .select('*')
    .eq('student_id', studentId)
    .eq('flashcard_id', flashcardId)
    .maybeSingle();

  const current = existing as FlashcardReviewState | null;
  const next = sm2(
    {
      easeFactor: current?.ease_factor ?? 2.5,
      intervalDays: current?.interval_days ?? 0,
      repetitions: current?.repetitions ?? 0,
    },
    grade,
  );

  await supabase.from('flashcard_review_state').upsert(
    {
      student_id: studentId,
      school_id: schoolId,
      lesson_id: lessonId,
      flashcard_id: flashcardId,
      ease_factor: next.easeFactor,
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      due_at: next.dueAt,
      last_reviewed_at: new Date().toISOString(),
      last_grade: grade,
    },
    { onConflict: 'student_id,flashcard_id' },
  );
}

/** Loggar ett kunskapskollssvar (append-only). */
export async function recordKnowledgeCheckAnswer(
  studentId: string,
  schoolId: string,
  lessonId: string,
  knowledgeCheckId: string,
  correct: boolean,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from('knowledge_check_attempts').insert({
    student_id: studentId,
    school_id: schoolId,
    lesson_id: lessonId,
    knowledge_check_id: knowledgeCheckId,
    correct,
  });
}
