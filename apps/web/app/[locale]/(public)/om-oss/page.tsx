import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { alternatesFor, breadcrumbLd } from '@/lib/site';
import { JsonLd } from '@/components/public/JsonLd';
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
    alternates: alternatesFor(locale, '/om-oss'),
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
        {
          title: 'Bra mjukvara syns inte. Den bara funkar.',
          body: 'De flesta verktyg som säljs till skolan handlar om att administrera lärande — inte om att göra det bättre. Läraren loggar in, laddar upp, klickar runt. Eleven loggar in, klickar runt, hittar inte. Det är inte vad skolan är till för. Elevante ska ta så lite plats som möjligt — och ge tillbaka så mycket tid det går.',
        },
        {
          title: 'AI ska komma ihåg, inte hitta på.',
          body: 'En AI som svarar med säkerhet fast den inte vet är farligare i ett klassrum än ingen AI alls. Elevante svarar bara på det som faktiskt sades i lektionen — med källhänvisning till var och när det sades. Om svaret inte finns i materialet säger vi det rakt ut. Det är inte en begränsning. Det är en princip.',
        },
        {
          title: 'Elever ska få ställa frågor utan att be om lov.',
          body: 'Många elever ställer inte frågan de har för att den känns för enkel, för sen, eller för fel. De sitter tysta och hoppas att de förstår ändå. Det hoppet är dyrt. Elevante finns där efter lektionen, utan åhörare, utan tidsbrist — och svarar lika seriöst på den tjugofemte frågan om integraler som på den första.',
        },
        {
          title: 'Det finns inte två likadana skolor.',
          body: 'En skola i Luleå och en i Malmö har olika scheman, olika ämnen, olika sätt att prata med sina elever. Elevante ger dem en gemensam infrastruktur — men styr inte hur de använder den. Det är läraren som vet vad som fungerar i sitt klassrum. Vi bygger verktyget. De bestämmer vad det ska göra.',
        },
        {
          title: 'Läraren är experten. AI:n är sekreteraren.',
          body: 'Elevante ersätter ingen lärare och försöker inte göra det. Det är läraren som planerar, förklarar och förstår sina elever. Vi ser till att det arbetet inte försvinner när lektionen är slut.',
        },
        {
          title: 'Ingen elev ska behöva låna anteckningar.',
          body: 'Om du missat en lektion, inte hängt med, eller helt enkelt glömt — ska du inte vara beroende av att någon annan har skrivit ner rätt saker. Lektionen finns kvar. Den är din.',
        },
        {
          title: 'Lärande sker inte alltid när det är schemalagt.',
          body: 'Förståelsen kommer när den kommer — ibland kvällen innan provet, ibland en vecka senare. Elevante finns där också, inte bara i klassrummet.',
        },
        {
          title: 'Integritet är inte en funktion vi lagt till. Det är hur vi byggt allt.',
          body: 'GDPR är inte en checkbox för oss. Det är ett designbeslut som påverkar varje val — vad vi lagrar, hur länge, och vem som får se det.',
        },
      ]
    : [
        {
          title: 'Good software is invisible. It just works.',
          body: 'Most tools sold to schools are about administering learning — not improving it. The teacher logs in, uploads, clicks around. The student logs in, clicks around, can\'t find anything. That\'s not what school is for. Elevante should take up as little space as possible — and give back as much time as it can.',
        },
        {
          title: 'AI should remember, not invent.',
          body: 'An AI that answers with confidence when it doesn\'t know is more dangerous in a classroom than no AI at all. Elevante only answers based on what was actually said in the lesson — with a reference to where and when it was said. If the answer isn\'t in the material, we say so plainly. That\'s not a limitation. It\'s a principle.',
        },
        {
          title: 'Students should ask questions without permission.',
          body: 'Many students don\'t ask the question they have because it feels too simple, too late, or somehow wrong. They sit quietly and hope they\'ll understand anyway. That hope is costly. Elevante is there after the lesson, without an audience, without time pressure — and takes the twenty-fifth question about integrals just as seriously as the first.',
        },
        {
          title: 'No two schools are alike.',
          body: 'A school in the north and one in the south have different schedules, different subjects, different ways of talking to their students. Elevante gives them shared infrastructure — but doesn\'t dictate how they use it. The teacher knows what works in their classroom. We build the tool. They decide what it does.',
        },
        {
          title: 'The teacher is the expert. AI is the assistant.',
          body: 'Elevante doesn\'t replace any teacher and doesn\'t try to. The teacher plans, explains and understands their students. We make sure that work doesn\'t disappear when the lesson ends.',
        },
        {
          title: 'No student should have to borrow notes.',
          body: 'If you missed a lesson, didn\'t follow along, or simply forgot — you shouldn\'t depend on someone else having written down the right things. The lesson is still there. It\'s yours.',
        },
        {
          title: 'Learning doesn\'t always happen on schedule.',
          body: 'Understanding comes when it comes — sometimes the night before a test, sometimes a week later. Elevante is there then too, not just in the classroom.',
        },
        {
          title: 'Privacy isn\'t a feature we added. It\'s how we built everything.',
          body: 'GDPR isn\'t a checkbox for us. It\'s a design decision that affects every choice — what we store, for how long, and who gets to see it.',
        },
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
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbLd(locale, '/om-oss', sv ? 'Om oss' : 'About')}
      />
      {/* HERO — manifest */}
      <section className="pt-20 pb-16 md:pt-28 md:pb-20">
        <Container width="wide">
          <p className="eyebrow mb-8">{sv ? 'Om oss' : 'About'}</p>
          <h1 className="font-serif text-[clamp(2.75rem,6vw+1rem,6rem)] leading-[0.98] tracking-[-0.015em] text-[var(--color-ink)]">
            {sv
              ? 'Läraren ska få vara lärare.'
              : 'Teachers deserve to be teachers.'}
          </h1>
          <p className="mt-10 max-w-2xl text-[1.125rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? 'Vi tror att läraren ska få vara lärare och eleven ska få vara elev. Inte assistenter åt en kursplattform från 2006. Elevante är ett verktyg byggt för båda.'
              : 'We believe the teacher should be the teacher and the student should be the student. Not assistants to a 2006 course platform. Elevante is built for both.'}
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
              <div className="relative mt-8 h-56 overflow-hidden rounded-[16px]">
                <Image
                  src="/images/javier-trueba-unsplash.jpg"
                  alt={sv ? 'Klassrum' : 'Classroom'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              </div>
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
          <div className="mt-16 grid gap-x-16 gap-y-12 md:grid-cols-2">
            {beliefs.map((b, i) => (
              <div key={i} className="border-l-2 border-[var(--color-coral)] pl-6">
                <p className="font-serif text-[clamp(1.25rem,1.25vw+1rem,1.625rem)] italic leading-snug text-[var(--color-ink)]">
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
              john@elevante.se · Stockholm
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
