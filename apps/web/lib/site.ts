import type { Locale } from './i18n/config';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

export const PAGE_PATHS = [
  '',
  '/for-skolor',
  '/for-elever',
  '/priser',
  '/om-oss',
  '/kontakt',
  '/integritetspolicy',
  '/villkor',
  '/cookies',
] as const;

export type PagePath = (typeof PAGE_PATHS)[number];

export function urlFor(locale: Locale, path: PagePath = ''): string {
  return `${SITE_URL}/${locale}${path}`;
}
