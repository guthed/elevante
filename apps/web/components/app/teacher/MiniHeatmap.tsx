import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { MiniLessonRow } from '@/lib/data/teacher';

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
                Mest frågor om <strong>{row.topConceptName}</strong> ·{' '}
                {row.topConceptQuestionCount}{' '}
                {row.topConceptQuestionCount === 1 ? 'fråga' : 'frågor'}
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
