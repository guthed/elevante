'use client';

import type { Locale } from '@/lib/i18n/config';
import { TRY_COPY, tr, type L } from '@/lib/try/copy';

// Lättviktig lektionsvy till klienten (ingen transkripttext skickas hit).
export type LessonCard = { id: string; title: L; summary: L; concepts: string[] };

type Props = {
  locale: Locale;
  lessons: LessonCard[];
  selected: string[];
  onToggle: (id: string) => void;
  onContinue: () => void;
};

export function LessonPicker({ locale, lessons, selected, onToggle, onContinue }: Props) {
  return (
    <div>
      <h2 className="font-serif text-[clamp(1.5rem,2vw+1rem,2rem)] leading-tight text-[var(--color-ink)]">
        {tr(locale, TRY_COPY.pickTitle)}
      </h2>
      <p className="mt-2 text-[0.9375rem] text-[var(--color-ink-secondary)]">
        {tr(locale, TRY_COPY.pickHint)}
      </p>
      {locale === 'en' ? (
        <p className="mt-1 text-[0.8125rem] italic text-[var(--color-ink-muted)]">
          {tr(locale, TRY_COPY.swedishNote)}
        </p>
      ) : null}

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {lessons.map((l) => {
          const on = selected.includes(l.id);
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onToggle(l.id)}
                aria-pressed={on}
                className={[
                  'w-full rounded-[16px] border p-5 text-left transition-colors',
                  on
                    ? 'border-[var(--color-ink)] bg-[var(--color-surface)]'
                    : 'border-[var(--color-sand)] hover:border-[var(--color-ink-muted)]',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-[1.125rem] leading-snug text-[var(--color-ink)]">
                    {tr(locale, l.title)}
                  </h3>
                  <span
                    aria-hidden
                    className={[
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.75rem]',
                      on
                        ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-canvas)]'
                        : 'border-[var(--color-ink-muted)] text-transparent',
                    ].join(' ')}
                  >
                    ✓
                  </span>
                </div>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {tr(locale, l.summary)}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-[0.9375rem] text-[var(--color-canvas)] transition-opacity disabled:opacity-40"
        >
          {tr(locale, TRY_COPY.continue)} →
        </button>
        <span className="text-[0.8125rem] text-[var(--color-ink-muted)]">
          {selected.length} {tr(locale, TRY_COPY.selectedCount)}
        </span>
      </div>
    </div>
  );
}
