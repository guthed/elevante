import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { Container } from '@/components/public/Container';
import { JsonLd } from '@/components/public/JsonLd';
import { BlogIndex } from '@/components/public/BlogIndex';
import { getAllPosts, getCategories, toCardData } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ locale: string }> };

const BLOG_URL = `${SITE_URL}/sv/blogg`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'sv') return {};
  return {
    title: { absolute: 'Blogg — Elevante' },
    description:
      'Guider och analyser om AI i skolan, GDPR, studieteknik och hur Elevante fungerar — skrivet för lärare, rektorer och elever.',
    alternates: { canonical: BLOG_URL },
  };
}

export default async function BlogIndexPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale !== 'sv') notFound(); // bloggen är svensk-only

  const base = `/${locale}`;
  const posts = getAllPosts();
  const cards = posts.map(toCardData);
  const categories = getCategories();

  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${BLOG_URL}#blog`,
    name: 'Elevante-bloggen',
    inLanguage: 'sv-SE',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: `${BLOG_URL}/${post.slug}`,
      datePublished: post.date,
      ...(post.updated ? { dateModified: post.updated } : {}),
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Hem', item: `${SITE_URL}/sv` },
      { '@type': 'ListItem', position: 2, name: 'Blogg', item: BLOG_URL },
    ],
  };

  return (
    <>
      <JsonLd data={[blogSchema, breadcrumb]} />
      <section className="pt-16 pb-12 md:pt-24 md:pb-16">
        <Container width="content">
          <p className="eyebrow mb-5">Blogg</p>
          <h1 className="max-w-3xl font-serif text-[clamp(2.5rem,4vw+1rem,4rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
            Skola, AI och allt däremellan.
          </h1>
          <p className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
            Guider och analyser för lärare, rektorer och elever — om AI i
            klassrummet, GDPR, studieteknik och hur Elevante fungerar.
          </p>
        </Container>
      </section>
      <section className="pb-24 md:pb-32">
        <Container width="content">
          {cards.length === 0 ? (
            <p className="text-[var(--color-ink-secondary)]">
              Inga inlägg ännu — snart kommer det.
            </p>
          ) : (
            <BlogIndex
              posts={cards}
              categories={categories}
              base={base}
              allLabel="Alla"
            />
          )}
        </Container>
      </section>
    </>
  );
}
