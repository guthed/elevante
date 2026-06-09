# Lärarens transkript-redigering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ge läraren ett tydligt sätt att söka i, redigera och radera en lektions transkript direkt i lektionsdetaljvyn, med automatisk RAG-omindexering vid sparande.

**Architecture:** En ny klientkomponent `TranscriptEditor` ersätter det skrivskyddade `<pre>`-blocket i `TeacherLessonDetail`. Två nya Server Actions (`updateTranscript`, `clearTranscript`) muterar `lessons.transcript_text`, raderar gamla `lesson_chunks` och kör om `transcribe-lesson`-edge-funktionen synkront så att chunks/embeddings/summary regenereras. Edge-funktionen görs idempotent.

**Tech Stack:** Next.js 16 (App Router, React 19, Server Actions), TypeScript, Tailwind v4, Supabase (service-role-klient + Edge Function), Deno (edge).

**Konventioner i detta repo (följ dem):**
- Inga automatiska tester finns. Verifiering = `pnpm --filter @elevante/web typecheck` + `pnpm --filter @elevante/web build` + manuell webbverifiering. Lägg INTE till ett testramverk.
- Server Actions validerar **manuellt** (som `app/actions/materials.ts`). Zod är inte installerat — lägg inte till det.
- Inga hårdkodade strängar: all text via `dict`/`labels`.
- Inga `any` utan kommentar.

---

### Task 1: i18n-nycklar för editor, sök och radera

**Files:**
- Modify: `apps/web/lib/i18n/types.ts` (teacher `lessonDetail`-typblock, efter rad 240 `transcriptComingSoon: string;`)
- Modify: `apps/web/lib/i18n/locales/sv.ts` (teacher `lessonDetail`, efter rad 257 `transcriptComingSoon`)
- Modify: `apps/web/lib/i18n/locales/en.ts` (teacher `lessonDetail`, efter rad 257 `transcriptComingSoon`)

- [ ] **Step 1: Lägg till typnycklarna**

I `types.ts`, inuti `teacher.lessonDetail`-blocket, direkt efter raden `transcriptComingSoon: string;` (rad 240), lägg till:

```ts
          editTranscript: string;
          editCancel: string;
          editSave: string;
          editSaving: string;
          clearTranscript: string;
          clearConfirmTitle: string;
          clearConfirmBody: string;
          clearConfirmAction: string;
          clearConfirmCancel: string;
          searchPlaceholder: string;
          searchPrev: string;
          searchNext: string;
          searchNoMatches: string;
          saveSuccess: string;
          saveError: string;
          editEmptyError: string;
          clearSuccess: string;
```

- [ ] **Step 2: Lägg till svenska strängar**

I `sv.ts`, inuti teacher `lessonDetail`, direkt efter `transcriptComingSoon`-värdet (raderna 256-257), lägg till:

```ts
          editTranscript: 'Redigera',
          editCancel: 'Avbryt',
          editSave: 'Spara',
          editSaving: 'Sparar och uppdaterar AI…',
          clearTranscript: 'Töm transkript',
          clearConfirmTitle: 'Töm hela transkriptet?',
          clearConfirmBody:
            'Texten och allt AI-innehåll (sammanfattning, frågor, sökindex) raderas permanent. Råljudet är redan borta, så detta går inte att ångra.',
          clearConfirmAction: 'Töm transkript',
          clearConfirmCancel: 'Avbryt',
          searchPlaceholder: 'Sök i transkriptet…',
          searchPrev: 'Föregående träff',
          searchNext: 'Nästa träff',
          searchNoMatches: 'Inga träffar',
          saveSuccess: 'Transkriptet sparades och AI uppdaterades.',
          saveError: 'Kunde inte spara transkriptet. Försök igen.',
          editEmptyError: 'Transkriptet kan inte vara tomt.',
          clearSuccess: 'Transkriptet tömdes.',
```

- [ ] **Step 3: Lägg till engelska strängar**

I `en.ts`, samma plats i teacher `lessonDetail`, lägg till:

```ts
          editTranscript: 'Edit',
          editCancel: 'Cancel',
          editSave: 'Save',
          editSaving: 'Saving and updating AI…',
          clearTranscript: 'Clear transcript',
          clearConfirmTitle: 'Clear the entire transcript?',
          clearConfirmBody:
            'The text and all AI content (summary, questions, search index) is permanently deleted. The raw audio is already gone, so this cannot be undone.',
          clearConfirmAction: 'Clear transcript',
          clearConfirmCancel: 'Cancel',
          searchPlaceholder: 'Search the transcript…',
          searchPrev: 'Previous match',
          searchNext: 'Next match',
          searchNoMatches: 'No matches',
          saveSuccess: 'Transcript saved and AI updated.',
          saveError: 'Could not save the transcript. Try again.',
          editEmptyError: 'The transcript cannot be empty.',
          clearSuccess: 'Transcript cleared.',
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @elevante/web typecheck`
Expected: PASS (inga fel — `sv` och `en` uppfyller `Dictionary`-typen).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/i18n/types.ts apps/web/lib/i18n/locales/sv.ts apps/web/lib/i18n/locales/en.ts
git commit -m "i18n: nycklar för transkript-redigering, sök och radera"
```

---

### Task 2: Gör edge-funktionen idempotent

Edge-funktionen insertar `lesson_chunks` utan att radera gamla → en re-körning på samma lektion skulle duplicera chunks. Lägg till en radering precis före insert.

**Files:**
- Modify: `supabase/functions/transcribe-lesson/index.ts` (i `processLesson`, precis före `// 6. Spara lesson_chunks` / `.from('lesson_chunks').insert(chunkRows)`, runt rad 269-279)

- [ ] **Step 1: Lägg till radering av gamla chunks före insert**

Hitta blocket (runt rad 269):

```ts
    // 6. Spara lesson_chunks
    const chunkRows = chunks.map((content, idx) => ({
```

Lägg till direkt FÖRE den raden:

```ts
    // 6.0 Radera ev. gamla chunks så att re-indexering blir idempotent
    const { error: delErr } = await supabase
      .from('lesson_chunks')
      .delete()
      .eq('lesson_id', lessonId);
    if (delErr) throw new Error(`Delete old chunks failed: ${delErr.message}`);

```

- [ ] **Step 2: Verifiera Deno-syntax lokalt (typkontroll om Deno finns)**

Run: `deno check supabase/functions/transcribe-lesson/index.ts` (om `deno` är installerat; annars hoppa över och förlita dig på deploy-steget i Task 6).
Expected: inga typfel.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/transcribe-lesson/index.ts
git commit -m "fix(edge): radera gamla lesson_chunks före insert (idempotent re-index)"
```

> Deploy av edge-funktionen sker i Task 6 (verifiering), efter att server-actionen finns.

---

### Task 3: Server Actions — `updateTranscript` och `clearTranscript`

**Files:**
- Create: `apps/web/app/actions/transcript.ts`

Auth/ägarskap kontrolleras med den RLS-scopade server-klienten (som `materials.ts`). Chunk-radering, `lessons`-update och edge-invoke görs med service-role-klienten. Service-role används ALDRIG innan ägarskapskontrollen passerat.

- [ ] **Step 1: Skapa actions-filen**

Skapa `apps/web/app/actions/transcript.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

export type TranscriptActionResult =
  | { ok: true }
  | {
      ok: false;
      code: 'unauthorized' | 'invalid' | 'reindex-failed' | 'generic';
      detail?: string;
    };

const MAX_TRANSCRIPT_CHARS = 200_000;

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

function revalidateLesson(lessonId: string): void {
  for (const locale of ['sv', 'en'] as const) {
    revalidatePath(`/${locale}/app/teacher/lektioner/${lessonId}`);
    revalidatePath(`/${locale}/app/student/lektioner/${lessonId}`);
  }
}

/**
 * Spara redigerat transkript och re-indexera RAG synkront:
 * radera gamla chunks → kör transcribe-lesson med ny text → ready.
 */
export async function updateTranscript(
  lessonId: string,
  text: string,
): Promise<TranscriptActionResult> {
  const lesson = await authorizeLesson(lessonId);
  if (!lesson) return { ok: false, code: 'unauthorized' };

  const trimmed = text.trim();
  if (!trimmed) return { ok: false, code: 'invalid', detail: 'empty' };
  if (trimmed.length > MAX_TRANSCRIPT_CHARS) {
    return { ok: false, code: 'invalid', detail: 'too-long' };
  }

  const admin = createSupabaseServiceRoleClient();

  // Markera processing + spara texten direkt.
  const { error: updErr } = await admin
    .from('lessons')
    .update({ transcript_text: trimmed, transcript_status: 'processing' })
    .eq('id', lessonId);
  if (updErr) return { ok: false, code: 'generic', detail: updErr.message };

  // Rensa gamla chunks (edge-funktionen gör det också, men vi är defensiva).
  const { error: delErr } = await admin
    .from('lesson_chunks')
    .delete()
    .eq('lesson_id', lessonId);
  if (delErr) return { ok: false, code: 'generic', detail: delErr.message };

  // Re-indexera synkront: chunk + embed + summary/frågor/koncept + status=ready.
  const { error: fnErr } = await admin.functions.invoke('transcribe-lesson', {
    body: { lesson_id: lessonId, transcript_text: trimmed },
  });
  if (fnErr) {
    await admin
      .from('lessons')
      .update({ transcript_status: 'failed' })
      .eq('id', lessonId);
    return { ok: false, code: 'reindex-failed', detail: fnErr.message };
  }

  revalidateLesson(lessonId);
  return { ok: true };
}

/** Töm hela transkriptet: radera chunks + nollställ text och härledda AI-fält. */
export async function clearTranscript(
  lessonId: string,
): Promise<TranscriptActionResult> {
  const lesson = await authorizeLesson(lessonId);
  if (!lesson) return { ok: false, code: 'unauthorized' };

  const admin = createSupabaseServiceRoleClient();

  const { error: delErr } = await admin
    .from('lesson_chunks')
    .delete()
    .eq('lesson_id', lessonId);
  if (delErr) return { ok: false, code: 'generic', detail: delErr.message };

  const { error: updErr } = await admin
    .from('lessons')
    .update({
      transcript_text: null,
      summary: null,
      // suggested_questions/concepts är `string[]` (ej nullable) i Update-typen → töm med [].
      suggested_questions: [],
      concepts: [],
      ai_generated_topic: null,
      transcript_status: 'pending',
    })
    .eq('id', lessonId);
  if (updErr) return { ok: false, code: 'generic', detail: updErr.message };

  revalidateLesson(lessonId);
  return { ok: true };
}
```

- [ ] **Step 2: Verifiera kolumnnamn mot databastyperna**

Run: `grep -nE "summary|suggested_questions|concepts|ai_generated_topic|transcript_text|transcript_status" apps/web/lib/supabase/database.ts`
Expected: alla sex kolumnerna finns på `lessons`-raden. Om någon kolumn heter annorlunda i `database.ts`, rätta fältnamnet i `clearTranscript`/`updateTranscript` därefter (typecheck i nästa steg fångar avvikelser).

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @elevante/web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/actions/transcript.ts
git commit -m "feat: server actions updateTranscript + clearTranscript med RAG-reindex"
```

---

### Task 4: `TranscriptEditor`-klientkomponent (sök + redigera + radera)

**Files:**
- Create: `apps/web/components/app/teacher/TranscriptEditor.tsx`

- [ ] **Step 1: Skapa komponenten**

Skapa `apps/web/components/app/teacher/TranscriptEditor.tsx`:

```tsx
'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { updateTranscript, clearTranscript } from '@/app/actions/transcript';
import type { Dictionary } from '@/lib/i18n/types';

type Labels = Dictionary['app']['pages']['teacher']['lessonDetail'];

type Props = {
  lessonId: string;
  initialText: string;
  labels: Labels;
};

/** Startindex för alla (case-insensitive) förekomster av query i text. */
function findMatches(text: string, query: string): number[] {
  if (!query) return [];
  const out: number[] = [];
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    out.push(i);
    i = haystack.indexOf(needle, i + needle.length);
  }
  return out;
}

export function TranscriptEditor({ lessonId, initialText, labels }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [draft, setDraft] = useState(initialText);
  const [query, setQuery] = useState('');
  const [activeMatch, setActiveMatch] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const activeRef = useRef<HTMLElement | null>(null);

  const matches = useMemo(() => findMatches(initialText, query), [initialText, query]);
  const total = matches.length;

  // Håll activeMatch inom intervallet när träffmängden ändras.
  useEffect(() => {
    setActiveMatch((prev) => (total === 0 ? 0 : Math.min(prev, total - 1)));
  }, [total]);

  // Scrolla aktiv träff in i vyn.
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [activeMatch, query]);

  function gotoMatch(delta: number) {
    if (total === 0) return;
    setActiveMatch((prev) => (prev + delta + total) % total);
  }

  function handleSave() {
    setMessage(null);
    const next = draft.trim();
    if (!next) {
      setMessage({ kind: 'error', text: labels.editEmptyError });
      return;
    }
    startTransition(async () => {
      const res = await updateTranscript(lessonId, next);
      if (res.ok) {
        setMode('read');
        setMessage({ kind: 'ok', text: labels.saveSuccess });
        router.refresh();
      } else {
        setMessage({ kind: 'error', text: labels.saveError });
      }
    });
  }

  function handleClear() {
    setMessage(null);
    startTransition(async () => {
      const res = await clearTranscript(lessonId);
      setConfirmOpen(false);
      if (res.ok) {
        setMessage({ kind: 'ok', text: labels.clearSuccess });
        router.refresh();
      } else {
        setMessage({ kind: 'error', text: labels.saveError });
      }
    });
  }

  // Renderad läslägestext med markerade träffar.
  let body: ReactNode;
  if (total === 0) {
    body = initialText;
  } else {
    const nodes: ReactNode[] = [];
    let cursor = 0;
    matches.forEach((start, idx) => {
      const end = start + query.length;
      if (start > cursor) nodes.push(initialText.slice(cursor, start));
      const isActive = idx === activeMatch;
      nodes.push(
        <mark
          key={idx}
          ref={isActive ? (el) => { activeRef.current = el; } : undefined}
          className={
            isActive
              ? 'rounded-sm bg-[var(--color-coral)] text-white'
              : 'rounded-sm bg-[var(--color-coral)]/30 text-[var(--color-ink)]'
          }
        >
          {initialText.slice(start, end)}
        </mark>,
      );
      cursor = end;
    });
    if (cursor < initialText.length) nodes.push(initialText.slice(cursor));
    body = nodes;
  }

  return (
    <div>
      {/* Verktygsrad */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {mode === 'read' && (
          <div className="flex flex-1 items-center gap-2">
            <label className="sr-only" htmlFor="transcript-search">
              {labels.searchPlaceholder}
            </label>
            <input
              id="transcript-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.searchPlaceholder}
              className="w-full max-w-xs rounded-full border border-[var(--color-sand)] bg-[var(--color-surface)] px-4 py-2 text-[0.875rem] text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
            />
            {query && (
              <div className="flex items-center gap-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
                <span aria-live="polite" className="tabular-nums">
                  {total === 0 ? labels.searchNoMatches : `${activeMatch + 1}/${total}`}
                </span>
                <button
                  type="button"
                  onClick={() => gotoMatch(-1)}
                  disabled={total === 0}
                  aria-label={labels.searchPrev}
                  className="rounded-full px-2 py-1 hover:bg-[var(--color-sand)] disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => gotoMatch(1)}
                  disabled={total === 0}
                  aria-label={labels.searchNext}
                  className="rounded-full px-2 py-1 hover:bg-[var(--color-sand)] disabled:opacity-40"
                >
                  ↓
                </button>
              </div>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {mode === 'read' ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setDraft(initialText); setMode('edit'); setMessage(null); }}>
                {labels.editTranscript}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
                {labels.clearTranscript}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setMode('read'); setMessage(null); }} disabled={pending}>
                {labels.editCancel}
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={pending}>
                {pending ? labels.editSaving : labels.editSave}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status-/felmeddelande */}
      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={
            message.kind === 'error'
              ? 'mb-4 text-[0.875rem] text-[var(--color-coral)]'
              : 'mb-4 text-[0.875rem] text-[var(--color-ink-muted)]'
          }
        >
          {message.text}
        </p>
      )}

      {/* Transkript */}
      {mode === 'read' ? (
        <pre className="whitespace-pre-wrap font-mono text-[0.875rem] leading-[1.7] text-[var(--color-ink)]">
          {body}
        </pre>
      ) : (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={pending}
          rows={24}
          aria-label={labels.transcriptHeading}
          className="w-full resize-y rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-4 font-mono text-[0.875rem] leading-[1.7] text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-60"
        />
      )}

      {/* Bekräftelse för töm */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={labels.clearConfirmTitle}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)} disabled={pending}>
              {labels.clearConfirmCancel}
            </Button>
            <Button variant="danger" size="sm" onClick={handleClear} disabled={pending}>
              {labels.clearConfirmAction}
            </Button>
          </>
        }
      >
        <p className="text-[0.9375rem] text-[var(--color-ink-secondary)]">
          {labels.clearConfirmBody}
        </p>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @elevante/web typecheck`
Expected: PASS. Om `--color-ink-secondary` saknas i `globals.css` är det bara en CSS-variabel (inget typfel); bekräfta annars i Task 6 manuellt.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/app/teacher/TranscriptEditor.tsx
git commit -m "feat: TranscriptEditor — sök, redigera och töm transkript"
```

---

### Task 5: Koppla in editorn i `TeacherLessonDetail`

**Files:**
- Modify: `apps/web/components/app/teacher/TeacherLessonDetail.tsx` (import + transcript-blocket, rad 130-150)

- [ ] **Step 1: Importera editorn**

Direkt efter raden (rad 7):

```tsx
import { InsightHeatmap } from '@/components/app/teacher/InsightHeatmap';
```

lägg till:

```tsx
import { TranscriptEditor } from '@/components/app/teacher/TranscriptEditor';
```

- [ ] **Step 2: Byt ut det skrivskyddade `<pre>` mot editorn**

Hitta blocket (rad 130-133):

```tsx
            {lesson.status === 'ready' && lesson.transcriptText ? (
              <pre className="whitespace-pre-wrap font-mono text-[0.875rem] leading-[1.7] text-[var(--color-ink)]">
                {lesson.transcriptText}
              </pre>
            ) : (
```

Ersätt de tre `<pre>`-raderna med:

```tsx
            {lesson.status === 'ready' && lesson.transcriptText ? (
              <TranscriptEditor
                lessonId={lesson.id}
                initialText={lesson.transcriptText}
                labels={labels}
              />
            ) : (
```

(`labels` är redan definierad i komponenten som `dict.app.pages.teacher.lessonDetail`.)

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @elevante/web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/app/teacher/TeacherLessonDetail.tsx
git commit -m "feat: rendera TranscriptEditor i lärarens lektionsdetalj"
```

---

### Task 6: Verifiering — build, edge-deploy och manuell test

**Files:** inga (verifiering).

- [ ] **Step 1: Full typecheck + build**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web build`
Expected: typecheck PASS; build genererar alla rutter utan fel.

- [ ] **Step 2: Deploya den uppdaterade edge-funktionen**

Deploya `transcribe-lesson` (idempotent-ändringen från Task 2) till Supabase-projektet `msqfuywpbrteyrzjggsw` — antingen via Supabase MCP `deploy_edge_function` eller `supabase functions deploy transcribe-lesson`.
Expected: funktionen är `ACTIVE` med ny version.

- [ ] **Step 3: Manuell test — redigera + re-index**

Logga in som lärar-demokonto, öppna en lektion med `status='ready'` och transkript. Verifiera:
- Sök: skriv ett ord → träffar markeras, `n/m` uppdateras, ↑/↓ hoppar och scrollar.
- Redigera: ändra en mening → Spara → spinner "Sparar och uppdaterar AI…" → läsläge med uppdaterad text + "sparades"-meddelande.
- Kör i Supabase: `select count(*) from lesson_chunks where lesson_id = '<id>';` → exakt en uppsättning chunks (inga dubbletter), och `select summary from lessons where id='<id>';` → uppdaterad.
- Öppna samma lektion som elev → chatten återspeglar den rättade texten.

- [ ] **Step 4: Manuell test — töm transkript**

Klicka "Töm transkript" → bekräfta i modalen. Verifiera:
- Vyn visar tomt/pending-placeholder.
- `select transcript_text, summary, suggested_questions, concepts, ai_generated_topic, transcript_status from lessons where id='<id>';` → alla null utom `transcript_status='pending'`.
- `select count(*) from lesson_chunks where lesson_id='<id>';` → 0.

- [ ] **Step 5: Behörighetskontroll**

Som elev-konto (eller lärare för annan skola): bekräfta att lektionsdetaljen inte exponerar editorn och att direkta action-anrop returnerar `unauthorized` (RLS + explicit check).

- [ ] **Step 6: Slutcommit av ev. justeringar**

Om manuell test krävde finputs: committa dem med beskrivande meddelanden. Annars klar.

---

## Self-Review

**Spec coverage:**
- Sök inom lektionen → Task 4 (sökfält, `n/m`, ↑/↓, highlight, scroll). ✓
- Redigera + auto-omindexera synkront → Task 3 (`updateTranscript`) + Task 4 (edit-läge). ✓
- Radera båda (inline via textarea + "Töm transkript") → Task 4 (textarea) + Task 3 (`clearTranscript`) + Modal. ✓
- Idempotent edge-funktion → Task 2. ✓
- i18n utan hårdkodade strängar → Task 1. ✓
- Inkoppling i vyn → Task 5. ✓
- QA (typecheck/build/manuell/behörighet) → Task 6. ✓

**Type consistency:** `TranscriptActionResult`, `updateTranscript(lessonId, text)` och `clearTranscript(lessonId)` används identiskt i Task 3 och Task 4. `Labels = Dictionary['app']['pages']['teacher']['lessonDetail']` matchar nycklarna som läggs till i Task 1. `labels`-propen mot `TeacherLessonDetail` matchar `MaterialUploadForm`-mönstret.

**Placeholder scan:** Inga TBD/TODO. All kod fullständig.

**Risk noterad:** `clearTranscript` antar kolumnerna `summary`, `suggested_questions`, `concepts`, `ai_generated_topic` på `lessons` — Task 3 Step 2 verifierar dem mot `database.ts` innan typecheck.
