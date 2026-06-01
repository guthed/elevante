import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { Container } from '@/components/public/Container';
import { JsonLd } from '@/components/public/JsonLd';
import { Prose } from '@/components/public/Prose';
import { LinkButton } from '@/components/public/Button';
import { getAllPosts, getPostBySlug } from '@/lib/blog';
import { formatSvDate } from '@/lib/format';
import { SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ locale: string; slug: string }> };

// Svensk-only: förrendera bara /sv/blogg/<slug>. /en-varianter renderas
// on-demand och notFound() ger en riktig 404.
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ locale: 'sv', slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (locale !== 'sv') return {};
  const post = getPostBySlug(slug);
  if (!post) return {};
  const url = `${SITE_URL}/sv/blogg/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      ...(post.heroImage
        ? { images: [{ url: post.heroImage, width: 1200, height: 630 }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  if (locale !== 'sv') notFound(); // svensk-only
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const base = `/${locale}`;
  const url = `${SITE_URL}/sv/blogg/${post.slug}`;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    articleSection: post.category,
    inLanguage: 'sv-SE',
    mainEntityOfPage: url,
    ...(post.heroImage ? { image: `${SITE_URL}${post.heroImage}` } : {}),
    author: { '@id': `${SITE_URL}/#organization` },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Hem', item: `${SITE_URL}/sv` },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blogg',
        item: `${SITE_URL}/sv/blogg`,
      },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  return (
    <>
      <JsonLd data={[articleSchema, breadcrumb]} />
      <article className="pt-12 pb-24 md:pt-16 md:pb-32">
        <Container width="prose">
          <Link
            href={`${base}/blogg`}
            className="text-sm text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
          >
            ← Blogg
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-[var(--color-ink-muted)]">
            <span className="rounded-full bg-[var(--color-surface-soft)] px-2.5 py-1 font-medium uppercase tracking-[0.08em]">
              {post.category}
            </span>
            <time dateTime={post.date}>{formatSvDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes} min läsning</span>
          </div>
          <h1 className="mt-5 font-serif text-[clamp(2.25rem,3.5vw+1rem,3.5rem)] leading-[1.08] tracking-[-0.01em] text-[var(--color-ink)]">
            {post.title}
          </h1>
          <p className="mt-5 text-[1.1875rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {post.description}
          </p>
          <hr className="my-10 border-[var(--color-sand)]" />
          <Prose>{post.body}</Prose>

          <div className="mt-16 rounded-[20px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-8 text-center">
            <h2 className="font-serif text-[1.5rem] text-[var(--color-ink)]">
              Se Elevante live på en halvtimme.
            </h2>
            <p className="mt-3 text-[0.9375rem] text-[var(--color-ink-secondary)]">
              500 kr per elev och år, allt ingår.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <LinkButton href={`${base}/kontakt?topic=demo`} size="md">
                Boka demo
              </LinkButton>
              <LinkButton href={`${base}/priser`} variant="ghost" size="md">
                Se priser →
              </LinkButton>
            </div>
          </div>
        </Container>
      </article>
    </>
  );
}
