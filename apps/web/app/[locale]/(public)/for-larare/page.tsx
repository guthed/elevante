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
    title: sv ? 'För lärare — Elevante' : 'For teachers — Elevante',
    description: sv
      ? 'Du bestämmer, du äger inspelningen. Elevante minns lektionen åt dina elever — inte ett övervakningsverktyg.'
      : 'You decide, you own the recording. Elevante remembers the lesson for your students — not a surveillance tool.',
  };
}

// Editorial Calm — för lärare

type Reason = { title: string; body: string };
type TrustPoint = { lead: string; body: string };

export default async function ForTeachersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;
  const sv = locale === 'sv';

  const trustPoints: TrustPoint[] = sv
    ? [
        {
          lead: 'Du bestämmer när du spelar in.',
          body: 'Inget startar automatiskt. Du trycker REC när lektionen börjar och STOP när den slutar.',
        },
        {
          lead: 'Inspelningen är till för eleverna.',
          body: 'Den finns så att din elev kan fråga om lektionen efteråt. Elevante har inga funktioner byggda för att betygsätta eller granska en lärare.',
        },
        {
          lead: 'Råljudet raderas.',
          body: 'Så fort lektionen transkriberats finns ingen ljudfil kvar att lyssna på — för någon. Bara texten sparas, och du kan radera hela lektionen när du vill.',
        },
        {
          lead: 'Din förståelsekarta är privat.',
          body: 'Insikten om vad just din klass fastnat på syns bara för dig — inte för skolledningen och inte för dina kollegor. Skolledningen ser att verktyget används, aldrig vad det visar dig.',
        },
        {
          lead: 'Ingen AI tränas på din undervisning.',
          body: 'Varken Elevante eller vår AI-leverantör Anthropic använder dina lektioner för att träna modeller.',
        },
      ]
    : [
        {
          lead: 'You decide when to record.',
          body: 'Nothing starts automatically. You press REC when the lesson begins and STOP when it ends.',
        },
        {
          lead: 'The recording is for the students.',
          body: 'It exists so your student can ask about the lesson afterwards. Elevante has no features built to grade or review a teacher.',
        },
        {
          lead: 'Raw audio is deleted.',
          body: 'As soon as the lesson is transcribed there is no audio file left to listen to — for anyone. Only the text is kept, and you can delete an entire lesson whenever you want.',
        },
        {
          lead: 'Your understanding map is private.',
          body: 'The insight into what your class got stuck on is visible only to you — not to leadership and not to your colleagues. Leadership sees that the tool is used, never what it shows you.',
        },
        {
          lead: 'No AI is trained on your teaching.',
          body: 'Neither Elevante nor our AI provider, Anthropic, uses your lessons to train models.',
        },
      ];

  const reasons: Reason[] = sv
    ? [
        {
          title: 'Du behåller kontrollen',
          body: 'Du bestämmer när du spelar in. Du äger transkripten, och du kan radera en lektion när du vill — inget av det ligger utanför din räckhåll.',
        },
        {
          title: 'Slipp upprepa dig',
          body: 'AI:n svarar på "kan du ta det där igen?". Du får tiden tillbaka till det som faktiskt kräver en lärare.',
        },
        {
          title: 'Se vad klassen fastnat på',
          body: 'Förståelsekartan visar vilka begrepp som skaver — per elev, före provet. Bara du ser den, och du läser aldrig någons privata chatt.',
        },
        {
          title: 'Eleverna kommer förberedda',
          body: 'Provplugg och AI-övningsprov gör att de pluggar på det du sa på lektionen — inte på en gissning från nätet.',
        },
        {
          title: 'Rättvisare för alla elever',
          body: 'Frånvarande, neurodivergenta och andraspråkselever kan gå tillbaka till lektionen i sin egen takt. Tillgänglighet utan extraarbete för dig.',
        },
        {
          title: 'AI:n hittar aldrig på',
          body: 'Strikt RAG: varje svar kommer ur ditt klassrum, med källhänvisning. Hellre "det togs inte upp" än en gissning.',
        },
        {
          title: 'Noll efterarbete',
          body: 'Schemat vet vilken lektion det är. Två tryck: REC och STOP. Ingen taggning, ingen uppladdning, inget filstrul.',
        },
        {
          title: 'Inget nytt att lära sig',
          body: 'Ingen ny plattform att logga in i varje dag. Elevante ersätter inte din lärplattform — det fyller gapet efter lektionen.',
        },
      ]
    : [
        {
          title: 'You stay in control',
          body: 'You decide when to record. You own the transcripts, and you can delete a lesson whenever you want — none of it is out of your reach.',
        },
        {
          title: 'No more repeating yourself',
          body: 'The AI answers the "can you go over that again?" questions. You get time back for what actually needs a teacher.',
        },
        {
          title: 'See what the class got stuck on',
          body: 'The understanding map shows which concepts are shaky — per student, before the test. Only you see it, and you never read anyone’s private chat.',
        },
        {
          title: 'Students arrive prepared',
          body: 'Exam prep and AI practice tests mean they study what you said in the lesson — not a guess from the internet.',
        },
        {
          title: 'Fairer for every student',
          body: 'Absent, neurodivergent and second-language students can revisit the lesson at their own pace. Accessibility with no extra work for you.',
        },
        {
          title: 'The AI never makes things up',
          body: 'Strict RAG: every answer comes from your classroom, with a source reference. It would rather say "that wasn’t covered" than guess.',
        },
        {
          title: 'Zero follow-up work',
          body: 'The schedule knows which lesson it is. Two taps: REC and STOP. No tagging, no uploading, no file wrangling.',
        },
        {
          title: 'Nothing new to learn',
          body: 'No new platform to log into every day. Elevante doesn’t replace your learning platform — it fills the gap after the lesson.',
        },
      ];

  const faqs: FaqItem[] = sv
    ? [
        {
          q: 'Tar Elevante tid från min undervisning?',
          a: 'Nej. Du trycker REC när lektionen börjar och STOP när den slutar — appen sköter resten. Det är som mest två tryck, och det finns inget efterarbete. Du undervisar precis som vanligt.',
        },
        {
          q: 'Kan skolledningen lyssna på mina lektioner eller använda Elevante för att utvärdera mig?',
          a: 'Nej. Råljudet raderas så fort lektionen transkriberats — det finns ingen inspelning kvar att lyssna på. Skolledningen får driftsstatistik: antal inspelade lektioner och aktivitet per kurs, så att de ser att verktyget används. Din förståelsekarta — insikten om vad klassen fastnat på — är privat och syns bara för dig. Elevante har inga funktioner byggda för att betygsätta eller granska en enskild lärares undervisning. Inspelningen finns till av ett enda skäl — att din elev ska kunna fråga om lektionen efteråt.',
        },
        {
          q: 'Måste jag ändra hur jag undervisar?',
          a: 'Nej. Elevante spelar in lektionen som den är. Du behöver inte tala tydligare, följa ett manus eller anpassa något. Det enda som händer är att lektionen finns kvar efteråt.',
        },
        {
          q: 'Kan eleverna fuska med Elevante?',
          a: 'Nej. Elevante skriver inte inlämningsuppgifter och gör inte jobbet åt eleven. Det förklarar vad du gick igenom, med källhänvisning till din lektion — ungefär som en klasskompis som antecknade noggrant.',
        },
        {
          q: 'Ser jag vad enskilda elever frågar?',
          a: 'Nej, enskilda chattar är privata — det ska kännas tryggt för eleven att ställa även de frågor den inte vågar räcka upp handen för. Däremot får du en förståelsekarta som visar vilka begrepp klassen frågar mest om, så du ser var det skaver utan att läsa någons chatt.',
        },
        {
          q: 'Vad händer om jag råkar spela in något känsligt?',
          a: 'Du kan radera en lektion direkt, och då försvinner både transkriptet och allt som byggts på det. Råljudet raderas ändå automatiskt så fort transkriberingen är klar — bara texten sparas.',
        },
        {
          q: 'Funkar Elevante för mitt ämne?',
          a: 'Elevante funkar för alla ämnen där du pratar — matematik, historia, naturkunskap, språk, samhällskunskap och mer. Så länge lektionen spelas in kan eleverna fråga om den efteråt.',
        },
        {
          q: 'Ersätter Elevante mig som lärare?',
          a: 'Nej, och det är inte meningen. Elevante svarar på upprepade frågor och hjälper eleven repetera — men relationen, bedömningen och undervisningen är din. Elevante ger dig tillbaka tid att vara just lärare.',
        },
      ]
    : [
        {
          q: 'Does Elevante take time away from my teaching?',
          a: 'No. You press REC when the lesson starts and STOP when it ends — the app handles the rest. It is at most two taps, with no follow-up work. You teach exactly as usual.',
        },
        {
          q: 'Can leadership listen to my lessons or use Elevante to evaluate me?',
          a: 'No. Raw audio is deleted as soon as the lesson is transcribed — there is no recording left to listen to. Leadership gets operational statistics: the number of lessons recorded and activity per course, so they can see the tool is used. Your understanding map — the insight into what the class got stuck on — is private and visible only to you. Elevante has no features built to grade or review an individual teacher. The recording exists for one reason only — so your student can ask about the lesson afterwards.',
        },
        {
          q: 'Do I have to change how I teach?',
          a: 'No. Elevante records the lesson as it is. You do not need to speak more clearly, follow a script or adapt anything. The only difference is that the lesson stays afterwards.',
        },
        {
          q: 'Can students cheat with Elevante?',
          a: 'No. Elevante does not write assignments and does not do the work for the student. It explains what you covered, with a source reference to your lesson — much like a classmate who took careful notes.',
        },
        {
          q: 'Can I see what individual students ask?',
          a: 'No, individual chats are private — it should feel safe for a student to ask even the questions they would not raise their hand for. You do get an understanding map showing which concepts the class asks about most, so you see where things are shaky without reading anyone’s chat.',
        },
        {
          q: 'What if I accidentally record something sensitive?',
          a: 'You can delete a lesson immediately, which removes the transcript and everything built on it. Raw audio is deleted automatically as soon as transcription is finished anyway — only the text is kept.',
        },
        {
          q: 'Does Elevante work for my subject?',
          a: 'Elevante works for any subject where you talk — maths, history, science, languages, social studies and more. As long as the lesson is recorded, students can ask about it afterwards.',
        },
        {
          q: 'Does Elevante replace me as a teacher?',
          a: 'No, and it is not meant to. Elevante answers repeated questions and helps students revise — but the relationship, the assessment and the teaching are yours. Elevante gives you back time to be exactly that: a teacher.',
        },
      ];

  return (
    <>
      {/* HERO — 50/50 asymmetrisk */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28">
        <Container width="wide">
          <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <p className="eyebrow mb-6">{sv ? 'För läraren' : 'For the teacher'}</p>
              <h1 className="font-serif text-[clamp(2.75rem,5.5vw+1rem,5.5rem)] leading-[0.98] tracking-[-0.015em] text-[var(--color-ink)]">
                {sv ? (
                  <>
                    Du lär ut.{' '}
                    <span className="italic text-[var(--color-coral)]">Elevante minns.</span>
                  </>
                ) : (
                  <>
                    You teach.{' '}
                    <span className="italic text-[var(--color-coral)]">Elevante remembers.</span>
                  </>
                )}
              </h1>
              <p className="mt-8 max-w-xl text-[1.125rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'Du spelar in lektionen när du vill — två tryck, sen är du klar. Elevante gör den sökbar för dina elever och ger dig tid och överblick tillbaka. Inspelningen är din.'
                  : 'You record the lesson whenever you want — two taps and you’re done. Elevante makes it searchable for your students and gives you time and oversight back. The recording is yours.'}
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
            <div>
              <RecordControlCard locale={locale} />
            </div>
          </div>
        </Container>
      </section>

      {/* INTE ETT ÖVERVAKNINGSVERKTYG — avväpnar lärarens rädsla */}
      <section className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="wide">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <p className="eyebrow mb-6">{sv ? 'Tryggt för dig' : 'Safe for you'}</p>
              <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.75rem)] leading-[1.1] text-[var(--color-ink)]">
                {sv
                  ? 'Det här är inte ett övervakningsverktyg.'
                  : 'This is not a surveillance tool.'}
              </h2>
              <p className="mt-6 max-w-md text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'Det första många lärare undrar är om inspelningen egentligen handlar om dem. Det gör den inte — och här är exakt varför.'
                  : 'The first thing many teachers wonder is whether the recording is really about them. It isn’t — and here is exactly why.'}
              </p>
            </div>
            <div className="md:col-span-7">
              <div className="rounded-[20px] bg-[var(--color-surface)] p-8 md:p-10">
                <ul className="divide-y divide-[var(--color-sand)]">
                  {trustPoints.map((point) => (
                    <li
                      key={point.lead}
                      className="flex items-start gap-4 py-5 first:pt-0 last:pb-0"
                    >
                      <span className="status-dot status-dot--sage mt-2" />
                      <div>
                        <p className="font-serif text-[1.125rem] leading-snug text-[var(--color-ink)]">
                          {point.lead}
                        </p>
                        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
                          {point.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ÅTTA SKÄL — packad med anledningar */}
      <section className="border-t border-[var(--color-sand)] bg-[var(--color-surface-soft)] py-20 md:py-28">
        <Container width="wide">
          <div className="max-w-2xl">
            <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,3rem)] leading-[1.1] text-[var(--color-ink)]">
              {sv
                ? 'Åtta skäl att läraren faktiskt vill ha det här'
                : 'Eight reasons teachers actually want this'}
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Elevante är inte ännu ett system att mata. Det tar bort arbete — och ger dig tillbaka tid och överblick.'
                : 'Elevante isn’t one more system to feed. It removes work — and gives you back time and oversight.'}
            </p>
          </div>

          <div className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((reason, i) => (
              <ReasonItem
                key={reason.title}
                index={i + 1}
                title={reason.title}
                body={reason.body}
              />
            ))}
          </div>

          <div className="mt-16 max-w-2xl border-l-2 border-[var(--color-coral)] pl-8">
            <p className="font-serif text-[clamp(1.375rem,1.5vw+1rem,1.875rem)] italic leading-snug text-[var(--color-ink)]">
              {sv
                ? 'Du undervisar precis som förut. Skillnaden är att lektionen inte längre försvinner när det ringer ut.'
                : 'You teach exactly as before. The difference is the lesson no longer disappears when the bell rings.'}
            </p>
          </div>
        </Container>
      </section>

      {/* KLICKA IGENOM APPEN */}
      <section className="py-16 md:py-24">
        <Container width="wide">
          <div className="grid items-center gap-10 rounded-[24px] bg-[var(--color-ink)] p-10 md:grid-cols-12 md:gap-16 md:p-16">
            <div className="md:col-span-8">
              <p className="text-[0.75rem] uppercase tracking-[0.12em] text-[var(--color-canvas)]/60">
                {sv ? 'Två tryck per lektion' : 'Two taps per lesson'}
              </p>
              <h2 className="mt-4 font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-canvas)]">
                {sv
                  ? 'Se exakt vad du gör i klassrummet.'
                  : 'See exactly what you do in the classroom.'}
              </h2>
              <p className="mt-4 max-w-md text-[1rem] leading-relaxed text-[var(--color-canvas)]/70">
                {sv
                  ? 'Klicka igenom Elevante-demon i webbläsaren — utan att installera något.'
                  : 'Click through the Elevante demo in your browser — without installing anything.'}
              </p>
            </div>
            <div className="md:col-span-4 md:text-right">
              <Link
                href={`${base}/demo`}
                className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--color-canvas)] px-6 py-3 text-[0.9375rem] font-medium text-[var(--color-ink)] transition-opacity hover:opacity-90"
              >
                {sv ? 'Klicka igenom Elevante-demon' : 'Click through the Elevante demo'} →
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ — AEO-motorn */}
      <section className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="content">
          <Faq
            heading={sv ? 'Frågor från lärare' : 'Questions from teachers'}
            intro={
              sv
                ? 'Det lärare oftast vill veta innan de börjar använda Elevante.'
                : 'What teachers most often want to know before they start using Elevante.'
            }
            items={faqs}
          />
        </Container>
      </section>

      {/* CTA */}
      <section className="pb-24 pt-8 md:pb-32">
        <Container width="content">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.75rem)] leading-tight text-[var(--color-ink)]">
              {sv ? 'Se Elevante i din undervisning' : 'See Elevante in your teaching'}
            </h2>
            <p className="mt-4 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Boka en demo så visar vi hur det funkar — eller tipsa din skolledning.'
                : 'Book a demo and we’ll show you how it works — or tip off your school leadership.'}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                {sv ? 'Boka demo' : 'Book demo'}
              </LinkButton>
              <LinkButton href={`${base}/for-skolor`} variant="ghost" size="lg">
                {sv ? 'För skolledning' : 'For school leadership'} →
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function ReasonItem({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: string;
}) {
  return (
    <article>
      <p className="font-serif text-[1.5rem] leading-none text-[var(--color-coral)]">
        {String(index).padStart(2, '0')}
      </p>
      <h3 className="mt-4 font-serif text-[1.25rem] leading-snug text-[var(--color-ink)]">
        {title}
      </h3>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
        {body}
      </p>
    </article>
  );
}

function RecordControlCard({ locale }: { locale: string }) {
  const sv = locale === 'sv';
  const slots = [
    { time: '08:15', label: sv ? 'Genetik · 9B' : 'Genetics · 9B', state: 'done' },
    { time: '10:15', label: sv ? 'Cellbiologi · 9A' : 'Cell biology · 9A', state: 'active' },
    { time: '13:00', label: sv ? 'Ekologi · 9B' : 'Ecology · 9B', state: 'upcoming' },
  ];
  return (
    <div className="relative mx-auto max-w-sm rotate-[-1.5deg] rounded-[24px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6 shadow-[0_24px_60px_-16px_rgba(26,26,46,0.18)]">
      <div className="flex items-baseline justify-between border-b border-[var(--color-sand)] pb-3">
        <span className="font-serif text-[1.125rem] text-[var(--color-ink)]">
          {sv ? 'Idag' : 'Today'}
        </span>
        <span className="text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
          {sv ? 'Ditt schema' : 'Your schedule'}
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {slots.map((slot) => (
          <li key={slot.time} className="flex items-center gap-3">
            <span
              className={`status-dot ${
                slot.state === 'done' ? 'status-dot--sage' : 'status-dot--sand'
              }`}
            />
            <span className="text-[0.8125rem] text-[var(--color-ink-muted)]">
              {slot.time}
            </span>
            <span className="flex-1 text-[0.875rem] text-[var(--color-ink)]">
              {slot.label}
            </span>
            {slot.state === 'active' && (
              <span className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-ink)] px-2.5 py-1 text-[0.6875rem] font-medium text-[var(--color-canvas)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-coral)]" />
                REC
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-[var(--color-sand)] pt-3 text-[0.75rem] leading-relaxed text-[var(--color-ink-muted)]">
        {sv
          ? 'Du trycker REC. Inget startar av sig självt.'
          : 'You press REC. Nothing starts on its own.'}
      </p>
    </div>
  );
}
