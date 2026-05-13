import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { LinkButton } from '@/components/public/Button';
import { Container } from '@/components/public/Container';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: `${dict.meta.siteName} — ${dict.meta.tagline}`,
    description:
      locale === 'sv'
        ? 'Elevante transkriberar lektionen och låter dig fråga om den. På svenska. GDPR-säkert.'
        : 'Elevante transcribes the lesson and lets you ask about it. In Swedish. GDPR-safe.',
  };
}

// Editorial Calm — implementerat enligt Stitch screen 01-landing.png

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;
  const sv = locale === 'sv';

  return (
    <>
      {/* HERO — asymmetrisk 55/45 */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28">
        <Container width="wide">
          <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-7">
              <h1 className="font-serif text-[clamp(2.5rem,5vw+1rem,5rem)] leading-[1.02] tracking-[-0.01em] text-[var(--color-ink)]">
                {sv
                  ? 'Elevante kommer ihåg allt du missade på lektionen.'
                  : 'Elevante remembers everything you missed in class.'}
              </h1>
              <p className="mt-8 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)] md:text-[1.125rem]">
                {sv
                  ? 'Elevante transkriberar lektionen och låter dig fråga om den. På svenska. GDPR-säkert.'
                  : 'Elevante transcribes the lesson and lets you ask about it. In Swedish. GDPR-safe.'}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-5">
                <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                  {sv ? 'Boka demo' : 'Book demo'}
                </LinkButton>
                <LinkButton href={`${base}/lararappen`} variant="text" size="lg">
                  {sv ? 'Klicka igenom appen' : 'Click through the app'} →
                </LinkButton>
              </div>
            </div>

            {/* Device-frame mockup av chatten */}
            <div className="md:col-span-5">
              <ChatMockup locale={locale} />
            </div>
          </div>
        </Container>
      </section>

      {/* Editorial photo placeholder */}
      <section className="border-t border-[var(--color-sand)] py-12 md:py-16">
        <Container width="wide">
          <div className="relative aspect-[16/7] w-full overflow-hidden rounded-[20px] bg-[var(--color-sand)]/40">
            <div
              className="absolute inset-0 bg-gradient-to-br from-[var(--color-sand)]/60 via-[var(--color-canvas)] to-[var(--color-sage)]/20"
              aria-hidden="true"
            />
          </div>
        </Container>
      </section>

      {/* "Elevante minns. Du fokuserar." — 2-col asymmetrisk */}
      <section id="hur-det-funkar" className="py-20 md:py-28">
        <Container width="wide">
          <div className="grid gap-12 md:grid-cols-12 md:gap-20">
            <div className="md:col-span-5">
              <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,3rem)] leading-[1.1] tracking-[-0.01em] text-[var(--color-ink)]">
                {sv ? 'Elevante minns. Du fokuserar.' : 'Elevante remembers. You focus.'}
              </h2>
            </div>
            <div className="space-y-8 md:col-span-7">
              <p className="text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'Tre steg. Inga möten med IT. Inga installationer. Läraren börjar spela in, AI transkriberar lektionen, eleverna får svar med exakt referens till var i lektionen det sades.'
                  : 'Three steps. No IT meetings. No installations. Teacher records, AI transcribes, students get answers referenced back to where it was said.'}
              </p>
              <ol className="space-y-6">
                <NumberedStep
                  number="01"
                  title={sv ? 'Läraren spelar in lektionen' : 'The teacher records the lesson'}
                  body={
                    sv
                      ? 'Ett tryck i appen. Schemat hämtas automatiskt — läraren behöver inte tagga lektionen.'
                      : 'One tap in the app. The schedule loads automatically — no tagging required.'
                  }
                />
                <NumberedStep
                  number="02"
                  title={sv ? 'AI transkriberar och förstår' : 'AI transcribes and understands'}
                  body={
                    sv
                      ? 'Svensk taligenkänning (KB-Whisper) i EU. Råljudet raderas. Bara texten sparas.'
                      : 'Swedish speech recognition (KB-Whisper) in the EU. Raw audio is deleted. Only text is kept.'
                  }
                />
                <NumberedStep
                  number="03"
                  title={sv ? 'Du frågar — Elevante svarar med källa' : 'You ask — Elevante answers with source'}
                  body={
                    sv
                      ? 'Strikt RAG. Aldrig påhittat. Varje svar pekar tillbaka till exakt minutsekvens där läraren förklarade.'
                      : 'Strict RAG. Never hallucinated. Every answer points back to the exact moment in the lesson.'
                  }
                />
              </ol>
            </div>
          </div>
        </Container>
      </section>

      {/* Pricing teaser — ink box */}
      <section className="py-20 md:py-28">
        <Container width="wide">
          <div className="rounded-[20px] bg-[var(--color-ink)] p-10 md:p-16">
            <div className="grid items-center gap-8 md:grid-cols-12 md:gap-12">
              <div className="md:col-span-8">
                <p className="font-serif text-[clamp(2rem,3vw+1rem,3.5rem)] leading-tight text-[var(--color-canvas)]">
                  {sv ? '500 kr per elev per år' : 'SEK 500 per student per year'}
                </p>
                <p className="mt-3 text-[1rem] text-[var(--color-canvas)]/70">
                  {sv ? 'Allt ingår. Inga dolda kostnader.' : 'Everything included. No hidden fees.'}
                </p>
              </div>
              <div className="md:col-span-4 md:text-right">
                <Link
                  href={`${base}/priser`}
                  className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--color-canvas)]/30 px-6 py-3 text-[0.9375rem] font-medium text-[var(--color-canvas)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
                >
                  {sv ? 'Se prisplaner' : 'See pricing'} →
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function NumberedStep({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-5">
      <span className="font-serif text-[1.125rem] text-[var(--color-ink-muted)] tabular-nums">
        {number}
      </span>
      <div>
        <h3 className="font-serif text-[1.25rem] leading-snug text-[var(--color-ink)]">
          {title}
        </h3>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {body}
        </p>
      </div>
    </li>
  );
}

function ChatMockup({ locale }: { locale: string }) {
  const sv = locale === 'sv';
  return (
    <div className="relative mx-auto max-w-md rotate-[-1.5deg] rounded-[24px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5 shadow-[0_24px_60px_-16px_rgba(26,26,46,0.18)] md:rotate-[-2deg]">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--color-sand)] pb-3">
        <span className="font-serif text-[0.875rem] text-[var(--color-ink)]">
          Elevante
        </span>
        <span className="text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
          Matematik 4
        </span>
      </div>
      {/* Student message */}
      <div className="mb-4 flex justify-end">
        <div className="max-w-[80%] rounded-[16px] bg-[var(--color-ink)] px-4 py-2.5 text-[0.875rem] text-[var(--color-canvas)]">
          {sv ? 'Vad var poängen med integralerna idag?' : 'What was the point of integrals today?'}
        </div>
      </div>
      {/* AI response */}
      <div className="space-y-3">
        <p className="text-[0.875rem] leading-relaxed text-[var(--color-ink)]">
          {sv
            ? 'En integral räknar ihop små bitar till en helhet. På dagens lektion räknade ni arean under en kurva — det är samma idé.'
            : 'An integral adds up tiny pieces into a whole. Today you computed the area under a curve — same idea.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="source-pill">
            <span className="status-dot status-dot--sage" />
            {sv ? 'Lektion 12 · 23:14' : 'Lesson 12 · 23:14'}
          </span>
          <span className="source-pill">
            <span className="status-dot status-dot--sage" />
            {sv ? 'Lektion 12 · 28:47' : 'Lesson 12 · 28:47'}
          </span>
        </div>
      </div>
    </div>
  );
}
