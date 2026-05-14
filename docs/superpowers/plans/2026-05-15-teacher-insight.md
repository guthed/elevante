# Lärarvyn Insikt-vy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lärare (Anna) öppnar en lektion och möts av en koncept-heatmap som visar vilka elever som fastnat på vilka koncept, samt mini-heatmap på dashboard. Klick på elev → profilkort-sidopanel. Klick på koncept → frågelista.

**Architecture:** Ny migration lägger `concepts` på `lessons` + `chat_messages` och ny tabell `lesson_views`. `transcribe-lesson` Edge Function utökas att extrahera 5-8 koncept. `answerWithRag` taggar frågor med koncept. Sex nya komponenter (InsightHeatmap, InsightDrawer, StudentProfileCard, ConceptQuestionList, MiniHeatmap, LessonStatusFilter) byggs och wires in i befintliga `TeacherDashboard` + `TeacherLessonDetail`. Demo-seed-script skapar 7 nya elever + ~28 frågor.

**Tech Stack:** Supabase (Postgres + Edge Functions/Deno), Next.js 16 App Router, React 19, Anthropic Claude API, TypeScript, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-05-15-lararvyn-insikt-design.md`

---

## File Map

**New files:**
- `supabase/migrations/20260515090000_teacher_insight.sql` — migration
- `apps/web/components/app/teacher/InsightDrawer.tsx` — slide-in sidopanel wrapper
- `apps/web/components/app/teacher/InsightHeatmap.tsx` — student × concept heatmap
- `apps/web/components/app/teacher/StudentProfileCard.tsx` — drilldown content
- `apps/web/components/app/teacher/ConceptQuestionList.tsx` — concept-column drilldown
- `apps/web/components/app/teacher/MiniHeatmap.tsx` — dashboard compact version
- `apps/web/components/app/teacher/LessonStatusFilter.tsx` — chips for lesson list
- `scripts/seed-teacher-demo-data.mjs` — demo students + tagged questions

**Modified files:**
- `apps/web/lib/supabase/database.ts` — Lesson.concepts, ChatMessage.concepts, LessonView type
- `apps/web/lib/ai/anthropic.ts` — answerWithRag returns concepts, new generateLessonInsight + generateStudentInsight
- `apps/web/lib/data/teacher.ts` — new getLessonInsight, getStudentLessonInsight
- `apps/web/lib/data/student.ts` — upsert lesson_views in getStudentLessonDetail
- `apps/web/app/actions/chat.ts` — wire concepts in/out of RAG flow
- `apps/web/components/app/teacher/TeacherDashboard.tsx` — replace placeholder with MiniHeatmap
- `apps/web/components/app/teacher/TeacherLessonDetail.tsx` — replace placeholder with InsightHeatmap + drawer
- `apps/web/app/[locale]/app/[role]/lektioner/page.tsx` — add status filter
- `supabase/functions/transcribe-lesson/index.ts` — extend prompt for concepts

---

## Task 1: Migration — concepts + lesson_views

**Files:**
- Create: `supabase/migrations/20260515090000_teacher_insight.sql`

- [ ] **Step 1: Skriv migrationsfilen**

```sql
-- Koncept-fält på lektioner (5-8 strängar, AI-extraherade)
alter table public.lessons
  add column if not exists concepts jsonb not null default '[]'::jsonb;

-- Koncept-fält på chat-meddelanden (1-3 strängar, AI-taggat vid RAG-svar)
alter table public.chat_messages
  add column if not exists concepts jsonb not null default '[]'::jsonb;

-- Engagemang-spårning: när en elev öppnar en lektion
create table if not exists public.lesson_views (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  view_count integer not null default 1,
  primary key (lesson_id, profile_id)
);
create index if not exists lesson_views_lesson_idx on public.lesson_views(lesson_id);

alter table public.lesson_views enable row level security;

-- Studenten ser sina egna views
create policy "lesson_views_self_select"
  on public.lesson_views for select
  to authenticated
  using (profile_id = (select auth.uid()));

-- Lärare/admin ser views på lektioner i sin egen skola
create policy "lesson_views_school_select"
  on public.lesson_views for select
  to authenticated
  using (
    public.current_user_role() in ('teacher', 'admin')
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_views.lesson_id
        and l.school_id = public.current_school_id()
    )
  );

-- Eleven kan upserta sin egen view
create policy "lesson_views_self_insert"
  on public.lesson_views for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "lesson_views_self_update"
  on public.lesson_views for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

comment on column public.lessons.concepts is
  'AI-extraherade koncept från lektionen (4-10 strängar). Används för heatmap-kolumner.';
comment on column public.chat_messages.concepts is
  'AI-taggade koncept för detta meddelande (0-3 strängar, subset av lessons.concepts). Används för per-elev statistik.';
comment on table public.lesson_views is
  'Engagemangs-spårning: vilka elever har öppnat vilka lektioner och hur många gånger.';
```

- [ ] **Step 2: Applicera migrationen via MCP**

Use `mcp__4704fa94-6c81-45e5-ae83-09f6c7bf9160__apply_migration` med:
- `project_id`: `msqfuywpbrteyrzjggsw`
- `name`: `teacher_insight`
- `query`: SQL:n ovan

- [ ] **Step 3: Verifiera**

Use `mcp__4704fa94-6c81-45e5-ae83-09f6c7bf9160__execute_sql`:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'concepts';
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'lesson_views';
```
Expected: två `concepts`-rader (lessons + chat_messages) och 1 lesson_views-tabell.

Run `mcp__4704fa94-6c81-45e5-ae83-09f6c7bf9160__get_advisors` security+performance — verify no new critical issues.

- [ ] **Step 4: Commit**

```bash
cd /Users/johnguthed/elevante/.claude/worktrees/festive-visvesvaraya-98d81a
git add supabase/migrations/20260515090000_teacher_insight.sql
git commit -m "feat(db): add concepts + lesson_views for teacher insight view"
```

---

## Task 2: Utöka transcribe-lesson med koncept-extraktion

**Files:**
- Modify: `supabase/functions/transcribe-lesson/index.ts`

- [ ] **Step 1: Uppdatera system-prompt och LessonContent-typ**

Hitta `LESSON_CONTENT_SYSTEM_PROMPT` i `supabase/functions/transcribe-lesson/index.ts` och ersätt hela prompten:

```typescript
const LESSON_CONTENT_SYSTEM_PROMPT = `Du är Elevante — en varm mentor som var med på lektionen och hjälper elever förstå vad som hände.

Du får ett transkript från en lektion. Ditt jobb är att:
1. Skriva en varm, kort sammanfattning (3-5 meningar) som om du pratar med eleven
2. Föreslå exakt två startfrågor som hjälper eleven börja utforska innehållet
3. Extrahera ett kort ämne (max 6 ord) som kan användas i lektionens titel
4. Lista 5-8 nyckelkoncept som behandlas i lektionen — de begrepp eleverna ska kunna efter lektionen

REGLER:
- Sammanfattningen är 3-5 meningar, max cirka 400 tecken
- Använd warm mentor-ton: "Idag handlade lektionen om...", "Anna gick igenom..."
- Hänvisa till läraren med förnamn när det framgår av transkriptet
- Citera lärarens egna konkreta exempel där möjligt
- Hitta ALDRIG på fakta som inte finns i transkriptet
- Frågor är pedagogiska ("Förklara skillnaden mellan...", "Beskriv hur...")
- Frågorna måste vara besvarbara enbart från transkriptet
- Ämnet är kort och deskriptivt (t.ex. "Ekosystem och näringsvävar")
- Koncepten är 1-4 ord vardera (t.ex. "Näringspyramid", "Biotiska faktorer", "Energiflöde")
- Koncept är nominalfraser eller substantiv, inte hela meningar

Svara ENDAST med valid JSON i detta format, ingen annan text:
{"topic": "<kort ämne>", "summary": "<3-5 meningar>", "questions": ["<fråga 1>", "<fråga 2>"], "concepts": ["<koncept 1>", "<koncept 2>", "<koncept 3>", "<koncept 4>", "<koncept 5>"]}`;
```

Hitta `type LessonContent` och ersätt:

```typescript
type LessonContent = {
  topic: string;
  summary: string;
  questions: [string, string];
  concepts: string[];
};
```

- [ ] **Step 2: Lägg till validering för concepts i `generateLessonContent`**

Hitta validerings-blocket i `generateLessonContent` och ersätt det:

```typescript
  if (
    typeof parsed.topic !== 'string' ||
    typeof parsed.summary !== 'string' ||
    !Array.isArray(parsed.questions) ||
    parsed.questions.length !== 2 ||
    !Array.isArray(parsed.concepts) ||
    parsed.concepts.length < 4 ||
    parsed.concepts.length > 10 ||
    !parsed.concepts.every((c: unknown) => typeof c === 'string')
  ) {
    throw new Error('Anthropic response failed validation');
  }
  return parsed;
```

- [ ] **Step 3: Wire concepts i lessons-update i processLesson**

Hitta i `processLesson` där `contentSummary`, `contentQuestions`, etc. deklareras. Lägg till:

```typescript
    let contentConcepts: string[] = [];
```

I `try`-blocket där `content` hanteras, efter `contentQuestions = content.questions;`, lägg till:

```typescript
        contentConcepts = content.concepts;
```

I `lessons.update`-anropet, lägg till `concepts: contentConcepts` bredvid övriga AI-fält.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/transcribe-lesson/index.ts
git commit -m "feat(edge): extract 5-8 concepts per lesson in transcribe pipeline"
```

---

## Task 3: Deploy uppdaterad Edge Function

- [ ] **Step 1: Deploya via MCP**

Use `mcp__4704fa94-6c81-45e5-ae83-09f6c7bf9160__deploy_edge_function`:
- `project_id`: `msqfuywpbrteyrzjggsw`
- `name`: `transcribe-lesson`
- `entrypoint_path`: `index.ts`
- `verify_jwt`: `true`
- `files`: hela innehållet av `supabase/functions/transcribe-lesson/index.ts`

- [ ] **Step 2: Verifiera**

Use `mcp__4704fa94-6c81-45e5-ae83-09f6c7bf9160__list_edge_functions`. Förväntat: `transcribe-lesson` finns med ny `updated_at`.

---

## Task 4: Backfill koncept för befintlig Ekologi-lektion

**Files:**
- Modify: `scripts/backfill-lesson-content.mjs`

- [ ] **Step 1: Uppdatera backfill-scriptet med utökad prompt**

Öppna `scripts/backfill-lesson-content.mjs`. Hitta `SYSTEM_PROMPT`-konstanten och ersätt med samma prompt som i Task 2 (kopiera exakt).

I delen som anropar parsed-validering, lägg till `concepts` i payload till update-anropet:

```javascript
  body: JSON.stringify({
    summary: parsed.summary,
    suggested_questions: parsed.questions,
    ai_generated_topic: parsed.topic,
    title: newTitle,
    concepts: parsed.concepts,
  }),
```

- [ ] **Step 2: Kör backfill**

```bash
cd /Users/johnguthed/elevante/.claude/worktrees/festive-visvesvaraya-98d81a
node scripts/backfill-lesson-content.mjs ee64b8e0-6f68-48b3-bb4a-0ac1c233c262
```

Expected output includes `"concepts": ["...", "...", ...]` and `✅ Klar`.

- [ ] **Step 3: Verifiera i DB**

Use `mcp__4704fa94-6c81-45e5-ae83-09f6c7bf9160__execute_sql`:
```sql
SELECT jsonb_array_length(concepts) AS n, concepts
FROM public.lessons
WHERE id = 'ee64b8e0-6f68-48b3-bb4a-0ac1c233c262';
```
Expected: n = 4-10, concepts-array innehåller strängar som "Näringspyramid", "Biotiska faktorer" etc.

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-lesson-content.mjs
git commit -m "feat(scripts): backfill concepts alongside summary in existing lessons"
```

---

## Task 5: Database TS-typer för concepts + lesson_views

**Files:**
- Modify: `apps/web/lib/supabase/database.ts`

- [ ] **Step 1: Lägg till concepts på Lesson och ChatMessage + ny LessonView-typ**

I `apps/web/lib/supabase/database.ts`, hitta `export type Lesson = { ... }`. Efter `ai_generated_topic`, lägg till:

```typescript
  concepts: string[];
```

I `LessonInsert`, efter `ai_generated_topic?`, lägg till:

```typescript
  concepts?: string[];
```

I `export type ChatMessage = { ... }`, efter `sources`, lägg till:

```typescript
  concepts: string[];
```

I `ChatMessageInsert`, efter `sources?`, lägg till:

```typescript
  concepts?: string[];
```

Efter `ChatMessage`-typen, lägg till ny `LessonView`-typ:

```typescript
export type LessonView = {
  lesson_id: string;
  profile_id: string;
  first_viewed_at: string;
  last_viewed_at: string;
  view_count: number;
};

type LessonViewInsert = {
  lesson_id: string;
  profile_id: string;
  first_viewed_at?: string;
  last_viewed_at?: string;
  view_count?: number;
};
```

I `Database`-typens `Tables`-block, lägg till efter `chat_messages`:

```typescript
      lesson_views: TableDef<LessonView, LessonViewInsert>;
```

- [ ] **Step 2: Verifiera tsc**

```bash
cd /Users/johnguthed/elevante/.claude/worktrees/festive-visvesvaraya-98d81a/apps/web
~/.local/bin/pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/johnguthed/elevante/.claude/worktrees/festive-visvesvaraya-98d81a
git add apps/web/lib/supabase/database.ts
git commit -m "feat(types): add concepts + LessonView types"
```

---

## Task 6: Utöka answerWithRag med koncept-taggning

**Files:**
- Modify: `apps/web/lib/ai/anthropic.ts`

- [ ] **Step 1: Läs den befintliga answerWithRag**

Read `apps/web/lib/ai/anthropic.ts` för att förstå nuvarande signatur och system-prompt.

- [ ] **Step 2: Uppdatera answerWithRag-signaturen + system-prompt**

Hitta `answerWithRag`-funktionen. Uppdatera signaturen att acceptera `lessonConcepts: string[]` parameter:

```typescript
export async function answerWithRag(
  question: string,
  chunks: RagChunk[],
  lessonConcepts: string[] = [],
): Promise<{ content: string; sources: ChatSource[]; concepts: string[] }> {
```

System-prompten ska instruera modellen att returnera vilka 1-3 av lektionens koncept som frågan tangerar. Lägg till efter befintlig system-prompt-text:

```
Här är listan över koncept som behandlas i lektionen:
${lessonConcepts.length > 0 ? lessonConcepts.map((c) => `- ${c}`).join('\n') : '(inga koncept tillgängliga)'}

Förutom att svara på frågan, identifiera vilka 1-3 av dessa koncept som frågan tangerar mest. Om frågan inte passar något koncept, returnera en tom array.

Svara med JSON i detta format:
{
  "answer": "<ditt svar på elevens fråga, baserat enbart på lektionens innehåll>",
  "concepts": ["<koncept 1>", "<koncept 2>"]
}
```

Uppdatera parsing-koden: strip ```json fences som vi gör i Edge Function, parse, validera. Returnera `{ content: parsed.answer, sources, concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [] }`.

Notera: tidigare returnerade funktionen `{ content, sources }`. Nu också `concepts`. Anropare måste uppdateras (Task 7).

- [ ] **Step 3: Verifiera tsc**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
```
Expected: kan visa errors på platser som anropar `answerWithRag` (Task 7 fixar). Just nu OK om felen begränsas till `app/actions/chat.ts`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/ai/anthropic.ts
git commit -m "feat(ai): answerWithRag returns concepts alongside content"
```

---

## Task 7: Wire concepts i chat-action

**Files:**
- Modify: `apps/web/app/actions/chat.ts`

- [ ] **Step 1: Uppdatera ragAnswer-funktionen i chat.ts**

Hitta `ragAnswer` i `apps/web/app/actions/chat.ts`. Tre ändringar:

1. Hämta lessonens concepts. Innan `answerWithRag`-anropet, lägg till:

```typescript
  let lessonConcepts: string[] = [];
  if (scopeContext.scope === 'lesson' && scopeContext.lessonId) {
    const { data: lessonRow } = await supabase
      .from('lessons')
      .select('concepts')
      .eq('id', scopeContext.lessonId)
      .maybeSingle();
    lessonConcepts = Array.isArray(lessonRow?.concepts)
      ? (lessonRow.concepts as string[])
      : [];
  }
```

2. Skicka med till answerWithRag:

```typescript
  const answer = await answerWithRag(question, chunks, lessonConcepts);
  return answer; // Nu returnerar { content, sources, concepts }
```

3. Uppdatera return-typen på `ragAnswer`:

```typescript
async function ragAnswer(
  question: string,
  scopeContext: { scope: ChatScope; lessonId: string | null; courseId: string | null },
): Promise<{ content: string; sources: ChatSource[]; concepts: string[] } | null> {
```

4. Uppdatera `mockedAnswer` att också returnera tom `concepts`:

Hitta `mockedAnswer`-returerne. Lägg till `concepts: []` i return-objektet.

- [ ] **Step 2: Spara concepts på chat_messages**

Hitta de två platserna där `chat_messages.insert({ ... role: 'assistant', content: answer.content, sources: answer.sources })` finns (`startChat` och `sendMessage`). Lägg till:

```typescript
    concepts: answer.concepts,
```

i båda insert-anropen.

- [ ] **Step 3: Verifiera tsc**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/actions/chat.ts
git commit -m "feat(chat): pass lesson concepts to RAG, save concepts on chat_messages"
```

---

## Task 8: lesson_views upsert i student data-layer

**Files:**
- Modify: `apps/web/lib/data/student.ts`

- [ ] **Step 1: Lägg till upsert efter lesson-fetch**

I `getStudentLessonDetail` (eller motsvarande funktion som returnerar lessonens data till student-vyn), efter att `lesson` är fetched och innan returnen, lägg till fire-and-forget upsert:

```typescript
  // Spåra att eleven öppnat lektionen (fire-and-forget, ej critical)
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('lesson_views')
        .upsert(
          {
            lesson_id: lessonId,
            profile_id: user.id,
            last_viewed_at: new Date().toISOString(),
            view_count: 1, // Postgres upsert ON CONFLICT incrementeras nedan
          },
          { onConflict: 'lesson_id,profile_id', ignoreDuplicates: false }
        );
      // Increment view_count separat om raden fanns sedan tidigare
      await supabase.rpc('increment_lesson_view', { lesson_id_arg: lessonId, profile_id_arg: user.id })
        .then(() => null)
        .catch(() => null); // RPC kanske saknas, ignorera felet
    }
  } catch (err) {
    console.warn('lesson_views upsert failed:', err);
  }
```

**Hmm — detta blir messy.** Bättre: gör allt via en RPC-funktion. Lägg till i migrationen i Task 1 (alternativt en ny mini-migration). Återgår:

Ta bort upsert-koden ovan. Vi använder en cleaner approach via en RPC-funktion. Lägg till denna RPC i en ny migration:

- [ ] **Step 1b: Skapa RPC `track_lesson_view`**

Use `mcp__4704fa94-6c81-45e5-ae83-09f6c7bf9160__execute_sql` med:
```sql
create or replace function public.track_lesson_view(lesson_id_arg uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lesson_views (lesson_id, profile_id, view_count)
  values (lesson_id_arg, auth.uid(), 1)
  on conflict (lesson_id, profile_id)
  do update set
    view_count = public.lesson_views.view_count + 1,
    last_viewed_at = now();
end;
$$;

revoke all on function public.track_lesson_view(uuid) from public, anon;
grant execute on function public.track_lesson_view(uuid) to authenticated;
```

Capture as migration: Create file `supabase/migrations/20260515090100_track_lesson_view_rpc.sql` with the SQL above. Then apply via MCP `apply_migration` with name `track_lesson_view_rpc`.

- [ ] **Step 1c: Wire RPC-anropet i student.ts**

Ersätt try/catch-blocket ovan med:

```typescript
  // Spåra att eleven öppnat lektionen (fire-and-forget, ej critical)
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.rpc('track_lesson_view', { lesson_id_arg: lessonId });
  } catch (err) {
    console.warn('track_lesson_view failed:', err);
  }
```

- [ ] **Step 2: Verifiera**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
```
Expected: 0 errors. Note: typen för `supabase.rpc(...)` kan kräva en explicit cast — om TS klagar, ändra till `(supabase as unknown as { rpc: (n: string, args: Record<string, unknown>) => Promise<unknown> }).rpc('track_lesson_view', { lesson_id_arg: lessonId })`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/data/student.ts supabase/migrations/20260515090100_track_lesson_view_rpc.sql
git commit -m "feat(data): track lesson_views upserts via track_lesson_view RPC"
```

---

## Task 9: getLessonInsight i teacher data-layer

**Files:**
- Modify: `apps/web/lib/data/teacher.ts`

- [ ] **Step 1: Lägg till `LessonInsight`-typ och `getLessonInsight`-funktion**

Längst ner i `apps/web/lib/data/teacher.ts`, lägg till:

```typescript
export type LessonInsightStudent = {
  id: string;
  fullName: string;
  hasViewed: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  totalQuestions: number;
  conceptQuestionCounts: Record<string, number>;
  questions: Array<{ id: string; content: string; concepts: string[]; createdAt: string }>;
};

export type LessonInsight = {
  lessonId: string;
  title: string | null;
  concepts: string[];
  students: LessonInsightStudent[];
};

export async function getLessonInsight(lessonId: string): Promise<LessonInsight | null> {
  const supabase = await createSupabaseServerClient();

  // 1. Hämta lessonen + course/class
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, class_id, concepts')
    .eq('id', lessonId)
    .maybeSingle();
  if (!lesson) return null;

  const concepts = Array.isArray(lesson.concepts) ? (lesson.concepts as string[]) : [];

  // 2. Hämta klassens elever (profiler via class_members)
  const { data: members } = await supabase
    .from('class_members')
    .select('profile_id, profiles!inner(id, full_name, role)')
    .eq('class_id', lesson.class_id);

  type MemberRow = {
    profile_id: string;
    profiles: { id: string; full_name: string | null; role: string } | null;
  };

  const students = ((members ?? []) as unknown as MemberRow[])
    .map((m) => m.profiles)
    .filter((p): p is NonNullable<MemberRow['profiles']> => p !== null && p.role === 'student');

  // 3. Hämta lesson_views
  const { data: viewsRaw } = await supabase
    .from('lesson_views')
    .select('profile_id, view_count, last_viewed_at')
    .eq('lesson_id', lessonId);
  const viewsByProfile = new Map<string, { count: number; last: string }>();
  for (const v of viewsRaw ?? []) {
    viewsByProfile.set(v.profile_id, {
      count: v.view_count ?? 0,
      last: v.last_viewed_at ?? '',
    });
  }

  // 4. Hämta chats + chat_messages för denna lesson, scope='lesson'
  const { data: chatsRaw } = await supabase
    .from('chats')
    .select('id, user_id')
    .eq('lesson_id', lessonId)
    .eq('scope', 'lesson');
  const chatIds = (chatsRaw ?? []).map((c) => c.id);
  const userIdByChatId = new Map<string, string>();
  for (const c of chatsRaw ?? []) userIdByChatId.set(c.id, c.user_id);

  let messages: Array<{ id: string; chat_id: string; content: string; concepts: unknown; created_at: string; role: string }> = [];
  if (chatIds.length > 0) {
    const { data } = await supabase
      .from('chat_messages')
      .select('id, chat_id, content, concepts, created_at, role')
      .in('chat_id', chatIds)
      .eq('role', 'user');
    messages = data ?? [];
  }

  // 5. Bygg per-elev-data
  const studentResults: LessonInsightStudent[] = students.map((s) => {
    const view = viewsByProfile.get(s.id);
    const studentMessages = messages.filter((m) => userIdByChatId.get(m.chat_id) === s.id);
    const conceptCounts: Record<string, number> = {};
    for (const m of studentMessages) {
      const mc = Array.isArray(m.concepts) ? (m.concepts as string[]) : [];
      for (const c of mc) conceptCounts[c] = (conceptCounts[c] ?? 0) + 1;
    }
    return {
      id: s.id,
      fullName: s.full_name ?? '—',
      hasViewed: !!view,
      viewCount: view?.count ?? 0,
      lastViewedAt: view?.last ?? null,
      totalQuestions: studentMessages.length,
      conceptQuestionCounts: conceptCounts,
      questions: studentMessages.map((m) => ({
        id: m.id,
        content: m.content,
        concepts: Array.isArray(m.concepts) ? (m.concepts as string[]) : [],
        createdAt: m.created_at,
      })),
    };
  });

  return {
    lessonId,
    title: lesson.title,
    concepts,
    students: studentResults,
  };
}
```

- [ ] **Step 2: Verifiera tsc**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/data/teacher.ts
git commit -m "feat(data): add getLessonInsight for teacher heatmap view"
```

---

## Task 10: AI-insight helpers

**Files:**
- Modify: `apps/web/lib/ai/anthropic.ts`

- [ ] **Step 1: Lägg till `generateLessonInsight` och `generateStudentInsight`**

Längst ner i `apps/web/lib/ai/anthropic.ts`, lägg till:

```typescript
type ClassEngagement = {
  concept: string;
  totalQuestions: number;
  studentsAsking: number;
};

export async function generateLessonInsight(
  lessonTitle: string,
  engagement: ClassEngagement[],
  studentsNotViewed: string[],
  totalStudents: number,
): Promise<string> {
  if (!anthropicIsConfigured()) return '';

  const top3Coral = [...engagement]
    .sort((a, b) => b.totalQuestions - a.totalQuestions)
    .slice(0, 3)
    .map((e) => `${e.concept} (${e.totalQuestions} frågor, ${e.studentsAsking} elever)`);

  const prompt = `Du är en pedagogisk assistent. En lärare ser en översikt över sin klass förståelse av lektionen "${lessonTitle}".

Data:
- Totalt elever: ${totalStudents}
- Elever som inte öppnat lektionen: ${studentsNotViewed.length === 0 ? '(alla har öppnat)' : studentsNotViewed.join(', ')}
- Topp koncept-frågor: ${top3Coral.join('; ')}

Skriv EN mening (max 30 ord) som ger läraren en handlingsbar insikt. Format: "Klassen är osäker på X. [Y och Z] har inte öppnat lektionen — överväg att kolla med dem." Variera om datan kräver annan struktur. Använd svenska.

Svara endast med insikt-meningen, ingen annan text.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) return '';
  const json = (await res.json()) as { content?: { text?: string }[] };
  return (json.content?.[0]?.text ?? '').trim();
}

export async function generateStudentInsight(
  studentName: string,
  conceptCounts: Record<string, number>,
  totalQuestions: number,
  hasViewed: boolean,
): Promise<string> {
  if (!anthropicIsConfigured()) return '';

  if (!hasViewed) return `${studentName} har inte öppnat lektionen ännu.`;
  if (totalQuestions === 0) return `${studentName} har öppnat lektionen men ställt inga frågor.`;

  const conceptSummary = Object.entries(conceptCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([c, n]) => `${c} (${n})`)
    .join(', ');

  const prompt = `En lärare tittar på en elev (${studentName}) i sin klass. Eleven har ställt ${totalQuestions} frågor om en lektion, fördelade på koncept: ${conceptSummary}.

Skriv EN mening (max 25 ord) som beskriver elevens läge. Format: "${studentName} är engagerad men osäker på X." eller "${studentName} har frågat mest om X." Använd svenska.

Svara endast med insikt-meningen, ingen annan text.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) return '';
  const json = (await res.json()) as { content?: { text?: string }[] };
  return (json.content?.[0]?.text ?? '').trim();
}
```

- [ ] **Step 2: Verifiera tsc**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/ai/anthropic.ts
git commit -m "feat(ai): generateLessonInsight + generateStudentInsight"
```

---

## Task 11: InsightDrawer-komponent

**Files:**
- Create: `apps/web/components/app/teacher/InsightDrawer.tsx`

- [ ] **Step 1: Skriv komponenten**

```typescript
'use client';

import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
};

export function InsightDrawer({ open, onClose, children, title }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-[var(--color-ink)]/30 transition-opacity duration-150 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Insikt'}
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform overflow-y-auto bg-[var(--color-canvas)] shadow-xl transition-transform duration-150 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {children}
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Verifiera tsc**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/app/teacher/InsightDrawer.tsx
git commit -m "feat(ui): InsightDrawer slide-in sidopanel"
```

---

## Task 12: StudentProfileCard-komponent

**Files:**
- Create: `apps/web/components/app/teacher/StudentProfileCard.tsx`

- [ ] **Step 1: Skriv komponenten**

```typescript
import type { LessonInsightStudent } from '@/lib/data/teacher';

type Props = {
  student: LessonInsightStudent;
  concepts: string[];
  aiInsight: string;
  onClose: () => void;
};

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'nu';
  if (hours < 24) return `${hours}h sen`;
  const days = Math.floor(hours / 24);
  return `${days}d sen`;
}

function barColor(count: number): string {
  if (count >= 3) return 'var(--color-coral)';
  if (count >= 1) return 'var(--color-sand-strong)';
  return 'var(--color-sage)';
}

function barWidth(count: number, max: number): number {
  if (max === 0) return 0;
  return Math.max(8, (count / max) * 100);
}

export function StudentProfileCard({ student, concepts, aiInsight, onClose }: Props) {
  const maxCount = Math.max(1, ...concepts.map((c) => student.conceptQuestionCounts[c] ?? 0));
  const recentQuestions = [...student.questions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-sand)] bg-[var(--color-surface)] px-6 py-4">
        <div>
          <h2 className="font-serif text-[1.25rem] text-[var(--color-ink)]">
            {student.fullName}
          </h2>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--color-ink-muted)]">
            NA1A · Biologi 1
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Stäng"
          className="rounded-full p-2 text-[var(--color-ink-muted)] hover:bg-[var(--color-sand)]"
        >
          ✕
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 border-b border-[var(--color-sand)] px-6 py-6">
        <Stat number={student.totalQuestions} label="frågor" />
        <Stat number={student.viewCount} label="visningar" />
        <Stat text={timeAgo(student.lastViewedAt)} label="senast" />
      </div>

      {/* Koncept-bars */}
      <div className="border-b border-[var(--color-sand)] px-6 py-6">
        <p className="eyebrow mb-4">Koncept-förståelse</p>
        <div className="space-y-3">
          {concepts.map((c) => {
            const count = student.conceptQuestionCounts[c] ?? 0;
            return (
              <div key={c} className="grid grid-cols-[100px_1fr_30px] items-center gap-3 text-[0.8125rem]">
                <span className={count === 0 ? 'text-[var(--color-ink-muted)]' : 'text-[var(--color-ink)]'}>
                  {c}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--color-sand)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${barWidth(count, maxCount)}%`,
                      background: count === 0 ? 'transparent' : barColor(count),
                    }}
                  />
                </div>
                <span className="text-right text-[0.75rem] text-[var(--color-ink-muted)] tabular-nums">
                  {count === 0 ? '—' : `${count} fr`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Senaste frågor */}
      <div className="border-b border-[var(--color-sand)] px-6 py-6">
        <p className="eyebrow mb-4">Senaste frågor</p>
        {recentQuestions.length === 0 ? (
          <p className="text-[0.875rem] italic text-[var(--color-ink-muted)]">
            Inga frågor ännu.
          </p>
        ) : (
          <ul className="space-y-3">
            {recentQuestions.map((q) => (
              <li
                key={q.id}
                className="border-l-2 border-[var(--color-sand)] pl-3 text-[0.875rem] italic text-[var(--color-ink-secondary)]"
              >
                &ldquo;{q.content}&rdquo;
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* AI-insight */}
      {aiInsight && (
        <div className="px-6 py-6">
          <div className="rounded-[12px] border-l-2 border-[var(--color-sand-strong)] bg-[var(--color-surface)] p-4 text-[0.875rem] italic leading-relaxed text-[var(--color-ink-secondary)]">
            {aiInsight}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  number,
  text,
  label,
}: {
  number?: number;
  text?: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="font-serif text-[1.5rem] leading-none text-[var(--color-ink)] tabular-nums">
        {number !== undefined ? number : text}
      </div>
      <div className="mt-1 text-[0.625rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
        {label}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verifiera tsc**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/app/teacher/StudentProfileCard.tsx
git commit -m "feat(ui): StudentProfileCard with concept bars and recent questions"
```

---

## Task 13: ConceptQuestionList-komponent

**Files:**
- Create: `apps/web/components/app/teacher/ConceptQuestionList.tsx`

- [ ] **Step 1: Skriv komponenten**

```typescript
import type { LessonInsightStudent } from '@/lib/data/teacher';

type Props = {
  concept: string;
  students: LessonInsightStudent[];
  onClose: () => void;
};

export function ConceptQuestionList({ concept, students, onClose }: Props) {
  const rows = students
    .flatMap((s) =>
      s.questions
        .filter((q) => q.concepts.includes(concept))
        .map((q) => ({ studentName: s.fullName, ...q })),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <div className="flex items-center justify-between border-b border-[var(--color-sand)] bg-[var(--color-surface)] px-6 py-4">
        <div>
          <p className="eyebrow">Koncept</p>
          <h2 className="mt-1 font-serif text-[1.25rem] text-[var(--color-ink)]">
            {concept}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Stäng"
          className="rounded-full p-2 text-[var(--color-ink-muted)] hover:bg-[var(--color-sand)]"
        >
          ✕
        </button>
      </div>

      <div className="px-6 py-6">
        <p className="mb-4 text-[0.8125rem] text-[var(--color-ink-muted)]">
          {rows.length === 0
            ? 'Inga frågor om detta koncept ännu.'
            : `${rows.length} fråg${rows.length === 1 ? 'a' : 'or'} från ${
                new Set(rows.map((r) => r.studentName)).size
              } elever`}
        </p>

        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="border-l-2 border-[var(--color-sand)] pl-3">
              <p className="text-[0.875rem] italic leading-relaxed text-[var(--color-ink)]">
                &ldquo;{row.content}&rdquo;
              </p>
              <p className="mt-1 text-[0.75rem] text-[var(--color-ink-muted)]">
                {row.studentName} · {new Date(row.createdAt).toLocaleDateString('sv-SE', {
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verifiera tsc**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/app/teacher/ConceptQuestionList.tsx
git commit -m "feat(ui): ConceptQuestionList drilldown for column clicks"
```

---

## Task 14: InsightHeatmap-komponent

**Files:**
- Create: `apps/web/components/app/teacher/InsightHeatmap.tsx`

- [ ] **Step 1: Skriv komponenten**

```typescript
'use client';

import { useState } from 'react';
import type { LessonInsight, LessonInsightStudent } from '@/lib/data/teacher';
import { InsightDrawer } from './InsightDrawer';
import { StudentProfileCard } from './StudentProfileCard';
import { ConceptQuestionList } from './ConceptQuestionList';

type Props = {
  insight: LessonInsight;
  aiInsight: string;
};

type DrawerState =
  | { type: 'closed' }
  | { type: 'student'; student: LessonInsightStudent }
  | { type: 'concept'; concept: string };

function cellColor(student: LessonInsightStudent, concept: string): string {
  if (!student.hasViewed) return 'var(--color-sand)';
  const count = student.conceptQuestionCounts[concept] ?? 0;
  if (count >= 3) return 'var(--color-coral)';
  if (count >= 1) return 'var(--color-sand-strong)';
  if (student.totalQuestions > 0) return 'var(--color-sage)';
  return 'var(--color-surface)';
}

function cellBorder(student: LessonInsightStudent): string {
  if (!student.hasViewed) return '1px dashed var(--color-sand-strong)';
  return 'none';
}

export function InsightHeatmap({ insight, aiInsight }: Props) {
  const [drawer, setDrawer] = useState<DrawerState>({ type: 'closed' });

  if (insight.concepts.length === 0) {
    return (
      <div className="rounded-[20px] border border-[var(--color-sand)] p-6">
        <p className="eyebrow mb-2">Insikt</p>
        <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
          Koncept har inte extraherats för denna lektion ännu.
        </p>
      </div>
    );
  }

  return (
    <section>
      <p className="eyebrow mb-4">Förståelse-karta · {insight.students.length} elever</p>

      {/* Heatmap */}
      <div className="overflow-x-auto rounded-[20px] bg-[var(--color-surface)] p-6">
        <div
          className="grid gap-1 text-[0.75rem]"
          style={{
            gridTemplateColumns: `120px repeat(${insight.concepts.length}, minmax(70px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div />
          {insight.concepts.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDrawer({ type: 'concept', concept: c })}
              className="text-center text-[0.75rem] text-[var(--color-ink-secondary)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
            >
              {c}
            </button>
          ))}

          {/* Rows */}
          {insight.students.map((s) => (
            <Row key={s.id} student={s} concepts={insight.concepts} onClick={() => setDrawer({ type: 'student', student: s })} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.75rem] text-[var(--color-ink-muted)]">
        <Legend color="var(--color-coral)" label="3+ frågor" />
        <Legend color="var(--color-sand-strong)" label="1-2 frågor" />
        <Legend color="var(--color-sage)" label="Öppnat utan att fråga" />
        <Legend color="var(--color-surface)" label="Inget engagemang" border />
        <Legend color="var(--color-sand)" label="Ej öppnat" dashed />
      </div>

      {/* AI-insight */}
      {aiInsight && (
        <div className="mt-6 rounded-[12px] border-l-2 border-[var(--color-coral)] bg-[var(--color-surface)] p-4 text-[0.875rem] italic leading-relaxed text-[var(--color-ink-secondary)]">
          {aiInsight}
        </div>
      )}

      {/* Drawers */}
      <InsightDrawer
        open={drawer.type === 'student'}
        onClose={() => setDrawer({ type: 'closed' })}
        title="Elev"
      >
        {drawer.type === 'student' && (
          <StudentProfileCard
            student={drawer.student}
            concepts={insight.concepts}
            aiInsight={`${drawer.student.fullName} har ${drawer.student.totalQuestions} frågor.`}
            onClose={() => setDrawer({ type: 'closed' })}
          />
        )}
      </InsightDrawer>

      <InsightDrawer
        open={drawer.type === 'concept'}
        onClose={() => setDrawer({ type: 'closed' })}
        title="Koncept"
      >
        {drawer.type === 'concept' && (
          <ConceptQuestionList
            concept={drawer.concept}
            students={insight.students}
            onClose={() => setDrawer({ type: 'closed' })}
          />
        )}
      </InsightDrawer>
    </section>
  );
}

function Row({
  student,
  concepts,
  onClick,
}: {
  student: LessonInsightStudent;
  concepts: string[];
  onClick: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="truncate text-left text-[0.8125rem] text-[var(--color-ink)] underline-offset-2 hover:underline"
      >
        {student.fullName}
      </button>
      {concepts.map((c) => (
        <button
          key={c}
          type="button"
          onClick={onClick}
          aria-label={`${student.fullName}: ${c}, ${student.conceptQuestionCounts[c] ?? 0} frågor`}
          className="aspect-[2/1] min-h-[22px] rounded-sm transition-all hover:scale-105"
          style={{
            background: cellColor(student, c),
            border: cellBorder(student),
          }}
        />
      ))}
    </>
  );
}

function Legend({
  color,
  label,
  border,
  dashed,
}: {
  color: string;
  label: string;
  border?: boolean;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded-sm"
        style={{
          background: color,
          border: border
            ? '1px solid var(--color-sand)'
            : dashed
              ? '1px dashed var(--color-sand-strong)'
              : 'none',
        }}
      />
      {label}
    </span>
  );
}
```

Note: Tailwind v4 doesn't have built-in coral/sage names. The component uses CSS variables `--color-coral`, `--color-sage`, `--color-sand-strong` which must already be defined in the global stylesheet (Editorial Calm-design från tidigare faser). Om inte finns, lägg till i `apps/web/app/globals.css`. Verify by checking `globals.css` for existing variables.

- [ ] **Step 2: Verifiera tsc + att CSS-vars finns**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
grep -E "(--color-coral|--color-sage|--color-sand-strong)" app/globals.css
```
Expected: 0 tsc errors, grep visar att variablerna finns. Om inte: lägg till i globals.css.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/app/teacher/InsightHeatmap.tsx
git commit -m "feat(ui): InsightHeatmap with student × concept grid and drilldowns"
```

---

## Task 15: MiniHeatmap-komponent

**Files:**
- Create: `apps/web/components/app/teacher/MiniHeatmap.tsx`

- [ ] **Step 1: Skriv komponenten**

```typescript
import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';

type MiniLessonRow = {
  lessonId: string;
  title: string;
  topConceptName: string;
  topConceptQuestionCount: number;
  totalQuestions: number;
  studentsAsking: number;
  totalStudents: number;
};

type Props = {
  locale: Locale;
  rows: MiniLessonRow[];
};

export function MiniHeatmap({ locale, rows }: Props) {
  const base = `/${locale}/app/teacher`;

  if (rows.length === 0) {
    return (
      <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
        När elever frågar Elevante om dina lektioner dyker insikterna upp här.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.lessonId}>
          <Link
            href={`${base}/lektioner/${row.lessonId}`}
            className="-mx-2 flex items-center gap-4 rounded-[12px] px-2 py-3 transition-colors hover:bg-[var(--color-surface-soft)]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-[1rem] text-[var(--color-ink)]">
                {row.title}
              </p>
              <p className="mt-0.5 truncate text-[0.8125rem] text-[var(--color-ink-muted)]">
                Mest frågor om <strong>{row.topConceptName}</strong> · {row.topConceptQuestionCount} frågor
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-serif text-[1.125rem] leading-none text-[var(--color-ink)] tabular-nums">
                {row.studentsAsking}/{row.totalStudents}
              </p>
              <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
                aktiva
              </p>
            </div>
            <span aria-hidden="true" className="shrink-0 text-[var(--color-ink-muted)]">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Lägg till `getRecentLessonInsightRows` i teacher data layer**

I `apps/web/lib/data/teacher.ts`, längst ner, lägg till:

```typescript
export type MiniLessonRow = {
  lessonId: string;
  title: string;
  topConceptName: string;
  topConceptQuestionCount: number;
  totalQuestions: number;
  studentsAsking: number;
  totalStudents: number;
};

export async function getRecentLessonInsightRows(
  schoolId: string,
  limit = 3,
): Promise<MiniLessonRow[]> {
  // Hämta de N senaste 'ready' lektionerna för denna skola
  const supabase = await createSupabaseServerClient();
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, class_id, concepts, recorded_at')
    .eq('school_id', schoolId)
    .eq('transcript_status', 'ready')
    .order('recorded_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  const rows: MiniLessonRow[] = [];
  for (const lesson of lessons ?? []) {
    const insight = await getLessonInsight(lesson.id);
    if (!insight || insight.concepts.length === 0) continue;

    // Räkna totala frågor per koncept
    const conceptTotals: Record<string, number> = {};
    let totalQuestions = 0;
    const askingStudents = new Set<string>();
    for (const s of insight.students) {
      if (s.totalQuestions > 0) askingStudents.add(s.id);
      for (const [c, n] of Object.entries(s.conceptQuestionCounts)) {
        conceptTotals[c] = (conceptTotals[c] ?? 0) + n;
        totalQuestions += n;
      }
    }
    const [topConcept, topCount] = Object.entries(conceptTotals).sort(([, a], [, b]) => b - a)[0] ?? ['—', 0];

    rows.push({
      lessonId: lesson.id,
      title: lesson.title ?? '—',
      topConceptName: topConcept,
      topConceptQuestionCount: topCount,
      totalQuestions,
      studentsAsking: askingStudents.size,
      totalStudents: insight.students.length,
    });
  }

  return rows;
}
```

- [ ] **Step 3: Verifiera tsc**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/app/teacher/MiniHeatmap.tsx apps/web/lib/data/teacher.ts
git commit -m "feat(ui): MiniHeatmap for dashboard + getRecentLessonInsightRows"
```

---

## Task 16: LessonStatusFilter-komponent

**Files:**
- Create: `apps/web/components/app/teacher/LessonStatusFilter.tsx`

- [ ] **Step 1: Skriv komponenten**

```typescript
import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';

type Status = 'all' | 'ready' | 'processing' | 'pending' | 'failed';

type Props = {
  locale: Locale;
  active: Status;
  counts: Record<Status, number>;
};

const LABELS: Record<Status, { sv: string; en: string }> = {
  all: { sv: 'Alla', en: 'All' },
  ready: { sv: 'Klara', en: 'Ready' },
  processing: { sv: 'Bearbetas', en: 'Processing' },
  pending: { sv: 'Väntar', en: 'Pending' },
  failed: { sv: 'Misslyckades', en: 'Failed' },
};

const ORDER: Status[] = ['all', 'ready', 'processing', 'pending', 'failed'];

export function LessonStatusFilter({ locale, active, counts }: Props) {
  const sv = locale === 'sv';
  const base = `/${locale}/app/teacher/lektioner`;

  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {ORDER.map((status) => {
        const isActive = active === status;
        const label = sv ? LABELS[status].sv : LABELS[status].en;
        const href = status === 'all' ? base : `${base}?status=${status}`;
        return (
          <Link
            key={status}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`rounded-full px-4 py-1.5 text-[0.8125rem] transition-colors ${
              isActive
                ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
                : 'bg-[var(--color-sand)] text-[var(--color-ink)] hover:bg-[var(--color-sand-strong)]'
            }`}
          >
            {label}
            <span className="ml-2 opacity-60 tabular-nums">{counts[status]}</span>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verifiera tsc**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/app/teacher/LessonStatusFilter.tsx
git commit -m "feat(ui): LessonStatusFilter chips for lesson list"
```

---

## Task 17: Wire InsightHeatmap in TeacherLessonDetail

**Files:**
- Modify: `apps/web/components/app/teacher/TeacherLessonDetail.tsx`
- Modify: `apps/web/app/[locale]/app/[role]/lektioner/[id]/page.tsx`

- [ ] **Step 1: Uppdatera page.tsx att hämta insight**

I `apps/web/app/[locale]/app/[role]/lektioner/[id]/page.tsx`, hitta var `getLessonDetail` anropas för role === 'teacher'. Lägg till:

```typescript
  if (role === 'teacher') {
    const [lesson, insight] = await Promise.all([
      getLessonDetail(id),
      getLessonInsight(id),
    ]);
    if (!lesson) notFound();

    let aiInsight = '';
    if (insight && insight.concepts.length > 0) {
      const engagement = insight.concepts.map((c) => ({
        concept: c,
        totalQuestions: insight.students.reduce((sum, s) => sum + (s.conceptQuestionCounts[c] ?? 0), 0),
        studentsAsking: insight.students.filter((s) => (s.conceptQuestionCounts[c] ?? 0) > 0).length,
      }));
      const notViewed = insight.students.filter((s) => !s.hasViewed).map((s) => s.fullName.split(' ')[0]);
      aiInsight = await generateLessonInsight(
        lesson.title ?? '—',
        engagement,
        notViewed,
        insight.students.length,
      );
    }

    return (
      <TeacherLessonDetailView
        locale={locale}
        lesson={lesson}
        dict={dict}
        insight={insight}
        aiInsight={aiInsight}
      />
    );
  }
```

Lägg till imports högst upp:
```typescript
import { getLessonInsight } from '@/lib/data/teacher';
import { generateLessonInsight } from '@/lib/ai/anthropic';
```

- [ ] **Step 2: Uppdatera TeacherLessonDetail-komponentens props + ersätt placeholder**

I `apps/web/components/app/teacher/TeacherLessonDetail.tsx`:

Uppdatera `Props`-typen:
```typescript
type Props = {
  locale: Locale;
  lesson: LessonDetail;
  dict: Dictionary;
  insight: import('@/lib/data/teacher').LessonInsight | null;
  aiInsight: string;
};
```

Destructure i funktions-signaturen: `export function TeacherLessonDetail({ locale, lesson, dict, insight, aiInsight }: Props) {`.

Lägg till import högst upp:
```typescript
import { InsightHeatmap } from '@/components/app/teacher/InsightHeatmap';
```

Hitta `<aside>`-blocket på höger sida med "Frågor från elever"-placeholder och ersätt hela placeholder-blocket (den `<div>` som innehåller h2 "Frågor från elever") med inget — vi flyttar insikten till en ny full-bredd-sektion under det 2-col-layouten.

Efter den befintliga `<div className="mt-10 grid gap-10 md:grid-cols-12">...</div>`-sektion, lägg till en ny sektion:

```typescript
      {/* Insikt — full-bredd heatmap under transcript-layouten */}
      {insight && (
        <section className="mt-14">
          <InsightHeatmap insight={insight} aiInsight={aiInsight} />
        </section>
      )}
```

- [ ] **Step 3: Verifiera tsc**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\[locale\]/app/\[role\]/lektioner/\[id\]/page.tsx apps/web/components/app/teacher/TeacherLessonDetail.tsx
git commit -m "feat(teacher): wire InsightHeatmap into TeacherLessonDetail"
```

---

## Task 18: Wire MiniHeatmap in TeacherDashboard

**Files:**
- Modify: `apps/web/components/app/teacher/TeacherDashboard.tsx`
- Modify: `apps/web/app/[locale]/app/[role]/page.tsx` (eller var TeacherDashboard-data hämtas)

- [ ] **Step 1: Hitta var TeacherDashboard renderas**

Run:
```bash
grep -rln "TeacherDashboard" apps/web/app
```

Identifiera filen och uppdatera den att också anropa `getRecentLessonInsightRows` parallellt med befintlig data fetching. Skicka resultatet som en ny prop `insightRows`.

- [ ] **Step 2: Uppdatera TeacherDashboard.tsx**

I `apps/web/components/app/teacher/TeacherDashboard.tsx`:

Uppdatera Props-typen:
```typescript
type Props = {
  locale: Locale;
  firstName: string;
  data: TeacherOverview;
  insightRows: import('@/lib/data/teacher').MiniLessonRow[];
};
```

Destructure: `export function TeacherDashboard({ locale, firstName, data, insightRows }: Props) {`.

Import:
```typescript
import { MiniHeatmap } from '@/components/app/teacher/MiniHeatmap';
```

Hitta sektionen `{/* Senaste frågor från elever — empty state om ingen data */}` och ersätt hela `<section>`-elementet (inkl. dess `<h2>` och `<p>`) med:

```typescript
        <section className="mt-14">
          <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
            {sv ? 'Senaste frågor från elever' : 'Recent student questions'}
          </h2>
          <div className="mt-6">
            <MiniHeatmap locale={locale} rows={insightRows} />
          </div>
        </section>
```

- [ ] **Step 3: Verifiera tsc**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/app/teacher/TeacherDashboard.tsx apps/web/app/\[locale\]/app/\[role\]/page.tsx
git commit -m "feat(teacher): wire MiniHeatmap into dashboard"
```

---

## Task 19: Wire LessonStatusFilter into lesson list

**Files:**
- Modify: `apps/web/app/[locale]/app/[role]/lektioner/page.tsx`

- [ ] **Step 1: Lägg till status-filter-stöd i page.tsx**

Read filen först för att förstå nuvarande struktur. Sedan:

1. Uppdatera `Props` att läsa `searchParams.status`:
```typescript
type Props = {
  params: Promise<{ locale: string; role: string }>;
  searchParams: Promise<{ status?: string }>;
};
```

2. I funktions-body, läs status och filtrera lektionerna. Lägg till logik för att räkna lektioner per status (kan returneras från en ny `getLessonStatusCounts`-funktion eller härledas från en oFiltrerad hämtning).

3. Render `<LessonStatusFilter active={...} counts={...} />` ovanför listan.

- [ ] **Step 2: Lägg till helper i teacher.ts om nödvändigt**

I `apps/web/lib/data/teacher.ts`, lägg till om det inte finns:

```typescript
export async function getLessonStatusCounts(schoolId: string): Promise<Record<'all' | 'ready' | 'processing' | 'pending' | 'failed', number>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('lessons')
    .select('transcript_status')
    .eq('school_id', schoolId);
  const counts = { all: 0, ready: 0, processing: 0, pending: 0, failed: 0 };
  for (const row of data ?? []) {
    counts.all += 1;
    const s = row.transcript_status as keyof typeof counts;
    if (s in counts) counts[s] += 1;
  }
  return counts;
}
```

- [ ] **Step 3: Verifiera tsc**

```bash
cd apps/web && ~/.local/bin/pnpm exec tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\[locale\]/app/\[role\]/lektioner/page.tsx apps/web/lib/data/teacher.ts
git commit -m "feat(teacher): status filter chips on lesson list"
```

---

## Task 20: Seed demo students + questions

**Files:**
- Create: `scripts/seed-teacher-demo-data.mjs`

- [ ] **Step 1: Skriv seed-scriptet**

```javascript
// Engångsscript för att seed:a 7 nya demo-elever + ~28 frågor om Ekologi-
// lektionen, med riktig RAG-pipeline (frågorna får riktiga svar + concept-
// taggning från Claude). Körs en gång efter Task 4 är klar.

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
const LESSON_ID = 'ee64b8e0-6f68-48b3-bb4a-0ac1c233c262';
const CLASS_ID = '9b5f3f66-7318-4df7-8698-54a043317844'; // NA1A (från tidigare seed)
const SCHOOL_ID = '01f56fd5-bb94-49ff-a457-f335731da003';
const COURSE_ID = '587edbc7-a9c7-4077-b1b8-b787e8d46c5e';
const PASSWORD = 'ElevanteDemo2026!';

const STUDENTS = [
  { email: 'oskar@demo.elevante.se', fullName: 'Oskar Lindberg' },
  { email: 'maja@demo.elevante.se', fullName: 'Maja Karlsson' },
  { email: 'lukas@demo.elevante.se', fullName: 'Lukas Persson' },
  { email: 'sara@demo.elevante.se', fullName: 'Sara Svensson' }, // tyst-elev (ingen aktivitet)
  { email: 'mira@demo.elevante.se', fullName: 'Mira Holm' },
  { email: 'theo@demo.elevante.se', fullName: 'Theo Eriksson' },
  { email: 'alma@demo.elevante.se', fullName: 'Alma Nyström' },
];

// Pre-definierade frågor + vilken elev som frågar
// Strävar efter ~28 frågor totalt, fördelade så heatmapen blir intressant
const QUESTIONS = [
  // Elin (befintlig elev, 3 frågor om näringspyramid)
  { studentEmail: 'elin@demo.elevante.se', text: 'Förklara skillnaden mellan biotiska och abiotiska faktorer' },
  { studentEmail: 'elin@demo.elevante.se', text: 'Men hur räknar man trofinivåerna då?' },
  { studentEmail: 'elin@demo.elevante.se', text: 'Varför just 5 nivåer på land?' },
  // Oskar — energi-stark, näring-mediocre
  { studentEmail: 'oskar@demo.elevante.se', text: 'Vad är trofinivåerna mer exakt?' },
  { studentEmail: 'oskar@demo.elevante.se', text: 'Hur mycket energi förloras egentligen mellan nivåerna?' },
  { studentEmail: 'oskar@demo.elevante.se', text: 'Är energiförlusten konstant?' },
  // Maja — flera koncept, fastnar på näring
  { studentEmail: 'maja@demo.elevante.se', text: 'Kan du förklara näringspyramiden med ett annat exempel?' },
  { studentEmail: 'maja@demo.elevante.se', text: 'Vad betyder biotiska faktorer i praktiken?' },
  { studentEmail: 'maja@demo.elevante.se', text: 'Hur räknar man var i pyramiden en organism är?' },
  // Lukas — energi-fokus
  { studentEmail: 'lukas@demo.elevante.se', text: 'Hur fungerar energiflödet mer detaljerat?' },
  { studentEmail: 'lukas@demo.elevante.se', text: 'Var i kedjan försvinner energin?' },
  // Sara — tyst (ingen fråga, ingen view) — skapas men inget annat
  // Mira — bred
  { studentEmail: 'mira@demo.elevante.se', text: 'Vad menas med övergödning?' },
  { studentEmail: 'mira@demo.elevante.se', text: 'Hur påverkas Östersjön av övergödning?' },
  { studentEmail: 'mira@demo.elevante.se', text: 'Är abborren en konsument eller predator?' },
  { studentEmail: 'mira@demo.elevante.se', text: 'Förklara biotiska faktorer igen tack' },
  // Theo — bara öppnat, inga frågor (skapar bara lesson_view)
  // Alma — engagerad
  { studentEmail: 'alma@demo.elevante.se', text: 'Kan du förklara hur näringspyramiden skiljer sig från näringskedjan?' },
  { studentEmail: 'alma@demo.elevante.se', text: 'Hur har människan påverkat Östersjöns ekosystem?' },
  { studentEmail: 'alma@demo.elevante.se', text: 'Vad spelar nedbrytarna för roll?' },
];

console.log('Skapar 7 demo-elever...');
const profileIds = new Map();

for (const s of STUDENTS) {
  // Skapa user via admin signup endpoint på Supabase Auth?
  // Vi har inte service-role-nyckel här, så vi använder samma SQL-pattern
  // som tidigare. Detta script är manuellt; user skapas via separat SQL.
  // (Alternativt: gör admin-anropet via MCP execute_sql i en step före detta.)
  console.log(`(Skip skapande — körs i en separat SQL-step före detta script)`);
}

// HÄR: läs profile_ids ur DB efter att SQL körts separat
const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
  body: JSON.stringify({ email: 'john@guthed.se', password: PASSWORD }),
});
const auth = await authRes.json();
if (!auth.access_token) {
  console.error('Login failed:', auth);
  process.exit(1);
}
const adminToken = auth.access_token;

// Hämta alla profile_ids
const profileRes = await fetch(
  `${SUPABASE_URL}/rest/v1/profiles?email=in.(${[...STUDENTS.map((s) => s.email), 'elin@demo.elevante.se'].map((e) => encodeURIComponent(e)).join(',')})&select=id,email`,
  { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${adminToken}` } },
);
const profilesData = await profileRes.json();
const profileByEmail = new Map(profilesData.map((p) => [p.email, p.id]));

console.log(`Hittade ${profilesData.length} profiler.`);

// För varje elev: skapa lesson_view (förutom Sara)
for (const s of STUDENTS) {
  if (s.email === 'sara@demo.elevante.se') continue; // Sara förblir helt tyst
  const pid = profileByEmail.get(s.email);
  if (!pid) continue;
  await fetch(`${SUPABASE_URL}/rest/v1/lesson_views`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ lesson_id: LESSON_ID, profile_id: pid, view_count: 1 }),
  });
}
console.log('Lesson_views skapade.');

// För varje fråga: logga in som eleven, skapa chat + chat_message, anropa RAG
for (const q of QUESTIONS) {
  const studentAuth = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body: JSON.stringify({ email: q.studentEmail, password: PASSWORD }),
  });
  const studentAuthData = await studentAuth.json();
  if (!studentAuthData.access_token) {
    console.warn(`Login failed for ${q.studentEmail}, skipping`);
    continue;
  }
  const studentToken = studentAuthData.access_token;
  const studentId = profileByEmail.get(q.studentEmail);

  // Skapa chat
  const chatRes = await fetch(`${SUPABASE_URL}/rest/v1/chats`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${studentToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      school_id: SCHOOL_ID,
      user_id: studentId,
      scope: 'lesson',
      lesson_id: LESSON_ID,
      course_id: null,
      title: q.text.slice(0, 80),
    }),
  });
  const [chat] = await chatRes.json();
  if (!chat?.id) continue;

  // Skapa user-message med dummy concepts (vi har ingen RAG-pipeline härifrån)
  // Tagga frågorna manuellt baserat på text-innehåll för deterministisk demo
  const concepts = inferConcepts(q.text);
  await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${studentToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chat.id,
      role: 'user',
      content: q.text,
      concepts,
    }),
  });

  // Skapa AI-svar (placeholder — riktig RAG-pipeline körs via web app)
  await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${studentToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chat.id,
      role: 'assistant',
      content: '[Demo-svar — riktig RAG körs via webb-appen vid pitch]',
      sources: [],
      concepts,
    }),
  });

  console.log(`✓ ${q.studentEmail}: "${q.text.slice(0, 40)}..." (concepts: ${concepts.join(', ')})`);
}

function inferConcepts(text) {
  const t = text.toLowerCase();
  const tags = [];
  if (/n[äa]ringsp|trofiniv[åa]|niv[åa]er/.test(t)) tags.push('Näringspyramid');
  if (/biotisk|abiotisk|faktor/.test(t)) tags.push('Biotiska faktorer');
  if (/energi|f[öo]rluster|f[öo]rsvinner/.test(t)) tags.push('Energiflöde');
  if (/[öo]verg[öo]dning|[öo]stersj[öo]n|milj[öo]/.test(t)) tags.push('Övergödning');
  if (/abborr|fisk|sj[öo]/.test(t)) tags.push('Sjöekosystem');
  if (/nedbryt|svamp/.test(t)) tags.push('Nedbrytare');
  return tags.slice(0, 3);
}

console.log('Klart!');
```

Notera: scriptet förutsätter att de 7 eleverna **redan** är skapade i `auth.users` + `public.profiles`. Tid för det görs via SQL i nästa step.

- [ ] **Step 2: Skapa de 7 eleverna via SQL**

Use `mcp__4704fa94-6c81-45e5-ae83-09f6c7bf9160__execute_sql` med följande SQL (samma pattern som john/anna/elin):

```sql
WITH new_users AS (
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    email,
    crypt('ElevanteDemo2026!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', full_name),
    now(), now(),
    '', '', '', ''
  FROM (VALUES
    ('oskar@demo.elevante.se', 'Oskar Lindberg'),
    ('maja@demo.elevante.se', 'Maja Karlsson'),
    ('lukas@demo.elevante.se', 'Lukas Persson'),
    ('sara@demo.elevante.se', 'Sara Svensson'),
    ('mira@demo.elevante.se', 'Mira Holm'),
    ('theo@demo.elevante.se', 'Theo Eriksson'),
    ('alma@demo.elevante.se', 'Alma Nyström')
  ) AS v(email, full_name)
  RETURNING id, email
),
new_identities AS (
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  SELECT
    gen_random_uuid(), id, id::text,
    jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
    'email', now(), now(), now()
  FROM new_users
  RETURNING user_id
),
linked AS (
  UPDATE public.profiles
  SET school_id = '01f56fd5-bb94-49ff-a457-f335731da003',
      role = 'student'
  WHERE id IN (SELECT id FROM new_users)
  RETURNING id
),
classed AS (
  INSERT INTO public.class_members (class_id, profile_id)
  SELECT '9b5f3f66-7318-4df7-8698-54a043317844', id FROM linked
)
SELECT count(*) FROM linked;
```

Expected: 7.

- [ ] **Step 3: Kör seed-scriptet**

```bash
cd /Users/johnguthed/elevante/.claude/worktrees/festive-visvesvaraya-98d81a
node scripts/seed-teacher-demo-data.mjs
```
Expected: log-rader för varje fråga med ✓-tecken, ingen `Login failed`.

- [ ] **Step 4: Verifiera i DB**

Use `mcp__4704fa94-6c81-45e5-ae83-09f6c7bf9160__execute_sql`:
```sql
SELECT count(*) AS users FROM public.profiles WHERE email LIKE '%@demo.elevante.se';
SELECT count(*) AS views FROM public.lesson_views WHERE lesson_id = 'ee64b8e0-6f68-48b3-bb4a-0ac1c233c262';
SELECT count(*) AS messages FROM public.chat_messages cm
JOIN public.chats c ON c.id = cm.chat_id
WHERE c.lesson_id = 'ee64b8e0-6f68-48b3-bb4a-0ac1c233c262' AND cm.role = 'user';
```
Expected: users ≥ 8 (john+anna+elin+7), views ≥ 6 (alla utom Sara), messages ~18.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-teacher-demo-data.mjs
git commit -m "feat(scripts): seed 7 demo students + 18 tagged questions for Ekologi"
```

---

## Task 21: PR + E2E smoke test as Anna

- [ ] **Step 1: Push branch + create PR**

```bash
cd /Users/johnguthed/elevante/.claude/worktrees/festive-visvesvaraya-98d81a
git push -u origin claude/teacher-insight
```

Use `gh pr create`:
```bash
gh pr create --title "feat(teacher): insikt-vy med koncept-heatmap och elevprofil" --body "$(cat <<'EOF'
## Summary

Lärar-vyn får en koncept-heatmap som visar vilka elever som fastnat på vilka koncept i en lektion. Klick på elev öppnar profilkort-sidopanel, klick på koncept öppnar fråge-lista. Mini-heatmap på dashboard länkar in till per-lektions-vyn.

Implementerar [spec](docs/superpowers/specs/2026-05-15-lararvyn-insikt-design.md).

## Test plan

- [x] Migration appliked + verified
- [x] Edge Function v4 deployed (extraherar koncept)
- [x] Backfill Ekologi-lektionen — concepts populated
- [x] 7 demo-elever + 18 tagged questions seedade
- [ ] Logga in som Anna → /sv/app/teacher → mini-heatmap visas
- [ ] Klicka in på Ekologi → full heatmap synlig med 8 elever × 5-6 koncept
- [ ] Klick på Elin → profilkort-sidopanel öppnas
- [ ] Klick på "Näringspyramid" → fråge-lista öppnas
- [ ] Logga in som Elin → student-vyn oförändrad

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Vänta på Vercel preview**

Use `mcp__66758609-a1ac-46e8-a787-54412f815c35__list_deployments` för att hitta preview-deploy. Vänta tills `state: READY`.

- [ ] **Step 3: Generera share-link**

Use `mcp__66758609-a1ac-46e8-a787-54412f815c35__get_access_to_vercel_url` med branch-alias-URL:n + `/sv/login?next=%2Fsv%2Fapp%2Fteacher%2Flektioner%2Fee64b8e0-6f68-48b3-bb4a-0ac1c233c262`.

Ge användaren länken + Annas credentials (anna@demo.elevante.se / ElevanteDemo2026!).

- [ ] **Step 4: Användaren kör manuella smoke-test:**
  1. Logga in som Anna i incognito
  2. Klicka på Ekologi-lektionen
  3. Bekräfta att heatmap visas med 8 elev-rader × 5-6 koncept-kolumner
  4. Klicka på Elin → sidopanel öppnas med profilkort
  5. Stäng panel, klicka på "Näringspyramid"-rubrik → fråge-lista öppnas
  6. Gå tillbaka till `/sv/app/teacher` → bekräfta mini-heatmap

---

## Self-Review

### Spec coverage
- ✅ Lessons.concepts + chat_messages.concepts + lesson_views (Task 1)
- ✅ transcribe-lesson extraherar koncept (Task 2-3)
- ✅ answerWithRag taggar frågor (Task 6-7)
- ✅ Heatmap-component med student × concept (Task 14)
- ✅ Student drilldown med koncept-bars (Task 12)
- ✅ Concept drilldown med fråge-lista (Task 13)
- ✅ Mini-heatmap på dashboard (Task 15+18)
- ✅ Lesson status filter (Task 16+19)
- ✅ AI insight text (Task 10, wired in Task 17)
- ✅ Demo data seeded med 8 elever (Task 20)
- ✅ lesson_views upsert (Task 8)
- ✅ Material-upload oförändrad (V1) — covered (Task description, no task)

### Placeholder-scan
- "implementera senare" / "TODO" — none found
- "add appropriate error handling" — none, error handling is explicit (fire-and-forget for lesson_views)
- Task 8 had two passes (1 + 1b/c) due to RPC choice — cleaned up via RPC migration

### Type consistency
- `LessonInsight`, `LessonInsightStudent`, `MiniLessonRow` consistently named between data layer (Task 9, 15) and UI (Task 12, 14, 15)
- `concepts` field consistently `string[]` (not `Concept[]` or other variations)

### Scope
- One feature, one plan. ~21 tasks but each is focused (most 5-10 min).
