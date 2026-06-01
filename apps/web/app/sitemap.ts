import type { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n/config';
import { PAGE_PATHS, SITE_URL, urlFor } from '@/lib/site';
import { getAllPosts } from '@/lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const corePages = PAGE_PATHS.flatMap((path) =>
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

  // Bloggen är svensk-only → inga hreflang-alternates.
  const posts = getAllPosts();
  const blog: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/sv/blogg`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...posts.map((post) => ({
      url: `${SITE_URL}/sv/blogg/${post.slug}`,
      lastModified: new Date(post.updated ?? post.date),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];

  // Legala sidor — tvåspråkiga, låg prioritet.
  const legal: MetadataRoute.Sitemap = [
    '/integritetspolicy',
    '/villkor',
    '/cookies',
  ].flatMap((path) =>
    locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${SITE_URL}/${l}${path}`]),
        ) as Record<string, string>,
      },
    })),
  );

  return [...corePages, ...blog, ...legal];
}
