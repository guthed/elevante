# Loops-mallar — Elevante

Fyra transactional-mallar för Loops.io, on-brand med elevante.se (Editorial Calm:
ivory `#faf7f2`, ink `#1a1a2e`, accent `#4f7fff`, coral `#ff7a6b`, sage-deep
`#566b47`, sand-border `#e8dcc4`; Newsreader-serif rubriker med Georgia-fallback,
system-sans brödtext).

## Två vägar att skapa mallarna

### A) Automatiskt via API (rekommenderas)
`scripts/loops-create-templates.mjs` skapar/uppdaterar och publicerar alla fyra
mallarna via Loops API:t, från LMX-källorna i `lmx/`, och skriver ut env-raderna
med mall-ID:na. Idempotent — matchar på namn, skapar inga dubbletter.

1. Lägg `LOOPS_API_KEY=loops_xxx` i `apps/web/.env.local` (nyckeln finns i Loops
   → Settings → API). Filen är gitignore:ad.
2. Kör från repo-roten: `node scripts/loops-create-templates.mjs`
3. Klistra in de utskrivna `LOOPS_*_ID`-raderna i `apps/web/.env.local` och i Vercel.

> LMX är Loops eget format (`lmx/*.lmx`). HTML-filerna i den här mappen är kvar
> som **visuell referens** — de renderas i förhandsvisning men används inte av
> scriptet. Ändra du designen: uppdatera `.lmx`-filen och kör om scriptet.

### B) Manuellt i Loops UI
Loops → Transactional → Create → klistra in `lmx/<fil>.lmx` i kod-läget, sätt
ämnesrad + datavariabler, publicera, kopiera Transactional ID.

> **Merge-syntax i LMX:** `{data.variabelnamn}` (t.ex. `{data.schoolName}`).
> Skicka ett testmejl från Loops ("Send test") och se att variablerna fylls i
> innan du kopplar in ID:t.

### Reply-To (svar rakt till avsändaren)
För notismallarna (2 och 3): sätt fältet **Reply-To** i Loops-editorn till
datavariabeln `replyToAddress`. API:t sätter subject/from/innehåll men Reply-To
som dynamisk variabel togglas i UI:t — en 10-sekunders efterjustering per mall.

## Mallarna

| LMX-källa | Vercel-env | Datavariabler | Reply-To | Ämnesrad (sätts av scriptet) |
|-----------|-----------|---------------|----------|------------------------------|
| `lmx/1-skol-kontaktmejl.lmx` | `LOOPS_SKOL_KONTAKT_ID` | `schoolName`, `ort` (valfri) | din adress (fast, t.ex. john@elevante.se) | Låt eleverna på {data.schoolName} minnas varje lektion |
| `lmx/2-lead-notis.lmx` | `LOOPS_LEAD_NOTIS_ID` | `schoolName`, `students`, `leadEmail`, `message`, `replyToAddress` | `replyToAddress` | Ny intresseanmälan: {data.schoolName} ({data.students} elever) |
| `lmx/3-kontakt-notis.lmx` | `LOOPS_KONTAKT_NOTIS_ID` | `name`, `email`, `school`, `topic`, `message`, `replyToAddress` | `replyToAddress` | Nytt kontaktmeddelande: {data.topic} – {data.name} |
| `lmx/4-investerar-notis.lmx` | `LOOPS_INVESTOR_NOTIS_ID` | `headline`, `investor`, `locale` (valfri), `maxScroll` (valfri) | — | Investerardeck · {data.headline} |

**Mall 1** är den enda utåtriktade (går till skolan) — släpps manuellt via
"Skicka kontaktmejl" i admin-CRM:et. De övriga tre är interna notiser till dig.

Markera valfria variabler som **Optional** i Loops så att tomma värden (`ort`,
`locale`, `maxScroll`) inte fäller sändningen.

## Efter att alla fyra ID:n är kopierade

Sätt i Vercel (Production + Preview): `LOOPS_API_KEY` + de fyra `*_ID`-ovan.
Bygg sedan loopen `event: intresseanmalan → bekräftelsemejl` i Loops UI (separat
bekräftelse till skolan som lämnat en lead — egen copy i Loops, ingen mall här).
