import type { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n/config';
import { PAGE_PATHS, urlFor } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PAGE_PATHS.flatMap((path) =>
    locales.map((locale) => ({
      url: urlFor(locale, path),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: path === '' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, urlFor(l, path)]),
        ) as Record<string, string>,
      },
    })),
  );
}
