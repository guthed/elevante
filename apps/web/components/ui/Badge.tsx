import type { ReactNode } from 'react';
import { cn } from './cn';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'error';

const toneClass: Record<Tone, string> = {
  neutral: 'bg-[var(--color-bg-muted)] text-[var(--color-primary)]',
  accent: 'bg-[var(--color-accent-50)] text-[var(--color-accent-600)]',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-700',
};

type Props = {
  tone?: Tone;
  className?: string;
  children: ReactNode;
};

export function Badge({ tone = 'neutral', className, children }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
