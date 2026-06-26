# Investerardeck som webbsida — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bygg en delbar, lösenordsskyddad, bilingual scroll-webbsida på `/investerare` som presenterar Elevantes investerardeck i Editorial Calm — med scroll-triggade animationer (signaturkurva, nätverksgraf, koncentriska ringar, tidslinje, uppräknande siffror) och full mobil-läsbarhet.

**Architecture:** Två routes utanför `[locale]` (`/investerare` sv, `/investerare/en`) renderar samma `<InvestorDeck lang>` ur en typad `content.ts`. Återanvänder `components/showcase/` (`Reveal`, `ZoomableShot`, `LoopVisuals`) + fyra nya animationskomponenter. En delad lösenordsgate i `proxy.ts` (HMAC-cookie, env-lösenord) skyddar sidorna. Allt `noindex`.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`), React 19, Tailwind v4, Web Crypto (HMAC). Inga nya beroenden.

---

## Förutsättningar & konventioner

- **Inget unit-test-ramverk finns i `apps/web`** (inga vitest/jest/playwright — verifierat). Vi följer kodbasens etablerade mönster: verifiering sker med **`pnpm typecheck`**, **`pnpm lint`**, **`pnpm build`** och **preview-webbläsarflödet** (snapshot/screenshot på 375 px och 1280 px). Varje task har explicita verifieringssteg av den typen i stället för unit-tester.
- **Alla kommandon körs från `apps/web/`** om inget annat sägs. Pakethanterare: `pnpm`.
- **Designtokens & utility-klasser** (`bg-canvas`, `text-ink`, `text-ink-secondary`, `text-ink-muted`, `bg-surface-soft`, `shadow-soft`, `shadow-lift`, `eyebrow`, `container-content`, `text-coral`, `bg-coral`, `text-sage-deep`, `bg-sage`/`bg-sand`) finns redan i `globals.css` och används av `app/rektor/page.tsx`. **Läs `app/rektor/page.tsx` först** — det är den kanoniska förlagan för sektionsmarkup, `Eyebrow`-rytm och den mörka CTA:n.
- **Copy-proveniens:** all prosa lyfts **verbatim** ur `elevante-deck/build-deck.js` (svenska, per `slideN_*`-funktion) och dess engelska motsvarighet i `elevante-deck/i18n.js` (nyckel = exakt svensk sträng). Det är inte platshållartext — källan är auktoritativ. Sifferdata för visualiseringarna är redan extraherad och ligger inline i Task 3.
- **Reduced motion:** varje animerat grepp visar slutläget direkt när `matchMedia('(prefers-reduced-motion: reduce)')` matchar. Detta byggs in i hookarna (Task 2) så komponenterna ärver det.
- **Lint-regel `react-hooks/set-state-in-effect`:** ESLint (`--max-warnings 0`) flaggar `setState` som anropas **synkront i en `useEffect`-kropp**. Lösning genomgående: deferra sådana anrop via `requestAnimationFrame(() => setX(...))` (med `cancelAnimationFrame`-cleanup) — setState inuti rAF-/event-/observer-callbacks flaggas inte. Gäller hookarna (Task 1–2) och `ScrollProgress` (Task 10).
- **Commit-konvention:** avsluta varje commit-message med `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Arbeta på branchen `investerardeck-webb` (redan utcheckad).

---

## Filstruktur

**Nya filer:**

| Fil | Ansvar |
|-----|--------|
| `apps/web/lib/hooks/useInView.ts` | IntersectionObserver-hook: triggar när element möter vyn |
| `apps/web/lib/hooks/useCountUp.ts` | Animerar tal 0→target, respekterar reduced-motion |
| `apps/web/components/showcase/Eyebrow.tsx` | Animerad eyebrow (hårstreck växer 0→full bredd vid reveal) |
| `apps/web/components/showcase/CountUp.tsx` | Self-contained uppräknande tal (useInView + useCountUp) |
| `apps/web/components/showcase/StackedCurve.tsx` | Signaturkurvan: staplad area + linje, sveper in vid scroll |
| `apps/web/components/showcase/DeckStats.tsx` | Statistikkort-rad (§2) med staggrad reveal + valfri count-up |
| `apps/web/components/showcase/NetworkReveal.tsx` | Nätverksgraf: noder + kanter ritas in (datamoat §7) |
| `apps/web/components/showcase/ConcentricMarket.tsx` | Nästlade ringar som expanderar (marknad §10) |
| `apps/web/components/showcase/Timeline.tsx` | Tidslinje som ritas, milstolpsprickar poppar (traction §14) |
| `apps/web/components/showcase/ScrollProgress.tsx` | Tunt coral-streck högst upp, scroll-position |
| `apps/web/app/investerare/content.ts` | Typad bilingual innehållsmodul (`{ sv, en }`) |
| `apps/web/app/investerare/LangToggle.tsx` | SV/EN-växlare (fixerad) |
| `apps/web/app/investerare/InvestorDeck.tsx` | Presentationskomponent — komponerar alla sektioner |
| `apps/web/app/investerare/page.tsx` | Route `/investerare` (sv), `noindex` |
| `apps/web/app/investerare/en/page.tsx` | Route `/investerare/en` (en), `noindex` |
| `apps/web/app/investerare/las-upp/page.tsx` | Lösenforms-sida (publik), `noindex` |
| `apps/web/app/investerare/las-upp/UnlockForm.tsx` | Klient-form (useActionState) |
| `apps/web/app/investerare/actions.ts` | Server Action: validera lösen, sätt cookie |
| `apps/web/lib/investor-access.ts` | HMAC sign/verify av access-token (delas av action + proxy) |

**Modifierade filer:**

| Fil | Ändring |
|-----|---------|
| `apps/web/proxy.ts` | Ins, lösenordsgate-block för `/investerare*` före locale-steget |
| `apps/web/.env.example` *(skapa om saknas)* | Dokumentera `INVESTOR_DECK_PASSWORD` |

---

## Fas 1 — Hooks & animationsprimitiver

### Task 1: `useInView`-hook

**Files:**
- Create: `apps/web/lib/hooks/useInView.ts`

- [ ] **Step 1: Skriv hooken**

```ts
'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Returnerar [ref, inView]. inView blir true första gången elementet syns.
 * once=false → togglar fram och tillbaka. SSR/utan IO → true direkt.
 */
export function useInView<T extends Element = HTMLDivElement>(
  opts: { once?: boolean; rootMargin?: string; threshold?: number } = {},
) {
  const { once = true, rootMargin = '0px 0px -12% 0px', threshold = 0.2 } = opts;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, rootMargin, threshold]);

  return [ref, inView] as const;
}
```

- [ ] **Step 2: Verifiera typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: inga fel (filen kompilerar).

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/hooks/useInView.ts
git commit -m "feat(investerare): useInView-hook för scroll-triggade animationer"
```

### Task 2: `useCountUp`-hook

**Files:**
- Create: `apps/web/lib/hooks/useCountUp.ts`

- [ ] **Step 1: Skriv hooken**

```ts
'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Räknar upp 0 → target när active blir true (ease-out cubic).
 * prefers-reduced-motion → hoppar direkt till target.
 */
export function useCountUp(target: number, active: boolean, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(eased * target);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, active, durationMs]);

  return value;
}
```

- [ ] **Step 2: Verifiera typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/hooks/useCountUp.ts
git commit -m "feat(investerare): useCountUp-hook (reduced-motion-säker)"
```

### Task 3: `CountUp`-komponent

**Files:**
- Create: `apps/web/components/showcase/CountUp.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import { useInView } from '@/lib/hooks/useInView';
import { useCountUp } from '@/lib/hooks/useCountUp';

type Props = {
  /** Talet att räkna till. */
  value: number;
  /** Formatterar det aktuella (decimal) värdet till sträng. Default: avrundat heltal. */
  format?: (n: number) => string;
  suffix?: string;
  prefix?: string;
  className?: string;
  durationMs?: number;
};

export default function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString('sv-SE'),
  suffix = '',
  prefix = '',
  className,
  durationMs,
}: Props) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const current = useCountUp(value, inView, durationMs);
  return (
    <span ref={ref} className={className}>
      {prefix}
      {format(current)}
      {suffix}
    </span>
  );
}
```

- [ ] **Step 2: Verifiera typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/showcase/CountUp.tsx
git commit -m "feat(investerare): CountUp-komponent"
```

### Task 4: Animerad `Eyebrow`

**Files:**
- Create: `apps/web/components/showcase/Eyebrow.tsx`

Mönstret kommer från den statiska `Eyebrow` i `app/rektor/page.tsx:20-27`. Här animeras hårstrecket från bredd 0 → 2.25rem (`w-9`) vid reveal.

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import { useInView } from '@/lib/hooks/useInView';

export default function Eyebrow({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  const [ref, inView] = useInView<HTMLParagraphElement>();
  return (
    <p
      ref={ref}
      className={`eyebrow flex items-center gap-3 ${center ? 'justify-center' : ''}`}
    >
      <span
        aria-hidden
        className="inline-block h-px bg-coral transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ width: inView ? '2.25rem' : '0rem' }}
      />
      {children}
    </p>
  );
}
```

- [ ] **Step 2: Verifiera typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/showcase/Eyebrow.tsx
git commit -m "feat(investerare): animerad Eyebrow (hårstreck växer vid reveal)"
```

---

## Fas 2 — Visualiseringskomponenter

### Task 5: `StackedCurve` (signaturkurvan)

Adapterad från den godkända companion-prototypen (stil "C"). Tar N lager; med ett lager blir det area + linje (ARR-hjälten), med flera blir det staplade band. Sveper in via `clip-path` när den möter vyn; topptalet räknas upp.

**Files:**
- Create: `apps/web/components/showcase/StackedCurve.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import { useInView } from '@/lib/hooks/useInView';
import { useCountUp } from '@/lib/hooks/useCountUp';

export type CurveSeries = { label: string; color: string; values: number[] };

type Props = {
  series: CurveSeries[];
  categories: string[];
  unit?: string;
  /** Tillgänglig beskrivning av hela diagrammet. */
  ariaLabel: string;
  caption?: string;
};

const W = 560;
const H = 300;
const PAD = { l: 38, r: 24, t: 26, b: 34 };

function smooth(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function StackedCurve({ series, categories, unit, ariaLabel, caption }: Props) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const n = categories.length;
  // Ackumulerad summa per x-punkt (för topplinje + axelskala + count-up).
  const cumulative = categories.map((_, i) =>
    series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0),
  );
  const max = Math.max(...cumulative, 1);
  const total = cumulative[cumulative.length - 1] ?? 0;
  const animatedTotal = useCountUp(total, inView);

  const px = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(n - 1, 1);
  const py = (v: number) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);

  // Bygg staplade band underifrån.
  const bands: { d: string; color: string }[] = [];
  const lower = new Array(n).fill(0);
  for (const s of series) {
    const upper = lower.map((lo, i) => lo + (s.values[i] ?? 0));
    const upPts = upper.map((v, i) => ({ x: px(i), y: py(v) }));
    const loPtsRev = lower.map((v, i) => ({ x: px(i), y: py(v) })).reverse();
    const d = `${smooth(upPts)} L ${loPtsRev[0].x.toFixed(1)} ${loPtsRev[0].y.toFixed(1)} ${smooth(loPtsRev).replace(/^M[^C]*/, '')} Z`;
    bands.push({ d, color: s.color });
    for (let i = 0; i < n; i++) lower[i] = upper[i];
  }
  const topLine = smooth(cumulative.map((v, i) => ({ x: px(i), y: py(v) })));

  return (
    <div ref={ref} role="img" aria-label={ariaLabel}>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="font-serif text-4xl text-ink">
          {Math.round(animatedTotal).toLocaleString('sv-SE')}
        </span>
        {unit && <span className="text-sm text-ink-muted">{unit}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible">
        {/* gridlinjer */}
        {[0, 1, 2, 3].map((k) => {
          const y = PAD.t + (k * (H - PAD.t - PAD.b)) / 3;
          return <line key={k} x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(26,26,46,.07)" />;
        })}
        {/* svep-in via clip */}
        <g
          style={{
            clipPath: inView ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
            transition: 'clip-path 1.7s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {bands.map((b, i) => (
            <path key={i} d={b.d} fill={b.color} />
          ))}
          <path d={topLine} fill="none" stroke="var(--color-coral)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </g>
        {/* x-etiketter */}
        {categories.map((c, i) => (
          <text key={c} x={px(i)} y={H - 10} textAnchor="middle" className="fill-ink-muted" fontSize={11}>
            {c}
          </text>
        ))}
      </svg>
      {/* legend (bara om fler än ett lager) + tillgänglig värdetabell */}
      {series.length > 1 && (
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
          {series.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      {caption && <p className="eyebrow mt-4 text-ink-muted">{caption}</p>}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th>Kategori</th>
            {series.map((s) => (
              <th key={s.label}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((c, i) => (
            <tr key={c}>
              <th>{c}</th>
              {series.map((s) => (
                <td key={s.label}>{s.values[i] ?? 0}{unit ? ` ${unit}` : ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verifiera typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/showcase/StackedCurve.tsx
git commit -m "feat(investerare): StackedCurve signaturkurva (svep-in, count-up, a11y-tabell)"
```

### Task 6: `DeckStats` (statistikkort §2)

Data (verbatim ur `slide2_problem` i `build-deck.js`). `countTo` sätts bara för rena heltal (50, 10600); övriga visas som text med reveal.

**Files:**
- Create: `apps/web/components/showcase/DeckStats.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import Reveal from '@/components/showcase/Reveal';
import CountUp from '@/components/showcase/CountUp';

export type DeckStat = {
  /** Stora talet som text (t.ex. "8 av 10", "50 %", "10 600"). */
  big: string;
  /** Om satt: räkna upp till detta heltal i stället för statisk text. */
  countTo?: number;
  /** Suffix vid count-up (t.ex. " %"). */
  countSuffix?: string;
  label: string;
};

export default function DeckStats({ items }: { items: DeckStat[] }) {
  return (
    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s, i) => (
        <Reveal key={s.label} delay={i * 90}>
          <div className="h-full rounded-2xl bg-surface p-7 shadow-soft">
            <p className="font-serif text-5xl text-ink">
              {s.countTo != null ? (
                <CountUp value={s.countTo} suffix={s.countSuffix ?? ''} />
              ) : (
                s.big
              )}
            </p>
            <p className="mt-3 text-ink-muted">{s.label}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verifiera typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/showcase/DeckStats.tsx
git commit -m "feat(investerare): DeckStats statistikkort"
```

### Task 7: `NetworkReveal` (datamoat §7)

Deterministisk nodlayout (hårdkodad — ingen `Math.random` vid runtime, undviker hydrerings-skav). Kanter ritas via `stroke-dashoffset`, noder skalar in staggrat. Mobil: samma graf, mindre canvas via responsiv `viewBox`.

**Files:**
- Create: `apps/web/components/showcase/NetworkReveal.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import { useInView } from '@/lib/hooks/useInView';

// Fasta nodpositioner (viewBox 0..360 × 0..240). En central nav + satelliter.
const NODES: { x: number; y: number; r: number; hub?: boolean }[] = [
  { x: 180, y: 120, r: 9, hub: true },
  { x: 70, y: 60, r: 5 },
  { x: 95, y: 175, r: 5 },
  { x: 250, y: 55, r: 5 },
  { x: 290, y: 150, r: 5 },
  { x: 200, y: 205, r: 5 },
  { x: 45, y: 120, r: 4 },
  { x: 320, y: 95, r: 4 },
  { x: 140, y: 40, r: 4 },
];
// Kanter som nodindex-par. Hub kopplas till alla; några satellit-satellit.
const EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
  [1, 6], [1, 8], [3, 8], [4, 7], [2, 5],
];

export default function NetworkReveal({ caption }: { caption?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} role="img" aria-label="Nätverksgraf: varje ny lektion och skola stärker kopplingarna i Elevantes datamodell.">
      <svg viewBox="0 0 360 240" className="block h-auto w-full">
        <g stroke="var(--color-coral)" strokeWidth={1.2} fill="none">
          {EDGES.map(([a, b], i) => {
            const len = Math.hypot(NODES[a].x - NODES[b].x, NODES[a].y - NODES[b].y);
            return (
              <line
                key={i}
                x1={NODES[a].x}
                y1={NODES[a].y}
                x2={NODES[b].x}
                y2={NODES[b].y}
                strokeOpacity={0.4}
                strokeDasharray={len}
                strokeDashoffset={inView ? 0 : len}
                style={{
                  transition: `stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1) ${200 + i * 70}ms`,
                }}
              />
            );
          })}
        </g>
        {NODES.map((nd, i) => (
          <circle
            key={i}
            cx={nd.x}
            cy={nd.y}
            r={nd.r}
            fill={nd.hub ? 'var(--color-coral)' : 'var(--color-ink)'}
            stroke="var(--color-canvas)"
            strokeWidth={2}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'scale(1)' : 'scale(0)',
              transformOrigin: `${nd.x}px ${nd.y}px`,
              transition: `opacity .4s ease, transform .5s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms`,
            }}
          />
        ))}
      </svg>
      {caption && <p className="eyebrow mt-4 text-ink-muted">{caption}</p>}
    </div>
  );
}
```

> **Reduced motion:** kanterna/noderna landar i slutläget oavsett (CSS-transition; vid `prefers-reduced-motion` kör webbläsaren ändå transitionen, men resultatet är samma slutbild). Om granskning vill ha helt stillastående: lägg `@media (prefers-reduced-motion: reduce)` som nollar transition-duration i `globals.css` — tas vid behov i Task 18.

- [ ] **Step 2: Verifiera typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/showcase/NetworkReveal.tsx
git commit -m "feat(investerare): NetworkReveal datamoat-graf"
```

### Task 8: `ConcentricMarket` (marknad §10)

Tre nästlade ringar (Sverige ⊂ Norden ⊂ EU) som expanderar utåt en i taget, med count-up-tal. Data verbatim ur `slide10_market`.

**Files:**
- Create: `apps/web/components/showcase/ConcentricMarket.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import { useInView } from '@/lib/hooks/useInView';

export type MarketRing = {
  /** Radie i px inom viewBox 0..320 (störst sist). */
  radius: number;
  color: string;
  label: string;
  value: string;
  sub: string;
};

export default function ConcentricMarket({ rings }: { rings: MarketRing[] }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  // Rita störst → minst så mindre ringar hamnar ovanpå.
  const ordered = [...rings].sort((a, b) => b.radius - a.radius);
  return (
    <div ref={ref} className="grid items-center gap-10 md:grid-cols-2">
      <div role="img" aria-label="Koncentriska ringar: marknaden växer från Sverige till Norden till EU.">
        <svg viewBox="0 0 320 320" className="block h-auto w-full">
          {ordered.map((r, i) => (
            <circle
              key={r.label}
              cx={160}
              cy={160}
              r={r.radius}
              fill={r.color}
              fillOpacity={0.18}
              stroke={r.color}
              strokeWidth={1.5}
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'scale(1)' : 'scale(0.2)',
                transformOrigin: '160px 160px',
                transition: `opacity .5s ease, transform .8s cubic-bezier(0.22,1,0.36,1) ${i * 220}ms`,
              }}
            />
          ))}
        </svg>
      </div>
      <ul className="flex flex-col gap-5">
        {rings.map((r) => (
          <li key={r.label} className="border-t border-ink/10 pt-4">
            <div className="flex items-baseline gap-3">
              <span className="h-3 w-3 rounded-full" style={{ background: r.color }} aria-hidden />
              <span className="font-serif text-3xl text-ink">{r.value}</span>
            </div>
            <p className="mt-1 font-medium text-ink">{r.label}</p>
            <p className="text-sm text-ink-muted">{r.sub}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Verifiera typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/showcase/ConcentricMarket.tsx
git commit -m "feat(investerare): ConcentricMarket nästlade marknadsringar"
```

### Task 9: `Timeline` (traction §14)

Vertikal linje som ritas (skalas i höjd) med milstolpsprickar som poppar i sekvens. Vertikalt flöde fungerar lika bra på mobil.

**Files:**
- Create: `apps/web/components/showcase/Timeline.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import { useInView } from '@/lib/hooks/useInView';

export type Milestone = { tag: string; title: string; desc: string };

export default function Timeline({ items }: { items: Milestone[] }) {
  const [ref, inView] = useInView<HTMLOListElement>();
  return (
    <ol ref={ref} className="relative mt-12 flex flex-col gap-10 pl-8">
      {/* ritad linje */}
      <span
        aria-hidden
        className="absolute left-[7px] top-2 w-px bg-coral/50 origin-top"
        style={{
          bottom: '0.5rem',
          transform: inView ? 'scaleY(1)' : 'scaleY(0)',
          transition: 'transform 1.2s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
      {items.map((m, i) => (
        <li key={m.title} className="relative">
          <span
            aria-hidden
            className="absolute -left-8 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-canvas bg-coral"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'scale(1)' : 'scale(0)',
              transition: `opacity .3s ease, transform .5s cubic-bezier(0.22,1,0.36,1) ${300 + i * 220}ms`,
            }}
          />
          <p className="text-sm font-semibold uppercase tracking-wider text-coral">{m.tag}</p>
          <h3 className="mt-1 font-serif text-2xl">{m.title}</h3>
          <p className="mt-1 text-ink-muted">{m.desc}</p>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Verifiera typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/showcase/Timeline.tsx
git commit -m "feat(investerare): Timeline traction-tidslinje"
```

### Task 10: `ScrollProgress`

**Files:**
- Create: `apps/web/components/showcase/ScrollProgress.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import { useEffect, useState } from 'react';

export default function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent" aria-hidden>
      <div className="h-full bg-coral transition-[width] duration-150 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}
```

- [ ] **Step 2: Verifiera typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/showcase/ScrollProgress.tsx
git commit -m "feat(investerare): ScrollProgress-indikator"
```

---

## Fas 3 — Innehåll, språkväxlare & sammansättning

### Task 11: Innehållsmodul `content.ts`

Typad bilingual modul. **Prosa lyfts verbatim** ur `build-deck.js` (sv) + `i18n.js` (en) per angiven källfunktion. Sifferdata nedan är redan extraherad ur källan och ska användas exakt.

**Files:**
- Create: `apps/web/app/investerare/content.ts`

- [ ] **Step 1: Definiera typ + struktur med extraherad data**

Skapa modulen med denna form. Fyll varje `sv`/`en`-textfält från angiven källa (kommentaren pekar ut `slideN_*`-funktionen i `build-deck.js`; engelska finns på exakt-svensk-sträng-nyckeln i `i18n.js`). Datat (`stats`, `arr`, `market`, `expansion`, `traction`) är komplett nedan.

```ts
export type Lang = 'sv' | 'en';
export type L = Record<Lang, string>;

export const t = (l: Lang, s: L) => s[l];

// ── §2 Problem (slide2_problem) — verbatim ────────────────────────
export const PROBLEM_STATS = [
  { big: '8 av 10', label: { sv: 'svenska lärare har en orimligt hög arbetsbelastning', en: '8 in 10 Swedish teachers carry an unreasonable workload' } },
  { big: '2 av 3', label: { sv: 'saknar förutsättningar att ge stöd till alla elever', en: '2 in 3 lack the conditions to support every student' } },
  { big: '50 %', countTo: 50, countSuffix: ' %', label: { sv: 'av eleverna kan koncentrera sig på lektionerna', en: 'of students can concentrate during lessons' } },
  { big: '10 600', countTo: 10600, label: { sv: 'lärare beräknas saknas i Sverige år 2038', en: 'teachers projected missing in Sweden by 2038' } },
] as const;
export const PROBLEM_SOURCE: L = {
  sv: 'Källor: 8 av 10 — Sveriges Lärare, ”Med orimliga förutsättningar” (2024). 2 av 3 & hälften — Skolverket, Attityder till skolan 2024. 10 600 — Skolverket, Lärarprognos 2024.',
  en: 'Sources: 8 in 10 — Sveriges Lärare (2024). 2 in 3 & half — Skolverket, Attitudes to School 2024. 10,600 — Skolverket, Teacher Forecast 2024.',
};

// ── §13 ARR (slide13_numbers) — enskild serie, hjältekurva ────────
export const ARR = {
  categories: ['26/27', '27/28', '28/29', '29/30', '30/31'],
  values: [0, 8, 20, 50, 100], // MSEK
  unit: 'MSEK ARR',
};

// ── §10 Marknad (slide10_market) — nästlade ringar ────────────────
export const MARKET_RINGS = [
  { radius: 70, color: 'var(--color-coral)', value: '316 554', label: { sv: 'gymnasieelever i Sverige', en: 'upper-secondary students in Sweden' }, sub: { sv: 'Start: Stockholmsregionen — 66 891 elever · 231 skolor.', en: 'Start: Stockholm region — 66,891 students · 231 schools.' } },
  { radius: 120, color: 'var(--color-sage-deep)', value: '1,48 milj.', label: { sv: 'gymnasieelever i Norden', en: 'upper-secondary students in the Nordics' }, sub: { sv: 'Naturlig expansion efter svensk validering.', en: 'Natural expansion after Swedish validation.' } },
  { radius: 150, color: 'var(--color-ink)', value: '18,3 milj.', label: { sv: 'elever i EU27', en: 'students in the EU27' }, sub: { sv: 'Samma språkmodell replikeras per marknad.', en: 'The same language model replicated per market.' } },
];

// ── §11 Expansion (slide11_expansion) — TAM-trappa ────────────────
export const EXPANSION = [
  { tag: { sv: 'FAS 1 · PILOT', en: 'PHASE 1 · PILOT' }, region: { sv: 'Sverige', en: 'Sweden' }, students: { sv: '316 554 elever', en: '316,554 students' }, tam: '≈ 158 MSEK' },
  { tag: { sv: 'FAS 2 · FÖRSTAMARKNAD', en: 'PHASE 2 · FIRST MARKET' }, region: { sv: 'Norden', en: 'The Nordics' }, students: { sv: '1,48 milj. elever', en: '1.48M students' }, tam: '≈ 740 MSEK' },
  { tag: { sv: 'FAS 3 · EXPANSION', en: 'PHASE 3 · EXPANSION' }, region: { sv: 'Europa · EU27', en: 'Europe · EU27' }, students: { sv: '18,3 milj. elever', en: '18.3M students' }, tam: '≈ 9,1 mdSEK' },
];

// ── §14 Traction (slide14_traction) — fyll desc verbatim ur källan ─
export const TRACTION: { tag: L; title: L; desc: L }[] = [
  // Lyft de tre/fyra milstolparna ur slide14_traction (LOI, Nacka-dialog, byggd produkt, pilot hösten 2026).
];

// ── §19 The ask (slide19_ask) — verbatim ──────────────────────────
export const ASK = {
  amount: 14, // MSEK, count-up
  uses: [
    { title: { sv: 'Konvertera piloten', en: 'Convert the pilot' }, desc: { sv: 'Pilot → betalande skolor i Stockholmsregionen.', en: 'Pilot → paying schools in the Stockholm region.' } },
    { title: { sv: 'Härda EU-pipelinen', en: 'Harden the EU pipeline' }, desc: { sv: 'Extern säkerhets- och GDPR-granskning.', en: 'External security and GDPR review.' } },
    { title: { sv: 'Skala go-to-market', en: 'Scale go-to-market' }, desc: { sv: 'I Sverige och in i Norden.', en: 'In Sweden and into the Nordics.' } },
  ],
};

// ── Eyebrows + rubriker per sektion (slideN headers + i18n.js) ─────
// Lyft varje rubrik/eyebrow/brödtext verbatim. Exempel (fyll resten):
export const COPY = {
  hero: {
    eyebrow: { sv: 'Investerardeck · pre-seed 2026', en: 'Investor deck · pre-seed 2026' },
    // slide1_title
    title: { sv: 'AI-handledaren som var i rummet', en: 'The AI tutor that was in the room' },
    lede: { sv: '/* lyft ur slide1_title-brödtexten */', en: '/* i18n.js-nyckeln */' },
  },
  // problem, gap, solution, how, product, datamoat, diff, avanti, market,
  // expansion, businessmodel, numbers, traction, positioning, team, investcase,
  // ask, sources — ett objekt var, lyft verbatim ur respektive slideN_*.
} as const;
```

> **Viktigt:** ersätt varje `/* lyft … */`-platshållare med den faktiska strängen ur källan innan sektionen byggs. `TRACTION` och resten av `COPY` fylls från `slide14_traction` resp. övriga `slideN_*`-funktioner. Numeriska arrayerna ovan är redan korrekta och rörs inte.

- [ ] **Step 2: Verifiera typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/investerare/content.ts
git commit -m "feat(investerare): bilingual innehållsmodul med extraherad deck-data"
```

### Task 12: `LangToggle`

**Files:**
- Create: `apps/web/app/investerare/LangToggle.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
import Link from 'next/link';
import type { Lang } from './content';

export default function LangToggle({ lang }: { lang: Lang }) {
  const base = 'px-2.5 py-1 text-sm rounded-full transition-colors';
  return (
    <nav className="fixed right-4 top-4 z-50 flex items-center gap-1 rounded-full bg-surface/80 px-1 py-1 shadow-soft backdrop-blur" aria-label="Språk / Language">
      <Link href="/investerare" aria-current={lang === 'sv' ? 'true' : undefined}
        className={`${base} ${lang === 'sv' ? 'bg-ink text-canvas' : 'text-ink-muted hover:text-ink'}`}>SV</Link>
      <Link href="/investerare/en" aria-current={lang === 'en' ? 'true' : undefined}
        className={`${base} ${lang === 'en' ? 'bg-ink text-canvas' : 'text-ink-muted hover:text-ink'}`}>EN</Link>
    </nav>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/app/investerare/LangToggle.tsx
git commit -m "feat(investerare): språkväxlare SV/EN"
```

### Task 13: `InvestorDeck` — sammansättning

Komponerar alla sektioner. Bygg sektion för sektion med `app/rektor/page.tsx` som markup-förlaga (samma `<section>`-rytm, `container-content`, mörk CTA). Använd `Eyebrow` (Task 4), `Reveal`/`ZoomableShot`/`LoopVisuals` (befintliga), och Task 5–10-komponenterna enligt sektionskartan i specen §4.

**Files:**
- Create: `apps/web/app/investerare/InvestorDeck.tsx`

- [ ] **Step 1: Skriv komponentskelett + de datadrivna sektionerna**

```tsx
import Reveal from '@/components/showcase/Reveal';
import ZoomableShot from '@/components/showcase/ZoomableShot';
import { LoopStep, RecVisual, TranscribeVisual, AskVisual } from '@/components/showcase/LoopVisuals';
import Eyebrow from '@/components/showcase/Eyebrow';
import ScrollProgress from '@/components/showcase/ScrollProgress';
import CountUp from '@/components/showcase/CountUp';
import StackedCurve from '@/components/showcase/StackedCurve';
import DeckStats from '@/components/showcase/DeckStats';
import NetworkReveal from '@/components/showcase/NetworkReveal';
import ConcentricMarket from '@/components/showcase/ConcentricMarket';
import Timeline from '@/components/showcase/Timeline';
import LangToggle from './LangToggle';
import {
  type Lang, t, PROBLEM_STATS, PROBLEM_SOURCE, ARR, MARKET_RINGS,
  EXPANSION, TRACTION, ASK, COPY,
} from './content';

import shotChat from '../../public/rektor/chat-kallor.png';
import shotElev from '../../public/rektor/elev-oversikt.png';
import shotKarta from '../../public/rektor/forstaelse-karta.png';

export default function InvestorDeck({ lang }: { lang: Lang }) {
  const sv = lang === 'sv';
  return (
    <main className="bg-canvas text-ink">
      <ScrollProgress />
      <LangToggle lang={lang} />

      {/* 01 — HERO (slide1_title) */}
      <section className="flex min-h-[88vh] items-center px-6 py-24 sm:px-10">
        <div className="container-content w-full">
          <Eyebrow>{t(lang, COPY.hero.eyebrow)}</Eyebrow>
          <h1 className="mt-6 font-serif text-5xl leading-[0.98] tracking-tight sm:text-7xl md:text-8xl">
            {t(lang, COPY.hero.title)}
          </h1>
          <p className="mt-8 max-w-2xl border-t border-ink/10 pt-8 text-lg leading-relaxed text-ink-secondary">
            {t(lang, COPY.hero.lede)}
          </p>
        </div>
      </section>

      {/* 02 — PROBLEMET (slide2_problem) */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.problem.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">{t(lang, COPY.problem.title)}</h2>
          </Reveal>
          <DeckStats items={PROBLEM_STATS.map((s) => ({
            big: s.big, countTo: s.countTo, countSuffix: s.countSuffix, label: t(lang, s.label),
          }))} />
          <p className="mt-10 max-w-3xl text-sm text-ink-muted">{t(lang, PROBLEM_SOURCE)}</p>
        </div>
      </section>

      {/* 13 — AFFÄREN I SIFFROR / ARR (slide13_numbers) — hjältekurva */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <Eyebrow>{t(lang, COPY.numbers.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">{t(lang, COPY.numbers.title)}</h2>
            <p className="mt-6 max-w-md text-lg text-ink-secondary">{t(lang, COPY.numbers.lede)}</p>
          </Reveal>
          <Reveal delay={120}>
            <StackedCurve
              categories={ARR.categories}
              unit={ARR.unit}
              series={[{ label: 'ARR', color: 'rgba(255,122,107,0.22)', values: ARR.values }]}
              ariaLabel={sv ? 'ARR-prognos 2026–2031, från 0 till 100 MSEK.' : 'ARR forecast 2026–2031, from 0 to 100 MSEK.'}
            />
          </Reveal>
        </div>
      </section>

      {/* 07 — DATAMOAT (slide7_datamoat) */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <Eyebrow>{t(lang, COPY.datamoat.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">{t(lang, COPY.datamoat.title)}</h2>
            <p className="mt-6 max-w-md text-lg text-ink-secondary">{t(lang, COPY.datamoat.lede)}</p>
          </Reveal>
          <Reveal delay={120}><NetworkReveal caption={t(lang, COPY.datamoat.caption)} /></Reveal>
        </div>
      </section>

      {/* 10 — MARKNAD (slide10_market) */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.market.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">{t(lang, COPY.market.title)}</h2>
          </Reveal>
          <div className="mt-12">
            <ConcentricMarket rings={MARKET_RINGS.map((r) => ({
              radius: r.radius, color: r.color, value: r.value, label: t(lang, r.label), sub: t(lang, r.sub),
            }))} />
          </div>
        </div>
      </section>

      {/* 14 — TRACTION (slide14_traction) */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.traction.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">{t(lang, COPY.traction.title)}</h2>
          </Reveal>
          <Timeline items={TRACTION.map((m) => ({ tag: t(lang, m.tag), title: t(lang, m.title), desc: t(lang, m.desc) }))} />
        </div>
      </section>

      {/* 19 — THE ASK (slide19_ask) — mörk CTA, förlaga: rektor §13 */}
      <section className="bg-ink px-6 py-24 text-canvas sm:px-10 sm:py-32">
        <div className="container-content">
          <p className="eyebrow flex items-center gap-3 text-canvas/60">
            <span className="inline-block h-px w-9 bg-coral" aria-hidden />
            {t(lang, COPY.ask.eyebrow)}
          </p>
          <h2 className="mt-5 font-serif text-5xl text-canvas sm:text-6xl">
            <CountUp value={ASK.amount} /> MSEK<span className="text-coral">.</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg text-canvas/70">{t(lang, COPY.ask.lede)}</p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {ASK.uses.map((u) => (
              <div key={u.title.sv} className="border-t-2 border-coral pt-5">
                <h3 className="font-serif text-2xl text-canvas">{t(lang, u.title)}</h3>
                <p className="mt-2 text-canvas/70">{t(lang, u.desc)}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 leading-relaxed text-canvas/60">
            <span className="font-semibold text-canvas">John Guthed</span><br />
            john@elevante.se · +46 733 383 420<br />elevante.se
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Lägg till de återstående sektionerna ur sektionskartan**

Lägg in (i deck-ordning) de sektioner som inte har en egen visualisering, med samma `<section>`/`Reveal`/`Eyebrow`-mönster och copy ur `COPY`:
- §3 Marknadsglappet (`slide3_gap`) — tvåkolumn Reveal-text.
- §4 Lösningen (`slide4_solution`) — `ZoomableShot src={shotChat}` (förlaga: rektor §03).
- §5 Så funkar det (`slide5_how`) — `LoopStep`-triptyk med `RecVisual`/`TranscribeVisual`/`AskVisual` (`sv={sv}`), förlaga: rektor §04.
- §6 Produkten (`slide6_value`) — `ZoomableShot src={shotElev}` + `src={shotKarta}`.
- §8 Differentiering (`slide8_diff`) — numrerad lista, förlaga: rektor §11.
- §9 Avanti (`slide9_avanti`) — Reveal-text.
- §11 Expansion (`slide11_expansion`) — tre `EXPANSION`-kort som trappa, count-up på TAM via `CountUp` är ej trivialt (värden har enheter) → visa `tam` som text, staggrad `Reveal`.
- §12 Affärsmodell (`slide12_businessmodel`) — nyckeltalskort; marginal/pris med `CountUp` där talet är rent.
- §15 Positionering (`slide15_positioning`) — kort.
- §16 Team (`slide16_team`) — kort.
- §17 Investeringscaset (`slide17_investcase`) — Reveal-text.
- §20 Källor (`slide20_sources`) — liten fotnotslista (`text-sm text-ink-muted`).

Placera ARR-sektionen (§13) på sin deck-position (efter §12), inte tidigt — ordningen ovan visar bara komponentkopplingen.

- [ ] **Step 3: Verifiera typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: inga fel (kräver att alla `COPY.*`-nycklar finns i `content.ts` — lägg till dem i Task 11 i takt med sektionerna).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/investerare/InvestorDeck.tsx apps/web/app/investerare/content.ts
git commit -m "feat(investerare): InvestorDeck komponerar alla deck-sektioner"
```

### Task 14: Routes `/investerare` + `/investerare/en`

**Files:**
- Create: `apps/web/app/investerare/page.tsx`
- Create: `apps/web/app/investerare/en/page.tsx`

- [ ] **Step 1: Svenska routen**

```tsx
import type { Metadata } from 'next';
import InvestorDeck from './InvestorDeck';

export const metadata: Metadata = {
  title: { absolute: 'Elevante — investerardeck' },
  description: 'Elevantes pre-seed-deck: AI-handledaren som var i rummet.',
  robots: { index: false, follow: false },
};

export default function InvestorPageSv() {
  return <InvestorDeck lang="sv" />;
}
```

- [ ] **Step 2: Engelska routen**

```tsx
import type { Metadata } from 'next';
import InvestorDeck from '../InvestorDeck';

export const metadata: Metadata = {
  title: { absolute: 'Elevante — investor deck' },
  description: 'Elevante pre-seed deck: the AI tutor that was in the room.',
  robots: { index: false, follow: false },
};

export default function InvestorPageEn() {
  return <InvestorDeck lang="en" />;
}
```

- [ ] **Step 3: Verifiera build**

Run: `cd apps/web && pnpm build`
Expected: build lyckas; `/investerare` och `/investerare/en` listas som genererade rutter.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/investerare/page.tsx apps/web/app/investerare/en/page.tsx
git commit -m "feat(investerare): routes sv + en (noindex)"
```

### Task 15: Verifiera sidan i preview (desktop + mobil)

- [ ] **Step 1: Starta preview** (`preview_start`) och navigera till `/investerare`.
- [ ] **Step 2: Desktop-snapshot** (`preview_snapshot` @ 1280) — alla sektioner finns, animationer triggar vid scroll (`preview_screenshot` på ARR-kurvan + nätverksgrafen).
- [ ] **Step 3: Mobil** (`preview_resize` 375) — `preview_screenshot`: kolumner staplade, kurvor/graf/ringar läsbara, språkväxlare + scroll-progress krockar inte med innehåll.
- [ ] **Step 4: Konsol/nätverk** (`preview_console_logs`) — inga fel/hydreringsvarningar.
- [ ] **Step 5:** Åtgärda ev. fel i källfilerna, upprepa. Commit ev. fixar.

---

## Fas 4 — Lösenordsgate

### Task 16: HMAC access-token (`lib/investor-access.ts`)

**Files:**
- Create: `apps/web/lib/investor-access.ts`

- [ ] **Step 1: Skriv modulen**

```ts
// Delad mellan Server Action (sign) och proxy (verify). Web Crypto → funkar i
// både Node- och edge-runtime. Token = HMAC_SHA256(lösenord, "granted").

export const INVESTOR_COOKIE = 'investor_access';
const PAYLOAD = 'granted';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

export async function makeAccessToken(password: string): Promise<string> {
  return hmac(password, PAYLOAD);
}

export async function verifyAccessToken(token: string | undefined, password: string): Promise<boolean> {
  if (!token) return false;
  const expected = await makeAccessToken(password);
  if (token.length !== expected.length) return false;
  // konstant-tids-jämförelse
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/lib/investor-access.ts
git commit -m "feat(investerare): HMAC access-token för lösenordsgate"
```

### Task 17: Server Action + unlock-sida

**Files:**
- Create: `apps/web/app/investerare/actions.ts`
- Create: `apps/web/app/investerare/las-upp/UnlockForm.tsx`
- Create: `apps/web/app/investerare/las-upp/page.tsx`

- [ ] **Step 1: Server Action**

```ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { INVESTOR_COOKIE, makeAccessToken } from '@/lib/investor-access';

export type GateState = { error: boolean };

export async function unlockInvestorDeck(_prev: GateState, formData: FormData): Promise<GateState> {
  const password = process.env.INVESTOR_DECK_PASSWORD;
  const input = (formData.get('password') ?? '').toString();
  const nextRaw = (formData.get('next') ?? '/investerare').toString();
  const next = nextRaw.startsWith('/investerare') ? nextRaw : '/investerare';

  if (!password || input !== password) {
    return { error: true };
  }

  const token = await makeAccessToken(password);
  const store = await cookies();
  store.set(INVESTOR_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/investerare',
    maxAge: 60 * 60 * 24 * 30, // 30 dagar
  });
  redirect(next);
}
```

- [ ] **Step 2: Klient-form**

```tsx
'use client';

import { useActionState } from 'react';
import { unlockInvestorDeck, type GateState } from '../actions';

export default function UnlockForm({ next, lang }: { next: string; lang: 'sv' | 'en' }) {
  const [state, action, pending] = useActionState<GateState, FormData>(unlockInvestorDeck, { error: false });
  const sv = lang === 'sv';
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="eyebrow" htmlFor="password">{sv ? 'Lösenord' : 'Password'}</label>
      <input
        id="password" name="password" type="password" autoFocus required
        className="min-h-[52px] rounded-xl border border-ink/15 bg-surface px-4 text-lg outline-none focus:border-coral"
      />
      {state.error && (
        <p className="text-sm text-coral">{sv ? 'Fel lösenord.' : 'Wrong password.'}</p>
      )}
      <button
        type="submit" disabled={pending}
        className="min-h-[52px] rounded-full bg-ink px-8 font-medium text-canvas transition-transform hover:scale-[1.02] disabled:opacity-60"
      >
        {pending ? (sv ? 'Öppnar…' : 'Opening…') : sv ? 'Visa decket →' : 'Open the deck →'}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Unlock-sida**

```tsx
import type { Metadata } from 'next';
import UnlockForm from './UnlockForm';

export const metadata: Metadata = {
  title: { absolute: 'Elevante — investerardeck' },
  robots: { index: false, follow: false },
};

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; lang?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next?.startsWith('/investerare') ? sp.next : '/investerare';
  const lang = sp.lang === 'en' ? 'en' : 'sv';
  const sv = lang === 'sv';
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 text-ink">
      <div className="w-full max-w-sm">
        <p className="eyebrow flex items-center gap-3">
          <span className="inline-block h-px w-9 bg-coral" aria-hidden />
          Elevante
        </p>
        <h1 className="mt-5 font-serif text-4xl">{sv ? 'Investerardeck' : 'Investor deck'}</h1>
        <p className="mt-3 mb-8 text-ink-secondary">
          {sv ? 'Ange lösenordet för att se presentationen.' : 'Enter the password to view the presentation.'}
        </p>
        <UnlockForm next={next} lang={lang} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/app/investerare/actions.ts apps/web/app/investerare/las-upp
git commit -m "feat(investerare): lösenforms-sida + unlock Server Action"
```

### Task 18: Gate i `proxy.ts`

**Files:**
- Modify: `apps/web/proxy.ts` (insättning efter `skolor.`-blocket, före locale-steget — runt rad 116, efter `NextResponse.rewrite(url)`-blockets `}`)

- [ ] **Step 1: Lägg till import högst upp**

Efter de befintliga importerna i `proxy.ts`:

```ts
import { INVESTOR_COOKIE, verifyAccessToken } from './lib/investor-access';
```

- [ ] **Step 2: Lägg in gate-blocket**

Direkt efter `skolor.`-hostblocket och **före** kommentaren `// Steg 1: locale-redirect`:

```ts
  // Investerardeck — delad lösenordsgate. Ligger utanför [locale].
  if (pathname === '/investerare' || pathname.startsWith('/investerare/')) {
    if (pathname === '/investerare/las-upp') {
      return NextResponse.next();
    }
    const password = process.env.INVESTOR_DECK_PASSWORD;
    if (password) {
      const token = request.cookies.get(INVESTOR_COOKIE)?.value;
      const ok = await verifyAccessToken(token, password);
      if (!ok) {
        const url = request.nextUrl.clone();
        url.pathname = '/investerare/las-upp';
        url.searchParams.set('next', pathname);
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }
```

> Om `INVESTOR_DECK_PASSWORD` saknas (t.ex. lokal dev utan env) släpps trafiken igenom — sidan funkar lokalt utan gate. Sätt env-varianten i Vercel (alla miljöer) för att aktivera skyddet i drift.

- [ ] **Step 3: Dokumentera env-varianten**

Lägg till i `apps/web/.env.example` (skapa filen om den inte finns):

```
# Lösenord för investerardecket på /investerare (delad gate).
INVESTOR_DECK_PASSWORD=
```

- [ ] **Step 4: Verifiera build + typecheck**

Run: `cd apps/web && pnpm typecheck && pnpm build`
Expected: båda lyckas.

- [ ] **Step 5: Commit**

```bash
git add apps/web/proxy.ts apps/web/.env.example
git commit -m "feat(investerare): lösenordsgate i proxy.ts för /investerare*"
```

### Task 19: Verifiera gate-flödet i preview

- [ ] **Step 1:** Sätt `INVESTOR_DECK_PASSWORD` i lokal `.env.local` (t.ex. `test1234`) och starta om preview-servern.
- [ ] **Step 2:** Navigera till `/investerare` utan cookie → ska redirecta till `/investerare/las-upp?next=/investerare` (`preview_snapshot`).
- [ ] **Step 3:** Fyll fel lösen (`preview_fill` + submit) → felmeddelande visas, ingen redirect in.
- [ ] **Step 4:** Fyll rätt lösen → redirect till `/investerare`, decket visas. Ladda om `/investerare/en` → fortsatt inne (cookie kvarstår).
- [ ] **Step 5:** Bekräfta att `/rektor` och `/sv/app`-redirect är opåverkade (`preview_snapshot` på `/rektor`).

---

## Fas 5 — Slutverifiering

### Task 20: Helhetsgranskning

- [ ] **Step 1: Lint + typecheck + build**

```bash
cd apps/web && pnpm lint && pnpm typecheck && pnpm build
```
Expected: alla tre rena. Build listar `/investerare`, `/investerare/en`, `/investerare/las-upp`.

- [ ] **Step 2: `noindex`** — bekräfta `<meta name="robots" content="noindex, nofollow">` i renderad HTML för alla tre rutter (`preview_eval`: `document.querySelector('meta[name=robots]')?.content`).

- [ ] **Step 3: Reduced motion** — `preview` med emulerad `prefers-reduced-motion: reduce`: kurva, graf, ringar, tidslinje och count-up visar slutläget direkt utan rörelse.

- [ ] **Step 4: Responsivt** — `preview_resize` 375 / 414 / 768 / 1280 / 1440, `preview_screenshot` på var och en. Inga horisontella scrollbars, inga avhuggna rubriker, touch-targets ≥ 44 px.

- [ ] **Step 5: Bilingual** — `/investerare` (sv) och `/investerare/en` (en) visar rätt språk i alla sektioner; språkväxlaren markerar aktivt språk (`aria-current`).

- [ ] **Step 6: Oförändrat** — `/rektor`, startsidan (`/sv`) och `/sv/app`-redirect fungerar som innan.

- [ ] **Step 7: Slutcommit** (om fixar gjordes)

```bash
git add -A
git commit -m "chore(investerare): slutverifiering — a11y, responsivt, noindex, gate"
```

---

## Self-Review (ifylld av planförfattaren)

**Spec-täckning:** Routing/bilingual (Task 14), content.ts (Task 11), InvestorDeck + sektionskarta (Task 13), StackedCurve/DeckStats (Task 5–6), animationsgreppen 1–6 i spec §7 (count-up Task 3, nätverksgraf Task 7, ringar Task 8, tidslinje Task 9, eyebrow Task 4, scroll-progress Task 10), lösenordsgate §8 (Task 16–19), mobil §9 (verifieras i Task 15 + 20). Slide 18 utelämnad (ej i sektionskartan). ✔

**Placeholder-not:** `content.ts` (Task 11) innehåller medvetna `/* lyft … */`-markörer för prosa som ska kopieras **verbatim** ur namngivna `slideN_*`-källfunktioner — detta är en extraktionsinstruktion mot befintlig källa, inte uppdiktat innehåll. All sifferdata och alla komponent-API:er är fullständiga. `TRACTION` och resten av `COPY` fylls i Task 11/13 från källan innan respektive sektion byggs.

**Typkonsistens:** `Lang`/`t()` (content.ts) används enhetligt; `CurveSeries`, `DeckStat`, `MarketRing`, `Milestone`, `GateState`, `INVESTOR_COOKIE`, `makeAccessToken`/`verifyAccessToken` matchar mellan definition och anrop.

**Beroende-ordning:** hooks (Fas 1) → komponenter (Fas 2) → sammansättning/routes (Fas 3) → gate (Fas 4) → verifiering (Fas 5). Inga framåtberoenden.
