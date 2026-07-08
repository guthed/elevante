'use client';

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
 * Kompakt lektionsväljare ovanför chatten. "Alla" är standard (frågan går mot
 * alla lektioner); klicka en lektion för att fokusera på den, klicka fler för
 * att lägga till. Urvalet blir aldrig tomt — avmarkerar man den sista går det
 * tillbaka till "Alla".
 */
export function LessonScope({ locale, lessons, selected, onChange }: Props) {
  const allIds = lessons.map((l) => l.id);
  const allSelected = selected.length === lessons.length;

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
      'rounded-full border px-3 py-1.5 text-[0.8125rem] transition-colors',
      active
        ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-canvas)]'
        : 'border-[var(--color-sand)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]',
    ].join(' ');

  return (
    <div className="mb-6">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
          {tr(locale, TRY_COPY.scopeLabel)}
        </span>
        <span className="text-[0.8125rem] text-[var(--color-ink-muted)]">
          {tr(locale, TRY_COPY.scopeHint)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(allIds)}
          aria-pressed={allSelected}
          className={chipClass(allSelected)}
        >
          {tr(locale, TRY_COPY.scopeAll)}
        </button>
        {lessons.map((l) => {
          const active = !allSelected && selected.includes(l.id);
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => clickLesson(l.id)}
              aria-pressed={active}
              className={chipClass(active)}
            >
              {tr(locale, l.title)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
