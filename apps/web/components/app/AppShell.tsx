import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

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
  children: ReactNode;
};

export function AppShell({
  locale,
  role,
  dict,
  user,
  schoolName,
  className,
  children,
}: Props) {
  return (
    <div className="flex min-h-screen bg-[var(--color-canvas)]">
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[12px] focus:bg-[var(--color-ink)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-canvas)]"
      >
        {locale === 'sv' ? 'Hoppa till innehåll' : 'Skip to content'}
      </a>
      <Sidebar
        locale={locale}
        role={role}
        dict={dict}
        user={user}
        schoolName={schoolName}
        className={className}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          locale={locale}
          role={role}
          dict={dict}
          user={user}
          schoolName={schoolName}
          className={className}
        />
        <main
          id="app-main"
          className="flex-1 overflow-y-auto animate-page-in pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"
        >
          {children}
        </main>
      </div>
      <MobileNav locale={locale} role={role} dict={dict} />
    </div>
  );
}
