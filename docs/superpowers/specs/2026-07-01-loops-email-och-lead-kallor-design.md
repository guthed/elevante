# Loops.io som mejlmotor + separerade lead-källor

Datum: 2026-07-01
Status: Godkänd design, redo för implementationsplan

## Sammanfattning

Byt e-postutskicket i webbappen från Resend till Loops.io, och koppla **alla**
intresseanmälningar till CRM:et (Notion via `school_prospects`) med en tydlig,
distinkt källa per ingång. Tre inkommande flöden ska vara separerbara i Notion
så vi alltid vet varifrån frågan kom.

Icke-mål: ändra elevens/lärarens produktflöden, röra elevdata, bygga ut Loops
automationer i kod (loopar byggs i Loops UI), eller deduplicera kontaktformulär-
poster mot Skolverket-kodade rader.

## De tre inkommande flödena

| Typ | Ingång | Fångar | `created_via` | Notion `Datakälla` |
|-----|--------|--------|---------------|--------------------|
| 1 – Skoluppslag | Prisberäknaren på `/[locale]/vad-kostar-elevante` (`PriceEstimator` → `getSchoolEstimate`) | Skola + elevantal + pris, **ingen** personlig mejl | `school_lookup` | Skoluppslag |
| 2 – Prisberäknar-lead | Lead-formuläret i samma widget (`submitCampaignLead`) | Personens mejl + meddelande | `price_lead` | Prisberäknare-lead |
| 3 – Kontaktformulär | `/[locale]/kontakt` (`ContactForm` → `sendContact`), **endast** `topic` = `demo`/`pricing` | Fritext-skola, personens mejl, meddelande | `contact_form` | Kontaktformulär |

Utgående/oförändrade källor: `admin_search` → **Prospektering** (vi letar
själva upp skolor att kontakta — bytt från "Admin-sök"), `batch` → Batch.
`created_via`-koden `admin_search` behålls för stabilitet; bara Notion-etiketten
byter namn. Befintliga rader med "Admin-sök" i Notion lämnas orörda tills de
re-synkas.

Regel för källprioritet: en inkommen **lead** (`price_lead`, `contact_form`)
väger tyngre än ett bart **uppslag** (`school_lookup`). Eftersom Typ 1 och Typ 2
delar samma prospect-rad (nyckel `school_unit_code`) och `syncProspect` idag
sätter `created_via` bara vid första insert (`ignoreDuplicates: true`), måste
lead-flödet **explicit uppdatera** `created_via` till `price_lead` när en lead
kommer in — annars fastnar raden på "Skoluppslag".

## Ny modul: `lib/loops.ts` (server-only)

Tunn klient mot Loops REST-API med rå `fetch` + timeout, samma mönster som
`lib/skolverket.ts`. Ingen ny npm-dependency.

Funktioner:
- `upsertLoopsContact(email, props)` — skapar/uppdaterar kontakt (POST
  `/v1/contacts/update`).
- `sendLoopsEvent(email, eventName, props)` — triggar Loops-loopar (POST
  `/v1/events/send`).
- `sendLoopsTransactional(transactionalId, email, dataVariables)` — statisk mall
  (POST `/v1/transactional`).

Graceful fallback: saknas `LOOPS_API_KEY` loggas payloaden till konsolen och
funktionen returnerar tyst — exakt som Resend-fallbacken idag. Alla anrop är
fire-and-forget; ett Loops-fel får **aldrig** fälla ett formulärsvar. Persistens
till Supabase/Notion sker alltid **först**, mejl är sekundära.

## Flöde Typ 1 — statiskt kontaktmejl till skolan, släppt från CRM

Uppslaget (`getSchoolEstimate`) är oförändrat i beteende men byter
`createdVia` till `school_lookup`. Nytt: **du släpper mejlet manuellt från
admin-CRM:et.**

- Ny knapp "Skicka kontaktmejl" i `components/app/admin/CrmProspectList.tsx`.
- Backas av ny Server Action i `app/actions/crm.ts` (Zod-validering +
  `requireAdmin`, som befintliga actions där).
- Mottagare: `contact_email ?? latest_lead_email` (kontaktformulär-rader saknar
  Skolverket-mejl men har personens mejl).
- Skickar via `sendLoopsTransactional(SKOL_KONTAKT_MALL_ID, mottagare,
  { schoolName, ort })` — statisk mall vars **enda** variabler är skolans namn
  och ort, så mejlet känns riktat.
- Efter lyckad sändning stämplas Notion: `Status → Kontaktad`,
  `Senast kontaktad → idag`, `Kontaktväg → E-post`. Detta är ett medvetet
  undantag från synk-regeln "rör aldrig `Status`" — men det är en äkta
  kontakthändelse, inte en synk. Kräver en ny riktad Notion-skrivfunktion i
  `lib/notion.ts` (t.ex. `markProspectContacted(pageId)`).
- Skydd mot felsändning: knappen är inaktiverad om (a) varken `contact_email`
  eller `latest_lead_email` finns, eller (b) `Status` redan är `Kontaktad`.

Not (korrigering efter kodläsning): `generateContactEmail` är **redan** en statisk
mall (ingen AI — se kommentaren "Fast mall (ingen AI)" i `lib/campaign-brief.ts`).
Den behålls oförändrad och fortsätter skriva Notion-utkastet `Kontaktmail` som
referens åt dig. Typ 1-sändningen hämtar sitt innehåll från en mall byggd **i
Loops** (variabler `schoolName`, `ort`), helt frikopplat från denna funktion. Inget
tas alltså bort i berikningen.

## Flöde Typ 2 — prisberäknar-lead + Loops

I `submitCampaignLead` (`app/actions/campaign.ts`):
- Behåll befintlig persistens (`school_lookups`-insert + `school_prospects`-upsert).
- Sätt/uppdatera `created_via = 'price_lead'` explicit (leads slår uppslag).
- I `after()`:
  - `upsertLoopsContact(email, { schoolName, students, priceSek, locale,
    source: 'price_lead' })`
  - `sendLoopsEvent(email, 'intresseanmalan', {...})` → triggar
    bekräftelse-loopen som byggs i Loops UI.
  - `sendLoopsTransactional(LEAD_NOTIS_MALL_ID, INTERN_NOTIS_MOTTAGARE, {...})`
    → notis till John.
- `syncProspect` anropas med `createdVia: 'price_lead'`.

## Flöde Typ 3 — kontaktformulär (demo/pris) → intresseanmälan

I `sendContact` (`app/actions/contact.ts`), **innan** notismejlet:
- Endast när `topic ∈ {demo, pricing}`. `press`/`other` mejlas bara, sparas ej.
- Ingen Skolverket-kod finns → syntetisk kod `contact-<hash>` (samma kodlösa
  mönster som `manual-` i campaign.ts). Hashen härleds deterministiskt från
  mejl + skolnamn så upprepade inskick från samma person/skola blir samma rad.
- Upsert `school_prospects` med: `school_unit_code = contact-<hash>`,
  `school_name` (fritext), `latest_lead_email`, `latest_lead_message`,
  `latest_lead_at`, `created_via = 'contact_form'`, `enrichment_status = 'done'`
  (ingen Skolverket-berikning möjlig utan kod — undviker evig "pending").
- `after()` → `syncProspect({ createdVia: 'contact_form', ... })` som pushar
  raden till Notion. Eftersom `enrichment_status` redan är `done` hoppar
  `syncProspect` över Skolverket-berikning och synkar bara till Notion.
- Notis till John via `sendLoopsTransactional(KONTAKT_NOTIS_MALL_ID, ...)`.

## Övriga Resend → Loops-byten

- `app/actions/contact.ts`: notismejlet (alla topics) via
  `sendLoopsTransactional` i stället för Resend.
- `lib/investor-notify.ts`: `open`/`ask`-notiser via `sendLoopsTransactional`.
- Ta bort `resend` ur `apps/web/package.json`.

Reply-to bevaras: Loops transactional stödjer reply-to via en data-variabel.
Lägg ett fält (t.ex. `replyToAddress`) i mallens "Reply to"-fält i Loops-editorn
och skicka avsändarens/skolans adress via `dataVariables`. "Svara" i inkorgen går
då direkt till dem, precis som Resends `replyTo` idag. `sendLoopsTransactional`
tar därför emot `replyToAddress` som en av `dataVariables` för notismallarna.

## Notion-schemaändring

`Datakälla` (select) utökas med `Skoluppslag`, `Prisberäknare-lead`,
`Kontaktformulär`, och `admin_search` byter etikett `Admin-sök` → `Prospektering`.
`lib/notion.ts` `NotionProspect['dataSource']`-typ och
`prospects.ts` `dataSourceLabel`-mappning uppdateras. `CreatedVia`-typen utökas
till `'school_lookup' | 'price_lead' | 'contact_form' | 'admin_search' |
'batch'`.

Not: Notion auto-skapar en select-option vid första skrivning, men de tre nya
värdena bör verifieras/pre-skapas i leads-DB:n för konsekvent färgsättning.
Befintliga rader med `Inbound-uppslag` lämnas orörda (historik).

## Miljövariabler

Nya i Vercel + `.env.local`:
- `LOOPS_API_KEY`
- `LOOPS_SKOL_KONTAKT_ID` (Typ 1 statisk mall till skolan)
- `LOOPS_LEAD_NOTIS_ID` (Typ 2 notis till John)
- `LOOPS_KONTAKT_NOTIS_ID` (Typ 3 + kontaktform notis till John)
- `LOOPS_INVESTOR_NOTIS_ID` (investerarnotis)

`RESEND_API_KEY` tas ur bruk (kan lämnas kvar tills verifierat i prod).

## Manuella steg (utanför koden)

1. Verifiera elevante.se i Loops → DNS (SPF/DKIM) hos Loopia.
2. Skapa transactional-mallar (skol-kontaktmejl + tre notismallar), kopiera IDs.
   Lägg en `replyToAddress`-datavariabel i "Reply to"-fältet på de tre
   notismallarna så svar går direkt till skolan/personen.
3. Bygg loopen `event: intresseanmalan → bekräftelsemejl` i Loops UI.
4. Sätt env-variablerna i Vercel + lokalt.
5. Verifiera/pre-skapa de tre nya `Datakälla`-optionerna i Notion.

## GDPR

Loops är ett amerikanskt bolag — kontaktdata lagras utanför EU, samma läge som
Resend har idag. Detta är B2B-kontaktdata (skolors/skolpersonals jobbadresser),
**aldrig** elevdata. Hård regel som gäller framåt: elevdata går aldrig in i
Loops. `integritetspolicy/page.tsx` (båda locales) uppdateras: Resend → Loops som
personuppgiftsbiträde.

## Test och verifiering

- Bygge grönt (`pnpm build` i `apps/web`).
- Lokalt utan `LOOPS_API_KEY`: alla tre formulär → fallback-loggning, inget kast,
  rader syns i `school_prospects` med rätt `created_via`.
- Skarpt röktest när env är satt i Vercel: ett uppslag, en prisberäknar-lead,
  en kontaktinskickning (demo) → verifiera rätt `Datakälla` i Notion, rätt mejl
  i Loops, och att "Skicka kontaktmejl"-knappen stämplar `Kontaktad`.

## Berörda filer

- Ny: `apps/web/lib/loops.ts`
- `apps/web/app/actions/campaign.ts` (Typ 1/2 källor + Loops)
- `apps/web/app/actions/contact.ts` (Typ 3 persistens + Loops)
- `apps/web/app/actions/crm.ts` (ny "skicka kontaktmejl"-action)
- `apps/web/lib/prospects.ts` (`CreatedVia`, `dataSourceLabel`, källprioritet)
- `apps/web/lib/notion.ts` (`dataSource`-typ + `markProspectContacted`)
- `apps/web/lib/investor-notify.ts` (Loops)
- `apps/web/components/app/admin/CrmProspectList.tsx` (knapp)
- `apps/web/app/[locale]/(public)/integritetspolicy/page.tsx` (biträde)
- `apps/web/package.json` (ta bort `resend`)
