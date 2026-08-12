import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { ConfirmClient } from './ConfirmClient';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

// Landningssida för admin-genererade inbjudningslänkar (Auth Admin API).
// Dessa använder implicit flow — access_token/refresh_token i URL-fragmentet,
// som ENDAST klient-JS kan läsa (aldrig serverkod, oavsett route). Se
// ConfirmClient för själva hash-parsningen och setSession()-anropet.
export default async function AuthConfirmPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <ConfirmClient locale={locale} />;
}
