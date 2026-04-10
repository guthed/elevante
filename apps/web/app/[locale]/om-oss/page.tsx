import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { Container, Section } from '@/components/public/Container';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.about.hero.title,
    description: dict.about.hero.subtitle,
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const page = dict.about;

  return (
    <>
      <section className="pt-16 pb-24 md:pt-28 md:pb-32">
        <Container>
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              {page.hero.eyebrow}
            </p>
            <h1>{page.hero.title}</h1>
            <p className="mt-8 text-xl leading-relaxed text-[var(--color-ink-muted)]">
              {page.hero.subtitle}
            </p>
          </div>
        </Container>
      </section>

      <Section background="subtle">
        <Container width="prose">
          <h2>{page.mission.title}</h2>
          <p className="mt-6 text-lg leading-relaxed">{page.mission.body}</p>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="max-w-3xl">
            <h2>{page.values.title}</h2>
          </div>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {page.values.items.map((item) => (
              <article key={item.title}>
                <h3 className="text-xl">{item.title}</h3>
                <p className="mt-3 leading-relaxed">{item.body}</p>
              </article>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
