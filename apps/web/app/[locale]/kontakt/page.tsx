import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { Container, Section } from '@/components/public/Container';
import { ContactForm } from './ContactForm';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ topic?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.contact.hero.title,
    description: dict.contact.hero.subtitle,
  };
}

export default async function ContactPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const page = dict.contact;
  const { topic } = await searchParams;
  const initialTopic =
    topic === 'demo' || topic === 'pricing' || topic === 'press' || topic === 'other'
      ? topic
      : 'demo';

  return (
    <>
      <section className="pt-16 pb-16 md:pt-28 md:pb-20">
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

      <Section background="subtle" className="pt-0 md:pt-0">
        <Container width="prose">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 md:p-12">
            <ContactForm labels={page.form} initialTopic={initialTopic} />
          </div>
          <div className="mt-10 text-center text-sm text-[var(--color-ink-muted)]">
            {page.alternatives.title}:{' '}
            <a
              href={`mailto:${page.alternatives.email}`}
              className="text-[var(--color-accent)] hover:underline"
            >
              {page.alternatives.email}
            </a>
          </div>
        </Container>
      </Section>
    </>
  );
}
