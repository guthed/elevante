# Rektor- & lärarsidor (interaktiv webb) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bygg två dedikerade, delbara scroll-sidor — `/rektor` och `/larare` — i Editorial Calm, byggda ur ett delat showcase-bibliotek, med skollingo-copy och aktuella appskärmdumpar. Bevara rektorsbildspelet på `/rektor/deck`.

**Architecture:** Lyft de interaktiva delarna (`Reveal`, `ZoomableShot`, `ChatDemo`, samt startsidans animerade loop-visualer) till `apps/web/components/showcase/`. Skriv om `/rektor` (idag ett `DeckStage`-bildspel) till en `<main>` scroll-sida som återanvänder dessa delar + den redan godkända skollingo-copyn. Bygg `/larare` på samma mönster. Flytta bildspelet till `/rektor/deck`. Redirecta `/skolan → /rektor`.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Tailwind CSS v4, `next/image`. Sidorna ligger utanför `[locale]` (svenska only, `noindex`).

**Verifiering i den här kodbasen:** Det finns inget enhetstest-ramverk för marknadssidorna. "Testet" för varje task är därför (a) `pnpm build` i `apps/web/` utan typ-/byggfel, och (b) visuell kontroll via preview-verktyget. Det följer kodbasens befintliga mönster (sidorna i `app/skolan/`, `app/[locale]/(public)/` har inga tester).

**Referenser att läsa innan start:**
- Spec: `docs/superpowers/specs/2026-06-25-rektor-larare-sidor-design.md`
- Mönster att kopiera layout/klasser från: `apps/web/app/skolan/page.tsx`
- Godkänd rektors-copy (skollingo): nuvarande `apps/web/app/rektor/page.tsx` (bildspelet) — copyn återanvänds, formatet byts.
- Startsidans loop-visualer som extraheras: `apps/web/app/[locale]/(public)/page.tsx` rad ~341–429.

---

## Filstruktur

**Nya filer:**
- `apps/web/components/showcase/Reveal.tsx` — scroll-in-animation (flyttad)
- `apps/web/components/showcase/ZoomableShot.tsx` — klick-zoom på skärmbild (flyttad)
- `apps/web/components/showcase/ChatDemo.tsx` — live chattdemo (flyttad)
- `apps/web/components/showcase/LoopVisuals.tsx` — `RecVisual`, `TranscribeVisual`, `AskVisual`, `LoopStep` (extraherade ur startsidan)
- `apps/web/app/rektor/deck/page.tsx` — bildspelet (flyttat hit)
- `apps/web/app/larare/page.tsx` — ny lärarsida

**Ändrade filer:**
- `apps/web/app/[locale]/(public)/page.tsx` — importerar loop-visualer istället för inline-definitioner
- `apps/web/app/skolan/page.tsx` — tas bort (ersätts av redirect)
- `apps/web/app/rektor/page.tsx` — skrivs om från bildspel till scroll-sida
- `apps/web/app/rektor/DeckStage.tsx` → flyttas till `apps/web/app/rektor/deck/DeckStage.tsx`
- `apps/web/app/rektor/deck.module.css` → flyttas till `apps/web/app/rektor/deck/deck.module.css`
- `apps/web/proxy.ts` eller `apps/web/next.config.*` — redirect `/skolan → /rektor`

**Bildtillgångar (redan på plats i `apps/web/public/rektor/`):**
`forstaelse-karta.png`, `chat-kallor.png`, `chat-rag-arlighet.png`, `elev-oversikt.png`, `larare-oversikt.png`, `larare-lektioner.png`, `transkribering.png`, `prov-rattning.png`, `delade-prov.png`, `testprov-feedback.png`, `larprofil.png`, `plugga-prov.png`.

---

## FAS 1 — Delat showcase-bibliotek

### Task 1: Flytta Reveal, ZoomableShot, ChatDemo till components/showcase/

**Files:**
- Move: `apps/web/app/skolan/Reveal.tsx` → `apps/web/components/showcase/Reveal.tsx`
- Move: `apps/web/app/skolan/ZoomableShot.tsx` → `apps/web/components/showcase/ZoomableShot.tsx`
- Move: `apps/web/app/skolan/ChatDemo.tsx` → `apps/web/components/showcase/ChatDemo.tsx`
- Modify: `apps/web/app/skolan/page.tsx` (imports)

- [ ] **Step 1: Skapa mappen och flytta filerna med git mv (bevarar historik)**

```bash
cd apps/web
mkdir -p components/showcase
git mv app/skolan/Reveal.tsx       components/showcase/Reveal.tsx
git mv app/skolan/ZoomableShot.tsx components/showcase/ZoomableShot.tsx
git mv app/skolan/ChatDemo.tsx     components/showcase/ChatDemo.tsx
```

- [ ] **Step 2: Uppdatera importerna i skolan/page.tsx**

I `apps/web/app/skolan/page.tsx`, byt de tre raderna:

```tsx
import Reveal from './Reveal';
import ChatDemo from './ChatDemo';
import ZoomableShot from './ZoomableShot';
```

till:

```tsx
import Reveal from '@/components/showcase/Reveal';
import ChatDemo from '@/components/showcase/ChatDemo';
import ZoomableShot from '@/components/showcase/ZoomableShot';
```

(Alla tre är default-exports; `@/*` mappar till `apps/web/*` enligt `tsconfig.json`.)

- [ ] **Step 3: Verifiera bygget**

Run (i `apps/web/`): `pnpm build`
Expected: Bygget lyckas, inga "module not found"-fel.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(showcase): flytta Reveal/ZoomableShot/ChatDemo till components/showcase"
```

---

### Task 2: Extrahera startsidans loop-visualer till LoopVisuals.tsx

**Files:**
- Create: `apps/web/components/showcase/LoopVisuals.tsx`
- Modify: `apps/web/app/[locale]/(public)/page.tsx` (ta bort inline-definitioner, importera)

- [ ] **Step 1: Skapa LoopVisuals.tsx med de fyra delarna**

Skapa `apps/web/components/showcase/LoopVisuals.tsx` med exakt innehåll (kopierat ordagrant från startsidans nuvarande inline-funktioner så att startsidan ser identisk ut):

```tsx
import type { ReactNode } from 'react';

export function LoopStep({
  number,
  title,
  body,
  visual,
}: {
  number: string;
  title: string;
  body: string;
  visual: ReactNode;
}) {
  return (
    <article className="flex flex-col">
      <div
        className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5"
        aria-hidden="true"
      >
        {visual}
      </div>
      <p className="mt-6 font-serif text-[1.25rem] leading-none text-[var(--color-coral)]">
        {number}
      </p>
      <h3 className="mt-3 font-serif text-[1.25rem] leading-snug text-[var(--color-ink)]">
        {title}
      </h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
        {body}
      </p>
    </article>
  );
}

export function RecVisual({ sv }: { sv: boolean }) {
  return (
    <div className="rounded-[12px] bg-[var(--color-ink)] p-4">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-coral)]" aria-hidden="true" />
        <span className="text-[0.625rem] uppercase tracking-[0.1em] text-white/80">REC</span>
      </div>
      <p className="mt-3 font-serif text-[0.9375rem] leading-tight text-[var(--color-canvas)]">
        {sv ? 'Integralberäkning' : 'Integrals'}
      </p>
      <p className="mt-0.5 text-[0.6875rem] text-white/50">
        {sv ? '10:15 · Matematik 4' : '10:15 · Math 4'}
      </p>
    </div>
  );
}

export function TranscribeVisual({ sv }: { sv: boolean }) {
  const bars = [40, 70, 30, 85, 55, 25, 60, 90, 45, 35, 75, 50, 65, 30, 80, 45];
  return (
    <div className="rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] p-4">
      <div className="flex h-9 items-center gap-[3px]" aria-hidden="true">
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-[var(--color-coral)]/70"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-3 text-[0.75rem] italic leading-relaxed text-[var(--color-ink-secondary)]">
        {sv
          ? '"…arean under kurvan mellan a och b…"'
          : '"…the area under the curve between a and b…"'}
      </p>
    </div>
  );
}

export function AskVisual({ sv }: { sv: boolean }) {
  return (
    <div className="rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] p-4">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[12px] bg-[var(--color-ink)] px-3 py-1.5 text-[0.6875rem] leading-snug text-[var(--color-canvas)]">
          {sv ? 'Vad menades med integral?' : 'What did integral mean?'}
        </div>
      </div>
      <div className="mt-2.5">
        <span className="source-pill">
          <span className="status-dot status-dot--sage" />
          {sv ? 'Lektion · 10:15' : 'Lesson · 10:15'}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ta bort inline-definitionerna i startsidan och importera istället**

I `apps/web/app/[locale]/(public)/page.tsx`:

1. Lägg till import högst upp (bland de andra `@/components`-importerna):

```tsx
import { LoopStep, RecVisual, TranscribeVisual, AskVisual } from '@/components/showcase/LoopVisuals';
```

2. Ta bort de fyra lokala funktionsdefinitionerna `LoopStep`, `RecVisual`, `TranscribeVisual`, `AskVisual` (nuvarande rad ~341–429, inkl. kommentaren `/* ── Loop-triptyk ──… */`). Lämna `DoorCard`-funktionen kvar. `ReactNode`-importen kan bli oanvänd — ta bort den ur `page.tsx` om så (kontrollera att inget annat använder den).

- [ ] **Step 3: Verifiera bygget och att startsidan är oförändrad**

Run (i `apps/web/`): `pnpm build`
Expected: Bygget lyckas.

Starta preview, gå till `/sv`, kontrollera att "Spela in. Spara. Fråga."-triptyken (REC-bricka, ljudvåg, chattbubbla) ser exakt likadan ut som tidigare.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(showcase): extrahera loop-visualer till LoopVisuals, återanvänd på startsidan"
```

---

## FAS 2 — `/rektor` scroll-sida + bevara bildspelet

### Task 3: Flytta bildspelet till /rektor/deck

**Files:**
- Move: `apps/web/app/rektor/DeckStage.tsx` → `apps/web/app/rektor/deck/DeckStage.tsx`
- Move: `apps/web/app/rektor/deck.module.css` → `apps/web/app/rektor/deck/deck.module.css`
- Create: `apps/web/app/rektor/deck/page.tsx` (flyttat innehåll från nuvarande `app/rektor/page.tsx`)

- [ ] **Step 1: Flytta DeckStage + CSS till deck/-mappen**

```bash
cd apps/web
mkdir -p app/rektor/deck
git mv app/rektor/DeckStage.tsx     app/rektor/deck/DeckStage.tsx
git mv app/rektor/deck.module.css   app/rektor/deck/deck.module.css
```

- [ ] **Step 2: Flytta nuvarande bildspels-sida till deck/page.tsx**

```bash
git mv app/rektor/page.tsx app/rektor/deck/page.tsx
```

I `app/rektor/deck/page.tsx`, justera de relativa importerna eftersom filen flyttats en nivå djupare:

```tsx
// FÖRE:
import DeckStage from './DeckStage';
import shotChat from '../../public/rektor/shot-chat-kallor.png';
import shotElev from '../../public/rektor/shot-elev-oversikt.png';
import shotKarta from '../../public/rektor/shot-forstaelsekarta.png';

// EFTER:
import DeckStage from './DeckStage';                       // ligger nu bredvid
import shotChat from '../../../public/rektor/shot-chat-kallor.png';
import shotElev from '../../../public/rektor/shot-elev-oversikt.png';
import shotKarta from '../../../public/rektor/shot-forstaelsekarta.png';
```

(`DeckStage`-importen är oförändrad — den ligger nu i samma mapp. Bara `../../public` → `../../../public` ändras.)

- [ ] **Step 3: Verifiera bildspelet på den nya URL:en**

Run (i `apps/web/`): `pnpm build`
Expected: Bygget lyckas.

Preview: gå till `/rektor/deck`, kontrollera att bildspelet renderas (piltangenter bläddrar, P för PDF). `/rektor` ger 404 i detta steg — det fixas i Task 4.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(rektor): flytta bildspelet till /rektor/deck"
```

---

### Task 4: Bygg /rektor som scroll-sida

**Files:**
- Create: `apps/web/app/rektor/page.tsx`

- [ ] **Step 1: Skapa den nya scroll-sidan**

Skapa `apps/web/app/rektor/page.tsx` med följande fullständiga innehåll. Copyn är den godkända skollingo-copyn; §08 är omformulerad till "vad du kan erbjuda dina lärare" (rektorn har ingen egen vy):

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/showcase/Reveal';
import ChatDemo from '@/components/showcase/ChatDemo';
import ZoomableShot from '@/components/showcase/ZoomableShot';
import { LoopStep, RecVisual, TranscribeVisual, AskVisual } from '@/components/showcase/LoopVisuals';

import shotChat from '../../public/rektor/chat-kallor.png';
import shotRag from '../../public/rektor/chat-rag-arlighet.png';
import shotElev from '../../public/rektor/elev-oversikt.png';
import shotKarta from '../../public/rektor/forstaelse-karta.png';

export const metadata: Metadata = {
  title: { absolute: 'Elevante — för dig som rektor' },
  description:
    'Det här kan du erbjuda dina lärare och elever: lektionen finns kvar, blir sökbar och ger varje elev samma chans att repetera — på lika villkor.',
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

export default function RektorPage() {
  return (
    <main className="bg-canvas text-ink">
      {/* 01 — HERO */}
      <section className="flex min-h-[88vh] items-center px-6 py-24 sm:px-10">
        <div className="container-content w-full">
          <Eyebrow>För dig som rektor</Eyebrow>
          <h1 className="mt-6 font-serif text-6xl leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
            Elevante<span className="text-coral">.</span>
          </h1>
          <p className="mt-6 font-serif text-2xl italic text-ink-secondary sm:text-3xl">
            Elevante minns allt du lär dig i skolan.
          </p>
          <p className="mt-10 max-w-2xl border-t border-ink/10 pt-8 text-lg leading-relaxed text-ink-secondary">
            Varje dag hålls genomtänkta lektioner — som försvinner i samma stund som det ringer ut.
            En elev är borta, en annan hänger inte med, en tredje vågar inte fråga. Och det finns
            ingen backup som faktiskt var med i klassrummet. Vi byggde Elevante för att varje elev
            ska kunna gå tillbaka till lektionen som hölls — inte till ett generellt svar från nätet.
          </p>
          <p className="mt-12 text-sm text-ink-muted">Scrolla ↓</p>
        </div>
      </section>

      {/* 02 — PROBLEMET */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Problemet</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Tre elever, samma behov</h2>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { tag: 'Var sjuk', who: 'Eleven som missade veckan', desc: 'Vill ta igen genomgången — men det finns inget att gå tillbaka till.' },
              { tag: 'Hänger inte med', who: 'Eleven som tappar tempot', desc: 'Skulle behöva höra begreppet en gång till — i sin egen takt.' },
              { tag: 'Pluggar inför provet', who: 'Eleven kvällen innan', desc: 'Sitter med anteckningar som inte riktigt räcker hela vägen.' },
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
              Idag googlar de — eller frågar ChatGPT — och får ett svar som inte har{' '}
              <em className="text-coral not-italic">något</em> med lektionen att göra. Den som har
              stöd hemma klarar sig ändå. Den som inte har det halkar efter.
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
              Spelar in, transkriberar <em className="text-coral">på svenska</em> — och svarar på
              elevens frågor.
            </p>
            <p className="mt-6 max-w-md text-lg text-ink-secondary">
              Svaren är grundade i lektionen som faktiskt hölls, med citat ur genomgången. Eleven
              möter er undervisning — inte ett svar från nätet.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <figure>
              <ZoomableShot
                src={shotChat}
                alt="Elevante-chatt med svar och källhänvisningar ur lektionen"
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-auto w-full rounded-2xl shadow-lift"
              />
              <figcaption className="eyebrow mt-4">Fråga Elevante · svar med källor</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* 04 — SÅ FUNKAR DET */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Så funkar det</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Tre steg, inget krångel</h2>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Reveal delay={0}>
              <LoopStep number="01" title="Läraren trycker REC" visual={<RecVisual sv />} body="Schemat vet resten — vilken klass, vilken kurs, vilken lektion. Max två tryck." />
            </Reveal>
            <Reveal delay={90}>
              <LoopStep number="02" title="Vi transkriberar" visual={<TranscribeVisual sv />} body="Genomgången blir text på svenska. Råljudet raderas direkt efteråt." />
            </Reveal>
            <Reveal delay={180}>
              <LoopStep number="03" title="Eleven frågar" visual={<AskVisual sv />} body="I sin egen takt — och får svar med citat ur den egna lektionen." />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 05 — SE DET SJÄLV (live chattdemo) */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <div className="mx-auto mb-10 max-w-xl text-center">
              <Eyebrow>
                <span className="mx-auto">Se det själv</span>
              </Eyebrow>
              <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Så känns det för eleven</h2>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <ChatDemo />
          </Reveal>
        </div>
      </section>

      {/* 06 — INTE CHATGPT */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content grid items-start gap-12 md:grid-cols-2">
          <div>
            <Reveal>
              <Eyebrow>Det här är inte ChatGPT</Eyebrow>
              <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Bunden till er undervisning</h2>
            </Reveal>
            <div className="mt-12 flex flex-col gap-7">
              {[
                { h: 'Kan inte hitta på', p: (<>Strikt RAG<sup className="text-coral">*</sup> — modellen svarar bara utifrån det som faktiskt sades på lektionen.</>) },
                { h: 'Visar alltid källan', p: 'Varje svar pekar tillbaka till stället i genomgången där det sas.' },
                { h: 'Förstärker läraren — ersätter den inte', p: 'Svaren bygger på lärarens egen genomgång. Eleven möter er undervisning, inte en generisk källa. Lärarens tolkningsföreträde är kvar.' },
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
            <Reveal>
              <p className="mt-12 max-w-xl border-t border-ink/10 pt-6 text-sm leading-relaxed text-ink-muted">
                <span className="font-semibold text-coral">*</span> RAG (Retrieval-Augmented
                Generation) innebär att modellen först hämtar relevanta avsnitt ur er egen lektion och
                sedan formulerar svaret utifrån dem. Den kan därför inte hitta på fritt — svaret är
                alltid bundet till källan.
              </p>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <figure>
              <ZoomableShot
                src={shotRag}
                alt="Elevante svarar att frågan inte togs upp på lektionen och visar ändå källorna"
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-auto w-full rounded-2xl shadow-lift"
              />
              <figcaption className="eyebrow mt-4">Togs det inte upp? Då säger Elevante det rakt ut.</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* 07 — FÖR LÄRAREN */}
      <section className="px-6 py-24 sm:px-10 sm:py-32">
        <div className="container-content">
          <Reveal>
            <Eyebrow>För läraren</Eyebrow>
            <p className="mt-6 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl md:text-6xl">
              Läraren äger lektionen. <em className="text-coral">Elevante minns den.</em>
            </p>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-secondary">
              Inget för- eller efterarbete, max två tryck. Elevante förstärker undervisningen — det
              ersätter aldrig läraren. Byggt med läraren, inte runt.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 08 — FÖR ELEVEN */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>För eleven</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Samma lektion, fler chanser</h2>
          </Reveal>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { h: 'Likvärdig tillgång', p: 'Varje elev kommer åt varje lektion — oavsett om de var på plats eller inte.', coral: false },
              { h: 'Repetition i egen takt', p: 'Gå tillbaka, fråga om, ta begreppet en gång till. Utan att hålla upp klassen.', coral: false },
              { h: 'Stöd som gör skillnad', p: 'Särskilt värdefullt för elever i behov av extra anpassningar — vid NPF eller dyslexi — och för nyanlända och elever i SVA, där text att läsa i lugn takt sänker tröskeln in i ämnet.', coral: true },
            ].map((b, i) => (
              <Reveal key={b.h} delay={i * 90}>
                <div className="flex gap-4">
                  <span className={`mt-2.5 h-3 w-3 flex-none rounded-full ${b.coral ? 'bg-coral' : 'bg-sage-deep'}`} aria-hidden />
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

      {/* 09 — DET DU KAN ERBJUDA DINA LÄRARE (förståelse-karta) */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Det här kan du erbjuda dina lärare</Eyebrow>
            <h2 className="mt-4 max-w-2xl font-serif text-4xl sm:text-5xl">En levande förståelsekarta</h2>
            <p className="mt-6 max-w-2xl text-lg text-ink-secondary">
              Dina lärare ser vilka begrepp klassen fastnar på — klass för klass, medan terminen
              pågår. Det blir underlag för det systematiska kvalitetsarbetet och för likvärdig
              måluppfyllelse. Du inför verktyget; läraren får syn på lärandet — du behöver inte
              granska någon. Kartan visar elevernas lärande, inte den enskilda lärarens arbete.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 09b — SHOWCASE: FÖRSTÅELSEKARTAN */}
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
                Lärarens förståelsekarta · per klass och begrepp
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* 10 — HELA SKOLAN */}
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
                  När varje genomgång finns kvar bygger ni en gemensam kunskapsbank som håller —
                  oavsett frånvaro, vikarier och tempo. En kvalitetssäkrad grund som hela skolan kan
                  vila på.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="border-t-2 border-coral pt-7">
                <h3 className="font-serif text-2xl">Lärartid som räcker till fler</h3>
                <p className="mt-4 max-w-md text-ink-secondary">
                  Vissa frågor återkommer om och om igen. Elevante ger varje elev en tålmodig första
                  instans — så att lärarens tid räcker till det som verkligen kräver en lärare.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 11 — PERSONUPPGIFTER */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Tryggt med personuppgifter</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Byggt för svensk skola</h2>
          </Reveal>
          <div className="mt-12 grid gap-x-14 gap-y-9 sm:grid-cols-2">
            {[
              { n: '01', h: 'All data inom EU', p: 'All databehandling sker inom EU — inget skickas utanför.' },
              { n: '02', h: 'Svensk transkribering', p: 'KB-Whisper via Berget AI — byggt för svenska, kört i Sverige.' },
              { n: '03', h: 'Råljudet raderas', p: 'Ljudet tas bort så snart transkriberingen är klar. Bara texten finns kvar.' },
              { n: '04', h: 'PUB-avtal — ni äger datan', p: 'Personuppgiftsbiträdesavtal på plats, med huvudmannen som personuppgiftsansvarig. Skolan äger sin data.' },
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

      {/* 12 — MÄTER I PILOTEN */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>Det här mäter vi i piloten</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Så vet vi att det funkar</h2>
            <p className="mt-5 max-w-xl text-lg text-ink-secondary">
              Piloten är inte en magkänsla. Vi följer fyra konkreta mått — och stämmer av med dig
              efter en månad.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-x-14 gap-y-10 sm:grid-cols-2">
            {[
              { n: '01', h: 'Användning per elev', p: 'Hur många elever som faktiskt återvänder, hur ofta och inför vad — så vi ser om verktyget blir en vana eller bara provas en gång.' },
              { n: '02', h: 'Vilka begrepp som repeteras mest', p: 'Vilka begrepp eleverna gång på gång går tillbaka till. Det pekar ut var i kursen lärandet behöver mest stöd — klass för klass.' },
              { n: '03', h: 'Lärarnas upplevda tidsvinst', p: 'Hur mycket repetition och omtagning som lyfts från läraren. Vi frågar lärarna direkt — kändes det som mindre friktion i vardagen?' },
              { n: '04', h: 'Elevernas upplevelse', p: 'Om eleverna känner att de förstår stoffet bättre och vågar fråga mer. Tryggheten i att kunna ta lektionen en gång till, i egen takt.' },
            ].map((m, i) => (
              <Reveal key={m.n} delay={(i % 2) * 80}>
                <div className="text-sm font-semibold uppercase tracking-wider text-coral">{m.n}</div>
                <h3 className="mt-2 font-serif text-2xl">{m.h}</h3>
                <p className="mt-2 max-w-md text-ink-muted">{m.p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 13 — KOM IGÅNG */}
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
              Starta en kostnadsfri pilot med en klass, en kurs, en månad — och se vad den gör för era
              elever innan ni bestämmer något mer.
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
              <Link href="/rektor/deck" className="text-sm text-canvas/50 underline-offset-4 hover:underline">
                Presentationsläge →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verifiera bygget**

Run (i `apps/web/`): `pnpm build`
Expected: Bygget lyckas, `/rektor` finns som statisk rutt.

- [ ] **Step 3: Visuell verifiering**

Starta preview, gå till `/rektor`. Kontrollera:
- Hero, alla sektioner renderas i ordning, Reveal-animationer triggar vid scroll.
- Skärmbilderna (chat-kallor, chat-rag-arlighet, förståelse-karta, ChatDemo) syns och `ZoomableShot` zoomar vid klick.
- §09 säger "Dina lärare ser…" (inte "Du ser…").
- "Presentationsläge →" länkar till `/rektor/deck`.
- Testa 375px och 1280px bredd (preview_resize).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(rektor): scroll-sida med skollingo-copy, showcase-komponenter och aktuella skärmdumpar"
```

---

## FAS 3 — `/larare`-sida

### Task 5: Ta fram skollingo-copy för lärarsidan (godkännandegrind)

**Files:**
- (Ingen kod) — utkast levereras till John för godkännande, beat-för-beat, i chatten.

- [ ] **Step 1: Skriv copy-utkast per beat på lärarens planhalva**

Skriv ett utkast (mirror på rektors-strukturen) med beats: Hero ("Du äger lektionen. Elevante minns den."), Problemet (lärarens vardag), Så funkar det (max två tryck), Du behåller kontrollen (tolkningsföreträde, du bestämmer när, inte övervakning), Studiero & avlastning, Extra anpassningar, Din insikt (förståelse-karta), Tryggt, Kom igång. Ankra i: tolkningsföreträde/profession, studiero, arbetsbörda/avlastning, extra anpassningar.

- [ ] **Step 2: Inhämta Johns godkännande**

Presentera utkastet och vänta på "godkänt"/justeringar innan Task 6. Bygg INTE sidan på ogodkänd copy.

---

### Task 6: Bygg /larare

**Files:**
- Create: `apps/web/app/larare/page.tsx`

- [ ] **Step 1: Skapa sidan med samma mönster som /rektor**

Skapa `apps/web/app/larare/page.tsx` enligt exakt samma struktur och Tailwind-klasser som `/rektor` (Task 4) — samma `Eyebrow`-hjälpare, `Reveal`, `LoopStep`/visualer, `ZoomableShot`, `ChatDemo`, mörk CTA-sektion — men med den i Task 5 godkända lärar-copyn och dessa skärmdumpar:
- Hero/insikt: `../../public/rektor/larare-oversikt.png`
- Din insikt: `../../public/rektor/forstaelse-karta.png`
- Så funkar det / inspelning → text: `../../public/rektor/larare-lektioner.png` + `../../public/rektor/transkribering.png`
- Avlastning / AI-rättning: `../../public/rektor/prov-rattning.png`
- Elevvärde: `../../public/rektor/chat-kallor.png`

`metadata`: `title: { absolute: 'Elevante — för dig som lärare' }`, beskrivning på lärarens språk, `robots: { index: false, follow: false }`. Lägg en "Presentationsläge →"-länk till `/rektor/deck` om så önskas (valfritt — bekräfta med John).

- [ ] **Step 2: Verifiera bygget**

Run (i `apps/web/`): `pnpm build`
Expected: Bygget lyckas, `/larare` finns som statisk rutt.

- [ ] **Step 3: Visuell verifiering**

Preview `/larare`: alla sektioner, animationer, zoombara skärmbilder, responsivt 375/1280px.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(larare): dedikerad lärarsida i samma showcase-mönster"
```

---

## FAS 4 — Städning

### Task 7: Redirect /skolan → /rektor och ta bort gamla sidan

**Files:**
- Modify: `apps/web/proxy.ts` (lägg till redirect) ELLER `apps/web/next.config.ts`
- Delete: `apps/web/app/skolan/` (page.tsx + skolan.module.css)

- [ ] **Step 1: Lägg till redirect**

Föredragen väg — Next.js `redirects()` i `apps/web/next.config.ts` (kontrollera filändelse; använd den som finns). Lägg till:

```ts
async redirects() {
  return [
    { source: '/skolan', destination: '/rektor', permanent: false },
  ];
}
```

Om projektet redan har en `redirects()`-funktion, lägg till objektet i den befintliga arrayen istället för att skapa en ny funktion. Om redirects hanteras i `proxy.ts`, lägg motsvarande regel där i stället (följ befintligt mönster).

- [ ] **Step 2: Ta bort den gamla skolan-sidan**

```bash
cd apps/web
git rm app/skolan/page.tsx app/skolan/skolan.module.css
# Om mappen nu är tom:
rmdir app/skolan 2>/dev/null || true
```

(Komponenterna flyttades redan i Task 1, så inga importer pekar kvar på `app/skolan/`.)

- [ ] **Step 3: Verifiera bygget och redirecten**

Run (i `apps/web/`): `pnpm build`
Expected: Bygget lyckas, ingen rutt `/skolan` byggs.

Preview: gå till `/skolan` → ska redirecta till `/rektor`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(skolan): redirecta /skolan → /rektor, ta bort gammal sida"
```

---

### Task 8: Slutverifiering (a11y, responsivt, länkar)

**Files:** (ingen) — verifiering.

- [ ] **Step 1: Full build + lint**

Run (i `apps/web/`): `pnpm build` och (om scriptet finns) `pnpm lint`
Expected: Inga fel.

- [ ] **Step 2: A11y- och responsivkontroll i preview**

För `/rektor` och `/larare`:
- `prefers-reduced-motion`: sätt i preview (preview_eval: `matchMedia` kan inte sättas direkt — verifiera istället att `Reveal` har reduced-motion-hantering i sin källkod, dvs. att innehållet är synligt utan animation).
- Alla `ZoomableShot` har beskrivande `alt`.
- Tabba igenom: CTA-länkar och zoombara bilder nåbara med tangentbord.
- Bredder 375 / 768 / 1280 / 1440px (preview_resize) — inga överflöden.
- Kontrollera att inga `public/rektor/`-bilder 404:ar (preview_network).

- [ ] **Step 3: Uppdatera CLAUDE.md fasminne**

Lägg en kort fas-rad i `CLAUDE.md` under Fasminne som beskriver de två nya sidorna + showcase-biblioteket + decket på `/rektor/deck`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: logga rektor/lärar-sidor i CLAUDE.md fasminne"
```

---

## Self-Review

**Spec coverage:**
- Delat showcase-bibliotek (Reveal/ZoomableShot/ChatDemo/LoopVisuals) → Task 1–2 ✓
- `/rektor` scroll med skollingo + skärmdumpar → Task 4 ✓
- Decket bevarat på `/rektor/deck` → Task 3 ✓
- `/larare` ny sida → Task 5–6 ✓ (copy via godkännandegrind, per spec)
- Roller i scope / §08-omformulering ("Dina lärare ser…") + positionering "erbjuda dina lärare" → Task 4 §09 ✓
- `/skolan` redirect → Task 7 ✓
- Aktuella skärmdumpar (ramfria) → redan i `public/rektor/`, kopplas i Task 4 & 6 ✓
- noindex, svenska only → metadata i Task 4 & 6 ✓
- A11y/responsivt → Task 8 ✓

**Placeholders:** Inga "TBD"/"TODO". Task 5 är medvetet en copy-grind (lärar-copyn är inte godkänd ännu) — det är ett krav från spec, inte en platshållare.

**Type/namn-konsistens:** `LoopStep`/`RecVisual`/`TranscribeVisual`/`AskVisual` (named exports) konsekvent i Task 2, 4, 6. `Reveal`/`ZoomableShot`/`ChatDemo` (default exports) konsekvent. Bildfilnamn matchar de som ligger i `public/rektor/`. `ZoomableShot`-props (`src`, `alt`, `sizes`, `className`) matchar komponentens signatur.

**Risk att dubbelkolla vid exekvering:** `next.config`-filändelse (`.ts`/`.mjs`/`.js`) och om redirects redan finns i `proxy.ts` — anpassa Task 7 efter det som faktiskt finns.
