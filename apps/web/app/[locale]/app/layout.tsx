import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';

// Hela /app-trädet är auth-skyddat och läser session/profile per request.
// force-dynamic förhindrar att Next.js försöker prerendera dem vid build-tid
// (vilket annars skulle krascha utan Supabase env vars).
export const dynamic = 'force-dynamic';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: `${dict.meta.siteName} — App`,
    robots: { index: false, follow: false },
  };
}

export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  // AppShell renderas inne i respektive rolls layout för att ha tillgång
  // till rollen vid render. Här är layouten transparent och ärver
  // [locale]/layout.tsx-metadata (Header/Footer döljs via CSS i role-layouts).
  return <>{children}</>;
}
