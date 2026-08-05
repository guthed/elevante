import Image from 'next/image';
import { avatarFor } from '@/lib/avatars';
import { cn } from './cn';

type Size = 'xs' | 'sm' | 'md' | 'lg';

const sizeClass: Record<Size, string> = {
  xs: 'h-6 w-6 text-[0.625rem]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

const sizePx: Record<Size, number> = { xs: 24, sm: 32, md: 40, lg: 56 };

type Props = {
  name: string;
  size?: Size;
  className?: string;
  /** Porträtt-URL. Utelämnas den slås namnet upp i avatar-registret. */
  src?: string | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({ name, size = 'md', className, src }: Props) {
  const photo = src === undefined ? avatarFor(name) : src;

  if (photo) {
    const px = sizePx[size];
    return (
      <Image
        aria-hidden="true"
        src={photo}
        alt=""
        width={px}
        height={px}
        // Porträtten är någon kB styck och står i listor läraren skannar —
        // lazy-load ger blinkande tomma cirklar utan att spara något.
        loading="eager"
        title={name}
        className={cn(
          'flex-none rounded-full object-cover',
          sizeClass[size],
          className,
        )}
      />
    );
  }

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
