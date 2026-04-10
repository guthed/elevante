import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, locales, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { SITE_URL, urlFor } from '@/lib/site';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { JsonLd } from '@/components/public/JsonLd';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${dict.meta.siteName} — ${dict.meta.tagline}`,
      template: `%s · ${dict.meta.siteName}`,
    },
    description: dict.meta.description,
    applicationName: dict.meta.siteName,
    alternates: {
      canonical: urlFor(locale),
      languages: {
        sv: urlFor('sv'),
        en: urlFor('en'),
        'x-default': urlFor('sv'),
      },
    },
    openGraph: {
      type: 'website',
      siteName: dict.meta.siteName,
      title: `${dict.meta.siteName} — ${dict.meta.tagline}`,
      description: dict.meta.description,
      url: urlFor(locale),
      locale: locale === 'sv' ? 'sv_SE' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${dict.meta.siteName} — ${dict.meta.tagline}`,
      description: dict.meta.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
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
      <div lang={locale} className="flex min-h-screen flex-col">
        <Header locale={locale} pathname={pathname} dict={dict} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} pathname={pathname} dict={dict} />
      </div>
    </>
  );
}
