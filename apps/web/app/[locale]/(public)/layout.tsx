import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { SITE_URL } from '@/lib/site';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { JsonLd } from '@/components/public/JsonLd';
import { Analytics } from '@/components/public/Analytics';

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
    '@type': ['Organization', 'EducationalOrganization'],
    '@id': `${SITE_URL}/#organization`,
    name: dict.meta.siteName,
    legalName: 'Elevante AB',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/opengraph-image`,
      width: 1200,
      height: 630,
    },
    description: dict.meta.description,
    slogan: dict.meta.tagline,
    foundingLocation: {
      '@type': 'Place',
      name: 'Stockholm, Sweden',
    },
    areaServed: ['SE', 'NO', 'DK', 'FI'],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'john@elevante.se',
      contactType: 'customer support',
      availableLanguage: ['Swedish', 'English'],
    },
    sameAs: [
      // Placeholder — fyll i när konton skapats
      'https://www.linkedin.com/company/elevante-se',
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: dict.meta.siteName,
    url: SITE_URL,
    inLanguage: locale === 'sv' ? 'sv-SE' : 'en-US',
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

  // Produkt-schema — beskriver Elevante som SoftwareApplication med
  // pris. Hjälper både Google AIO och LLM-citeringar att hämta rätt
  // pris och kategori.
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name: dict.meta.siteName,
    operatingSystem: 'iOS, Android, Web',
    applicationCategory: 'EducationalApplication',
    url: SITE_URL,
    description: dict.meta.description,
    inLanguage: ['sv-SE', 'en-US'],
    publisher: { '@id': `${SITE_URL}/#organization` },
    offers: {
      '@type': 'Offer',
      price: '500',
      priceCurrency: 'SEK',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '500',
        priceCurrency: 'SEK',
        unitText: locale === 'sv' ? 'per elev och år' : 'per student per year',
      },
      availability: 'https://schema.org/PreOrder',
    },
  };

  return (
    <>
      <Analytics />
      <JsonLd data={[orgSchema, websiteSchema, softwareSchema]} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        {locale === 'sv' ? 'Hoppa till innehåll' : 'Skip to content'}
      </a>
      <div className="flex min-h-screen flex-col">
        <Header locale={locale} pathname={pathname} dict={dict} />
        <main id="main-content" className="flex-1 animate-page-in">
          {children}
        </main>
        <Footer locale={locale} pathname={pathname} dict={dict} />
      </div>
    </>
  );
}
