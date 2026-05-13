import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { Container } from '@/components/public/Container';
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

// Editorial Calm — kontaktformulär

export default async function ContactPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const page = dict.contact;
  const sv = locale === 'sv';
  const { topic } = await searchParams;
  const initialTopic =
    topic === 'demo' || topic === 'pricing' || topic === 'press' || topic === 'other'
      ? topic
      : 'demo';

  return (
    <>
      <section className="pt-16 pb-12 md:pt-24 md:pb-16">
        <Container width="content">
          <p className="eyebrow mb-6">{page.hero.eyebrow}</p>
          <h1 className="font-serif text-[clamp(2.5rem,4.5vw+1rem,4.5rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
            {page.hero.title}
          </h1>
          <p className="mt-8 max-w-xl text-[1.125rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {page.hero.subtitle}
          </p>
        </Container>
      </section>

      <section className="pb-20 md:pb-28">
        <Container width="content">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-7">
              <div className="rounded-[20px] bg-[var(--color-surface)] p-8 md:p-10">
                <ContactForm labels={page.form} initialTopic={initialTopic} />
              </div>
            </div>
            <aside className="md:col-span-5">
              <div className="sticky top-8 space-y-8">
                <div>
                  <p className="text-[0.75rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                    {sv ? 'Eller mejla direkt' : 'Or email directly'}
                  </p>
                  <a
                    href={`mailto:${page.alternatives.email}`}
                    className="mt-3 inline-block font-serif text-[1.25rem] text-[var(--color-ink)] underline-offset-4 hover:underline"
                  >
                    {page.alternatives.email}
                  </a>
                </div>

                <div className="border-t border-[var(--color-sand)] pt-8">
                  <p className="text-[0.75rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                    {sv ? 'Svarstid' : 'Response time'}
                  </p>
                  <p className="mt-3 text-[1rem] leading-relaxed text-[var(--color-ink)]">
                    {sv
                      ? 'Inom en arbetsdag. Bokningar för demo går oftast inom samma dag.'
                      : 'Within one business day. Demo bookings usually same day.'}
                  </p>
                </div>

                <div className="border-t border-[var(--color-sand)] pt-8">
                  <p className="text-[0.75rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                    {sv ? 'Adress' : 'Address'}
                  </p>
                  <p className="mt-3 text-[1rem] leading-relaxed text-[var(--color-ink)]">
                    Stockholm, Sverige
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </>
  );
}
