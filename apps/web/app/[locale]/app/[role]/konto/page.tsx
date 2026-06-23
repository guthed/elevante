import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getCurrentProfile } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';
import { LanguageSwitcher } from '@/components/public/LanguageSwitcher';
import { AccountForms } from '@/components/app/AccountForms';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(isLocale(locale) ? locale : 'sv');
  return {
    title: dict.app.account.title,
    robots: { index: false, follow: false },
  };
}

export default async function AccountPage({ params }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  const locale: Locale = rawLocale;

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);
  if (profile.role !== role) redirect(`/${locale}/app/${profile.role}/konto`);

  const dict = await getDictionary(locale);
  const a = dict.app.account;
  const pathname = `/${locale}/app/${role}/konto`;

  const signOutWithLocale = async () => {
    'use server';
    await signOut(locale);
  };

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
          {a.title}
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {a.subtitle}
        </p>

        <div className="mt-10">
          <AccountForms
            locale={locale}
            role={role}
            initialName={profile.full_name ?? ''}
            email={profile.email ?? ''}
            labels={a}
          />
        </div>

        {/* Språk */}
        <section className="mt-12">
          <h2 className="font-serif text-[1.25rem] text-[var(--color-ink)]">
            {a.languageHeading}
          </h2>
          <div className="mt-3">
            <LanguageSwitcher
              currentLocale={locale}
              pathname={pathname}
              labels={{ sv: 'Svenska', en: 'English' }}
              ariaLabel={a.languageHeading}
            />
          </div>
        </section>

        {/* Logga ut */}
        <section className="mt-12 border-t border-[var(--color-sand)] pt-8">
          <form action={signOutWithLocale}>
            <button
              type="submit"
              className="rounded-[12px] border border-[var(--color-sand)] px-5 py-2.5 text-[0.9375rem] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-soft)]"
            >
              {dict.auth.signOut}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
