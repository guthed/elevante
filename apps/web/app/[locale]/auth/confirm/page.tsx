import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { ConfirmClient } from './ConfirmClient';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

function ConfirmFallback({ sv }: { sv: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-[0.9375rem] text-[var(--color-ink-secondary)]">
          {sv ? 'Loggar in…' : 'Signing in…'}
        </p>
      </div>
    </div>
  );
}

// Landningssida för admin-genererade inbjudningslänkar (Auth Admin API).
// Dessa använder implicit flow — access_token/refresh_token i URL-fragmentet,
// som ENDAST klient-JS kan läsa (aldrig serverkod, oavsett route). Se
// ConfirmClient för själva hash-parsningen och setSession()-anropet.
//
// ConfirmClient läser useSearchParams(), som Next kräver en Suspense-gräns
// runt vid statisk export/produktionsbygge — annars: "useSearchParams()
// should be wrapped in a suspense boundary" och hela sidan faller ur bygget.
// Dev-läge tolererar det tyst, vilket dolde buggen tills första prod-bygget.
export default async function AuthConfirmPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <Suspense fallback={<ConfirmFallback sv={locale === 'sv'} />}>
      <ConfirmClient locale={locale} />
    </Suspense>
  );
}
