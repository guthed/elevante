import { cn } from './cn';

type Size = 'sm' | 'md' | 'lg';

const sizeClass: Record<Size, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

type Props = {
  size?: Size;
  label?: string;
  className?: string;
};

export function Spinner({ size = 'md', label, className }: Props) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-[var(--color-border)] border-t-[var(--color-accent)]',
        sizeClass[size],
        className,
      )}
    />
  );
}
