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
    title: sv ? 'För elever — Elevante' : 'For students — Elevante',
    description: sv
      ? 'Du missar inget. Lovat. Elevante kommer ihåg lektionen så du kan fråga om allt.'
      : 'You miss nothing. Promised. Elevante remembers the lesson so you can ask anything.',
  };
}

// Editorial Calm — Stitch screen 05-for-elever.png

export default async function ForStudentsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;
  const sv = locale === 'sv';

  return (
    <>
      {/* HERO — 50/50 asymmetrisk, varmare ton */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28">
        <Container width="wide">
          <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <h1 className="font-serif text-[clamp(3rem,6vw+1rem,6rem)] leading-[0.95] tracking-[-0.015em] text-[var(--color-ink)]">
                {sv ? (
                  <>
                    Du missar inget.{' '}
                    <span className="italic text-[var(--color-coral)]">Lovat.</span>
                  </>
                ) : (
                  <>
                    You miss nothing.{' '}
                    <span className="italic text-[var(--color-coral)]">Promised.</span>
                  </>
                )}
              </h1>
              <p className="mt-8 max-w-lg text-[1.125rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'Lektionen finns kvar. På riktigt. Du frågar — vi svarar med exakt vad läraren sa, och var det sas.'
                  : 'The lesson stays. Really. You ask — we answer with exactly what the teacher said, and where.'}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-5">
                <LinkButton href={`${base}/kontakt?topic=elev`} size="lg">
                  {sv ? 'Be din lärare prova' : 'Ask your teacher to try it'}
                </LinkButton>
                <LinkButton href="#hur" variant="text" size="lg">
                  {sv ? 'Hur det funkar' : 'How it works'} →
                </LinkButton>
              </div>
            </div>
            <div>
              <ChatPreview locale={locale} />
            </div>
          </div>
        </Container>
      </section>

      {/* SÅ HÄR PLUGGAR DU */}
      <section id="hur" className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="content">
          <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,3rem)] leading-[1.1] text-[var(--color-ink)]">
            {sv ? 'Så här pluggar du med Elevante' : 'How you study with Elevante'}
          </h2>

          <div className="mt-16 space-y-12">
            <StackedBlock
              title={sv ? 'Du kommer hem, du öppnar chatten.' : 'You get home, you open the chat.'}
              body={
                sv
                  ? 'Skriv vad du undrar om från dagens lektion. Elevante svarar med vad som faktiskt sas, inte vad ChatGPT gissar.'
                  : 'Write what you wonder about from today\'s lesson. Elevante answers with what was actually said, not what ChatGPT guesses.'
              }
            />
            <StackedBlock
              title={sv ? 'Inför provet — fråga om allt.' : 'Before the test — ask about everything.'}
              body={
                sv
                  ? 'Du kan fråga om vad som helst från terminen. Elevante hittar tillbaka till exakt minutsekvensen där läraren förklarade det.'
                  : 'You can ask about anything from the term. Elevante finds the exact minute the teacher explained it.'
              }
            />
            <StackedBlock
              title={sv ? 'Glömt en uppgift? Fråga om den.' : 'Forgot the assignment? Ask about it.'}
              body={
                sv
                  ? 'Elevante kommer ihåg när läraren gick igenom uppgiften och vad som sas.'
                  : 'Elevante remembers when the teacher gave the assignment and what was said.'
              }
            />
          </div>
        </Container>
      </section>

      {/* VAD ELEVANTE INTE GÖR */}
      <section className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="content">
          <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.25rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Vad Elevante INTE gör' : 'What Elevante does NOT do'}
          </h2>
          <ul className="mt-12 space-y-6">
            <NoBullet
              prefix="Elevante"
              suffix={
                sv
                  ? '...skriver inte inlämningsuppgifter åt dig.'
                  : '...does not write assignments for you.'
              }
            />
            <NoBullet
              prefix="Elevante"
              suffix={
                sv
                  ? '...gissar inte. Säger "det togs inte upp" om det inte sas på lektionen.'
                  : '...does not guess. Says "it wasn\'t covered" if it wasn\'t said in class.'
              }
            />
            <NoBullet
              prefix="Elevante"
              suffix={
                sv
                  ? '...delar inte dina chattar med läraren.'
                  : '...does not share your chats with the teacher.'
              }
            />
          </ul>
        </Container>
      </section>

      {/* BE DIN LÄRARE PROVA CTA */}
      <section className="pb-24 pt-8 md:pb-32">
        <Container width="content">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.75rem)] leading-tight text-[var(--color-ink)]">
              {sv ? 'Be din lärare prova' : 'Ask your teacher to try it'}
            </h2>
            <div className="mt-8">
              <LinkButton href={`${base}/kontakt?topic=elev`} size="lg">
                {sv ? 'Skicka tips till skolan' : 'Send a tip to the school'}
              </LinkButton>
            </div>
            <p className="mt-4 text-[0.875rem] text-[var(--color-ink-muted)]">
              {sv
                ? 'Vi tar kontakt med skolan inom en arbetsdag.'
                : 'We\'ll contact the school within a business day.'}
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}

function StackedBlock({ title, body }: { title: string; body: string }) {
  return (
    <article className="grid gap-6 border-t border-[var(--color-sand)] pt-8 md:grid-cols-12 md:gap-10">
      <h3 className="font-serif text-[clamp(1.5rem,1.5vw+1rem,2rem)] leading-snug text-[var(--color-ink)] md:col-span-5">
        {title}
      </h3>
      <p className="text-[1rem] leading-relaxed text-[var(--color-ink-secondary)] md:col-span-7">
        {body}
      </p>
    </article>
  );
}

function NoBullet({ prefix, suffix }: { prefix: string; suffix: string }) {
  return (
    <li className="flex items-baseline gap-3 border-l-2 border-[var(--color-coral)] pl-5">
      <span className="font-serif italic text-[var(--color-ink)]">{prefix}</span>
      <span className="text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
        {suffix}
      </span>
    </li>
  );
}

function ChatPreview({ locale }: { locale: string }) {
  const sv = locale === 'sv';
  return (
    <div className="relative mx-auto max-w-md rotate-[-1deg] rounded-[24px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5 shadow-[0_24px_60px_-16px_rgba(26,26,46,0.18)]">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--color-sand)] pb-3">
        <span className="font-serif text-[0.875rem] text-[var(--color-ink)]">
          Elevante
        </span>
        <span className="text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
          {sv ? 'Historia 2b' : 'History 2b'}
        </span>
      </div>
      <div className="mb-4 flex justify-end">
        <div className="max-w-[80%] rounded-[16px] bg-[var(--color-ink)] px-4 py-2.5 text-[0.875rem] text-[var(--color-canvas)]">
          {sv ? 'Vilka var huvudorsakerna till första världskriget?' : 'What were the main causes of WWI?'}
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-[0.875rem] leading-relaxed text-[var(--color-ink)]">
          {sv
            ? 'På dagens lektion gick ni igenom fyra orsaker — militarism, alliansavtal, imperialism och nationalism. Mathias kallade dem MAIN.'
            : 'In today\'s class you covered four causes — militarism, alliances, imperialism and nationalism. Mathias called them MAIN.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="source-pill">
            <span className="status-dot status-dot--sage" />
            {sv ? 'Lektion 7 · 14:22' : 'Lesson 7 · 14:22'}
          </span>
        </div>
      </div>
    </div>
  );
}
