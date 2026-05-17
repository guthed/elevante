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

  const productLinks = [
    { href: `${base}/for-skolor`, label: dict.nav.forSchools },
    { href: `${base}/for-larare`, label: dict.nav.forTeachers },
    { href: `${base}/for-elever`, label: dict.nav.forStudents },
    { href: `${base}/priser`, label: dict.nav.pricing },
  ];
  const companyLinks = [
    { href: `${base}/om-oss`, label: dict.nav.about },
    { href: `${base}/kontakt`, label: dict.nav.contact },
  ];
  const legalLinks = [
    { href: `${base}/integritetspolicy`, label: locale === 'sv' ? 'Integritetspolicy' : 'Privacy policy' },
    { href: `${base}/villkor`, label: locale === 'sv' ? 'Villkor' : 'Terms' },
    { href: `${base}/cookies`, label: 'Cookies' },
  ];

  return (
    <footer className="border-t border-[var(--color-sand)] bg-[var(--color-canvas)]">
      <div className="container-wide grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="font-serif text-[1.75rem] leading-none text-[var(--color-ink)]">
            {dict.meta.siteName}
          </div>
          <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {dict.meta.tagline}
          </p>
          <p className="mt-6 text-xs uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            {locale === 'sv'
              ? 'GDPR-säkert · Data i Stockholm'
              : 'GDPR-safe · Data in Stockholm'}
          </p>
        </div>

        <div className="md:col-span-2">
          <h3 className="mb-4 font-sans text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            {locale === 'sv' ? 'Produkt' : 'Product'}
          </h3>
          <ul className="space-y-3 text-[0.9375rem] text-[var(--color-ink-secondary)]">
            {productLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-[var(--color-ink)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <h3 className="mb-4 font-sans text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            {locale === 'sv' ? 'Företag' : 'Company'}
          </h3>
          <ul className="space-y-3 text-[0.9375rem] text-[var(--color-ink-secondary)]">
            {companyLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-[var(--color-ink)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3">
          <h3 className="mb-4 font-sans text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            {locale === 'sv' ? 'Juridik' : 'Legal'}
          </h3>
          <ul className="space-y-3 text-[0.9375rem] text-[var(--color-ink-secondary)]">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-[var(--color-ink)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--color-sand)]">
        <div className="container-wide flex flex-col gap-4 py-6 text-xs text-[var(--color-ink-muted)] md:flex-row md:items-center md:justify-between">
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
