import type { ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function PageWrapper({
  title,
  subtitle,
  actions,
  className,
  children,
}: Props) {
  return (
    <div className={cn('mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14', className)}>
      <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[var(--color-primary)] md:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-[var(--color-ink-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </header>
      <div className="mt-10">{children}</div>
    </div>
  );
}
