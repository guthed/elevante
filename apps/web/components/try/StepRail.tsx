'use client';

import type { Locale } from '@/lib/i18n/config';
import { TRY_COPY, tr } from '@/lib/try/copy';

type Props = {
  locale: Locale;
  current: 1 | 2 | 3;
  maxReached: 1 | 2 | 3;
  onGo: (step: 1 | 2 | 3) => void;
};

export function StepRail({ locale, current, maxReached, onGo }: Props) {
  const steps: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: tr(locale, TRY_COPY.step1) },
    { n: 2, label: tr(locale, TRY_COPY.step2) },
    { n: 3, label: tr(locale, TRY_COPY.step3) },
  ];

  // Prov-steget (③) visas inte förrän det låsts upp — resan ser ut som
  // "① Välj lektioner → ② Ställ frågor" till dess, så inget prov hägrar över
  // förstagångsbesökaren. Steg ① och ② visas alltid (de berättar att man ska
  // ställa frågor). När eleven chattat dyker ③ upp som en bonus.
  const visibleSteps = steps.filter((s) => s.n <= Math.max(2, maxReached));

  return (
    <nav aria-label={locale === 'en' ? 'Progress' : 'Framsteg'} className="mb-10">
      <ol className="flex items-center gap-2 md:gap-4">
        {visibleSteps.map((s, i) => {
          const active = s.n === current;
          const reachable = s.n <= maxReached;
          return (
            <li key={s.n} className="flex flex-1 items-center gap-2 md:gap-4">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onGo(s.n)}
                aria-current={active ? 'step' : undefined}
                className={[
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.8125rem] transition-colors',
                  active
                    ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
                    : reachable
                      ? 'text-[var(--color-ink)] hover:bg-[var(--color-surface)]'
                      : 'text-[var(--color-ink-muted)] cursor-not-allowed',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-5 w-5 items-center justify-center rounded-full text-[0.6875rem] tabular-nums',
                    active
                      ? 'bg-[var(--color-canvas)] text-[var(--color-ink)]'
                      : 'bg-[var(--color-sand)] text-[var(--color-ink-secondary)]',
                  ].join(' ')}
                >
                  {s.n}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < visibleSteps.length - 1 ? (
                <span className="h-px flex-1 bg-[var(--color-sand)]" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
