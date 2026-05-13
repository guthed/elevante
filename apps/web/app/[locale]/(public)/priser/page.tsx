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

  const faqs = sv
    ? [
        { q: 'Hur fungerar fakturering?', a: 'Årsvis fakturering till skolan eller huvudmannen. Antal elever beräknas på antalet aktiva användare vid kvartalsstart.' },
        { q: 'Vad händer om vi avslutar?', a: 'Vi exporterar all data till er och raderar våra kopior inom 30 dagar. Ingen lock-in.' },
        { q: 'Vad krävs av oss för att komma igång?', a: 'Påskrivet GDPR-DPA, en kontaktperson hos er, och tillgång till schemat. Vi sköter resten.' },
        { q: 'Får alla lärare tillgång?', a: 'Ja. Alla lärare och alla elever på skolan ingår i priset.' },
        { q: 'Volymrabatter?', a: 'Från 1 000 elever 8%. Från 5 000 elever 15%. Vi diskuterar gärna individuellt.' },
      ]
    : [
        { q: 'How is billing handled?', a: 'Annual billing to the school or operator. Student count is based on active users at the start of each quarter.' },
        { q: 'What happens if we leave?', a: 'We export all data to you and delete our copies within 30 days. No lock-in.' },
        { q: 'What\'s required to get started?', a: 'A signed GDPR-DPA, a contact person on your side, and access to the schedule. We handle the rest.' },
        { q: 'Do all teachers get access?', a: 'Yes. All teachers and all students at the school are included.' },
        { q: 'Volume discounts?', a: 'From 1,000 students 8%. From 5,000 students 15%. Happy to discuss individually.' },
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

      <section className="py-20 md:py-28">
        <Container width="content">
          <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.25rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Vanliga frågor' : 'FAQ'}
          </h2>
          <div className="mt-12">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group border-t border-[var(--color-sand)] last:border-b"
                open={i === 0}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5">
                  <span className="font-serif text-[1.25rem] text-[var(--color-ink)]">
                    {faq.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className="mt-1 text-[var(--color-ink-muted)] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-6 pr-10 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
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
