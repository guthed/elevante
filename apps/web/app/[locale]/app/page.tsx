import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { roles } from '@/lib/app/roles';

type Props = {
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

// Temporär role-väljare innan auth finns. Ersätts i Fas 2 av en redirect
// baserad på användarens roll från Supabase-session.
export default async function AppLandingPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const base = `/${locale}/app`;

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <Link
          href={`/${locale}`}
          className="font-serif text-2xl text-[var(--color-primary)]"
        >
          Elevante
        </Link>
        <h1 className="mt-12 font-serif text-4xl text-[var(--color-primary)]">
          {dict.app.landing.title}
        </h1>
        <p className="mt-4 text-[var(--color-ink-muted)]">{dict.app.landing.subtitle}</p>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {roles.map((role) => (
            <Link
              key={role}
              href={`${base}/${role}`}
              className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-colors hover:border-[var(--color-accent)]"
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-subtle)]">
                {dict.app.roleTitles[role]}
              </div>
              <div className="mt-3 font-serif text-2xl text-[var(--color-primary)]">
                {dict.app.pages[role].overview.title}
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
                {dict.app.landing.open}
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
