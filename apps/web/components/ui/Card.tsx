import type { ReactNode } from 'react';
import { cn } from './cn';

type CardProps = {
  as?: 'div' | 'article' | 'section';
  padded?: boolean;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
};

export function Card({
  as: Tag = 'div',
  padded = true,
  interactive = false,
  className,
  children,
}: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-[var(--color-border)] bg-white',
        padded && 'p-6 md:p-8',
        interactive &&
          'transition-colors hover:border-[var(--color-accent)] focus-within:border-[var(--color-accent)]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 border-b border-[var(--color-border)] pb-4">{children}</div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-lg text-[var(--color-primary)]">{children}</h3>;
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className="text-[var(--color-ink-muted)]">{children}</div>;
}
