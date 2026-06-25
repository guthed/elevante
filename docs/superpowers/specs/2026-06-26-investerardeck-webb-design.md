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

1. **Åtkomst:** `noindex` + gömd URL, precis som `/rektor`. Ingen lösenordsgate. "The ask" och siffror ligger på sidan.
2. **Språk:** bilingual sv/en. Billigt eftersom de engelska översättningarna redan finns i `elevante-deck/i18n.js`.
3. **Per investerare:** nej — en generisk version (deckets `_default`). Slide 18 ("Varför [investerare]") utelämnas helt på webben.
4. **URL:** `/investerare` (sv) + `/investerare/en` (en).

---

## Bärande principer

1. **Samma princip som `/rektor`.** Återanvänd showcase-biblioteket; bygg bara nytt för det decket har och `/rektor` saknar (data-tunga slides). Editorial Calm, `Eyebrow`/`Reveal`-rytm, mörk CTA på slutet.
2. **Återanvänd, bygg inte om.** Nya block läggs i `components/showcase/` så de hör till samma familj. Inget chart-bibliotek — div-staplar (samma teknik som `/admin/statistik`).
3. **Copy lyfts 1:1 ur deck-källan.** Texten kommer från `build-deck.js` (sv) + `i18n.js` (en). Ingen ny copy uppfinns; vi strukturerar om från slide-layout till scroll.
4. **`noindex`, utanför `[locale]`.** Sidan ärver inte publika sajtens header/footer — egen immersiv layout som `/rektor`.

---

## Arkitektur

### 1. Routing & språk

Två routes utanför `[locale]`, båda SSG, båda `noindex`:

| Route | Fil | Språk |
|-------|-----|-------|
| `/investerare` | `app/investerare/page.tsx` | sv |
| `/investerare/en` | `app/investerare/en/page.tsx` | en |

Båda renderar samma presentationskomponent `<InvestorDeck lang={…} />`. `metadata.robots = { index: false, follow: false }` på båda.

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
| 10 | Marknad | TAM (Sverige → Norden → EU) | `MarketTiers` | **ny** |
| 11 | Expansion | TAM-trappa | `TamLadder` (div-staplar) | **ny** |
| 12 | Affärsmodell | Enhetsekonomi | Reveal-kort / nyckeltal | befintligt |
| 13 | Affären i siffror | ARR | `ArrChart` (div-staplar) | **ny** |
| 14 | Traction | LOI / Nacka / byggd produkt | Reveal-tidslinje | befintligt |
| 15 | Positionering | Egen kategori | kort (vs konsument-AI / skolplattformar) | befintligt |
| 16 | Team | Team | kort | befintligt |
| 17 | Investeringscaset | Caset | Reveal-text | befintligt |
| ~~18~~ | ~~Varför [investerare]~~ | **utelämnas** | — | — |
| 19 | The ask | 14 MSEK CTA | mörk sektion (som `/rektor` §13) | befintligt mönster |
| 20 | Källor | Appendix | liten fotnotslista | befintligt |

Fotoband från `public/images/` mellan sektioner där det lyfter (frivilligt, som `/rektor`).

### 5. Nya komponenter (4 st) — `components/showcase/`

Alla rena Tailwind, inget externt beroende. Tar redan översatt/strukturerad data som props (ingen copy hårdkodad i komponenten).

| Komponent | Vad | Teknik |
|-----------|-----|--------|
| `DeckStats` | 4 statistikkort med stor siffra + källa | grid + `Reveal`, coral-accent på siffra |
| `MarketTiers` | Marknadsnivåer (SE → Norden → EU + adjacent) | staplade kort/ringar, ökande storlek |
| `TamLadder` | Expansion/TAM-trappa över faser | horisontella div-staplar med etiketter |
| `ArrChart` | ARR-prognos per år | vertikala div-staplar (samma teknik som `/admin/statistik`) |

Alla: WCAG AA (siffror som text, inte bara visuell höjd; `aria-label` på staplar), `prefers-reduced-motion` via `Reveal`, responsivt 375 → 1440.

### 6. Språkväxlare — `app/investerare/LangToggle.tsx`

Liten klientkomponent: två `<Link>` (SV / `/investerare`, EN / `/investerare/en`), aktivt språk via prop. Fixerad position uppe till höger, diskret.

---

## Det som INTE ingår (YAGNI)

- Ingen per-investerar-anpassning (slide 18 utelämnas; `investors.js` rörs inte).
- Ingen indexering, ingen lösenordsgate — `noindex` + gömd URL.
- Inget chart-bibliotek — div-staplar räcker.
- Inga nya skärmdumpar — `public/rektor/`-bilderna återanvänds.
- Ingen ändring av `elevante-deck/` (PowerPoint-källan lever kvar oförändrad; webben är en parallell yta).
- Ingen scroll-driven animation utöver `Reveal` (samma beslut som `/rektor`).

---

## Kvalitet / acceptans

- WCAG AA: kontrast, `Reveal` respekterar `prefers-reduced-motion`, alt-text på alla shots, `ZoomableShot` tangentbordsåtkomlig, språkväxlare med `aria-current`, sifferdata i charts läsbar som text.
- Responsivt 375 / 768 / 1280 / 1440.
- Båda routes `noindex`; verifiera i byggd `robots`-meta.
- Inga hårdkodade strängar i presentationskomponenten — allt ur `content.ts` med sv/en.
- Engelska och svenska sidan renderar samma struktur, rätt språk per route.
- `/rektor` och startsidan oförändrade (vi rör bara `components/showcase/` additivt).

---

## Faser (för implementationsplanen)

1. **Innehållsmodul:** `content.ts` med sv/en för alla sektioner, lyft ur `build-deck.js` + `i18n.js`. Mappa varje sektion → källfunktion.
2. **Nya showcase-komponenter:** `DeckStats`, `MarketTiers`, `TamLadder`, `ArrChart` + `LangToggle`. Verifiera a11y/responsivt isolerat.
3. **Sidan:** `InvestorDeck.tsx` + `app/investerare/page.tsx` + `app/investerare/en/page.tsx`. Komponera alla sektioner ur content + showcase.
4. **Slutverifiering:** `noindex`, språkväxling, responsivt, a11y, länkar, byggd output (SSG-rutter). Bekräfta att `/rektor` + startsidan är oförändrade.
