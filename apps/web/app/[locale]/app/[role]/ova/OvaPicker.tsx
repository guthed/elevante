'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { prepareTrainingSession, startTrainingSession } from '@/app/actions/training';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type { TrainingCourse } from '@/lib/data/training';

type Props = {
  locale: Locale;
  courses: TrainingCourse[];
};

// Pollningsintervall för genereringsräknaren, samt hur ofta kringtexten
// roterar. Ett par misslyckade pollningar i rad stänger av pollningen och
// faller tillbaka till en neutral väntetext — hellre det än att hamra på
// ett endpoint som redan visat sig svara fel.
const PROGRESS_POLL_MS = 2000;
const PROGRESS_COPY_MS = 4000;
const MAX_CONSECUTIVE_POLL_FAILURES = 2;

// Tak för hur länge KLIENTEN väntar in backfillen innan den ger upp och
// startar sessionen ändå (byggd av det underlag som råkar finnas då — se
// startTrainingSessions egna { ok: false }-felväg om det blir noll). Det här
// är skilt från serverns maxDuration (app/[locale]/app/[role]/ova/page.tsx):
// den styr hur länge Vercel låter after()-jobbet fortsätta köra bakom
// kulisserna, den här styr bara hur länge EN elevs webbläsare sitter och
// pollar innan den slutar vänta och går vidare — generering fortsätter
// oavsett i bakgrunden, en senare session av samma urval blir snabb.
//
// Uppmätt 2026-08-18: ~70 s för en lektion, ~90-100 s för två parallellt.
// MAX_BACKFILL_PER_REQUEST (lib/data/training.ts) tillåter upp till 5
// parallellt i en request — ingen mätning finns för det fallet, så 150 s ger
// ~50-80 s marginal över det värsta uppmätta (100 s) för ökad kontention/
// rate-limit-backoff vid högre parallellitet, utan att en elev riskerar
// sitta och vänta orimligt länge om något faktiskt hänger sig.
const READY_WAIT_CEILING_MS = 150_000;

// Kringtexten beskriver vad pipelinen faktiskt gör (lyssna → hitta begrepp →
// skriva kort) — sann text, inte fyllnadsord. Se app/actions/training.ts och
// lib/data/training.ts för själva genereringen.
const PROGRESS_COPY: Record<Locale, string[]> = {
  sv: [
    'Lyssnar igenom lektionen igen…',
    'Letar efter begreppen som faktiskt togs upp…',
    'Plockar fram lärarens egna exempel…',
    'Funderar på vad som brukar blandas ihop…',
    'Skriver korten…',
    'Vänder på dem en sista gång…',
  ],
  en: [
    'Listening through the lesson again…',
    'Looking for the concepts that actually came up…',
    "Picking out the teacher's own examples…",
    'Thinking about what tends to get mixed up…',
    'Writing the cards…',
    'Turning them over one last time…',
  ],
};

type Progress = { ready: number; total: number };

export function OvaPicker({ locale, courses }: Props) {
  const sv = locale === 'sv';
  const [pending, startTransition] = useTransition();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState(false);

  // Lektionsurvalet vid starttillfället — fryst separat från `selected` så
  // att pollningen frågar om exakt de lektioner som skickades in, oavsett om
  // användaren hinner ändra kryssrutorna medan sessionen förbereds.
  //
  // Detta är en ref, inte state: en submit-knapps formAction körs av React
  // som en Action, och en vanlig setState-anrop däri hamnar i samma
  // (icke-brådskande) uppdatering som transitionens egen pending-flagga —
  // uppmätt i praktiken landar de i OLIKA renders, där `pending` hinner bli
  // sant och sedan falskt igen (hela anropet är snabbt) INNAN
  // lektions-id:na någonsin syns i en render pollningseffekten kan agera på.
  // En ref sätts synkront, samma tick som knapptrycket, och är alltid
  // korrekt när effekten nedan faktiskt kör.
  const activeLessonIdsRef = useRef<string[] | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [copyIndex, setCopyIndex] = useState(0);
  // true så snart en pollning visat att inget behöver genereras (ready===total
  // redan vid första svaret) — håller kvar det valet resten av väntan så
  // räknaren aldrig blinkar fram och sedan försvinner.
  const skipCounterRef = useRef(false);
  const fixedTotalRef = useRef<number | null>(null);

  const isGenerating = progress !== null && !skipCounterRef.current;

  // Pollar /api/training/progress medan startTrainingSession() kör i
  // bakgrunden. `total` fångas ur det FÖRSTA lyckade svaret och hålls fast —
  // räknar man om det på varje pollning krymper "missing" i takt med att
  // "ready" växer, vilket får nämnaren att krypa uppåt tillsammans med
  // täljaren och aldrig visa en stabil siffra.
  useEffect(() => {
    const lessonIds = activeLessonIdsRef.current;
    if (!pending || !lessonIds || lessonIds.length === 0) return;

    let cancelled = false;
    let consecutiveFailures = 0;

    async function poll() {
      try {
        const res = await fetch('/api/training/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonIds }),
        });
        if (!res.ok) throw new Error('progress poll failed');
        const data = (await res.json()) as Progress;
        if (cancelled) return;
        consecutiveFailures = 0;
        if (fixedTotalRef.current === null) {
          fixedTotalRef.current = data.total;
          if (data.ready >= data.total) skipCounterRef.current = true;
        }
        setProgress({ ready: data.ready, total: fixedTotalRef.current });
      } catch {
        if (cancelled) return;
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          clearInterval(intervalId);
          setProgress(null);
        }
      }
    }

    poll();
    const intervalId = setInterval(poll, PROGRESS_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
    // activeLessonIdsRef.current med avsikt utanför dependency-arrayen — det
    // är en ref, ändringar i den triggar inte om körningen (och lint-regeln
    // kräver den inte). Effekten ska bara reagera på `pending`; refens värde
    // läses en gång när effekten kör.
  }, [pending]);

  // Roterar kringtexten var 4:e sekund, bara medan räknaren faktiskt visas.
  useEffect(() => {
    if (!pending || !isGenerating) {
      setCopyIndex(0);
      return;
    }
    const id = setInterval(() => {
      setCopyIndex((i) => (i + 1) % PROGRESS_COPY[locale].length);
    }, PROGRESS_COPY_MS);
    return () => clearInterval(id);
  }, [pending, isGenerating, locale]);

  // Städa upp när transitionen är klar (framgång eller fel) så nästa
  // starttryck börjar från ett rent tillstånd.
  useEffect(() => {
    if (pending) return;
    activeLessonIdsRef.current = null;
    setProgress(null);
    fixedTotalRef.current = null;
    skipCounterRef.current = false;
  }, [pending]);

  const course = useMemo(
    () => courses.find((c) => c.id === courseId) ?? courses[0],
    [courses, courseId],
  );

  const lessons = course?.lessons ?? [];
  const allSelected = lessons.length > 0 && lessons.every((l) => selected.has(l.id));

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

  const selectedCount = lessons.filter((l) => selected.has(l.id)).length;
  const canStart = selectedCount > 0 && !pending;

  // Väntar in att backfillen (schemalagd av prepareTrainingSession via
  // after(), se app/actions/training.ts) landar i training_materials, genom
  // att fråga SAMMA /api/training/progress-endpoint som visningseffekten
  // nedan pollar för räknaren. Två oberoende pollningsloopar mot samma
  // billiga, read-only endpoint — en för UI:t, en för att veta NÄR
  // startTrainingSession ska anropas — medvetet separerade så att den här
  // väntan aldrig behöver rota i visningseffektens finjusterade
  // frozen-total/skip-räknare-logik. READY_WAIT_CEILING_MS sätter taket.
  async function waitForBackfill(lessonIds: string[]): Promise<void> {
    const deadline = Date.now() + READY_WAIT_CEILING_MS;
    while (Date.now() < deadline) {
      try {
        const res = await fetch('/api/training/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonIds }),
        });
        if (res.ok) {
          const data = (await res.json()) as Progress;
          if (data.ready >= data.total) return;
        }
      } catch {
        // Enstaka nätverksfel ignoreras — försök igen nästa varv. Taket
        // ovan garanterar att vi ändå aldrig väntar för evigt.
      }
      await new Promise((resolve) => setTimeout(resolve, PROGRESS_POLL_MS));
    }
  }

  // Knappen kan inte bära både name="mode" och en function formAction —
  // React kommandeerar "name" på en knapp med function-formAction för att
  // koda vilken action som ska köras, så mode-fältet skrevs aldrig till
  // FormData (och orsakade en hydration-mismatch på köpet). Sätt mode
  // manuellt i FormData istället, en distinkt handler per läge.
  function startWith(mode: 'flashcards' | 'knowledge_checks') {
    return (formData: FormData) => {
      formData.set('mode', mode);
      setError(false);
      // Fångar exakt de lektions-id:n som faktiskt skickas in (samma
      // hidden-inputs som formuläret postar) — det är vad pollningen ska
      // fråga om, oavsett om användaren hinner ändra kryssrutorna medan
      // sessionen förbereds. Sätts synkront i en ref (se motivering ovan).
      const lessonIds = formData.getAll('lesson_ids').map((v) => v.toString());
      activeLessonIdsRef.current = lessonIds;
      startTransition(async () => {
        // Fas 1: avgör om något underlag saknas och, om så, schemalägger
        // backfillen (körs bakom kulisserna, se prepareTrainingSession).
        // Redan klart för alla valda lektioner → { ready: true } och vi går
        // rakt till fas 2 utan att progress-UI:t någonsin blinkar till.
        const prep = await prepareTrainingSession(formData);
        if (!prep.ready) {
          await waitForBackfill(lessonIds);
        }
        // Fas 2: bygg sessionen av vad som finns nu (klart, eller taket
        // nått med delvis/inget underlag — { ok: false }-felvägen fångar
        // det sistnämnda).
        const result = await startTrainingSession(formData);
        if (!result.ok) setError(true);
      });
    };
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
          <p className="eyebrow">
            {sv ? '2 · Välj lektioner' : '2 · Pick lessons'}
          </p>
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

      {/* Steg 3 — hur vill du träna */}
      <div>
        <p className="eyebrow mb-3">
          {sv ? '3 · Hur vill du träna?' : '3 · How do you want to practise?'}
        </p>

        {/* Båda vägarna sida vid sida från sm och uppåt — staplade föll
            Kunskapskoll under vikbrytningen, så eleven såg bara flashcards
            utan att scrolla. Flashcards behåller sin fyllda yta och sin
            primära knapp: sidoställningen tar bort rangordningen i höjdled,
            inte den visuella. */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Flashcards — primär väg */}
          <div className="flex flex-col rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-4 lg:p-5">
            <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">Flashcards</h3>
            <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Vänd kort och betygsätt dig själv. Elevante kommer ihåg vad du kunde och tar upp det igen när du håller på att glömma.'
                : 'Flip cards and rate yourself. Elevante remembers what you knew and brings it back just as you start forgetting.'}
            </p>
            <div className="mt-3 sm:mt-auto sm:pt-1">
              <Button
                type="submit"
                className="w-full"
                formAction={startWith('flashcards')}
                disabled={!canStart}
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

          {/* Kunskapskoll — sekundär väg */}
          <div className="flex flex-col rounded-[16px] border border-[var(--color-sand)] p-4 lg:p-5">
            <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
              {sv ? 'Kunskapskoll' : 'Knowledge check'}
            </h3>
            <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Korta flervalsfrågor med svar direkt. Du ser på en gång vad du kan och vad du behöver läsa om.'
                : 'Short multiple-choice questions with instant answers. You see right away what you know and what needs another pass.'}
            </p>
            <div className="mt-3 sm:mt-auto sm:pt-1">
              <Button
                type="submit"
                variant="secondary"
                className="w-full"
                formAction={startWith('knowledge_checks')}
                disabled={!canStart}
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
        </div>

        {pending ? (
          <div className="mt-4">
            {isGenerating && progress ? (
              <>
                <p className="text-[0.8125rem] text-[var(--color-ink-secondary)] tabular-nums">
                  {sv
                    ? `${progress.ready} av ${progress.total} lektioner klara`
                    : `${progress.ready} of ${progress.total} lessons ready`}
                </p>
                <div
                  role="progressbar"
                  aria-valuenow={progress.ready}
                  aria-valuemin={0}
                  aria-valuemax={progress.total}
                  className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--color-sand)]"
                >
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300 ease-out"
                    style={{
                      width: `${progress.total > 0 ? (progress.ready / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p aria-live="polite" className="mt-2 text-[0.8125rem] text-[var(--color-ink-muted)]">
                  {PROGRESS_COPY[locale][copyIndex]}
                </p>
              </>
            ) : (
              <p aria-live="polite" className="text-[0.8125rem] text-[var(--color-ink-muted)]">
                {sv ? 'Förbereder träningen…' : 'Preparing your session…'}
              </p>
            )}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 text-[0.8125rem] text-[var(--color-error)]">
            {sv
              ? 'Kunde inte starta träningen. Försök igen.'
              : 'Could not start the session. Try again.'}
          </p>
        ) : null}

        {selectedCount === 0 ? (
          <p className="mt-3 text-[0.8125rem] text-[var(--color-ink-muted)]">
            {sv ? 'Välj minst en lektion ovan.' : 'Pick at least one lesson above.'}
          </p>
        ) : null}
      </div>
    </form>
  );
}
