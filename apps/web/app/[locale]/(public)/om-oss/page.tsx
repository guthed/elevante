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
        ? 'John är entreprenör och konsult inom AI och datastrategi. Han har byggt bolagen We Are Allies och Avail Sthlm, där han hjälper företag att få ordning på sin data och använda den till bättre beslut. Han gick själv i svenskt gymnasium och var en av dem som ständigt missade lektionerna — Elevante är verktyget han önskar att han haft då.'
        : 'John is an entrepreneur and consultant in AI and data strategy. He has built the companies We Are Allies and Avail Sthlm, where he helps businesses get their data in order and turn it into better decisions. He went to Swedish upper-secondary school himself and was one of those who constantly missed class — Elevante is the tool he wishes he had had back then.',
    },
    {
      name: 'Stefan Pettersson Noord',
      role: sv ? 'Grundare' : 'Founder',
      bio: sv
        ? 'Stefan har drygt tre decennier i den digitala och kreativa branschen bakom sig. Han har grundat och lett bolag som Otto Stockholm Proximity och Klirr, varit Managing Director för Ogilvy Interactive Sweden, och driver idag innovationsbolaget The Innovation Chapel. Han startade Elevante för att rikta den erfarenheten mot något som verkligen betyder något — att ge varje elev samma chans att förstå.'
        : 'Stefan brings more than three decades in the digital and creative industry. He has founded and led companies such as Otto Stockholm Proximity and Klirr, served as Managing Director of Ogilvy Interactive Sweden, and today runs the innovation company The Innovation Chapel. He started Elevante to point that experience at something that genuinely matters — giving every student the same chance to understand.',
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

      {/* TEAMET — som lista, inte gradient-rutor */}
      <section className="py-20 md:py-28">
        <Container width="content">
          <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Teamet' : 'The team'}
          </h2>
          <ul className="mt-12 divide-y divide-[var(--color-sand)]">
            {team.map((member, i) => (
              <li
                key={i}
                className="grid gap-3 py-8 md:grid-cols-12 md:gap-8"
              >
                <div className="md:col-span-4">
                  <p className="font-serif text-[1.25rem] text-[var(--color-ink)]">
                    {member.name}
                  </p>
                  <p className="mt-1 text-[0.875rem] text-[var(--color-ink-muted)]">
                    {member.role}
                  </p>
                </div>
                <p className="text-[1rem] leading-relaxed text-[var(--color-ink-secondary)] md:col-span-8">
                  {member.bio}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* VI FINNS I STOCKHOLM */}
      <section className="bg-[var(--color-surface-soft)] py-20 md:py-28">
        <Container width="content">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow mb-6">
              {sv ? 'Stockholm · Sverige' : 'Stockholm · Sweden'}
            </p>
            <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
              {sv ? 'Allt vi gör görs här.' : 'Everything we do is done here.'}
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Vi bygger allt själva — ingen outsourcad utveckling, ingen amerikansk modellträning på svenska barns röster. All data lagras i Stockholm (AWS Stockholm + Supabase EU). Vi pratar med er på svenska och förstår vad en kursplan är.'
                : 'We build everything ourselves — no outsourced development, no American model training on Swedish kids\' voices. All data is stored in Stockholm (AWS Stockholm + Supabase EU). We speak Swedish and understand what a curriculum is.'}
            </p>
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
