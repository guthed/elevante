import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import { LinkButton } from './Button';
import { LanguageSwitcher } from './LanguageSwitcher';

type Props = {
  locale: Locale;
  pathname: string;
  dict: Dictionary;
};

export function Header({ locale, pathname, dict }: Props) {
  const base = `/${locale}`;
  const nav = [
    { href: `${base}/om-oss`, label: dict.nav.about },
    { href: `${base}/for-skolor`, label: dict.nav.forSchools },
    { href: `${base}/for-larare`, label: dict.nav.forTeachers },
    { href: `${base}/for-elever`, label: dict.nav.forStudents },
    { href: `${base}/priser`, label: dict.nav.pricing },
    { href: `${base}/kontakt`, label: dict.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-sand)] bg-[var(--color-canvas)]/90 backdrop-blur-sm">
      <div className="container-wide flex items-center justify-between py-5">
        <Link
          href={base}
          className="font-serif text-[1.5rem] leading-none tracking-tight text-[var(--color-ink)]"
          aria-label={dict.meta.siteName}
        >
          {dict.meta.siteName}
        </Link>

        <nav
          className="hidden items-center gap-7 md:flex"
          aria-label={dict.nav.home}
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[0.9375rem] text-[var(--color-ink-secondary)] transition-colors hover:text-[var(--color-ink)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <LanguageSwitcher
              currentLocale={locale}
              pathname={pathname}
              labels={{ sv: 'Svenska', en: 'English' }}
              ariaLabel={dict.nav.switchLanguage}
            />
          </div>
          <LinkButton href={`${base}/login`} size="md">
            {locale === 'sv' ? 'Logga in' : 'Log in'}
          </LinkButton>
          <MobileMenuToggle dict={dict} />
        </div>
      </div>
      <MobileMenuPanel locale={locale} pathname={pathname} dict={dict} />
    </header>
  );
}

function MobileMenuToggle({ dict }: { dict: Dictionary }) {
  return (
    <>
      <label
        htmlFor="elv-mobile-menu"
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] md:hidden"
        aria-label={dict.nav.openMenu}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </label>
      <input
        type="checkbox"
        id="elv-mobile-menu"
        className="peer hidden"
        aria-hidden="true"
      />
    </>
  );
}

function MobileMenuPanel({
  locale,
  pathname,
  dict,
}: {
  locale: Locale;
  pathname: string;
  dict: Dictionary;
}) {
  const base = `/${locale}`;
  const items = [
    { href: `${base}/om-oss`, label: dict.nav.about },
    { href: `${base}/for-skolor`, label: dict.nav.forSchools },
    { href: `${base}/for-larare`, label: dict.nav.forTeachers },
    { href: `${base}/for-elever`, label: dict.nav.forStudents },
    { href: `${base}/priser`, label: dict.nav.pricing },
    { href: `${base}/kontakt`, label: dict.nav.contact },
  ];
  return (
    <div
      className="hidden border-t border-[var(--color-sand)] bg-[var(--color-canvas)] peer-checked:block md:peer-checked:hidden"
      role="dialog"
      aria-label={dict.nav.openMenu}
    >
      <nav className="container-wide flex flex-col gap-4 py-6">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-base text-[var(--color-ink)]"
          >
            {item.label}
          </Link>
        ))}
        <div className="pt-2">
          <LanguageSwitcher
            currentLocale={locale}
            pathname={pathname}
            labels={{ sv: 'Svenska', en: 'English' }}
            ariaLabel={dict.nav.switchLanguage}
          />
        </div>
      </nav>
    </div>
  );
}
