import { cn } from './cn';

type Props = {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
};

export function Divider({ orientation = 'horizontal', className, label }: Props) {
  if (orientation === 'vertical') {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={cn('inline-block h-full w-px bg-[var(--color-border)]', className)}
      />
    );
  }
  if (label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={cn(
          'flex items-center gap-4 text-xs uppercase tracking-widest text-[var(--color-ink-subtle)]',
          className,
        )}
      >
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--color-border)]" />
        <span>{label}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--color-border)]" />
      </div>
    );
  }
  return (
    <hr
      role="separator"
      aria-orientation="horizontal"
      className={cn('h-px w-full border-0 bg-[var(--color-border)]', className)}
    />
  );
}
