import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const variantClass: Record<Variant, string> = {
  primary:
    'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-600)] focus-visible:ring-[var(--color-accent)]',
  secondary:
    'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-700)] focus-visible:ring-[var(--color-primary)]',
  ghost:
    'bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] focus-visible:ring-[var(--color-primary)]',
  outline:
    'border border-[var(--color-border)] bg-white text-[var(--color-primary)] hover:border-[var(--color-accent)] focus-visible:ring-[var(--color-accent)]',
  danger:
    'bg-[var(--color-error)] text-white hover:bg-red-600 focus-visible:ring-[var(--color-error)]',
};

const sizeClass: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-[0.95rem]',
  lg: 'px-7 py-3.5 text-base',
};

type SharedProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export type ButtonProps = SharedProps & ComponentPropsWithoutRef<'button'>;

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variantClass[variant], sizeClass[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export type LinkButtonProps = SharedProps & {
  href: string;
  external?: boolean;
};

export function LinkButton({
  href,
  external,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: LinkButtonProps) {
  const classes = cn(base, variantClass[variant], sizeClass[size], className);
  if (external) {
    return (
      <a href={href} className={classes} rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
