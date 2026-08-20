# Elevrapportering — design

Piloten med Amerikanska Gymnasiet startar vecka 34 2026. Syftet är att elever
ska testa och rapportera **vad de inte gillar, inte förstår eller inte får att
fungera**. Det finns idag ingen väg för dem att göra det i appen.

Lärarna har redan ett Notion-formulär (databasen `💬 Elevante – Lärarfeedback`,
processen beskriven i Notion-sidan "Feedback – så funkar det"). Det här är
elevernas motsvarighet — men byggd i appen, inte som ett formulär.

## Den bärande idén

**Läraren fyller i var i flödet något hände. Eleven behöver inte — appen vet
redan.** När en elev trycker på knappen mitt i ett flashcard känner appen till
lektionen, kortet, konceptet, kursen, klassen och sidan. Det är den mest
värdefulla delen av en rapport, och den är gratis.

Därför bidrar eleven med **en** sak: ett av tre val, plus valfri fritext.
Resten bifogas automatiskt. Mål: under tio sekunder, mot lärarnas 20–60.

Lärarnas princip gäller även här: *hellre 10 korta inputs än 1 lång rapport.*

## Beslut

1. **Tre val i elevspråk**, inte vår triagevokabulär:
   `Något fungerar inte` · `Jag förstår inte hur jag gör` · `Något ser konstigt ut`
   Fritext är valfri — en rapport får bestå av bara ett tryck.

   **Rapporten handlar om APPEN, inte om ämnet.** Bladet inleds därför med:
   *"Det här handlar om appen — inte om ämnet. Undrar du något om lektionen,
   fråga Elevante i stället."* Utan den ramen blir databasen en läxhjälpskanal
   och du får läsa 90 elevers biologifrågor i stället för produktfeedback.
   Meningen avvisar inte eleven utan pekar vidare till chatten — en felriktad
   rapport blir en funktionsupptäckt.

   Gränsdragning: `Något ser konstigt ut` fångar fortfarande **felaktigt
   AI-genererat innehåll** (ett flashcard som påstår fel sak). Det är innehåll,
   men innehåll Elevante skapat — alltså ett produktfel som ska rapporteras.
   Skillnaden mot läxhjälp är vem som gjort felet, inte om det rör ämnet.
2. **Knappen finns i hela appen** (topbar), plus tydligare i flashcard- och
   kunskapskollvyerna där problemen troligast uppstår. **Inte** flytande nere
   till höger: den zonen krockar med bottennavigeringen på mobil, där vi precis
   fixat att innehåll klipptes bakom navigeringen.
3. **Pseudonymt i Notion.** Notion är US-baserat, och det här är minderåriga i
   en pilot med PUB-avtal. Namn och mejl stannar i Supabase (EU). Notion får
   klass, skola, lektion, kontext och en ogenomskinlig `Elevreferens`. Vill man
   veta vem som rapporterat slår man upp referensen i appen.
4. **Supabase är sanningen, Notion är arbetsytan.** Raden skrivs till Supabase
   först, synkas sedan till Notion via `after()`, best-effort. Samma mönster som
   `/try`-delningen — där Notion-loggningen föll tyst och data höll på att
   tappas. Under piloten är det den enda veckan feedbacken verkligen räknas.
5. **Egen Notion-databas**, inte lärarnas. 60–90 elever mot 3–5 lärare skulle
   dränka lärarrapporterna i samma vy.

## Notion-databasen — redan skapad och verifierad

`💬 Elevante – Elevfeedback`
`https://app.notion.com/p/f8255a60a83a45e88abefd65a40efd78`
data source: `d768f1eb-123b-4ebc-849e-b3ab0903a3b7`

| Fält | Typ | Fylls av |
|---|---|---|
| Rubrik | title | Appen (kategori + lektion) |
| Vad eleven skrev | text | Eleven, valfritt |
| Eleven valde | select | Eleven |
| Var i appen | select | Appen |
| Klass, Skola, Lektion, Kontext | text | Appen |
| Elevreferens | text | Appen (ogenomskinligt id) |
| Typ, Allvar | select | Triage — samma värden som Lärarfeedback |
| Status | select | Triage — Ny → Triagerad → Pågår → Fixad/Avfärdad |

`Status` blev ett vanligt select, inte Notions `status`-typ: API:t kan bara
skapa den senare med standardvärdena (Inte påbörjad/Pågår/Klar). Funktionellt
likvärdigt, men utan den inbyggda grupperingen.

**Verifierat 2026-08-18** med en riktig skrivning via `NOTION_TOKEN`: HTTP 200,
alla fält accepterade.

## Tre Notion-identiteter — fällan att komma ihåg

Det finns tre olika Notion-identiteter i det här projektet, och de förväxlas lätt:

1. **Notion-kopplingen i Claude** (OAuth) — skapade databasen.
2. **"Claude sync"** — lokala `NOTION_TOKEN` i `.env.local`. Användes för
   verifieringen ovan.
3. **"Elevante leads"** — den prod-appen skriver via.

En ny databas måste kopplas **manuellt** till varje integration som ska nå den;
det går inte via API. Båda relevanta är kopplade sedan 2026-08-18. Missas det
får appen 404 och skrivningen faller tyst — precis det som hände
delningsloggen tidigare.

## Datamodell

Ny tabell `feedback_reports`:

```
id, school_id, student_id (fk profiles), category, message,
surface, lesson_id, context jsonb, notion_page_id, created_at
```

RLS: eleven får INSERT på egna rader; lärare/admin i samma skola får SELECT.
Eleven ska inte kunna läsa andras rapporter.

`Elevreferens` härleds deterministiskt ur `student_id` (kort hash) så att samma
elev får samma referens över tid — annars går mönster inte att se i Notion.

## Ute ur scope

- Skärmdumpar (lärarnas formulär har det; kräver Storage-upload och en
  bildhanteringskedja vi inte behöver för att komma igång)
- Lärarrapportering i appen — de har sitt Notion-formulär och en fungerande vana
- Svar tillbaka till eleven i appen — uppföljning sker via läraren under piloten
- AI-förslag på Typ/Allvar — mer maskineri än värde vid den här volymen
