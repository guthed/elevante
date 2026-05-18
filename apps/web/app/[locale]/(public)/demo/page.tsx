import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { Container } from '@/components/public/Container';
import { LinkButton } from '@/components/public/Button';
import { AppDemo } from '@/components/public/AppDemo';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const sv = locale === 'sv';
  return {
    title: sv ? 'Demo — Elevante' : 'Demo — Elevante',
    description: sv
      ? 'Klicka igenom hela Elevante — från lärarens inspelning till elevens svar med källa.'
      : 'Click through all of Elevante — from the teacher\'s recording to the student\'s sourced answer.',
    robots: { index: false, follow: false },
  };
}

// Demo-sida som låter säljare visa mobil-flödet via webben.
// Inte indexerad — den är ett verktyg, inte marknadsmaterial.

export default async function LararAppDemoPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;
  const sv = locale === 'sv';

  return (
    <>
      <section className="pt-12 pb-8 md:pt-20 md:pb-10">
        <Container width="wide">
          <p className="eyebrow mb-6">
            {sv ? 'Klicka igenom Elevante' : 'Click through Elevante'}
          </p>
          <div className="grid items-end gap-6 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-7">
              <h1 className="font-serif text-[clamp(2.5rem,4.5vw+1rem,4.5rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
                {sv ? 'Två tryck. Sen minns Elevante.' : 'Two taps. Then Elevante remembers.'}
              </h1>
            </div>
            <div className="md:col-span-5">
              <p className="text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'Inte en video — riktiga skärmar. Följ hela vägen: läraren spelar in, och samma kväll får eleven svar med källa.'
                  : 'Not a video — real screens. Follow the whole path: the teacher records, and that evening the student gets an answer with a source.'}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="pb-20 md:pb-28">
        <Container width="wide">
          <AppDemo locale={locale} />
        </Container>
      </section>

      <section className="border-t border-[var(--color-sand)] py-16 md:py-20">
        <Container width="content">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.25rem)] leading-tight text-[var(--color-ink)]">
              {sv
                ? 'Vill du se det här på en riktig skola?'
                : 'Want to see this at a real school?'}
            </h2>
            <p className="mt-4 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Vi visar Elevante över en halvtimme. Mobilen, lärar-vyn och elev-chatten — i ert sammanhang.'
                : 'We show Elevante in half an hour. The mobile app, the teacher view, the student chat — in your context.'}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                {sv ? 'Boka demo' : 'Book demo'}
              </LinkButton>
              <Link
                href={`${base}/for-skolor`}
                className="inline-flex items-center gap-2 px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] underline-offset-4 hover:underline"
              >
                {sv ? 'Läs mer för skolor' : 'Learn more for schools'} →
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
