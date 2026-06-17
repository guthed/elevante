# Radera (arkivera) hel lektion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Låt en lärare radera en hel lektion från lärarvyn som en återställbar mjuk radering (arkiv).

**Architecture:** Ny kolumn `lessons.archived_at`. Två Server Actions (`archiveLesson`/`restoreLesson`) med samma behörighet som `clearTranscript`. Arkiverade lektioner filtreras bort i lärar-/elev-/admin-datalager och i RAG-funktionerna. UI: en "Radera lektion"-knapp på lektionsdetaljen + en "Ångra"-toast.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (Postgres + RLS), TypeScript, Tailwind v4.

**Testning:** Webb-appen har inget enhetstest-ramverk. Verifieringsgrindar per task är: `corepack pnpm --filter @elevante/web typecheck`, vid behov `corepack pnpm --filter @elevante/web build`, samt explicita SQL-/manuella kontroller. Inga nya testberoenden införs.

**Migrationer appliceras** mot Supabase-projektet `msqfuywpbrteyrzjggsw` via Supabase MCP `apply_migration` (name + query). Filen sparas också i `supabase/migrations/` för historik.

---

## Task 1: Migration — kolumn `archived_at`

**Files:**
- Create: `supabase/migrations/20260617120000_lessons_archived_at.sql`

- [ ] **Step 1: Skapa migrationsfilen**

```sql
-- Elevante: mjuk radering av lektioner.
-- archived_at = null betyder aktiv. Sätts vid arkivering, nollställs vid återställning.
alter table public.lessons
  add column if not exists archived_at timestamptz;
```

- [ ] **Step 2: Applicera migrationen**

Via Supabase MCP `apply_migration`: `name: "lessons_archived_at"`, `query:` innehållet ovan.
(Alternativt CLI: `supabase db push`.)

- [ ] **Step 3: Verifiera att kolumnen finns**

Kör SQL:
```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='lessons' and column_name='archived_at';
```
Förväntat: en rad, `timestamptz`, `is_nullable = YES`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260617120000_lessons_archived_at.sql
git commit -m "feat(db): lessons.archived_at för mjuk radering"
```

---

## Task 2: Migration — uteslut arkiverade lektioner ur RAG

**Files:**
- Create: `supabase/migrations/20260617120100_match_chunks_exclude_archived.sql`

Bakgrund: `match_lesson_chunks` filtrerar på `lesson_id` direkt (ingen join), `match_course_chunks` joinar redan `lessons l`. Båda återskapas med `archived_at is null`.

- [ ] **Step 1: Skapa migrationsfilen**

```sql
-- Elevante: arkiverade lektioner ska inte matchas av RAG.
-- Chunks behålls (för snabb återställning) men exkluderas medan archived_at är satt.

create or replace function public.match_lesson_chunks(
  query_embedding extensions.vector(1024),
  lesson_id_filter uuid,
  top_k integer default 5
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.content,
    1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.lesson_chunks c
  join public.lessons l on l.id = c.lesson_id
  where c.lesson_id = lesson_id_filter
    and l.archived_at is null
    and c.embedding is not null
  order by c.embedding operator(extensions.<=>) query_embedding
  limit top_k;
$$;

create or replace function public.match_course_chunks(
  query_embedding extensions.vector(1024),
  course_id_filter uuid,
  top_k integer default 8
)
returns table (
  id uuid,
  lesson_id uuid,
  content text,
  similarity float
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.lesson_id,
    c.content,
    1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.lesson_chunks c
  join public.lessons l on l.id = c.lesson_id
  where l.course_id = course_id_filter
    and l.archived_at is null
    and c.embedding is not null
  order by c.embedding operator(extensions.<=>) query_embedding
  limit top_k;
$$;

revoke all on function public.match_lesson_chunks(extensions.vector(1024), uuid, integer) from public, anon;
revoke all on function public.match_course_chunks(extensions.vector(1024), uuid, integer) from public, anon;
grant execute on function public.match_lesson_chunks(extensions.vector(1024), uuid, integer) to authenticated;
grant execute on function public.match_course_chunks(extensions.vector(1024), uuid, integer) to authenticated;
```

- [ ] **Step 2: Applicera** via `apply_migration` (`name: "match_chunks_exclude_archived"`).

- [ ] **Step 3: Verifiera funktionsdefinitionen**

```sql
select pg_get_functiondef('public.match_course_chunks(extensions.vector,uuid,integer)'::regprocedure) like '%archived_at is null%' as has_filter;
```
Förväntat: `has_filter = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260617120100_match_chunks_exclude_archived.sql
git commit -m "feat(db): exkludera arkiverade lektioner ur match_*_chunks"
```

---

## Task 3: Server Actions — `archiveLesson` / `restoreLesson`

**Files:**
- Create: `apps/web/app/actions/lesson.ts`

Mönstret speglar `clearTranscript` (auth-helper, service-role-klient, revalidate, result-typ). Helpern dupliceras medvetet hit — `transcript.ts` ligger på en annan branch och ska inte importeras härifrån.

- [ ] **Step 1: Skapa server-action-filen**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

export type LessonActionResult =
  | { ok: true }
  | { ok: false; code: 'unauthorized' | 'invalid' | 'generic'; detail?: string };

const lessonIdSchema = z.string().uuid();

/** Verifiera att inloggad användare får ändra lektionen. Returnerar lektionen eller null. */
async function authorizeLesson(
  lessonId: string,
): Promise<{ id: string; school_id: string } | null> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.school_id) return null;
  if (profile.role !== 'teacher' && profile.role !== 'admin') return null;

  const supabase = await createSupabaseServerClient();
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, school_id, teacher_id')
    .eq('id', lessonId)
    .maybeSingle();

  if (!lesson || lesson.school_id !== profile.school_id) return null;
  if (profile.role === 'teacher' && lesson.teacher_id !== profile.id) return null;
  return { id: lesson.id, school_id: lesson.school_id };
}

function revalidateLessonViews(lessonId: string): void {
  for (const locale of ['sv', 'en'] as const) {
    revalidatePath(`/${locale}/app/teacher`);
    revalidatePath(`/${locale}/app/teacher/lektioner`);
    revalidatePath(`/${locale}/app/teacher/lektioner/${lessonId}`);
  }
}

async function setArchivedAt(
  lessonId: string,
  value: string | null,
): Promise<LessonActionResult> {
  const parsed = lessonIdSchema.safeParse(lessonId);
  if (!parsed.success) return { ok: false, code: 'invalid', detail: 'bad-id' };

  const lesson = await authorizeLesson(lessonId);
  if (!lesson) return { ok: false, code: 'unauthorized' };

  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin
    .from('lessons')
    .update({ archived_at: value })
    .eq('id', lessonId);
  if (error) return { ok: false, code: 'generic', detail: error.message };

  revalidateLessonViews(lessonId);
  return { ok: true };
}

/** Arkivera (mjuk radering) en lektion. */
export async function archiveLesson(lessonId: string): Promise<LessonActionResult> {
  return setArchivedAt(lessonId, new Date().toISOString());
}

/** Återställ en arkiverad lektion. */
export async function restoreLesson(lessonId: string): Promise<LessonActionResult> {
  return setArchivedAt(lessonId, null);
}
```

- [ ] **Step 2: Bekräfta att `archived_at` finns i den genererade Supabase-typen**

Om projektet har genererade typer (`lib/supabase/types.ts` el. likn.) och `archived_at` saknas i `lessons` Update-typen kan TS klaga. Kör typecheck i nästa steg; om fel uppstår, regenerera typerna (Supabase MCP `generate_typescript_types`) och spara över typfilen.

- [ ] **Step 3: Typecheck**

Run: `corepack pnpm --filter @elevante/web typecheck`
Expected: PASS (inga fel).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/actions/lesson.ts
git commit -m "feat(web): archiveLesson/restoreLesson server actions"
```

---

## Task 4: Filtrera bort arkiverade i lärar-datalagret

**Files:**
- Modify: `apps/web/lib/data/teacher.ts`

Lägg `.is('archived_at', null)` i fyra queries. Mekanisk, identisk ändring per query.

- [ ] **Step 1: `getTeacherOverview` (~rad 42)**

Lägg filtret direkt efter `.eq('teacher_id', teacherId)`:
```ts
      .eq('teacher_id', teacherId)
      .is('archived_at', null)
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .limit(10),
```

- [ ] **Step 2: `getClassDetail` (~rad 164)**

Efter `.eq('class_id', classId)`:
```ts
      .eq('class_id', classId)
      .is('archived_at', null)
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .limit(10),
```

- [ ] **Step 3: `getTeacherLessons` (~rad 222)**

I kedjan som börjar `.from('lessons').select(...)`, lägg `.is('archived_at', null)` efter `.eq('teacher_id', teacherId)` (samma `select`-kolumner som idag).

- [ ] **Step 4: `getLessonDetail` (~rad 271)**

Efter `.eq('id', lessonId)` och före `.maybeSingle()`:
```ts
    .eq('id', lessonId)
    .is('archived_at', null)
    .maybeSingle();
```
Effekt: arkiverad lektion → `null` → sidan `notFound()`.

- [ ] **Step 5: Typecheck**

Run: `corepack pnpm --filter @elevante/web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/data/teacher.ts
git commit -m "feat(web): dölj arkiverade lektioner i lärar-datalagret"
```

---

## Task 5: Filtrera bort arkiverade i elev-datalagret

**Files:**
- Modify: `apps/web/lib/data/student.ts`

- [ ] **Step 1: `getStudentOverview` (~rad 62)** — efter `.in('class_id', classIds)`:
```ts
    .in('class_id', classIds)
    .is('archived_at', null)
```

- [ ] **Step 2: `getStudentLibrary` (~rad 114)** — i `query`-kedjan efter `.in('class_id', classIds)`:
```ts
    .in('class_id', classIds)
    .is('archived_at', null)
```

- [ ] **Step 3: `getStudentLessonDetail` (~rad 176)** — efter `.eq('id', lessonId)` före `.maybeSingle()`:
```ts
      .eq('id', lessonId)
      .is('archived_at', null)
      .maybeSingle(),
```

- [ ] **Step 4: `getStudentCoursesWithLessons` (~rad 324)** — efter `.in('class_id', classIds)`:
```ts
    .in('class_id', classIds)
    .is('archived_at', null)
    .eq('transcript_status', 'ready')
```

- [ ] **Step 5: Lämna `getPracticeTest` (~rad 384) orörd**

Den queryn (`.select('id, title').in('id', test.lesson_ids)`) resolvar bara titlar för ett redan sparat prov. Att fortsätta visa titeln för en arkiverad lektion i ett befintligt prov är ofarligt och avsiktligt. Lägg INTE filter här.

- [ ] **Step 6: Typecheck + Commit**

```bash
corepack pnpm --filter @elevante/web typecheck
git add apps/web/lib/data/student.ts
git commit -m "feat(web): dölj arkiverade lektioner i elev-datalagret"
```

---

## Task 6: Filtrera bort arkiverade i admin-statistik

**Files:**
- Modify: `apps/web/lib/data/admin.ts` (queries på rad ~31, ~33, ~161)

- [ ] **Step 1: Lägg `.is('archived_at', null)` i varje `.from('lessons')`-query som räknar/listar lektioner för statistik**

Exempel (rad ~33-area, lektionslista för stats):
```ts
      .from('lessons')
      .select('id, transcript_status, created_at')
      .is('archived_at', null)
```
Gör motsvarande för de övriga `.from('lessons')`-anropen i filen som matar statistik. (Räkna inte arkiverade.)

- [ ] **Step 2: Typecheck + Commit**

```bash
corepack pnpm --filter @elevante/web typecheck
git add apps/web/lib/data/admin.ts
git commit -m "feat(web): räkna inte arkiverade lektioner i admin-statistik"
```

---

## Task 7: Låt Toast stödja en handlingsknapp (för "Ångra")

**Files:**
- Modify: `apps/web/components/ui/Toast.tsx`

Toast-typen har idag bara `title/description/tone/duration`. Lägg ett valfritt `action`.

- [ ] **Step 1: Utöka `Toast`-typen**

```ts
export type Toast = {
  id: string;
  title: string;
  description?: string;
  tone?: Tone;
  duration?: number;
  action?: { label: string; onClick: () => void };
};
```

- [ ] **Step 2: Rendera action-knappen i toast-markupen**

I komponentens render-del för en enskild toast, lägg efter beskrivningen:
```tsx
{t.action ? (
  <button
    type="button"
    onClick={() => {
      t.action?.onClick();
      dismiss(t.id);
    }}
    className="mt-1 text-left text-[0.8125rem] font-medium underline underline-offset-2"
  >
    {t.action.label}
  </button>
) : null}
```
(Använd samma variabelnamn som befintlig map; om den itererar `toasts.map((t) => ...)` passar `t` ovan. Annars anpassa namnet.)

- [ ] **Step 3: Typecheck**

Run: `corepack pnpm --filter @elevante/web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/ui/Toast.tsx
git commit -m "feat(ui): valfri action-knapp i Toast (för Ångra)"
```

---

## Task 8: "Radera lektion"-knapp + i18n + inkoppling

**Files:**
- Create: `apps/web/components/app/teacher/DeleteLessonButton.tsx`
- Modify: `apps/web/lib/i18n/locales/sv.ts`, `apps/web/lib/i18n/locales/en.ts`, `apps/web/lib/i18n/types.ts`
- Modify: `apps/web/components/app/teacher/TeacherLessonDetail.tsx`
- Modify: `apps/web/app/[locale]/app/[role]/lektioner/[id]/page.tsx`

- [ ] **Step 1: Lägg i18n-nycklar**

I `lib/i18n/types.ts`, under `app.pages.teacher.lessons`-objektets typ, lägg:
```ts
        delete: string;
        deleteConfirmTitle: string;
        deleted: string;
        undo: string;
        deleteError: string;
```
I `lib/i18n/locales/sv.ts` (samma objekt):
```ts
        delete: 'Radera lektion',
        deleteConfirmTitle: 'Radera den här lektionen?',
        deleted: 'Lektionen raderad',
        undo: 'Ångra',
        deleteError: 'Kunde inte radera lektionen',
```
I `lib/i18n/locales/en.ts`:
```ts
        delete: 'Delete lesson',
        deleteConfirmTitle: 'Delete this lesson?',
        deleted: 'Lesson deleted',
        undo: 'Undo',
        deleteError: 'Could not delete the lesson',
```
(Om `app.pages.teacher.lessons` har annan exakt nästling: lägg nycklarna i samma objekt som `title` som sidan redan läser via `dict.app.pages.teacher.lessons.title`.)

- [ ] **Step 2: Skapa klientkomponenten**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { archiveLesson, restoreLesson } from '@/app/actions/lesson';

type Labels = {
  delete: string;
  deleted: string;
  undo: string;
  deleteError: string;
};

export function DeleteLessonButton({
  lessonId,
  locale,
  labels,
}: {
  lessonId: string;
  locale: string;
  labels: Labels;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const onDelete = () => {
    startTransition(async () => {
      const res = await archiveLesson(lessonId);
      if (!res.ok) {
        show({ title: labels.deleteError, tone: 'error' });
        return;
      }
      setDone(true);
      show({
        title: labels.deleted,
        tone: 'neutral',
        duration: 8000,
        action: {
          label: labels.undo,
          onClick: () => {
            restoreLesson(lessonId).then(() => router.refresh());
          },
        },
      });
      router.push(`/${locale}/app/teacher/lektioner`);
    });
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={isPending || done}
      className="text-[0.8125rem] font-medium text-red-700 underline underline-offset-2 hover:text-red-800 disabled:opacity-50"
    >
      {labels.delete}
    </button>
  );
}
```

- [ ] **Step 3: Rendera knappen i `TeacherLessonDetail.tsx`**

Komponenten tar redan en `lesson`. Lägg en prop `deleteSlot?: ReactNode` (eller rendera knappen direkt om komponenten har tillgång till `locale` + labels). Enklast: lägg en valfri prop och rendera den längst ner i huvudkolumnen, t.ex. efter materials-sektionen:
```tsx
{deleteSlot ? (
  <div className="mt-8 border-t border-[var(--color-sand)] pt-6">
    {deleteSlot}
  </div>
) : null}
```
Lägg `deleteSlot` i komponentens props-typ: `deleteSlot?: import('react').ReactNode;`.

- [ ] **Step 4: Skicka in knappen från sidan**

I `app/[locale]/app/[role]/lektioner/[id]/page.tsx`, i teacher-grenen där `<TeacherLessonDetailView ... />` renderas, importera komponenten och skicka:
```tsx
import { DeleteLessonButton } from '@/components/app/teacher/DeleteLessonButton';
// ...
<TeacherLessonDetailView
  // ...befintliga props...
  deleteSlot={
    <DeleteLessonButton
      lessonId={lesson.id}
      locale={locale}
      labels={{
        delete: dict.app.pages.teacher.lessons.delete,
        deleted: dict.app.pages.teacher.lessons.deleted,
        undo: dict.app.pages.teacher.lessons.undo,
        deleteError: dict.app.pages.teacher.lessons.deleteError,
      }}
    />
  }
/>
```

- [ ] **Step 5: Typecheck + build**

Run:
```bash
corepack pnpm --filter @elevante/web typecheck
corepack pnpm --filter @elevante/web build
```
Expected: båda PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/app/teacher/DeleteLessonButton.tsx \
        apps/web/components/app/teacher/TeacherLessonDetail.tsx \
        "apps/web/app/[locale]/app/[role]/lektioner/[id]/page.tsx" \
        apps/web/lib/i18n/locales/sv.ts apps/web/lib/i18n/locales/en.ts apps/web/lib/i18n/types.ts
git commit -m "feat(web): Radera lektion-knapp med ångra-toast"
```

---

## Task 9: End-to-end-verifiering

- [ ] **Step 1: Manuell genomgång (dev-server)**

Starta webben (`corepack pnpm --filter @elevante/web dev`), logga in som lärare (`anna@demo.elevante.se`), öppna en lektion, klicka "Radera lektion".
Förväntat: redirect till lektionslistan, toast "Lektionen raderad — Ångra", lektionen borta ur listan.

- [ ] **Step 2: Verifiera DB-state**

```sql
select id, title, archived_at from lessons where archived_at is not null order by archived_at desc limit 5;
```
Förväntat: den raderade lektionen har `archived_at` satt.

- [ ] **Step 3: Verifiera RAG-uteslutning**

Som elev: lektionen syns inte i biblioteket och går inte att chatta mot. (Eller SQL: bekräfta att `match_lesson_chunks` med det arkiverade `lesson_id` ger 0 rader.)

- [ ] **Step 4: Verifiera ångra**

Klicka "Ångra" i toasten (inom 8s) → `archived_at` blir null igen, lektionen återkommer i listan.

- [ ] **Step 5: Behörighet**

Bekräfta att en annan lärares lektion inte kan arkiveras (server-actionen returnerar `unauthorized`).
```

