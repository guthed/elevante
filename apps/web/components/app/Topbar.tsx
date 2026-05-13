import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';

type Props = {
  locale: Locale;
  role: Role;
  dict: Dictionary;
  user: {
    fullName: string | null;
    email: string | null;
  } | null;
};

// Editorial Calm — minimal topbar.
// User-info + sign-out har flyttats till Sidebar bottom.
// Här kvar: notifikationer + (placeholder) global sök.

export function Topbar({ dict }: Props) {
  return (
    <header className="flex h-14 items-center justify-end gap-2 px-6">
      <button
        type="button"
        aria-label={dict.app.topbar.search}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={dict.app.topbar.notifications}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </button>
    </header>
  );
}
