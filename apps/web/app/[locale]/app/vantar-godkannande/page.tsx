import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getCurrentProfile } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: `${dict.auth.pendingApproval.title} — ${dict.meta.siteName}`,
    robots: { index: false, follow: false },
  };
}

// Standalone-sida (inget AppShell/Sidebar — se /app/layout.tsx) för konton
// vars profil ännu inte är 'active'. Landas hit centralt från /app/page.tsx.
// Rent informativ dead-end: förklarar väntan och ger en väg ut (logga ut).
export default async function PendingApprovalPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const profile = await getCurrentProfile();
  // Proxy skyddar redan /app/*, men vi dubbelkollar (samma mönster som /app/page.tsx).
  if (!profile) redirect(`/${locale}/login`);
  // Redan godkänd — inget att visa, skicka vidare till den vanliga routern.
  if (profile.status === 'active') redirect(`/${locale}/app`);

  const dict = await getDictionary(locale);
  const labels = dict.auth.pendingApproval;

  const signOutWithLocale = async () => {
    'use server';
    await signOut(locale);
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <Link
          href={`/${locale}`}
          className="font-serif text-[1.5rem] leading-none tracking-tight text-[var(--color-ink)]"
        >
          Elevante
        </Link>

        <div className="mt-20">
          <h1 className="font-serif text-[clamp(2rem,3vw+1rem,2.75rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
            {labels.title}
          </h1>
          <p className="mt-4 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {labels.body}
          </p>
        </div>

        <div className="mt-10">
          <form action={signOutWithLocale}>
            <Button type="submit" variant="outline">
              {dict.auth.signOut}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
