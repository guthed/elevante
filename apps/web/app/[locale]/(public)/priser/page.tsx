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
    title: sv ? 'Priser — Elevante' : 'Pricing — Elevante',
    description: sv
      ? 'En tydlig kostnad. Allt ingår. 500 kr per elev per år.'
      : 'A clear price. Everything included. SEK 500 per student per year.',
  };
}

// Editorial Calm — Stitch screen 06-priser.png

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;
  const sv = locale === 'sv';

  const inclusions = sv
    ? [
        'Inspelning och transkribering av alla lektioner',
        'AI-chat för alla elever och lärare',
        'Skoladmin-dashboard',
        'GDPR-DPA och datalagring i Stockholm',
        'Onboarding och support',
        'Roll-baserade behörigheter',
      ]
    : [
        'Recording and transcription of all lessons',
        'AI chat for all students and teachers',
        'School admin dashboard',
        'GDPR-DPA and data storage in Stockholm',
        'Onboarding and support',
        'Role-based permissions',
      ];

  const faqs: FaqItem[] = sv
    ? [
        {
          q: 'Vad ingår i priset?',
          a: 'Allt ingår i priset på 500 kr per elev och år. Det betyder inspelning och transkribering av alla lektioner, AI-chat för alla elever och lärare, skoladmin-dashboarden, GDPR-DPA, datalagring i Stockholm samt onboarding och support. Det finns inga moduler att köpa till.',
        },
        {
          q: 'Hur fungerar faktureringen?',
          a: 'Faktureringen sker årsvis till skolan eller huvudmannen. Antalet elever beräknas på antalet aktiva användare vid kvartalsstart, så ni betalar för den faktiska användningen. Ni får en samlad faktura — inga licenser att administrera per användare.',
        },
        {
          q: 'Hur räknas antalet elever?',
          a: 'Antalet elever räknas som de aktiva användarna vid varje kvartalsstart. Om en klass tillkommer mitt i terminen justeras det vid nästa kvartal. Ni betalar alltså aldrig för konton som inte används.',
        },
        {
          q: 'Finns det setup-avgifter eller dolda kostnader?',
          a: 'Nej. Det finns inga setup-avgifter, inga installationskostnader och inga dolda påslag. Onboarding och support ingår i årspriset, och vi tar inte betalt för att lägga till lärare eller klasser.',
        },
        {
          q: 'Kostar det extra per lektion eller per fråga?',
          a: 'Nej. Priset är detsamma oavsett hur mycket Elevante används. Lärarna kan spela in så många lektioner de vill och eleverna kan ställa hur många frågor som helst — det påverkar inte kostnaden.',
        },
        {
          q: 'Finns det bindningstid?',
          a: 'Avtalet löper ett år i taget och kan sägas upp med tre månaders varsel. Vi vill att ni stannar för att Elevante levererar, inte för att ni är bundna. Det finns ingen inlåsning.',
        },
        {
          q: 'Kan vi testa Elevante innan vi köper?',
          a: 'Ja. En enskild klass kan köra Elevante gratis i tre månader som pilot innan ni fattar beslut om hela skolan. Det ger lärare och elever en chans att testa i verkligheten, och er ett underlag att utvärdera.',
        },
        {
          q: 'Vilka volymrabatter finns det?',
          a: 'Volymrabatt utgår från 1 000 elever med 8 procent och från 5 000 elever med 15 procent. För större huvudmän och kommuner tar vi gärna fram en anpassad offert. Rabatten dras direkt på årspriset per elev.',
        },
        {
          q: 'Vad krävs av oss för att komma igång?',
          a: 'Ni behöver tre saker: ett påskrivet GDPR-personuppgiftsbiträdesavtal, en kontaktperson hos er, och tillgång till schemat. När det är på plats sköter vi resten — onboarding, konton och uppsättning ingår.',
        },
        {
          q: 'Får alla lärare och elever tillgång?',
          a: 'Ja. Alla lärare och alla elever på skolan ingår i priset. Det finns inga roller eller funktioner som kostar extra, och ni behöver inte välja ut vilka som ska få tillgång.',
        },
        {
          q: 'Vad händer med vår data om vi avslutar?',
          a: 'Om ni avslutar avtalet exporterar vi all er data till er och raderar våra kopior inom 30 dagar. Det finns ingen inlåsning — datan tillhör skolan. Ni får alltså med er allt om ni byter lösning.',
        },
        {
          q: 'Hur skiljer sig priset från en lärplattform?',
          a: 'En lärplattform och Elevante löser olika saker, så det är inte ett antingen-eller. Elevante ersätter inte er lärplattform utan kompletterar den genom att bevara själva lektionen. Priset på 500 kr per elev och år täcker hela den funktionen.',
        },
        {
          q: 'Vad kostar det att inte göra något?',
          a: 'En lärare svarar i snitt på samma fråga 30 gånger per termin, och elever som halkar efter kostar mer per timme i läxhjälp än Elevante kostar per år. Till det kommer den kostnad ingen vill prata om: en elev som tappar modet. Att inte göra något är sällan gratis.',
        },
      ]
    : [
        {
          q: 'What is included in the price?',
          a: 'Everything is included in the price of SEK 500 per student per year. That means recording and transcription of all lessons, AI chat for all students and teachers, the school admin dashboard, the GDPR-DPA, data storage in Stockholm, and onboarding and support. There are no modules to buy on top.',
        },
        {
          q: 'How does billing work?',
          a: 'Billing is annual, to the school or operator. The student count is based on active users at the start of each quarter, so you pay for actual usage. You get one consolidated invoice — no per-user licences to administer.',
        },
        {
          q: 'How is the student count calculated?',
          a: 'The student count is the active users at the start of each quarter. If a class joins mid-term, it is adjusted at the next quarter. So you never pay for accounts that are not used.',
        },
        {
          q: 'Are there setup fees or hidden costs?',
          a: 'No. There are no setup fees, no installation costs and no hidden surcharges. Onboarding and support are included in the annual price, and we do not charge to add teachers or classes.',
        },
        {
          q: 'Does it cost extra per lesson or per question?',
          a: 'No. The price is the same regardless of how much Elevante is used. Teachers can record as many lessons as they want and students can ask any number of questions — it does not affect the cost.',
        },
        {
          q: 'Is there a lock-in period?',
          a: 'The agreement runs one year at a time and can be cancelled with three months\' notice. We want you to stay because Elevante delivers, not because you are locked in. There is no lock-in.',
        },
        {
          q: 'Can we try Elevante before we buy?',
          a: 'Yes. A single class can run Elevante free for three months as a pilot before you decide on the whole school. It gives teachers and students a chance to test it for real, and gives you something concrete to evaluate.',
        },
        {
          q: 'What volume discounts are there?',
          a: 'Volume discounts start at 1,000 students with 8 percent and at 5,000 students with 15 percent. For larger operators and municipalities we are happy to put together a custom quote. The discount is applied directly to the annual per-student price.',
        },
        {
          q: 'What is required from us to get started?',
          a: 'You need three things: a signed GDPR data processing agreement, a contact person on your side, and access to the schedule. Once that is in place we handle the rest — onboarding, accounts and setup are included.',
        },
        {
          q: 'Do all teachers and students get access?',
          a: 'Yes. All teachers and all students at the school are included in the price. There are no roles or features that cost extra, and you do not need to select who gets access.',
        },
        {
          q: 'What happens to our data if we leave?',
          a: 'If you end the agreement, we export all your data to you and delete our copies within 30 days. There is no lock-in — the data belongs to the school. So you take everything with you if you switch solutions.',
        },
        {
          q: 'How does the price compare to a learning platform?',
          a: 'A learning platform and Elevante solve different things, so it is not an either-or. Elevante does not replace your learning platform; it complements it by preserving the lesson itself. The price of SEK 500 per student per year covers that whole function.',
        },
        {
          q: 'What does it cost to do nothing?',
          a: 'A teacher answers the same question 30 times a term on average, and students who fall behind cost more per hour in tutoring than Elevante costs per year. On top of that comes the cost nobody wants to talk about: a student who loses heart. Doing nothing is rarely free.',
        },
      ];

  return (
    <>
      <section className="pt-16 pb-12 md:pt-24 md:pb-16">
        <Container width="content">
          <div className="text-center">
            <p className="eyebrow mb-6">{sv ? 'Priser' : 'Pricing'}</p>
            <h1 className="font-serif text-[clamp(2.5rem,5vw+1rem,4.5rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
              {sv ? 'En tydlig kostnad. Allt ingår.' : 'A clear price. Everything included.'}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[1.125rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Inga setup-avgifter. Inga modulpåslag. Volymrabatt från 1 000 elever.'
                : 'No setup fees. No module upcharges. Volume discount from 1,000 students.'}
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-20 md:pb-28">
        <Container width="wide">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <nav className="md:col-span-4">
              <ul className="space-y-1">
                <PlanItem name={sv ? 'Pilot' : 'Pilot'} subtitle={sv ? '1 klass' : '1 class'} />
                <PlanItem name={sv ? 'Skola' : 'School'} subtitle={sv ? 'En enskild skola' : 'A single school'} active />
                <PlanItem name={sv ? 'Huvudman' : 'Operator'} subtitle={sv ? 'Flera skolor / kommun' : 'Multiple schools / municipality'} />
              </ul>
            </nav>

            <div className="md:col-span-8">
              <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
                {sv ? 'Skola' : 'School'}
              </h2>
              <p className="mt-6 font-serif text-[clamp(2.5rem,4.5vw+1rem,4rem)] leading-[0.95] tracking-[-0.02em] text-[var(--color-ink)]">
                {sv ? '500 kr per elev per år' : 'SEK 500 per student per year'}
              </p>
              <p className="mt-4 max-w-xl text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'För en hel skola. Alla lärare och alla elever ingår. Allt vi bygger, ingår.'
                  : 'For a whole school. All teachers and all students included. Everything we build, included.'}
              </p>

              <ul className="mt-10 space-y-3">
                {inclusions.map((item, i) => (
                  <li
                    key={i}
                    className="border-l-2 border-[var(--color-sand)] pl-5 text-[1rem] leading-relaxed text-[var(--color-ink)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                  {sv ? 'Boka demo' : 'Book demo'}
                </LinkButton>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-[var(--color-sand)] py-12 md:py-16">
        <Container width="wide">
          <div className="grid gap-8 md:grid-cols-3">
            <Compare
              name={sv ? 'Pilot' : 'Pilot'}
              desc={sv ? 'En klass på prov.' : 'One class on a trial.'}
              price={sv ? 'Gratis i 3 månader' : 'Free for 3 months'}
            />
            <Compare
              name={sv ? 'Skola' : 'School'}
              desc={sv ? 'Hela skolan, alla lärare och elever.' : 'Whole school, all teachers and students.'}
              price={sv ? '500 kr / elev / år' : 'SEK 500 / student / year'}
              active
            />
            <Compare
              name={sv ? 'Huvudman' : 'Operator'}
              desc={sv ? 'Flera skolor under en avtal.' : 'Multiple schools under one contract.'}
              price={sv ? 'Anpassad offert' : 'Custom quote'}
            />
          </div>
        </Container>
      </section>

      <section className="py-20 md:py-28">
        <Container width="content">
          <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.25rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Vad det INTE kostar' : 'What it does NOT cost'}
          </h2>
          <ul className="mt-8 space-y-4 text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
            <li className="border-l-2 border-[var(--color-sage)] pl-5">
              {sv ? 'Setup. Vi gör onboarding utan extra avgift.' : 'Setup. We onboard at no extra cost.'}
            </li>
            <li className="border-l-2 border-[var(--color-sage)] pl-5">
              {sv ? 'Lektionstimmar. Spelar in så mycket ni vill.' : 'Lesson hours. Record as much as you want.'}
            </li>
            <li className="border-l-2 border-[var(--color-sage)] pl-5">
              {sv ? 'Lagring. Allt ingår.' : 'Storage. Everything included.'}
            </li>
          </ul>
        </Container>
      </section>

      <section className="bg-[var(--color-surface-soft)] py-20 md:py-28">
        <Container width="content">
          <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.25rem)] italic leading-tight text-[var(--color-ink)]">
            {sv ? 'Vad det kostar att INTE göra något' : 'What it costs to do nothing'}
          </h2>
          <p className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? 'En lärare svarar i snitt på samma fråga 30 gånger per termin. Elever som halkar efter kostar mer per timme i läxhjälp än Elevante kostar per år. Och en elev som tappar mod är en kostnad ingen vill prata om.'
              : 'A teacher answers the same question 30 times a term on average. Students who fall behind cost more per hour in tutoring than Elevante costs per year. And a discouraged student is a cost nobody wants to talk about.'}
          </p>
        </Container>
      </section>

      {/* FAQ — AEO-motorn */}
      <section className="py-20 md:py-28">
        <Container width="content">
          <Faq
            heading={sv ? 'Vanliga frågor' : 'Frequently asked questions'}
            intro={
              sv
                ? 'Det skolor oftast vill ha svar på innan de bestämmer sig.'
                : 'What schools most often want answered before they decide.'
            }
            items={faqs}
          />
        </Container>
      </section>
    </>
  );
}

function PlanItem({
  name,
  subtitle,
  active = false,
}: {
  name: string;
  subtitle: string;
  active?: boolean;
}) {
  return (
    <li
      className={`rounded-[12px] px-4 py-4 transition-colors ${
        active ? 'bg-[var(--color-sand)]/40' : 'hover:bg-[var(--color-surface-soft)]'
      }`}
    >
      <p className="font-serif text-[1.125rem] text-[var(--color-ink)]">{name}</p>
      <p className="mt-1 text-[0.875rem] text-[var(--color-ink-muted)]">{subtitle}</p>
    </li>
  );
}

function Compare({
  name,
  desc,
  price,
  active = false,
}: {
  name: string;
  desc: string;
  price: string;
  active?: boolean;
}) {
  return (
    <div className={`${active ? 'border-t-2 border-[var(--color-coral)]' : 'border-t-2 border-transparent'} pt-6`}>
      <p className="font-serif text-[1.125rem] text-[var(--color-ink)]">{name}</p>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">{desc}</p>
      <p className="mt-3 text-[0.875rem] font-medium text-[var(--color-ink)]">{price}</p>
    </div>
  );
}
