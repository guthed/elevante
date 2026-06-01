import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { alternatesFor } from '@/lib/site';
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
    alternates: alternatesFor(locale, '/vad-kostar-elevante'),
    title: sv
      ? 'Vad kostar Elevante? — Beräkna ert pris'
      : 'How much does Elevante cost? — Calculate your price',
    description: sv
      ? 'Sök din skola och se en uppskattad årskostnad för Elevante direkt. 500 kr per elev per år — beräkna ert pris på en minut.'
      : 'Search for your school and see an estimated annual cost for Elevante right away. SEK 500 per student per year — calculate your price in a minute.',
  };
}

const IMG_SHADOW = 'shadow-[0_24px_60px_-16px_rgba(26,26,46,0.18)]';

export default async function PriceEstimatePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;
  const sv = locale === 'sv';

  const inclusions = sv
    ? [
        'Inspelning och transkribering av varje lektion',
        'AI-chat för alla elever och lärare',
        'Lärarinsikter inför prov',
        'GDPR-säkert — all data lagras i Sverige',
        'Onboarding och support ingår',
      ]
    : [
        'Recording and transcription of every lesson',
        'AI chat for all students and teachers',
        'Teacher insights before tests',
        'GDPR-safe — all data stored in Sweden',
        'Onboarding and support included',
      ];

  const trust = sv
    ? ['Byggt i Sverige.', 'Data lagras i EU.', 'Ingen AI tränas på elevdata.']
    : ['Built in Sweden.', 'Data stored in the EU.', 'No AI is trained on student data.'];

  return (
    <>
      {/* HERO */}
      <section className="pt-16 pb-16 md:pt-24 md:pb-20">
        <Container width="wide">
          <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-6">
              <p className="eyebrow mb-6">
                {sv ? 'Prisuppskattning' : 'Price estimate'}
              </p>
              <h1 className="font-serif text-[clamp(2.25rem,4.5vw+1rem,4rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
                {sv
                  ? 'Vad kostar Elevante för er skola?'
                  : 'How much does Elevante cost for your school?'}
              </h1>
              <p className="mt-6 max-w-md text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'Sök er skola nedan — antalet elever hämtas automatiskt och ni ser årspriset direkt.'
                  : 'Search for your school below — the student count is fetched automatically and you see the annual price right away.'}
              </p>
            </div>
            <div className="md:col-span-6">
              <Image
                src="/img/kampanj-hero.jpg"
                alt={sv ? 'Elever på en lektion i ett klassrum' : 'Students in a classroom lesson'}
                width={2400}
                height={1589}
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className={`h-auto w-full rotate-[2deg] rounded-[20px] ${IMG_SHADOW}`}
              />
            </div>
          </div>
        </Container>
      </section>

      {/* KALKYLATOR */}
      <section className="pb-20 md:pb-28">
        <Container width="content">
          <PriceEstimator locale={locale} />
        </Container>
      </section>

      {/* DET HÄR INGÅR I PRISET */}
      <section className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="wide">
          <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <Image
                src="/img/kampanj-larare.jpg"
                alt={sv ? 'En lärare som går igenom en lektion' : 'A teacher walking through a lesson'}
                width={2400}
                height={1601}
                sizes="(max-width: 768px) 100vw, 42vw"
                className={`h-auto w-full rotate-[-2deg] rounded-[20px] ${IMG_SHADOW}`}
              />
            </div>
            <div className="md:col-span-7">
              <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.75rem)] leading-[1.1] text-[var(--color-ink)]">
                {sv ? 'Det här ingår i priset' : 'This is included in the price'}
              </h2>
              <p className="mt-5 max-w-md text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'Ett pris, allt inkluderat. Inga moduler att köpa till, inga dolda avgifter.'
                  : 'One price, everything included. No modules to buy on top, no hidden fees.'}
              </p>
              <ul className="mt-8 divide-y divide-[var(--color-sand)]">
                {inclusions.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-4 py-3.5 first:pt-0 last:pb-0"
                  >
                    <span className="status-dot status-dot--sage mt-2" aria-hidden="true" />
                    <span className="text-[1rem] leading-relaxed text-[var(--color-ink)]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* VAD DET KOSTAR ATT INTE GÖRA NÅGOT — mörkt kontrastband */}
      <section className="bg-[var(--color-ink)] py-20 md:py-28">
        <Container width="content">
          <p className="text-[0.75rem] uppercase tracking-[0.12em] text-[var(--color-canvas)]/55">
            {sv ? 'Att inte göra något' : 'Doing nothing'}
          </p>
          <p className="mt-6 font-serif text-[clamp(1.75rem,2.5vw+1rem,2.75rem)] italic leading-snug text-[var(--color-canvas)]">
            {sv
              ? '”Jag svarar på samma fråga trettio gånger per termin. Eleven som vågar fråga får svar — de som inte vågar går hem och gissar.”'
              : '”I answer the same question thirty times a term. The student who dares to ask gets an answer — the ones who don’t go home and guess.”'}
          </p>
          <p className="mt-4 text-[0.875rem] text-[var(--color-canvas)]/55">
            {sv ? '— En gymnasielärare' : '— An upper-secondary teacher'}
          </p>
          <p className="mt-8 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--color-canvas)]/75">
            {sv
              ? 'Elever som halkar efter kostar mer per timme i läxhjälp än Elevante kostar per år. Och en elev som tappar modet är en kostnad ingen vill prata om. Att inte göra något är sällan gratis.'
              : 'Students who fall behind cost more per hour in tutoring than Elevante costs per year. And a student who loses heart is a cost no one wants to talk about. Doing nothing is rarely free.'}
          </p>
        </Container>
      </section>

      {/* TRYGGHET */}
      <section className="bg-[var(--color-surface-soft)] py-12 md:py-16">
        <Container width="wide">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {trust.map((t) => (
              <span
                key={t}
                className="flex items-center gap-2.5 text-[0.9375rem] text-[var(--color-ink)]"
              >
                <span className="status-dot status-dot--sage" aria-hidden="true" />
                {t}
              </span>
            ))}
          </div>
        </Container>
      </section>

      {/* AVSLUTANDE CTA */}
      <section className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="content">
          <div className="max-w-xl">
            <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.5rem)] leading-snug text-[var(--color-ink)]">
              {sv
                ? 'Vill ni ha exakt pris?'
                : 'Want an exact price?'}
            </h2>
            <p className="mt-4 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Boka en demo så går vi igenom er skola och tar fram en offert för just er.'
                : 'Book a demo and we’ll walk through your school and put together a quote.'}
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
