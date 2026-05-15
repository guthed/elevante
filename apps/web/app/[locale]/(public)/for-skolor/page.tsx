import type { Metadata } from 'next';
import Link from 'next/link';
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

  const faqs: FaqItem[] = sv
    ? [
        {
          q: 'Hur lång tid tar det att införa Elevante på en skola?',
          a: 'Elevante är byggt för att kunna införas över en eftermiddag. Det finns ingen hårdvara att beställa och ingen installation som kräver IT-avdelningen. När GDPR-avtalet är påskrivet och vi fått tillgång till schemat kan lärarna börja spela in nästa dag.',
        },
        {
          q: 'Behöver vi köpa in hårdvara eller utrustning?',
          a: 'Nej. Elevante använder den mobiltelefon läraren redan har. Det finns inga mikrofoner att montera, ingen utrustning i klassrummet och inga licenser att administrera per dator.',
        },
        {
          q: 'Hur hanterar Elevante GDPR och elevernas personuppgifter?',
          a: 'All persondata behandlas inom EU och vi skriver ett personuppgiftsbiträdesavtal med skolan innan första uppladdningen. Råljudet raderas så fort transkriberingen är klar, så det enda som sparas är text. Vi har också ett samtyckesflöde för minderåriga inbyggt från start.',
        },
        {
          q: 'Var lagras lektionsljudet och transkriberingarna?',
          a: 'Lektionsljud och transkriberingar lagras i Stockholm, på Supabase EU och AWS Stockholm. Inget av det lämnar EU. Råljudet finns bara kvar tills transkriberingen är klar — sedan raderas det automatiskt.',
        },
        {
          q: 'Vad krävs av lärarna rent praktiskt?',
          a: 'Läraren laddar ner appen och trycker på REC när lektionen börjar. Schemat hämtas automatiskt, så läraren behöver inte tagga eller namnge lektioner. Det är som mest två tryck per lektion, och inget efterarbete.',
        },
        {
          q: 'Hur ser skolledningen att Elevante faktiskt används?',
          a: 'Skolan får en adminvy med statistik per kurs och klass. Där ser ni hur många lektioner som spelats in, hur mycket eleverna frågar och vilka kurser som används mest. Det gör att ni kan se var stödet behövs innan provresultaten kommer.',
        },
        {
          q: 'Tränar ni AI-modeller på våra elevers data?',
          a: 'Nej, aldrig. Elevernas röster och transkriberingar används bara för att svara den enskilda eleven om den enskilda lektionen. Vi tränar inga modeller på elevdata, och vår AI-leverantör Anthropic gör det inte heller.',
        },
        {
          q: 'Vad händer med vår data om vi avslutar avtalet?',
          a: 'Om ni avslutar avtalet exporterar vi all er data till er och raderar våra kopior inom 30 dagar. Det finns ingen inlåsning — datan tillhör skolan, inte oss.',
        },
        {
          q: 'Passar Elevante en enskild skola eller bara kommuner?',
          a: 'Båda. Priset och produkten är desamma oavsett om ni är en fristående skola eller en kommun med många skolor. Det finns ingen minimigräns, och ni kan börja med en klass på pilot innan ni rullar ut det brett.',
        },
        {
          q: 'Hur skiljer sig Elevante från en vanlig lärplattform?',
          a: 'En lärplattform är till för att administrera kurser, uppgifter och betyg. Elevante gör något annat: det bevarar själva lektionen så att eleven kan fråga om den efteråt. Elevante ersätter inte er lärplattform — det fyller gapet den lämnar när lektionen är slut.',
        },
      ]
    : [
        {
          q: 'How long does it take to roll out Elevante at a school?',
          a: 'Elevante is built to be rolled out over a single afternoon. There is no hardware to order and no installation that needs the IT department. Once the GDPR agreement is signed and we have access to the schedule, teachers can start recording the next day.',
        },
        {
          q: 'Do we need to buy hardware or equipment?',
          a: 'No. Elevante uses the mobile phone the teacher already has. There are no microphones to mount, no equipment in the classroom and no per-computer licences to administer.',
        },
        {
          q: 'How does Elevante handle GDPR and student personal data?',
          a: 'All personal data is processed inside the EU, and we sign a data processing agreement with the school before the first upload. Raw audio is deleted as soon as transcription is finished, so the only thing kept is text. We also have a consent flow for minors built in from the start.',
        },
        {
          q: 'Where are lesson audio and transcripts stored?',
          a: 'Lesson audio and transcripts are stored in Stockholm, on Supabase EU and AWS Stockholm. None of it leaves the EU. Raw audio only exists until transcription is done — then it is deleted automatically.',
        },
        {
          q: 'What does Elevante require from teachers in practice?',
          a: 'The teacher downloads the app and presses REC when the lesson starts. The schedule loads automatically, so the teacher does not need to tag or name lessons. It is at most two taps per lesson, with no follow-up work.',
        },
        {
          q: 'How does school leadership see that Elevante is actually used?',
          a: 'The school gets an admin view with statistics per course and class. There you can see how many lessons were recorded, how much students are asking and which courses are used most. That lets you see where support is needed before test results arrive.',
        },
        {
          q: 'Do you train AI models on our students’ data?',
          a: 'No, never. Student voices and transcripts are used only to answer that individual student about that individual lesson. We do not train any models on student data, and neither does our AI provider, Anthropic.',
        },
        {
          q: 'What happens to our data if we end the agreement?',
          a: 'If you end the agreement, we export all your data to you and delete our copies within 30 days. There is no lock-in — the data belongs to the school, not to us.',
        },
        {
          q: 'Is Elevante for a single school or only for municipalities?',
          a: 'Both. The price and the product are the same whether you are an independent school or a municipality with many schools. There is no minimum, and you can start with one class on a pilot before rolling it out widely.',
        },
        {
          q: 'How is Elevante different from a regular learning platform?',
          a: 'A learning platform exists to administer courses, assignments and grades. Elevante does something different: it preserves the lesson itself so students can ask about it afterwards. Elevante does not replace your learning platform — it fills the gap it leaves once the lesson is over.',
        },
      ];

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
                <LinkButton href={`${base}/lararappen`} variant="text" size="lg">
                  {sv ? 'Klicka igenom lärar-appen' : 'Click through the teacher app'} →
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

      {/* SE APPEN I WEBBEN */}
      <section className="py-16 md:py-20">
        <Container width="wide">
          <div className="grid items-center gap-10 rounded-[24px] bg-[var(--color-ink)] p-10 md:grid-cols-12 md:gap-16 md:p-16">
            <div className="md:col-span-7">
              <p className="text-[0.75rem] uppercase tracking-[0.12em] text-[var(--color-canvas)]/60">
                {sv ? 'Demo i webbläsaren' : 'Demo in your browser'}
              </p>
              <h2 className="mt-4 font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-canvas)]">
                {sv
                  ? 'Inget möte krävs. Klicka igenom appen.'
                  : 'No meeting required. Click through the app.'}
              </h2>
              <p className="mt-4 max-w-md text-[1rem] leading-relaxed text-[var(--color-canvas)]/70">
                {sv
                  ? 'Tre skärmar, tre tryck. Du ser exakt vad läraren ser — utan att installera något.'
                  : 'Three screens, three taps. You see exactly what the teacher sees — without installing anything.'}
              </p>
              <div className="mt-8">
                <Link
                  href={`${base}/lararappen`}
                  className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--color-canvas)] px-6 py-3 text-[0.9375rem] font-medium text-[var(--color-ink)] transition-opacity hover:opacity-90"
                >
                  {sv ? 'Klicka igenom lärar-appen' : 'Click through the teacher app'} →
                </Link>
              </div>
            </div>
            <div className="md:col-span-5">
              <div className="relative mx-auto max-w-[220px] rotate-[-3deg]">
                <div className="rounded-[28px] bg-[var(--color-canvas)] p-2 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.4)]">
                  <div className="rounded-[20px] bg-[var(--color-canvas)] p-4 text-left">
                    <p className="text-[0.6875rem] text-[var(--color-ink-muted)]">
                      {sv ? 'Tisdag 13 maj' : 'Tuesday May 13'}
                    </p>
                    <p className="mt-0.5 font-serif text-[1.25rem] leading-none text-[var(--color-ink)]">
                      {sv ? 'Idag' : 'Today'}
                    </p>
                    <div className="mt-5 space-y-3 border-t border-[var(--color-sand)] pt-3">
                      <div className="flex items-center gap-2">
                        <span className="status-dot status-dot--sage" />
                        <span className="text-[0.6875rem] text-[var(--color-ink)]">
                          08:15 · {sv ? 'Algebraisk modellering' : 'Algebra'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="status-dot status-dot--sand" />
                        <span className="text-[0.6875rem] text-[var(--color-ink)]">
                          10:15 · {sv ? 'Integraler' : 'Integrals'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="status-dot status-dot--sand" />
                        <span className="text-[0.6875rem] text-[var(--color-ink)]">
                          12:30 · {sv ? 'Repetition' : 'Review'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 rounded-[8px] bg-[var(--color-ink)] py-2 text-center text-[0.6875rem] font-medium text-[var(--color-canvas)]">
                      {sv ? 'Spela in →' : 'Record →'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

      {/* FAQ — AEO-motorn */}
      <section className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="content">
          <Faq
            heading={sv ? 'Frågor från skolledare' : 'Questions from school leaders'}
            intro={
              sv
                ? 'Det skolledning och huvudmän oftast vill veta innan ett beslut.'
                : 'What school leaders and operators most often want to know before a decision.'
            }
            items={faqs}
          />
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
