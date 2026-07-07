# /try — publik kampanjsida: upplev Elevante utan konto

**Datum:** 2026-07-07
**Status:** Godkänd design, redo för implementationsplan

---

## Syfte

En publik, indexerbar sida där vem som helst — elev, lärare, förälder, rektor —
upplever Elevantes kärnloop på riktigt: välj lektioner, chatta med innehållet,
generera ett prov och få det AI-rättat. Ingen inloggning, ingen säljvägg.
Filosofin: lita på att upplevelsen övertygar. Konvertering är en mjuk dörr på
vägen ut, aldrig en grind.

Skild från befintliga `/demo` (säljarens skriptade klick-igenom, noindex) —
`/try` är interaktiv och riktar sig direkt till besökaren.

## URL & routing

- `apps/web/app/[locale]/(public)/try/page.tsx` → `/sv/try` och `/en/try`
- Samma path för båda locales (repots mönster). Namnet "try" fungerar
  internationellt och begrips på svenska.
- **Indexerbar**: ingen `noindex`. Metadata, OG-bild och JSON-LD som övriga
  publika sidor. Läggs in i sitemap.
- UI fullt tvåspråkigt (sv/en). Lektionsinnehållet är svenskt (äkta
  klassrumsmaterial är poängen); en-versionen säger detta ärligt.

## Upplevelsen — guidad väg i tre steg

En progress-rad högst upp håller ihop loopen. All state lever i webbläsaren
(React state) — **inget sparas på servern**. Man kan gå tillbaka, och hoppa
framåt när ett steg är klart, men default är berättelsen.

### ① Välj lektioner
Rutnät av lektionskort (multi-select — "en eller flera"). Varje kort visar
ämne, titel och kort sammanfattning. Minst en vald → "Fortsätt →".

### ② Ställ frågor
Äkta Claude-RAG-chatt mot de valda lektionerna:
- Svar med **källcitat** (faktiskt transkript-utdrag + tidsstämpel), samma
  citat-kort-mönster som elevappen och investerar-demon.
- Strikt RAG: frågor utanför lektionerna nekas vänligt — inget citat visas då.
- **Kontextuella förslagsfrågor** som chips ovanför inputfältet, beroende på
  vilka lektioner som valts. Byts ut allteftersom de används. Tomt chattfält
  får aldrig vara enda vägen in.
- Alltid-synlig "Testa dig själv →" till steg ③.

### ③ Testa dig själv
- "Skapa prov" → Claude genererar ett kort prov (ca 4–6 frågor, mix flerval +
  fritext) från de valda lektionerna.
- Besökaren svarar → "Rätta" → resultat med poäng, feedback per fråga och en
  varm sammanfattning ("dina styrkor / det här kan du öva på") — samma
  persona-känsla som lärprofilen, men engångs och anonym.
- Efter resultatet: mjuk avslutning — "Vill du ha det här på din skola?" med
  länkar till `kontakt?topic=demo` och `for-skolor`. Lågmält, ingen grind.

## Innehåll

- **V1: enbart Ekologi.** Statiskt, server-only lektionsbibliotek i
  `lib/demo/lessons.ts` — utökar mönstret från `app/investerare/demo-transcript.ts`
  till ~6 lektioner (titel, sammanfattning, koncept, transkript-segment med
  tidsstämplar, förslagsfrågor per lektion).
- Statiskt innehåll = snabbt, cachebart, ingen DB/RLS-exponering på öppen sida.
  Chatt, provgenerering och rättning anropar ändå Claude live.
- Fler ämnen är en enkel senare utökning (nytt objekt i biblioteket).

## Teknik

### API-rutter (alla stateless, ingen persistens)
- `POST /api/try/chat` — fråga + valda lektions-id:n → `answerWithRag` mot de
  valda transkripten + citat-matchning (återbruk från
  `/api/investerare/demo-chat`, generaliserad till flera lektioner).
- `POST /api/try/test` — valda lektions-id:n → provfrågor (jsonb-form som
  `class_tests.questions`; prompt-logik återbrukad från `generateClassTest`).
  Facit följer INTE med till klienten — servern returnerar frågor utan
  `correct`-fält plus en signerad/HMAC:ad payload (eller: klienten skickar
  tillbaka frågorna vid rättning och servern litar på Claude för fritext,
  deterministisk nyckel för flerval via HMAC). Enklaste robusta lösning väljs
  i planen.
- `POST /api/try/grade` — frågor + svar → rättning (flerval i kod, fritext av
  Claude; återbruk från `gradePracticeTest`-logiken) + styrkor/öva-på-summering.

### UI-komponenter
- `components/try/TryExperience.tsx` (client) — orkestrerar steg + state.
- Delkomponenter: `LessonPicker`, `ChatStep`, `TestStep`, `StepRail`
  (progress-raden).
- Återbrukar Editorial Calm-tokens, citat-kortets stil och `TestResult`-mönstret
  (kopieras/anpassas — appens komponent är kopplad till DB-typer).

## Skydd & kostnad

- **Låst korpus:** strikt RAG gör att sidan inte kan användas som gratis-LLM.
- **Inputtak:** fråga ≤ 300 tecken; provsvar ≤ 1 000 tecken/fråga; begränsad
  chatthistorik i prompten; `max_tokens`-tak på alla anrop.
- **Rate-limit:** per session-cookie + IP (t.ex. N chattfrågor och M prov per
  timme). Vänligt felmeddelande vid tak ("Testa igen om en stund").
- **Offline-graceful:** utan Anthropic-nycklar → snäll fallback i chatten
  (mönstret från `mockedAnswer`/`offline`-flaggan); prov-steget visar då ett
  förberett exempelprov istället för att fallera.

## Kvalitetskrav

- WCAG AA; tangentbordsnavigering; `aria-live` för chattsvar och rättning.
- Inga hårdkodade strängar — UI-copy via samma i18n-mönster som övriga publika
  sidor.
- Zod-validering på alla API-rutter.
- Responsivt 375 → 1440+; `prefers-reduced-motion` respekteras.
- Core Web Vitals grönt: själva sidan är statisk, interaktiviteten hydreras.

## Inte i V1

- Fler ämnen än Ekologi.
- Sparade resultat, konton, delningslänkar.
- Engelskt lektionsinnehåll.
- Telemetri/spårning utöver enkel sidvisning (kan läggas till senare).

## Öppna punkter till planen

- Exakt mekanism för facit-skydd i provflödet (HMAC-payload vs. re-grade).
- Rate-limit-implementation (in-memory räcker ej på serverless — troligen
  Supabase-tabell eller Vercel KV-ersättare; avgörs i planen).
- Var förslagsfrågorna per lektion författas (i `lessons.ts`, hårdkodade per
  lektion — inte AI-genererade i runtime).
