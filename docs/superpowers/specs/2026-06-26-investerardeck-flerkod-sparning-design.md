# Investerardeck — flera koder + läs-spårning — design

**Datum:** 2026-06-26
**Status:** Godkänd struktur, väntar på spec-granskning
**Mål:** Ge varje investerare en egen kod till `/investerare`, och se vem som öppnat decket och hur långt de läste — via mejlnotiser och en Supabase-tabell.

Bygger vidare på den befintliga gaten (branch `investerardeck-webb`): env-lösenord → HMAC-cookie i `proxy.ts`, unlock-sida `/investerare/las-upp`, Server Action i `app/investerare/actions.ts`, helpern `lib/investor-access.ts`.

---

## Beslut (bekräftade med John)

1. **Spårningsdjup:** öppnat **+ scroll-djup**. "Nådde the ask"-sektionen är den djupare signalen (inte mejl per scroll-milstolpe).
2. **Kodlager:** Supabase-tabell (lägg till investerare utan omdeploy).
3. **Avläsning:** mejlnotis till john@elevante.se (öppnat + nådde the ask). Historik finns dessutom i Supabase.
4. **Enkel-lösenordet `INVESTOR_DECK_PASSWORD` tas bort** helt till förmån för tabellen.

---

## Arkitektur

### 1. Datamodell (Supabase, EU — projekt `msqfuywpbrteyrzjggsw`)

Ny migration i `supabase/migrations/`. Båda tabellerna i `public`-schemat, RLS **på** och låst (ingen anon/authenticated-åtkomst) — all åtkomst sker via security-definer-RPC:er.

**`investor_invites`**
| Kolumn | Typ | Not |
|--------|-----|-----|
| `id` | uuid pk default gen_random_uuid() | |
| `label` | text not null | t.ex. "Luminar Ventures" — visas i mejl |
| `code` | text not null unique | koden investeraren skriver in |
| `active` | boolean not null default true | inaktivera utan att radera |
| `created_at` | timestamptz not null default now() | |

**`investor_deck_views`**
| Kolumn | Typ | Not |
|--------|-----|-----|
| `id` | uuid pk default gen_random_uuid() | |
| `invite_id` | uuid not null references investor_invites(id) | |
| `session_id` | text not null unique | genereras vid unlock, bärs i cookien |
| `locale` | text not null default 'sv' | |
| `opened_at` | timestamptz not null default now() | |
| `last_seen_at` | timestamptz | uppdateras av telemetri |
| `max_scroll_pct` | int not null default 0 | 0–100 |
| `seconds` | int not null default 0 | aktiv tid på sidan |
| `reached_ask` | boolean not null default false | |
| `notified_open` | boolean not null default false | hindrar dubbelmejl |
| `notified_ask` | boolean not null default false | hindrar dubbelmejl |

Index: `investor_deck_views(invite_id)`, unik på `session_id`.

### 2. Security-definer-RPC:er (anon-anropbara, kringgår RLS)

- `verify_investor_code(p_code text) → table(invite_id uuid, label text)` — returnerar matchande aktiv invite, annars tomt. (SELECT på `code` + `active`.)
- `record_investor_open(p_invite_id uuid, p_session_id text, p_locale text) → void` — infogar en `views`-rad. Sätter inte `notified_open` (det gör unlock-flödet efter mejl, se nedan — eller RPC:n returnerar och åtgärden uppdaterar). *Beslut: `record_investor_open` infogar raden med `notified_open=false`; unlock-åtgärden skickar mejlet och anropar `mark_investor_notified(p_session_id, 'open')`.*
- `record_investor_engagement(p_session_id text, p_max_scroll int, p_seconds int, p_reached_ask boolean) → table(newly_reached_ask boolean, label text)` — uppdaterar raden: `max_scroll_pct = greatest(befintligt, p_max_scroll)`, `seconds = greatest(...)`, `last_seen_at = now()`, och om `p_reached_ask` och inte redan `reached_ask` → sätt `reached_ask=true` och returnera `newly_reached_ask=true` + `label` (så routen vet om "nådde the ask"-mejl ska skickas). Sätter `notified_ask=true` i samma veva för att vara atomiskt race-säker.
- `mark_investor_notified(p_session_id text, p_kind text) → void` — sätter `notified_open=true` (kind='open'). (Ask hanteras atomiskt i `record_investor_engagement`.)

Alla `security definer`, `set search_path = public`, `grant execute` till `anon` + `authenticated`.

### 3. Cookie & serverhemlighet — `lib/investor-access.ts` (skrivs om)

Cookien bär nu **vem**, inte bara "granted". Token = `base64url(payload) + '.' + base64url(HMAC_SHA256(SECRET, base64url(payload)))`, där `payload = JSON.stringify({ label, sid })` och `SECRET = process.env.INVESTOR_DECK_SECRET`.

Nytt API (ersätter `makeAccessToken`/`verifyAccessToken`):
- `signSession(payload: { label: string; sid: string }): Promise<string>`
- `verifySession(token: string | undefined): Promise<{ label: string; sid: string } | null>` — verifierar HMAC, returnerar payload eller null.
- `INVESTOR_COOKIE` oförändrad (`'investor_access'`).

Web Crypto (samma som idag), funkar i både proxy- och Node-runtime. Konstant-tids-jämförelse av signaturen.

Ny env: **`INVESTOR_DECK_SECRET`** (server, valfri sträng — t.ex. genererad 32-byte). `INVESTOR_DECK_PASSWORD` **tas bort** ur `.env.example` och koden.

### 4. Proxy — `proxy.ts`

Gate-blocket ändras minimalt: i stället för `verifyAccessToken(token, password)` anropas `verifySession(token)`; `if (!session)` → redirect till `/investerare/las-upp` (med `next` + `lang` som idag). **Fail-open** när `INVESTOR_DECK_SECRET` saknas (lokal dev), precis som idag med lösenordet. Ingen DB-träff i proxyn.

### 5. Unlock — `app/investerare/actions.ts`

`unlockInvestorDeck`:
1. Läs `code`, `next`, `lang` ur formuläret.
2. `verify_investor_code(code)` via server-Supabase-klienten (`lib/supabase/server.ts`). Ingen träff → `{ error: true }`.
3. Generera `sid` (`crypto.randomUUID()`). `record_investor_open(invite_id, sid, lang)`.
4. Sätt signerad cookie `signSession({ label, sid })` (httpOnly, `secure: NODE_ENV==='production'`, sameSite lax, path `/investerare`, 30 dygn).
5. Skicka "öppnat"-mejl (se §7) → `mark_investor_notified(sid, 'open')`.
6. `redirect(next)`.

Formuläret/`las-upp` är oförändrat (fältet heter fortsatt "Lösenord"/"Password").

### 6. Telemetri — klient + API-route

**`components/showcase/DeckTelemetry.tsx`** (klientkomponent, renderas i `InvestorDeck`): 
- Mäter `max_scroll_pct` (löpande), aktiv `seconds` (räknar bara när fliken är synlig), och observerar "the ask"-sektionen med IntersectionObserver → `reached_ask`.
- Skickar en beacon till `/api/investerare/telemetry` med `{ maxScroll, seconds, reachedAsk }`: vid intervall (~15 s medan synlig) och på `visibilitychange`/`pagehide` via `navigator.sendBeacon` (JSON Blob).
- `prefers-reduced-motion` är irrelevant här; ingen UI. Ingen rendering (returnerar `null`).
- Behöver en `askSelector`/ref för "the ask"-sektionen — `InvestorDeck` ger ask-sektionen ett `id="ask"` och `DeckTelemetry` observerar `#ask`.

**`app/api/investerare/telemetry/route.ts`** (POST):
- Läser signerad cookie → `verifySession`; ingen/ogiltig → 204 (no-op).
- Parsar body (tål `sendBeacon` text/plain JSON). Klampar värden (0–100, sekunder ≥ 0).
- `record_investor_engagement(sid, maxScroll, seconds, reachedAsk)` → om `newly_reached_ask` → skicka "nådde the ask"-mejl (§7).
- Svarar 204. Idempotent och billig.

(Route handler, inte Server Action, eftersom `sendBeacon` POST:ar till en URL.)

### 7. Mejl — `lib/investor-notify.ts`

Tunn Resend-wrapper (återanvänder mönstret i `app/actions/contact.ts`). En funktion `notifyInvestorEvent(kind: 'open' | 'ask', label: string, meta?: { locale?: string; maxScroll?: number })`:
- `to`: john@elevante.se. `from`: samma avsändar-domän som contact-flödet använder.
- Ämnen: `Investerardeck · {label} öppnade` / `Investerardeck · {label} nådde "the ask"`.
- Kort kropp (etikett, tid, ev. scroll-djup).
- **Graceful fallback:** saknas `RESEND_API_KEY` → logga och returnera (inget kast), exakt som contact-flödet. Spårningen i DB fungerar ändå.

### 8. Hantera investerare

Ingen in-app-admin (YAGNI). John lägger till en investerare genom att infoga en rad i `investor_invites` (Supabase-dashboard): `label` + `code`. Historik/scroll-djup syns i `investor_deck_views`. Mejlen är den löpande avläsningen.

---

## Det som INTE ingår (YAGNI)

- Ingen admin-UI för att skapa koder (Supabase-dashboard räcker).
- Ingen per-sektion-heatmap — bara `max_scroll_pct` + `reached_ask`.
- Ingen IP-/PII-lagring utöver `label` som John själv satt.
- Ingen mejl per scroll-milstolpe — bara "öppnat" och "nådde the ask".
- Inget enkel-master-lösenord kvar (`INVESTOR_DECK_PASSWORD` utgår).

---

## Kvalitet / acceptans

- RLS på båda tabellerna; ingen direkt anon-läsning — bara via de fyra RPC:erna.
- Koden i `investor_invites.code` exponeras aldrig mot klienten (RPC tar koden som arg, returnerar bara `invite_id`+`label`).
- Cookien är osignerbar utan `INVESTOR_DECK_SECRET`; konstant-tids-verifiering; httpOnly + Secure i produktion.
- Fel kod → "Fel lösenord", inget läckage om vilka koder som finns.
- Dubbelmejl-skydd via `notified_open`/`notified_ask` (ask atomiskt i RPC).
- `typecheck` + `lint` (`--max-warnings 0`) + `build` rena. Inga `any` utan kommentar, inga `eslint-disable`.
- Telemetri tål blockerad `sendBeacon`/avsaknad cookie utan fel (204).
- `/rektor`, `/app/*`, startsidan opåverkade.
- Migrationen följer befintlig stil i `supabase/migrations/`.

---

## Faser (för implementationsplanen)

1. **DB:** migration med tabeller, RLS, fyra security-definer-RPC:er. Verifiera via `execute_sql`/`list_tables`.
2. **Cookie-omskrivning:** `lib/investor-access.ts` → `signSession`/`verifySession` + `INVESTOR_DECK_SECRET`; uppdatera `proxy.ts`. Verifiera gate fortsatt blockerar/släpper.
3. **Unlock mot tabell + öppnat-mejl:** skriv om `actions.ts` (RPC-verifiering, `record_investor_open`, cookie, mejl). `lib/investor-notify.ts`. Ta bort `INVESTOR_DECK_PASSWORD`.
4. **Telemetri:** `DeckTelemetry` + `id="ask"` i `InvestorDeck` + `/api/investerare/telemetry` + engagement-RPC + "nådde the ask"-mejl.
5. **Slutverifiering:** två koder seedade, full genomgång (fel kod, rätt kod → mejl + rad, scroll → uppdaterad rad, nå the ask → mejl), `.env.example` uppdaterad, gates gröna, övriga rutter opåverkade.
