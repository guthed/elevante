import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { LoginForm } from './LoginForm';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.auth.login.title,
    robots: { index: false, follow: false },
  };
}

// Editorial Calm — matchar tonen från Stitch screen 16 (mobil login)

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const { next } = await searchParams;
  const labels = dict.auth.login;
  const sv = locale === 'sv';

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
          <h1 className="font-serif text-[clamp(2.5rem,4vw+1rem,3.5rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
            {sv ? 'Hej.' : 'Hi.'}
          </h1>
          <p className="mt-4 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {labels.subtitle}
          </p>
        </div>

        <div className="mt-10">
          <LoginForm locale={locale} next={next} labels={labels} />
        </div>

        <p className="mt-8 text-[0.875rem] text-[var(--color-ink-muted)]">
          {labels.noAccount}{' '}
          <Link
            href={`/${locale}/signup`}
            className="font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
          >
            {labels.signupLink}
          </Link>
        </p>

        <div className="mt-auto pt-10">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            {sv
              ? 'Data lagras i Stockholm · GDPR-säkert'
              : 'Data stored in Stockholm · GDPR-safe'}
          </p>
        </div>
      </div>
    </div>
  );
}
