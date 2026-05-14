# Student Lesson Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eleven öppnar en lektion och möts av en AI-genererad sammanfattning + 2 startfrågor istället för råtranskriptet, så det blir tydligt vad lektionen handlade om och hur eleven kan börja utforska.

**Architecture:** Ny migration lägger till `summary`, `suggested_questions`, `ai_generated_topic` på `lessons`. `transcribe-lesson` Edge Function utökas med ett Anthropic-anrop som genererar dessa efter chunking. Studentvyn ritas om enligt designspec (7/5 split, summary + question chips till vänster, materials + transcript-länk till höger). Backfill för befintlig Ekologi-lektion via standalone Node-script.

**Tech Stack:** Supabase (Postgres + Edge Functions/Deno), Next.js 16 App Router, React 19, Anthropic Claude API, TypeScript

**Spec:** `docs/superpowers/specs/2026-05-14-elev-lektionsvy-design.md`

---

## File Map

**New files:**
- `supabase/migrations/20260514210000_lesson_summary_and_questions.sql` — migration
- `apps/web/components/app/student/LessonSummary.tsx` — sammanfattnings-card
- `apps/web/components/app/student/SuggestedQuestions.tsx` — startfråga-chips
- `apps/web/app/[locale]/app/[role]/lektioner/[id]/transkript/page.tsx` — separat transcript-vy
- `apps/web/components/app/student/StudentTranscriptView.tsx` — komponent för transcript-sidan
- `scripts/backfill-lesson-content.mjs` — engångsbackfill för befintlig Ekologi-lektion

**Modified files:**
- `apps/web/lib/supabase/database.ts` — utöka `Lesson`-typen med `summary`, `suggested_questions`, `ai_generated_topic`
- `apps/web/lib/data/student.ts` — `getStudentLessonDetail` returnerar nya fält
- `apps/web/app/[locale]/app/[role]/lektioner/[id]/LessonChatForm.tsx` — tar emot `prefill` prop
- `apps/web/components/app/student/StudentLessonDetail.tsx` — rewrite enligt B-layout
- `supabase/functions/transcribe-lesson/index.ts` — lägg till steg 6.5 (generera content)

---

## Task 1: Lesson summary-migration

**Files:**
- Create: `supabase/migrations/20260514210000_lesson_summary_and_questions.sql`

- [ ] **Step 1: Skriv migrationsfilen**

```sql
-- Lägg till AI-genererade fält på lessons. Fylls i av transcribe-lesson
-- Edge Function efter att chunking + embeddings är klara.

alter table public.lessons
  add column if not exists summary text,
  add column if not exists suggested_questions jsonb not null default '[]'::jsonb,
  add column if not exists ai_generated_topic text;

-- Indikator för att läsfrågor lätt kan hitta lektioner som behöver backfill
create index if not exists lessons_summary_missing_idx
  on public.lessons (id)
  where summary is null and transcript_status = 'ready';

comment on column public.lessons.summary is
  'AI-genererad sammanfattning (3-5 meningar) — visas i student-vyn istället för råtranskriptet.';
comment on column public.lessons.suggested_questions is
  'Exakt 2 startfrågor som hjälper eleven börja chatta — JSON-array av strängar.';
comment on column public.lessons.ai_generated_topic is
  'Kort ämnesfras (max 6 ord) som används som ingrediens i lessons.title.';
```

- [ ] **Step 2: Applicera migrationen via Supabase MCP**

Använd `mcp__supabase__apply_migration` med name `lesson_summary_and_questions` och SQL:n ovan, mot project_id `msqfuywpbrteyrzjggsw`.

- [ ] **Step 3: Verifiera kolumnerna**

Kör via `execute_sql`:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lessons'
  AND column_name IN ('summary', 'suggested_questions', 'ai_generated_topic');
```
Förväntat: 3 rader returnerade.

- [ ] **Step 4: Kör advisor-check**

Använd `mcp__supabase__get_advisors` (type: security + performance) för att verifiera att inga nya issues introducerats. Inga ska tillkomma — kolumnerna ärver `lessons`-policies.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260514210000_lesson_summary_and_questions.sql
git commit -m "feat(db): add summary, suggested_questions, ai_generated_topic to lessons"
```

---

## Task 2: Database TS-typer

**Files:**
- Modify: `apps/web/lib/supabase/database.ts`

- [ ] **Step 1: Lägg till nya fält i `Lesson`-typen**

I `apps/web/lib/supabase/database.ts`, hitta `export type Lesson = { ... }` och lägg till efter `audio_duration_seconds`:

```typescript
  summary: string | null;
  suggested_questions: string[];
  ai_generated_topic: string | null;
```

Hitta också `type LessonInsert = { ... }` och lägg till som optionella fält:

```typescript
  summary?: string | null;
  suggested_questions?: string[];
  ai_generated_topic?: string | null;
```

- [ ] **Step 2: Verifiera tsc**

Kör i `apps/web/`:
```bash
pnpm exec tsc --noEmit
```
Förväntat: 0 fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/supabase/database.ts
git commit -m "feat(types): extend Lesson type with summary fields"
```

---

## Task 3: AI-content-generator inline i Edge Function

**Files:**
- Modify: `supabase/functions/transcribe-lesson/index.ts`

- [ ] **Step 1: Lägg till Anthropic-anrop + system prompt**

I `supabase/functions/transcribe-lesson/index.ts`, lägg till efter `embedTexts`-funktionen (runt rad 95) men före `processLesson`:

```typescript
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-5-20250929';

const LESSON_CONTENT_SYSTEM_PROMPT = `Du är Elevante — en varm mentor som var med på lektionen och hjälper elever förstå vad som hände.

Du får ett transkript från en lektion. Ditt jobb är att:
1. Skriva en varm, kort sammanfattning (3-5 meningar) som om du pratar med eleven
2. Föreslå exakt två startfrågor som hjälper eleven börja utforska innehållet
3. Extrahera ett kort ämne (max 6 ord) som kan användas i lektionens titel

REGLER:
- Sammanfattningen är 3-5 meningar, max cirka 400 tecken
- Använd warm mentor-ton: "Idag handlade lektionen om...", "Anna gick igenom..."
- Hänvisa till läraren med förnamn när det framgår av transkriptet
- Citera lärarens egna konkreta exempel där möjligt
- Hitta ALDRIG på fakta som inte finns i transkriptet
- Frågor är pedagogiska ("Förklara skillnaden mellan...", "Beskriv hur...")
- Frågorna måste vara besvarbara enbart från transkriptet
- Ämnet är kort och deskriptivt (t.ex. "Ekosystem och näringsvävar")

Svara ENDAST med valid JSON i detta format, ingen annan text:
{"topic": "<kort ämne>", "summary": "<3-5 meningar>", "questions": ["<fråga 1>", "<fråga 2>"]}`;

type LessonContent = {
  topic: string;
  summary: string;
  questions: [string, string];
};

async function generateLessonContent(
  transcript: string,
  teacherName: string | null,
): Promise<LessonContent | null> {
  if (!ANTHROPIC_KEY) return null;

  const userMessage = teacherName
    ? `Lärare: ${teacherName}\n\nTranskript:\n${transcript}`
    : `Transkript:\n${transcript}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: LESSON_CONTENT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic lesson content failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { content?: { text?: string }[] };
  const raw = json.content?.[0]?.text ?? '';
  const parsed = JSON.parse(raw) as LessonContent;

  if (
    typeof parsed.topic !== 'string' ||
    typeof parsed.summary !== 'string' ||
    !Array.isArray(parsed.questions) ||
    parsed.questions.length !== 2
  ) {
    throw new Error('Anthropic response failed validation');
  }
  return parsed;
}
```

- [ ] **Step 2: Commit (utan att deploya — det görs i task 5)**

```bash
git add supabase/functions/transcribe-lesson/index.ts
git commit -m "feat(edge): add generateLessonContent for AI summary"
```

---

## Task 4: Wire content-generator i pipeline (steg 6.5)

**Files:**
- Modify: `supabase/functions/transcribe-lesson/index.ts`

- [ ] **Step 1: Hämta teacher_name + lägg in steg 6.5 i processLesson**

I `processLesson`, ändra första `.select(...)` (raden som hämtar lektionen) till att också hämta `teacher_id`, och lägg till en JOIN för lärarens namn. Original (rad ~98-103):

```typescript
  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('id, school_id, audio_path, transcript_status')
    .eq('id', lessonId)
    .single();
```

Byt till:

```typescript
  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('id, school_id, audio_path, transcript_status, teacher_id, recorded_at, course_id')
    .eq('id', lessonId)
    .single();

  let teacherName: string | null = null;
  if (lesson?.teacher_id) {
    const { data: teacher } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', lesson.teacher_id)
      .maybeSingle();
    teacherName = teacher?.full_name ?? null;
  }

  let courseName: string | null = null;
  if (lesson?.course_id) {
    const { data: course } = await supabase
      .from('courses')
      .select('name')
      .eq('id', lesson.course_id)
      .maybeSingle();
    courseName = course?.name ?? null;
  }
```

- [ ] **Step 2: Lägg in steg 6.5 efter chunk-inserten**

Efter `if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);` (slutar runt rad ~161), och FÖRE `await supabase.from('lessons').update({ transcript_text, ... transcript_status: 'ready' })`, lägg till:

```typescript
    // 6.5. AI-genererad sammanfattning, frågor och ämne
    let contentTitle: string | null = null;
    let contentSummary: string | null = null;
    let contentQuestions: string[] = [];
    let contentTopic: string | null = null;

    try {
      const content = await generateLessonContent(transcript, teacherName);
      if (content) {
        contentTopic = content.topic;
        contentSummary = content.summary;
        contentQuestions = content.questions;

        const dateBasis = lesson.recorded_at ?? new Date().toISOString();
        const dateLabel = new Intl.DateTimeFormat('sv-SE', {
          day: 'numeric',
          month: 'long',
        }).format(new Date(dateBasis));
        contentTitle = `${dateLabel} — ${content.topic}`;
      }
    } catch (err) {
      console.error('Lesson content generation failed:', err);
      // Inte fatalt — gå vidare utan summary, fallback titel sätts nedan
      if (!contentTitle) {
        const dateBasis = lesson.recorded_at ?? new Date().toISOString();
        const dateLabel = new Intl.DateTimeFormat('sv-SE', {
          day: 'numeric',
          month: 'long',
        }).format(new Date(dateBasis));
        contentTitle = courseName ? `${dateLabel} — ${courseName}` : dateLabel;
      }
    }
```

- [ ] **Step 3: Inkludera nya fält i lessons-uppdateringen**

Hitta `.update({ transcript_text: transcript, transcript_updated_at: ..., transcript_status: 'ready' })` (runt rad 164-170) och utöka till:

```typescript
    await supabase
      .from('lessons')
      .update({
        transcript_text: transcript,
        transcript_updated_at: new Date().toISOString(),
        transcript_status: 'ready',
        summary: contentSummary,
        suggested_questions: contentQuestions,
        ai_generated_topic: contentTopic,
        ...(contentTitle ? { title: contentTitle } : {}),
      })
      .eq('id', lessonId);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/transcribe-lesson/index.ts
git commit -m "feat(edge): wire generateLessonContent into transcribe pipeline"
```

---

## Task 5: Deploy uppdaterad Edge Function

**Files:**
- Deploy: `supabase/functions/transcribe-lesson/index.ts`

- [ ] **Step 1: Deploya via Supabase MCP**

Använd `mcp__supabase__deploy_edge_function` med:
- `project_id`: `msqfuywpbrteyrzjggsw`
- `name`: `transcribe-lesson`
- `entrypoint_path`: `index.ts`
- `verify_jwt`: `true`
- `files`: hela innehållet av `supabase/functions/transcribe-lesson/index.ts`

- [ ] **Step 2: Verifiera deploy**

Använd `mcp__supabase__list_edge_functions` på samma project_id. Förväntat: `transcribe-lesson` finns med `status: ACTIVE` och ny `updated_at`-timestamp.

---

## Task 6: Backfill-script för befintlig Ekologi-lektion

**Files:**
- Create: `scripts/backfill-lesson-content.mjs`

- [ ] **Step 1: Skriv backfill-scriptet**

```javascript
// Engångsscript för att generera summary + questions för en redan
// transkriberad lektion. Använd: node scripts/backfill-lesson-content.mjs <lesson_id>

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), 'apps/web/.env.local');
const envContent = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx), l.slice(idx + 1).replace(/^"|"$/g, '')];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929';
const EMAIL = 'john@guthed.se';
const PASSWORD = 'ElevanteDemo2026!';

const lessonId = process.argv[2];
if (!lessonId) {
  console.error('Usage: node scripts/backfill-lesson-content.mjs <lesson_id>');
  process.exit(1);
}

const SYSTEM_PROMPT = `Du är Elevante — en varm mentor som var med på lektionen och hjälper elever förstå vad som hände.

Du får ett transkript från en lektion. Ditt jobb är att:
1. Skriva en varm, kort sammanfattning (3-5 meningar) som om du pratar med eleven
2. Föreslå exakt två startfrågor som hjälper eleven börja utforska innehållet
3. Extrahera ett kort ämne (max 6 ord) som kan användas i lektionens titel

REGLER:
- Sammanfattningen är 3-5 meningar, max cirka 400 tecken
- Använd warm mentor-ton: "Idag handlade lektionen om...", "Anna gick igenom..."
- Hänvisa till läraren med förnamn när det framgår av transkriptet
- Citera lärarens egna konkreta exempel där möjligt
- Hitta ALDRIG på fakta som inte finns i transkriptet
- Frågor är pedagogiska ("Förklara skillnaden mellan...", "Beskriv hur...")
- Frågorna måste vara besvarbara enbart från transkriptet
- Ämnet är kort och deskriptivt (t.ex. "Ekosystem och näringsvävar")

Svara ENDAST med valid JSON i detta format, ingen annan text:
{"topic": "<kort ämne>", "summary": "<3-5 meningar>", "questions": ["<fråga 1>", "<fråga 2>"]}`;

// Logga in för att få JWT med rätt RLS-kontext
const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const auth = await authRes.json();
const token = auth.access_token;

// Hämta lesson + teacher
const lessonRes = await fetch(
  `${SUPABASE_URL}/rest/v1/lessons?id=eq.${lessonId}&select=transcript_text,teacher_id,recorded_at,course_id`,
  { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } },
);
const [lesson] = await lessonRes.json();
if (!lesson?.transcript_text) {
  console.error('Lektion saknar transcript_text');
  process.exit(1);
}

let teacherName = null;
if (lesson.teacher_id) {
  const tRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${lesson.teacher_id}&select=full_name`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } },
  );
  const [teacher] = await tRes.json();
  teacherName = teacher?.full_name ?? null;
}

console.log(`Genererar innehåll för lektion ${lessonId}, lärare: ${teacherName}...`);

// Anthropic
const userMsg = teacherName
  ? `Lärare: ${teacherName}\n\nTranskript:\n${lesson.transcript_text}`
  : `Transkript:\n${lesson.transcript_text}`;

const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': ANTHROPIC_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  }),
});
const anthropic = await anthropicRes.json();
const raw = anthropic.content?.[0]?.text ?? '';
const parsed = JSON.parse(raw);

console.log('Genererat innehåll:');
console.log(JSON.stringify(parsed, null, 2));

// Bygg datum-baserad titel
const dateLabel = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'long',
}).format(new Date(lesson.recorded_at));
const newTitle = `${dateLabel} — ${parsed.topic}`;

// Uppdatera lektionen
const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${lessonId}`, {
  method: 'PATCH',
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({
    summary: parsed.summary,
    suggested_questions: parsed.questions,
    ai_generated_topic: parsed.topic,
    title: newTitle,
  }),
});

if (!updateRes.ok) {
  console.error('Update failed:', updateRes.status, await updateRes.text());
  process.exit(1);
}

console.log(`✅ Klar. Titel: ${newTitle}`);
```

- [ ] **Step 2: Kör backfill mot Ekologi-lektionen**

```bash
cd /Users/johnguthed/elevante
node scripts/backfill-lesson-content.mjs ee64b8e0-6f68-48b3-bb4a-0ac1c233c262
```
Förväntat: output med `topic`, `summary`, `questions` + `✅ Klar. Titel: 11 maj — <ämne>`.

- [ ] **Step 3: Verifiera i DB**

Använd `mcp__supabase__execute_sql`:
```sql
SELECT title, summary, suggested_questions, ai_generated_topic
FROM public.lessons
WHERE id = 'ee64b8e0-6f68-48b3-bb4a-0ac1c233c262';
```
Förväntat: alla fält ifyllda, `suggested_questions` är JSON-array med 2 strängar.

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-lesson-content.mjs
git commit -m "feat(scripts): backfill script for lesson summary + questions"
```

---

## Task 7: Utöka getStudentLessonDetail

**Files:**
- Modify: `apps/web/lib/data/student.ts`

- [ ] **Step 1: Lägg till nya fält i typen + select**

Öppna `apps/web/lib/data/student.ts`. Hitta `getStudentLessonDetail`-funktionen (eller motsvarande som returnerar `StudentLessonDetail`). Lokalisera SQL-`select`-strängen — leta efter en `.select('id, title, transcript_text, ...')` mot `lessons`-tabellen.

Lägg till `, summary, suggested_questions, ai_generated_topic` i select-strängen.

Lägg till motsvarande fält i `StudentLessonDetail`-typen som funktionen returnerar:

```typescript
  summary: string | null;
  suggestedQuestions: string[];
  aiGeneratedTopic: string | null;
```

I funktionens return/map-block, mappa snake_case → camelCase:

```typescript
  summary: row.summary ?? null,
  suggestedQuestions: Array.isArray(row.suggested_questions) ? row.suggested_questions as string[] : [],
  aiGeneratedTopic: row.ai_generated_topic ?? null,
```

- [ ] **Step 2: Verifiera tsc**

```bash
cd apps/web && pnpm exec tsc --noEmit
```
Förväntat: 0 fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/data/student.ts
git commit -m "feat(data): expose summary + suggested questions in StudentLessonDetail"
```

---

## Task 8: LessonSummary-komponent

**Files:**
- Create: `apps/web/components/app/student/LessonSummary.tsx`

- [ ] **Step 1: Skriv komponenten**

```typescript
type Props = {
  summary: string;
};

export function LessonSummary({ summary }: Props) {
  return (
    <section className="rounded-[20px] bg-[var(--color-surface)] p-6 md:p-8">
      <p className="eyebrow mb-3">Sammanfattning</p>
      <p className="font-serif text-[1rem] italic leading-[1.7] text-[var(--color-ink)]">
        {summary}
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/app/student/LessonSummary.tsx
git commit -m "feat(ui): LessonSummary card component"
```

---

## Task 9: SuggestedQuestions-komponent

**Files:**
- Create: `apps/web/components/app/student/SuggestedQuestions.tsx`

- [ ] **Step 1: Skriv komponenten**

```typescript
'use client';

import { useTransition } from 'react';
import { startLessonChat } from '@/app/actions/chat';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  locale: Locale;
  lessonId: string;
  questions: string[];
};

export function SuggestedQuestions({ locale, lessonId, questions }: Props) {
  const [pending, startTransition] = useTransition();
  if (questions.length === 0) return null;

  function handleClick(question: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.append('lesson_id', lessonId);
      fd.append('question', question);
      fd.append('locale', locale);
      await startLessonChat(fd);
    });
  }

  return (
    <section>
      <p className="eyebrow mb-3">Kom igång</p>
      <div className="flex flex-col gap-2">
        {questions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleClick(q)}
            disabled={pending}
            className="rounded-[12px] bg-[var(--color-sand)] px-4 py-3 text-left text-[0.9375rem] text-[var(--color-ink)] transition-all duration-150 hover:bg-[var(--color-sand-strong)] disabled:opacity-50"
          >
            <span aria-hidden="true">→ </span>{q}
          </button>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verifiera att startLessonChat finns och tar formData som beskrivet**

Öppna `apps/web/app/actions/chat.ts` och bekräfta att `startLessonChat(formData: FormData)` finns och accepterar fält `lesson_id`, `question`, `locale`. Om signaturen avviker, justera komponenten för att matcha.

- [ ] **Step 3: Verifiera tsc**

```bash
cd apps/web && pnpm exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/app/student/SuggestedQuestions.tsx
git commit -m "feat(ui): SuggestedQuestions component with chat-start on click"
```

---

## Task 10: Uppdatera LessonChatForm med prefill-stöd

**Files:**
- Modify: `apps/web/app/[locale]/app/[role]/lektioner/[id]/LessonChatForm.tsx`

- [ ] **Step 1: Läs nuvarande filen**

Öppna `apps/web/app/[locale]/app/[role]/lektioner/[id]/LessonChatForm.tsx` och förstå hur den hanterar input.

- [ ] **Step 2: Lägg till `placeholderOverride` prop**

Lägg till en optional prop `placeholderOverride?: string` som överskriver default-placeholdern. Detta används av StudentLessonDetail för att visa "Eller skriv din egen fråga…" när det finns startfrågor.

Exempel-diff om komponenten har en `<input>` med placeholder:
```tsx
// Före:
<input placeholder={labels.placeholder} ... />

// Efter:
<input placeholder={placeholderOverride ?? labels.placeholder} ... />
```

- [ ] **Step 3: Verifiera tsc**

```bash
cd apps/web && pnpm exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/[locale]/app/[role]/lektioner/[id]/LessonChatForm.tsx
git commit -m "feat(ui): LessonChatForm accepts placeholderOverride"
```

---

## Task 11: Rewrite StudentLessonDetail

**Files:**
- Modify: `apps/web/components/app/student/StudentLessonDetail.tsx`

- [ ] **Step 1: Ersätt LEFT-kolumnens innehåll**

I `StudentLessonDetail.tsx`, hitta div:n med klass `md:col-span-7` (LEFT — Transcript). Ersätt **hela** dess innehåll (från `<p className="eyebrow mb-4">{labels.transcriptHeading}</p>` till slutet av `</div>` för col-span-7) med:

```tsx
        {/* LEFT — Summary + Suggested questions + Chat input (7 col) */}
        <div className="md:col-span-7 space-y-6">
          {lesson.summary ? (
            <LessonSummary summary={lesson.summary} />
          ) : (
            <section className="rounded-[20px] bg-[var(--color-surface)] p-6 md:p-8">
              <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
                {labels.transcriptPending}
              </p>
            </section>
          )}

          {lesson.suggestedQuestions.length > 0 && (
            <SuggestedQuestions
              locale={locale}
              lessonId={lesson.id}
              questions={lesson.suggestedQuestions}
            />
          )}

          <section className="rounded-[20px] bg-[var(--color-surface)] p-6">
            <h2 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
              {sv ? 'Fråga om den här lektionen' : 'Ask about this lesson'}
            </h2>
            <p className="mt-2 text-[0.875rem] text-[var(--color-ink-secondary)]">
              {sv
                ? 'Elevante svarar med exakt vad läraren sa, och var det sas.'
                : 'Elevante answers with exactly what the teacher said, and where.'}
            </p>
            <div className="mt-4">
              <LessonChatForm
                locale={locale}
                lessonId={lesson.id}
                labels={chatLabels}
                placeholderOverride={
                  lesson.suggestedQuestions.length > 0
                    ? sv
                      ? 'Eller skriv din egen fråga…'
                      : 'Or write your own question…'
                    : undefined
                }
              />
            </div>
          </section>
        </div>
```

- [ ] **Step 2: Ersätt RIGHT-kolumnen (chat har flyttats vänster, så bara material + transcript-länk kvar)**

Hitta `<aside className="space-y-6 md:col-span-5">` och ersätt **hela** dess innehåll med:

```tsx
        <aside className="space-y-6 md:col-span-5">
          <div className="rounded-[20px] border border-[var(--color-sand)] p-6">
            <h2 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
              {labels.materialsHeading}
            </h2>
            <div className="mt-4">
              <MaterialList
                materials={lesson.materials}
                emptyText={labels.materialsEmpty}
              />
            </div>
          </div>

          {lesson.status === 'ready' && lesson.transcriptText && (
            <Link
              href={`${base}/lektioner/${lesson.id}/transkript`}
              className="block text-[0.875rem] text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
            >
              {sv ? 'Visa hela transkriptet →' : 'View full transcript →'}
            </Link>
          )}
        </aside>
```

- [ ] **Step 3: Lägg till imports högst upp i filen**

Lägg till efter befintliga importer:

```tsx
import { LessonSummary } from '@/components/app/student/LessonSummary';
import { SuggestedQuestions } from '@/components/app/student/SuggestedQuestions';
```

- [ ] **Step 4: Verifiera tsc**

```bash
cd apps/web && pnpm exec tsc --noEmit
```
Förväntat: 0 fel.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/app/student/StudentLessonDetail.tsx
git commit -m "feat(ui): rewrite StudentLessonDetail with summary + suggested questions"
```

---

## Task 12: Transcript-route

**Files:**
- Create: `apps/web/app/[locale]/app/[role]/lektioner/[id]/transkript/page.tsx`

- [ ] **Step 1: Skriv route-filen**

```typescript
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getStudentLessonDetail } from '@/lib/data/student';

type Props = {
  params: Promise<{ locale: string; role: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: locale === 'sv' ? 'Transkript' : 'Transcript',
    robots: { index: false, follow: false },
  };
}

export default async function TranscriptPage({ params }: Props) {
  const { locale, role, id } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);
  if (role !== 'student') redirect(`/${locale}/app/${role}/lektioner/${id}`);

  const lesson = await getStudentLessonDetail(id);
  if (!lesson || !lesson.transcriptText) notFound();

  const sv = locale === 'sv';
  const base = `/${locale}/app/student`;

  return (
    <div className="container-wide py-10 md:py-14">
      <nav className="mb-8 text-[0.8125rem] text-[var(--color-ink-muted)]">
        <Link href={`${base}/lektioner/${id}`} className="hover:text-[var(--color-ink)]">
          {sv ? '← Tillbaka till lektionen' : '← Back to lesson'}
        </Link>
      </nav>
      <header className="mb-8">
        <p className="eyebrow">{sv ? 'Transkript' : 'Transcript'}</p>
        <h1 className="mt-2 font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
          {lesson.title ?? lesson.course?.name ?? lesson.id}
        </h1>
      </header>
      <article className="rounded-[20px] bg-[var(--color-surface)] p-6 md:p-10">
        <pre className="whitespace-pre-wrap font-mono text-[0.875rem] leading-[1.7] text-[var(--color-ink)]">
          {lesson.transcriptText}
        </pre>
      </article>
    </div>
  );
}
```

- [ ] **Step 2: Verifiera tsc**

```bash
cd apps/web && pnpm exec tsc --noEmit
```

- [ ] **Step 3: Verifiera build**

```bash
cd apps/web && NEXT_PUBLIC_SUPABASE_URL=https://msqfuywpbrteyrzjggsw.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_bh7JKy0mMPqZwl9WGYZcpg_LozjyEQ2 NEXT_PUBLIC_SITE_URL=http://localhost:3000 pnpm exec next build 2>&1 | tail -30
```
Förväntat: build OK, ny route `/[locale]/app/[role]/lektioner/[id]/transkript` synlig i route-listan.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/[locale]/app/[role]/lektioner/[id]/transkript/page.tsx
git commit -m "feat(ui): dedicated transcript route for student"
```

---

## Task 13: E2E smoke test som elev i browser

- [ ] **Step 1: Pusha branch och vänta på Vercel preview**

```bash
git push -u origin claude/student-lesson-summary
```

Använd `mcp__vercel__list_deployments` för att hitta preview-deploy:en för branchen. Vänta tills `state: READY`.

- [ ] **Step 2: Logga in som Elin i preview-URL:en**

I incognito-browser:
1. Öppna preview-URL:en + `/sv/login`
2. Logga in: `elin@demo.elevante.se` / `ElevanteDemo2026!`
3. Navigera till `/sv/app/student/lektioner/ee64b8e0-6f68-48b3-bb4a-0ac1c233c262`

Förväntat:
- Sidan visar SUMMARY-card med Anna-tone-sammanfattning (3-5 meningar, citerar lektionens faktiska innehåll)
- 2 startfråge-knappar under "KOM IGÅNG"
- Chat-input nedanför med placeholder "Eller skriv din egen fråga…"
- Material-card till höger
- "Visa hela transkriptet →" länk längst ner i höger kolumn

- [ ] **Step 3: Klicka första startfrågan**

Förväntat: Server Action skapar en chat och redirectar till `/sv/app/student/chat/<id>` med AI:n redan svarande på frågan via riktig RAG (källcitat synliga under svaret).

- [ ] **Step 4: Klicka "Visa hela transkriptet →"**

Förväntat: Navigation till `/sv/app/student/lektioner/<id>/transkript`. Råtranscript visas i mono. "← Tillbaka till lektionen"-länk högst upp.

- [ ] **Step 5: Skapa PR**

```bash
gh pr create --title "feat(student): sammanfattning + startfrågor på lektionsvyn" --body "$(cat <<'EOF'
## Summary

Eleven öppnar en lektion och möts av en AI-genererad sammanfattning + 2 startfrågor istället för råtranskriptet.

Implementerar [docs/superpowers/specs/2026-05-14-elev-lektionsvy-design.md](docs/superpowers/specs/2026-05-14-elev-lektionsvy-design.md).

- Ny migration: `summary`, `suggested_questions`, `ai_generated_topic` på `lessons`
- `transcribe-lesson` Edge Function genererar nu innehåll via Claude efter chunking
- Backfill-script körts mot existerande Ekologi-lektion
- Student-vy omskriven: summary + question chips + chat input vänster, material + transcript-länk höger
- Ny route `/student/lektioner/<id>/transkript` för dem som vill se råtexten
- Lärar- och admin-vyer oförändrade

## Test plan

- [x] Migration applied + verified
- [x] Edge Function deployed
- [x] Ekologi-lektion backfilled
- [ ] Logga in som Elin → se sammanfattning + 2 frågor
- [ ] Klick på startfråga → chat startas med riktig RAG-svar
- [ ] "Visa transkript" → råtext-vyn
- [ ] Logga in som Anna → fortfarande gamla teacher-vyn (oförändrad)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

Spec coverage:
- ✅ Namnkonvention (B, datum först) → Task 4 sätter `title = "<DD månad> — <topic>"`
- ✅ Layout (B, refined evolution) → Task 11 rewrite
- ✅ AI-röst (warm mentor) → Task 3 system prompt
- ✅ Generering (auto i pipeline) → Task 4
- ✅ Backfill för Ekologi-lektion → Task 6
- ✅ Migration → Task 1
- ✅ AC 1-8 i specen → Task 4, 5, 6, 11, 12 täcker alla

Placeholder-scan: inga TBD/TODO/"add appropriate error handling" — alla steg har konkret kod eller exakta kommandon.

Type consistency: `LessonContent` definieras i Task 3 och används samma struktur i backfill-scriptet Task 6. `suggestedQuestions` (camelCase) i frontend, `suggested_questions` (snake_case) i DB — mappas konsekvent i Task 7.

Scope: en feature, en plan. Inga oberoende subsystem.
