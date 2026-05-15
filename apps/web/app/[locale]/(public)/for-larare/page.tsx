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
      ? 'Sluta svara på samma fråga trettio gånger. Elevante ger eleverna lektionen tillbaka — du får tiden.'
      : 'Stop answering the same question thirty times. Elevante gives students the lesson back — you get the time.',
  };
}

// Editorial Calm — För lärare, argumentsida i linje med för-skolor och för-elever

export default async function ForTeachersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;
  const sv = locale === 'sv';

  const argumentsList = sv
    ? [
        {
          number: '01',
          title: 'Du svarar inte på samma fråga trettio gånger',
          body: 'Återkommande frågor efter lektionen tar Elevante. Eleven får svar på det du redan sagt — och du får tillbaka tiden till det som faktiskt kräver en lärare.',
        },
        {
          number: '02',
          title: 'Eleverna som aldrig räcker upp handen får ändå svar',
          body: 'Den tysta eleven, den som tycker att frågan är dum, den som halkat efter — alla kan fråga i en privat chat. Du når fler elever utan att göra mer.',
        },
        {
          number: '03',
          title: 'Två tryck — och inget efterarbete',
          body: 'Du trycker REC när lektionen börjar och STOP när den slutar. Schemat hämtas automatiskt och ljudet laddas upp i bakgrunden. Ingen ny plattform att lära sig, inga taggar, ingen administration.',
        },
        {
          number: '04',
          title: 'AI:n svarar bara på det du faktiskt sa',
          body: 'Elevante använder strikt RAG — svaren bygger uteslutande på din lektion. AI:n hittar inte på och motsäger dig inte. Varje svar pekar tillbaka till var i lektionen du förklarade saken.',
        },
        {
          number: '05',
          title: 'Varje lektion blir kvar — som transkript och repetition',
          body: 'Det du gått igenom försvinner inte när lektionen slutar. Lektionen blir ett sökbart transkript som eleverna kan repetera inför provet — och som du kan bygga vidare på.',
        },
      ]
    : [
        {
          number: '01',
          title: 'You don’t answer the same question thirty times',
          body: 'Elevante handles the recurring questions after the lesson. The student gets an answer to what you already said — and you get time back for what actually needs a teacher.',
        },
        {
          number: '02',
          title: 'The students who never raise their hand still get answers',
          body: 'The quiet student, the one who thinks the question is silly, the one who fell behind — they can all ask in a private chat. You reach more students without doing more.',
        },
        {
          number: '03',
          title: 'Two taps — and no follow-up work',
          body: 'You press REC when the lesson starts and STOP when it ends. The schedule loads automatically and the audio uploads in the background. No new platform to learn, no tags, no admin.',
        },
        {
          number: '04',
          title: 'The AI only answers from what you actually said',
          body: 'Elevante uses strict RAG — answers are based solely on your lesson. The AI does not make things up and does not contradict you. Every answer points back to where in the lesson you explained it.',
        },
        {
          number: '05',
          title: 'Every lesson stays — as a transcript and as review',
          body: 'What you covered does not disappear when the lesson ends. The lesson becomes a searchable transcript students can review before a test — and that you can build on.',
        },
      ];

  const notDoing = sv
    ? [
        '...lägger inte till uppgifter på din redan fulla dag.',
        '...skriver inte elevernas inlämningsuppgifter åt dem.',
        '...ersätter inte din undervisning — den förlänger den.',
      ]
    : [
        '...does not add tasks to your already full day.',
        '...does not write students’ assignments for them.',
        '...does not replace your teaching — it extends it.',
      ];

  const faqs: FaqItem[] = sv
    ? [
        {
          q: 'Tar Elevante extra tid från min undervisning?',
          a: 'Nej. Du trycker REC när lektionen börjar och STOP när den slutar — det är allt. Det finns inget efterarbete, inga taggar och ingen uppladdning att sköta. Schemat hämtas automatiskt.',
        },
        {
          q: 'Måste jag lära mig en ny plattform?',
          a: 'Knappt. Lärar-appen har i princip en knapp: spela in. Du behöver inte bygga kurser, ladda upp filer eller administrera konton för att komma igång.',
        },
        {
          q: 'Kan eleverna fuska med Elevante?',
          a: 'Elevante skriver inte inlämningsuppgifter och löser inte prov åt eleverna. Det förklarar det du redan gått igenom, ungefär som en klasskamrat som var uppmärksam. Eleven gör fortfarande arbetet själv.',
        },
        {
          q: 'Ser jag vad mina elever frågar Elevante?',
          a: 'Nej. Elevernas chattar är privata — varken du eller skolan kan läsa dem. Det är medvetet: eleven ska våga ställa även de frågor hen inte räcker upp handen för.',
        },
        {
          q: 'Ersätter Elevante mig som lärare?',
          a: 'Nej. Elevante håller inte lektionen istället för dig — det bevarar den lektion du redan hållit. Eleven får din undervisning igen, när hen behöver repetera den.',
        },
        {
          q: 'Vad händer om en elev frågar om något jag inte tog upp?',
          a: 'Då svarar Elevante att det inte togs upp på lektionen, istället för att gissa. AI:n hittar aldrig på ett svar — den håller sig strikt till din transkriberade lektion.',
        },
        {
          q: 'Vilka ämnen funkar Elevante för?',
          a: 'Alla ämnen där du pratar — matematik, historia, samhällskunskap, naturkunskap, språk och mer. Så länge lektionen spelas in kan eleverna fråga om den efteråt.',
        },
        {
          q: 'Hur börjar jag använda Elevante?',
          a: 'Din skola behöver ett avtal med Elevante. Har skolan inte det än kan du tipsa skolledningen eller boka en demo med oss — vi visar hela flödet på en halvtimme.',
        },
      ]
    : [
        {
          q: 'Does Elevante take extra time from my teaching?',
          a: 'No. You press REC when the lesson starts and STOP when it ends — that is all. There is no follow-up work, no tags and no upload to manage. The schedule loads automatically.',
        },
        {
          q: 'Do I have to learn a new platform?',
          a: 'Barely. The teacher app essentially has one button: record. You do not need to build courses, upload files or administer accounts to get started.',
        },
        {
          q: 'Can students cheat with Elevante?',
          a: 'Elevante does not write assignments and does not solve tests for students. It explains what you already covered, much like a classmate who was paying attention. The student still does the work.',
        },
        {
          q: 'Can I see what my students ask Elevante?',
          a: 'No. Student chats are private — neither you nor the school can read them. That is deliberate: the student should dare to ask even the questions they would not raise their hand for.',
        },
        {
          q: 'Does Elevante replace me as a teacher?',
          a: 'No. Elevante does not hold the lesson instead of you — it preserves the lesson you already held. The student gets your teaching again, when they need to review it.',
        },
        {
          q: 'What happens if a student asks about something I did not cover?',
          a: 'Elevante answers that it was not covered in the lesson, instead of guessing. The AI never makes up an answer — it stays strictly within your transcribed lesson.',
        },
        {
          q: 'Which subjects does Elevante work for?',
          a: 'Any subject where you talk — mathematics, history, social studies, science, languages and more. As long as the lesson is recorded, students can ask about it afterwards.',
        },
        {
          q: 'How do I start using Elevante?',
          a: 'Your school needs an agreement with Elevante. If the school does not have one yet, you can tip off the leadership or book a demo with us — we show the whole flow in half an hour.',
        },
      ];

  return (
    <>
      {/* HERO — 60/40 asymmetrisk */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28">
        <Container width="wide">
          <div className="grid items-end gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-7">
              <p className="eyebrow mb-6">{sv ? 'För lärare' : 'For teachers'}</p>
              <h1 className="font-serif text-[clamp(2.25rem,4.5vw+1rem,4rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
                {sv
                  ? 'Sluta upprepa dig. Börja undervisa.'
                  : 'Stop repeating yourself. Start teaching.'}
              </h1>
              <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'En lärare, trettio elever. Den som vågar fråga får svar — resten gissar. Elevante ger varje elev lektionen tillbaka, så att du slipper hålla den om och om igen.'
                  : 'One teacher, thirty students. Those who dare to ask get answers — the rest guess. Elevante gives every student the lesson back, so you don’t have to hold it again and again.'}
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

            {/* Pull-stat 30× */}
            <div className="md:col-span-5">
              <div className="border-l-2 border-[var(--color-coral)] pl-8">
                <p className="font-serif text-[clamp(4.5rem,7vw+1rem,7rem)] leading-[0.95] tracking-[-0.02em] text-[var(--color-ink)]">
                  30 ×
                </p>
                <p className="mt-4 max-w-[20rem] text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {sv
                    ? 'Så många gånger svarar en lärare i snitt på samma fråga under en termin. Elevante tar de upprepningarna.'
                    : 'That’s how many times a teacher answers the same question in an average term. Elevante takes those repeats.'}
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Divider />

      {/* DÄRFÖR ANVÄNDER LÄRARE ELEVANTE */}
      <section className="py-20 md:py-28">
        <Container width="wide">
          <h2 className="font-serif text-[clamp(1.625rem,1.5vw+1rem,2rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Därför använder lärare Elevante' : 'Why teachers use Elevante'}
          </h2>
          <ol className="mt-14 space-y-10">
            {argumentsList.map((item) => (
              <li
                key={item.number}
                className="grid gap-4 border-t border-[var(--color-sand)] pt-8 md:grid-cols-12 md:gap-10"
              >
                <div className="flex items-baseline gap-5 md:col-span-5">
                  <span className="font-serif text-[1.125rem] text-[var(--color-ink-muted)] tabular-nums">
                    {item.number}
                  </span>
                  <h3 className="font-serif text-[clamp(1.375rem,1.2vw+1rem,1.75rem)] leading-snug text-[var(--color-ink)]">
                    {item.title}
                  </h3>
                </div>
                <p className="text-[1rem] leading-relaxed text-[var(--color-ink-secondary)] md:col-span-7">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* DEMO I WEBBEN */}
      <section className="py-16 md:py-20">
        <Container width="wide">
          <div className="grid items-center gap-10 rounded-[24px] bg-[var(--color-ink)] p-10 md:grid-cols-12 md:gap-16 md:p-16">
            <div className="md:col-span-8">
              <p className="text-[0.75rem] uppercase tracking-[0.12em] text-[var(--color-canvas)]/60">
                {sv ? 'Demo i webbläsaren' : 'Demo in your browser'}
              </p>
              <h2 className="mt-4 font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-canvas)]">
                {sv
                  ? 'Se exakt vad du som lärare gör i appen.'
                  : 'See exactly what you do in the app as a teacher.'}
              </h2>
              <p className="mt-4 max-w-md text-[1rem] leading-relaxed text-[var(--color-canvas)]/70">
                {sv
                  ? 'Tre skärmar, två tryck. Klicka igenom hela inspelningsflödet — utan att installera något.'
                  : 'Three screens, two taps. Click through the whole recording flow — without installing anything.'}
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
            <div className="md:col-span-4 md:text-right">
              <p className="font-serif text-[clamp(3rem,4vw+1rem,4.5rem)] leading-none text-[var(--color-canvas)]">
                2
              </p>
              <p className="mt-2 text-[0.9375rem] text-[var(--color-canvas)]/70">
                {sv ? 'tryck per lektion' : 'taps per lesson'}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* DET HÄR GÖR ELEVANTE INTE */}
      <section className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="content">
          <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.25rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Det här gör Elevante inte' : 'What Elevante does not do'}
          </h2>
          <ul className="mt-12 space-y-6">
            {notDoing.map((item, i) => (
              <li
                key={i}
                className="flex items-baseline gap-3 border-l-2 border-[var(--color-coral)] pl-5"
              >
                <span className="font-serif italic text-[var(--color-ink)]">
                  Elevante
                </span>
                <span className="text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* FAQ — AEO-motorn */}
      <section className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="content">
          <Faq
            heading={sv ? 'Frågor från lärare' : 'Questions from teachers'}
            intro={
              sv
                ? 'Det lärare oftast undrar innan de provar Elevante.'
                : 'What teachers most often wonder before trying Elevante.'
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
              {sv ? 'Vill du prova Elevante i din klass?' : 'Want to try Elevante in your class?'}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Vi visar hela flödet på en halvtimme — mobilen, lärar-vyn och elev-chatten.'
                : 'We show the whole flow in half an hour — the mobile app, the teacher view and the student chat.'}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                {sv ? 'Boka demo' : 'Book demo'}
              </LinkButton>
              <LinkButton href={`${base}/for-skolor`} variant="ghost" size="lg">
                {sv ? 'Läs mer för skolor' : 'Learn more for schools'} →
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function Divider() {
  return (
    <div className="container-wide">
      <div className="h-px bg-[var(--color-sand)]" />
    </div>
  );
}
