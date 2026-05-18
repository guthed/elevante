import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { LinkButton } from '@/components/public/Button';
import { Container } from '@/components/public/Container';
import { PriceEstimator } from '@/components/public/PriceEstimator';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const sv = locale === 'sv';
  return {
    title: sv ? 'Vad kostar Elevante? — Beräkna ert pris' : 'How much does Elevante cost? — Calculate your price',
    description: sv
      ? 'Sök din skola och se en uppskattad årskostnad för Elevante direkt. 500 kr per elev per år — beräkna ert pris på en minut.'
      : 'Search for your school and see an estimated annual cost for Elevante right away. SEK 500 per student per year — calculate your price in a minute.',
  };
}

export default async function PriceEstimatePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;
  const sv = locale === 'sv';

  return (
    <>
      {/* HERO */}
      <section className="pt-16 pb-12 md:pt-24 md:pb-16">
        <Container width="content">
          <p className="eyebrow mb-6">
            {sv ? 'Prisuppskattning' : 'Price estimate'}
          </p>
          <h1 className="font-serif text-[clamp(2.25rem,4.5vw+1rem,4rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
            {sv
              ? 'Vad kostar Elevante för er skola?'
              : 'How much does Elevante cost for your school?'}
          </h1>
          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? 'Sök din skola nedan. Elevantalet hämtas automatiskt — eller fyll i det själv. Du ser ert uppskattade årspris direkt.'
              : "Search for your school below. The student count is fetched automatically — or enter it yourself. You'll see your estimated annual price right away."}
          </p>
        </Container>
      </section>

      {/* CALCULATOR */}
      <section className="pb-20 md:pb-28">
        <Container width="content">
          <PriceEstimator locale={locale} />
        </Container>
      </section>

      {/* CLOSING CTA */}
      <section className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="content">
          <div className="max-w-xl">
            <p className="font-serif text-[clamp(1.5rem,2vw+1rem,2rem)] leading-snug text-[var(--color-ink)]">
              {sv
                ? 'Priset ovan är ungefärligt — boka en demo för en exakt offert.'
                : 'The price above is approximate — book a demo for an exact quote.'}
            </p>
            <p className="mt-4 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Vi går igenom er skola, ert schema och era behov. Ni får ett personligt förslag med exakt prisuppgift.'
                : "We'll go through your school, your schedule and your needs. You'll get a personalised proposal with an exact price."}
            </p>
            <div className="mt-8">
              <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                {sv ? 'Boka demo' : 'Book demo'}
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
