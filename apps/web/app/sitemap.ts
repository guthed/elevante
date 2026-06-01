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

  return [...corePages, ...blog];
}
