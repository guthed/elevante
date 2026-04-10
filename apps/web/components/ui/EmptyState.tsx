import type { ReactNode } from 'react';
import { cn } from './cn';

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, icon, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-8 py-16 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent)]">
          {icon}
        </div>
      ) : null}
      <h2 className="font-serif text-2xl text-[var(--color-primary)]">{title}</h2>
      {description ? (
        <p className="mt-3 max-w-md text-[var(--color-ink-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
