# Investerardeck — interaktiva elev/lärare-flikar i §6 Produkten — design

**Datum:** 2026-08-15
**Status:** Godkänd struktur, väntar på spec-granskning
**Mål:** Ersätta den nuvarande asymmetriska §6-sektionen (statisk skärmdump för eleven, levande komponent för läraren) med en tydligt separerad, växlingsbar flikvy där **båda** rollerna är levande, klickbara produktkomponenter — byggt på befintliga, redan verifierade byggstenar.

---

## Bakgrund

§6 PRODUKTEN (`apps/web/app/investerare/InvestorDeck.tsx`, ~rad 256–325) visar idag:
- Två statiska punktlistor, "För eleven" / "För läraren" (`COPY.product.cols`, `content.ts`).
- En **statisk skärmdump** av elevens översiktsvy (`shotElev` = `public/rektor/elev-oversikt.png`) — inte ens en bild av chatten, bara lektionslistan.
- Den **riktiga, klickbara** `InsightHeatmap`-komponenten för läraren, körd på syntetisk data (`demo-insight.ts`).

Denna snedbalans — läraren får en levande demo, eleven får en bild — är det konkreta problemet. Samtidigt finns redan en **fullt fungerande, live, backend-kopplad elevchatt** i §4 SOLUTION (`InvestorChatDemo` → `/api/investerare/demo-chat` → riktiga `answerWithRag`), på exakt samma syntetiska Ekologi-lektion som lärarens förståelsekarta. Ingredienserna finns redan; de är bara inte sammanförda på rätt plats.

John: *"jag vill göra vad eleven ser och vad lärare ser tydligare och mer separerade, tillsammans med möjligheten att göra dem interaktiva. Kan vi skapa varianter av det som finns på elevante.se för demoskolan på investerardelen?"*

---

## Beslut (bekräftade med John under brainstorming)

1. **Konsolidering:** §4 behåller sin befintliga chatt oförändrad, som en kort försmak av konceptet. §6 blir den samlade, dedikerade platsen för elev/lärare-jämförelsen.
2. **Interaktionsmodell:** flik-växling (pill-switch "Eleven" / "Läraren") ovanför ett enda fullbrett fönster — inte sida-vid-sida, inte en guidad stegberättelse.
3. **Elev-flikens starttillstånd:** tom, med bara klickbara förslagsfrågor synliga — inte samma förifyllda konversation som §4 (skulle kännas repetitivt för någon som redan sett §4).
4. **Befintligt innehåll i §6:** punktlistorna krymps och ligger kvar som kort textstöd under flikarna. Skärmdumpen av elevens översiktsvy tas bort helt.

---

## Bärande principer

1. **Återanvänd, bygg inte om.** Både elev- och lärarsidan är redan riktiga, verifierade, backend-kopplade produktkomponenter (`InvestorChatDemo`, `InsightHeatmap`). Det här är en omkomponering och en liten propp-tillökning, inte nybygge av produktlogik.
2. **En komponent, två användningar.** `InvestorChatDemo` får en `seeded`-flagga istället för att kopieras till en ny fil — enda skillnaden mellan §4:s och §6:s instans är starttillståndet, inte beteendet.
3. **Ingen ny data.** Samma syntetiska Ekologi-lektion, samma demo-elever/lärare som redan är etablerade i decket (`demo-insight.ts`, `demo-transcript.ts`) — konsekvent med resten av sidan.
4. **Respektera den dokumenterade `will-change`-fällan.** `InsightHeatmap`s fasta drawer-paneler går sönder om den hamnar i ett `will-change:transform`-sammanhang (redan kommenterat i koden vid dagens användning). Flikväxlingen får därför inte animeras med transform/slide.

---

## Arkitektur

### 1. Ny komponent — `components/showcase/RoleTabs.tsx`

Liten, presentationell klientkomponent. Ingen egen affärslogik — en ren UI-primitiv för "två paneler, en synlig åt gången", återanvändbar om fler roll-jämförelser behövs senare i decket eller på andra sidor.

```ts
type Tab = { id: string; label: string; panel: React.ReactNode };
function RoleTabs({ tabs, defaultId }: { tabs: Tab[]; defaultId?: string }): JSX.Element
```

- Rendermönster: `role="tablist"` med två `role="tab"`-knappar (pill-stil, aktiv = `bg-ink text-canvas`, inaktiv = `bg-surface text-ink-muted`), `aria-selected`, `aria-controls`/`id`-koppling till en `role="tabpanel"`.
- Tangentbord: vänster/höger pil växlar mellan flikar (standard ARIA tabs-mönster), `Home`/`End` till första/sista.
- Växling sker via **villkorlig rendering** (`{active === tab.id && tab.panel}`) — ingen CSS-transform, ingen `<Reveal>`-wrapper runt hela blocket. Enkel, omedelbar visa/dölj.
- Ingen `lang`-hantering i sig — etiketterna ("Eleven"/"Läraren") skickas in som redan översatta strängar från anropande kod.

### 2. `InvestorChatDemo.tsx` — ny `seeded`-prop

```diff
- export default function InvestorChatDemo({ lang }: { lang: Lang }) {
+ export default function InvestorChatDemo({ lang, seeded = true }: { lang: Lang; seeded?: boolean }) {
    const [messages, setMessages] = useState<Msg[]>(() =>
-     DEMO_SEED.map((m) => ({ ... })),
+     seeded ? DEMO_SEED.map((m) => ({ ... })) : [],
    );
    ...
-   <p className="mt-2 text-sm text-ink-secondary">{t(lang, CHAT_UI.lede)}</p>
+   <p className="mt-2 text-sm text-ink-secondary">{t(lang, seeded ? CHAT_UI.lede : CHAT_UI.ledeEmpty)}</p>
```

Default `seeded = true` betyder §4:s befintliga anrop (`<InvestorChatDemo lang={lang} />`) är **helt oförändrat** i beteende — bara §6:s nya anrop skickar `seeded={false}`. Resten av komponenten (fetch-logik, förslagschips, felhantering) är identisk och delad.

Ny sträng i `demo-transcript.ts`:
```ts
CHAT_UI.ledeEmpty: {
  sv: 'Ställ en fråga om Ekologi-lektionen — eller prova ett förslag nedan.',
  en: 'Ask a question about the Ecology lesson — or try a suggestion below.',
}
```

### 3. `InsightHeatmap` i lärar-fliken

Ingen kodändring i själva komponenten. Samma `<InsightHeatmap insight={DEMO_LESSON_INSIGHT} aiInsight={DEMO_AI_INSIGHT} />` som idag, samma "Elevante · Lärarvy · Live-demo"-inramning — flyttas bara in i `RoleTabs`s andra panel, nu fullbredd istället för halvbredd i en grid.

**Känt, ej i scope:** `InsightHeatmap` har hårdkodade svenska UI-strängar (t.ex. "Insikt", tomt-läge-texten) eftersom den riktiga produktkomponenten inte har språkstöd — det gäller redan idag på EN-sidan, blir bara mer synligt när komponenten får mer utrymme. Att göra produktkomponenten tvåspråkig är en större, separat uppgift utanför denna spec.

### 4. `content.ts` — copy-ändringar

- `COPY.product.cols[].rows`: krymps från 3 fulla meningar/roll till 2–3 korta punkter/roll (samma sakinnehåll, kortare formulering).
- Nya strängar: flik-etiketter ("Eleven"/"Läraren" — språkneutrala egentligen, men körs genom `t()` för konsekvens), en kort kopplande rad under panelen: *"Samma lektion — sett från två håll."* / *"Same lesson — seen from two sides."*
- `COPY.product.source` (källraden) lämnas oförändrad — fortfarande korrekt.

### 5. `InvestorDeck.tsx` §6 — ny sammansättning

Ersätter dagens block (rad ~268–320: två-kolumns-grid + `ZoomableShot` + fristående `InsightHeatmap`-wrapper) med:

1. Kort punktsammanfattning (två kompakta spalter, samma `md:grid-cols-2` som idag men kortare text).
2. `<RoleTabs>` med `defaultId="elev"`:
   - Elev-panel: `<InvestorChatDemo lang={lang} seeded={false} />`
   - Lärare-panel: dagens `InsightHeatmap`-block, oförändrat inuti, bara flyttat.
3. Kopplande textrad.
4. Källrad (oförändrad).

`shotElev`-importen tas bort om den inte används på annat håll i filen (verifieras vid implementation).

---

## Vad som INTE ändras

- Lösenordsgaten (`INVESTOR_DECK_SECRET`, `verifySession`, `proxy.ts`) — helt orörd.
- Telemetri/spårning (`DeckTelemetry`, `record_investor_open`, Notion-rollup) — helt orörd.
- `/api/investerare/demo-chat`-routen och `answerWithRag` — ingen ändring, samma backend-anrop som §4 redan gör.
- §4 SOLUTION i sin helhet — `InvestorChatDemo` där renderas med default-props, identiskt beteende som idag.
- Alla andra sektioner i decket (§1–§5, §7–§19).

---

## Testning / verifiering vid implementation

- Bygg + typkontroll (`tsc --noEmit`) för hela `apps/web`.
- Manuell verifiering i webbläsare (lokal dev-server, testad investerarsession):
  - Flikväxling fungerar, tangentbordsnavigering fungerar (pil vänster/höger).
  - Elev-fliken startar tom, förslagschips fungerar, riktigt fetch-anrop går igenom, citat visas.
  - Lärar-fliken renderar identiskt med dagens §6 (samma data, samma klickbara drawers) — inga brustna fasta paneler vid flikväxling (verifierar `will-change`-fällan inte återkommit).
  - Samma test på både `/investerare` (sv) och `/investerare/en`.
  - §4 fungerar exakt som innan (regressionstest — `seeded`-defaulten).
