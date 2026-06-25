import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/showcase/Reveal';
import ZoomableShot from '@/components/showcase/ZoomableShot';
import { LoopStep, RecVisual, TranscribeVisual, AskVisual } from '@/components/showcase/LoopVisuals';

import shotOversikt from '../../public/rektor/larare-oversikt.png';
import shotTranskript from '../../public/rektor/transkribering.png';
import shotRattning from '../../public/rektor/prov-rattning.png';
import shotKarta from '../../public/rektor/forstaelse-karta.png';
import shotChat from '../../public/rektor/chat-kallor.png';

export const metadata: Metadata = {
  title: { absolute: 'Elevante — för dig som lärare' },
  description:
    'Du äger lektionen och bestämmer när du spelar in. Elevante minns genomgången åt dina elever — ett pedagogiskt stöd för repetition, aldrig ett övervakningsverktyg.',
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

export default function LararePage() {
  return (
    <main className="bg-canvas text-ink">
      {/* 01 — HERO */}
      <section className="flex min-h-[88vh] items-center px-6 py-24 sm:px-10">
        <div className="container-content w-full">
          <Eyebrow>För dig som lärare</Eyebrow>
          <h1 className="mt-6 font-serif text-6xl leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
            Elevante<span className="text-coral">.</span>
          </h1>
          <p className="mt-6 font-serif text-2xl italic text-ink-secondary sm:text-3xl">
            Elevante minns allt du lär dig i skolan.
          </p>
          <p className="mt-10 max-w-2xl border-t border-ink/10 pt-8 text-lg leading-relaxed text-ink-secondary">
            Du håller en genomtänkt lektion — och i samma stund det ringer ut börjar den blekna.
            Eleven som var sjuk, den som inte hann anteckna, den som behöver höra det en gång till:
            alla kommer tillbaka till dig med samma frågor. Elevante minns lektionen åt dem, så att
            din tid räcker till det som faktiskt kräver en lärare.
          </p>
          <p className="mt-12 text-sm text-ink-muted">Scrolla ↓</p>
        </div>
      </section>

      {/* 01b — SHOWCASE: DIN ÖVERSIKT */}
      <section
        className="py-16 md:flex md:min-h-screen md:items-center md:py-24"
        style={{ backgroundImage: 'radial-gradient(70% 55% at 50% 45%, rgba(232,220,196,0.55), var(--color-canvas) 72%)' }}
      >
        <div className="mx-auto w-full max-w-[80rem] sm:px-10">
          <Reveal>
            <figure>
              <ZoomableShot
                src={shotOversikt}
                alt="Lärarens översikt i Elevante med veckans insikt och dagens lektioner"
                sizes="(max-width: 768px) 100vw, 90vw"
                className="h-auto w-full shadow-[0_30px_80px_-32px_rgba(60,44,24,0.35)] ring-1 ring-ink/[0.08] sm:rounded-2xl"
              />
              <figcaption className="eyebrow mt-6 px-4 text-center text-ink-muted">
                Din översikt · veckans insikt
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* 02 — PROBLEMET */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Din vardag</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Samma fråga, om och om igen</h2>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { tag: 'Var sjuk', who: 'Eleven som missade veckan', desc: 'Kommer tillbaka och vill att du går igenom alltihop igen.' },
              { tag: 'Hann inte med', who: 'Eleven mitt i ledet', desc: 'Skulle behövt höra begreppet en gång till — men du var redan vidare.' },
              { tag: 'Vågar inte fråga', who: 'Eleven längst bak', desc: 'Sitter tyst med en lucka som växer.' },
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
              Du kan inte vara tillgänglig för var och en, hela tiden. Och repetitionen hamnar oftast
              hemma — <em className="text-coral not-italic">där alla elever inte har samma stöd</em>.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 03 — SÅ FUNKAR DET */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Så funkar det</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Max två tryck. Sen sköter det sig.</h2>
            <p className="mt-5 max-w-xl text-lg text-ink-secondary">
              Du trycker igång inspelningen. Resten sköts automatiskt — lektionen blir text på svenska
              som eleverna kan ställa frågor till, med svar som bara bygger på det du faktiskt sa.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Reveal delay={0}>
              <LoopStep number="01" title="Du trycker REC" visual={<RecVisual sv />} body="Schemat vet resten — vilken klass, vilken kurs, vilken lektion. Max två tryck." />
            </Reveal>
            <Reveal delay={90}>
              <LoopStep number="02" title="Vi transkriberar" visual={<TranscribeVisual sv />} body="Genomgången blir text på svenska. Råljudet raderas direkt efteråt." />
            </Reveal>
            <Reveal delay={180}>
              <LoopStep number="03" title="Eleven frågar" visual={<AskVisual sv />} body="I sin egen takt — och får svar med citat ur din genomgång." />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 03b — SHOWCASE: LEKTIONEN BLIR TEXT */}
      <section
        className="py-16 md:flex md:min-h-screen md:items-center md:py-24"
        style={{ backgroundImage: 'radial-gradient(70% 55% at 50% 45%, rgba(232,220,196,0.55), var(--color-canvas) 72%)' }}
      >
        <div className="mx-auto w-full max-w-[80rem] sm:px-10">
          <Reveal>
            <figure>
              <ZoomableShot
                src={shotTranskript}
                alt="Transkriberingen av en inspelad lektion i Elevante"
                sizes="(max-width: 768px) 100vw, 90vw"
                className="h-auto w-full shadow-[0_30px_80px_-32px_rgba(60,44,24,0.35)] ring-1 ring-ink/[0.08] sm:rounded-2xl"
              />
              <figcaption className="eyebrow mt-6 px-4 text-center text-ink-muted">
                Lektionen blir sökbar text
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* 04 — DU BEHÅLLER KONTROLLEN */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content grid items-start gap-12 md:grid-cols-2">
          <div>
            <Reveal>
              <Eyebrow>Du behåller kontrollen</Eyebrow>
              <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Inspelat på dina villkor</h2>
            </Reveal>
            <div className="mt-12 flex flex-col gap-7">
              {[
                { h: 'Du bestämmer när', p: 'Inspelningen sker bara när du trycker igång. Ingen lektion spelas in i smyg.' },
                { h: 'Ditt material, ditt tolkningsföreträde', p: 'Svaren bygger på din genomgång. Eleven möter din undervisning — inte en generisk källa. Du har sista ordet om vad som gäller.' },
                { h: 'Aldrig ett övervakningsverktyg', p: 'Elevante är ett pedagogiskt stöd för repetition. Ingen lektion blir underlag för att granska dig — det är garanterat.' },
              ].map((c, i) => (
                <Reveal key={c.h} delay={i * 80}>
                  <div className="flex gap-5">
                    <span className="mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-full font-serif text-lg text-sage-deep" style={{ background: 'rgba(184,197,166,0.4)' }} aria-hidden>✓</span>
                    <div>
                      <h3 className="font-serif text-2xl">{c.h}</h3>
                      <p className="mt-1.5 text-ink-muted">{c.p}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={120}>
            <figure>
              <ZoomableShot
                src={shotChat}
                alt="Elevante-chatt där svaret bygger på lärarens genomgång och visar källan"
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-auto w-full rounded-2xl shadow-lift"
              />
              <figcaption className="eyebrow mt-4">Eleven frågar · svar ur din genomgång</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* 05 — TIDEN TILLBAKA */}
      <section className="px-6 py-24 sm:px-10 sm:py-32">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Tiden tillbaka</Eyebrow>
            <p className="mt-6 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl md:text-6xl">
              Mer tid till det som <em className="text-coral">faktiskt kräver en lärare.</em>
            </p>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-secondary">
              De återkommande frågorna efter lektionen tar Elevante. Eleven får en tålmodig första
              instans, dygnet runt och i egen takt — och du får tillbaka tid och studiero till det som
              faktiskt behöver dig.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 05b — SHOWCASE: AI-RÄTTNING */}
      <section
        className="py-16 md:flex md:min-h-screen md:items-center md:py-24"
        style={{ backgroundImage: 'radial-gradient(70% 55% at 50% 45%, rgba(232,220,196,0.55), var(--color-canvas) 72%)' }}
      >
        <div className="mx-auto w-full max-w-[80rem] sm:px-10">
          <Reveal>
            <figure>
              <ZoomableShot
                src={shotRattning}
                alt="AI-rättning av ett klassprov i Elevante där läraren granskar och justerar"
                sizes="(max-width: 768px) 100vw, 90vw"
                className="h-auto w-full shadow-[0_30px_80px_-32px_rgba(60,44,24,0.35)] ring-1 ring-ink/[0.08] sm:rounded-2xl"
              />
              <figcaption className="eyebrow mt-6 px-4 text-center text-ink-muted">
                AI-rättning · du granskar och släpper
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* 06 — EXTRA ANPASSNINGAR */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Extra anpassningar</Eyebrow>
            <h2 className="mt-4 max-w-2xl font-serif text-4xl sm:text-5xl">Stöd som gör skillnad</h2>
            <p className="mt-6 max-w-2xl text-lg text-ink-secondary">
              För elever i behov av extra anpassningar gör det stor skillnad. Att läsa i lugn takt,
              lyssna om, repetera utan press — särskilt vid NPF eller dyslexi, och för nyanlända och
              elever i SVA, där tröskeln in i ämnet sänks när orden finns kvar.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 07 — DIN INSIKT */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Din insikt</Eyebrow>
            <h2 className="mt-4 max-w-2xl font-serif text-4xl sm:text-5xl">Se vad klassen fastnar på</h2>
            <p className="mt-6 max-w-2xl text-lg text-ink-secondary">
              Efter en lektion ser du vilka begrepp eleverna återkommer till och kämpar med — klass
              för klass. Inte för att rätta dig, utan för att du ska veta var du kan lägga krutet nästa
              gång.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 07b — SHOWCASE: FÖRSTÅELSEKARTA */}
      <section
        className="py-16 md:flex md:min-h-screen md:items-center md:py-24"
        style={{ backgroundImage: 'radial-gradient(70% 55% at 50% 45%, rgba(232,220,196,0.55), var(--color-canvas) 72%)' }}
      >
        <div className="mx-auto w-full max-w-[80rem] sm:px-10">
          <Reveal>
            <figure>
              <ZoomableShot
                src={shotKarta}
                alt="Förståelsekarta i Elevante som visar vilka begrepp varje elev frågat om, klass för klass"
                sizes="(max-width: 768px) 100vw, 90vw"
                className="h-auto w-full shadow-[0_30px_80px_-32px_rgba(60,44,24,0.35)] ring-1 ring-ink/[0.08] sm:rounded-2xl"
              />
              <figcaption className="eyebrow mt-6 px-4 text-center text-ink-muted">
                Din förståelsekarta · per klass och begrepp
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* 08 — TRYGGT */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Tryggt med personuppgifter</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Tryggt för dig och dina elever</h2>
          </Reveal>
          <div className="mt-12 grid gap-x-14 gap-y-9 sm:grid-cols-2">
            {[
              { n: '01', h: 'All data inom EU', p: 'All databehandling sker inom EU — inget skickas utanför.' },
              { n: '02', h: 'Svensk transkribering', p: 'KB-Whisper via Berget AI — byggt för svenska, kört i Sverige.' },
              { n: '03', h: 'Råljudet raderas', p: 'Ljudet tas bort så snart transkriberingen är klar. Bara texten finns kvar.' },
              { n: '04', h: 'PUB-avtal — skolan äger datan', p: 'Personuppgiftsbiträdesavtal på plats, med huvudmannen som personuppgiftsansvarig.' },
            ].map((t, i) => (
              <Reveal key={t.n} delay={(i % 2) * 80}>
                <div className="flex gap-5">
                  <span className="font-serif text-2xl text-sage-deep">{t.n}</span>
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

      {/* 09 — KOM IGÅNG */}
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
              Starta en kostnadsfri pilot med en klass, en kurs, en månad — och känn själv om det ger
              dig tid och studiero tillbaka.
            </p>
            <p className="mt-8 text-canvas/70">
              <span className="font-semibold text-canvas">Gratis pilot</span> · en klass · en kurs ·
              en månad
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex flex-col items-start gap-10">
              <a href="mailto:john@elevante.se" className="inline-flex min-h-[56px] items-center gap-4 rounded-full bg-canvas px-10 py-4 font-medium text-ink transition-transform hover:scale-[1.02]">
                Boka en demo <span className="text-coral">→</span>
              </a>
              <div className="leading-relaxed text-canvas/60">
                <span className="font-semibold text-canvas">John Guthed</span>
                <br />
                john@elevante.se
                <br />
                elevante.se
              </div>
              <Link href="/rektor" className="text-sm text-canvas/50 underline-offset-4 hover:underline">
                Är du rektor? Läs mer här →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
