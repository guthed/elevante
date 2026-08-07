import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import type { Dictionary } from '@/lib/i18n/types';
import { Divider } from '@/components/ui/Divider';
import { SsoButtons } from '@/components/auth/SsoButtons';
import { LoginForm } from './LoginForm';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
};

// `?error=`-koder som kan landa här från OAuth-callbacken
// (apps/web/app/api/auth/callback/route.ts). `invite-expired`/`invite-claimed`
// hör till mejl-länk-flödet (senare task) — lägg till dem här när de finns,
// listan är byggd för att växa utan omstrukturering.
const OAUTH_ERROR_MESSAGE_KEYS: Partial<Record<string, keyof Dictionary['auth']['login']>> = {
  'unauthorized-domain': 'errorUnauthorizedDomain',
  pending: 'errorPending',
  callback: 'errorGeneric',
  config: 'errorGeneric',
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
  const { next, error } = await searchParams;
  const labels = dict.auth.login;
  const sv = locale === 'sv';

  const oauthErrorKey = error ? OAUTH_ERROR_MESSAGE_KEYS[error] : undefined;
  const oauthErrorMessage = oauthErrorKey ? labels[oauthErrorKey] : null;

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

        <div className="mt-10 space-y-6">
          {oauthErrorMessage ? (
            <p
              role="alert"
              className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-4 py-3 text-sm text-[var(--color-error)]"
            >
              {oauthErrorMessage}
            </p>
          ) : null}

          <SsoButtons locale={locale} labels={labels} />

          <Divider label={labels.ssoDivider} />

          <LoginForm locale={locale} next={next} labels={labels} />
        </div>
      </div>
    </div>
  );
}
