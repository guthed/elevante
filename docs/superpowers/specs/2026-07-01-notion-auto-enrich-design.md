# Notion auto-berikning + AI-brief-fix + kontaktmejl

**Datum:** 2026-07-01
**Status:** Godkänd design (via brainstorm), redo för implementationsplan

## Sammanfattning

Idag måste en skola berikas via appens Synka-knapp. Teamet vill istället kunna
**lägga till en rad i Notion med bara skolans namn och få den automatiskt ifylld**
med all data vi hittar i Skolverket — utan att lämna Notion.

Samtidigt två innehållsfixar: (1) `AI-brief` ska vara en *faktasammanfattning* av
skolan (inte ett mejl — den blev fel för Vasa Real), och (2) en ny kolumn
`Kontaktmail` med ett färdigskrivet kontaktmejl, signerat med kortets Owner.

## Beslut som ligger fast

| Beslut | Val |
|--------|-----|
| Trigger | Notion-automation **"när `Ägare` sätts/ändras"** → webhook → vår endpoint (noll klick). Fallback: "Berika"-knapp om planen saknar webhook-automationer |
| Ägar-fält | Befintliga `Owner` (persontyp) **döps om till `Ägare`**. Att sätta `Ägare` ÄR triggern → fältet är alltid ifyllt vid berikning |
| Namnmatchning | Exakt, skiftlägesokänslig, mot `school-units.json` (alla 6 652). 1 träff → berika. 0/flera → `Synkstatus='Behöver kollas'` + kandidater i Anteckningar |
| `AI-brief` | Faktasammanfattning (aldrig mejl-format). Prompten stramas åt |
| `Kontaktmail` | Ny kolumn. Färdigt kontaktmejl, kort/varmt/du-tilltal, **signerat med `Ägare`** |
| Signatur | `Ägare`-namnet upplöses via Notion users-API vid berikning. Alltid närvarande (det är triggern). Defensiv fallback `[Ditt namn]` om det mot förmodan är tomt |
| Brief + mejl skrivs | **En gång** vid första berikningen, blir sedan användarens. Nattkörningen uppdaterar bara fakta, aldrig brief/mejl |

## Dataflöde

1. Du/Stefan skapar rad i *Intresseanmälningar*, skriver namnet i **Skola**, och
   **sätter `Ägare`** (det sista steget — det är detta som utlöser berikningen).
2. Notion-automation ("`Ägare` satt/ändrad") POST:ar en webhook till
   `POST /api/notion/enrich-prospect?token=<NOTION_ENRICH_TOKEN>`.
3. Endpointen:
   a. Verifierar token (401 annars).
   b. Läser page-id ur payloaden; **hämtar sedan hela sidan via Notion-API** (robust
      mot payload-variation) → `Skola` (namn), `Ägare`, `Synkstatus`.
   c. Om `Synkstatus` redan är satt → hoppar (idempotent, loop-skydd).
   d. Matchar namnet mot datasetet:
      - **1 träff** → hämtar `fetchSchoolFacts` + `fetchPupilCount` + `generateSchoolBrief`
        + `generateContactEmail(…, ownerName)` → patchar den befintliga raden med
        fakta + Skolenhetskod + `Datakälla='Admin-sök'` + `Synkstatus='OK'` + brief +
        Kontaktmail. Spårar i Supabase (`school_prospects`, `notion_page_id`=raden).
      - **0 / >1 träffar** → `Synkstatus='Behöver kollas'`; skriver kandidatlistan
        (namn + kommun) i `Anteckningar` så användaren kan förtydliga namnet.
4. Klart på några sekunder. `Ägare`-namnet i signaturen upplöses via Notion users-API.

## Komponenter

| Fil | Ändring |
|-----|---------|
| `apps/web/lib/campaign-brief.ts` | Strama `generateSchoolBrief`-prompten (saklig sammanfattning, förbjud hälsnings-/mejlformat). Ny `generateContactEmail(input, ownerName)` |
| `apps/web/lib/notion.ts` | Ny `Kontaktmail` i skrivningen; dela "genererat innehåll" (brief+mejl) från "fakta" så brief/mejl bara skrivs vid första berikningen (`writeGenerated`-flagga till `upsertNotionProspect`). Ny helper `getPageForEnrichment(pageId)` (läser Skola/Ägare/Synkstatus) + `resolveNotionUserName(userId)` |
| `apps/web/lib/prospects.ts` | `syncProspect` genererar + cachar kontaktmejl (`contact_email_draft`); skickar `writeGenerated=true` bara när brief/mejl nygenererats. Ny `enrichNotionRowByName(pageId, name, ownerName)` |
| `apps/web/app/api/notion/enrich-prospect/route.ts` | Ny POST-endpoint (token-skyddad) |
| `supabase/migrations/<ts>_contact_email.sql` | `school_prospects.contact_email_draft text` |
| `apps/web/lib/supabase/database.ts` | Typ för nya kolumnen |
| Notion (via MCP + UI) | Döp om `Owner` → `Ägare` + skapa property `Kontaktmail` (rich_text) via MCP; automation "`Ägare` satt → webhook" konfigureras i Notion-UI (jag ger stegen) |

## AI-innehåll

**`generateSchoolBrief` (fixad):** system-prompt omformuleras till "skriv en kort,
saklig **beskrivning av skolan** på svenska, 2–3 meningar. Detta är en intern
faktasammanfattning — INTE ett mejl, inga hälsningsfraser. Lyft storlek, huvudman,
inriktning." Använd bara givna fakta.

**`generateContactEmail(input, ownerName)` (ny):** kort, varmt kontaktmejl på svenska,
du-tilltal, en mening om varför Elevante passar just den skolan (baserat på profil) +
mjuk CTA till ett kort samtal. Avslutas `Vänliga hälsningar,\n{ownerName ?? '[Ditt namn]'}`.
Bara givna fakta — hitta inget på.

## Icke-destruktivitet (oförändrad princip)

Berikningen skriver aldrig `Status`/`Ägare`/`Anteckningar`* /`Nästa steg`/
`Senast kontaktad`/`Kontaktväg`. (*Anteckningar skrivs bara i "Behöver kollas"-fallet,
med kandidatlista — aldrig när berikning lyckas.) Brief + Kontaktmail skrivs en gång
och rörs sedan inte av nattkörningen.

## Säkerhet / drift

- Endpoint skyddad av `NOTION_ENRICH_TOKEN` (i URL:en, eftersom Notion-webhookens
  headers är begränsade). 401 vid fel/saknad token.
- Idempotent: berikar bara rader där `Synkstatus` är tom.
- Loop-skydd: automationen triggar på ändring av `Ägare`; berikningen skriver aldrig
  `Ägare` → den re-triggar inte sig själv (utöver idempotensen ovan).
- Skolverket/Claude/Notion-fel fångas per rad; vid fel sätts `Synkstatus='Fel'`.

## Beroenden att verifiera vid implementation

- Att Notion-planen stödjer webhook-automationer. Om inte → "Berika"-knapp (samma
  endpoint), ett klick istället för noll.
- Exakt payload-form från Notion "send webhook" — därför läser endpointen sidan via
  API:t utifrån page-id istället för att lita på payloadens propertyshape.
- Att integrationen kan läsa användarnamn (`GET /v1/users/{id}`) för signaturen.

## Retroaktiv fix

Efter bygget: re-berika **Vasa Real** → `AI-brief` blir en riktig sammanfattning och
`Kontaktmail` fylls i. (Samskolan/Anna Whitlock har redan korrekta briefer; de får
Kontaktmail vid nästa berikning eller kan re-berikas manuellt.)

## Utanför scope (YAGNI)

- Trigger på rad-tillägg (ersatt av trigger på `Ägare` satt — löser signaturen elegant,
  ingen separat signatur-automation behövs).
- Fuzzy/AI-namnmatchning (exakt matchning räcker; tvetydigt → Behöver kollas).
- Regenerering av brief/mejl vid faktauppdatering (skrivs en gång, blir användarens).
