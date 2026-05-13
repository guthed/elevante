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
    title: sv ? 'Om oss — Elevante' : 'About — Elevante',
    description: sv
      ? 'Vi byggde det som saknades i klassrummet.'
      : 'We built what was missing in the classroom.',
  };
}

// Editorial Calm — Stitch screen 07-om-oss.png

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;
  const sv = locale === 'sv';

  const beliefs = sv
    ? [
        { title: 'Skolan ska inte vara en plattform att navigera.', body: 'Det är därför vi inte bygger en till portal med menyer i menyer.' },
        { title: 'AI ska komma ihåg, inte hitta på.', body: 'Strikt RAG. Källhänvisning. Aldrig en gissning som låter rätt.' },
        { title: 'Elever ska få ställa frågor utan att be om lov.', body: 'Tjugofem dumma frågor är en bra eftermiddag.' },
      ]
    : [
        { title: 'School shouldn\'t be a platform to navigate.', body: 'That\'s why we don\'t build yet another portal with menus inside menus.' },
        { title: 'AI should remember, not invent.', body: 'Strict RAG. Sources. Never a guess that sounds right.' },
        { title: 'Students should ask questions without permission.', body: 'Twenty-five dumb questions is a good afternoon.' },
      ];

  const team = [
    {
      name: 'John Guthed',
      role: sv ? 'Grundare' : 'Founder',
      bio: sv
        ? 'Gick i svenskt gymnasium 2008–2011. Var en av de som ständigt missade lektionerna.'
        : 'Went to Swedish gymnasium 2008–2011. Was one of those who constantly missed class.',
    },
    {
      name: 'TBD',
      role: 'CTO',
      bio: sv
        ? 'Bygger AI-pipelinen från audio till svar med källa.'
        : 'Building the AI pipeline from audio to sourced answer.',
    },
    {
      name: 'TBD',
      role: sv ? 'Designansvarig' : 'Head of Design',
      bio: sv
        ? 'Designar för 16-åringar som inte tål dåliga gränssnitt.'
        : 'Designs for 16-year-olds who don\'t tolerate bad interfaces.',
    },
  ];

  return (
    <>
      {/* HERO — manifest */}
      <section className="pt-20 pb-16 md:pt-28 md:pb-20">
        <Container width="wide">
          <p className="eyebrow mb-8">{sv ? 'Om oss' : 'About'}</p>
          <h1 className="font-serif text-[clamp(2.75rem,6vw+1rem,6rem)] leading-[0.98] tracking-[-0.015em] text-[var(--color-ink)]">
            {sv
              ? 'Vi byggde det som saknades i klassrummet.'
              : 'We built what was missing in the classroom.'}
          </h1>
          <p className="mt-10 max-w-2xl text-[1.125rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? 'Vi tror att läraren ska få vara lärare och eleven ska få vara elev. Inte assistent åt en kursplattform från 2009. Elevante är ett verktyg byggt för båda.'
              : 'We believe the teacher should be the teacher and the student should be the student. Not assistants to a 2009 course platform. Elevante is built for both.'}
          </p>
        </Container>
      </section>

      <div className="container-wide"><div className="h-px bg-[var(--color-sand)]" /></div>

      {/* HUR DET BÖRJADE */}
      <section className="py-20 md:py-28">
        <Container width="wide">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <h2 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
                {sv
                  ? 'Det började med en sak vi hörde om och om igen.'
                  : 'It started with one thing we heard over and over.'}
              </h2>
            </div>
            <div className="space-y-5 md:col-span-7">
              <p className="text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'En matematiklärare på ett svenskt gymnasium sa det rakt ut över en kaffe: "Jag svarar samma fråga 30 gånger. Eleven som vågar höja handen får svar. De som inte vågar går hem och gissar."'
                  : 'A math teacher at a Swedish gymnasium said it plainly over coffee: "I answer the same question 30 times. The student who dares raise their hand gets the answer. Those who don\'t go home and guess."'}
              </p>
              <p className="text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'Vi tänkte: tänk om lektionen aldrig tog slut. Tänk om eleven kunde fråga om den, efter att läraren gått hem. Inte en chatbot som hittar på — utan något som faktiskt mindes vad som sas.'
                  : 'We thought: what if the lesson never ended. What if the student could ask about it, after the teacher went home. Not a chatbot that invents — but something that actually remembered what was said.'}
              </p>
              <p className="text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'Två veckor senare hade vi en prototyp. Tre månader senare körde två klasser den på riktigt. Det är så Elevante började.'
                  : 'Two weeks later we had a prototype. Three months later two classes were using it for real. That\'s how Elevante started.'}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* VAD VI TROR */}
      <section className="bg-[var(--color-surface-soft)] py-20 md:py-28">
        <Container width="content">
          <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.75rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Vad vi tror' : 'What we believe'}
          </h2>
          <div className="mt-16 space-y-12">
            {beliefs.map((b, i) => (
              <div key={i} className="border-l-2 border-[var(--color-coral)] pl-6">
                <p className="font-serif text-[clamp(1.5rem,1.5vw+1rem,2rem)] italic leading-snug text-[var(--color-ink)]">
                  {b.title}
                </p>
                <p className="mt-3 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* TEAMET */}
      <section className="py-20 md:py-28">
        <Container width="wide">
          <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Teamet' : 'The team'}
          </h2>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {team.map((member, i) => (
              <article key={i}>
                <div className="aspect-square w-full overflow-hidden rounded-[16px] bg-gradient-to-br from-[var(--color-sand)]/60 via-[var(--color-canvas)] to-[var(--color-sage)]/30" />
                <p className="mt-5 font-serif text-[1.125rem] text-[var(--color-ink)]">
                  {member.name}
                </p>
                <p className="mt-1 text-[0.875rem] text-[var(--color-ink-muted)]">
                  {member.role}
                </p>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {member.bio}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* VI FINNS I STOCKHOLM */}
      <section className="bg-[var(--color-surface-soft)] py-20 md:py-28">
        <Container width="content">
          <div className="grid items-start gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <h2 className="font-serif text-[clamp(1.5rem,2vw+1rem,2.25rem)] leading-tight text-[var(--color-ink)]">
                {sv ? 'Vi finns i Stockholm' : 'We\'re in Stockholm'}
              </h2>
              <p className="mt-6 max-w-md text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'Allt bygger vi själva. All data lagras i Stockholm. Vi pratar med er på svenska och förstår vad svenska skolor är.'
                  : 'We build everything ourselves. All data is in Stockholm. We speak Swedish and understand Swedish schools.'}
              </p>
            </div>
            <div className="md:col-span-7">
              <div className="aspect-[16/10] w-full overflow-hidden rounded-[20px] bg-gradient-to-br from-[var(--color-sand)]/60 via-[var(--color-canvas)] to-[var(--color-sage)]/30" />
            </div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <Container width="content">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-serif text-[clamp(2.25rem,3vw+1rem,3rem)] leading-tight text-[var(--color-ink)]">
              {sv ? 'Vill du prata med oss?' : 'Want to talk?'}
            </h2>
            <p className="mt-4 text-[1rem] text-[var(--color-ink-muted)]">
              john@availsthlm.se · Stockholm
            </p>
            <div className="mt-8">
              <LinkButton href={`${base}/kontakt`} size="lg">
                {sv ? 'Skriv ett mail' : 'Send us a note'}
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
