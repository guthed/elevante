import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

type Props = {
  locale: Locale;
  role: Role;
  dict: Dictionary;
};

// Placeholder-användare tills auth kopplas in i Fas 2.
const mockUsers: Record<Role, { name: string; email: string }> = {
  student: { name: 'Elin Student', email: 'elin@nackagymnasium.se' },
  teacher: { name: 'Tomas Lärare', email: 'tomas@nackagymnasium.se' },
  admin: { name: 'Anders Admin', email: 'anders@nackagymnasium.se' },
};

export function Topbar({ locale, role, dict }: Props) {
  const user = mockUsers[role];
  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-white px-6">
      <div className="flex items-center gap-3">
        <label className="relative hidden md:block">
          <span className="sr-only">{dict.app.topbar.search}</span>
          <input
            type="search"
            placeholder={dict.app.topbar.search}
            className="w-80 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-subtle)] py-2 pl-10 pr-4 text-sm placeholder:text-[var(--color-ink-subtle)] focus:border-[var(--color-accent)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
          <span
            aria-hidden="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-subtle)]"
          >
            ⌕
          </span>
        </label>
        <Badge tone="accent" className="md:hidden">
          {dict.app.roleTitles[role]}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={dict.app.topbar.notifications}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)]"
        >
          <span aria-hidden="true" className="text-base">
            ◉
          </span>
        </button>
        <div className="flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5">
          <Avatar name={user.name} size="sm" />
          <div className="hidden text-left md:block">
            <div className="text-xs font-medium text-[var(--color-primary)]">
              {user.name}
            </div>
            <div className="text-[10px] text-[var(--color-ink-subtle)]">
              {user.email}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
