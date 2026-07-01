# Skol-CRM: Notion som CRM för skolenheter + Skolverket-sync

**Datum:** 2026-07-01
**Status:** Godkänd design, redo för implementationsplan

## Sammanfattning

Vi vidareutvecklar det befintliga *inbound*-kampanjsystemet (skolor slår upp sig
själva i priskalkylatorn → berikas → AI-brief → Notion) till ett **enat CRM** som
också stödjer *outbound* prospektering: en admin söker fram valfri skolenhet,
synkar den till Notion och jobbar pipeline/owner/nästa steg där.

**Grundprincip (från CLAUDE.md, oförändrad):** Notion är Single Source of Truth
för CRM-data (Pipeline, Owner, anteckningar). Supabase `school_prospects` är en
maskin-cache. Skolverkets planned-educations v3 är faktakällan. **Maskin-synken
skriver aldrig över manuellt hanterade CRM-fält.**

## Beslut som ligger fast

| Beslut | Val | Motivering |
|--------|-----|-----------|
| Relation till befintligt | Evolvera det befintliga (ett system) | Inbound + outbound delar tabell och Notion-DB |
| Sök-scope | Alla skolformer | Inte bara gymnasium |
| Datakälla | Endast planned-educations **v3** | Redan integrerad + fältverifierad; täcker både sök och fakta. **Skolenhetsregistret v2 kopplas INTE in.** |
| Admin-UI:s plats | Befintliga admin-området | Ny `crm`-flik under `app/[locale]/app/[role]/` |
| Batch/cron | Byggs nu | Nattlig Vercel-cron |
| Notion-fältnamn | Behålls som de är | **Inget `[SKV]`-prefix.** Vi dokumenterar istället vilka fält som är maskinstyrda |

## Verifierade API-fakta (2026-07-01)

- `GET planned-educations/v3/school-units` listar **alla** skolformer (~6 650
  enheter), paginerat. Varje post: `code`, `name`, `geographicalAreaCode`
  (kommunkod), `typeOfSchooling[]` (skolform: `code` + `displayName`, t.ex.
  `gy`/Gymnasieskola, `gran`/Anpassad grundskola), `principalOrganizerType`.
- **Ingen fritextsök-parameter** på list-endpointen → sökning sker som filtrering
  av ett cachat dataset, inte som API-anrop per tangenttryck.
- Elevantal är skolforms-specifikt (`/statistics/gy` idag). För andra skolformer
  varierar endpointen → elevantal blir **best-effort per skolform**.

## Datamodell

### Supabase: `school_prospects` (ny migration, additivt)

Nya kolumner:
- `skolform text[]` — skolformer från `typeOfSchooling`
- `created_via text` — `inbound_lookup` | `admin_search` | `batch`
- `last_synced_at timestamptz`
- `sync_status text` — `ok` | `error` | `needs_check`
- `sync_error text`

**Inga CRM-fält i Supabase** — Pipeline/Owner/anteckningar bor bara i Notion.
Befintliga `enrichment_status`, `notion_page_id`, kontakt- och faktakolumner
behålls oförändrade.

### Supabase: `school_sync_log` (ny tabell, ops-logg)

`id`, `school_unit_code`, `status`, `duration_ms`, `error`, `synced_at`.
Global tabell, service role skriver, admin läser (RLS som `school_prospects`).

### Notion "leads"-DB → CRM

Nya properties (måste finnas i DB:n innan koden kan skriva dem — se Setup):
- **Nyckel/ops:** `Skolenhetskod` (text, synknyckel), `Skolform` (multi-select),
  `Synkstatus` (status: `OK`/`Fel`/`Behöver kollas`), `Senast synkad` (date),
  `Datakälla` (select)
- **CRM (manuellt, SSoT):** `Pipeline` (`Ej kontaktad`→`Kontaktad`→`Möte`→
  `Pilot-intresse`→`Pilot`→`Nej`), `Owner` (person), `Senast kontaktad` (date),
  `Kontaktväg` (multi-select), `Anteckningar` (text), `Nästa steg` (text)

Befintliga maskin-props (Skola, Kommun, Huvudman, Antal elever, Uppskattat pris,
Telefon, E-post, Adress, AI-brief, Antal uppslag, Först/Senast sedd) **behålls med
nuvarande namn**. Den befintliga `Status` (Ny/Kontaktuppgift lämnad) ersätts inte
av Pipeline utan flyttas till maskinfältet `Lead-status` (se nedan).

## Icke-destruktiv Notion-sync (kärnan)

`lib/notion.ts` delas i **maskin-props** och **CRM-props**:

- **Create** (ny sida): maskinfält + `Pipeline = 'Ej kontaktad'` + `Synkstatus=OK`
  + `Senast synkad=now` + `Datakälla`.
- **Update** (befintlig sida): skriver **endast** maskin-/ops-fält. Pipeline,
  Owner, Senast kontaktad, Kontaktväg, Anteckningar, Nästa steg rörs **aldrig**.
- Inbound-signalen "skola lämnade kontaktuppgift" flyttas från `Status` till ett
  maskinfält `Lead-status` (Ny / Kontaktuppgift lämnad) så den aldrig skriver över
  den manuella pipelinen.
- **Upsert-koppling:** primärt via `notion_page_id` i Supabase (befintligt, robust).
  Ny fallback `queryNotionProspectByCode(code)` för sidor vi inte känner till (t.ex.
  cron): 0 träffar → create, 1 → update, >1 → `Synkstatus=Behöver kollas` + logg,
  ingen skrivning.

## Komponenter

| Fil | Ändring |
|-----|---------|
| `scripts/fetch-schools.ts` | Ta bort `typeOfSchooling=gy`-filtret; skriv `{code, name, kommun, skolform[]}` för alla enheter |
| `lib/data/schools.json` | Regenereras till alla skolformer |
| `lib/skolverket.ts` | Ny `searchSchoolUnits(query, {skolform?, kommun?})` (server-side över datasetet); generalisera elevantal → `fetchPupilCount(code, skolform)`; lägg till timeout + en retry med backoff i fetch-hjälparna |
| `lib/notion.ts` | Dela maskin-/CRM-props; icke-destruktiv update; `queryNotionProspectByCode`; `queryPrioritizedProspects` (Pipeline ≠ Nej) för cron |
| `app/actions/crm.ts` | Nya Server Actions (admin-gated, Zod): `searchSchoolUnits`, `syncSchoolUnit(code)` |
| `app/actions/campaign.ts` | Inbound-flödet sätter nu `skolform` + `created_via='inbound_lookup'`; Notion-skrivning blir icke-destruktiv (via delad `lib/notion.ts`) |
| `app/[locale]/app/[role]/crm/page.tsx` | Ny admin-CRM-vy (admin-role-guard som övriga admin-sidor) |
| `components/app/admin/*` | Sökruta + resultat + Synka-knapp; tabell över synkade prospekt med Synkstatus + länk till Notion + Re-synka |
| `app/api/cron/sync-prospects/route.ts` | Nattlig batch |
| `vercel.json` / `vercel.ts` | `crons`-entry (arn1/Stockholm) |
| `supabase/migrations/<ts>_school_crm.sql` | Kolumner + `school_sync_log` |

## Dataflöden

**Outbound (nytt):**
1. Admin söker → `searchSchoolUnits` returnerar träffar (kod/namn/kommun/skolform).
2. Admin klickar **Synka** → `syncSchoolUnit(code)`: berika via v3 → upsert
   `school_prospects` (`created_via='admin_search'`) → icke-destruktiv Notion-upsert
   → spara `notion_page_id` + `sync_status` + `last_synced_at`.

**Inbound (befintligt, justerat):**
Priskalkylatorn oförändrad för användaren. Berikning sätter nu även `skolform`
och `created_via='inbound_lookup'`; Notion-skrivning är icke-destruktiv.

**Cron (nytt, nattligt):**
Query Notion `Pipeline ≠ Nej` → för varje: berika via v3 → PATCH endast maskinfält
→ logga `school_sync_log` + uppdatera `sync_status`. Sekventiellt/strypt (~3 req/s
mot Notion), retry+backoff mot Skolverket.

## Felhantering / drift

- **Skolverket:** timeout + en retry med backoff; mjuk fallback till `null`
  (befintligt mönster).
- **Notion:** per-sida try/catch; vid fel `Synkstatus=Fel` + `sync_error` sparas;
  batch strypt för att inte slå i rate limit.
- **Dubbletter:** >1 Notion-sida för samma kod → `Synkstatus=Behöver kollas` +
  logg, ingen skrivning.
- **QA-krav:** Zod på de nya Server Actions; inga hårdkodade strängar i UI (t());
  WCAG AA; admin-role-guard på CRM-sidan.

## Setup-beroende

De nya Notion-propertyna måste finnas i databasen **innan** koden kan skriva dem.
Skapas antingen via Notion MCP (om integrationens token har schema-åtkomst) eller
manuellt i Notion-gränssnittet (~5 min). Avgörs i implementationsfasen.

## Utanför scope (YAGNI)

- Skolenhetsregistret v2 som andra datakälla.
- `[SKV]`-prefix på Notion-fält.
- CRM-fält speglade i Supabase.
- Separat `Huvudmän`-databas (account-baserat) — kan bli egen spec senare.
