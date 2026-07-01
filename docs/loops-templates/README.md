# Loops-mallar — Elevante

Fyra transactional-mallar för Loops.io, on-brand med elevante.se (Editorial Calm:
ivory `#faf7f2`, ink `#1a1a2e`, accent `#4f7fff`, coral `#ff7a6b`, sage-deep
`#566b47`, sand-border `#e8dcc4`; Newsreader-serif rubriker med Georgia-fallback,
system-sans brödtext).

## Så här lägger du in dem i Loops

1. Loops → **Transactional** → **Create** för varje mall nedan.
2. Öppna malls **kod-/HTML-läge** och klistra in hela filen.
3. Lägg till mallens **datavariabler** (exakt de namn som listas — skiftlägeskänsligt).
4. Sätt **ämnesraden** (får innehålla variabler, t.ex. `{{schoolName}}`).
5. Sätt **Reply-To** enligt kolumnen nedan.
6. Kopiera mallens **Transactional ID** → in i Vercel-env-variabeln.

> **Merge-syntax:** filerna använder `{{variabelnamn}}`. Loops visar samma dubbla
> klammer när du lägger till en datavariabel — bekräfta att namnen matchar exakt.
> Skicka ett testmejl från Loops (fliken "Send test") och se att variablerna
> fylls i innan du kopplar in ID:t.

## Mallarna

| Fil | Vercel-env | Datavariabler | Reply-To | Ämnesrad (förslag) |
|-----|-----------|---------------|----------|--------------------|
| `1-skol-kontaktmejl.html` | `LOOPS_SKOL_KONTAKT_ID` | `schoolName`, `ort` (valfri) | din adress (fast, t.ex. john@elevante.se) | Låt eleverna på {{schoolName}} minnas varje lektion |
| `2-lead-notis.html` | `LOOPS_LEAD_NOTIS_ID` | `schoolName`, `students`, `leadEmail`, `message`, `replyToAddress` | `{{replyToAddress}}` | Ny intresseanmälan: {{schoolName}} ({{students}} elever) |
| `3-kontakt-notis.html` | `LOOPS_KONTAKT_NOTIS_ID` | `name`, `email`, `school`, `topic`, `message`, `replyToAddress` | `{{replyToAddress}}` | Nytt kontaktmeddelande: {{topic}} – {{name}} |
| `4-investerar-notis.html` | `LOOPS_INVESTOR_NOTIS_ID` | `headline`, `investor`, `locale` (valfri), `maxScroll` (valfri) | — | Investerardeck · {{headline}} |

**Mall 1** är den enda utåtriktade (går till skolan) — släpps manuellt via
"Skicka kontaktmejl" i admin-CRM:et. De övriga tre är interna notiser till dig.

Markera valfria variabler som **Optional** i Loops så att tomma värden (`ort`,
`locale`, `maxScroll`) inte fäller sändningen.

## Efter att alla fyra ID:n är kopierade

Sätt i Vercel (Production + Preview): `LOOPS_API_KEY` + de fyra `*_ID`-ovan.
Bygg sedan loopen `event: intresseanmalan → bekräftelsemejl` i Loops UI (separat
bekräftelse till skolan som lämnat en lead — egen copy i Loops, ingen mall här).
