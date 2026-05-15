import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { LinkButton } from '@/components/public/Button';
import { Container } from '@/components/public/Container';
import { Faq, type FaqItem } from '@/components/public/Faq';
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

  const faqs: FaqItem[] = sv
    ? [
        {
          q: 'Vad är Elevante?',
          a: 'Elevante är en svensk plattform som spelar in och transkriberar lektioner så att eleverna kan ställa frågor om dem efteråt. Läraren trycker på en knapp i mobilappen, AI:n transkriberar lektionen, och eleverna chattar sedan med innehållet. Svaren bygger bara på det som faktiskt sades i klassrummet.',
        },
        {
          q: 'Hur fungerar Elevante?',
          a: 'Det sker i tre steg. Läraren spelar in lektionen med ett tryck i appen, svensk taligenkänning transkriberar ljudet inom EU, och eleven ställer frågor i en textchat. Varje svar pekar tillbaka till exakt var i lektionen läraren förklarade saken.',
        },
        {
          q: 'Hittar Elevante på svar, som en vanlig chatbot?',
          a: 'Nej. Elevante använder strikt RAG, vilket betyder att AI:n bara får svara utifrån lektionens transkribering. Om något inte togs upp på lektionen säger Elevante det rakt ut istället för att gissa. Varje svar visar dessutom källan så att eleven kan kontrollera den.',
        },
        {
          q: 'Är Elevante GDPR-säkert?',
          a: 'Ja. All data lagras inom EU och råljudet raderas så fort transkriberingen är klar. Vi har ett personuppgiftsbiträdesavtal redo innan första uppladdningen och tränar aldrig AI-modeller på elevernas data.',
        },
        {
          q: 'Behöver skolan installera utrustning eller hårdvara?',
          a: 'Nej. Läraren laddar ner mobilappen och kan börja spela in samma dag. Det finns ingen utrustning att köpa in, inga installationer och ingen IT-uppsättning.',
        },
        {
          q: 'Ersätter Elevante läraren?',
          a: 'Nej. Elevante tar hand om återupprepade frågor efter lektionen så att läraren får tid till det som faktiskt kräver en lärare. Det är ett verktyg som förlänger lektionen, inte en ersättning för undervisningen.',
        },
        {
          q: 'Vad kostar Elevante?',
          a: 'Elevante kostar 500 kr per elev och år, och då ingår allt — inspelning, transkribering, AI-chat och support. Det finns inga setup-avgifter och inga tilläggskostnader per lektion eller fråga. Skolor med över 1 000 elever får volymrabatt.',
        },
        {
          q: 'Vilka skolor använder Elevante?',
          a: 'Elevante pilottestas på Nacka Gymnasium under 2026 med cirka 2 000 elever. Plattformen är byggd för svenska och nordiska gymnasieskolor. Vill din skola vara med tidigt går det bra att boka en demo.',
        },
      ]
    : [
        {
          q: 'What is Elevante?',
          a: 'Elevante is a Swedish platform that records and transcribes classroom lessons so students can ask questions about them afterwards. The teacher taps a button in the mobile app, AI transcribes the lesson, and students then chat with the content. Answers are based only on what was actually said in class.',
        },
        {
          q: 'How does Elevante work?',
          a: 'It works in three steps. The teacher records the lesson with one tap in the app, Swedish speech recognition transcribes the audio inside the EU, and the student asks questions in a text chat. Every answer points back to exactly where in the lesson the teacher explained it.',
        },
        {
          q: 'Does Elevante make up answers, like a regular chatbot?',
          a: 'No. Elevante uses strict RAG, which means the AI may only answer from the lesson transcript. If something was not covered in class, Elevante says so plainly instead of guessing. Every answer also shows its source so the student can check it.',
        },
        {
          q: 'Is Elevante GDPR-safe?',
          a: 'Yes. All data is stored inside the EU and raw audio is deleted as soon as transcription is finished. We have a data processing agreement ready before the first upload and never train AI models on student data.',
        },
        {
          q: 'Does the school need to install equipment or hardware?',
          a: 'No. The teacher downloads the mobile app and can start recording the same day. There is no equipment to buy, no installations and no IT setup.',
        },
        {
          q: 'Does Elevante replace the teacher?',
          a: 'No. Elevante handles repeated questions after the lesson so the teacher gets time back for what actually needs a teacher. It is a tool that extends the lesson, not a replacement for teaching.',
        },
        {
          q: 'What does Elevante cost?',
          a: 'Elevante costs SEK 500 per student per year, and everything is included — recording, transcription, AI chat and support. There are no setup fees and no extra charges per lesson or question. Schools with more than 1,000 students get a volume discount.',
        },
        {
          q: 'Which schools use Elevante?',
          a: 'Elevante is being piloted at Nacka Gymnasium during 2026 with around 2,000 students. The platform is built for Swedish and Nordic upper-secondary schools. If your school wants to join early, you are welcome to book a demo.',
        },
      ];

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

      {/* FAQ — AEO-motorn */}
      <section className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="content">
          <Faq
            heading={sv ? 'Vanliga frågor' : 'Frequently asked questions'}
            intro={
              sv
                ? 'Det vi oftast får höra från skolor, lärare och elever.'
                : 'What schools, teachers and students most often ask us.'
            }
            items={faqs}
          />
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
