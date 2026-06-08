import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { LinkButton } from '@/components/public/Button';
import { Container } from '@/components/public/Container';
import { Faq, type FaqItem } from '@/components/public/Faq';
import { RotatingHeadline } from '@/components/public/RotatingHeadline';
import { notFound } from 'next/navigation';
import { urlFor } from '@/lib/site';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    // Absolute title — undviker att layout-templaten lägger till "· Elevante"
    // efter en titel som redan inleds med "Elevante —".
    title: { absolute: `${dict.meta.siteName} — ${dict.meta.tagline}` },
    description:
      locale === 'sv'
        ? 'Läraren spelar in lektionen med två tryck. Sen kan eleven fråga om allt som sas — och få svar med källa, aldrig en gissning.'
        : 'The teacher records the lesson with two taps. Then students can ask about everything that was said — and get answers with a source, never a guess.',
  };
}

// Editorial Calm — startsidan byggd som router: storidé → loop → tre dörrar → trygghet → FAQ → CTA.

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;
  const sv = locale === 'sv';

  const trustPoints: string[] = sv
    ? [
        'All data inom EU. Aldrig i USA.',
        'Råljudet raderas så fort lektionen transkriberats.',
        'Personuppgiftsbiträdesavtal innan första uppladdningen.',
        'Svensk taligenkänning (KB-Whisper), optimerad för svenska.',
        'Ingen AI tränas på elevdata. Aldrig.',
      ]
    : [
        'All data inside the EU. Never in the US.',
        'Raw audio is deleted as soon as the lesson is transcribed.',
        'A data processing agreement signed before the first upload.',
        'Swedish speech recognition (KB-Whisper), tuned for Swedish.',
        'No AI is trained on student data. Ever.',
      ];

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
          q: 'Vilka skolor är Elevante till för?',
          a: 'Elevante är byggt för svenska och nordiska gymnasieskolor och rullas ut för pilot under 2026. Det finns ingen minimigräns — vill din skola vara med tidigt går det bra att boka en demo.',
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
          q: 'Which schools is Elevante for?',
          a: 'Elevante is built for Swedish and Nordic upper-secondary schools and is rolling out for pilots during 2026. There is no minimum size — if your school wants to join early, you are welcome to book a demo.',
        },
      ];

  // FAQPage-schemat emitteras av <Faq> nedan (enda källan). Bygg inte ett
  // parallellt schema här — det ger sidan två identiska FAQPage-block.

  return (
    <>
      {/* HERO */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28">
        <Container width="wide">
          <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-7">
              <RotatingHeadline locale={locale} />
              <p className="mt-8 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)] md:text-[1.125rem]">
                {sv
                  ? 'Läraren spelar in lektionen med två tryck. Sen kan eleven fråga om allt som sas — och få svar med källa, aldrig en gissning.'
                  : 'The teacher records the lesson with two taps. Then students can ask about everything that was said — and get answers with a source, never a guess.'}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-5">
                <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                  {sv ? 'Boka demo' : 'Book demo'}
                </LinkButton>
                <LinkButton href={`${base}/demo`} variant="text" size="lg">
                  {sv ? 'Klicka igenom Elevante-demon' : 'Click through the Elevante demo'} →
                </LinkButton>
              </div>
            </div>

            <div className="md:col-span-5">
              <ChatMockup locale={locale} />
            </div>
          </div>
        </Container>
      </section>

      {/* LOOPEN — visuell triptyk */}
      <section id="hur-det-funkar" className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="wide">
          <div className="max-w-2xl">
            <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,3rem)] leading-[1.1] tracking-[-0.01em] text-[var(--color-ink)]">
              {sv ? 'Spela in. Spara. Fråga.' : 'Record. Save. Ask.'}
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Tre steg, inget krångel. Inga möten med IT, inga installationer — läraren trycker igång, resten sköter sig.'
                : 'Three steps, no friction. No IT meetings, no installations — the teacher taps start, the rest takes care of itself.'}
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <LoopStep
              number="01"
              title={sv ? 'Läraren spelar in' : 'The teacher records'}
              body={
                sv
                  ? 'Ett tryck i appen. Schemat vet redan vilken lektion det är.'
                  : 'One tap in the app. The schedule already knows which lesson it is.'
              }
              visual={<RecVisual sv={sv} />}
            />
            <LoopStep
              number="02"
              title={sv ? 'AI transkriberar' : 'AI transcribes'}
              body={
                sv
                  ? 'Svensk taligenkänning i EU. Råljudet raderas — bara texten sparas.'
                  : 'Swedish speech recognition in the EU. Raw audio is deleted — only text is kept.'
              }
              visual={<TranscribeVisual sv={sv} />}
            />
            <LoopStep
              number="03"
              title={sv ? 'Eleven frågar' : 'The student asks'}
              body={
                sv
                  ? 'Varje svar pekar tillbaka till exakt var i lektionen det sas.'
                  : 'Every answer points back to exactly where in the lesson it was said.'
              }
              visual={<AskVisual sv={sv} />}
            />
          </div>

          <div className="mt-12">
            <LinkButton href={`${base}/demo`} variant="text" size="md">
              {sv ? 'Klicka igenom hela demon' : 'Click through the full demo'} →
            </LinkButton>
          </div>
        </Container>
      </section>

      {/* TRE DÖRRAR — routern */}
      <section className="border-t border-[var(--color-sand)] bg-[var(--color-surface-soft)] py-20 md:py-28">
        <Container width="wide">
          <div className="max-w-2xl">
            <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,3rem)] leading-[1.1] tracking-[-0.01em] text-[var(--color-ink)]">
              {sv
                ? 'Tre vyer på samma lektion'
                : 'Three views of the same lesson'}
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Samma verktyg, tre perspektiv. Välj din ingång.'
                : 'One tool, three perspectives. Pick your way in.'}
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            <DoorCard
              href={`${base}/for-skolor`}
              label={sv ? 'För skolan' : 'For the school'}
              headline={sv ? 'Riskfritt att införa.' : 'Risk-free to roll out.'}
              body={
                sv
                  ? 'Ingen hårdvara, inget IT-projekt, ingen inlåsning — och GDPR löst från start.'
                  : 'No hardware, no IT project, no lock-in — and GDPR solved from the start.'
              }
              cta={sv ? 'För skolor' : 'For schools'}
              imageSrc="/images/linkedin-sales-unsplash.jpg"
              imageAlt={sv ? 'Lärare och skolledning diskuterar' : 'Teachers and school leadership discussing'}
            />
            <DoorCard
              href={`${base}/for-larare`}
              label={sv ? 'För läraren' : 'For the teacher'}
              headline={sv ? 'Du behåller kontrollen.' : 'You stay in control.'}
              body={
                sv
                  ? 'Du bestämmer när du spelar in. Inget övervakningsverktyg — tid och överblick tillbaka.'
                  : 'You decide when to record. Not a surveillance tool — time and oversight back.'
              }
              cta={sv ? 'För lärare' : 'For teachers'}
              imageSrc="/images/amy-hirschi-unsplash.jpg"
              imageAlt={sv ? 'Lärare i klassrummet' : 'Teacher in the classroom'}
            />
            <DoorCard
              href={`${base}/for-elever`}
              label={sv ? 'För eleven' : 'For the student'}
              headline={sv ? 'Du missar inget.' : 'You miss nothing.'}
              body={
                sv
                  ? 'Lektionen finns kvar. Fråga om allt — svaret kommer ur det läraren faktiskt sa.'
                  : 'The lesson stays. Ask about anything — the answer comes from what the teacher actually said.'
              }
              cta={sv ? 'För elever' : 'For students'}
              imageSrc="/images/felix-yu-unsplash.jpg"
              imageAlt={sv ? 'Elev som studerar' : 'Student studying'}
            />
          </div>
        </Container>
      </section>

      {/* TRYGGHET */}
      <section className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="wide">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <p className="eyebrow mb-6">{sv ? 'Tryggt' : 'Safe'}</p>
              <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.75rem)] leading-[1.1] text-[var(--color-ink)]">
                {sv ? 'Byggt i Sverige. Lagras i Berget.' : 'Built in Sweden. Stored in the mountain.'}
              </h2>
              <p className="mt-6 max-w-md text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'GDPR är inte ett påslag på Elevante — det är hela arkitekturen.'
                  : "GDPR isn't an add-on to Elevante — it's the architecture."}
              </p>
              <div className="mt-8 relative h-48 w-full overflow-hidden rounded-[16px]">
                <Image
                  src="/images/brooke-cagle-unsplash.jpg"
                  alt={sv ? 'Elever i samarbete' : 'Students collaborating'}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 42vw"
                />
              </div>
            </div>
            <div className="md:col-span-7">
              <div className="rounded-[20px] bg-[var(--color-surface)] p-8 md:p-10">
                <ul className="divide-y divide-[var(--color-sand)]">
                  {trustPoints.map((point) => (
                    <li key={point} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                      <span className="status-dot status-dot--sage mt-2.5" aria-hidden="true" />
                      <span className="text-[0.9375rem] leading-relaxed text-[var(--color-ink)]">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
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
            locale={locale}
            pageUrl={urlFor(locale)}
          />
        </Container>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--color-sand)] pb-24 pt-20 md:pb-32 md:pt-28">
        <Container width="content">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.75rem)] leading-tight text-[var(--color-ink)]">
              {sv ? 'Se Elevante live på en halvtimme.' : 'See Elevante live in 30 minutes.'}
            </h2>
            <p className="mt-4 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? '500 kr per elev och år, allt ingår. Boka en demo så visar vi hur det funkar.'
                : "SEK 500 per student per year, everything included. Book a demo and we'll show you how it works."}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                {sv ? 'Boka demo' : 'Book demo'}
              </LinkButton>
              <LinkButton href={`${base}/priser`} variant="ghost" size="lg">
                {sv ? 'Se prisplaner' : 'See pricing'} →
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

/* ── Loop-triptyk ──────────────────────────────────────────────── */
function LoopStep({
  number,
  title,
  body,
  visual,
}: {
  number: string;
  title: string;
  body: string;
  visual: ReactNode;
}) {
  return (
    <article className="flex flex-col">
      <div
        className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5"
        aria-hidden="true"
      >
        {visual}
      </div>
      <p className="mt-6 font-serif text-[1.25rem] leading-none text-[var(--color-coral)]">
        {number}
      </p>
      <h3 className="mt-3 font-serif text-[1.25rem] leading-snug text-[var(--color-ink)]">
        {title}
      </h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
        {body}
      </p>
    </article>
  );
}

function RecVisual({ sv }: { sv: boolean }) {
  return (
    <div className="rounded-[12px] bg-[var(--color-ink)] p-4">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-coral)]" aria-hidden="true" />
        <span className="text-[0.625rem] uppercase tracking-[0.1em] text-white/80">REC</span>
      </div>
      <p className="mt-3 font-serif text-[0.9375rem] leading-tight text-[var(--color-canvas)]">
        {sv ? 'Integralberäkning' : 'Integrals'}
      </p>
      <p className="mt-0.5 text-[0.6875rem] text-white/50">
        {sv ? '10:15 · Matematik 4' : '10:15 · Math 4'}
      </p>
    </div>
  );
}

function TranscribeVisual({ sv }: { sv: boolean }) {
  const bars = [40, 70, 30, 85, 55, 25, 60, 90, 45, 35, 75, 50, 65, 30, 80, 45];
  return (
    <div className="rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] p-4">
      <div className="flex h-9 items-center gap-[3px]" aria-hidden="true">
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-[var(--color-coral)]/70"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-3 text-[0.75rem] italic leading-relaxed text-[var(--color-ink-secondary)]">
        {sv
          ? '"…arean under kurvan mellan a och b…"'
          : '"…the area under the curve between a and b…"'}
      </p>
    </div>
  );
}

function AskVisual({ sv }: { sv: boolean }) {
  return (
    <div className="rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] p-4">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[12px] bg-[var(--color-ink)] px-3 py-1.5 text-[0.6875rem] leading-snug text-[var(--color-canvas)]">
          {sv ? 'Vad menades med integral?' : 'What did integral mean?'}
        </div>
      </div>
      <div className="mt-2.5">
        <span className="source-pill">
          <span className="status-dot status-dot--sage" />
          {sv ? 'Lektion · 10:15' : 'Lesson · 10:15'}
        </span>
      </div>
    </div>
  );
}

/* ── Målgruppsdörr ─────────────────────────────────────────────── */
function DoorCard({
  href,
  label,
  headline,
  body,
  cta,
  imageSrc,
  imageAlt,
}: {
  href: string;
  label: string;
  headline: string;
  body: string;
  cta: string;
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-[20px] border border-[var(--color-sand)] bg-[var(--color-surface)] transition-colors hover:border-[var(--color-ink-muted)]"
    >
      {imageSrc && (
        <div className="relative h-44 w-full overflow-hidden">
          <Image
            src={imageSrc}
            alt={imageAlt ?? ''}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-surface)]/20" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-8">
        <p className="eyebrow">{label}</p>
        <h3 className="mt-5 font-serif text-[1.5rem] leading-snug text-[var(--color-ink)]">
          {headline}
        </h3>
        <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {body}
        </p>
        <span className="mt-6 inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-[var(--color-ink)]">
          {cta}{' '}
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

/* ── Chattmockup i hjälten ─────────────────────────────────────── */
function ChatMockup({ locale }: { locale: string }) {
  const sv = locale === 'sv';
  return (
    <div className="relative mx-auto max-w-md rotate-[-1.5deg] rounded-[24px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5 shadow-[0_24px_60px_-16px_rgba(26,26,46,0.18)] md:rotate-[-2deg]">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--color-sand)] pb-3">
        <span className="font-serif text-[0.875rem] text-[var(--color-ink)]">
          Elevante
        </span>
        <span className="text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
          {sv ? 'Matematik 4' : 'Mathematics 4'}
        </span>
      </div>
      <div className="mb-4 flex justify-end">
        <div className="max-w-[80%] rounded-[16px] bg-[var(--color-ink)] px-4 py-2.5 text-[0.875rem] text-[var(--color-canvas)]">
          {sv ? 'Vad var poängen med integralerna idag?' : 'What was the point of integrals today?'}
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-[0.875rem] leading-relaxed text-[var(--color-ink)]">
          {sv
            ? 'En integral räknar ihop små bitar till en helhet. På dagens lektion räknade ni arean under en kurva — det är samma idé.'
            : 'An integral adds up tiny pieces into a whole. Today you computed the area under a curve — same idea.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="source-pill">
            <span className="status-dot status-dot--sage" aria-hidden="true" />
            {sv ? 'Lektion 12 · 23:14' : 'Lesson 12 · 23:14'}
          </span>
          <span className="source-pill">
            <span className="status-dot status-dot--sage" aria-hidden="true" />
            {sv ? 'Lektion 12 · 28:47' : 'Lesson 12 · 28:47'}
          </span>
        </div>
      </div>
    </div>
  );
}
