# Klassprov Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lärare skapar prov utifrån sina lektioner med reglage för antal/typ-fördelning, tilldelar en klass, AI förrättar inlämningar, men läraren granskar och släpper resultatet.

**Architecture:** Två nya tabeller — `class_tests` (lärar-ägd definition, en rad) och `class_test_submissions` (en rad per elev). Återanvänder `PracticeQuestion`/`PracticeAnswer`-typerna och AI-funktionerna i `lib/ai/anthropic.ts`. Elevläsning går via security-definer-RPC:er som gömmer facit och håller resultat dolt tills `status='released'`.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (Postgres + RLS + RPC), Tailwind v4, Claude API. Spec: `docs/superpowers/specs/2026-06-24-klassprov-design.md`.

**Verifiering (projektets konventioner):** Repot har ingen test-runner. Varje uppgift verifieras med `pnpm --filter web typecheck` och `pnpm --filter web lint` (kör från repo-roten), migrationer verifieras med SQL-frågor via Supabase MCP (`execute_sql`, projekt `msqfuywpbrteyrzjggsw`), och UI verifieras i preview. Vi följer detta istället för TDD eftersom projektet saknar testharness och CLAUDE.md inte kräver enhetstester.

**Branch:** `feat/klassprov` (redan utcheckad, specen committad där).

---

## Filstruktur

**Skapas:**
- `supabase/migrations/20260624120000_class_tests.sql` — tabeller, RLS, RPC:er.
- `apps/web/app/actions/class-test.ts` — alla Server Actions.
- `apps/web/lib/data/class-test.ts` — läs-helpers (lärare + elev).
- `apps/web/app/[locale]/app/[role]/klassprov/page.tsx` — lista (branchar på roll).
- `apps/web/app/[locale]/app/[role]/klassprov/nytt/page.tsx` — skapa-vy (lärare).
- `apps/web/app/[locale]/app/[role]/klassprov/nytt/ClassTestBuilder.tsx` — klass/lektion/reglage-form.
- `apps/web/app/[locale]/app/[role]/klassprov/[id]/page.tsx` — editor (draft) + inlämnings-översikt (published).
- `apps/web/app/[locale]/app/[role]/klassprov/[id]/QuestionEditor.tsx` — lärarens frågeeditor.
- `apps/web/app/[locale]/app/[role]/klassprov/[id]/ClassTestRunner.tsx` — elevens provtagning.
- `apps/web/app/[locale]/app/[role]/klassprov/[id]/[submissionId]/page.tsx` — granskningsvy (lärare).
- `apps/web/app/[locale]/app/[role]/klassprov/[id]/[submissionId]/GradeReview.tsx` — poäng/feedback-form.

**Modifieras:**
- `apps/web/lib/supabase/database.ts` — nya typer.
- `apps/web/lib/ai/anthropic.ts` — `generateClassTest`, `regenerateClassTestQuestion`.
- `apps/web/lib/app/nav.ts` — nav-poster för lärare + elev.
- `apps/web/lib/i18n/locales/sv.ts`, `apps/web/lib/i18n/locales/en.ts`, `apps/web/lib/i18n/types.ts` — strängar.

---

## Task 1: Migration — tabeller, RLS, RPC:er

**Files:**
- Create: `supabase/migrations/20260624120000_class_tests.sql`

- [ ] **Step 1: Skriv migrationsfilen**

```sql
-- Klassprov: lärar-författade prov tilldelade en klass.
--
-- class_tests = provdefinitionen (lärar-ägd, en rad). class_test_submissions =
-- en rad per elev. Facit ligger i questions-jsonb; elever läser ALDRIG tabellen
-- direkt utan via security-definer-RPC:er som strippar facit och håller
-- resultatet dolt tills läraren släppt (status='released').

create table if not exists public.class_tests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  lesson_ids uuid[] not null,
  composition jsonb not null default '{}'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  max_score integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','closed')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists class_tests_class_idx
  on public.class_tests (class_id, created_at desc);

create table if not exists public.class_test_submissions (
  id uuid primary key default gen_random_uuid(),
  class_test_id uuid not null references public.class_tests(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  score integer not null default 0,
  max_score integer not null default 0,
  overall_feedback text not null default '',
  status text not null default 'graded' check (status in ('graded','released')),
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  released_at timestamptz,
  unique (class_test_id, student_id)
);

create index if not exists class_test_submissions_test_idx
  on public.class_test_submissions (class_test_id);

alter table public.class_tests enable row level security;
alter table public.class_test_submissions enable row level security;

-- class_tests: bara lärare/admin i samma skola, full CRUD på egna prov.
-- Elever har INGEN direkt SELECT (läser via RPC).
create policy "class_tests_teacher_select" on public.class_tests
  for select to authenticated
  using (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  );
create policy "class_tests_teacher_insert" on public.class_tests
  for insert to authenticated
  with check (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
    and created_by = (select auth.uid())
  );
create policy "class_tests_teacher_update" on public.class_tests
  for update to authenticated
  using (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  )
  with check (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  );
create policy "class_tests_teacher_delete" on public.class_tests
  for delete to authenticated
  using (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  );

-- submissions: eleven ser/skapar/ändrar sin egen rad; lärare/admin i samma
-- skola ser alla rader för sina prov och kan uppdatera (rätta/släppa).
create policy "class_test_submissions_student_select" on public.class_test_submissions
  for select to authenticated
  using (student_id = (select auth.uid()));
create policy "class_test_submissions_student_insert" on public.class_test_submissions
  for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy "class_test_submissions_teacher_select" on public.class_test_submissions
  for select to authenticated
  using (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  );
create policy "class_test_submissions_teacher_update" on public.class_test_submissions
  for update to authenticated
  using (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  )
  with check (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  );

-- RPC: hämta publicerat prov till en elev i klassen, med facit strippat.
create or replace function public.get_published_class_test(p_test_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.class_tests;
  v_questions jsonb;
begin
  select * into v_row from public.class_tests
  where id = p_test_id and status = 'published';
  if not found then
    return null;
  end if;

  -- Eleven måste vara medlem i klassen provet tilldelats.
  if not exists (
    select 1 from public.class_members m
    where m.class_id = v_row.class_id and m.profile_id = auth.uid()
  ) then
    return null;
  end if;

  -- Strippa answer_key + correct_index ur varje fråga.
  select jsonb_agg(
    (q - 'answer_key' - 'correct_index')
  )
  into v_questions
  from jsonb_array_elements(v_row.questions) q;

  return jsonb_build_object(
    'id', v_row.id,
    'title', v_row.title,
    'class_id', v_row.class_id,
    'max_score', v_row.max_score,
    'questions', coalesce(v_questions, '[]'::jsonb)
  );
end;
$$;

-- RPC: hämta elevens eget resultat — bara om läraren släppt det.
create or replace function public.get_my_submission_result(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.class_test_submissions;
begin
  select * into v_row from public.class_test_submissions
  where id = p_submission_id
    and student_id = auth.uid()
    and status = 'released';
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'class_test_id', v_row.class_test_id,
    'answers', v_row.answers,
    'score', v_row.score,
    'max_score', v_row.max_score,
    'overall_feedback', v_row.overall_feedback,
    'released_at', v_row.released_at
  );
end;
$$;

grant execute on function public.get_published_class_test(uuid) to authenticated;
grant execute on function public.get_my_submission_result(uuid) to authenticated;
```

- [ ] **Step 2: Applicera migrationen**

Använd Supabase MCP `apply_migration` (projekt `msqfuywpbrteyrzjggsw`, name `class_tests`) med innehållet ovan. Alternativt `supabase db push` om CLI är länkad.

- [ ] **Step 3: Verifiera att tabeller + RPC finns**

Kör via Supabase MCP `execute_sql`:
```sql
select table_name from information_schema.tables
where table_schema='public' and table_name in ('class_tests','class_test_submissions');
select proname from pg_proc where proname in ('get_published_class_test','get_my_submission_result');
```
Expected: båda tabellerna och båda funktionerna listas.

- [ ] **Step 4: Verifiera facit-strippning logiskt**

Bekräfta i `get_published_class_test` att `q - 'answer_key' - 'correct_index'` körs på varje frågeobjekt. Detta är säkerhetskritiskt — `answer_key` och `correct_index` får aldrig nå eleven.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260624120000_class_tests.sql
git commit -m "feat(klassprov): migration — class_tests + submissions + RPC:er"
```

---

## Task 2: Typer i database.ts

**Files:**
- Modify: `apps/web/lib/supabase/database.ts` (efter `PracticeTest`-typerna, ~rad 203)

- [ ] **Step 1: Lägg till typerna**

```typescript
// --- Klassprov (lärar-författade prov tilldelade en klass) ---

export type TestComposition = {
  closed: number; // multiple_choice
  open: number; // short_answer + open
  reasoning: number; // reasoning
};

export type ClassTestStatus = 'draft' | 'published' | 'closed';

export type ClassTest = {
  id: string;
  school_id: string;
  class_id: string;
  created_by: string;
  title: string;
  lesson_ids: string[];
  composition: TestComposition;
  questions: PracticeQuestion[];
  max_score: number;
  status: ClassTestStatus;
  created_at: string;
  published_at: string | null;
};

// Elevens svar: PracticeAnswer + bevarad AI-bedömning (lärar-justerbar feedback).
export type ClassTestAnswer = PracticeAnswer & {
  ai_points: number;
  ai_feedback: string;
};

export type ClassTestSubmissionStatus = 'graded' | 'released';

export type ClassTestSubmission = {
  id: string;
  class_test_id: string;
  school_id: string;
  student_id: string;
  answers: ClassTestAnswer[];
  score: number;
  max_score: number;
  overall_feedback: string;
  status: ClassTestSubmissionStatus;
  submitted_at: string;
  graded_at: string | null;
  released_at: string | null;
};

// Facit-strippad fråga som eleven ser (från get_published_class_test).
export type StudentClassTestQuestion = Omit<
  PracticeQuestion,
  'answer_key' | 'correct_index'
>;

export type PublishedClassTestForStudent = {
  id: string;
  title: string;
  class_id: string;
  max_score: number;
  questions: StudentClassTestQuestion[];
};

export type MySubmissionResult = {
  id: string;
  class_test_id: string;
  answers: ClassTestAnswer[];
  score: number;
  max_score: number;
  overall_feedback: string;
  released_at: string;
};
```

- [ ] **Step 2: Verifiera typecheck**

Run: `pnpm --filter web typecheck`
Expected: PASS (inga nya fel).

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/supabase/database.ts
git commit -m "feat(klassprov): typer för class_tests + submissions"
```

---

## Task 3: AI — generateClassTest + regenerateClassTestQuestion

**Files:**
- Modify: `apps/web/lib/ai/anthropic.ts` (efter `generatePracticeTest`, ~rad 348)

Återanvänder samma system-prompt, parsing-loop och hjälpfunktioner (`getClient`, `MODEL`, `stripFences`, `textOf`, `PRACTICE_QUESTION_TYPES`, `PracticeLessonInput`) som `generatePracticeTest`. Skillnaden: styr *antal per typ* istället för totalantal.

- [ ] **Step 1: Lägg till en delad parser och de två funktionerna**

Extrahera först parsing-loopen ur `generatePracticeTest` till en hjälpfunktion (DRY), och bygg de nya funktionerna ovanpå. Lägg till efter `generatePracticeTest`:

```typescript
export type ClassTestComposition = {
  multiple_choice: number;
  open: number; // täcker short_answer + open
  reasoning: number;
};

/**
 * Parsar modellsvarets questions-array till validerade frågor (utan id).
 * Delad mellan generatePracticeTest och generateClassTest.
 */
function parseGeneratedQuestions(
  raw: unknown,
  validLessonIds: Set<string>,
  fallbackLessonId: string,
): Omit<PracticeQuestion, 'id'>[] {
  if (!Array.isArray(raw)) return [];
  const questions: Omit<PracticeQuestion, 'id'>[] = [];
  for (const item of raw) {
    const q = item as Record<string, unknown>;
    const type = q.type as PracticeQuestionType;
    if (!PRACTICE_QUESTION_TYPES.includes(type)) continue;
    if (typeof q.prompt !== 'string' || typeof q.answer_key !== 'string') continue;
    const lessonId =
      typeof q.lesson_id === 'string' && validLessonIds.has(q.lesson_id)
        ? q.lesson_id
        : fallbackLessonId;
    const maxPoints =
      typeof q.max_points === 'number' && q.max_points > 0
        ? Math.round(q.max_points)
        : 1;

    let options: string[] | null = null;
    let correctIndex: number | null = null;
    if (type === 'multiple_choice') {
      if (
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        !q.options.every((o): o is string => typeof o === 'string') ||
        typeof q.correct_index !== 'number' ||
        q.correct_index < 0 ||
        q.correct_index > 3
      ) {
        continue;
      }
      options = q.options;
      correctIndex = q.correct_index;
    }

    questions.push({
      type,
      prompt: q.prompt,
      lesson_id: lessonId,
      options,
      correct_index: correctIndex,
      answer_key: q.answer_key,
      max_points: maxPoints,
    });
  }
  return questions;
}

/**
 * Genererar ett klassprov med en specifik typ-fördelning. composition anger
 * exakt antal frågor per kategori (stängda=multiple_choice, öppna=short_answer/
 * open, resonerande=reasoning). Returnerar null om Anthropic inte är konfigurerat.
 */
export async function generateClassTest(
  lessons: PracticeLessonInput[],
  composition: ClassTestComposition,
): Promise<Omit<PracticeQuestion, 'id'>[] | null> {
  const client = getClient();
  if (!client || lessons.length === 0) return null;

  const validLessonIds = new Set(lessons.map((l) => l.id));
  const contextBlock = lessons
    .map(
      (l) =>
        `[Lektion — id: ${l.id} — ${l.title ?? 'okänd'}]\n${l.transcript.slice(0, 8000)}`,
    )
    .join('\n\n');

  const userPrompt = `Skapa ett prov utifrån dessa lektioner med EXAKT denna fördelning:
- ${composition.multiple_choice} st flervalsfrågor (type "multiple_choice")
- ${composition.open} st öppna frågor (blanda type "short_answer" och "open")
- ${composition.reasoning} st resonerande frågor (type "reasoning")

${contextBlock}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: TEST_GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let parsed: { questions?: unknown };
  try {
    parsed = JSON.parse(stripFences(textOf(response)));
  } catch {
    return null;
  }
  const questions = parseGeneratedQuestions(
    parsed.questions,
    validLessonIds,
    lessons[0]!.id,
  );
  return questions.length > 0 ? questions : null;
}

/**
 * Genererar EN ersättningsfråga av en given typ utifrån lektionerna.
 * Används när läraren regenererar en enskild fråga i editorn.
 */
export async function regenerateClassTestQuestion(
  lessons: PracticeLessonInput[],
  type: PracticeQuestionType,
): Promise<Omit<PracticeQuestion, 'id'> | null> {
  const client = getClient();
  if (!client || lessons.length === 0) return null;

  const validLessonIds = new Set(lessons.map((l) => l.id));
  const contextBlock = lessons
    .map(
      (l) =>
        `[Lektion — id: ${l.id} — ${l.title ?? 'okänd'}]\n${l.transcript.slice(0, 8000)}`,
    )
    .join('\n\n');

  const userPrompt = `Skapa EXAKT 1 fråga av type "${type}" utifrån dessa lektioner.\n\n${contextBlock}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: TEST_GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let parsed: { questions?: unknown };
  try {
    parsed = JSON.parse(stripFences(textOf(response)));
  } catch {
    return null;
  }
  const questions = parseGeneratedQuestions(
    parsed.questions,
    validLessonIds,
    lessons[0]!.id,
  );
  return questions[0] ?? null;
}
```

- [ ] **Step 2: Refaktorera generatePracticeTest att använda parseGeneratedQuestions**

Ersätt den inlinade parsing-loopen i `generatePracticeTest` (rad ~304–345) med:
```typescript
  const questions = parseGeneratedQuestions(
    parsed.questions,
    validLessonIds,
    lessons[0]!.id,
  );
  return questions.length > 0 ? questions : null;
```
Behåll allt ovanför (client-check, contextBlock, userPrompt, response, JSON.parse).

- [ ] **Step 3: Verifiera typecheck + lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/ai/anthropic.ts
git commit -m "feat(klassprov): generateClassTest + regenerate + delad parser"
```

---

## Task 4: Server Actions — skapande & livscykel

**Files:**
- Create: `apps/web/app/actions/class-test.ts`

Mönster speglar `app/actions/practice-test.ts` (Server Actions, `getCurrentProfile`, `createSupabaseServerClient`, `redirect`, `revalidatePath`). Skillnad: vi inför Zod-validering här, vilket uppfyller QA-kravet "Zod-validering på alla Server Actions" i CLAUDE.md (befintliga actions validerar manuellt — detta blir första zod-användningen).

- [ ] **Step 0: Installera zod**

`zod` saknas i `apps/web/package.json`. Installera först:

Run: `pnpm --filter web add zod`
Expected: `zod` läggs till i dependencies.

- [ ] **Step 1: Skriv skapande-/livscykel-actions**

```typescript
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
  // andelar 0–100, summerar (ungefär) till 100
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
  // Dela ut resterande frågor till de med störst rest.
  const order = (['closed', 'open', 'reasoning'] as const).sort(
    (a, b) => (raw[b] - floored[b]) - (raw[a] - floored[a]),
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
```

- [ ] **Step 2: Verifiera typecheck + lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/actions/class-test.ts apps/web/package.json
git commit -m "feat(klassprov): server actions — skapa/redigera/publicera"
```

---

## Task 5: Server Actions — inlämning, rättning, släpp

**Files:**
- Modify: `apps/web/app/actions/class-test.ts` (lägg till nedanför Task 4-koden)

- [ ] **Step 1: Lägg till submit/grade/release-actions**

```typescript
import type {
  ClassTestAnswer,
  ClassTestSubmission,
} from '@/lib/supabase/database';
import { gradePracticeTest, type PracticeGradeInput } from '@/lib/ai/anthropic';

const submitSchema = z.array(
  z.object({ question_id: z.string(), answer: z.string() }),
);

/**
 * Elev lämnar in ett klassprov. AI förrättar direkt (flerval i kod, övriga via
 * Claude). Skapar submission-raden med status='graded' — DOLD för eleven tills
 * läraren släpper. Idempotent: returnerar ok om eleven redan lämnat in.
 */
export async function submitClassTest(
  testId: string,
  rawAnswers: { question_id: string; answer: string }[],
): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.school_id) return { ok: false };

  const parsed = submitSchema.safeParse(rawAnswers);
  if (!parsed.success) return { ok: false };

  const supabase = await createSupabaseServerClient();

  // Befintlig inlämning? (unik (test, elev)) → idempotent.
  const { data: existing } = await supabase
    .from('class_test_submissions')
    .select('id')
    .eq('class_test_id', testId)
    .eq('student_id', profile.id)
    .maybeSingle();
  if (existing) return { ok: true };

  // Läs provet via RPC (facit-strippat) bara för att validera tillgång...
  const { data: pubRow } = await supabase.rpc('get_published_class_test', {
    p_test_id: testId,
  });
  if (!pubRow) return { ok: false };

  // ...men hämta FULLA frågorna (med facit) säkert: vi behöver dem för rättning.
  // Eleven har ingen direkt SELECT på class_tests, så läs via RPC räcker inte.
  // Lösning: rättningen sker här i Server Action med service-läsning via en
  // dedikerad RPC som returnerar facit ENDAST i server-kontext.
  const { data: gradingRow } = await supabase.rpc(
    'get_class_test_for_grading',
    { p_test_id: testId },
  );
  const grading = gradingRow as {
    questions: PracticeQuestion[];
    school_id: string;
    max_score: number;
  } | null;
  if (!grading) return { ok: false };

  const answerByQuestion = new Map(
    parsed.data.map((a) => [a.question_id, a.answer ?? '']),
  );

  const gradeInputs: PracticeGradeInput[] = [];
  for (const q of grading.questions) {
    if (q.type === 'multiple_choice') continue;
    gradeInputs.push({
      question_id: q.id,
      prompt: q.prompt,
      answer_key: q.answer_key,
      max_points: q.max_points,
      student_answer: answerByQuestion.get(q.id) ?? '',
    });
  }

  const aiResult =
    gradeInputs.length > 0 ? await gradePracticeTest(gradeInputs) : null;
  const gradeByQuestion = new Map(
    (aiResult?.grades ?? []).map((g) => [g.question_id, g]),
  );

  const answers: ClassTestAnswer[] = grading.questions.map((q) => {
    const studentAnswer = answerByQuestion.get(q.id) ?? '';
    if (q.type === 'multiple_choice') {
      const selectedIndex = Number.parseInt(studentAnswer, 10);
      const correct =
        Number.isInteger(selectedIndex) && selectedIndex === q.correct_index;
      const chosenLabel =
        q.options && selectedIndex >= 0 && selectedIndex < q.options.length
          ? q.options[selectedIndex]!
          : '';
      const points = correct ? q.max_points : 0;
      const fb = correct ? `Rätt. ${q.answer_key}` : `Inte rätt. ${q.answer_key}`;
      return {
        question_id: q.id,
        answer: chosenLabel,
        points,
        max_points: q.max_points,
        correct,
        feedback: fb,
        ai_points: points,
        ai_feedback: fb,
      };
    }
    const grade = gradeByQuestion.get(q.id);
    const points = grade ? Math.min(grade.points, q.max_points) : 0;
    const fb = grade?.feedback ?? 'Kunde inte rättas automatiskt.';
    return {
      question_id: q.id,
      answer: studentAnswer,
      points,
      max_points: q.max_points,
      correct: null,
      feedback: fb,
      ai_points: points,
      ai_feedback: fb,
    };
  });

  const score = answers.reduce((sum, a) => sum + a.points, 0);

  const { error } = await supabase.from('class_test_submissions').insert({
    class_test_id: testId,
    school_id: profile.school_id,
    student_id: profile.id,
    answers,
    score,
    max_score: grading.max_score,
    overall_feedback: aiResult?.overall_feedback ?? '',
    status: 'graded',
    graded_at: new Date().toISOString(),
  });
  if (error) return { ok: false };

  revalidatePath(`/sv/app/student/klassprov/${testId}`);
  revalidatePath(`/en/app/student/klassprov/${testId}`);
  return { ok: true };
}

const gradeUpdateSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string(),
      points: z.number().int().min(0),
      feedback: z.string(),
    }),
  ),
  overallFeedback: z.string(),
});

/** Lärarens justeringar av poäng/feedback på en inlämning (skriver över AI). */
export async function updateSubmissionGrade(
  submissionId: string,
  payload: {
    answers: { question_id: string; points: number; feedback: string }[];
    overallFeedback: string;
  },
): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  if (profile.role !== 'teacher' && profile.role !== 'admin') return { ok: false };

  const parsed = gradeUpdateSchema.safeParse(payload);
  if (!parsed.success) return { ok: false };

  const supabase = await createSupabaseServerClient();
  const { data: subRow } = await supabase
    .from('class_test_submissions')
    .select('*')
    .eq('id', submissionId)
    .maybeSingle();
  const submission = subRow as ClassTestSubmission | null;
  if (!submission) return { ok: false };

  const overrideByQuestion = new Map(
    parsed.data.answers.map((a) => [a.question_id, a]),
  );
  const answers: ClassTestAnswer[] = submission.answers.map((a) => {
    const o = overrideByQuestion.get(a.question_id);
    if (!o) return a;
    return {
      ...a,
      points: Math.min(o.points, a.max_points),
      feedback: o.feedback,
    };
  });
  const score = answers.reduce((sum, a) => sum + a.points, 0);

  const { error } = await supabase
    .from('class_test_submissions')
    .update({
      answers,
      score,
      overall_feedback: parsed.data.overallFeedback,
    })
    .eq('id', submissionId);
  if (error) return { ok: false };

  revalidatePath(`/sv/app/teacher/klassprov/${submission.class_test_id}/${submissionId}`);
  revalidatePath(`/en/app/teacher/klassprov/${submission.class_test_id}/${submissionId}`);
  return { ok: true };
}

/** Släpper en inlämning till eleven (resultatet blir synligt). */
export async function releaseSubmission(
  submissionId: string,
): Promise<{ ok: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  if (profile.role !== 'teacher' && profile.role !== 'admin') return { ok: false };

  const supabase = await createSupabaseServerClient();
  const { data: subRow } = await supabase
    .from('class_test_submissions')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .eq('id', submissionId)
    .select('class_test_id')
    .maybeSingle();
  if (!subRow) return { ok: false };

  const classTestId = (subRow as { class_test_id: string }).class_test_id;
  revalidatePath(`/sv/app/teacher/klassprov/${classTestId}/${submissionId}`);
  revalidatePath(`/en/app/teacher/klassprov/${classTestId}/${submissionId}`);
  revalidatePath(`/sv/app/teacher/klassprov/${classTestId}`);
  revalidatePath(`/en/app/teacher/klassprov/${classTestId}`);
  return { ok: true };
}
```

- [ ] **Step 2: Lägg till grading-RPC i migrationen**

`submitClassTest` behöver de fulla frågorna (med facit) trots att eleven saknar direkt SELECT. Lägg till denna RPC i `supabase/migrations/20260624120000_class_tests.sql` (och applicera via `apply_migration`). Den returnerar facit ENDAST när provet är publicerat och eleven är klassmedlem — den anropas bara server-side i rättningen:

```sql
-- RPC: fulla frågor (med facit) för rättning vid inlämning. Bara för publicerat
-- prov där anroparen är klassmedlem. Anropas enbart server-side i submit-flödet.
create or replace function public.get_class_test_for_grading(p_test_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.class_tests;
begin
  select * into v_row from public.class_tests
  where id = p_test_id and status = 'published';
  if not found then
    return null;
  end if;
  if not exists (
    select 1 from public.class_members m
    where m.class_id = v_row.class_id and m.profile_id = auth.uid()
  ) then
    return null;
  end if;
  return jsonb_build_object(
    'questions', v_row.questions,
    'school_id', v_row.school_id,
    'max_score', v_row.max_score
  );
end;
$$;

grant execute on function public.get_class_test_for_grading(uuid) to authenticated;
```

Verifiera efter applicering:
```sql
select proname from pg_proc where proname = 'get_class_test_for_grading';
```

- [ ] **Step 3: Verifiera typecheck + lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/actions/class-test.ts supabase/migrations/20260624120000_class_tests.sql
git commit -m "feat(klassprov): inlämning, AI-rättning, lärar-justering, släpp"
```

---

## Task 6: Data-layer — läs-helpers

**Files:**
- Create: `apps/web/lib/data/class-test.ts`

Mönster speglar `lib/data/teacher.ts` (server-side Supabase-läsning med typade rader).

- [ ] **Step 1: Skriv läs-helpers**

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  ClassTest,
  ClassTestSubmission,
  MySubmissionResult,
  PublishedClassTestForStudent,
} from '@/lib/supabase/database';

export type ClassTestListRow = {
  id: string;
  title: string;
  status: ClassTest['status'];
  className: string | null;
  createdAt: string;
  submissionCount: number;
  pendingReviewCount: number; // status='graded' (ej släppta)
};

/** Lärarens klassprov-lista med inlämnings- och granskningsräknare. */
export async function getTeacherClassTests(): Promise<ClassTestListRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data: testRows } = await supabase
    .from('class_tests')
    .select('id, title, status, created_at, classes ( name )')
    .order('created_at', { ascending: false });

  const tests = (testRows ?? []) as {
    id: string;
    title: string;
    status: ClassTest['status'];
    created_at: string;
    classes: { name: string } | null;
  }[];
  if (tests.length === 0) return [];

  const ids = tests.map((t) => t.id);
  const { data: subRows } = await supabase
    .from('class_test_submissions')
    .select('class_test_id, status')
    .in('class_test_id', ids);
  const subs = (subRows ?? []) as { class_test_id: string; status: string }[];

  const total = new Map<string, number>();
  const pending = new Map<string, number>();
  for (const s of subs) {
    total.set(s.class_test_id, (total.get(s.class_test_id) ?? 0) + 1);
    if (s.status === 'graded') {
      pending.set(s.class_test_id, (pending.get(s.class_test_id) ?? 0) + 1);
    }
  }

  return tests.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    className: t.classes?.name ?? null,
    createdAt: t.created_at,
    submissionCount: total.get(t.id) ?? 0,
    pendingReviewCount: pending.get(t.id) ?? 0,
  }));
}

/** Ett klassprov för lärarvyn (full data inkl. facit). */
export async function getClassTestForTeacher(
  testId: string,
): Promise<ClassTest | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('class_tests')
    .select('*')
    .eq('id', testId)
    .maybeSingle();
  return (data as ClassTest | null) ?? null;
}

export type SubmissionListRow = {
  id: string;
  studentName: string | null;
  score: number;
  maxScore: number;
  status: ClassTestSubmission['status'];
  submittedAt: string;
};

export type NotStartedStudent = { id: string; name: string | null };

export type ClassTestSubmissionsView = {
  submitted: SubmissionListRow[];
  notStarted: NotStartedStudent[];
};

/** Inlämningar + elever som inte börjat, för lärarens översikt. */
export async function getClassTestSubmissions(
  test: ClassTest,
): Promise<ClassTestSubmissionsView> {
  const supabase = await createSupabaseServerClient();

  const { data: subRows } = await supabase
    .from('class_test_submissions')
    .select('id, student_id, score, max_score, status, submitted_at, profiles ( full_name )')
    .eq('class_test_id', test.id)
    .order('submitted_at', { ascending: false });
  const subs = (subRows ?? []) as {
    id: string;
    student_id: string;
    score: number;
    max_score: number;
    status: ClassTestSubmission['status'];
    submitted_at: string;
    profiles: { full_name: string | null } | null;
  }[];

  const { data: memberRows } = await supabase
    .from('class_members')
    .select('profile_id, profiles ( full_name )')
    .eq('class_id', test.class_id);
  const members = (memberRows ?? []) as {
    profile_id: string;
    profiles: { full_name: string | null } | null;
  }[];

  const submittedIds = new Set(subs.map((s) => s.student_id));
  return {
    submitted: subs.map((s) => ({
      id: s.id,
      studentName: s.profiles?.full_name ?? null,
      score: s.score,
      maxScore: s.max_score,
      status: s.status,
      submittedAt: s.submitted_at,
    })),
    notStarted: members
      .filter((m) => !submittedIds.has(m.profile_id))
      .map((m) => ({ id: m.profile_id, name: m.profiles?.full_name ?? null })),
  };
}

/** En inlämning för lärarens granskningsvy (full data). */
export async function getSubmissionForTeacher(
  submissionId: string,
): Promise<ClassTestSubmission | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('class_test_submissions')
    .select('*')
    .eq('id', submissionId)
    .maybeSingle();
  return (data as ClassTestSubmission | null) ?? null;
}

// --- Elev-läsning (via RPC) ---

export type StudentClassTestRow = {
  testId: string;
  title: string;
  className: string | null;
  status: ClassTest['status'];
  submissionId: string | null;
  submissionStatus: ClassTestSubmission['status'] | null;
};

/** Elevens klassprov-lista: publicerade prov i elevens klasser + ev. inlämning. */
export async function getStudentClassTests(
  studentId: string,
): Promise<StudentClassTestRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data: memberRows } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('profile_id', studentId);
  const classIds = (memberRows ?? []).map(
    (m) => (m as { class_id: string }).class_id,
  );
  if (classIds.length === 0) return [];

  const { data: testRows } = await supabase
    .from('class_tests')
    .select('id, title, status, class_id, classes ( name )')
    .in('class_id', classIds)
    .in('status', ['published', 'closed'])
    .order('published_at', { ascending: false });
  const tests = (testRows ?? []) as {
    id: string;
    title: string;
    status: ClassTest['status'];
    class_id: string;
    classes: { name: string } | null;
  }[];
  if (tests.length === 0) return [];

  const { data: subRows } = await supabase
    .from('class_test_submissions')
    .select('id, class_test_id, status')
    .eq('student_id', studentId)
    .in('class_test_id', tests.map((t) => t.id));
  const subByTest = new Map(
    ((subRows ?? []) as {
      id: string;
      class_test_id: string;
      status: ClassTestSubmission['status'];
    }[]).map((s) => [s.class_test_id, s]),
  );

  return tests.map((t) => {
    const sub = subByTest.get(t.id);
    return {
      testId: t.id,
      title: t.title,
      className: t.classes?.name ?? null,
      status: t.status,
      submissionId: sub?.id ?? null,
      submissionStatus: sub?.status ?? null,
    };
  });
}

/** Facit-strippat prov för eleven (via RPC). */
export async function getPublishedClassTest(
  testId: string,
): Promise<PublishedClassTestForStudent | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc('get_published_class_test', {
    p_test_id: testId,
  });
  return (data as PublishedClassTestForStudent | null) ?? null;
}

/** Elevens släppta resultat (via RPC; null om ej släppt). */
export async function getMySubmissionResult(
  submissionId: string,
): Promise<MySubmissionResult | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc('get_my_submission_result', {
    p_submission_id: submissionId,
  });
  return (data as MySubmissionResult | null) ?? null;
}
```

> Obs: kontrollera att kolumnen för elevnamn heter `full_name` i `profiles` (annars justera select). Verifiera med `grep -n "full_name\|display_name\|name" apps/web/lib/data/teacher.ts`.

- [ ] **Step 2: Verifiera typecheck + lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/data/class-test.ts
git commit -m "feat(klassprov): data-layer för lärare + elev"
```

---

## Task 7: i18n-strängar + nav

**Files:**
- Modify: `apps/web/lib/i18n/types.ts`, `apps/web/lib/i18n/locales/sv.ts`, `apps/web/lib/i18n/locales/en.ts`, `apps/web/lib/app/nav.ts`

- [ ] **Step 1: Lägg till nav-nyckel `classTests` i i18n-typerna**

Hitta var nav-etiketterna typas (sök `sharedTests` i `apps/web/lib/i18n/types.ts`) och lägg till `classTests: string;` i samma block för både student- och teacher-nav (eller den delade nav-strukturen — spegla hur `examPrep`/`sharedTests` är typade).

- [ ] **Step 2: Lägg till svenska strängar**

I `apps/web/lib/i18n/locales/sv.ts`, i nav-blocken: lägg `classTests: 'Klassprov'` (full), `classTests: 'Prov'` (mobil-kort om `m`-blocket finns), och en description. Lägg även ett nytt `klassprov`-strängblock för vyerna (titel, knapptexter):
```typescript
klassprov: {
  newTest: 'Nytt prov',
  title: 'Titel',
  pickClass: 'Välj klass',
  pickLessons: 'Välj lektioner',
  questionCount: 'Antal frågor',
  closed: 'Stängda',
  open: 'Öppna',
  reasoning: 'Resonerande',
  generate: 'Generera utkast',
  publish: 'Publicera till klassen',
  regenerate: 'Regenerera',
  takeTest: 'Gör provet',
  submit: 'Lämna in',
  awaitingReview: 'Inlämnat — väntar på lärarens granskning',
  release: 'Släpp till elev',
  released: 'Resultat släppt',
  pendingReview: 'väntar på granskning',
  notStarted: 'Inte börjat',
  overallFeedback: 'Helhetskommentar',
  points: 'Poäng',
},
```

- [ ] **Step 3: Lägg till engelska strängar**

Spegla i `apps/web/lib/i18n/locales/en.ts`: `classTests: 'Class tests'` / `'Tests'`, och `klassprov`-blocket på engelska (New test, Title, Pick class, Pick lessons, Number of questions, Closed, Open, Reasoning, Generate draft, Publish to class, Regenerate, Take test, Submit, "Submitted — awaiting teacher review", Release to student, Result released, "awaiting review", "Not started", Overall comment, Points).

- [ ] **Step 4: Lägg till nav-poster**

I `apps/web/lib/app/nav.ts`:
- I student-arrayen (efter `learnerProfile`, rad ~42):
  ```typescript
  { id: 'classTests', href: `${base}/student/klassprov`, label: s.classTests, mobileLabel: m.classTests, description: d.classTests },
  ```
- I teacher-arrayen (efter `sharedTests`, rad ~53):
  ```typescript
  { id: 'classTests', href: `${base}/teacher/klassprov`, label: t.classTests, mobileLabel: m.classTests, description: d.classTests },
  ```
Använd samma `s`/`t`/`m`/`d`-källor som de omgivande raderna refererar till.

- [ ] **Step 5: Verifiera typecheck + lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS (i18n-typerna kräver att alla locales har nycklarna).

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/i18n apps/web/lib/app/nav.ts
git commit -m "feat(klassprov): i18n-strängar + nav-poster"
```

---

## Task 8: Lärar-UI — lista + skapa-vy (reglage)

**Files:**
- Create: `apps/web/app/[locale]/app/[role]/klassprov/page.tsx`
- Create: `apps/web/app/[locale]/app/[role]/klassprov/nytt/page.tsx`
- Create: `apps/web/app/[locale]/app/[role]/klassprov/nytt/ClassTestBuilder.tsx`

Spegla styling/struktur från `app/[locale]/app/[role]/prov/page.tsx` (container, rubrik, Card-lista) och `provplugg`-vyerna.

- [ ] **Step 1: Lista-sidan (`klassprov/page.tsx`)**

Server component som branchar på roll:
- Validera `isLocale`/`isRole`, `getCurrentProfile`, annars redirect.
- **Lärare:** `getTeacherClassTests()` → rendera lista med titel, klass, status-`Badge`, `submissionCount` och — om `pendingReviewCount > 0` — en coral-badge `"{n} {t.klassprov.pendingReview}"`. Länk per rad till `/{locale}/app/teacher/klassprov/{id}`. Knapp `"{t.klassprov.newTest}"` → `/{locale}/app/teacher/klassprov/nytt`.
- **Elev:** redirecta till en egen elev-lista (Task 11 hanterar `/student/klassprov` separat — denna fil kan tidigt `redirect` elever dit, eller rendera elev-grenen. För enkelhet: om `role==='student'`, anropa `getStudentClassTests` och rendera elevlistan här). Implementera elevgrenen i Task 11 och låt denna fil i Task 8 hantera lärargrenen + `redirect` för student tills Task 11.

Metadata: `robots: { index: false, follow: false }`, titel `t.klassprov`-rubrik.

- [ ] **Step 2: Skapa-sidan (`nytt/page.tsx`)**

Server component (endast lärare/admin, annars redirect). Hämta lärarens klasser + lektioner med klart transkript per klass — återanvänd `getTeacherClasses(profile.id)` och en lektions-läsning grupperad på `class_id` (spegla `getTeacherLessons` men filtrera `transcript_status='ready'`). Skicka ner som props till `<ClassTestBuilder>`. Forma datan som:
```typescript
type ClassOption = { id: string; name: string; lessons: { id: string; title: string | null }[] };
```

- [ ] **Step 3: ClassTestBuilder (klient-komponent)**

```typescript
'use client';

import { useMemo, useState } from 'react';
import { createClassTestDraft } from '@/app/actions/class-test';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';

type ClassOption = {
  id: string;
  name: string;
  lessons: { id: string; title: string | null }[];
};

type Props = {
  classes: ClassOption[];
  locale: Locale;
  labels: {
    title: string;
    pickClass: string;
    pickLessons: string;
    questionCount: string;
    closed: string;
    open: string;
    reasoning: string;
    generate: string;
  };
};

export function ClassTestBuilder({ classes, locale, labels }: Props) {
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [total, setTotal] = useState(8);
  const [closedPct, setClosedPct] = useState(50);
  const [openPct, setOpenPct] = useState(30);
  const [reasoningPct, setReasoningPct] = useState(20);
  const [submitting, setSubmitting] = useState(false);

  const lessons = useMemo(
    () => classes.find((c) => c.id === classId)?.lessons ?? [],
    [classes, classId],
  );

  // Live-förhandsvisning av antal per typ (largest-remainder, speglar servern).
  const counts = useMemo(() => {
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
    let rem = total - (floored.closed + floored.open + floored.reasoning);
    const order = (['closed', 'open', 'reasoning'] as const).sort(
      (a, b) => raw[b] - floored[b] - (raw[a] - floored[a]),
    );
    for (const k of order) {
      if (rem <= 0) break;
      floored[k] += 1;
      rem -= 1;
    }
    return floored;
  }, [total, closedPct, openPct, reasoningPct]);

  const canSubmit = classId && selectedLessons.length > 0 && !submitting;

  function toggleLesson(id: string) {
    setSelectedLessons((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <form
      action={createClassTestDraft}
      onSubmit={() => setSubmitting(true)}
      className="space-y-8"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="total" value={total} />
      <input type="hidden" name="closed_pct" value={closedPct} />
      <input type="hidden" name="open_pct" value={openPct} />
      <input type="hidden" name="reasoning_pct" value={reasoningPct} />
      {selectedLessons.map((id) => (
        <input key={id} type="hidden" name="lesson_ids" value={id} />
      ))}

      {/* Titel */}
      <label className="block">
        <span className="text-sm font-medium">{labels.title}</span>
        <input
          name="title"
          required
          className="mt-1 w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-3 py-2"
        />
      </label>

      {/* Klassval */}
      <label className="block">
        <span className="text-sm font-medium">{labels.pickClass}</span>
        <select
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setSelectedLessons([]);
          }}
          className="mt-1 w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-3 py-2"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      {/* Lektionsval */}
      <fieldset>
        <legend className="text-sm font-medium">{labels.pickLessons}</legend>
        <div className="mt-2 space-y-2">
          {lessons.map((l) => (
            <label key={l.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedLessons.includes(l.id)}
                onChange={() => toggleLesson(l.id)}
              />
              <span>{l.title ?? l.id}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Reglage */}
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">
            {labels.questionCount}: {total}
          </span>
          <input
            type="range" min={3} max={20} value={total}
            onChange={(e) => setTotal(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <Slider label={`${labels.closed} (${counts.closed})`} value={closedPct} onChange={setClosedPct} />
        <Slider label={`${labels.open} (${counts.open})`} value={openPct} onChange={setOpenPct} />
        <Slider label={`${labels.reasoning} (${counts.reasoning})`} value={reasoningPct} onChange={setReasoningPct} />
      </div>

      <Button type="submit" disabled={!canSubmit}>
        {labels.generate}
      </Button>
    </form>
  );
}

function Slider({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label} — {value}%</span>
      <input
        type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full"
        aria-label={label}
      />
    </label>
  );
}
```

- [ ] **Step 4: Verifiera typecheck + lint + preview**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS. Starta preview, gå till `/sv/app/teacher/klassprov/nytt`, bekräfta att reglagen uppdaterar antalspreview och att lektioner laddas per klass.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[locale]/app/[role]/klassprov/page.tsx" "apps/web/app/[locale]/app/[role]/klassprov/nytt"
git commit -m "feat(klassprov): lärarlista + skapa-vy med reglage"
```

---

## Task 9: Lärar-UI — editor + inlämnings-översikt

**Files:**
- Create: `apps/web/app/[locale]/app/[role]/klassprov/[id]/page.tsx`
- Create: `apps/web/app/[locale]/app/[role]/klassprov/[id]/QuestionEditor.tsx`
- Create: `apps/web/app/[locale]/app/[role]/klassprov/[id]/ClassTestRunner.tsx` (elev — fylls i Task 11, men skapas tom-stub här om sidan importerar villkorligt; annars skapa i Task 11)

- [ ] **Step 1: `[id]/page.tsx` — server component, branch på status & roll**

- Validera locale/role, `getCurrentProfile`.
- **Lärare/admin:** `getClassTestForTeacher(id)`. Om `null` → `notFound()`.
  - `status==='draft'` → rendera `<QuestionEditor test={...} locale={...} />` (redigera + publicera).
  - `status==='published' | 'closed'` → `getClassTestSubmissions(test)` och rendera översikt: lista `submitted` (namn, poäng `score/maxScore`, status-Badge, länk till `/{base}/klassprov/{id}/{submission.id}`), och `notStarted` (namnlista). Visa `closeClassTest`-knapp om published.
- **Elev:** redirect till `/{locale}/app/student/klassprov/{id}` (Task 11-vy).

- [ ] **Step 2: QuestionEditor (klient-komponent)**

State: `questions: PracticeQuestion[]`. Per fråga: redigerbar `prompt` (textarea), `max_points` (number), `answer_key` (textarea); för `multiple_choice` även 4 `options` + `correct_index` (radio). Knappar per fråga: **Regenerera** (`regenerateQuestion(testId, q.id)` → ersätt i state med returnerad `question`), **Ta bort** (filtrera ur state). Längst ned: **Spara** (`updateClassTestQuestions(testId, questions)`) och **Publicera** (`publishClassTest(testId)` → `router.push` till samma sida som nu visar översikten). Använd `useTransition`. Visa typ-etikett per fråga (spegla `typeLabel` från `TestRunner`). Validera klient-side att `prompt` ej tomt innan spara.

Nyckel-logik (regenerera):
```typescript
const [pending, startTransition] = useTransition();
function regen(qid: string) {
  startTransition(async () => {
    const res = await regenerateQuestion(testId, qid);
    if (res.ok && res.question) {
      setQuestions((prev) => prev.map((q) => (q.id === qid ? res.question! : q)));
    }
  });
}
```

- [ ] **Step 3: Verifiera typecheck + lint + preview**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS. I preview: skapa ett utkast (Task 8), redigera en fråga, regenerera, publicera, bekräfta att översikten visas efter publicering.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/[locale]/app/[role]/klassprov/[id]/page.tsx" "apps/web/app/[locale]/app/[role]/klassprov/[id]/QuestionEditor.tsx"
git commit -m "feat(klassprov): lärar-editor + inlämnings-översikt"
```

---

## Task 10: Lärar-UI — granskningsvy + släpp

**Files:**
- Create: `apps/web/app/[locale]/app/[role]/klassprov/[id]/[submissionId]/page.tsx`
- Create: `apps/web/app/[locale]/app/[role]/klassprov/[id]/[submissionId]/GradeReview.tsx`

- [ ] **Step 1: `[submissionId]/page.tsx` — server component (lärare/admin)**

- Validera roll; `getSubmissionForTeacher(submissionId)` + `getClassTestForTeacher(id)` (för frågetexterna/facit). Om något `null` → `notFound()`.
- Rendera `<GradeReview test={test} submission={submission} locale={locale} />`.

- [ ] **Step 2: GradeReview (klient-komponent)**

Visar per fråga: frågetext, facit (`answer_key`), elevens svar (`answer`), AI:ns förslag (`ai_points`/`ai_feedback`) som referens, och redigerbara fält: `points` (number, max `max_points`) + `feedback` (textarea, förifylld med nuvarande `feedback`). Plus `overall_feedback` (textarea). Två knappar:
- **Spara** → `updateSubmissionGrade(submissionId, { answers, overallFeedback })`.
- **Släpp till elev** → först `updateSubmissionGrade(...)` sen `releaseSubmission(submissionId)` → `router.refresh()`. Om redan `released`, visa badge istället för knapp.

State-form:
```typescript
const [answers, setAnswers] = useState(
  submission.answers.map((a) => ({
    question_id: a.question_id,
    points: a.points,
    feedback: a.feedback,
  })),
);
const [overall, setOverall] = useState(submission.overall_feedback);
```
Mappa frågetext via `test.questions.find((q) => q.id === a.question_id)`.

- [ ] **Step 3: Verifiera typecheck + lint + preview**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS. I preview (kräver en inlämnad submission — gör Task 11 först eller seed:a en rad): justera poäng, släpp, bekräfta status→released.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/[locale]/app/[role]/klassprov/[id]/[submissionId]"
git commit -m "feat(klassprov): lärarens granskningsvy + släpp"
```

---

## Task 11: Elev-UI — lista + provtagning + resultat

**Files:**
- Modify: `apps/web/app/[locale]/app/[role]/klassprov/page.tsx` (elevgrenen)
- Create: `apps/web/app/[locale]/app/[role]/klassprov/[id]/ClassTestRunner.tsx`
- Modify: `apps/web/app/[locale]/app/[role]/klassprov/[id]/page.tsx` (elevgrenen)

- [ ] **Step 1: Elevlistan i `klassprov/page.tsx`**

I student-grenen: `getStudentClassTests(profile.id)` → lista med titel, klass, och status-chip:
- `submissionStatus === null` → "Att göra" + länk `/{base}/student/klassprov/{testId}`.
- `submissionStatus === 'graded'` → "Inlämnat — väntar på granskning" (ingen resultatlänk).
- `submissionStatus === 'released'` → "Resultat klart" + länk till `/{base}/student/klassprov/{testId}` (visar resultat).

- [ ] **Step 2: ClassTestRunner (klient-komponent)**

Spegla `provplugg/[id]/TestRunner.tsx` men anropa `submitClassTest(testId, payload)`. Props: `{ testId: string; questions: StudentClassTestQuestion[]; locale: Locale }`. Återanvänd samma `typeLabel`, fråge-rendering (flerval = radio på `options`, övriga = textarea), `answeredCount`, submit via `useTransition`. Vid `result.ok` → `router.refresh()`.

```typescript
'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { submitClassTest } from '@/app/actions/class-test';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type { StudentClassTestQuestion, PracticeQuestionType } from '@/lib/supabase/database';
// ... (kopiera typeLabel + JSX-struktur från TestRunner, byt submit-action)
```

- [ ] **Step 3: Elevgrenen i `[id]/page.tsx`**

I student-grenen (server component):
1. Hämta ev. inlämning: `getStudentClassTests(profile.id)` och hitta raden för `id` (ger `submissionId` + `submissionStatus`).
2. Om `submissionStatus === 'released'` → `getMySubmissionResult(submissionId)` och rendera resultatvy (per fråga: svar, poäng `points/max_points`, lärarens `feedback`; överst `score/max_score` + `overall_feedback`). Spegla resultat-renderingen i `provplugg/[id]/page.tsx`.
3. Om `submissionStatus === 'graded'` → rendera "Inlämnat — väntar på lärarens granskning"-tillstånd (EmptyState).
4. Annars (`null`) → `getPublishedClassTest(id)`; om `null` → `notFound()`; annars `<ClassTestRunner testId={id} questions={data.questions} locale={locale} />`.

- [ ] **Step 4: Verifiera typecheck + lint + preview (full flöde)**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS. Preview end-to-end: lärare skapar→publicerar; logga in som elev i klassen, gör provet, lämna in; bekräfta "väntar på granskning"; som lärare granska+släpp; som elev se resultatet. **Säkerhetskontroll:** inspektera nätverkssvaret för `get_published_class_test` och bekräfta att `answer_key`/`correct_index` INTE finns med; bekräfta att resultatet inte syns innan släpp.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[locale]/app/[role]/klassprov"
git commit -m "feat(klassprov): elev-lista, provtagning och släppt resultat"
```

---

## Task 12: Slutverifiering + dokumentation

**Files:**
- Modify: `CHANGELOG.md`, `CLAUDE.md` (Fasminne-rad)

- [ ] **Step 1: Full build + lint + typecheck**

Run: `pnpm --filter web build && pnpm --filter web lint && pnpm --filter web typecheck`
Expected: PASS, alla nya rutter genererade (klassprov-rutterna är dynamiska/`noindex`).

- [ ] **Step 2: Säkerhetsgenomgång (manuell, mot QA-kraven i specen)**

Bekräfta:
- Facit (`answer_key`, `correct_index`) saknas i `get_published_class_test`-svaret.
- `get_my_submission_result` returnerar `null` när `status='graded'` (ej släppt).
- Elev kan inte SELECT:a `class_tests` direkt (testa via Supabase MCP `execute_sql` med en elevs JWT-kontext om möjligt, annars läs policyn).
- Reglagen summerar till `total` (testa 33/33/34 + udda total).

- [ ] **Step 3: Uppdatera CHANGELOG + CLAUDE.md**

Lägg en rad i `CHANGELOG.md` och ett Fasminne-stycke i `CLAUDE.md` som beskriver Klassprov (lärar-författade prov, reglage, AI-förrättning, lärar-granskning/släpp, RPC-baserad facit/release-gating). Spegla tonen i befintliga Fasminne-rader.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md CLAUDE.md
git commit -m "docs(klassprov): CHANGELOG + fasminne"
```

- [ ] **Step 5: Loggning till Notion (om MCP tillgängligt)**

Logga en CHANGELOG-post i Notion enligt CLAUDE.md (Notion = single source of truth).

---

## Self-review-anteckningar (täckning mot specen)

- **Datamodell** → Task 1 (tabeller) + Task 2 (typer). ✅
- **Släppflöde (dolt tills released)** → Task 1 RLS/RPC + Task 5 submit (`status='graded'`) + Task 10 release. ✅
- **Reglage-mappning** → Task 3 `generateClassTest` + Task 4 `compositionFromPercentages` + Task 8 reglage-UI. ✅
- **Källa = transkript** → Task 4 lektionsläsning (`transcript_status='ready'`, icke-tomt). ✅
- **Utkast→redigera→publicera** → Task 9 editor. ✅
- **AI förrättar, lärare äger feedback** → Task 5 (AI) + Task 10 (lärar-justering/släpp), `ai_points`/`ai_feedback` bevaras. ✅
- **Facit aldrig till elev / resultat gated** → Task 1 RPC:er + Task 11 säkerhetskontroll. ✅
- **Nav + i18n + WCAG + Zod + responsivt** → Task 7 + genomgående. ✅
- **Ej i V1:** materialextraktion, deadlines — uttalat utelämnade. ✅
