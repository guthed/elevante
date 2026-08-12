'use client';

import { useId, type ReactNode } from 'react';

type Props = {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
};

// Ren CSS-driven tooltip (hover + focus-within, ingen JS-positionering)
// — visas vid hover över ikonen/elementet och vid tangentbordsfokus, så
// den fungerar för användare som inte drar musen.
export function Tooltip({ label, children, side = 'top', className }: Props) {
  const id = useId();
  const positionClass =
    side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <span
      className={`group/tooltip relative inline-flex ${className ?? ''}`}
      aria-describedby={id}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-20 w-max max-w-[220px] -translate-x-1/2 rounded-[8px] bg-[var(--color-ink)] px-2.5 py-1.5 text-center text-[0.75rem] leading-snug text-[var(--color-canvas)] opacity-0 shadow-[0_4px_16px_-4px_rgba(26,26,46,0.3)] transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 ${positionClass}`}
      >
        {label}
      </span>
    </span>
  );
}

// Liten "?"-ikon med tooltip — för att förklara ett fält eller begrepp
// utan att bygga in det i själva labeln (för icke-tekniska användare).
export function HelpHint({ label }: { label: string }) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--color-ink-subtle)] text-[0.625rem] font-medium leading-none text-[var(--color-ink-subtle)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
        aria-label={label}
      >
        ?
      </button>
    </Tooltip>
  );
}
