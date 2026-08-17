# Kunskapsträning före prov — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ge eleven två träningslägen före prov — flashcards (Repetera) och kunskapskollar (Träna) — serverade från träningsunderlag som genereras en gång per lektion, utan nya AI-anrop vid elevens klick.

**Architecture:** Tre lager. Lager 1: ett extra Claude-anrop i `transcribe-lesson`-pipelinen (Deno Edge Function) extraherar koncept/flashcards/kunskapskollar till en `training_materials`-rad per lektion (jsonb-kolumner, samma konvention som `class_tests.questions`). Samma funktion har ett andra läge (`training_material_only`) som kör om bara den här genereringen från ett redan befintligt transkript — det är den ENDA platsen AI-anropet finns, och används både av pipelinen och av lat backfill för äldre lektioner (anropas via `functions.invoke`, aldrig en andra implementation i Next.js). Lager 2: ren applogik — SM-2 spaced repetition (egen implementation, `lib/training/sm2.ts`) schemalägger flashcards, kunskapskollar viktas mot koncept eleven svarat sämre på. Sessioner persisteras i `training_sessions` så refresh inte blandar om urvalet. Lager 3 (Förhör mig, Förklara med egna ord) ingår INTE — egna specar senare.

**Tech Stack:** Next.js 16 App Router (Server Components + Server Actions), Supabase Postgres med RLS, Deno Edge Function (Anthropic REST API direkt, samma mönster som `generateLessonContent`), Zod, Tailwind v4, vitest (nytt — bara för `sm2()`).

**Spec:** `docs/superpowers/specs/2026-08-17-kunskapstraning-fore-prov-design.md`

---

## Filstruktur

**Nya filer:**
| Fil | Ansvar |
|---|---|
| `supabase/migrations/20260817120000_training_materials.sql` | `training_materials`, `flashcard_review_state`, `knowledge_check_attempts`, `training_sessions` + RLS |
| `apps/web/lib/training/sm2.ts` | Ren SM-2-algoritm, inga beroenden |
| `apps/web/lib/training/sm2.test.ts` | Unit-tester för `sm2()` |
| `apps/web/lib/data/training.ts` | Datalager: kurser, sessionsurval (inkl. lat backfill-trigger), progress-skrivning |
| `apps/web/app/actions/training.ts` | Server Actions: skapa session, betygsätt kort, svara på kunskapskoll |
| `apps/web/app/[locale]/app/[role]/ova/page.tsx` | Landningssida (väljare) |
| `apps/web/app/[locale]/app/[role]/ova/OvaPicker.tsx` | Kurs/lektionsväljare + två lägeskort |
| `apps/web/app/[locale]/app/[role]/ova/repetera/[sessionId]/page.tsx` | Flashcard-session (server) |
| `apps/web/app/[locale]/app/[role]/ova/repetera/[sessionId]/FlashcardRunner.tsx` | Flashcard-session (klient) |
| `apps/web/app/[locale]/app/[role]/ova/trana/[sessionId]/page.tsx` | Kunskapskoll-session (server) |
| `apps/web/app/[locale]/app/[role]/ova/trana/[sessionId]/KnowledgeCheckRunner.tsx` | Kunskapskoll-session (klient) |
| `apps/web/vitest.config.ts` | Minimal vitest-config |

**Modifierade filer:**
| Fil | Ändring |
|---|---|
| `apps/web/lib/supabase/database.ts` | Nya typer + `Database['public']['Tables']`-poster |
| `supabase/functions/transcribe-lesson/index.ts` | Ny `generateTrainingMaterial()` + `training_material_only`-läge |
| `apps/web/lib/app/nav.ts` | Ny NavId `training` + item för student |
| `apps/web/lib/i18n/types.ts` | `training`-nycklar i sidebar/mobileNav/navDescriptions |
| `apps/web/lib/i18n/locales/sv.ts`, `en.ts` | Etiketter för `training` |
| `apps/web/package.json` | `vitest` devDependency + `test`-script |

---

### Task 1: Migration — tabeller och RLS

**Files:**
- Create: `supabase/migrations/20260817120000_training_materials.sql`

- [ ] **Step 1: Skriv migrationen**

Skapa `supabase/migrations/20260817120000_training_materials.sql`:

```sql
-- Kunskapsträning före prov — Foundation.
--
-- training_materials: ett träningsunderlag per lektion, genererat EN gång i
-- transcribe-lesson-pipelinen (aldrig per elev/klick). jsonb-kolumner följer
-- samma konvention som class_tests.questions.
--
-- flashcard_review_state / knowledge_check_attempts: per elev × item. Ingen rad
-- skapas förrän eleven faktiskt tränat på itemet — nya kort kräver ingen backfill.

create table if not exists public.training_materials (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  concepts jsonb not null default '[]'::jsonb,
  flashcards jsonb not null default '[]'::jsonb,
  knowledge_checks jsonb not null default '[]'::jsonb,
  model_version text,
  generated_at timestamptz not null default now()
);

comment on column public.training_materials.concepts is
  '[{id, name, definition, example, misconception}]';
comment on column public.training_materials.flashcards is
  '[{id, concept_id, front, back}]';
comment on column public.training_materials.knowledge_checks is
  '[{id, concept_id, question, choices: string[], correct_index, explanation}]';

create table if not exists public.flashcard_review_state (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  flashcard_id uuid not null,
  ease_factor real not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  last_grade text check (last_grade in ('again','hard','good')),
  unique (student_id, flashcard_id)
);

create index if not exists flashcard_review_state_due_idx
  on public.flashcard_review_state (student_id, due_at);

create table if not exists public.knowledge_check_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  knowledge_check_id uuid not null,
  correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists knowledge_check_attempts_student_idx
  on public.knowledge_check_attempts (student_id, answered_at desc);

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  mode text not null check (mode in ('flashcards','knowledge_checks')),
  lesson_ids uuid[] not null,
  item_ids uuid[] not null,
  created_at timestamptz not null default now()
);

create index if not exists training_sessions_student_idx
  on public.training_sessions (student_id, created_at desc);

alter table public.training_materials enable row level security;
alter table public.flashcard_review_state enable row level security;
alter table public.knowledge_check_attempts enable row level security;
alter table public.training_sessions enable row level security;

-- training_materials: läsbart för alla i samma skola (samma nivå som
-- lessons_select_same_school). Ingen skrivpolicy — bara service-role skriver.
create policy "training_materials_select_same_school" on public.training_materials
  for select to authenticated
  using (school_id = public.current_school_id());

-- Progress-tabeller: eleven äger sina egna rader, helt privat.
create policy "flashcard_review_state_own_select" on public.flashcard_review_state
  for select to authenticated
  using (student_id = (select auth.uid()));
create policy "flashcard_review_state_own_insert" on public.flashcard_review_state
  for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy "flashcard_review_state_own_update" on public.flashcard_review_state
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create policy "knowledge_check_attempts_own_select" on public.knowledge_check_attempts
  for select to authenticated
  using (student_id = (select auth.uid()));
create policy "knowledge_check_attempts_own_insert" on public.knowledge_check_attempts
  for insert to authenticated
  with check (student_id = (select auth.uid()));

create policy "training_sessions_own_select" on public.training_sessions
  for select to authenticated
  using (student_id = (select auth.uid()));
create policy "training_sessions_own_insert" on public.training_sessions
  for insert to authenticated
  with check (student_id = (select auth.uid()));
```

- [ ] **Step 2: Applicera migrationen mot prod-projektet**

Använd Supabase MCP-verktyget `apply_migration` mot projekt `msqfuywpbrteyrzjggsw`
med namnet `training_materials` och SQL:en ovan. (Detta är projektets etablerade
arbetssätt — migrationsfilerna i repot speglar prod.)

Verifiera efteråt med MCP `list_tables` att alla fyra tabellerna finns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260817120000_training_materials.sql
git commit -m "feat(träning): migration för träningsunderlag och elevprogress"
```

---

### Task 2: SM-2-algoritmen (TDD)

**Files:**
- Create: `apps/web/lib/training/sm2.ts`
- Create: `apps/web/lib/training/sm2.test.ts`
- Create: `apps/web/vitest.config.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Installera vitest och lägg till test-script**

```bash
cd /Users/johnguthed/elevante/apps/web && pnpm add -D vitest@^3.0.0
```

Lägg sedan till raden `"test": "vitest run",` i `scripts` i
`apps/web/package.json`, direkt efter `"typecheck"`-raden (kom ihåg kommatecken
på typecheck-raden).

- [ ] **Step 2: Skapa vitest-config**

Skapa `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: Skriv de fallerande testerna**

Skapa `apps/web/lib/training/sm2.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sm2, type Sm2State } from './sm2';

const fresh: Sm2State = { easeFactor: 2.5, intervalDays: 0, repetitions: 0 };

describe('sm2', () => {
  it('ger 1 dags intervall vid första godkända repetitionen', () => {
    const next = sm2(fresh, 'good');
    expect(next.repetitions).toBe(1);
    expect(next.intervalDays).toBe(1);
  });

  it('ger 6 dagars intervall vid andra godkända repetitionen', () => {
    const next = sm2(sm2(fresh, 'good'), 'good');
    expect(next.repetitions).toBe(2);
    expect(next.intervalDays).toBe(6);
  });

  it('multiplicerar intervallet med ease factor från tredje repetitionen', () => {
    const third = sm2(sm2(sm2(fresh, 'good'), 'good'), 'good');
    expect(third.repetitions).toBe(3);
    // 6 * easeFactor, avrundat
    expect(third.intervalDays).toBe(Math.round(6 * third.easeFactor));
  });

  it('nollställer repetitioner och intervall vid "again"', () => {
    const learned = sm2(sm2(fresh, 'good'), 'good');
    const lapsed = sm2(learned, 'again');
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.intervalDays).toBe(1);
  });

  it('höjer ease factor vid "good" och sänker vid "hard"', () => {
    expect(sm2(fresh, 'good').easeFactor).toBeGreaterThan(fresh.easeFactor);
    expect(sm2(fresh, 'hard').easeFactor).toBeLessThan(fresh.easeFactor);
  });

  it('låter aldrig ease factor gå under 1.3', () => {
    let state = fresh;
    for (let i = 0; i < 20; i += 1) state = sm2(state, 'again');
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('sätter dueAt intervalDays framåt i tiden', () => {
    const before = Date.now();
    const next = sm2(fresh, 'good');
    const diffDays =
      (new Date(next.dueAt).getTime() - before) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(0.9);
    expect(diffDays).toBeLessThan(1.1);
  });
});
```

- [ ] **Step 4: Kör testerna och verifiera att de fallerar**

Kör: `cd /Users/johnguthed/elevante/apps/web && pnpm test`
Förväntat: FAIL — `Failed to resolve import "./sm2"`.

- [ ] **Step 5: Implementera sm2**

Skapa `apps/web/lib/training/sm2.ts`:

```ts
// SM-2 spaced repetition. Tre-gradig indata (again/hard/good) i stället för
// SM-2:s 0-5, eftersom elevens UI bara har tre knappar. Mappning: again→0,
// hard→3, good→5. Ren funktion — inga beroenden, inget I/O.

export type Sm2Grade = 'again' | 'hard' | 'good';

export type Sm2State = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export type Sm2Result = Sm2State & { dueAt: string };

const MIN_EASE_FACTOR = 1.3;
const QUALITY: Record<Sm2Grade, number> = { again: 0, hard: 3, good: 5 };

export function sm2(state: Sm2State, grade: Sm2Grade): Sm2Result {
  const q = QUALITY[grade];

  const easeFactor = Math.max(
    MIN_EASE_FACTOR,
    state.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  let repetitions: number;
  let intervalDays: number;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = state.repetitions + 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(state.intervalDays * easeFactor);
  }

  const dueAt = new Date(
    Date.now() + intervalDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  return { easeFactor, intervalDays, repetitions, dueAt };
}
```

- [ ] **Step 6: Kör testerna och verifiera att de passerar**

Kör: `cd /Users/johnguthed/elevante/apps/web && pnpm test`
Förväntat: PASS, 7 tester.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/training/sm2.ts apps/web/lib/training/sm2.test.ts apps/web/vitest.config.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(träning): SM-2-algoritm med unit-tester"
```

---

### Task 3: TypeScript-typer för de nya tabellerna

**Files:**
- Modify: `apps/web/lib/supabase/database.ts`

- [ ] **Step 1: Lägg till typerna**

Lägg till följande i `apps/web/lib/supabase/database.ts`, direkt före
`export type Database = {` (alltså efter `TryShareInsert`):

```ts
// --- Kunskapsträning (Foundation) ---

export type TrainingConcept = {
  id: string;
  name: string;
  definition: string;
  example: string;
  misconception: string;
};

export type TrainingFlashcard = {
  id: string;
  concept_id: string;
  front: string;
  back: string;
};

export type TrainingKnowledgeCheck = {
  id: string;
  concept_id: string;
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string;
};

export type TrainingMaterial = {
  id: string;
  school_id: string;
  lesson_id: string;
  concepts: TrainingConcept[];
  flashcards: TrainingFlashcard[];
  knowledge_checks: TrainingKnowledgeCheck[];
  model_version: string | null;
  generated_at: string;
};

type TrainingMaterialInsert = {
  school_id: string;
  lesson_id: string;
  concepts?: TrainingConcept[];
  flashcards?: TrainingFlashcard[];
  knowledge_checks?: TrainingKnowledgeCheck[];
  model_version?: string | null;
  id?: string;
  generated_at?: string;
};

export type FlashcardGrade = 'again' | 'hard' | 'good';

export type FlashcardReviewState = {
  id: string;
  student_id: string;
  school_id: string;
  lesson_id: string;
  flashcard_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_at: string;
  last_reviewed_at: string | null;
  last_grade: FlashcardGrade | null;
};

type FlashcardReviewStateInsert = {
  student_id: string;
  school_id: string;
  lesson_id: string;
  flashcard_id: string;
  ease_factor?: number;
  interval_days?: number;
  repetitions?: number;
  due_at?: string;
  last_reviewed_at?: string | null;
  last_grade?: FlashcardGrade | null;
  id?: string;
};

export type KnowledgeCheckAttempt = {
  id: string;
  student_id: string;
  school_id: string;
  lesson_id: string;
  knowledge_check_id: string;
  correct: boolean;
  answered_at: string;
};

type KnowledgeCheckAttemptInsert = {
  student_id: string;
  school_id: string;
  lesson_id: string;
  knowledge_check_id: string;
  correct: boolean;
  id?: string;
  answered_at?: string;
};

export type TrainingMode = 'flashcards' | 'knowledge_checks';

export type TrainingSession = {
  id: string;
  student_id: string;
  school_id: string;
  mode: TrainingMode;
  lesson_ids: string[];
  item_ids: string[];
  created_at: string;
};

type TrainingSessionInsert = {
  student_id: string;
  school_id: string;
  mode: TrainingMode;
  lesson_ids: string[];
  item_ids: string[];
  id?: string;
  created_at?: string;
};
```

- [ ] **Step 2: Registrera tabellerna i Database-typen**

I `apps/web/lib/supabase/database.ts`, lägg till dessa fyra rader i
`Database['public']['Tables']`, direkt efter raden `try_shares: TableDef<TryShare, TryShareInsert>;`:

```ts
      training_materials: TableDef<TrainingMaterial, TrainingMaterialInsert>;
      flashcard_review_state: TableDef<FlashcardReviewState, FlashcardReviewStateInsert>;
      knowledge_check_attempts: TableDef<KnowledgeCheckAttempt, KnowledgeCheckAttemptInsert>;
      training_sessions: TableDef<TrainingSession, TrainingSessionInsert>;
```

- [ ] **Step 3: Verifiera typerna**

Kör: `cd /Users/johnguthed/elevante/apps/web && pnpm typecheck`
Förväntat: inga fel.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/supabase/database.ts
git commit -m "feat(träning): typer för träningsunderlag och progress"
```

---

### Task 4: Generering i transcribe-lesson-pipelinen + backfill-läge

**Avsteg från specen:** specen placerade `generateTrainingMaterial` i
`apps/web/lib/ai/anthropic.ts` (spegling av hur `generatePracticeTest` ligger
där). Vid planering visade det sig att funktionen då skulle behöva finnas i
TVÅ implementationer — en i Deno-funktionen för pipelinen, en i Next.js för lat
backfill — med två prompts som kan glida isär. Planen lägger den därför bara i
Edge-funktionen och exponerar ett `training_material_only`-läge som Next.js
anropar via `functions.invoke`. En prompt, en validering, en plats att ändra.

**Files:**
- Modify: `supabase/functions/transcribe-lesson/index.ts`

- [ ] **Step 1: Lägg till prompt, typer och genereringsfunktion**

Lägg till i `supabase/functions/transcribe-lesson/index.ts`, direkt efter
`generateLessonContent`-funktionen (efter dess avslutande `}` runt rad 181):

```ts
const TRAINING_MATERIAL_SYSTEM_PROMPT = `Du är en erfaren gymnasielärare som bygger träningsmaterial åt elever inför prov.

Du får ett transkript från en lektion. Extrahera strukturerat träningsunderlag:

1. 4-8 KONCEPT — de begrepp eleven ska kunna efter lektionen. För varje koncept:
   - name: begreppets namn (1-4 ord, nominalfras)
   - definition: en klar mening som förklarar begreppet
   - example: ett konkret exempel, helst lärarens eget från lektionen
   - misconception: ett vanligt missförstånd elever har om begreppet

2. FLASHCARDS — cirka 2 per koncept. Varje kort har:
   - concept_id: index (0-baserat) för konceptet kortet hör till
   - front: frågesidan (kort, konkret)
   - back: svarssidan (1-3 meningar)

3. KUNSKAPSKOLLAR — 1-2 flervalsfrågor per koncept. Varje fråga har:
   - concept_id: index (0-baserat) för konceptet
   - question: frågetexten
   - choices: exakt 4 svarsalternativ
   - correct_index: 0-3
   - explanation: kort förklaring av varför svaret är rätt

REGLER:
- Allt måste bygga BARA på transkriptet. Hitta aldrig på fakta.
- Nivån ska matcha gymnasiet — inte högskola, inte högstadium.
- Distraktorerna i kunskapskollarna ska vara rimliga, inte uppenbart fel.
- Skriv på svenska.

Svara ENDAST med valid JSON, ingen annan text:
{"concepts": [{"name": "<namn>", "definition": "<def>", "example": "<exempel>", "misconception": "<missförstånd>"}], "flashcards": [{"concept_id": <index>, "front": "<fråga>", "back": "<svar>"}], "knowledge_checks": [{"concept_id": <index>, "question": "<fråga>", "choices": ["<a>","<b>","<c>","<d>"], "correct_index": <0-3>, "explanation": "<förklaring>"}]}`;

type RawTrainingMaterial = {
  concepts: {
    name: string;
    definition: string;
    example: string;
    misconception: string;
  }[];
  flashcards: { concept_id: number; front: string; back: string }[];
  knowledge_checks: {
    concept_id: number;
    question: string;
    choices: string[];
    correct_index: number;
    explanation: string;
  }[];
};

async function generateTrainingMaterial(
  transcript: string,
  teacherName: string | null,
): Promise<RawTrainingMaterial | null> {
  if (!ANTHROPIC_KEY) return null;

  const userMessage = teacherName
    ? `Lärare: ${teacherName}\n\nTranskript:\n${transcript.slice(0, 20000)}`
    : `Transkript:\n${transcript.slice(0, 20000)}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 8192,
      system: TRAINING_MATERIAL_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic training material failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { content?: { text?: string }[] };
  const raw = json.content?.[0]?.text ?? '';
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned) as RawTrainingMaterial;

  const isText = (v: unknown): v is string =>
    typeof v === 'string' && v.trim().length > 0;

  if (
    !Array.isArray(parsed.concepts) ||
    parsed.concepts.length === 0 ||
    !Array.isArray(parsed.flashcards) ||
    !Array.isArray(parsed.knowledge_checks) ||
    !parsed.concepts.every(
      (c) =>
        isText(c?.name) &&
        isText(c?.definition) &&
        isText(c?.example) &&
        isText(c?.misconception),
    )
  ) {
    throw new Error('Training material response failed validation');
  }

  const conceptCount = parsed.concepts.length;
  const validIndex = (v: unknown): boolean =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < conceptCount;

  parsed.flashcards = parsed.flashcards.filter(
    (f) => validIndex(f?.concept_id) && isText(f?.front) && isText(f?.back),
  );
  parsed.knowledge_checks = parsed.knowledge_checks.filter(
    (k) =>
      validIndex(k?.concept_id) &&
      isText(k?.question) &&
      isText(k?.explanation) &&
      Array.isArray(k?.choices) &&
      k.choices.length === 4 &&
      k.choices.every(isText) &&
      typeof k?.correct_index === 'number' &&
      k.correct_index >= 0 &&
      k.correct_index <= 3,
  );

  if (parsed.flashcards.length === 0 && parsed.knowledge_checks.length === 0) {
    throw new Error('Training material had no usable items');
  }

  return parsed;
}

async function upsertTrainingMaterial(
  lessonId: string,
  schoolId: string,
  training: RawTrainingMaterial,
): Promise<void> {
  const conceptIds = training.concepts.map(() => crypto.randomUUID());
  await supabase.from('training_materials').upsert(
    {
      school_id: schoolId,
      lesson_id: lessonId,
      concepts: training.concepts.map((c, idx) => ({ ...c, id: conceptIds[idx] })),
      flashcards: training.flashcards.map((f) => ({
        id: crypto.randomUUID(),
        concept_id: conceptIds[f.concept_id],
        front: f.front,
        back: f.back,
      })),
      knowledge_checks: training.knowledge_checks.map((k) => ({
        id: crypto.randomUUID(),
        concept_id: conceptIds[k.concept_id],
        question: k.question,
        choices: k.choices,
        correct_index: k.correct_index,
        explanation: k.explanation,
      })),
      model_version: ANTHROPIC_MODEL,
    },
    { onConflict: 'lesson_id' },
  );
}
```

- [ ] **Step 2: Anropa den i huvudpipelinen**

I `supabase/functions/transcribe-lesson/index.ts`, lägg in detta block direkt
efter steg 7 (`await supabase.from('lessons').update({...}).eq('id', lessonId);`)
och före steg 8 (`// 8. Radera audio från Storage`):

```ts
    // 7.5. Träningsunderlag (flashcards + kunskapskollar). Eget try/catch —
    // ett fel här får aldrig blockera transcript, summary eller chatt.
    try {
      const training = await generateTrainingMaterial(transcript, teacherName);
      if (training) {
        await upsertTrainingMaterial(lessonId, lesson.school_id, training);
      }
    } catch (err) {
      console.error('Training material generation failed:', err);
    }
```

- [ ] **Step 3: Lägg till backfill-läget (`training_material_only`)**

Ändra `RequestBody`-typen (nära toppen av filen) från:

```ts
type RequestBody = { lesson_id?: string; transcript_text?: string };
```

till:

```ts
type RequestBody = {
  lesson_id?: string;
  transcript_text?: string;
  mode?: 'training_material_only';
};
```

Lägg sedan till denna funktion direkt efter `processLesson`s avslutande `}`
(före `Deno.serve(...)`):

```ts
/**
 * Genererar om ENDAST träningsunderlaget för en redan transkriberad lektion,
 * utan att röra audio/transcript/summary. Används för lat backfill av
 * lektioner som transkriberades innan den här funktionen fanns.
 */
async function regenerateTrainingMaterial(
  lessonId: string,
): Promise<{ ok: boolean; detail: string }> {
  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('id, school_id, transcript_text, teacher_id')
    .eq('id', lessonId)
    .single();

  if (lessonErr || !lesson) {
    return { ok: false, detail: `Lesson not found: ${lessonErr?.message ?? lessonId}` };
  }
  if (!lesson.transcript_text || !lesson.transcript_text.trim()) {
    return { ok: false, detail: 'Lesson har inget transcript_text att generera underlag från' };
  }

  let teacherName: string | null = null;
  if (lesson.teacher_id) {
    const { data: teacher } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', lesson.teacher_id)
      .maybeSingle();
    teacherName = teacher?.full_name ?? null;
  }

  try {
    const training = await generateTrainingMaterial(lesson.transcript_text, teacherName);
    if (!training) {
      return { ok: false, detail: 'ANTHROPIC_API_KEY saknas' };
    }
    await upsertTrainingMaterial(lessonId, lesson.school_id, training);
    return { ok: true, detail: 'Training material regenerated' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: msg };
  }
}
```

Ändra sist request-routingen i `Deno.serve`-blocket från:

```ts
  const result = await processLesson(body.lesson_id, body.transcript_text);
```

till:

```ts
  const result =
    body.mode === 'training_material_only'
      ? await regenerateTrainingMaterial(body.lesson_id)
      : await processLesson(body.lesson_id, body.transcript_text);
```

- [ ] **Step 4: Deploya Edge Function**

Använd Supabase MCP-verktyget `deploy_edge_function` mot projekt
`msqfuywpbrteyrzjggsw`, funktionsnamn `transcribe-lesson`, med hela innehållet
i `supabase/functions/transcribe-lesson/index.ts`.

Verifiera med MCP `get_edge_function` att versionen ökat och status är ACTIVE.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/transcribe-lesson/index.ts
git commit -m "feat(träning): generera träningsunderlag i pipelinen + backfill-läge"
```

---

### Task 5: Datalager — lib/data/training.ts

**Files:**
- Create: `apps/web/lib/data/training.ts`

- [ ] **Step 1: Skapa datalagret**

Skapa `apps/web/lib/data/training.ts`:

```ts
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

  for (const lessonId of missing) {
    await supabase.functions.invoke('transcribe-lesson', {
      body: { lesson_id: lessonId, mode: 'training_material_only' },
    });
  }

  const { data: refreshed } = await supabase
    .from('training_materials')
    .select('*')
    .in('lesson_id', missing);

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
```

- [ ] **Step 2: Verifiera**

Kör: `cd /Users/johnguthed/elevante/apps/web && pnpm typecheck && pnpm lint`
Förväntat: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/data/training.ts
git commit -m "feat(träning): datalager för sessionsurval och progress"
```

---

### Task 6: Server Actions — app/actions/training.ts

**Files:**
- Create: `apps/web/app/actions/training.ts`

- [ ] **Step 1: Skapa Server Actions**

Skapa `apps/web/app/actions/training.ts`:

```ts
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
```

- [ ] **Step 2: Verifiera**

Kör: `cd /Users/johnguthed/elevante/apps/web && pnpm typecheck && pnpm lint`
Förväntat: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/actions/training.ts
git commit -m "feat(träning): server actions för session, betyg och svar"
```

---

### Task 7: Navigation och i18n

**Files:**
- Modify: `apps/web/lib/app/nav.ts`
- Modify: `apps/web/lib/i18n/types.ts`
- Modify: `apps/web/lib/i18n/locales/sv.ts`
- Modify: `apps/web/lib/i18n/locales/en.ts`

- [ ] **Step 1: Lägg till NavId och nav-item**

I `apps/web/lib/app/nav.ts`:

Lägg till `| 'training'` i `NavId`-unionen, direkt efter `| 'examPrep'`.

Lägg sedan till detta nav-item i student-arrayen, direkt efter `examPrep`-raden:

```ts
      { id: 'training', href: `${base}/student/ova`, label: s.training, mobileLabel: m.training, description: d.training },
```

- [ ] **Step 2: Lägg till typerna i i18n/types.ts**

I `apps/web/lib/i18n/types.ts`, lägg till raden `training: string;` i alla tre
student-objekten — i `sidebar.student`, `mobileNav.student` och
`navDescriptions.student`, direkt efter respektive `examPrep: string;`-rad.

- [ ] **Step 3: Lägg till svenska etiketter**

I `apps/web/lib/i18n/locales/sv.ts`, direkt efter respektive `examPrep`-rad:

- I `sidebar.student`: `training: 'Öva',`
- I `mobileNav.student`: `training: 'Öva',`
- I `navDescriptions.student`: `training: 'Flashcards och kunskapskollar',`

- [ ] **Step 4: Lägg till engelska etiketter**

I `apps/web/lib/i18n/locales/en.ts`, direkt efter respektive `examPrep`-rad:

- I `sidebar.student`: `training: 'Practise',`
- I `mobileNav.student`: `training: 'Practise',`
- I `navDescriptions.student`: `training: 'Flashcards and knowledge checks',`

- [ ] **Step 5: Verifiera**

Kör: `cd /Users/johnguthed/elevante/apps/web && pnpm typecheck`
Förväntat: inga fel (typerna tvingar båda locale-filerna att vara kompletta).

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/app/nav.ts apps/web/lib/i18n/types.ts apps/web/lib/i18n/locales/sv.ts apps/web/lib/i18n/locales/en.ts
git commit -m "feat(träning): nav-post och etiketter för Öva"
```

---

### Task 8: Landningssida med väljare

**Files:**
- Create: `apps/web/app/[locale]/app/[role]/ova/page.tsx`
- Create: `apps/web/app/[locale]/app/[role]/ova/OvaPicker.tsx`

- [ ] **Step 1: Skapa väljarkomponenten**

Skapa `apps/web/app/[locale]/app/[role]/ova/OvaPicker.tsx`:

```tsx
'use client';

import { useMemo, useState, useTransition } from 'react';
import { startTrainingSession } from '@/app/actions/training';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type { TrainingCourse } from '@/lib/data/training';

type Props = {
  locale: Locale;
  courses: TrainingCourse[];
};

export function OvaPicker({ locale, courses }: Props) {
  const sv = locale === 'sv';
  const [pending, startTransition] = useTransition();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const course = useMemo(
    () => courses.find((c) => c.id === courseId) ?? courses[0],
    [courses, courseId],
  );
  const lessons = course?.lessons ?? [];
  const allSelected = lessons.length > 0 && lessons.every((l) => selected.has(l.id));
  const selectedCount = lessons.filter((l) => selected.has(l.id)).length;
  const canStart = selectedCount > 0 && !pending;

  function switchCourse(id: string) {
    setCourseId(id);
    setSelected(new Set());
  }

  function toggleLesson(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(lessons.map((l) => l.id)));
  }

  function handleStart(formData: FormData) {
    startTransition(() => {
      startTrainingSession(formData);
    });
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Intl.DateTimeFormat(sv ? 'sv-SE' : 'en-GB', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso));
  }

  return (
    <form className="space-y-8">
      <input type="hidden" name="locale" value={locale} />
      {lessons
        .filter((l) => selected.has(l.id))
        .map((l) => (
          <input key={l.id} type="hidden" name="lesson_ids" value={l.id} />
        ))}

      {/* Steg 1 — kurs */}
      <div>
        <p className="eyebrow mb-3">{sv ? '1 · Välj kurs' : '1 · Pick a course'}</p>
        <div className="flex flex-wrap gap-2">
          {courses.map((c) => {
            const active = c.id === course?.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => switchCourse(c.id)}
                aria-pressed={active}
                className={[
                  'rounded-full px-4 py-2 text-[0.875rem] transition-colors',
                  active
                    ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-soft)]',
                ].join(' ')}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Steg 2 — lektioner */}
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <p className="eyebrow">{sv ? '2 · Välj lektioner' : '2 · Pick lessons'}</p>
          {lessons.length > 0 ? (
            <button
              type="button"
              onClick={toggleAll}
              className="text-[0.8125rem] text-[var(--color-ink-secondary)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
            >
              {allSelected
                ? sv
                  ? 'Avmarkera alla'
                  : 'Clear all'
                : sv
                  ? 'Markera alla'
                  : 'Select all'}
            </button>
          ) : null}
        </div>

        {lessons.length === 0 ? (
          <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
            {sv
              ? 'Den här kursen har inga färdiga lektioner ännu.'
              : 'This course has no finished lessons yet.'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {lessons.map((l) => {
              const checked = selected.has(l.id);
              return (
                <li key={l.id}>
                  <label
                    className={[
                      'flex cursor-pointer items-center gap-3 rounded-[12px] border px-4 py-3 transition-colors',
                      checked
                        ? 'border-[var(--color-ink-secondary)] bg-[var(--color-surface)]'
                        : 'border-[var(--color-sand)] hover:bg-[var(--color-surface-soft)]',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLesson(l.id)}
                      className="h-4 w-4 shrink-0 accent-[var(--color-ink)]"
                    />
                    <span className="flex-1 text-[0.9375rem] text-[var(--color-ink)]">
                      {l.title ?? (sv ? 'Namnlös lektion' : 'Untitled lesson')}
                    </span>
                    <span className="shrink-0 text-[0.75rem] text-[var(--color-ink-muted)] tabular-nums">
                      {formatDate(l.recordedAt)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Steg 3 — läge */}
      <div>
        <p className="eyebrow mb-3">
          {sv ? '3 · Hur vill du träna?' : '3 · How do you want to practise?'}
        </p>

        <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5">
          <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
            {sv ? 'Flashcards' : 'Flashcards'}
          </h3>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? 'Vänd kort och betygsätt dig själv. Elevante kommer ihåg vad du kunde och tar upp det igen när du håller på att glömma.'
              : 'Flip cards and rate yourself. Elevante remembers what you knew and brings it back just as you start forgetting.'}
          </p>
          <div className="mt-4">
            <Button
              type="submit"
              formAction={handleStart}
              disabled={!canStart}
              name="mode"
              value="flashcards"
            >
              {pending
                ? sv
                  ? 'Förbereder…'
                  : 'Preparing…'
                : sv
                  ? 'Börja med flashcards'
                  : 'Start flashcards'}
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-[16px] border border-[var(--color-sand)] p-5">
          <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
            {sv ? 'Kunskapskoll' : 'Knowledge check'}
          </h3>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? 'Korta flervalsfrågor med svar direkt. Du ser på en gång vad du kan och vad du behöver läsa om.'
              : 'Short multiple-choice questions with instant answers. You see right away what you know and what needs another pass.'}
          </p>
          <div className="mt-4">
            <Button
              type="submit"
              variant="secondary"
              formAction={handleStart}
              disabled={!canStart}
              name="mode"
              value="knowledge_checks"
            >
              {pending
                ? sv
                  ? 'Förbereder…'
                  : 'Preparing…'
                : sv
                  ? 'Börja kunskapskoll'
                  : 'Start knowledge check'}
            </Button>
          </div>
        </div>

        {selectedCount === 0 ? (
          <p className="mt-3 text-[0.8125rem] text-[var(--color-ink-muted)]">
            {sv ? 'Välj minst en lektion ovan.' : 'Pick at least one lesson above.'}
          </p>
        ) : null}
      </div>
    </form>
  );
}
```

`name="mode"`/`value` sitter direkt på respektive submit-knapp (via
`formAction` + knappens `name`/`value`, standard HTML-formulärbeteende) —
lägg INTE till ett separat dolt `mode`-fält, då skulle bara ett av värdena
någonsin skickas med.

- [ ] **Step 2: Skapa sidan**

Skapa `apps/web/app/[locale]/app/[role]/ova/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getTrainingCourses } from '@/lib/data/training';
import { OvaPicker } from './OvaPicker';

// Sessionsbygget kan behöva backfilla träningsunderlag för lektioner som
// saknar det (via functions.invoke) — det är ett Claude-anrop per lektion.
export const maxDuration = 60;

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sv = locale === 'sv';
  return {
    title: sv ? 'Öva' : 'Practise',
    robots: { index: false, follow: false },
  };
}

export default async function OvaPage({ params }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const courses = await getTrainingCourses(profile.id);

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-[clamp(2rem,3vw+1rem,3rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
          {sv ? 'Öva' : 'Practise'}
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {sv
            ? 'Ta reda på vad du faktiskt kan — innan det räknas. Välj lektioner och träna på det som togs upp där.'
            : 'Find out what you actually know — before it counts. Pick lessons and practise what was covered.'}
        </p>

        <div className="mt-10">
          {courses.length === 0 ? (
            <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
              {sv
                ? 'Du har inga färdiga lektioner att träna på ännu.'
                : 'You have no finished lessons to practise on yet.'}
            </p>
          ) : (
            <OvaPicker locale={locale} courses={courses} />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verifiera**

Kör: `cd /Users/johnguthed/elevante/apps/web && pnpm typecheck && pnpm lint`
Förväntat: inga fel.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/[locale]/app/[role]/ova/page.tsx" "apps/web/app/[locale]/app/[role]/ova/OvaPicker.tsx"
git commit -m "feat(träning): landningssida med lektionsväljare"
```

---

### Task 9: Flashcard-sessionen

**Files:**
- Create: `apps/web/app/[locale]/app/[role]/ova/repetera/[sessionId]/page.tsx`
- Create: `apps/web/app/[locale]/app/[role]/ova/repetera/[sessionId]/FlashcardRunner.tsx`

- [ ] **Step 1: Skapa runner-komponenten**

Skapa `apps/web/app/[locale]/app/[role]/ova/repetera/[sessionId]/FlashcardRunner.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { gradeFlashcard } from '@/app/actions/training';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type { FlashcardSessionItem } from '@/lib/data/training';

type Props = {
  locale: Locale;
  cards: FlashcardSessionItem[];
};

type Grade = 'again' | 'hard' | 'good';

export function FlashcardRunner({ locale, cards }: Props) {
  const sv = locale === 'sv';
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [, startTransition] = useTransition();

  const card = cards[index];
  const done = index >= cards.length;

  function handleGrade(grade: Grade) {
    if (!card) return;
    startTransition(() => {
      gradeFlashcard(card.lessonId, card.id, grade);
    });
    setGrades((prev) => [...prev, grade]);
    setFlipped(false);
    setIndex((prev) => prev + 1);
  }

  if (done) {
    const shaky = grades.filter((g) => g !== 'good').length;
    return (
      <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6 text-center">
        <h2 className="font-serif text-[1.375rem] text-[var(--color-ink)]">
          {sv ? 'Klart för den här gången' : 'Done for now'}
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {sv
            ? `Du gick igenom ${cards.length} kort. ${shaky} kommer tillbaka snart.`
            : `You went through ${cards.length} cards. ${shaky} will come back soon.`}
        </p>
        <div className="mt-5 flex justify-center">
          <Link href={`/${locale}/app/student/ova`}>
            <Button type="button">{sv ? 'Träna mer' : 'Practise more'}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-[0.8125rem] text-[var(--color-ink-muted)]">
        <span>
          {sv ? 'Kort' : 'Card'} {index + 1} {sv ? 'av' : 'of'} {cards.length}
        </span>
        <span className="truncate pl-4">
          {card.lessonTitle ?? (sv ? 'Namnlös lektion' : 'Untitled lesson')}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((prev) => !prev)}
        aria-expanded={flipped}
        className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-6 py-10 text-center transition-colors hover:bg-[var(--color-surface-soft)]"
      >
        <p className="font-serif text-[1.25rem] leading-snug text-[var(--color-ink)]">
          {card.front}
        </p>
        {flipped ? (
          <p className="mt-5 border-t border-[var(--color-sand)] pt-5 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {card.back}
          </p>
        ) : (
          <span className="mt-5 text-[0.8125rem] text-[var(--color-ink-muted)]">
            {sv ? 'Tryck för att se svaret' : 'Tap to see the answer'}
          </span>
        )}
      </button>

      {flipped ? (
        <div className="flex flex-wrap justify-center gap-3">
          <Button type="button" variant="outline" onClick={() => handleGrade('again')}>
            {sv ? 'Vet inte' : "Don't know"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleGrade('hard')}>
            {sv ? 'Osäker' : 'Unsure'}
          </Button>
          <Button type="button" onClick={() => handleGrade('good')}>
            {sv ? 'Kan det' : 'Got it'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Skapa sidan**

Skapa `apps/web/app/[locale]/app/[role]/ova/repetera/[sessionId]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { getOrCreateTrainingMaterials, type FlashcardSessionItem } from '@/lib/data/training';
import type { TrainingSession } from '@/lib/supabase/database';
import { FlashcardRunner } from './FlashcardRunner';

type Props = {
  params: Promise<{ locale: string; role: string; sessionId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'sv' ? 'Flashcards' : 'Flashcards',
    robots: { index: false, follow: false },
  };
}

export default async function RepeteraPage({ params }: Props) {
  const { locale: rawLocale, role, sessionId } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  const session = data as TrainingSession | null;
  if (!session || session.mode !== 'flashcards') notFound();

  // Sessionens item_ids är frusna vid skapandet — samma kort vid refresh.
  const materials = await getOrCreateTrainingMaterials(session.lesson_ids);
  const { data: lessonRows } = await supabase
    .from('lessons')
    .select('id, title')
    .in('id', session.lesson_ids);
  const titles = new Map(
    ((lessonRows ?? []) as { id: string; title: string | null }[]).map((l) => [l.id, l.title]),
  );

  const byId = new Map<string, FlashcardSessionItem>();
  for (const m of materials) {
    for (const f of m.flashcards) {
      byId.set(f.id, {
        ...f,
        lessonId: m.lesson_id,
        lessonTitle: titles.get(m.lesson_id) ?? null,
      });
    }
  }

  const cards = session.item_ids
    .map((id) => byId.get(id))
    .filter((c): c is FlashcardSessionItem => Boolean(c));

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-[1.75rem] leading-tight text-[var(--color-ink)]">
          {sv ? 'Flashcards' : 'Flashcards'}
        </h1>
        <div className="mt-8">
          {cards.length === 0 ? (
            <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
              {sv
                ? 'Den här sessionen har inga kort kvar.'
                : 'This session has no cards left.'}
            </p>
          ) : (
            <FlashcardRunner locale={locale} cards={cards} />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verifiera**

Kör: `cd /Users/johnguthed/elevante/apps/web && pnpm typecheck && pnpm lint`
Förväntat: inga fel.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/[locale]/app/[role]/ova/repetera"
git commit -m "feat(träning): flashcard-session med SM-2-betygsättning"
```

---

### Task 10: Kunskapskoll-sessionen

**Files:**
- Create: `apps/web/app/[locale]/app/[role]/ova/trana/[sessionId]/page.tsx`
- Create: `apps/web/app/[locale]/app/[role]/ova/trana/[sessionId]/KnowledgeCheckRunner.tsx`

- [ ] **Step 1: Skapa runner-komponenten**

Skapa `apps/web/app/[locale]/app/[role]/ova/trana/[sessionId]/KnowledgeCheckRunner.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { answerKnowledgeCheck } from '@/app/actions/training';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type { KnowledgeCheckSessionItem } from '@/lib/data/training';

type Props = {
  locale: Locale;
  checks: KnowledgeCheckSessionItem[];
};

export function KnowledgeCheckRunner({ locale, checks }: Props) {
  const sv = locale === 'sv';
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [, startTransition] = useTransition();

  const check = checks[index];
  const done = index >= checks.length;

  function handlePick(choiceIndex: number) {
    if (!check || picked !== null) return;
    const isCorrect = choiceIndex === check.correct_index;
    setPicked(choiceIndex);
    if (isCorrect) setCorrectCount((prev) => prev + 1);
    startTransition(() => {
      answerKnowledgeCheck(check.lessonId, check.id, isCorrect);
    });
  }

  function handleNext() {
    setPicked(null);
    setIndex((prev) => prev + 1);
  }

  if (done) {
    return (
      <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6 text-center">
        <h2 className="font-serif text-[1.375rem] text-[var(--color-ink)]">
          {sv ? 'Klart' : 'Done'}
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {sv
            ? `Du hade rätt på ${correctCount} av ${checks.length}.`
            : `You got ${correctCount} of ${checks.length} right.`}
        </p>
        <div className="mt-5 flex justify-center">
          <Link href={`/${locale}/app/student/ova`}>
            <Button type="button">{sv ? 'Träna mer' : 'Practise more'}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!check) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-[0.8125rem] text-[var(--color-ink-muted)]">
        <span>
          {sv ? 'Fråga' : 'Question'} {index + 1} {sv ? 'av' : 'of'} {checks.length}
        </span>
        <span className="truncate pl-4">
          {check.lessonTitle ?? (sv ? 'Namnlös lektion' : 'Untitled lesson')}
        </span>
      </div>

      <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5 md:p-6">
        <p className="font-serif text-[1.0625rem] leading-snug text-[var(--color-ink)]">
          {check.question}
        </p>

        <div className="mt-4 space-y-2">
          {check.choices.map((choice, idx) => {
            const isPicked = picked === idx;
            const isCorrect = idx === check.correct_index;
            const revealed = picked !== null;
            const tone = !revealed
              ? 'border-[var(--color-sand)] hover:bg-[var(--color-surface-soft)]'
              : isCorrect
                ? 'border-[var(--color-sage-deep)] bg-[var(--color-sage)]/25'
                : isPicked
                  ? 'border-[var(--color-coral)] bg-[var(--color-coral)]/15'
                  : 'border-[var(--color-sand)] opacity-60';
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handlePick(idx)}
                disabled={revealed}
                aria-pressed={isPicked}
                className={[
                  'flex w-full items-center gap-3 rounded-[12px] border px-4 py-2.5 text-left transition-colors disabled:cursor-default',
                  tone,
                ].join(' ')}
              >
                <span className="text-[0.9375rem] text-[var(--color-ink)]">{choice}</span>
              </button>
            );
          })}
        </div>

        {picked !== null ? (
          <div className="mt-4 border-t border-[var(--color-sand)] pt-4">
            <p className="text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {check.explanation}
            </p>
            <div className="mt-4">
              <Button type="button" onClick={handleNext}>
                {index + 1 >= checks.length
                  ? sv
                    ? 'Se resultatet'
                    : 'See the result'
                  : sv
                    ? 'Nästa fråga'
                    : 'Next question'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Skapa sidan**

Skapa `apps/web/app/[locale]/app/[role]/ova/trana/[sessionId]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import {
  getOrCreateTrainingMaterials,
  type KnowledgeCheckSessionItem,
} from '@/lib/data/training';
import type { TrainingSession } from '@/lib/supabase/database';
import { KnowledgeCheckRunner } from './KnowledgeCheckRunner';

type Props = {
  params: Promise<{ locale: string; role: string; sessionId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'sv' ? 'Kunskapskoll' : 'Knowledge check',
    robots: { index: false, follow: false },
  };
}

export default async function TranaPage({ params }: Props) {
  const { locale: rawLocale, role, sessionId } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  const session = data as TrainingSession | null;
  if (!session || session.mode !== 'knowledge_checks') notFound();

  const materials = await getOrCreateTrainingMaterials(session.lesson_ids);
  const { data: lessonRows } = await supabase
    .from('lessons')
    .select('id, title')
    .in('id', session.lesson_ids);
  const titles = new Map(
    ((lessonRows ?? []) as { id: string; title: string | null }[]).map((l) => [l.id, l.title]),
  );

  const byId = new Map<string, KnowledgeCheckSessionItem>();
  for (const m of materials) {
    for (const k of m.knowledge_checks) {
      byId.set(k.id, {
        ...k,
        lessonId: m.lesson_id,
        lessonTitle: titles.get(m.lesson_id) ?? null,
      });
    }
  }

  const checks = session.item_ids
    .map((id) => byId.get(id))
    .filter((c): c is KnowledgeCheckSessionItem => Boolean(c));

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-[1.75rem] leading-tight text-[var(--color-ink)]">
          {sv ? 'Kunskapskoll' : 'Knowledge check'}
        </h1>
        <div className="mt-8">
          {checks.length === 0 ? (
            <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
              {sv
                ? 'Den här sessionen har inga frågor kvar.'
                : 'This session has no questions left.'}
            </p>
          ) : (
            <KnowledgeCheckRunner locale={locale} checks={checks} />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verifiera**

Kör: `cd /Users/johnguthed/elevante/apps/web && pnpm typecheck && pnpm lint`
Förväntat: inga fel.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/[locale]/app/[role]/ova/trana"
git commit -m "feat(träning): kunskapskoll-session med direktfacit"
```

---

### Task 11: Verifiering end-to-end i webbläsaren

**Files:** (inga kodändringar om inget fallerar)

- [ ] **Step 1: Starta dev-servern**

Skapa `.claude/launch.json` om den inte finns, med:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "elevante-web",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "@elevante/web", "dev"],
      "port": 3000
    }
  ]
}
```

Starta sedan med preview_start `{name: "elevante-web"}`.

- [ ] **Step 2: Logga in som demo-elev och öppna Öva**

Navigera till `http://localhost:3000/sv/login`, logga in med ett elevkonto
(demokontona är loggade i Notion under "Nycklar"). Navigera sedan till
`http://localhost:3000/sv/app/student/ova`.

Verifiera med read_page: rubriken "Öva" syns, "Öva" finns i sidomenyn och är
markerad som aktiv, och kurser med lektioner listas.

- [ ] **Step 3: Kör en flashcard-session**

Välj en kurs, markera 1-2 lektioner, klicka "Börja med flashcards".
Första gången tar det tid — träningsunderlaget backfillas lat via
Edge Function-anropet.

Verifiera: kortets framsida visas, klick vänder kortet och visar baksidan,
tre betygsknappar dyker upp efter vändningen, klick på en av dem går vidare
till nästa kort, och sista kortet leder till sammanfattningen.

Kolla read_console_messages och preview_logs för fel.

- [ ] **Step 4: Verifiera att SM-2-state sparades**

Kör via Supabase MCP `execute_sql` mot `msqfuywpbrteyrzjggsw`:

```sql
select flashcard_id, ease_factor, interval_days, repetitions, due_at, last_grade
from public.flashcard_review_state
order by last_reviewed_at desc nulls last
limit 10;
```

Förväntat: rader med rimliga värden — `interval_days` 1 för första 'good',
`due_at` i framtiden, `last_grade` matchar knappen du klickade.

- [ ] **Step 5: Kör en kunskapskoll-session**

Gå tillbaka till `/sv/app/student/ova`, samma lektionsurval, klicka
"Börja kunskapskoll".

Verifiera: en fråga med fyra alternativ visas, facit avslöjas INTE innan man
svarar, ett klick markerar rätt svar grönt (och fel svar korall) plus visar
förklaringen, "Nästa fråga" går vidare, sista frågan ger poängsammanfattningen.

Kolla att svaren loggades:

```sql
select knowledge_check_id, correct, answered_at
from public.knowledge_check_attempts
order by answered_at desc
limit 10;
```

- [ ] **Step 6: Verifiera responsivitet och tomma tillstånd**

Använd resize_window preset `mobile` (375px) och ladda om
`/sv/app/student/ova` samt en pågående session. Verifiera att inget svämmar
över horisontellt och att betygsknapparna radbryter snyggt.

Ladda `/en/app/student/ova` och verifiera att den engelska copyn renderas.

- [ ] **Step 7: Verifiera att bygget går igenom**

Kör: `cd /Users/johnguthed/elevante/apps/web && pnpm build`
Förväntat: bygget lyckas, de nya `/ova`-rutterna listas som dynamiska.

- [ ] **Step 8: Commit eventuella fixar**

Om något behövde rättas i steg 2-7, committa fixarna:

```bash
git add -A
git commit -m "fix(träning): rättningar efter verifiering i webbläsare"
```

---

## Vad som INTE ingår

Enligt specen — bygg inte detta nu:
- Förhör mig och Förklara med egna ord (Lager 3, riktade LLM-anrop per elevsvar)
- Förstås övriga format (begreppskarta, "lär ut det")
- Testa-läget och `exam_prediction`
- Delning av träningsresultat med lärare
- AI-providerabstraktion (Claude vs. Berget) — beslutas i Lager 3-specen
