import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

type Props = {
  locale: Locale;
  role: Role;
  currentPath: string;
  dict: Dictionary;
  user: {
    fullName: string | null;
    email: string | null;
  } | null;
  children: ReactNode;
};

export function AppShell({
  locale,
  role,
  currentPath,
  dict,
  user,
  children,
}: Props) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg-subtle)]">
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        {locale === 'sv' ? 'Hoppa till innehåll' : 'Skip to content'}
      </a>
      <Sidebar locale={locale} role={role} currentPath={currentPath} dict={dict} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar locale={locale} role={role} dict={dict} user={user} />
        <main id="app-main" className="flex-1 overflow-y-auto animate-page-in">
          {children}
        </main>
      </div>
    </div>
  );
}
