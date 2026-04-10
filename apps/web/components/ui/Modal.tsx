'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from './cn';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, children, footer, className }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={cn(
        'rounded-2xl border border-[var(--color-border)] bg-white p-0 shadow-2xl backdrop:bg-[var(--color-primary)]/40 backdrop:backdrop-blur-sm',
        'open:flex open:flex-col max-w-lg w-full',
        className,
      )}
    >
      <header className="flex items-start justify-between border-b border-[var(--color-border)] px-6 py-5">
        <h2 className="font-serif text-xl text-[var(--color-primary)]">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-2xl leading-none text-[var(--color-ink-subtle)] hover:text-[var(--color-primary)]"
          aria-label="Close"
        >
          ×
        </button>
      </header>
      <div className="px-6 py-5">{children}</div>
      {footer ? (
        <footer className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4">
          {footer}
        </footer>
      ) : null}
    </dialog>
  );
}
