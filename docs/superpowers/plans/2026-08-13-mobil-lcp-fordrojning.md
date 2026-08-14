# Mobil LCP-fördröjning — prestandaplan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sänka Largest Contentful Paint på startsidan på mobil från ~4,5s ("Poor") till under 2,5s ("Good"), genom att ta bort det som håller huvudtråden upptagen under de ~3,1s "elementrendering-fördröjning" som Lighthouse mobilkörning rapporterar för hero-transkriptets första rad.

**Architecture:** Root cause är INTE bekräftad ännu — vi har starka spår (en 72 KB JS-chunk där 40 % är oanvänd kod och som innehåller onödiga legacy-polyfills; tre tredjeparts-/analysskript renderade allra först i `<body>`; en global 280ms fade-in-animation på `<main>` som gäller även vid första sidladdningen) men ingen bekräftad flaskhals. Planen börjar därför med mätning (Chrome-performance-trace + bundle-analys), följt av två lågriskändringar som är motiverade redan av kodgranskningen, och avslutas med en villkorad fix för JS-chunken beroende på vad bundle-analysen visar. Varje kodändring mäts om mot PageSpeed Insights (mobil) innan den committas — ingen ändring behålls om den inte mätbart förbättrar LCP.

**Tech Stack:** Next.js 16 App Router, Chrome DevTools Performance-panel, `@next/bundle-analyzer`, PageSpeed Insights / Lighthouse.

**Bakgrund (redan verifierat via kodgranskning 2026-08-13):**
- `www.elevante.se/sv` (desktop): Prestanda 99, Tillgänglighet 96, Bästa metoder 96, SEO 92.
- Samma URL (mobil): Prestanda 81. LCP = 4,5s, varav TTFB = 4ms och "Fördröjning av elementrendering" = 3130ms. LCP-elementet är `div.transcript-line` ("22:40 Då tar vi area under en kurva.") i [LessonTranscriptDemo.tsx](../../../apps/web/components/public/LessonTranscriptDemo.tsx) — texten ligger statiskt i JSX:n (ingen JS-gated reveal), så fördröjningen är inte "väntar på hydrering" utan sannolikt huvudtråds-arbete eller renderingsordning.
- `unused-javascript`: `https://www.elevante.se/_next/static/chunks/0aipolf5e.rmh.js` — 71 985 bytes totalt, 28 700 bytes (40 %) oanvänt.
- `legacy-javascript-insight`: samma chunk, 14 198 bytes bortkastade på onödiga polyfills/transforms för `Array.prototype.at/flat/flatMap`, `Object.fromEntries/hasOwn`, `String.prototype.trimStart/trimEnd`. Inget `browserslist`-fält finns i `apps/web/package.json` eller repo-roten — Next 16:s SWC-target är redan modernt, så detta pekar mot en **tredjepartsdependency i chunken** som själv skeppar äldre, redan transpilerad kod (inte vår egen build-target).
- `render-blocking-insight`: en CSS-chunk (`04sn89~orye73.css`, 18 KB) blockerar rendering i ~70ms.
- Tre skript renderas allra först i `<body>`, före allt synligt innehåll: [apps/web/app/[locale]/(public)/layout.tsx:94-96](../../../apps/web/app/%5Blocale%5D/(public)/layout.tsx) — `<AlbacrossSiteId />` (rå inline `<script>`), `<Albacross />` (`next/script strategy="afterInteractive"`, redan icke-blockerande), `<Snitcher />` (rå inline `<script>`). Kommentarerna i [Analytics.tsx](../../../apps/web/components/public/Analytics.tsx) förklarar *varför* de måste vara rå HTML server-side (leverantörernas installationskontroller letar efter snippet i rå HTML) — men inget i kommentarerna kräver att de ligger *först*, bara att de ligger i rå HTML och kör vid parse.
- `<main id="main-content" className="flex-1 animate-page-in">` i samma layout-fil (rad 107) ger ALL sidinnehåll — inklusive hero/LCP-elementet — en 280ms opacity 0→1-animation (`.animate-page-in`, [globals.css:212-223](../../../apps/web/app/globals.css)) som även triggas på första sidladdningen, trots att det inte finns någon "föregående sida" att tona in ifrån då.

---

### Task 1: Fånga en baseline-profil och bekräfta var huvudtråden är upptagen

**Files:** Inga kodändringar. Ren mätning.

- [x] **Step 1–5: Genomfört via `lighthouse` CLI mot lokal produktionsbuild (istället för manuell DevTools-klickning — samma diagnos, skriptbart och reproducerbart).**

**Resultat (körd 2026-08-13, lokal produktionsbuild, `lighthouse --throttling-method=simulate --form-factor=mobile`):**

- Performance 0.54, LCP 5,0s (score 0.27), TBT 1750ms, FCP 1,6s. Samma LCP-element som i produktionsrapporten (`div.transcript-line`, "22:40 Då tar vi area under en kurva.").
- `lcp-breakdown-insight`: TTFB 11ms, **Element render delay 1500ms** (lokalt; 3130ms i produktionsrapporten — absoluta tal skiljer sig mellan maskin/nätverk, men mönstret är identiskt: TTFB är närmast noll, hela fördröjningen sitter i render delay).
- `mainthread-work-breakdown`: **scriptEvaluation dominerar med 3797ms** av huvudtrådsarbetet, mot styleLayout 261ms, rendering 88ms, parseHTML 23ms. Slutsats: detta är inte en enskild blockerande resurs (varken CSS eller ett enda skript) utan **för mycket JS som måste tolkas/köras** (hydrering av flera `'use client'`-komponenter + tredjepartsskript) innan den simulerade modellen räknar sidan som redo att måla.
- 15 separata JS-requests, 209 KB överfört totalt. Den enskilt största chunken (`07~2_iuv753xg.js` lokalt, motsvarar `0aipolf5e.rmh.js` i produktionsrapporten — hashen skiljer sig mellan byggen) är 226 KB okomprimerad / 72 KB överförd — samma chunk PageSpeed flaggade för 40 % oanvänd kod och onödiga legacy-polyfills.
- `bootup-time`: Snitchers `radar.min.js` är tredje största post (150ms totalt, 51ms scripting) — stödjer Task 2.
- Grep i den byggda chunken gav inga läsbara bibliotekssignaturer (minifierad kod utan bevarade modulvägar) — bekräftar att Task 4:s riktiga bundle-analyzer behövs, gissning via grep räcker inte.

**Slutsats:** Alla tre planerade åtgärder (Task 2, 3, 4) är motiverade. Task 4 är sannolikt den med störst effekt eftersom scriptEvaluation (3797ms) dominerar totalt huvudtrådsarbete — att krympa JS-mängden väger sannolikt tyngre än de ~150–300ms Task 2/3 ger var för sig — men alla tre är komplementära och bör göras tillsammans.

---

### Task 2: Flytta tredjeparts-analysskripten bort från den kritiska renderingsvägen

**Motivering:** Tre `<script>`-taggar renderas allra först i `<body>`, före hero-sektionen. `Albacross` (via `next/script strategy="afterInteractive"`) är redan icke-blockerande, men `AlbacrossSiteId` och `Snitcher` är råa, synkrona inline-script som måste ligga i rå HTML (leverantörskrav) men INTE måste ligga *först* — bara i rätt inbördes ordning (site-id före track.js). Att flytta dem till slutet av `<body>` istället för början kan bara hjälpa (webbläsaren hinner bygga hero-DOM:en innan den stannar upp för dessa skript) och kan inte skada leverantörernas installationskontroller, eftersom de fortfarande finns i den råa server-renderade HTML:en.

**Files:**
- Modify: `apps/web/app/[locale]/(public)/layout.tsx:92-113`

- [ ] **Step 1: Flytta AlbacrossSiteId, Albacross och Snitcher till slutet av layouten**

Nuvarande kod:

```tsx
  return (
    <>
      <AlbacrossSiteId />
      <Albacross />
      <Snitcher />
      <CookieConsent locale={locale} />
      <JsonLd data={[orgSchema, websiteSchema, softwareSchema]} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        {locale === 'sv' ? 'Hoppa till innehåll' : 'Skip to content'}
      </a>
      <div className="flex min-h-screen flex-col">
        <Header locale={locale} pathname={pathname} dict={dict} />
        <main id="main-content" className="flex-1 animate-page-in">
          {children}
        </main>
        <Footer locale={locale} pathname={pathname} dict={dict} />
      </div>
    </>
  );
}
```

Ny kod — flytta de tre analysskripten (i oförändrad inbördes ordning) till efter huvudinnehållet, behåll allt annat som det är:

```tsx
  return (
    <>
      <CookieConsent locale={locale} />
      <JsonLd data={[orgSchema, websiteSchema, softwareSchema]} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        {locale === 'sv' ? 'Hoppa till innehåll' : 'Skip to content'}
      </a>
      <div className="flex min-h-screen flex-col">
        <Header locale={locale} pathname={pathname} dict={dict} />
        <main id="main-content" className="flex-1 animate-page-in">
          {children}
        </main>
        <Footer locale={locale} pathname={pathname} dict={dict} />
      </div>
      {/* Analysskript sist i <body>: rå HTML (leverantörskrav) men ska inte
          stå i vägen för att bygga hero-innehållet. Ordningen site-id →
          track.js måste bevaras (AlbacrossSiteId sätter window._nQc innan
          track.js läser den). */}
      <AlbacrossSiteId />
      <Albacross />
      <Snitcher />
    </>
  );
}
```

- [ ] **Step 2: Verifiera lokalt att skripten fortfarande finns i rå HTML och i rätt ordning**

```bash
cd apps/web
pnpm build && pnpm start -p 3000 &
sleep 3
curl -s http://localhost:3000/sv | grep -o 'albacross-site-id\|snitcher-init\|serve.albacross.com'
kill %1
```

Expected: alla tre träffar syns i utskriften (ordningen i `curl`-träfflistan följer HTML-källordningen).

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/[locale]/(public)/layout.tsx"
git commit -m "perf: flytta analysskript efter huvudinnehåll i public layout"
```

---

### Task 3: Hoppa över den 280ms fade-in-animationen på allra första sidladdningen

**Motivering:** `<main className="flex-1 animate-page-in">` ger ALL sidinnehåll en opacity 0→1-animation på 280ms — även vid en helt ny sidladdning (hård navigering), trots att syftet med animationen (mjuk övergång mellan sidor) inte gäller då. LCP räknas först när elementet är synligt (opacity > 0), så denna animation lägger upp till 280ms ovanpå vad hero-elementet annars hade tagit — och kräver dessutom att CSS:en är inläst och tillämpad innan animationen ens kan starta. Detta är en ren vinst oavsett vad Task 1:s trace visar: animationen fyller fortfarande sitt syfte vid klientsidsnavigeringar, den hoppas bara över vid första målningen där den inte tillför något.

**Files:**
- Create: `apps/web/components/public/PageFadeIn.tsx`
- Modify: `apps/web/app/[locale]/(public)/layout.tsx` (importera och använd `PageFadeIn` istället för `<main>` direkt)

- [ ] **Step 1: Skapa PageFadeIn-komponenten**

```tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

// <main> tonar in vid sidbyten för att ge känsla av rörelse mellan sidor.
// Men på den allra första målningen (hård navigering/laddning) finns ingen
// "föregående sida" att tona in ifrån, och de 280ms animationen kostar då
// bara tid av Largest Contentful Paint. Vi väntar därför med att lägga på
// animationsklassen tills en efterföljande klientsidnavigering faktiskt sker.
export function PageFadeIn({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setAnimate(true);
  }, [pathname]);

  return (
    <main id="main-content" className={animate ? 'flex-1 animate-page-in' : 'flex-1'}>
      {children}
    </main>
  );
}
```

- [ ] **Step 2: Använd PageFadeIn i public-layouten**

I `apps/web/app/[locale]/(public)/layout.tsx`, lägg till importen:

```tsx
import { PageFadeIn } from '@/components/public/PageFadeIn';
```

Byt ut:

```tsx
        <main id="main-content" className="flex-1 animate-page-in">
          {children}
        </main>
```

mot:

```tsx
        <PageFadeIn>{children}</PageFadeIn>
```

- [ ] **Step 3: Kontrollera att skip-länken fortfarande fungerar**

Skip-länken (`href="#main-content"`) pekar på `id="main-content"`, som nu sätts inne i `PageFadeIn`. Öppna `http://localhost:3000/sv`, tabba en gång och tryck Enter på "Hoppa till innehåll" — fokus ska hamna i huvudinnehållet precis som innan.

- [ ] **Step 4: Typecheck och lint**

```bash
cd apps/web
pnpm typecheck
pnpm lint
```

Expected: inga fel.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/public/PageFadeIn.tsx "apps/web/app/[locale]/(public)/layout.tsx"
git commit -m "perf: hoppa över page-fade-in-animationen på första sidladdningen"
```

---

### Task 4: Bundle-analysera den uppsvällda JS-chunken och åtgärda källan

**Files:**
- Install: `@next/bundle-analyzer` (devDependency i `apps/web`)
- Modify: `apps/web/next.config.ts`
- Modify (villkorat, se Steg 4): beror på vad analysen visar

- [ ] **Step 1: Installera bundle-analyzer**

```bash
cd apps/web
pnpm add -D @next/bundle-analyzer
```

- [ ] **Step 2: Wrappa next.config.ts**

Nuvarande slutrad i `apps/web/next.config.ts`:

```ts
export default nextConfig;
```

Lägg till importen överst i filen:

```ts
import createBundleAnalyzer from '@next/bundle-analyzer';
```

och byt ut sista raden mot:

```ts
const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
```

- [ ] **Step 3: Kör analysen**

```bash
cd apps/web
ANALYZE=true pnpm build
```

Expected: bygget öppnar (eller skriver till `.next/analyze/`) tre HTML-treemaps (client, server, edge). Öppna client-treemapen och sök efter den chunk som ligger nära startsidans route och som är runt 70 KB (transferstorlek) / 220-230 KB (rå storlek) — samma chunk som `0aipolf5e.rmh.js` i produktionsrapporten (hash byts vid varje bygge).

**Redan verifierat i Task 1:** denna chunk finns lokalt som `07~2_iuv753xg.js`, 226 KB rå / 72 KB överförd, och `mainthread-work-breakdown` visar att `scriptEvaluation` (3797ms) dominerar allt huvudtrådsarbete — så en minskning här är den åtgärd som sannolikt ger störst LCP-vinst av alla fyra uppgifterna.

- [ ] **Step 4: Åtgärda enligt vad treemapen visar**

**Om chunken domineras av en enskild dependency** (synlig som en tydlig rektangel med paketnamnet, t.ex. en dependency som själv skeppar förbyggd/äldre kod): kontrollera om den paketkomponenten faktiskt behövs för första målningen. Om den bara används längre ner på sidan (inte i hero-sektionen), gör importen lat med `next/dynamic`:

```tsx
import dynamic from 'next/dynamic';

const TungKomponent = dynamic(() => import('./TungKomponent'), {
  loading: () => null,
});
```

(Ersätt `./TungKomponent` med den faktiska filen som importerar det tunga paketet — identifieras i treemapen.)

**Om chunken istället domineras av flera egna `'use client'`-komponenter som alla buntas ihop** (t.ex. Header-dropdown, LanguageSwitcher, CookieConsent, Faq-accordion, RotatingHeadline, LessonTranscriptDemo — treemapen visar då många mindre rektanglar med våra egna filnamn snarare än en enda tredjepartsdependency): identifiera vilka av dessa INTE behövs för första målningen av hero-sektionen (t.ex. Faq-accordionen längre ner på sidan, eller Footer-interaktivitet) och gör dem lata med `next/dynamic` på samma sätt som ovan, så att hero-sektionens kritiska JS blir mindre.

**Om chunken istället domineras av Next.js egna runtime/polyfill-kod** (inte enskilda komponenter eller ett tredjepartspaket): lägg till ett explicit `browserslist`-fält i `apps/web/package.json` så SWC inte breddar sitt transpileringsmål i onödan:

```json
  "browserslist": [
    "chrome >= 107",
    "edge >= 107",
    "firefox >= 104",
    "safari >= 16",
    "ios_saf >= 16"
  ],
```

(Lägg till som ett nytt fält i `apps/web/package.json`, i linje med resten av filens JSON-struktur.)

- [ ] **Step 5: Bekräfta minskningen**

```bash
cd apps/web
pnpm build
```

Jämför den nya storleken för samma route i byggutskriften (`First Load JS` för `/`) mot värdet före ändringen. Notera differensen.

- [ ] **Step 6: Ta bort analyzer-flaggan ur normalt bygge (den är redan opt-in via ANALYZE=true, ingen ändring behövs) och committa fixen**

```bash
git add apps/web/next.config.ts apps/web/package.json
# Lägg till ev. ändrad importfil om Steg 4 tog dynamic-import-vägen
git commit -m "perf: krymp JS-chunken på startsidan (bundle-analys)"
```

---

### Task 5: Mät om och bekräfta förbättringen

**Files:** Inga kodändringar.

- [ ] **Step 1: Bygg och mät lokalt med samma Lighthouse-kommando som baseline (Task 1)**

```bash
cd apps/web
pnpm build
pnpm start -p 3100 &
sleep 3
npx --yes lighthouse http://localhost:3100/sv \
  --only-categories=performance \
  --preset=perf \
  --form-factor=mobile \
  --screenEmulation.mobile \
  --throttling-method=simulate \
  --output=json \
  --output-path=/tmp/lh-after.json \
  --chrome-flags="--headless=new --no-sandbox" \
  --quiet
kill %1
```

- [x] **Step 2: Jämför mot baseline**

Lokala mätningar visade hög varians mellan körningar med `--throttling-method=simulate` (delad utvecklingsmaskin med många parallella processer under sessionen — inte en isolerad mätmiljö). Den mer tillförlitliga jämförelsen kör `--throttling-method=devtools` (verklig, inte simulerad, CPU/nätverksbegränsning) mot exakt samma commit-beroenden, före vs. efter Task 2–4, på samma maskin i samma session:

| Mätvärde (devtools-throttling, lokalt) | Innan (`0d60502`) | Efter (`396bb69`) |
|---|---|---|
| Performance | 0.77 | 0.79 |
| LCP | 2,2s (score 0.94) | 1,9s (score 0.97) |
| Total Blocking Time | 120ms | 80ms |
| CLS | 0.396 | 0.403 |

**CLS-observation:** `--throttling-method=simulate`-körningarna visade CLS 0.40+ (mot 0.013 i Task 1:s enda baseline-körning) — vid första anblick en regression. Utredde detta genom att tillfälligt återställa `layout.tsx` till pre-Task-2-versionen (samma worktree, samma `node_modules`, ingen commit) och köra om: **samma CLS ~0.396 uppstår även på den ORIGINALA koden.** Lighthouse pekar själv ut orsaken som `"Web font"` (Newsreader/Geist via `next/font/google`, `display: 'swap'`) — helt orört av Task 2–4. Detta är alltså en redan existerande, throttling-känslig egenhet, inte en regression, och utanför den här planens scope. Värt en egen framtida utredning (t.ex. `size-adjust`-fontmetrik eller `<link rel="preload">` för fontfilerna), men bekräftat att den INTE orsakats av det här arbetet.

**Slutsats:** Element render delay-förbättringen (Task 1:s huvudfynd) syns i lokala mätningar men med stor spridning mellan körningar (t.ex. 1500ms → 1028ms → 91ms i tre separata simulate-körningar) — konsekvent i rätt riktning men för brusigt för ett exakt tal. Den auktoritativa mätningen (PageSpeed Insights mot en riktig deploy, tre körningar, i linje med Step 3 nedan) återstår och kräver att branchen pushas — inte gjort i den här sessionen, väntar på användarens godkännande.

- [ ] **Step 3: Deploya till en preview-miljö och kör PageSpeed Insights mobil mot den, tre gånger**

Pusha branchen och låt Vercel bygga en preview-deploy. Gå till `https://pagespeed.web.dev/analysis/<preview-url>?form_factor=mobile` och kör om testet minst tre gånger — enstaka körningar kan variera ±0,5s. Notera LCP och Prestanda-poängen för varje körning, jämför mot produktionsbaseline (Prestanda 81, LCP 4,5s, Element render delay 3130ms).

Om LCP inte flyttat sig märkbart trots alla tre uppgifterna: gå tillbaka till Task 1:s fynd och undersök om något Long-Task-block pekar på något som inte täcktes här (t.ex. ett fjärde tredjepartsskript, eller en font som laddas via en väg som missades i kodgranskningen).

- [x] **Step 4: Uppdatera CLAUDE.md:s fasminne**

Lagt till i `CLAUDE.md` (se Fasminne).
