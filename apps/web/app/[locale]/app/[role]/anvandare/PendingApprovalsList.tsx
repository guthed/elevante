import { Avatar } from '@/components/ui/Avatar';
import type { PendingApprovalRow } from '@/lib/data/admin';
import type { Dictionary } from '@/lib/i18n/types';
import { PendingApprovalForm } from './PendingApprovalForm';

type Props = {
  rows: PendingApprovalRow[];
  labels: Dictionary['app']['pages']['admin']['users'];
};

export function PendingApprovalsList({ rows, labels }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
        {labels.pending.empty}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[20px] bg-[var(--color-surface)]">
      <ul>
        {rows.map((row) => (
          <li
            key={row.id}
            className="grid grid-cols-1 items-center gap-4 border-b border-[var(--color-sand)] px-6 py-4 last:border-b-0 md:grid-cols-12"
          >
            <div className="md:col-span-6">
              <div className="flex items-center gap-3">
                <Avatar name={row.full_name ?? row.email ?? '?'} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[0.9375rem] font-medium text-[var(--color-ink)]">
                    {row.full_name ?? '—'}
                  </p>
                  <p className="truncate text-[0.8125rem] text-[var(--color-ink-muted)]">
                    {row.email ?? '—'}
                  </p>
                </div>
              </div>
            </div>
            <div className="md:col-span-6">
              <PendingApprovalForm userId={row.id} labels={labels} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
