import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { LinkButton } from '@/components/public/Button';
import { Container } from '@/components/public/Container';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const sv = locale === 'sv';
  return {
    title: sv ? 'För skolor — Elevante' : 'For schools — Elevante',
    description: sv
      ? 'Lyft hela skolan. Inte bara en klass. GDPR-säkert, byggt i Sverige.'
      : 'Lift the whole school. Not just one class. GDPR-safe, built in Sweden.',
  };
}

// Editorial Calm — Stitch screen 04-for-skolor.png

export default async function ForSchoolsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;
  const sv = locale === 'sv';

  return (
    <>
      {/* HERO — 60/40 asymmetrisk */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28">
        <Container width="wide">
          <div className="grid items-end gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-7">
              <p className="eyebrow mb-6">
                {sv ? 'För skolledning och huvudmän' : 'For school leaders and operators'}
              </p>
              <h1 className="font-serif text-[clamp(2.25rem,4.5vw+1rem,4rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
                {sv ? 'Lyft hela skolan. Inte bara en klass.' : 'Lift the whole school. Not just one class.'}
              </h1>
              <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'Elevante ger eleverna ett verktyg som faktiskt fungerar. Och lärarna mindre administration.'
                  : 'Elevante gives students a tool that actually works. And teachers less admin.'}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                  {sv ? 'Boka demo' : 'Book demo'}
                </LinkButton>
                <LinkButton href={`${base}/kontakt?topic=faktablad`} variant="text" size="lg">
                  {sv ? 'Ladda ner faktablad (PDF)' : 'Download factsheet (PDF)'} →
                </LinkButton>
              </div>
            </div>

            {/* Pull-stat 94% */}
            <div className="md:col-span-5">
              <div className="border-l-2 border-[var(--color-coral)] pl-8">
                <p className="font-serif text-[clamp(4.5rem,7vw+1rem,7rem)] leading-[0.95] tracking-[-0.02em] text-[var(--color-ink)]">
                  94%
                </p>
                <p className="mt-4 max-w-[18rem] text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {sv
                    ? 'av eleverna i pilotklassen vill fortsätta använda Elevante.'
                    : 'of pilot students want to keep using Elevante.'}
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Divider />

      {/* DET HÄR LÖSER ELEVANTE */}
      <section className="py-20 md:py-28">
        <Container width="wide">
          <h2 className="font-serif text-[clamp(1.625rem,1.5vw+1rem,2rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Det här löser Elevante' : 'What Elevante solves'}
          </h2>
          <div className="mt-16 grid gap-12 md:grid-cols-12 md:gap-16">
            <SolveItem
              quote={sv ? 'Eleven slutar säga "jag fattade inte".' : 'Students stop saying "I didn\'t get it".'}
              body={
                sv
                  ? 'Lektionen finns kvar. Eleven kan fråga om den när som helst — och få svar på det läraren faktiskt sa, inte en gissning.'
                  : 'The lesson stays. Students can ask about it any time — and get answers from what the teacher actually said.'
              }
            />
            <SolveItem
              quote={sv ? 'Läraren slipper svara på samma fråga 30 gånger.' : 'Teachers stop answering the same question 30 times.'}
              body={
                sv
                  ? 'AI svarar på återupprepade frågor. Läraren får tid till det som faktiskt kräver en lärare.'
                  : 'AI answers the repeats. Teachers get time back for what actually needs a teacher.'
              }
            />
            <SolveItem
              quote={sv ? 'Skolledningen ser var det glappar — innan provet.' : 'Leadership sees the gaps — before the test.'}
              body={
                sv
                  ? 'Statistik per kurs visar vad eleverna faktiskt frågar om. Då vet ni var stödet behövs.'
                  : 'Per-course statistics show what students are actually asking. Then you know where support is needed.'
              }
            />
          </div>
        </Container>
      </section>

      {/* GDPR / TEKNISK TRYGGHET */}
      <section className="bg-[var(--color-surface-soft)] py-20 md:py-28">
        <Container width="wide">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.75rem)] leading-[1.1] text-[var(--color-ink)]">
                {sv ? 'Byggt i Sverige. Lagras i Stockholm.' : 'Built in Sweden. Stored in Stockholm.'}
              </h2>
              <p className="mt-6 max-w-md text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'Vi tar GDPR på allvar för att vi själva är föräldrar och elever. Inget av detta är ett påslag — det är hela arkitekturen.'
                  : 'We take GDPR seriously because we\'re parents and former students ourselves. It isn\'t an add-on — it\'s the architecture.'}
              </p>
            </div>
            <div className="md:col-span-7">
              <div className="rounded-[20px] bg-[var(--color-surface)] p-8 md:p-10">
                <ul className="divide-y divide-[var(--color-sand)]">
                  {[
                    sv ? 'All data inom EU. Aldrig i USA.' : 'All data in the EU. Never in the US.',
                    sv ? 'GDPR-DPA påskrivet innan första uppladdning.' : 'GDPR-DPA signed before first upload.',
                    sv ? 'Svensk taligenkänning (KB-Whisper) optimerad för svenska.' : 'Swedish speech recognition (KB-Whisper).',
                    sv ? 'Row Level Security per skola — ingen ser någon annans data.' : 'Row Level Security per school — no cross-tenant access.',
                    sv ? 'Ingen modellträning på elevdata. Aldrig.' : 'No model training on student data. Ever.',
                  ].map((bullet, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <span className="status-dot status-dot--sage mt-2.5" />
                      <span className="text-[0.9375rem] leading-relaxed text-[var(--color-ink)]">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* PRICING RECAP */}
      <section className="py-20 md:py-28">
        <Container width="wide">
          <div className="grid items-center gap-8 md:grid-cols-12">
            <div className="md:col-span-8">
              <p className="font-serif text-[clamp(2rem,3vw+1rem,3.25rem)] leading-tight text-[var(--color-ink)]">
                {sv ? '500 kr / elev / år' : 'SEK 500 / student / year'}
              </p>
              <p className="mt-3 text-[1rem] text-[var(--color-ink-secondary)]">
                {sv ? 'Allt ingår. Volymrabatter över 1 000 elever.' : 'Everything included. Volume discounts over 1,000 students.'}
              </p>
            </div>
            <div className="md:col-span-4 md:text-right">
              <LinkButton href={`${base}/priser`} variant="ghost" size="md">
                {sv ? 'Se prisplaner' : 'See pricing'} →
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>

    </>
  );
}

function SolveItem({ quote, body }: { quote: string; body: string }) {
  return (
    <article className="md:col-span-4">
      <p className="font-serif text-[clamp(1.25rem,1.2vw+1rem,1.5rem)] italic leading-snug text-[var(--color-ink)]">
        {quote}
      </p>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
        {body}
      </p>
    </article>
  );
}

function Divider() {
  return <div className="container-wide"><div className="h-px bg-[var(--color-sand)]" /></div>;
}
