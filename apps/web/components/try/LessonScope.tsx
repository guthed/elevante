'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { TRY_COPY, tr, type L } from '@/lib/try/copy';

export type LessonChip = { id: string; title: L };

type Props = {
  locale: Locale;
  lessons: LessonChip[];
  selected: string[];
  onChange: (ids: string[]) => void;
};

/**
 * Hopfällbar lektionsväljare ovanför chatten. By default visas bara en kompakt
 * rad ("LEKTIONER · Alla lektioner ▾") så chatt-panelen får äga ytan — chatt-
 * först. Klicka raden för att fälla ut chipsen. "Alla" är standard (frågan går
 * mot alla lektioner); klicka en lektion för att fokusera, klicka fler för att
 * lägga till. Urvalet blir aldrig tomt — avmarkerar man den sista går det
 * tillbaka till "Alla".
 */
export function LessonScope({ locale, lessons, selected, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const allIds = lessons.map((l) => l.id);
  const allSelected = selected.length === lessons.length;

  // Kompakt sammanfattning av aktuellt scope (visas när hopfälld).
  const summary = allSelected
    ? tr(locale, TRY_COPY.scopeAll)
    : selected.length === 1
      ? (() => {
          const idx = lessons.findIndex((l) => l.id === selected[0]);
          const l = lessons[idx];
          return l ? `${tr(locale, TRY_COPY.lessonWord)} ${idx + 1} · ${tr(locale, l.title)}` : '';
        })()
      : tr(locale, TRY_COPY.scopeSelected).replace('{n}', String(selected.length));

  function clickLesson(id: string) {
    if (allSelected) {
      onChange([id]); // fokusera på just denna lektion
      return;
    }
    if (selected.includes(id)) {
      if (selected.length === 1) {
        onChange(allIds); // avmarkerade sista → tillbaka till Alla
        return;
      }
      onChange(selected.filter((x) => x !== id));
    } else {
      const next = [...selected, id];
      onChange(next.length === lessons.length ? allIds : next);
    }
  }

  const chipClass = (active: boolean) =>
    [
      'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[0.8125rem] transition-colors sm:py-1.5',
      active
        ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-canvas)]'
        : 'border-[var(--color-sand)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]',
    ].join(' ');

  return (
    <div className="mb-5">
      {/* Hopfälld rad — kompakt, låter chatten äga ytan tills man vill fokusera. */}
      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="shrink-0 text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
          {tr(locale, TRY_COPY.scopeLabel)}
        </span>
        <span className="truncate text-[0.8125rem] text-[var(--color-ink)]">{summary}</span>
        <svg
          className={`ml-auto h-3.5 w-3.5 shrink-0 text-[var(--color-ink-muted)] transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {expanded ? (
        <div className="mt-3">
          <p className="mb-2 text-[0.8125rem] text-[var(--color-ink-muted)]">
            {tr(locale, TRY_COPY.scopeHint)}
          </p>
          {/* Mobil: horisontellt scrollbar rad. Desktop: radbryter. */}
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => onChange(allIds)}
              aria-pressed={allSelected}
              className={chipClass(allSelected)}
            >
              {tr(locale, TRY_COPY.scopeAll)}
            </button>
            {lessons.map((l, i) => {
              const active = !allSelected && selected.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => clickLesson(l.id)}
                  aria-pressed={active}
                  className={chipClass(active)}
                >
                  {/* Numrerad "Lektion N" så det är uppenbart att varje val är en
                      lektion, inte bara ett ämne. */}
                  <span className="opacity-60">{tr(locale, TRY_COPY.lessonWord)} {i + 1}</span>
                  {' · '}
                  {tr(locale, l.title)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
