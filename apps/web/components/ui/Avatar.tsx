import { cn } from './cn';

type Size = 'sm' | 'md' | 'lg';

const sizeClass: Record<Size, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

type Props = {
  name: string;
  size?: Size;
  className?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({ name, size = 'md', className }: Props) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex flex-none items-center justify-center rounded-full bg-[var(--color-primary)] font-medium text-white',
        sizeClass[size],
        className,
      )}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
