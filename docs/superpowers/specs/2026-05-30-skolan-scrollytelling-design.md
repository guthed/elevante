# Design: `/skolan` — scrollytelling-presentation för skolor

**Datum:** 2026-05-30
**Status:** Godkänd design, redo för implementationsplan

## Översikt

En självgående, scroll-driven webbpresentation av Elevante riktad till
intresserade skolor/rektorer. Samma narrativ som rektorsdecket på `/rektor`,
men som en levande, responsiv sida i stället för statiska slides: innehållet
tonar/glider in när man scrollar, och ett interaktivt "prova-själv"-chatt-moment
sitter mitt i flödet som wow-punkt.

Decket på `/rektor` (med PDF-export) blir kvar för live-möten; den här sidan är
det man skickar som länk till en skola som vill kolla i lugn och ro — oftast i
mobilen.

## Mål & framgångskriterier

- Känns mer levande än ett deck, men håller sig strikt i "Editorial Calm"
  (lugnt, varmt, ivory — aldrig gamifierat).
- **Mobilförst** — de flesta öppnar länken i mobil. Felfri 375 → 1440px+.
- Ett genuint interaktivt moment (chatten) som får besökaren att *känna*
  produkten, inte bara läsa om den.
- Snabb: Core Web Vitals grönt, bra LCP (hero utan tung animation).
- Tillgänglig: WCAG AA, fungerar utan rörelse (`prefers-reduced-motion`).

## Placering & routing

- Ny route: **`app/skolan/page.tsx`** — fristående (utanför `[locale]`),
  svensk-only, statiskt genererad (SSG).
- **`skolor.elevante.se`** pekas om till `/skolan` i stället för `/rektor`.
  Ändras i `proxy.ts`: `SCHOOLS_HOST_PREFIX`-grenen rewritar till `/skolan`.
  `/rektor` fortsätter fungera oförändrat (deck + PDF + P-tangent).
- **`noindex`** (robots: index false, follow false) — nås bara via delad länk.
  Läggs inte i sitemap.
- Ingen header/footer från publika sajten — egen, ren layout.

## Sidstruktur (sektioner i ordning)

Copy återanvänds sektion för sektion från `/rektor`-decket
([app/rektor/page.tsx](../../../apps/web/app/rektor/page.tsx)). Skärmdumpar
återanvänds från `apps/web/public/rektor/`.

1. **Hero** — wordmark `Elevante.`, tagline, "varför vi bygger"-intro, scroll-cue.
2. **Problemet** — "Tre elever, samma lucka"; tre persona-kort som glider in i sekvens.
3. **Lösningen** — spelar in / transkriberar / svarar; text + chatt-skärmdump glider in.
4. **★ Prova själv** — interaktiv chatt-demo (se nedan). Mörkt block, framträdande.
5. **Så funkar det** — tre steg (REC → transkribering → eleven frågar).
6. **Inte ChatGPT** — strikt RAG med asterisk-fotnot.
7. **För eleven** — likvärdig tillgång m.m.; elev-översikt-skärmdump glider in.
8. **För rektor** — förståelsekarta-skärmdump glider in.
9. **Hela skolan** — gemensam grund + lärartid som räcker till fler.
10. **Tryggt med personuppgifter** — EU, KB-Whisper, råljud raderas, PUB-avtal.
11. **Det här mäter vi** — fyra mått.
12. **Kom igång** — gratis pilot, CTA "Boka en demo" (mailto), kontakt.

## Rörelse / scroll-reveal

- Komponent `Reveal.tsx` (client): wrappar en sektion, använder
  `IntersectionObserver` för att lägga på en `is-visible`-klass när elementet
  når ~mitten av viewporten. CSS-transition gör fade + liten translateY
  (16–24px), 240–320ms, `cubic-bezier(0.22, 1, 0.36, 1)`.
- Sekventiella barn (t.ex. persona-korten) får trappad fördröjning via
  `transition-delay` (stagger).
- `@media (prefers-reduced-motion: reduce)`: ingen translate/opacity-animation —
  innehållet visas direkt (Reveal sätter `is-visible` omedelbart / CSS no-op).
- Reveal är progressiv förbättring: utan JS visas allt (sektionerna är inte
  dolda i HTML, bara otransformerade) — viktigt för SSG/SEO-säkerhet och a11y.

## Prova-själv-chatten (`ChatDemo.tsx`)

Client-komponent. **Helt scriptad** — inget anrop mot RAG-backend (reliabilitet,
ingen kostnad, GDPR-tryggt). Innehållet är fördefinierat och tydligt grundat.

**Interaktion (tre tillstånd):**
1. **Förslag:** 3 färdiga frågor som chips (riktiga `<button>`).
2. **Skriver:** vald fråga visas som användarbubbla → "• • •"-indikator (~600–900ms).
3. **Svar:** svaret tonar/skriver in + en eller två **källa-chips**
   ("Lektion 12 · 23:14"). Besökaren kan välja en annan fråga och köra igen.

**Innehåll (fördefinierade par):**

| Fråga | Svar (kort, grundat) | Källa-chips |
|---|---|---|
| Vad var poängen med integraler? | En integral räknar ihop många små bitar till en helhet — precis som arean under kurvan ni räknade på. | Lektion 12 · 23:14 · 28:47 |
| Vad missade jag när jag var sjuk? | Förra lektionen handlade om energiflöde i ekosystem — hur energi förs vidare led för led i näringskedjan. | Lektion 9 · 11:20 |
| Förklara fotosyntesen enkelt | Växten fångar solljus och gör om koldioxid och vatten till socker (energi) och syre. | Lektion 6 · 04:48 |

(Exakta formuleringar finputsas vid implementation; tonen ska matcha decket.)

**A11y/mobil:**
- Chips ≥ 44px tap-target; tydligt fokus-läge.
- Svarsområdet är `aria-live="polite"` så skärmläsare läser upp svaret.
- `prefers-reduced-motion`: hoppa "skriver"-fördröjning och typewriter — visa
  fråga + svar direkt.
- Full bredd i mobil; centrerat, max-bredd på desktop.

## Teknik & komponenter

- **`app/skolan/page.tsx`** — server component, SSG, all copy + sektioner,
  importerar skärmdumpar från `public/rektor/` via `next/image`.
- **`app/skolan/Reveal.tsx`** — client, scroll-reveal-wrapper.
- **`app/skolan/ChatDemo.tsx`** — client, scriptad chatt.
- **Styling:** Tailwind v4 + Editorial Calm-tokens i `globals.css` (samma som
  övriga publika sajten). Ev. några keyframes i en liten `skolan.module.css`
  om Tailwind inte räcker för reveal/typewriter.
- **Inga nya beroenden** — ingen animationslib; ren IntersectionObserver + CSS.
- **`proxy.ts`** — ändra `SCHOOLS_HOST_PREFIX`-rewrite från `/rektor` till `/skolan`.
- **Bilder:** `next/image`, responsiva storlekar, lazy under hero.

## Responsivt & prestanda

- Mobilförst-layout; brytpunkter 375 / 768 / 1280 / 1440.
- Hero renderas utan animation som blockerar LCP.
- Skärmdumpar lazy-laddas (utom ev. den första synliga).
- SSG → statiskt servad, snabb TTFB.

## Utanför scope (YAGNI)

- Riktig RAG i demon (scriptat räcker; V2 om man vill).
- Engelsk översättning (svensk-only som decket).
- A/B-tester, analytics-event (kan läggas till senare).
- Återanvändning av deckets fixed-canvas-layout (sidan byggs fluid från grunden;
  copy & bilder delas, inte layouten).

## Påverkade/nya filer

- Ny: `apps/web/app/skolan/page.tsx`
- Ny: `apps/web/app/skolan/Reveal.tsx`
- Ny: `apps/web/app/skolan/ChatDemo.tsx`
- Ev. ny: `apps/web/app/skolan/skolan.module.css`
- Ändras: `apps/web/proxy.ts` (rewrite-mål `/rektor` → `/skolan`)
