import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole, roles, type Role } from '@/lib/app/roles';
import { AppShell } from '@/components/app/AppShell';

export function generateStaticParams() {
  return roles.map((role) => ({ role }));
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string; role: string }>;
};

export default async function RoleLayout({ children, params }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  const dict = await getDictionary(locale);
  const currentPath = `/${locale}/app/${role}`;
  const typedRole: Role = role;

  return (
    <AppShell
      locale={locale}
      role={typedRole}
      currentPath={currentPath}
      dict={dict}
    >
      {children}
    </AppShell>
  );
}
