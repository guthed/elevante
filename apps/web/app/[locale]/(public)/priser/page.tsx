import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { LinkButton } from '@/components/public/Button';
import { Container, Section } from '@/components/public/Container';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.pricing.hero.title,
    description: dict.pricing.hero.subtitle,
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const page = dict.pricing;
  const base = `/${locale}`;

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
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-10 md:p-14">
            <div className="text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-subtle)]">
              {page.plan.name}
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-serif text-6xl text-[var(--color-primary)]">
                {page.plan.price}
              </span>
              <span className="text-[var(--color-ink-muted)]">{page.plan.period}</span>
            </div>
            <ul className="mt-10 space-y-4 border-t border-[var(--color-border)] pt-8">
              {page.plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-[var(--color-primary)]">
                  <span
                    aria-hidden="true"
                    className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent)]"
                  >
                    ✓
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <LinkButton href={`${base}/kontakt?topic=pricing`} size="lg">
                {page.plan.cta}
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container width="prose">
          <h2>{page.faq.title}</h2>
          <div className="mt-10 space-y-4">
            {page.faq.items.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-[var(--color-border)] bg-white p-6 open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg text-[var(--color-primary)]">
                  <span>{item.q}</span>
                  <span
                    aria-hidden="true"
                    className="text-[var(--color-accent)] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
