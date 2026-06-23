import Link from 'next/link';
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

// Mobil: visar varumärket (sidomenyn är dold < md).
// Laptop: dold helt (varumärket finns i sidomenyn) — sidinnehållet börjar högst upp.
// De tidigare placeholder-ikonerna (sök/notiser) är borttagna; global sök byggs senare.
export function Topbar({ locale }: Props) {
  return (
    <header className="flex h-[52px] items-center px-5 md:hidden">
      <Link
        href={`/${locale}`}
        className="font-serif text-[1.25rem] leading-none tracking-tight text-[var(--color-ink)]"
      >
        Elevante
      </Link>
    </header>
  );
}
