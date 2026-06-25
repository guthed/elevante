# Investerardeck som webbsida — design

**Datum:** 2026-06-26
**Status:** Godkänd struktur, väntar på spec-granskning
**Mål:** En delbar scroll-webbsida i Editorial Calm med investerar­innehållet — byggd efter exakt samma princip som `/rektor` (delade showcase-komponenter, egen immersiv layout, `noindex`), men **bilingual sv/en**.

---

## Bakgrund

Investerarmaterialet finns idag bara som PowerPoint i `elevante-deck/` (20 slides, byggt med pptxgenjs i `build-deck.js`, engelska översättningar i `i18n.js`, per-investerar-block i `investors.js`). Vi vill ha samma sak som en **länkbar webbsida** — samma move som vi gjorde för rektorerna när `/rektor` gick från bildspel till scroll-sida.

Mönstret och byggstenarna finns redan:
- `/rektor` (`apps/web/app/rektor/page.tsx`) — referensimplementationen: ren Tailwind-scroll-sida, `Eyebrow`-helper, `Reveal`, `ZoomableShot`, `ChatDemo`, `LoopVisuals`, mörk CTA-sektion.
- `components/showcase/` — delat bibliotek (`Reveal`, `ZoomableShot`, `ChatDemo`, `LoopVisuals`).
- `public/rektor/` — aktuella appskärmdumpar (chat-källor, elev-översikt, förståelsekarta) återanvänds.

---

## Beslut (bekräftade med John)

1. **Åtkomst:** `noindex` **+ lösenordsskydd** (uppdaterat 2026-06-26 — ersätter det tidigare "bara gömd URL"). "The ask" och siffror ligger på sidan, men sidan är delad lösenords­gate framför. Se §8.
2. **Språk:** bilingual sv/en. Billigt eftersom de engelska översättningarna redan finns i `elevante-deck/i18n.js`.
3. **Per investerare:** nej — en generisk version (deckets `_default`). Slide 18 ("Varför [investerare]") utelämnas helt på webben.
4. **URL:** `/investerare` (sv) + `/investerare/en` (en).
5. **Mobil först-klassigt:** sidan ska vara fullt läsbar på mobil (375 px) från start — inklusive kurvor, nätverksgraf och animationer. Inte en efterhandsanpassning. Se §9.

---

## Bärande principer

1. **Samma princip som `/rektor`.** Återanvänd showcase-biblioteket; bygg bara nytt för det decket har och `/rektor` saknar (data-tunga slides). Editorial Calm, `Eyebrow`/`Reveal`-rytm, mörk CTA på slutet.
2. **Återanvänd, bygg inte om.** Nya block läggs i `components/showcase/` så de hör till samma familj. Inget chart-bibliotek — handrullad SVG.
5. **Datavisualiseringen ska imponera och växa fram vid scroll** (Johns uttryckliga krav). Signaturgreppet är en **animerad staplad band-kurva** (stil "C", vald via visuell companion 2026-06-26): tre mjuka lager som byggs på varandra och sveper in från vänster när sektionen scrollas in, med uppräknande siffror. Coral/sage/sand. Återkommer på flera scen-stopp så sidan får en igenkännbar rytm. `prefers-reduced-motion` → fullt ritad kurva direkt, ingen rörelse.
3. **Copy lyfts 1:1 ur deck-källan.** Texten kommer från `build-deck.js` (sv) + `i18n.js` (en). Ingen ny copy uppfinns; vi strukturerar om från slide-layout till scroll.
4. **`noindex`, utanför `[locale]`.** Sidan ärver inte publika sajtens header/footer — egen immersiv layout som `/rektor`.

---

## Arkitektur

### 1. Routing & språk

Två routes utanför `[locale]`, båda SSG, båda `noindex`:

| Route | Fil | Språk | Skyddad |
|-------|-----|-------|---------|
| `/investerare` | `app/investerare/page.tsx` | sv | ja (gate) |
| `/investerare/en` | `app/investerare/en/page.tsx` | en | ja (gate) |
| `/investerare/las-upp` | `app/investerare/las-upp/page.tsx` | sv/en | nej (lösenforms-sida) |

Båda deck-routerna renderar samma presentationskomponent `<InvestorDeck lang={…} />`. `metadata.robots = { index: false, follow: false }` på samtliga (även gate-sidan). Lösenordsgrinden ligger i `proxy.ts` — se §8.

**Språkväxlare:** liten fixerad SV/EN-toggle uppe i hörnet (länkar mellan de två routerna). WCAG: riktiga `<Link>`, aktivt språk markerat med `aria-current`.

### 2. Innehållsmodul — `app/investerare/content.ts`

All copy ligger i en typad modul, ett objekt per fält med `{ sv, en }` (eller en `t(lang, key)`-helper). Strukturen speglar deckets slides men i scroll-ordning. Siffror, egennamn, källnamn och e-post är språkneutrala (lämnas som de är, precis som decket gör).

Källa för strängarna: motsvarande `slideN_*`-funktion i `build-deck.js` (sv) + nyckeln i `i18n.js` (en). Implementationsplanen mappar varje sektion → källfunktion.

### 3. Presentationskomponent — `app/investerare/InvestorDeck.tsx`

En `<main className="bg-canvas text-ink">` med sektioner i samma stil som `/rektor`. Tar `lang` och läser ur `content.ts`. Server component där möjligt; `Reveal`/`ZoomableShot`/`ChatDemo` är redan klientkomponenter.

### 4. Sektionskarta (deckets 20 slides → scroll)

| # | Deck-slide | Webb-sektion | Komponent | Status |
|---|-----------|--------------|-----------|--------|
| 1 | Titel | Hero | serif-rubrik + eyebrow (pre-seed/ask-rad) | befintligt mönster |
| 2 | Problem (4 statistikkort) | Problemet | `DeckStats` | **ny** |
| 3 | Marknadsglappet | Varför nu | Reveal-text + ev. tvåkolumn | befintligt |
| 4 | Lösningen (strikt RAG) | Lösningen | `ZoomableShot` (chat-källor) | finns |
| 5 | Så fungerar det | Tre steg | `LoopVisuals`-triptyk | finns |
| 6 | Produkten | Eleven får / läraren ser | `ZoomableShot` ×2 (elev-översikt + förståelsekarta) | finns |
| 7 | Datamoat | Nätverkseffekt | Reveal-kort | befintligt |
| 8 | Differentiering | EU / GDPR | numrerad ikon-rad (som `/rektor` §11) | befintligt |
| 9 | Avanti / syntetisk lärare | Roadmap (V2/V3) | Reveal-text | befintligt |
| 10 | Marknad | TAM (Sverige → Norden → EU) | `StackedCurve` (band, hjältescen) | **ny** |
| 11 | Expansion | TAM-trappa | `StackedCurve` (faser staplade) | **ny** |
| 12 | Affärsmodell | Enhetsekonomi | Reveal-kort / nyckeltal | befintligt |
| 13 | Affären i siffror | ARR | `StackedCurve` (lager per geografi/ström) | **ny** |
| 14 | Traction | LOI / Nacka / byggd produkt | Reveal-tidslinje | befintligt |
| 15 | Positionering | Egen kategori | kort (vs konsument-AI / skolplattformar) | befintligt |
| 16 | Team | Team | kort | befintligt |
| 17 | Investeringscaset | Caset | Reveal-text | befintligt |
| ~~18~~ | ~~Varför [investerare]~~ | **utelämnas** | — | — |
| 19 | The ask | 14 MSEK CTA | mörk sektion (som `/rektor` §13) | befintligt mönster |
| 20 | Källor | Appendix | liten fotnotslista | befintligt |

Fotoband från `public/images/` mellan sektioner där det lyfter (frivilligt, som `/rektor`).

### 5. Nya komponenter (2 st) — `components/showcase/`

Handrullad SVG + Tailwind, inget externt beroende. Tar redan översatt/strukturerad data som props (ingen copy hårdkodad i komponenten).

**`StackedCurve`** — signaturkurvan (stil "C"). Återanvänds på tre scen-stopp: ARR (§13), marknad/TAM (§10), expansion (§11). Props: `series` (array av lager med `label`, `color`, värden per x-punkt), `categories` (x-etiketter, t.ex. årtal), `unit`, valfri `caption`. Renderar:
- Mjuka staplade band (Catmull-Rom-utjämnad area per lager), färger coral / sage / sand.
- Topp-linje på den ackumulerade summan.
- **Animation:** lagren sveper in från vänster (`clip-path: inset(...)` 0→100 %) + topp-siffran räknas upp, triggat när komponenten scrollas in i vy (IntersectionObserver, samma mönster som `Reveal`). `prefers-reduced-motion` → ritad direkt.
- **Legend** (band-etiketter) under kurvan.
- **WCAG AA:** alla värden finns som läsbar text (legend + ev. dold tabell/`<title>`), inte bara visuell höjd; `role="img"` + beskrivande `aria-label`; rörelse bara dekorativ.

**`DeckStats`** — fyra statistikkort (problem-sliden §2): stor siffra (coral, uppräknande) + etikett + källa. Grid + `Reveal`-staggrat. Siffrorna är text (a11y).

Lagersemantik som behöver bekräftas av John innan implementation: TAM staplas **Sverige / Norden / EU**; ARR (§13) staplas förslagsvis per **geografi** (samma tre) för en sammanhängande berättelse — men deckets slide 13 (`slide13_numbers` i `build-deck.js`) kan ha en enklare serie. Implementationsplanen läser den faktiska datan därifrån och väljer lager-uppdelning som stämmer med deckets siffror.

Båda: responsivt 375 → 1440, `prefers-reduced-motion`-respekt.

### 6. Språkväxlare — `app/investerare/LangToggle.tsx`

Liten klientkomponent: två `<Link>` (SV / `/investerare`, EN / `/investerare/en`), aktivt språk via prop. Fixerad position uppe till höger, diskret.

### 7. Animation & mikrointeraktioner (scroll-triggade)

**Princip: återhållsamhet.** Editorial Calm är "andningsbart" — varje animation bär mening, ett fåtal grepp återkommer. Allt triggas när elementet möter vyn (IntersectionObserver, samma mönster som `Reveal`), easing `cubic-bezier(0.22, 1, 0.36, 1)`, 240–320 ms. **`prefers-reduced-motion` → slutläget visas direkt, ingen rörelse** (gäller samtliga punkter nedan).

**Låsta grepp (bygg i v1):**

| # | Grepp | Var | Komponent / not |
|---|-------|-----|-----------------|
| 1 | **Uppräknande siffror** | problem-statistik §2, marginal/pris §12, the ask §19 | delad `useCountUp`-hook; tal alltid som läsbar text (a11y) |
| 2 | **Nätverksgraf som kopplas ihop** | datamoat §7 | **ny** `NetworkReveal` — noder + förbindelser som ritas in; animationen *är* nätverkseffekten |
| 3 | **Koncentriska ringar som expanderar** | marknad §10 | Sverige → Norden → EU rippl
ar utåt en i taget; komplement till `StackedCurve` |
| 4 | **Tidslinje som ritas** | traction §14 | linje dras genom milstolparna (produkt → LOI → pilot hösten 2026), prickar poppar i sekvens |
| 5 | **Eyebrow-hårstreck växer** | varje sektion | `Eyebrow`-helpern animerar bredden 0 → 36 px vid reveal (idag statiskt i `/rektor`) |
| 6 | **Scroll-progress** | hela sidan | tunt coral-streck högst upp som visar position i pitchen |

Punkterna 1, 5 och 6 är genomgående rytm; 2–4 är sektions-specifika hjältegrepp. `StackedCurve` (§5 ovan) har sin egen svep-in och hör till samma familj.

**Nya komponenter som detta tillför:** `NetworkReveal` (datamoat), `ConcentricMarket` (ringar §10), `ScrollProgress`, samt hookarna `useCountUp` och `useInView`. `Timeline` (§14) och eyebrow-animationen kan vara lokala i `InvestorDeck`/`Eyebrow`.

**Hålls i reserv** (läggs till bara om sidan känns platt): coral-understruket nyckelord, `ZoomableShot`-lyft (skala 0,97 + djupare skugga). Utelämnade medvetet: parallax, rotation, hover-zoom på siffror, "räkna upp" på allt — drar mot pitch-deck-cliché och bryter lugnet.

### 8. Lösenordsskydd

Delad lösenords­gate (inte per-investerar-konton, inte Supabase-auth — investerare är inte användare). Stack-matchande: grinden bor i `proxy.ts` (Next.js 16), samma fil som redan skyddar `/app/*`.

**Flöde:**
1. Lösenordet ligger i env-var `INVESTOR_DECK_PASSWORD` (sätts i Vercel, aldrig i repot).
2. `/investerare/las-upp` är en publik sida med ett enkelt lösenforms­fält → Server Action jämför mot env-varianten. Vid träff sätts en **httpOnly, Secure, SameSite=Lax-cookie** (`investor_access`) med ett signerat värde (HMAC av en serverhemlighet, inte lösenordet i klartext), och redirect till `/investerare`.
3. `proxy.ts` matchar `/investerare` och `/investerare/en`: saknas/ogiltig cookie → redirect till `/investerare/las-upp` (med `?next=`-param för att återvända rätt). `/investerare/las-upp` och statiska assets släpps igenom.
4. Fel lösenord → formuläret visar diskret felmeddelande (lokaliserat), ingen läckande timing/detalj.

**Noter:**
- Gate-sidan ärver samma immersiva layout (ingen publik nav), Editorial Calm, bilingual via samma `content.ts`.
- Cookie-livslängd: t.ex. 30 dagar (investerare slipper logga in om igen mellan sittningar). Justerbart.
- Detta är "delningsskydd", inte hård säkerhet — men HMAC-cookie + httpOnly hindrar trivial förfalskning, och `noindex` står kvar oavsett.
- Reversibelt och isolerat: rör bara `proxy.ts`-matcher + ny gate-sida; påverkar inte `/app/*`- eller `/rektor`-flödena.

### 9. Mobil (375 px) — först-klassigt, inte efterhand

Sidan ska läsas lika bra i mobil som på desktop. Konkret per element:

- **Layout:** alla `md:grid-cols-2`-sektioner staplas till en kolumn; generösa men mindre vertikala marginaler; `container-content` med mobilanpassad padding (som `/rektor`).
- **Typografi:** serif-rubriker skalar ner (`text-4xl` mobil → `text-6xl`+ desktop), bryts snyggt, inga avhuggna ord.
- **`StackedCurve`:** SVG har responsiv `viewBox` (skalar), färre/glesare x-etiketter på smal skärm, legend wrappar under. Siffror läsbara.
- **`NetworkReveal`:** förenklas på mobil (färre noder eller tätare layout) så grafen inte blir gröt; rörelsen behålls men inom en mindre canvas.
- **`ConcentricMarket` / `Timeline`:** ringar/tidslinje roterar till vertikalt flöde på smal skärm där det behövs.
- **Språkväxlare + scroll-progress:** placeras så de inte krockar med mobilens systemfält; touch-targets ≥ 44 px.
- **`ZoomableShot`:** tap-to-zoom fungerar på touch; skärmdumpar läsbara i full bredd.
- **Animation:** samma `prefers-reduced-motion`-regel; tunga effekter (nätverksgraf) får inte tappa frames på mobil — håll nodantal lågt och använd transform/opacity (GPU), inte layout-triggande egenskaper.
- **Verifiering:** testas på 375 / 414 px utöver 768 / 1280 / 1440 (preview-flödet).

---

## Det som INTE ingår (YAGNI)

- Ingen per-investerar-anpassning (slide 18 utelämnas; `investors.js` rörs inte).
- Ingen indexering — `noindex` står kvar utöver lösenordsgaten (§8).
- Ingen per-investerar-inloggning / Supabase-auth — en **delad** lösenordsgate räcker (§8).
- Inget chart-bibliotek — handrullad SVG (`StackedCurve`).
- Inga nya skärmdumpar — `public/rektor/`-bilderna återanvänds.
- Ingen ändring av `elevante-deck/` (PowerPoint-källan lever kvar oförändrad; webben är en parallell yta).
- Ingen scroll-driven animation utöver `Reveal` (samma beslut som `/rektor`).

---

## Kvalitet / acceptans

- WCAG AA: kontrast, `Reveal` respekterar `prefers-reduced-motion`, alt-text på alla shots, `ZoomableShot` tangentbordsåtkomlig, språkväxlare med `aria-current`, sifferdata i charts läsbar som text.
- **Mobil först-klassigt:** fullt läsbar och snygg på 375 px — kurvor, nätverksgraf, ringar och tidslinje fungerar och tappar inte frames (§9). Verifieras på 375 / 414 / 768 / 1280 / 1440.
- **Lösenordsgate (§8):** utan giltig cookie redirectar `/investerare` + `/investerare/en` till `/investerare/las-upp`; rätt lösenord släpper in och cookien består; fel lösenord avvisas utan läckage. `/app/*`- och `/rektor`-flödena opåverkade.
- Samtliga routes `noindex`; verifiera i byggd `robots`-meta.
- Inga hårdkodade strängar i presentationskomponenten — allt ur `content.ts` med sv/en.
- Engelska och svenska sidan renderar samma struktur, rätt språk per route.
- `/rektor` och startsidan oförändrade (vi rör bara `components/showcase/` additivt + `proxy.ts`-matcher).

---

## Faser (för implementationsplanen)

1. **Innehållsmodul:** `content.ts` med sv/en för alla sektioner, lyft ur `build-deck.js` + `i18n.js`. Mappa varje sektion → källfunktion.
2. **Nya showcase-komponenter + animation:** `StackedCurve` (signaturkurvan), `DeckStats`, `NetworkReveal` (datamoat), `ConcentricMarket` (marknadsringar), `ScrollProgress`, `LangToggle` + hookarna `useInView`/`useCountUp`. Eyebrow-animation och `Timeline` (traction). Verifiera a11y/responsivt/reduced-motion isolerat — varje scroll-triggat grepp visar slutläget direkt vid `prefers-reduced-motion`.
3. **Sidan:** `InvestorDeck.tsx` + `app/investerare/page.tsx` + `app/investerare/en/page.tsx`. Komponera alla sektioner ur content + showcase. Mobil-layout verifieras löpande (375 px), inte sist.
4. **Lösenordsgate:** `proxy.ts`-matcher för `/investerare*`, `/investerare/las-upp`-sida + Server Action, HMAC-cookie, `INVESTOR_DECK_PASSWORD` i env. Verifiera redirect- och unlock-flödet.
5. **Slutverifiering:** lösenordsgate, `noindex`, språkväxling, responsivt (375 → 1440), a11y/reduced-motion, animations-prestanda på mobil, länkar, byggd output (SSG-rutter). Bekräfta att `/rektor`, `/app/*` + startsidan är oförändrade.
