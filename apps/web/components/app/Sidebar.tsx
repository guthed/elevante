import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';
import { cn } from '@/components/ui/cn';

type NavItem = { href: string; label: string; icon: string };

function itemsFor(
  role: Role,
  base: string,
  dict: Dictionary,
): NavItem[] {
  if (role === 'student') {
    return [
      { href: `${base}/student`, label: dict.app.sidebar.student.overview, icon: '◎' },
      {
        href: `${base}/student/lektioner`,
        label: dict.app.sidebar.student.lessons,
        icon: '▣',
      },
      {
        href: `${base}/student/chat`,
        label: dict.app.sidebar.student.chat,
        icon: '◐',
      },
      {
        href: `${base}/student/bibliotek`,
        label: dict.app.sidebar.student.library,
        icon: '☰',
      },
    ];
  }
  if (role === 'teacher') {
    return [
      { href: `${base}/teacher`, label: dict.app.sidebar.teacher.overview, icon: '◎' },
      {
        href: `${base}/teacher/klasser`,
        label: dict.app.sidebar.teacher.classes,
        icon: '▣',
      },
      {
        href: `${base}/teacher/lektioner`,
        label: dict.app.sidebar.teacher.lessons,
        icon: '◐',
      },
      {
        href: `${base}/teacher/material`,
        label: dict.app.sidebar.teacher.materials,
        icon: '☰',
      },
    ];
  }
  return [
    { href: `${base}/admin`, label: dict.app.sidebar.admin.overview, icon: '◎' },
    { href: `${base}/admin/skolor`, label: dict.app.sidebar.admin.schools, icon: '▣' },
    {
      href: `${base}/admin/anvandare`,
      label: dict.app.sidebar.admin.users,
      icon: '◐',
    },
    { href: `${base}/admin/schema`, label: dict.app.sidebar.admin.schedule, icon: '☰' },
    {
      href: `${base}/admin/statistik`,
      label: dict.app.sidebar.admin.stats,
      icon: '▲',
    },
  ];
}

type Props = {
  locale: Locale;
  role: Role;
  currentPath: string;
  dict: Dictionary;
};

export function Sidebar({ locale, role, currentPath, dict }: Props) {
  const base = `/${locale}/app`;
  const items = itemsFor(role, base, dict);
  const roleLabel = dict.app.roleTitles[role];

  return (
    <aside
      aria-label={roleLabel}
      className="hidden w-64 flex-col border-r border-[var(--color-border)] bg-white md:flex"
    >
      <div className="border-b border-[var(--color-border)] px-6 py-6">
        <Link
          href={`/${locale}`}
          className="font-serif text-xl text-[var(--color-primary)]"
        >
          Elevante
        </Link>
        <p className="mt-1 text-xs uppercase tracking-widest text-[var(--color-ink-subtle)]">
          {roleLabel}
        </p>
      </div>
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-[var(--color-accent-50)] text-[var(--color-accent-600)]'
                      : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-primary)]',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 items-center justify-center text-base"
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
