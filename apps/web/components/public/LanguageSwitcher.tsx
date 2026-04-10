import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import { locales } from '@/lib/i18n/config';

type Props = {
  currentLocale: Locale;
  pathname: string;
  labels: Record<Locale, string>;
  ariaLabel: string;
};

function withLocale(pathname: string, locale: Locale): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return `/${locale}`;
  parts[0] = locale;
  return `/${parts.join('/')}`;
}

export function LanguageSwitcher({
  currentLocale,
  pathname,
  labels,
  ariaLabel,
}: Props) {
  return (
    <nav aria-label={ariaLabel} className="flex items-center gap-1 text-sm">
      {locales.map((locale, index) => {
        const isActive = locale === currentLocale;
        return (
          <span key={locale} className="flex items-center gap-1">
            {index > 0 ? (
              <span aria-hidden="true" className="text-[var(--color-ink-subtle)]">
                ·
              </span>
            ) : null}
            <Link
              href={withLocale(pathname, locale)}
              aria-current={isActive ? 'page' : undefined}
              className={
                isActive
                  ? 'text-[var(--color-primary)] font-medium'
                  : 'text-[var(--color-ink-subtle)] hover:text-[var(--color-primary)] transition-colors'
              }
            >
              {labels[locale]}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
