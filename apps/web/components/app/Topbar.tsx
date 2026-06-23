import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';
import { SchoolBadge } from './SchoolBadge';

type Props = {
  locale: Locale;
  role: Role;
  dict: Dictionary;
  user: {
    fullName: string | null;
    email: string | null;
  } | null;
  schoolName: string | null;
  className: string | null;
};

// Mobil: visar skol-identiteten (sidomenyn är dold < md) + konto-genväg till höger.
// Laptop: dold helt (identiteten finns i sidomenyn) — sidinnehållet börjar högst upp.
// De tidigare placeholder-ikonerna (sök/notiser) är borttagna; global sök byggs senare.
export function Topbar({ locale, role, dict, schoolName, className }: Props) {
  const roleLabel = dict.app.roleTitles[role];
  return (
    <header className="flex h-[60px] items-center justify-between px-5 md:hidden">
      {schoolName ? (
        <SchoolBadge
          schoolName={schoolName}
          roleLabel={roleLabel}
          className={className}
          logoSize={30}
        />
      ) : (
        <Link
          href={`/${locale}`}
          className="font-serif text-[1.25rem] leading-none tracking-tight text-[var(--color-ink)]"
        >
          Elevante
        </Link>
      )}
      <Link
        href={`/${locale}/app/${role}/konto`}
        aria-label={dict.app.account.navLabel}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      </Link>
    </header>
  );
}
