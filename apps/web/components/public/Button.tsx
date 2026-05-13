import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'text';
type Size = 'md' | 'lg';

const variantClass: Record<Variant, string> = {
  // Primary = ink pill — Editorial Calm signaturknappen
  primary:
    'bg-[var(--color-ink)] text-[var(--color-canvas)] hover:bg-[#0f1020] focus-visible:ring-[var(--color-ink)]',
  // Secondary = transparent med ink border
  secondary:
    'bg-transparent text-[var(--color-ink)] border border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)] focus-visible:ring-[var(--color-ink)]',
  // Ghost = ivory bg med sand border
  ghost:
    'bg-[var(--color-canvas)] text-[var(--color-ink)] border border-[var(--color-sand)] hover:border-[var(--color-ink-secondary)] focus-visible:ring-[var(--color-ink)]',
  // Text-only med arrow, underline on hover
  text:
    'bg-transparent text-[var(--color-ink)] hover:underline underline-offset-4 focus-visible:ring-[var(--color-ink)]',
};

const sizeClass: Record<Size, string> = {
  md: 'px-5 py-2.5 text-[0.9375rem]',
  lg: 'px-7 py-3.5 text-[1rem]',
};

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-[12px] font-medium transition-all duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]';

const textOnlyBase =
  'inline-flex items-center gap-2 font-medium transition-colors duration-[240ms] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]';

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

function classesFor(variant: Variant, size: Size, extra: string): string {
  const base = variant === 'text' ? textOnlyBase : baseClass;
  const sizing = variant === 'text' ? `text-[${size === 'lg' ? '1rem' : '0.9375rem'}]` : sizeClass[size];
  return `${base} ${variantClass[variant]} ${sizing} ${extra}`
    .replace(/\s+/g, ' ')
    .trim();
}

export function LinkButton({
  href,
  external,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: LinkButtonProps) {
  const classes = classesFor(variant, size, className);
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
  const classes = classesFor(variant, size, className);
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
