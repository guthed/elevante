# Investerardeck — koder + läs-dashboard i Notion — design

**Datum:** 2026-06-26
**Status:** Godkänd struktur, väntar på spec-granskning
**Mål:** John hanterar ~20 investerarkoder i en Notion-databas, och samma databas visar live vem som varit inne och hur djupt de scrollat. Notion är master; servern läser/skriver Notion direkt vid upplåsning och scroll.

Bygger vidare på flerkods-gaten + spårningen (branch `investerardeck-webb`): `investor_invites` + `investor_deck_views` i Supabase, signerad sessions-cookie, telemetri-route, öppnat/the-ask-mejl.

---

## Beslut (bekräftade med John)

1. **Dashboard:** i **Notion** (synkad).
2. **Koder:** **John skapar dem i Notion**; Notion är auktoritativ källa.
3. **Färskhet:** **live** — ingen cron. Servern pratar direkt med Notion vid upplåsning och vid scroll-ändring.
4. **Avvägning (accepterad):** varje upplåsning gör ett Notion-anrop (sällan; cookie håller 30 dygn). Är Notion nere faller upplåsningen tillbaka på Supabase-cachen.

Bortvalt (John valde live): schemalagd cron-synk.

---

## Arkitektur

### 1. Notion-databasen "Investerardeck – investerare"

En databas (skapas av oss via Notion-MCP under en sida John pekar ut). John fyller de första kolumnerna; servern uppdaterar resten live. Exakta property-namn (koden läser/skriver mot dessa — byts de namn slutar synken fungera):

| Property | Typ | Ägs av | Roll |
|----------|-----|--------|------|
| `Investerare` | title | John | Namn på investeraren |
| `Kod` | rich_text | John | Lösenordet investeraren skriver in |
| `Aktiv` | checkbox | John | Av = koden slutar fungera (live) |
| `Status` | select (`Inte öppnat`, `Öppnat`, `Nådde the ask`) | server | Härleds av rollup |
| `Senast inne` | date | server | Senaste `last_seen_at` |
| `Max scroll %` | number | server | Djupaste scroll över alla sessioner |
| `Nådde the ask` | checkbox | server | `bool_or(reached_ask)` |
| `Antal sessioner` | number | server | Antal `investor_deck_views`-rader |

### 2. Notion-integration + env

- En **intern Notion-integration** ger `NOTION_TOKEN` (server-only, Vercel).
- Databasen delas med integrationen; dess id → `NOTION_INVESTOR_DB_ID`.
- Båda läses bara på servern (unlock-action + telemetri-route). Saknas de → se felhantering (§7): koder kan inte resolvas via Notion, men cache-fallback gäller.

### 3. Notion-adapter — `apps/web/lib/notion-investor.ts`

Tunn wrapper över Notions REST-API via `fetch` mot `https://api.notion.com/v1` (inget nytt npm-beroende; sätt header `Notion-Version: 2022-06-28` + `Authorization: Bearer ${NOTION_TOKEN}`). Två funktioner:

- `findInvestorByCode(code: string): Promise<{ pid: string; label: string } | null>` — query:ar `NOTION_INVESTOR_DB_ID` med filter `Kod` equals `code` **och** `Aktiv` = true. Returnerar första träffens `page.id` + title-plaintext, annars null. Kastar bara vid genuint API-fel (skiljs från "ingen träff").
- `pushRollup(pid: string, rollup: { status: string; lastSeen: string | null; maxScroll: number; reachedAsk: boolean; sessions: number }): Promise<void>` — uppdaterar sidans properties. Fel sväljs (loggas) — Supabase har ändå datan.

### 4. Datamodell-ändringar (Supabase)

Ny migration. Supabase blir operativ motor + cache; Notion är master för koder.

- `investor_invites`: lägg till `notion_page_id text unique`. (Behåll `label`, `code`, `active`, `created_at`. `code` blir informativt; resolution sker mot Notion.)
- Ny RPC `upsert_investor_invite(p_notion_page_id text, p_label text, p_code text) returns uuid` (security definer): `insert … on conflict (notion_page_id) do update set label=excluded.label, code=excluded.code returning id`. Ger ett stabilt `invite_id` per Notion-rad.
- Ny RPC `get_investor_rollup(p_notion_page_id text) returns table(max_scroll int, reached_ask boolean, last_seen timestamptz, sessions int)` (security definer): aggregat över `investor_deck_views` joinat på `investor_invites.notion_page_id`.
- **Behålls:** `record_investor_open`, `record_investor_engagement`, `mark_investor_notified` (oförändrade — nycklas på `session_id`).
- **Tas bort:** `verify_investor_code` (ersätts av Notion-uppslagning).

### 5. Cookie — bär även `pid`

`lib/investor-access.ts`: payloaden blir `{ label: string; sid: string; pid: string }` (Notion-sidans id) så telemetri-routen vet vilken Notion-rad den ska uppdatera utan extra DB-slag. `signSession`/`verifySession` uppdateras till den nya typen (`InvestorSession`).

### 6. Flöden

**Upplåsning (`app/investerare/actions.ts`):**
1. Läs `code`, `next`, `lang`.
2. **Resolva via Notion:** `findInvestorByCode(code)`.
   - Träff → `{ pid, label }`.
   - Notion-**fel** (ej "ingen träff") → fallback: slå `code` mot Supabase-cachen (`investor_invites`); träff → använd dess `notion_page_id` + `label`.
   - Varken Notion-träff eller cache → `{ error: true }`.
3. `upsert_investor_invite(pid, label, code)` → `invite_id` (cachar i Supabase).
4. `sid = crypto.randomUUID()`; `record_investor_open(invite_id, sid, lang)`.
5. Cookie `signSession({ label, sid, pid })` (httpOnly, secure i prod, `path: '/'`, 30 dygn).
6. `notifyInvestorEvent('open', label, { locale })` + `mark_investor_notified(sid, 'open')`.
7. **Push till Notion:** `get_investor_rollup(pid)` → `pushRollup(pid, …)` (Status=Öppnat, Senast inne, Antal sessioner …).
8. `redirect(next)`.

**Telemetri (`app/api/investerare/telemetry/route.ts`):**
1. `verifySession(cookie)` → `{ sid, pid }`; saknas → 204.
2. Klampa input (scroll 0–100, sekunder 0–86400).
3. `record_investor_engagement(sid, maxScroll, seconds, reachedAsk)` → `{ newly_reached_ask }`.
4. Pusha till Notion **bara vid meningsfull ändring** (rate-limit-vänligt): om `newly_reached_ask` **eller** beaconen är en slut-beacon (`final: true`, skickas av `DeckTelemetry` vid `pagehide`/flikbyte). Då: `get_investor_rollup(pid)` → `pushRollup(pid, …)`. Max ~3 Notion-anrop/session (öppning + the ask + slut).
5. Om `newly_reached_ask` → `notifyInvestorEvent('ask', label, { maxScroll })`. (`label` kommer från den verifierade cookien — `verifySession` returnerar `{ label, sid, pid }`.)
6. 204.

**`DeckTelemetry`:** lägg till `final: true` i beacon-bodyn som skickas på `pagehide`/`visibilitychange→hidden` (övriga intervall-beacons har `final: false`). Inga andra ändringar.

### 7. Felhantering & gränser

- **Notion nere vid upplåsning:** cache-fallback (befintliga koder funkar; helt nya Notion-koder kan inte resolvas förrän Notion är uppe). Loggas.
- **Notion nere vid push:** sväljs — Supabase har datan; Notion-raden hänger efter tills nästa lyckade push.
- **Rate limits:** push debouncas (öppning + the ask + slut). Notions ~3 req/s räcker med god marginal för ~20 lågfrekventa investerare.
- **Property-namn:** byts de i Notion slutar synken matcha — dokumenteras i `.env.example`/README-kommentar.
- **Avstängning (`Aktiv`=false):** slår igenom direkt vid nästa upplåsning (Notion auktoritativ). En redan inloggad investerare med giltig cookie påverkas inte förrän cookien går ut (30 dygn) — acceptabelt.

---

## Det som INTE ingår (YAGNI)

- Ingen cron/schemalagd synk (live valdes).
- Ingen per-sektion-heatmap — bara max scroll + nådde the ask.
- Ingen push vid varje scroll-tick — bara öppning, the ask och sessionsslut.
- Ingen in-app-dashboard (Notion är ansiktet).
- Ingen tvåvägs-redigering av engagemang i Notion (server-kolumnerna skrivs bara av servern; redigerar John dem skrivs de över vid nästa push).

---

## Kvalitet / acceptans

- John kan lägga till en rad i Notion (namn + kod) och koden funkar direkt vid nästa upplåsning.
- `Aktiv`=false stoppar nya upplåsningar.
- Efter en upplåsning visar Notion-raden Status=Öppnat, Senast inne, Antal sessioner inom någon sekund.
- Efter scroll till the ask visar raden Nådde the ask=✓ och Max scroll % stiger (senast vid sessionsslut).
- Notion-token/db-id är server-only; aldrig mot klient.
- Notion-fel kraschar aldrig upplåsning eller telemetri (fallback/svälj).
- `typecheck` + `lint` (`--max-warnings 0`) + `build` rena. Inga `any` utan kommentar, inga `eslint-disable`.
- `/rektor`, `/app/*`, startsidan opåverkade.

---

## Faser (för implementationsplanen)

1. **Notion-setup + adapter:** skapa Notion-databasen (rätt properties) via MCP; dokumentera integration + env. Bygg `lib/notion-investor.ts` (`findInvestorByCode`, `pushRollup`).
2. **DB-migration:** `notion_page_id` på `investor_invites`; RPC `upsert_investor_invite` + `get_investor_rollup`; ta bort `verify_investor_code`. Applicera via Supabase MCP.
3. **Cookie:** lägg `pid` i `InvestorSession` (`lib/investor-access.ts`).
4. **Upplåsning:** skriv om `actions.ts` (Notion-resolution + fallback, upsert, cookie m. pid, öppnat-mejl, rollup-push).
5. **Telemetri:** `DeckTelemetry` skickar `final`; route pushar rollup vid the ask/slut + the-ask-mejl.
6. **Slutverifiering:** skapa 2 testrader i Notion, kör hela flödet (ny kod funkar direkt, avstängd kod nekas, öppning + scroll syns i Notion-raden, Notion-nere-fallback), gates gröna, övriga rutter opåverkade. Städa testrader.
