import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { FeedbackProvider } from './feedback/FeedbackProvider';

type Props = {
  locale: Locale;
  role: Role;
  dict: Dictionary;
  user: {
    fullName: string | null;
    email: string | null;
    avatarUrl: string | null;
  } | null;
  schoolName: string | null;
  className: string | null;
  isStaff: boolean;
  children: ReactNode;
};

export function AppShell({
  locale,
  role,
  dict,
  user,
  schoolName,
  className,
  isStaff,
  children,
}: Props) {
  // Rapporteringen är elevernas väg in — lärare har sitt Notion-formulär, och
  // feedback_reports.student_id vore en lögn för en lärarrad. Providern
  // renderas därför bara för elever; FeedbackButton returnerar null utan den,
  // så app-chrome kan innehålla knappen oavsett roll.
  const shell = (
    <div className="flex h-screen overflow-hidden bg-[var(--color-canvas)]">
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
        isStaff={isStaff}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
          className="min-h-0 flex-1 overflow-y-auto animate-page-in pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"
        >
          {children}
        </main>
      </div>
      <MobileNav locale={locale} role={role} dict={dict} isStaff={isStaff} />
    </div>
  );

  if (role !== 'student') return shell;
  return (
    <FeedbackProvider locale={locale} role={role}>
      {shell}
    </FeedbackProvider>
  );
}
