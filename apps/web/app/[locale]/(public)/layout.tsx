import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { SITE_URL } from '@/lib/site';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { JsonLd } from '@/components/public/JsonLd';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function PublicLayout({ children, params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = await getDictionary(locale);
  const pathname = `/${locale}`;

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: dict.meta.siteName,
    url: SITE_URL,
    description: dict.meta.description,
    slogan: dict.meta.tagline,
    foundingLocation: {
      '@type': 'Place',
      name: 'Stockholm, Sweden',
    },
    areaServed: 'EU',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'john@guthed.se',
      contactType: 'customer support',
      availableLanguage: ['Swedish', 'English'],
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: dict.meta.siteName,
    url: SITE_URL,
    inLanguage: locale === 'sv' ? 'sv-SE' : 'en-US',
  };

  return (
    <>
      <JsonLd data={[orgSchema, websiteSchema]} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        {locale === 'sv' ? 'Hoppa till innehåll' : 'Skip to content'}
      </a>
      <div className="flex min-h-screen flex-col">
        <Header locale={locale} pathname={pathname} dict={dict} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer locale={locale} pathname={pathname} dict={dict} />
      </div>
    </>
  );
}
