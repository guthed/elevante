import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole, type Role } from '@/lib/app/roles';
import { AppShell } from '@/components/app/AppShell';
import { getCurrentProfile } from '@/lib/supabase/server';

// Layouten är helt dynamisk — den läser session och profil per request.
// Vi har INGEN generateStaticParams här eftersom Next.js annars försöker
// prerendera /sv/app/student, /sv/app/teacher, /sv/app/admin vid byggtid,
// vilket kraschar utan Supabase env vars.

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string; role: string }>;
};

export default async function RoleLayout({ children, params }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  // Om man navigerar till "fel" role-segment (t.ex. admin trycker
  // /app/student manuellt) så skickar vi tillbaka dem till sin
  // riktiga roll. Hårdkodad säkerhet utöver RLS.
  if (profile.role !== role) {
    redirect(`/${locale}/app/${profile.role}`);
  }

  const dict = await getDictionary(locale);
  const typedRole: Role = role;

  return (
    <AppShell
      locale={locale}
      role={typedRole}
      dict={dict}
      user={{ fullName: profile.full_name, email: profile.email }}
    >
      {children}
    </AppShell>
  );
}
