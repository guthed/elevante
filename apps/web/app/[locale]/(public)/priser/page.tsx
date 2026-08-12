import { Fragment } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { alternatesFor, breadcrumbLd, socialFor } from '@/lib/site';
import { JsonLd } from '@/components/public/JsonLd';
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
  const title = sv ? 'Priser — Elevante' : 'Pricing — Elevante';
  const description = sv
    ? 'Ett tydligt pris för hela skolan — 500 kr per elev och år. Allt ingår, och det är inget läromedel ni köper per ämne.'
    : 'A clear price for the whole school — SEK 500 per student per year. Everything included, and it is not a textbook you buy per subject.';
  return {
    alternates: alternatesFor(locale, '/priser'),
    title,
    description,
    ...socialFor(locale, '/priser', title, description),
  };
}

// Editorial Calm — priset som ett kort, läromedel-argumentet som bärande sektion.

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
        'Rollbaserade behörigheter',
      ]
    : [
        'Recording and transcription of all lessons',
        'AI chat for all students and teachers',
        'School admin dashboard',
        'GDPR-DPA and data storage in Stockholm',
        'Onboarding and support',
        'Role-based permissions',
      ];

  // Läromedel → Elevante. Vänster dämpad, höger aktiv (coral).
  const notTextbookRows: [string, string][] = sv
    ? [
        [
          'Köps in per ämne, årskurs och upplaga',
          'Ett pris för hela skolan — alla ämnen, år efter år',
        ],
        [
          'Eget innehåll som måste kvalitetsgranskas',
          'Inget eget innehåll — strikt RAG på lärarens egen lektion',
        ],
        [
          'Ännu ett material eleverna ska ta till sig',
          'Bevarar undervisningen som redan hålls',
        ],
      ]
    : [
        [
          'Bought per subject, year group and edition',
          'One price for the whole school — every subject, year after year',
        ],
        [
          'Its own content that has to be vetted for quality',
          'No content of its own — strict RAG on the teacher’s own lesson',
        ],
        [
          'One more resource for students to take in',
          'Preserves the teaching that already happens',
        ],
      ];

  const faqs: FaqItem[] = sv
    ? [
        {
          q: 'Vad ingår i priset?',
          a: 'Allt ingår i priset på 500 kr per elev och år. Det betyder inspelning och transkribering av alla lektioner, AI-chat för alla elever och lärare, skoladmin-dashboarden, GDPR-DPA, datalagring i Stockholm samt onboarding och support. Det finns inga moduler att köpa till.',
        },
        {
          q: 'Är Elevante ett läromedel?',
          a: 'Nej. Ett läromedel är innehåll som köps in per ämne och upplaga och som ska kvalitetsgranskas. Elevante har inget eget innehåll — AI:n svarar strikt utifrån lärarens egen inspelade lektion. Därför köps det inte per ämne, ligger inte i läromedelsbudgeten och kräver ingen innehållsgranskning. Priset på 500 kr per elev och år gäller hela skolan, alla ämnen — och ska jämföras med lärartid och särskilt stöd, inte med läromedelsbudgeten.',
        },
        {
          q: 'Hur fungerar faktureringen?',
          a: 'Faktureringen sker årsvis till skolan eller huvudmannen. Antalet elever beräknas på antalet aktiva användare vid kvartalsstart, så ni betalar för den faktiska användningen. Ni får en samlad faktura — inga licenser att administrera per användare.',
        },
        {
          q: 'Är priset inkl. moms?',
          a: 'Priset anges exkl. moms — 500 kr per elev och år. Hur momsen faller ut i praktiken beror på om ni är kommunal eller fristående huvudman, och det reder vi ut i offerten.',
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
          q: 'Hur kan vi utvärdera Elevante innan vi bestämmer oss?',
          a: 'Boka en demo, så går vi igenom Elevante med er — och ni kan klicka igenom hela produkten själva i en interaktiv demo, utan att installera något. Det finns ingen minimigräns: när ni bestämmer er kan ni börja med en skola och rulla ut bredare i er egen takt.',
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
          a: 'Om ni avslutar avtalet exporterar vi all er data till er och raderar alla personuppgifter — transkript, elevkonton och allt som kan kopplas till en enskild person — inom 30 dagar. Datan tillhör skolan och det finns ingen inlåsning. För att förbättra tjänsten kan vi behålla helt avidentifierad, aggregerad statistik som inte kan kopplas till någon elev. Ingen AI tränas någonsin på elevers personuppgifter.',
        },
        {
          q: 'Hur skiljer sig priset från en lärplattform?',
          a: 'En lärplattform och Elevante löser olika saker, så det är inte ett antingen-eller. Elevante ersätter inte er lärplattform utan kompletterar den genom att bevara själva lektionen. Priset på 500 kr per elev och år täcker hela den funktionen.',
        },
        {
          q: 'Vad kostar det att inte göra något?',
          a: 'Att inte göra något har också ett pris. Sveriges Lärares undersökning (2024) visar att 9 av 10 lärare ägnar tid åt annat än undervisning, och Skolverket (Attityder till skolan 2024) att 6 av 10 lärare ser elever med rätt till särskilt stöd sällan eller bara ibland få det. Elevante köper tillbaka lärartid och ger varje elev stöd på lektionens innehåll. Mätt mot lärartid och särskilt stöd är 500 kr per elev och år en liten kostnad.',
        },
      ]
    : [
        {
          q: 'What is included in the price?',
          a: 'Everything is included in the price of SEK 500 per student per year. That means recording and transcription of all lessons, AI chat for all students and teachers, the school admin dashboard, the GDPR-DPA, data storage in Stockholm, and onboarding and support. There are no modules to buy on top.',
        },
        {
          q: 'Is Elevante a textbook?',
          a: 'No. A textbook is content bought per subject and edition that has to be vetted for quality. Elevante has no content of its own — the AI answers strictly from the teacher’s own recorded lesson. So it is not bought per subject, does not sit in the teaching-materials budget, and needs no content review. The price of SEK 500 per student per year covers the whole school, every subject — and should be compared to teacher time and support, not to the teaching-materials budget.',
        },
        {
          q: 'How does billing work?',
          a: 'Billing is annual, to the school or operator. The student count is based on active users at the start of each quarter, so you pay for actual usage. You get one consolidated invoice — no per-user licences to administer.',
        },
        {
          q: 'Does the price include VAT?',
          a: 'Prices are shown excluding VAT — SEK 500 per student per year. How VAT works out in practice depends on whether you are a municipal or independent operator, and we sort that out in the quote.',
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
          q: 'How can we evaluate Elevante before we decide?',
          a: 'Book a demo and we’ll walk through Elevante with you — and you can click through the whole product yourself in an interactive demo, with nothing to install. There is no minimum: once you decide, you can start with one school and roll out more widely at your own pace.',
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
          a: 'If you end the agreement, we export all your data to you and delete all personal data — transcripts, student accounts and anything that can be linked to an individual — within 30 days. The data belongs to the school and there is no lock-in. To improve the service we may keep fully anonymised, aggregated statistics that cannot be linked to any student. No AI is ever trained on students’ personal data.',
        },
        {
          q: 'How does the price compare to a learning platform?',
          a: 'A learning platform and Elevante solve different things, so it is not an either-or. Elevante does not replace your learning platform; it complements it by preserving the lesson itself. The price of SEK 500 per student per year covers that whole function.',
        },
        {
          q: 'What does it cost to do nothing?',
          a: 'Doing nothing has a price too. A teachers’ union survey (Sveriges Lärare, 2024) found that 9 in 10 teachers spend time on things other than teaching, and the Swedish National Agency for Education (Attitudes to school 2024) that 6 in 10 teachers see students entitled to extra support rarely or only sometimes get it. Elevante buys back teacher time and gives every student support on the lesson content. Measured against teacher time and support, SEK 500 per student per year is a small cost.',
        },
      ];

  return (
    <>
      <JsonLd
        data={breadcrumbLd(locale, '/priser', sv ? 'Priser' : 'Pricing')}
      />
      <section className="pt-16 pb-12 md:pt-24 md:pb-16">
        <Container width="content">
          <div className="text-center">
            <p className="eyebrow mb-6">{sv ? 'Priser' : 'Pricing'}</p>
            <h1 className="hero-title text-[var(--color-ink)]">
              {sv ? 'Ett pris. ' : 'One price. '}
              <span className="italic text-[var(--color-coral)]">
                {sv ? 'Allt ingår.' : 'Everything included.'}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[1.125rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Inga setup-avgifter. Inga modulpåslag. Volymrabatt från 1 000 elever.'
                : 'No setup fees. No module upcharges. Volume discount from 1,000 students.'}
            </p>
          </div>
        </Container>
      </section>

      {/* PRIS — editorial, ingen box. Ett pris finns att förstå, inte att
          välja mellan, så kortet fyllde ingen funktion: det klämde bara ihop
          innehållet till halva radbredden och tvingade fram radbrytningar. */}
      <section className="pb-20 md:pb-28">
        <Container width="content">
          <div className="border-t border-[var(--color-sand)]">
            <div className="grid gap-10 py-10 md:grid-cols-12 md:gap-16 md:py-12">
              {/* Prisrälen */}
              <div className="md:col-span-4">
                <p className="eyebrow">{sv ? 'Pris per skola' : 'Price per school'}</p>
                <p className="mt-3 font-serif text-[clamp(3rem,6vw+1rem,4.5rem)] leading-[0.92] tracking-[-0.02em] text-[var(--color-ink)]">
                  {sv ? '500 kr' : 'SEK 500'}
                </p>
                <p className="mt-1.5 text-[1.0625rem] text-[var(--color-ink)]">
                  {sv ? 'per elev och år' : 'per student and year'}
                </p>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-[var(--color-ink-muted)]">
                  {sv
                    ? 'Drygt en krona per elev och dag.'
                    : 'Just over one krona per student a day.'}
                </p>
              </div>

              {/* Vad som ingår — en kolumn, full bredd ⇒ varje punkt på en rad */}
              <div className="md:col-span-8">
                <p className="text-[1.0625rem] leading-relaxed text-[var(--color-ink)]">
                  {sv
                    ? 'För en hel skola — alla lärare, alla elever, alla ämnen.'
                    : 'For a whole school — all teachers, all students, all subjects.'}
                </p>
                <ul className="mt-6 space-y-3">
                  {inclusions.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[0.9375rem] leading-snug text-[var(--color-ink)]"
                    >
                      <Check />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 border-t border-[var(--color-sand)] py-8">
              <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                {sv ? 'Boka demo' : 'Book demo'}
              </LinkButton>
              <LinkButton href={`${base}/vad-kostar-elevante`} variant="text" size="lg">
                {sv ? 'Räkna ut ert pris →' : 'Work out your price →'}
              </LinkButton>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 border-t border-[var(--color-sand)] pt-6 text-[0.875rem] text-[var(--color-ink-secondary)]">
              <span className="eyebrow">{sv ? 'Volymrabatt' : 'Volume discount'}</span>
              <span>
                {sv ? 'Från 1 000 elever' : 'From 1,000 students'}{' '}
                <span className="font-medium text-[var(--color-coral)]">−8&nbsp;%</span>
              </span>
              <span>
                {sv ? 'Från 5 000 elever' : 'From 5,000 students'}{' '}
                <span className="font-medium text-[var(--color-coral)]">−15&nbsp;%</span>
              </span>
              <span className="text-[0.8125rem] text-[var(--color-ink-soft)]">
                {sv ? 'Alla priser exkl. moms.' : 'All prices exclude VAT.'}
              </span>
            </div>
          </div>

          <p className="mt-6 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv ? 'Huvudman med flera skolor? ' : 'Operator with several schools? '}
            <Link
              href={`${base}/kontakt?topic=pricing`}
              className="text-[var(--color-ink)] underline decoration-[var(--color-coral)] underline-offset-4"
            >
              {sv ? 'Vi tar fram en anpassad offert.' : 'We’ll put together a custom quote.'}
            </Link>
          </p>
        </Container>
      </section>

      {/* DETTA ÄR INTE ETT LÄROMEDEL — bärande argument */}
      <section className="border-t border-[var(--color-sand)] py-20 md:py-28">
        <Container width="content">
          <p className="eyebrow mb-4">{sv ? 'Vad ni betalar för' : 'What you’re paying for'}</p>
          <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.75rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Detta är ' : 'This is '}
            <span className="italic text-[var(--color-coral)]">
              {sv ? 'inte ett läromedel.' : 'not a textbook.'}
            </span>
          </h2>
          <p className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? 'Ett läromedel är innehåll ni köper, granskar och byter ut. Elevante är inget av det — det är era egna lektioner, bevarade. Inget nytt stoff, inget att kvalitetsgranska, inget att köpa per ämne.'
              : 'A textbook is content you buy, vet and replace. Elevante is none of that — it is your own lessons, preserved. No new material, nothing to quality-check, nothing to buy per subject.'}
          </p>

          <div className="mt-12 grid grid-cols-2 overflow-hidden rounded-[16px] border border-[var(--color-sand)]">
            <div className="bg-[var(--color-surface-soft)] px-5 py-4 md:px-7">
              <span className="text-[0.75rem] font-medium uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                {sv ? 'Ett läromedel' : 'A textbook'}
              </span>
            </div>
            <div className="border-l-[3px] border-l-[var(--color-coral)] bg-[var(--color-surface)] px-5 py-4 md:px-7">
              <span className="text-[0.75rem] font-medium uppercase tracking-[0.12em] text-[var(--color-coral)]">
                Elevante
              </span>
            </div>
            {notTextbookRows.map(([oldItem, neo], i) => (
              <Fragment key={i}>
                <div className="border-t border-t-[var(--color-sand)] bg-[var(--color-surface-soft)] px-5 py-5 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)] md:px-7">
                  {oldItem}
                </div>
                <div className="border-t border-l-[3px] border-t-[var(--color-sand)] border-l-[var(--color-coral)] bg-[var(--color-surface)] px-5 py-5 text-[0.9375rem] leading-relaxed text-[var(--color-ink)] md:px-7">
                  {neo}
                </div>
              </Fragment>
            ))}
          </div>

          <p className="mt-10 max-w-2xl font-serif text-[clamp(1.25rem,1.5vw+1rem,1.625rem)] italic leading-snug text-[var(--color-ink)]">
            {sv
              ? 'Därför är priset ett — inte ett per titel. Och därför ligger det inte i läromedelsbudgeten.'
              : 'That is why the price is one — not one per title. And why it does not sit in the teaching-materials budget.'}
          </p>
        </Container>
      </section>

      {/* JÄMFÖR MED RÄTT SAK — omramning med källbelagda siffror */}
      <section className="bg-[var(--color-surface-soft)] py-20 md:py-28">
        <Container width="content">
          <h2 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.75rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Jämför med ' : 'Compare it to '}
            <span className="italic text-[var(--color-coral)]">{sv ? 'rätt sak.' : 'the right thing.'}</span>
          </h2>
          <p className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? 'Läromedelsbudgeten är liten — i snitt 1 165 kr per elev och år, och sedan 1 juli 2024 lagligt öronmärkt för läroböcker. Elevante kan inte betalas ur den. Mätt mot vad en gymnasieplats faktiskt kostar — 141 500 kr per elev och år — är 500 kr 0,35 %. Den verkliga kostnaden ligger i lärartid och stöd:'
              : 'The teaching-materials budget is small — on average SEK 1,165 per student a year, and since 1 July 2024 legally earmarked for textbooks. Elevante cannot be paid from it. Against what an upper-secondary place actually costs — SEK 141,500 per student a year — SEK 500 is 0.35%. The real cost sits in teacher time and support:'}
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            <StatCard
              figure={sv ? '9 av 10' : '9 in 10'}
              claim={
                sv
                  ? 'lärare ägnar tid åt annat än undervisning.'
                  : 'teachers spend time on things other than teaching.'
              }
              source={sv ? 'Sveriges Lärare, 2024' : 'Sveriges Lärare (teachers’ union), 2024'}
            />
            <StatCard
              figure={sv ? '6 av 10' : '6 in 10'}
              claim={
                sv
                  ? 'lärare ser elever med rätt till särskilt stöd sällan eller bara ibland få det.'
                  : 'teachers see students entitled to extra support rarely or only sometimes get it.'
              }
              source={
                sv
                  ? 'Skolverket, Attityder till skolan 2024'
                  : 'Swedish National Agency for Education, 2024'
              }
            />
          </div>

          <p className="mt-10 max-w-2xl font-serif text-[clamp(1.25rem,1.5vw+1rem,1.625rem)] italic leading-snug text-[var(--color-ink)]">
            {sv
              ? 'Det är där Elevante gör skillnad — och där priset ska mätas. Inte mot en bok.'
              : 'That is where Elevante makes a difference — and where the price should be measured. Not against a book.'}
          </p>

          <p className="mt-8 max-w-2xl text-[0.8125rem] leading-relaxed text-[var(--color-ink-soft)]">
            {sv
              ? 'Källor: Läromedelsbarometern 2023 (läromedel per elev); skollagen (kostnadsfria läroböcker sedan 1 juli 2024); SCB (kostnad per gymnasieelev 2023); Sveriges Lärare, Med orimliga förutsättningar (2024); Skolverket, Attityder till skolan 2024, delrapport 3.'
              : 'Sources: Läromedelsbarometern 2023 (materials spend per student); the Swedish Education Act (free textbooks since 1 July 2024); Statistics Sweden (cost per upper-secondary student, 2023); Sveriges Lärare, Med orimliga förutsättningar (2024); Swedish National Agency for Education, Attitudes to school 2024, sub-report 3.'}
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
            locale={locale}
          />
        </Container>
      </section>
    </>
  );
}

function StatCard({
  figure,
  claim,
  source,
}: {
  figure: string;
  claim: string;
  source: string;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-7">
      <p className="font-serif text-[clamp(2.5rem,4vw+1rem,3.25rem)] leading-none tracking-[-0.02em] text-[var(--color-coral)]">
        {figure}
      </p>
      <p className="mt-4 text-[1rem] leading-snug text-[var(--color-ink)]">{claim}</p>
      <p className="mt-5 text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-ink-soft)]">
        {source}
      </p>
    </div>
  );
}

function Check() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="mt-[0.15rem] h-[1.05rem] w-[1.05rem] shrink-0 text-[var(--color-sage-deep)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10.5 8 14.5 16 5.5" />
    </svg>
  );
}
