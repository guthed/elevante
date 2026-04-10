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
  children: ReactNode;
};

export function AppShell({ locale, role, currentPath, dict, children }: Props) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg-subtle)]">
      <Sidebar locale={locale} role={role} currentPath={currentPath} dict={dict} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar locale={locale} role={role} dict={dict} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
