import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { LinkButton } from '@/components/public/Button';
import { Container } from '@/components/public/Container';
import { Faq, type FaqItem } from '@/components/public/Faq';

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
      ? 'Du missar inget. Lovar. Elevante kommer ihåg lektionen så du kan fråga om allt.'
      : 'You miss nothing. Promise. Elevante remembers the lesson so you can ask anything.',
  };
}

// Editorial Calm — Stitch screen 05-for-elever.png

export default async function ForStudentsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;
  const sv = locale === 'sv';

  const faqs: FaqItem[] = sv
    ? [
        {
          q: 'Vad är Elevante?',
          a: 'Elevante är ett verktyg som kommer ihåg dina lektioner åt dig. Läraren spelar in lektionen, och sedan kan du skriva frågor om den i en chat. Du får svar på det läraren faktiskt sa — och ser var i lektionen det sas.',
        },
        {
          q: 'Är det fusk att använda Elevante?',
          a: 'Nej. Elevante skriver inte dina inlämningsuppgifter och gör inte jobbet åt dig. Det förklarar vad läraren gick igenom, ungefär som om du frågade en klasskompis som var uppmärksam. Du lär dig fortfarande själv — du slipper bara gissa.',
        },
        {
          q: 'Kan läraren se vad jag frågar Elevante?',
          a: 'Nej. Dina chattar är privata. Läraren och skolan kan inte läsa vad du frågar om eller vad Elevante svarar. Det ska kännas tryggt att ställa även de frågor du inte vågar räcka upp handen för.',
        },
        {
          q: 'Vad gör jag om jag missat en hel lektion?',
          a: 'Då kan du fråga Elevante om hela lektionen. Be om en sammanfattning, eller fråga om en specifik sak du undrar över. Elevante svarar utifrån vad läraren sa, så du kommer ikapp utan att låna någons anteckningar.',
        },
        {
          q: 'Kan jag använda Elevante när jag pluggar inför prov?',
          a: 'Ja, det är då Elevante är som mest användbart. Du kan fråga om vad som helst från terminen och be Elevante förklara ett begrepp, sammanfatta ett kapitel eller ge dig en övningsfråga. Allt bygger på dina egna lektioner, inte på en lärobok.',
        },
        {
          q: 'Vad händer om jag frågar om något som inte togs upp på lektionen?',
          a: 'Då säger Elevante det rakt ut — "det togs inte upp på den här lektionen". Elevante hittar aldrig på ett svar bara för att låta hjälpsamt. Det är hela poängen: du kan lita på att svaret kommer från din lektion.',
        },
        {
          q: 'Kostar Elevante något för mig som elev?',
          a: 'Nej. Det är skolan som betalar för Elevante. För dig som elev är det gratis, och det finns inga gränser för hur mycket du får fråga.',
        },
        {
          q: 'Vilka ämnen funkar Elevante för?',
          a: 'Elevante funkar för alla ämnen där läraren pratar — matte, historia, samhällskunskap, naturkunskap, språk och mer. Så länge läraren spelar in lektionen kan du fråga om den efteråt.',
        },
        {
          q: 'Hur kommer jag igång med Elevante?',
          a: 'Din skola behöver först börja använda Elevante. Om de inte gör det än kan du tipsa dem — skicka ett mail eller be din lärare att höra av sig till oss. Vi kontaktar skolan inom en arbetsdag.',
        },
      ]
    : [
        {
          q: 'What is Elevante?',
          a: 'Elevante is a tool that remembers your lessons for you. The teacher records the lesson, and then you can type questions about it in a chat. You get answers based on what the teacher actually said — and you see where in the lesson it was said.',
        },
        {
          q: 'Is it cheating to use Elevante?',
          a: 'No. Elevante does not write your assignments and does not do the work for you. It explains what the teacher covered, much like asking a classmate who was paying attention. You still learn it yourself — you just don\'t have to guess.',
        },
        {
          q: 'Can the teacher see what I ask Elevante?',
          a: 'No. Your chats are private. The teacher and the school cannot read what you ask or what Elevante answers. It should feel safe to ask even the questions you wouldn\'t raise your hand for.',
        },
        {
          q: 'What do I do if I missed a whole lesson?',
          a: 'Then you can ask Elevante about the whole lesson. Ask for a summary, or ask about a specific thing you\'re unsure of. Elevante answers from what the teacher said, so you catch up without borrowing anyone\'s notes.',
        },
        {
          q: 'Can I use Elevante when studying for a test?',
          a: 'Yes — that\'s when Elevante is most useful. You can ask about anything from the term and have Elevante explain a concept, summarise a chapter or give you a practice question. It\'s all based on your own lessons, not on a textbook.',
        },
        {
          q: 'What happens if I ask about something that wasn\'t covered in class?',
          a: 'Then Elevante says so plainly — "that wasn\'t covered in this lesson". Elevante never makes up an answer just to sound helpful. That\'s the whole point: you can trust that the answer comes from your lesson.',
        },
        {
          q: 'Does Elevante cost anything for me as a student?',
          a: 'No. The school pays for Elevante. For you as a student it is free, and there is no limit on how much you can ask.',
        },
        {
          q: 'Which subjects does Elevante work for?',
          a: 'Elevante works for any subject where the teacher talks — maths, history, social studies, science, languages and more. As long as the teacher records the lesson, you can ask about it afterwards.',
        },
        {
          q: 'How do I get started with Elevante?',
          a: 'Your school needs to start using Elevante first. If they don\'t yet, you can tip them off — send an email or ask your teacher to get in touch with us. We contact the school within one business day.',
        },
      ];

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
                    <span className="italic text-[var(--color-coral)]">Lovar.</span>
                  </>
                ) : (
                  <>
                    You miss nothing.{' '}
                    <span className="italic text-[var(--color-coral)]">Promise.</span>
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

      {/* FAQ — AEO-motorn */}
      <section className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="content">
          <Faq
            heading={sv ? 'Frågor från elever' : 'Questions from students'}
            intro={
              sv
                ? 'Det elever oftast undrar innan de börjar använda Elevante.'
                : 'What students most often wonder before they start using Elevante.'
            }
            items={faqs}
          />
        </Container>
      </section>

      {/* BE DIN LÄRARE PROVA CTA */}
      <section className="pb-24 pt-8 md:pb-32">
        <Container width="content">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.75rem)] leading-tight text-[var(--color-ink)]">
              {sv ? 'Be din lärare prova' : 'Ask your teacher to try it'}
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <LinkButton href={`${base}/kontakt?topic=elev`} size="lg">
                {sv ? 'Skicka tips till skolan' : 'Send a tip to the school'}
              </LinkButton>
              <LinkButton href={`${base}/lararappen`} variant="ghost" size="lg">
                {sv ? 'Visa lärar-appen' : 'Show the teacher app'} →
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
