# Notion → Loops: skolkontakter och outreach-event

Synkar skolorna i Notion-databasen **Gymnasieskolor i Stockholms län (Skolverket)**
till Loops och triggar rätt e-postsekvens per skola, baserat på fältet
**Kontaktstatus**.

Verktyget gör tre saker per rad:

1. Läser raden från Notion-API:et eller från en CSV-export.
2. Skapar/uppdaterar kontakten i Loops (`POST /v1/contacts/update`) på adressen i
   *Mottagaradress (utskick)*.
3. Triggar ett event (`POST /v1/events/send`) som startar rätt workflow — **en gång**.

Rader utan Kontaktstatus, och rader med `Ej påbörjad`, hoppas över.

---

## Snabbstart

```bash
cd tools/notion-loops-sync
npm install
cp .env.example .env          # fyll i LOOPS_API_KEY och NOTION_TOKEN

npm run sync -- --dry-run     # visa vad som skulle hända — anropar aldrig Loops
npm run sync -- --test        # skarp körning, men bara mot testadresser
npm run sync                  # skarpt
```

`npm run sync` kompilerar TypeScript och kör CLI:t. Allt efter `--` går vidare
till skriptet. Kör `npm run sync -- --help` för hela flagglistan.

Verktyget ligger medvetet utanför pnpm-workspacet (`apps/*`, `packages/*`) —
det är ett fristående säljverktyg utan koppling till webbappens bygge, och har
noll runtime-beroenden.

---

## Miljövariabler

Läses i tur och ordning från `.env` / `.env.local` i den här katalogen, repo-roten,
och sist `apps/web/.env.local`. Först hittat värde per nyckel vinner, och redan
satta miljövariabler vinner alltid över filerna.

`LOOPS_API_KEY` och `NOTION_TOKEN` finns redan i Vercel för `elevante-web`. Hämta
dem lokalt i stället för att dubblera dem för hand:

```bash
cd apps/web && vercel env pull .env.local
```

Verktyget läser den filen direkt — ingen kopiering behövs. `NOTION_DATABASE_ID`
är specifikt för det här verktyget och ligger förifyllt i `.env.example`.

| Variabel | Krävs | Beskrivning |
|---|---|---|
| `LOOPS_API_KEY` | Ja (utom vid `--dry-run`) | Loops → Settings → API. |
| `NOTION_TOKEN` | Vid `--source notion` | Internal integration token från [notion.so/my-integrations](https://www.notion.so/my-integrations). |
| `NOTION_DATABASE_ID` | Vid `--source notion` | `7dd2dd25c62e44faa33edf8e37e709ac` (redan ifyllt i `.env.example`). |
| `NOTION_VERSION` | Nej | Notion-API-version, standard `2022-06-28`. |

> **Notion-integrationen måste bjudas in till databasen.** Ett token räcker inte:
> öppna databasen i Notion → `⋯` → **Connections** → lägg till integrationen.
> Annars svarar API:et `404 object_not_found`, vilket ser ut som fel databas-id.

---

## Datakälla: Notion eller CSV

Standard är **Notion** när `NOTION_TOKEN` och `NOTION_DATABASE_ID` är satta,
annars **CSV**. Tvinga med `--source notion` eller `--source csv`.

**CSV:** exportera databasen i Notion (`⋯` → Export → Markdown & CSV) och lägg
filen som `data/skolor.csv`. Peka ut en annan fil med `--csv <sökväg>`.
`data/skolor.example.csv` visar vilka kolumner som väntas — det är också en
körbar testfil (alla adresser ligger på testdomäner).

Kolumnnamnen är samma i båda källorna och listas i `src/fields.ts`. Varje fält
har flera accepterade namn, så en äldre export fungerar även efter att en kolumn
döpts om i Notion. Både komma- och semikolonseparerad CSV läses (svensk Excel
sparar med semikolon).

### Fälten som används

| Notion-fält | Används till |
|---|---|
| `Skolnamn` (title) | Loops-property `skolnamn` |
| `Skolenhetskod` | Loops-property `skolenhetskod` (stabil nyckel per skolenhet) |
| `Rektor (namn)` | Loops-property `rektor` — referens, aldrig tilltal |
| `Mottagaradress (utskick)` (formel) | Kontaktens e-post i Loops |
| `Personlig kontakt?` (formel) | Loops-property `personligKontakt` (boolean) |
| `Kommun` (select), `Huvudman` | Loops-properties `kommun`, `huvudman` |
| `Kontaktstatus` (select) | Avgör vilket event som triggas |

Saknas formelfälten i källan räknas de om lokalt: personlig kontakt = rektorns
direktadress finns, mottagare = direktadressen om den finns annars skolans
allmänna.

`Hälsningsvariant (utskick)` läses **inte**. Alla mejl inleds `Hej,` utan namn —
skriv hälsningen direkt i Loops-mallen. Fältet kan tas bort i Notion; ändras det
där påverkar det ingenting härifrån.

---

## Faser och event

| Kontaktstatus i Notion | Event till Loops |
|---|---|
| `Att kontakta – Fas 1` | `outreach_fas1_started` |
| `Flaggskepp – prioritera parallellt` | `outreach_flaggskepp_started` |
| `Kommunal – tidig dialog` | `outreach_kommunal_dialog_started` |
| `Ej påbörjad` | *(inget — hoppas över)* |
| `Redan i dialog` | *(inget — befintlig relation, ska inte kallkontaktas)* |

Statusvärden jämförs normaliserat (skiftläge, dubbla blanksteg och alla
dash-varianter `-` `–` `—` behandlas lika), så en osynlig teckenskillnad mellan
Notion och CSV tappar inte en hel fas.

### Lägga till en ny fas

1. Lägg till statusvärdet i select-fältet `Kontaktstatus` i Notion.
2. Lägg till en post i `PHASES` i [`src/phases.ts`](src/phases.ts):
   ```ts
   { status: 'Uppföljning – Fas 2', eventName: 'outreach_fas2_started', label: 'Fas 2' },
   ```
3. Skapa ett Loops-workflow med triggern **Event** → `outreach_fas2_started`.
4. Kör `npm run sync -- --dry-run` och kontrollera att raderna hamnar på rätt event.

Inget annat behöver ändras. En status som finns i Notion men saknas i `PHASES`
hoppas över med en varning i loggen — den blir aldrig tyst borttappad.

---

## Idempotens

Varje skickat event loggas lokalt i `.state/sync-state.json`, nycklat på
e-postadress:

```json
{
  "anna.svensson@example.com": {
    "lastStatus": "Att kontakta – Fas 1",
    "contactHash": "371e832a0959a0b2",
    "events": { "outreach_fas1_started": "2026-08-21T10:31:50.303Z" }
  }
}
```

* Ett event skickas **en gång per kontakt och eventnamn**. Kör man skriptet igen
  händer ingenting.
* Ändras Kontaktstatus triggas det nya fasens event — och bara det. Byter man
  tillbaka till en tidigare fas skickas inget om, eftersom hela eventhistoriken
  sparas, inte bara den senaste statusen.
* Kontaktuppdateringen skickas bara om någon property faktiskt ändrats
  (`contactHash`).
* Filen skrivs atomärt efter *varje* skickat anrop, inte i slutet — ett avbrutet
  jobb kan alltså inte leda till dubbla mejl vid nästa körning.
* `--dry-run` skriver aldrig filen.
* `--force` skickar om allt. **Det innebär ett nytt riktigt mejl till rektorn** —
  använd med urskiljning.

Tappar man bort state-filen skickas allt om vid nästa körning. Ta en kopia
innan större omkörningar, eller kör `--dry-run` först.

---

## Testläge

```bash
npm run sync -- --test
```

`--test` kör **bara** rader vars mottagaradress ligger på en testdomän
(`@example.com`, `@example.org`, `@example.net`, `@test.com`). Loops registrerar
kontakten och eventet men skickar inget riktigt mejl, så man kan verifiera att
ett workflow triggar utan att röra en enda rektor.

Två skyddsmekanismer hänger ihop med det:

* Testläget har en **egen state-fil** (`.state/sync-state.test.json`), så en
  testkörning aldrig kan få en riktig skola att se ut som redan kontaktad.
* En **skarp** körning hoppar tvärtom över testadresser, så den riktiga listan i
  Loops inte fylls med skräpkontakter.

Lägg in en testrad i Notion (eller i CSV:n) med `Rektor e-post (direkt)` satt
till `dittnamn@example.com` och rätt Kontaktstatus, så går den vägen att prova
skarpt hela vägen genom Loops.

---

## Flaggor

| Flagga | Effekt |
|---|---|
| `--dry-run` | Visar allt som skulle skickas. Anropar aldrig Loops, skriver aldrig state. |
| `--test` | Kör bara testadresser, mot egen state-fil. |
| `--source notion\|csv` | Väljer datakälla explicit. |
| `--csv <fil>` | CSV-sökväg (implicerar `--source csv`). |
| `--state <fil>` | Annan sökväg till idempotens-loggen. |
| `--only <e-post>` | Kör bara raden med exakt den mottagaradressen. |
| `--limit <n>` | Kör högst n rader — bra för en försiktig första skarp körning. |
| `--force` | Skickar om event som redan gått ut. |
| `--no-ensure-properties` | Hoppar över registreringen av custom properties i Loops. |
| `--verbose` / `--quiet` | Mer respektive mindre loggning. |

Exit-kod är `1` om någon rad gav fel, annars `0`.

---

## Loops-properties

Följande custom properties registreras automatiskt i Loops vid varje skarp
körning (`POST /v1/contacts/properties`, best-effort — redan skapade properties
ger bara en debug-rad):

`skolnamn` · `skolenhetskod` · `rektor` · `kommun` · `huvudman` ·
`personligKontakt` (boolean) · `kontaktstatus` · `outreachEvent`

**Inget förnamn skickas.** Loops inbyggda `firstName` sätts medvetet inte: vi har
rektorns direktadress för en minoritet av skolorna, så ett `{{firstName}}` i en
mall hade gett namn åt några och tomrum åt resten. Skriv `Hej,` rakt i mallen.
`rektor` finns som referens i Loops-gränssnittet — använd den inte som tilltal.

Eventen bär med sig `skolnamn`, `skolenhetskod`, `kommun`, `kontaktstatus` och
`personligKontakt` som eventProperties, så de går att villkora på inne i ett
workflow.

---

## Fel och felsökning

| Symptom | Trolig orsak |
|---|---|
| `Notion API 404` | Integrationen är inte inbjuden till databasen (`⋯` → Connections). |
| `Läste 0 rader` från CSV | Fel avgränsare eller fel fil — kör med `--verbose`. |
| `saknar giltig mottagaradress` | Varken rektorns eller skolans adress är ifylld/giltig i Notion. |
| `okänd Kontaktstatus "…"` | Statusvärdet saknas i `PHASES` — se *Lägga till en ny fas*. |
| `dubblett i källan` | Två skolor delar e-postadress. Bara första raden synkas. |
| Loops svarar `429` | Rate limit. Skriptet backar av och försöker om automatiskt (4 försök). |

---

## Utveckling

```bash
npm test          # 37 tester (node:test) — faser, normalisering, CSV, state, synklogik
npm run typecheck
```

Testerna kör mot en fejkad Loops-klient. Vill man köra hela CLI:t mot lokala
stub-servrar finns `LOOPS_API_BASE` och `NOTION_API_BASE` som pekar om
bas-URL:erna — de ska aldrig sättas i skarp drift.

```
src/
  cli.ts          Flaggor, val av källa, sammanfattning
  sync.ts         Kärnlogiken: fas → kontakt → event, idempotens, testläge
  phases.ts       Kontaktstatus → eventName  ← ändra här för nya faser
  fields.ts       Notion-kolumnnamn           ← ändra här om ett fält döps om
  normalize.ts    Rå rad → SchoolRow, härleder formelfälten vid behov
  state.ts        Idempotens-loggen på disk
  loops.ts        Loops-API med timeout, retry och rate limit-backoff
  sources/        Notion-API respektive CSV
```
