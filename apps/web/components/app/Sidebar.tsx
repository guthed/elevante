import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';
import { Avatar } from '@/components/ui/Avatar';
import { signOut } from '@/app/actions/auth';
import { SidebarNav } from './SidebarNav';

type NavItem = { href: string; label: string };

function itemsFor(role: Role, base: string, dict: Dictionary): NavItem[] {
  if (role === 'student') {
    return [
      { href: `${base}/student`, label: dict.app.sidebar.student.overview },
      { href: `${base}/student/bibliotek`, label: dict.app.sidebar.student.library },
      { href: `${base}/student/chat`, label: dict.app.sidebar.student.chat },
    ];
  }
  if (role === 'teacher') {
    return [
      { href: `${base}/teacher`, label: dict.app.sidebar.teacher.overview },
      { href: `${base}/teacher/klasser`, label: dict.app.sidebar.teacher.classes },
      { href: `${base}/teacher/lektioner`, label: dict.app.sidebar.teacher.lessons },
    ];
  }
  return [
    { href: `${base}/admin`, label: dict.app.sidebar.admin.overview },
    { href: `${base}/admin/skolor`, label: dict.app.sidebar.admin.schools },
    { href: `${base}/admin/anvandare`, label: dict.app.sidebar.admin.users },
    { href: `${base}/admin/schema`, label: dict.app.sidebar.admin.schedule },
    { href: `${base}/admin/statistik`, label: dict.app.sidebar.admin.stats },
  ];
}

function roleSubtitle(role: Role, locale: Locale): string {
  if (locale === 'sv') {
    if (role === 'student') return 'AI Studiekompis';
    if (role === 'teacher') return 'För lärare';
    return 'Admin';
  }
  if (role === 'student') return 'AI study companion';
  if (role === 'teacher') return 'For teachers';
  return 'Admin';
}

type Props = {
  locale: Locale;
  role: Role;
  dict: Dictionary;
  user: {
    fullName: string | null;
    email: string | null;
  } | null;
};

export function Sidebar({ locale, role, dict, user }: Props) {
  const base = `/${locale}/app`;
  const items = itemsFor(role, base, dict);
  const overviewHref = `${base}/${role}`;
  const roleLabel = dict.app.roleTitles[role];
  const displayName = user?.fullName ?? user?.email ?? roleLabel;

  const signOutWithLocale = async () => {
    'use server';
    await signOut(locale);
  };

  return (
    <aside
      aria-label={roleLabel}
      className="hidden w-60 shrink-0 flex-col bg-[var(--color-canvas)] md:flex"
    >
      {/* Brand */}
      <div className="px-6 pt-7 pb-8">
        <Link
          href={`/${locale}`}
          className="block font-serif text-[1.5rem] leading-none tracking-tight text-[var(--color-ink)]"
        >
          Elevante
        </Link>
        <p className="mt-1.5 text-[0.75rem] text-[var(--color-ink-muted)]">
          {roleSubtitle(role, locale)}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        <SidebarNav items={items} overviewHref={overviewHref} />
      </nav>

      {/* User row */}
      <div className="border-t border-[var(--color-sand)]/60 px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={displayName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.875rem] font-medium text-[var(--color-ink)]">
              {displayName}
            </p>
            <p className="truncate text-[0.75rem] text-[var(--color-ink-muted)]">
              {roleLabel}
            </p>
          </div>
          <form action={signOutWithLocale}>
            <button
              type="submit"
              aria-label={dict.auth.signOut}
              title={dict.auth.signOut}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
