import type { Metadata } from 'next';
import Image from 'next/image';
import Reveal from './Reveal';
import ChatDemo from './ChatDemo';

import shotChat from '../../public/rektor/shot-chat-kallor.png';
import shotElev from '../../public/rektor/shot-elev-oversikt.png';
import shotKarta from '../../public/rektor/shot-forstaelsekarta.png';

export const metadata: Metadata = {
  title: { absolute: 'Elevante — för din skola' },
  description:
    'Elevante minns allt du lär dig i skolan. Spela in lektionen, transkribera på svenska, låt eleverna fråga om innehållet och få svar med källa.',
  robots: { index: false, follow: false },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="eyebrow flex items-center gap-3">
      <span className="inline-block h-px w-9 bg-coral" aria-hidden />
      {children}
    </p>
  );
}

export default function SkolanPage() {
  return (
    <main className="bg-canvas text-ink">
      {/* 01 — HERO */}
      <section className="flex min-h-[88vh] items-center px-6 py-24 sm:px-10">
        <div className="container-content w-full">
          <Eyebrow>För din skola</Eyebrow>
          <h1 className="mt-6 font-serif text-6xl leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
            Elevante<span className="text-coral">.</span>
          </h1>
          <p className="mt-6 font-serif text-2xl italic text-ink-secondary sm:text-3xl">
            Elevante minns allt du lär dig i skolan.
          </p>
          <p className="mt-10 max-w-2xl border-t border-ink/10 pt-8 text-lg leading-relaxed text-ink-secondary">
            Varje dag försvinner timmar av undervisning. En elev är borta, hänger
            inte med, eller vågar inte fråga — och det finns ingen backup som
            faktiskt var med i klassrummet. Vi byggde Elevante för att varje elev
            ska kunna gå tillbaka till lektionen som hölls, inte till ett
            generellt svar från nätet.
          </p>
          <p className="mt-12 text-sm text-ink-muted">Scrolla ↓</p>
        </div>
      </section>

      {/* 02 — PROBLEMET */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Problemet</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              Tre elever, samma lucka
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              {
                tag: 'Var sjuk',
                who: 'Eleven som missade veckan',
                desc: 'Kommer tillbaka till en genomgång som redan är borta.',
              },
              {
                tag: 'Hänger inte med',
                who: 'Eleven som tappar tempot',
                desc: 'Hinner inte landa ett begrepp innan nästa redan är igång.',
              },
              {
                tag: 'Pluggar inför provet',
                who: 'Eleven kvällen innan',
                desc: 'Sitter med anteckningar som inte riktigt räcker hela vägen.',
              },
            ].map((p, i) => (
              <Reveal key={p.tag} delay={i * 90}>
                <div className="h-full rounded-2xl bg-surface p-7 shadow-soft">
                  <span className="eyebrow">{p.tag}</span>
                  <p className="mt-3 font-serif text-2xl italic">{p.who}</p>
                  <p className="mt-3 text-ink-muted">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-12 max-w-2xl font-serif text-3xl leading-snug">
              Idag googlar de — eller frågar ChatGPT — och får svar som inte har{' '}
              <em className="text-coral not-italic">någonting</em> med er
              undervisning att göra.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 03 — LÖSNINGEN */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <Eyebrow>Lösningen</Eyebrow>
            <p className="mt-6 font-serif text-4xl leading-tight sm:text-5xl">
              Spelar in, transkriberar <em className="text-coral">på svenska</em>{' '}
              — och svarar på elevens frågor.
            </p>
            <p className="mt-6 max-w-md text-lg text-ink-secondary">
              Svaren är grundade i lektionen som faktiskt hölls, med citat ur
              genomgången. Inte i något generellt på nätet.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <figure>
              <Image
                src={shotChat}
                alt="Elevante-chatt med svar och källhänvisningar ur lektionen"
                sizes="(max-width: 768px) 100vw, 50vw"
                placeholder="blur"
                className="h-auto w-full rounded-2xl shadow-lift"
              />
              <figcaption className="eyebrow mt-4">
                Fråga Elevante · svar med källor
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* 04 — PROVA SJÄLV */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <div className="mx-auto mb-10 max-w-xl text-center">
              <Eyebrow>
                <span className="mx-auto">Se det själv</span>
              </Eyebrow>
              <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
                Så känns det för eleven
              </h2>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <ChatDemo />
          </Reveal>
        </div>
      </section>

      {/* 05 — SÅ FUNKAR DET */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Så funkar det</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              Tre steg, inget krångel
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {[
              {
                n: '01',
                h: 'Läraren trycker REC',
                p: 'Schemat vet resten — vilken klass, vilken kurs, vilken lektion. Max två tryck.',
              },
              {
                n: '02',
                h: 'Vi transkriberar',
                p: 'Genomgången blir text på svenska. Råljudet raderas direkt efteråt.',
              },
              {
                n: '03',
                h: 'Eleven frågar',
                p: 'I sin egen takt — och får svar med citat ur den egna lektionen.',
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="font-serif text-6xl text-coral">{s.n}</div>
                <h3 className="mt-5 font-serif text-2xl">{s.h}</h3>
                <p className="mt-3 max-w-xs text-ink-muted">{s.p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 06 — INTE CHATGPT */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Det här är inte ChatGPT</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              Bunden till er undervisning
            </h2>
          </Reveal>
          <div className="mt-12 flex max-w-2xl flex-col gap-7">
            {[
              {
                h: 'Kan inte hitta på',
                p: (
                  <>
                    Strikt RAG<sup className="text-coral">*</sup> — modellen
                    svarar bara utifrån det som faktiskt sades på lektionen.
                  </>
                ),
              },
              {
                h: 'Visar alltid källan',
                p: 'Varje svar pekar tillbaka till stället i genomgången där det kom ifrån.',
              },
              {
                h: 'Förstärker läraren',
                p: 'Bygger på lärarens auktoritet i stället för att ersätta den.',
              },
            ].map((c, i) => (
              <Reveal key={c.h} delay={i * 80}>
                <div className="flex gap-5">
                  <span
                    className="mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-full font-serif text-lg text-sage-deep"
                    style={{ background: 'rgba(184,197,166,0.4)' }}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <div>
                    <h3 className="font-serif text-2xl">{c.h}</h3>
                    <p className="mt-1.5 text-ink-muted">{c.p}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-12 max-w-3xl border-t border-ink/10 pt-6 text-sm leading-relaxed text-ink-muted">
              <span className="font-semibold text-coral">*</span> RAG
              (Retrieval-Augmented Generation) innebär att modellen först hämtar
              relevanta avsnitt ur er egen lektion och sedan formulerar svaret
              utifrån dem. Den kan därför inte hitta på fritt — svaret är alltid
              bundet till källan.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 07 — FÖR ELEVEN */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>För eleven</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              Samma lektion, fler chanser
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                h: 'Likvärdig tillgång',
                p: 'Varje elev kommer åt varje lektion — oavsett om de var där eller inte.',
                coral: false,
              },
              {
                h: 'Repetition i egen takt',
                p: 'Gå tillbaka, fråga om, ta begreppet en gång till. Utan att hålla upp klassen.',
                coral: false,
              },
              {
                h: 'Stöd som gör skillnad',
                p: 'Särskilt värdefullt för elever med NPF eller dyslexi — och för nyanlända och SVA, där text att läsa i lugn takt sänker tröskeln in i ämnet.',
                coral: true,
              },
            ].map((b, i) => (
              <Reveal key={b.h} delay={i * 90}>
                <div className="flex gap-4">
                  <span
                    className={`mt-2.5 h-3 w-3 flex-none rounded-full ${
                      b.coral ? 'bg-coral' : 'bg-sage-deep'
                    }`}
                    aria-hidden
                  />
                  <div>
                    <h3 className="font-serif text-xl">{b.h}</h3>
                    <p className="mt-1 text-ink-muted">{b.p}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 07b — SHOWCASE: ELEVENS VY */}
      <section
        className="py-16 md:flex md:min-h-screen md:items-center md:py-24"
        style={{
          backgroundImage:
            'radial-gradient(70% 55% at 50% 45%, rgba(232,220,196,0.55), var(--color-canvas) 72%)',
        }}
      >
        <div className="mx-auto w-full max-w-[80rem] sm:px-10">
          <Reveal>
            <figure>
              <Image
                src={shotElev}
                alt="Elevens översikt i Elevante med dagens lektioner och senaste chatt"
                sizes="(max-width: 768px) 100vw, 80vw"
                placeholder="blur"
                className="h-auto w-full shadow-[0_30px_80px_-32px_rgba(60,44,24,0.35)] ring-1 ring-ink/[0.08] sm:rounded-2xl"
              />
              <figcaption className="eyebrow mt-6 px-4 text-center text-ink-muted">
                Elevens vy · dagens lektioner
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* 08 — FÖR REKTOR */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>För dig som rektor</Eyebrow>
            <h2 className="mt-4 max-w-2xl font-serif text-4xl sm:text-5xl">
              En förståelsekarta, inte bara betyg
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-ink-secondary">
              Du ser vilka koncept eleverna faktiskt kämpar med — klass för
              klass, medan terminen pågår. Underlag för pedagogiskt ledarskap,
              inte bara betyg i efterhand.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 08b — SHOWCASE: FÖRSTÅELSEKARTAN */}
      <section
        className="py-16 md:flex md:min-h-screen md:items-center md:py-24"
        style={{
          backgroundImage:
            'radial-gradient(70% 55% at 50% 45%, rgba(232,220,196,0.55), var(--color-canvas) 72%)',
        }}
      >
        <div className="mx-auto w-full max-w-[80rem] sm:px-10">
          <Reveal>
            <figure>
              <Image
                src={shotKarta}
                alt="Förståelsekarta i Elevante som visar vilka koncept varje elev frågat om"
                sizes="(max-width: 768px) 100vw, 90vw"
                placeholder="blur"
                className="h-auto w-full shadow-[0_30px_80px_-32px_rgba(60,44,24,0.35)] ring-1 ring-ink/[0.08] sm:rounded-2xl"
              />
              <figcaption className="eyebrow mt-6 px-4 text-center text-ink-muted">
                Förståelsekarta · per klass och koncept
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* 09 — HELA SKOLAN */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Inte bara eleven</Eyebrow>
            <h2 className="mt-4 max-w-3xl font-serif text-4xl sm:text-5xl">
              Vi lyfter hela skolan, inte bara den enskilda eleven
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <Reveal>
              <div className="border-t-2 border-sage pt-7">
                <h3 className="font-serif text-2xl">En gemensam grund</h3>
                <p className="mt-4 max-w-md text-ink-secondary">
                  När varje genomgång finns kvar blir undervisningen mindre
                  sårbar — för frånvaro, vikarier och tempo. Skolan får en
                  gemensam, kvalitetssäkrad grund att vila på, inte bara enskilda
                  elever som råkar klara sig.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="border-t-2 border-coral pt-7">
                <h3 className="font-serif text-2xl">
                  Lärartid som räcker till fler
                </h3>
                <p className="mt-4 max-w-md text-ink-secondary">
                  Du vet att enskilda elever kan ta väldigt mycket av en lärares
                  tid. Elevante ger varje elev en tålmodig första instans för
                  sina frågor — så att lärarens uppmärksamhet kan fördelas mer
                  likvärdigt, över hela klassen.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 10 — PERSONUPPGIFTER */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Tryggt med personuppgifter</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              Byggt för svensk skola
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-x-14 gap-y-9 sm:grid-cols-2">
            {[
              {
                n: '01',
                h: 'All data inom EU',
                p: 'All databehandling sker inom EU — inget skickas utanför.',
              },
              {
                n: '02',
                h: 'Svensk transkribering',
                p: 'KB-Whisper via Berget AI — byggt för svenska, kört i Sverige.',
              },
              {
                n: '03',
                h: 'Råljudet raderas',
                p: 'Ljudet tas bort så snart transkriberingen är klar. Bara texten finns kvar.',
              },
              {
                n: '04',
                h: 'PUB-avtal — ni äger datan',
                p: 'Personuppgiftsbiträdesavtal på plats. Skolan äger sin data.',
              },
            ].map((t, i) => (
              <Reveal key={t.n} delay={(i % 2) * 80}>
                <div className="flex gap-5">
                  <span className="font-serif text-2xl text-sage-deep">
                    {t.n}
                  </span>
                  <div>
                    <h3 className="font-serif text-xl">{t.h}</h3>
                    <p className="mt-1.5 text-ink-muted">{t.p}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 11 — DET HÄR MÄTER VI */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Det här mäter vi i piloten</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              Så vet vi att det funkar
            </h2>
            <p className="mt-5 max-w-xl text-lg text-ink-secondary">
              Piloten är inte en magkänsla. Vi följer fyra konkreta mått — och
              stämmer av med dig efter en månad.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-x-14 gap-y-10 sm:grid-cols-2">
            {[
              {
                n: '01',
                h: 'Användning per elev',
                p: 'Hur många elever som faktiskt återvänder, hur ofta och inför vad — så vi ser om verktyget blir en vana eller bara provas en gång.',
              },
              {
                n: '02',
                h: 'Vilka koncept som repeteras mest',
                p: 'Vilka begrepp eleverna gång på gång går tillbaka till. Det pekar ut var i kursen lärandet behöver mest stöd — klass för klass.',
              },
              {
                n: '03',
                h: 'Lärarnas upplevda tidsvinst',
                p: 'Hur mycket repetitionsfrågor som lyfts av läraren. Vi frågar lärarna direkt — kändes det som mindre friktion i vardagen?',
              },
              {
                n: '04',
                h: 'Elevernas upplevelse',
                p: 'Om eleverna känner att de förstår stoffet bättre och vågar fråga mer. Tryggheten i att kunna ta lektionen en gång till.',
              },
            ].map((m, i) => (
              <Reveal key={m.n} delay={(i % 2) * 80}>
                <div className="text-sm font-semibold uppercase tracking-wider text-coral">
                  {m.n}
                </div>
                <h3 className="mt-2 font-serif text-2xl">{m.h}</h3>
                <p className="mt-2 max-w-md text-ink-muted">{m.p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 12 — KOM IGÅNG */}
      <section className="bg-ink px-6 py-24 text-canvas sm:px-10 sm:py-32">
        <div className="container-content grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <p className="eyebrow flex items-center gap-3 text-canvas/60">
              <span className="inline-block h-px w-9 bg-coral" aria-hidden />
              Kom igång
            </p>
            <h2 className="mt-5 font-serif text-5xl text-canvas sm:text-6xl">
              Börja i det lilla<span className="text-coral">.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg text-canvas/70">
              Starta en kostnadsfri pilot med en klass, en kurs, en månad — och
              se vad den gör för era elever innan ni bestämmer något mer.
            </p>
            <p className="mt-8 text-canvas/70">
              <span className="font-semibold text-canvas">Gratis pilot</span> ·
              en klass · en kurs · en månad
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex flex-col items-start gap-10">
              <a
                href="mailto:john@elevante.se"
                className="inline-flex min-h-[56px] items-center gap-4 rounded-full bg-canvas px-10 py-4 font-medium text-ink transition-transform hover:scale-[1.02]"
              >
                Boka en demo <span className="text-coral">→</span>
              </a>
              <div className="leading-relaxed text-canvas/60">
                <span className="font-semibold text-canvas">John Guthed</span>
                <br />
                john@elevante.se
                <br />
                elevante.se
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
