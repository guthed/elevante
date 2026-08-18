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
  const [error, setError] = useState(false);

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

  // Knappen kan inte bära både name="mode" och en function formAction —
  // React kommandeerar "name" på en knapp med function-formAction för att
  // koda vilken action som ska köras, så mode-fältet skrevs aldrig till
  // FormData (och orsakade en hydration-mismatch på köpet). Sätt mode
  // manuellt i FormData istället, en distinkt handler per läge.
  function startWith(mode: 'flashcards' | 'knowledge_checks') {
    return (formData: FormData) => {
      formData.set('mode', mode);
      setError(false);
      startTransition(async () => {
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

        {/* Flashcards — primär väg */}
        <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5">
          <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">Flashcards</h3>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? 'Vänd kort och betygsätt dig själv. Elevante kommer ihåg vad du kunde och tar upp det igen när du håller på att glömma.'
              : 'Flip cards and rate yourself. Elevante remembers what you knew and brings it back just as you start forgetting.'}
          </p>
          <div className="mt-4">
            <Button
              type="submit"
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
