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
