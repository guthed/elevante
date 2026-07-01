'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';
import { navItemsFor, type NavId } from '@/lib/app/nav';

// Stroke-ikoner i linje med befintlig Topbar-stil (1.5 stroke, 20x20).
const I = (path: ReactNode): ReactNode => (
  <svg
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
    {path}
  </svg>
);

const ICONS: Record<NavId, ReactNode> = {
  overview: I(<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>),
  library: I(<><path d="M4 5h12v15H4z" /><path d="M16 5h4v15h-4" /></>),
  chat: I(<path d="M21 12a8 8 0 0 1-11 7L3 21l2-7a8 8 0 1 1 16-2z" />),
  examPrep: I(<><path d="M4 4h16v14H7l-3 3z" /></>),
  learnerProfile: I(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  classes: I(<><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /></>),
  lessons: I(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>),
  sharedTests: I(<><path d="M9 11l3 3 8-8" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>),
  classTests: I(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 9h6M9 13h4" /><path d="M14 17l2 2 4-4" /></>),
  schools: I(<><path d="M3 21h18" /><path d="M5 21V8l7-4 7 4v13" /><path d="M10 21v-5h4v5" /></>),
  users: I(<><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /></>),
  schedule: I(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>),
  stats: I(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>),
  prospects: I(<><path d="M21 12a8 8 0 0 1-11 7L3 21l2-7a8 8 0 1 1 16-2z" /></>),
  crm: I(<><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>),
};

type Props = {
  locale: Locale;
  role: Role;
  dict: Dictionary;
};

export function MobileNav({ locale, role, dict }: Props) {
  const pathname = usePathname();
  const base = `/${locale}/app`;
  const items = navItemsFor(role, base, dict);
  const overviewHref = `${base}/${role}`;

  // Fokusläge: dölj nav i aktiv chatt-tråd så meddelandefältet kan sitta längst ned.
  const isChatThread = /\/app\/student\/chat\/[^/]+$/.test(pathname);
  if (isChatThread) return null;

  return (
    <nav
      aria-label={dict.app.roleTitles[role]}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-sand)] bg-[var(--color-canvas)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      {items.map((item) => {
        const isOverview = item.href === overviewHref;
        const isActive = isOverview
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.625rem] transition-colors',
              isActive
                ? 'text-[var(--color-ink)]'
                : 'text-[var(--color-ink-muted)]',
            ].join(' ')}
          >
            <span
              aria-hidden="true"
              className={isActive ? 'text-[var(--color-accent)]' : undefined}
            >
              {ICONS[item.id]}
            </span>
            <span className="leading-none">{item.mobileLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
