import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { SignupForm } from './SignupForm';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.auth.signup.title,
    robots: { index: false, follow: false },
  };
}

export default async function SignupPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const labels = dict.auth.signup;

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <Link
          href={`/${locale}`}
          className="text-center font-serif text-2xl text-[var(--color-primary)]"
        >
          Elevante
        </Link>
        <div className="mt-12 rounded-2xl border border-[var(--color-border)] bg-white p-8 md:p-10">
          <h1 className="font-serif text-3xl text-[var(--color-primary)]">
            {labels.title}
          </h1>
          <p className="mt-2 text-[var(--color-ink-muted)]">{labels.subtitle}</p>
          <div className="mt-8">
            <SignupForm locale={locale} labels={labels} />
          </div>
          <p className="mt-8 text-center text-sm text-[var(--color-ink-muted)]">
            {labels.hasAccount}{' '}
            <Link
              href={`/${locale}/login`}
              className="font-medium text-[var(--color-accent)] hover:underline"
            >
              {labels.loginLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
