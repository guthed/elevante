import type { Locale } from './i18n/config';

// Kanonisk produktionsvärd. www serverar 200, apex (elevante.se) 308:ar hit.
const PRODUCTION_URL = 'https://www.elevante.se';

// SITE_URL driver canonical, hreflang, og:url, sitemap, robots Host och alla
// JSON-LD @id. Den FÅR ALDRIG bli Vercels auto-genererade *.vercel.app-domän —
// då pekar varje sida bort från elevante.se och Google krediterar fel domän
// (preview-domänen är dessutom indexerbar). Ignorera den explicit och fall
// tillbaka till produktionsvärden. Lokal dev sätter localhost via env och
// påverkas inte.
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (!raw || raw.includes('.vercel.app')) return PRODUCTION_URL;
  return raw;
}

export const SITE_URL = resolveSiteUrl();

export const PAGE_PATHS = [
  '',
  '/for-skolor',
  '/for-larare',
  '/for-elever',
  '/priser',
  '/om-oss',
  '/kontakt',
] as const;

export type PagePath = (typeof PAGE_PATHS)[number];

export function urlFor(locale: Locale, path: PagePath = ''): string {
  return `${SITE_URL}/${locale}${path}`;
}

// Per-sides canonical + hreflang. MÅSTE sättas i varje undersidas
// generateMetadata — annars ärver sidan locale-layoutens canonical (som pekar
// på locale-startsidan) och Google viker in undersidan under startsidan i
// stället för att indexera den separat. `path` är en sökväg utan locale-prefix,
// t.ex. '/priser' (tom sträng = startsidan).
export function alternatesFor(locale: Locale, path = '') {
  const make = (l: Locale) => `${SITE_URL}/${l}${path}`;
  return {
    canonical: make(locale),
    languages: {
      sv: make('sv'),
      en: make('en'),
      'x-default': make('sv'),
    },
  };
}
