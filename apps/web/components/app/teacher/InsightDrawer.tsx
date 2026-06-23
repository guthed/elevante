'use client';

import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
};

export function InsightDrawer({ open, onClose, children, title }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-[var(--color-ink)]/30 transition-opacity duration-150 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Insikt'}
        // Mobil: bottom-sheet (glider upp). Laptop: höger-panel.
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[88vh] w-full transform overflow-y-auto rounded-t-[20px] bg-[var(--color-canvas)] shadow-xl transition-transform duration-200 md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:max-w-md md:rounded-none ${
          open
            ? 'translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-y-0 md:translate-x-full'
        }`}
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--color-sand)] md:hidden"
        />
        {children}
      </aside>
    </>
  );
}
