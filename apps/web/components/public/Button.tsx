import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

const variantClass: Record<Variant, string> = {
  primary:
    'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-600)] focus-visible:ring-[var(--color-accent)]',
  secondary:
    'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-700)] focus-visible:ring-[var(--color-primary)]',
  ghost:
    'bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] focus-visible:ring-[var(--color-primary)]',
};

const sizeClass: Record<Size, string> = {
  md: 'px-5 py-2.5 text-[0.95rem]',
  lg: 'px-7 py-3.5 text-[1rem]',
};

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

type BaseProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

type LinkButtonProps = BaseProps & {
  href: string;
  external?: boolean;
};

type ButtonProps = BaseProps & ComponentPropsWithoutRef<'button'>;

export function LinkButton({
  href,
  external,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: LinkButtonProps) {
  const classes = `${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${className}`.trim();
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

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const classes = `${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${className}`.trim();
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
