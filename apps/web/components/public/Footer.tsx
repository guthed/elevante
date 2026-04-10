import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import { LanguageSwitcher } from './LanguageSwitcher';

type Props = {
  locale: Locale;
  pathname: string;
  dict: Dictionary;
};

export function Footer({ locale, pathname, dict }: Props) {
  const base = `/${locale}`;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
      <div className="container-wide grid gap-10 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="font-serif text-2xl text-[var(--color-primary)]">
            {dict.meta.siteName}
          </div>
          <p className="mt-3 max-w-sm text-sm text-[var(--color-ink-muted)]">
            {dict.meta.tagline}
          </p>
        </div>

        <div>
          <h3 className="mb-4 font-sans text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]">
            {dict.footer.navHeader}
          </h3>
          <ul className="space-y-3 text-sm text-[var(--color-ink-muted)]">
            <li>
              <Link
                href={`${base}/for-skolor`}
                className="hover:text-[var(--color-primary)]"
              >
                {dict.nav.forSchools}
              </Link>
            </li>
            <li>
              <Link
                href={`${base}/for-elever`}
                className="hover:text-[var(--color-primary)]"
              >
                {dict.nav.forStudents}
              </Link>
            </li>
            <li>
              <Link
                href={`${base}/priser`}
                className="hover:text-[var(--color-primary)]"
              >
                {dict.nav.pricing}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-sans text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-subtle)]">
            {dict.footer.companyHeader}
          </h3>
          <ul className="space-y-3 text-sm text-[var(--color-ink-muted)]">
            <li>
              <Link
                href={`${base}/om-oss`}
                className="hover:text-[var(--color-primary)]"
              >
                {dict.nav.about}
              </Link>
            </li>
            <li>
              <Link
                href={`${base}/kontakt`}
                className="hover:text-[var(--color-primary)]"
              >
                {dict.nav.contact}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)]">
        <div className="container-wide flex flex-col gap-4 py-6 text-xs text-[var(--color-ink-subtle)] md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {dict.meta.siteName}. {dict.footer.rights}
          </p>
          <div className="flex items-center gap-6">
            <span>{dict.footer.madeIn}</span>
            <LanguageSwitcher
              currentLocale={locale}
              pathname={pathname}
              labels={{ sv: 'Svenska', en: 'English' }}
              ariaLabel={dict.nav.switchLanguage}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
