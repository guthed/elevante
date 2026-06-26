# Investerardeck — koder + live läs-dashboard i Notion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** John hanterar investerarkoder i en Notion-databas som också visar, live, vem som varit inne och hur djupt de scrollat. Notion är auktoritativ för koderna; servern läser/skriver Notion vid upplåsning och scroll.

**Architecture:** Upplåsningen resolvar koden mot Notions REST-API (faller tillbaka på Supabase-cache vid Notion-fel), cachar invite + `notion_page_id` i Supabase, och pushar en rollup (status, senast inne, max scroll, nådde the ask, antal sessioner) tillbaka till Notion-raden vid öppning, the ask och sessionsslut. Supabase är operativ motor (sessioner, scroll, mejl-dedup); Notion är dashboarden.

**Tech Stack:** Next.js 16 (Server Actions, Route Handlers, `proxy.ts`), Supabase (RPC), Notion REST API via `fetch` (inget nytt npm-beroende), Resend, Web Crypto.

---

## Förutsättningar & konventioner

- **Inget unit-test-ramverk.** Verifiering: `pnpm typecheck`, `pnpm lint` (`--max-warnings 0`), `pnpm build`, Supabase MCP (DB), Notion MCP/API + preview (live-flöde).
- **Kommandon från `apps/web/`.** Pakethanterare `pnpm`. Supabase-projekt `msqfuywpbrteyrzjggsw`. Migrationer i repo-rotens `supabase/migrations/`.
- **RPC-anrop via cast** (befintligt mönster): `const rpc = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };`.
- **Lint-regel `react-hooks/set-state-in-effect`** aktiv — `DeckTelemetry` använder bara `useRef`, opåverkad.
- **Branch:** `investerardeck-webb`. Commit-messages avslutas med `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Bygger på:** `lib/investor-access.ts` (cookie `{label,sid}`), `app/investerare/actions.ts` (unlock via `verify_investor_code`), `app/api/investerare/telemetry/route.ts`, `components/showcase/DeckTelemetry.tsx`, `lib/investor-notify.ts`, migration `20260626120000_investor_invites.sql`.
- **Notion property-namn (exakta, koden matchar mot dessa):** `Investerare` (title), `Kod` (rich_text), `Aktiv` (checkbox), `Status` (select), `Senast inne` (date), `Max scroll %` (number), `Nådde the ask` (checkbox), `Antal sessioner` (number).

---

## Filstruktur

**Nya filer:**

| Fil | Ansvar |
|-----|--------|
| `apps/web/lib/notion-investor.ts` | Notion-adapter: `findInvestorByCode`, `pushRollup`, `deriveStatus` |
| `supabase/migrations/20260626130000_investor_notion.sql` | `notion_page_id`-kolumn, RPC `upsert_investor_invite`/`get_investor_rollup`/`get_cached_invite_by_code`, dropp `verify_investor_code` |

**Modifierade filer:**

| Fil | Ändring |
|-----|---------|
| `apps/web/lib/investor-access.ts` | `InvestorSession` får `pid` |
| `apps/web/app/investerare/actions.ts` | Notion-resolution + cache-fallback, upsert, cookie m. `pid`, öppnat-mejl, rollup-push |
| `apps/web/app/api/investerare/telemetry/route.ts` | Läs `pid`+`final`, push rollup vid the ask/slut, ask-mejl m. cookie-label |
| `apps/web/components/showcase/DeckTelemetry.tsx` | Skicka `final: true` på pagehide/flikbyte |
| `apps/web/.env.example` | Lägg till `NOTION_TOKEN`, `NOTION_INVESTOR_DB_ID` |

---

## Fas 1 — Notion-databas & adapter

### Task 1: Skapa Notion-databasen + integration (controller-ledd)

**OBS:** Detta steg kräver den interaktivt autentiserade Notion-MCP:n och en manuell Notion-UI-åtgärd av John. Görs av controller/John, inte en headless subagent.

- [ ] **Step 1: John skapar en intern Notion-integration**

I Notion → Settings → Connections → Develop/Integrations → ny intern integration (t.ex. "Elevante investerardeck"). Kopiera **Internal Integration Secret** → detta blir `NOTION_TOKEN`.

- [ ] **Step 2: Skapa databasen via Notion-MCP**

Controller skapar en databas (Notion-MCP `notion-create-database`) under en sida John pekar ut, med exakt dessa properties:
- `Investerare` — title
- `Kod` — rich_text (text)
- `Aktiv` — checkbox
- `Status` — select med options `Inte öppnat`, `Öppnat`, `Nådde the ask`
- `Senast inne` — date
- `Max scroll %` — number
- `Nådde the ask` — checkbox
- `Antal sessioner` — number

Notera databasens id → `NOTION_INVESTOR_DB_ID`.

- [ ] **Step 3: John delar databasen med integrationen**

I databasens `•••`-meny → Connections → lägg till integrationen från Step 1. (Utan detta kan servern inte läsa/skriva.)

- [ ] **Step 4: Dokumentera env**

Lägg till i `apps/web/.env.example`:
```
# Notion-integration för investerardeck-dashboarden (server-only).
NOTION_TOKEN=
NOTION_INVESTOR_DB_ID=
```
Commit:
```bash
cd /Users/johnguthed/elevante
git add apps/web/.env.example
git commit -m "docs(investerare): env för Notion-integration (token + db-id)"
```

- [ ] **Step 5: Sätt lokala värden** i `apps/web/.env.local` (gitignored): `NOTION_TOKEN=…` och `NOTION_INVESTOR_DB_ID=…` (för Task 7-verifiering).

### Task 2: Notion-adapter `lib/notion-investor.ts`

**Files:**
- Create: `apps/web/lib/notion-investor.ts`

- [ ] **Step 1: Skriv filen**

```ts
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

function notionHeaders(): Record<string, string> | null {
  const token = process.env.NOTION_TOKEN;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

export type InvestorMatch = { pid: string; label: string };

/**
 * Slår upp en kod i Notion-databasen (bara aktiva rader). Returnerar
 * { pid, label } eller null vid ingen träff. KASTAR vid genuint API-fel
 * (anroparen kan då falla tillbaka på cachen).
 */
export async function findInvestorByCode(code: string): Promise<InvestorMatch | null> {
  const headers = notionHeaders();
  const dbId = process.env.NOTION_INVESTOR_DB_ID;
  if (!headers || !dbId) throw new Error('Notion ej konfigurerad');

  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filter: {
        and: [
          { property: 'Kod', rich_text: { equals: code } },
          { property: 'Aktiv', checkbox: { equals: true } },
        ],
      },
      page_size: 1,
    }),
  });
  if (!res.ok) throw new Error(`Notion query failed: ${res.status}`);

  const data = (await res.json()) as {
    results?: Array<{ id: string; properties?: { Investerare?: { title?: Array<{ plain_text?: string }> } } }>;
  };
  const page = data.results?.[0];
  if (!page) return null;
  const title = page.properties?.Investerare?.title ?? [];
  const label = title.map((t) => t.plain_text ?? '').join('').trim() || 'Investerare';
  return { pid: page.id, label };
}

export type Rollup = {
  status: string;
  lastSeen: string | null;
  maxScroll: number;
  reachedAsk: boolean;
  sessions: number;
};

/** Skriver rollup till Notion-raden. Sväljer fel (Supabase har datan). */
export async function pushRollup(pid: string, rollup: Rollup): Promise<void> {
  const headers = notionHeaders();
  if (!headers) return;
  try {
    const res = await fetch(`${NOTION_API}/pages/${pid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        properties: {
          Status: { select: { name: rollup.status } },
          'Senast inne': rollup.lastSeen ? { date: { start: rollup.lastSeen } } : { date: null },
          'Max scroll %': { number: rollup.maxScroll },
          'Nådde the ask': { checkbox: rollup.reachedAsk },
          'Antal sessioner': { number: rollup.sessions },
        },
      }),
    });
    if (!res.ok) {
      console.error('[notion-investor] pushRollup failed:', res.status, await res.text());
    }
  } catch (error) {
    console.error('[notion-investor] pushRollup error:', error);
  }
}

export function deriveStatus(reachedAsk: boolean, sessions: number): string {
  if (reachedAsk) return 'Nådde the ask';
  if (sessions > 0) return 'Öppnat';
  return 'Inte öppnat';
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/web && pnpm typecheck && pnpm lint`
Expected: rena.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/notion-investor.ts
git commit -m "feat(investerare): Notion-adapter (findInvestorByCode, pushRollup)"
```

---

## Fas 2 — DB-migration

### Task 3: Migration — notion_page_id + RPC:er

**Files:**
- Create: `supabase/migrations/20260626130000_investor_notion.sql`

- [ ] **Step 1: Skriv migrationen**

```sql
-- Notion blir master för investerarkoder. invite får notion_page_id (nyckel),
-- code-unikheten släpps (koden lever i Notion nu). Nya RPC:er för upsert,
-- rollup och cache-fallback. verify_investor_code utgår.

alter table public.investor_invites add column if not exists notion_page_id text;
alter table public.investor_invites drop constraint if exists investor_invites_code_key;
create unique index if not exists investor_invites_notion_page_id_key
  on public.investor_invites(notion_page_id);

-- Upsert en invite per Notion-rad; returnerar invite-id.
create or replace function public.upsert_investor_invite(
  p_notion_page_id text, p_label text, p_code text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.investor_invites (notion_page_id, label, code)
  values (p_notion_page_id, p_label, p_code)
  on conflict (notion_page_id) do update
    set label = excluded.label, code = excluded.code
  returning id into v_id;
  return v_id;
end;
$$;

-- Aggregerad rollup per Notion-rad (för dashboard-push).
create or replace function public.get_investor_rollup(p_notion_page_id text)
returns table (max_scroll int, reached_ask boolean, last_seen timestamptz, sessions int)
language sql security definer set search_path = public
as $$
  select
    coalesce(max(v.max_scroll_pct), 0)::int,
    coalesce(bool_or(v.reached_ask), false),
    max(v.last_seen_at),
    count(*)::int
  from public.investor_deck_views v
  join public.investor_invites i on i.id = v.invite_id
  where i.notion_page_id = p_notion_page_id;
$$;

-- Cache-fallback: slå upp en redan cachad invite på kod (när Notion är nere).
create or replace function public.get_cached_invite_by_code(p_code text)
returns table (notion_page_id text, label text)
language sql security definer set search_path = public
as $$
  select i.notion_page_id, i.label
  from public.investor_invites i
  where i.code = p_code and i.notion_page_id is not null
  limit 1;
$$;

drop function if exists public.verify_investor_code(text);

grant execute on function public.upsert_investor_invite(text, text, text) to anon, authenticated;
grant execute on function public.get_investor_rollup(text) to anon, authenticated;
grant execute on function public.get_cached_invite_by_code(text) to anon, authenticated;
```

- [ ] **Step 2: Applicera via Supabase MCP**

Ladda Supabase MCP (`apply_migration`, `execute_sql`). `apply_migration` med `name: "investor_notion"` och `query` = SQL ovan, mot projekt `msqfuywpbrteyrzjggsw`.

- [ ] **Step 3: Verifiera**

`execute_sql`:
```sql
select proname from pg_proc where proname in
('upsert_investor_invite','get_investor_rollup','get_cached_invite_by_code','verify_investor_code')
order by proname;
```
Expected: tre rader (utan `verify_investor_code`). Och:
```sql
select column_name from information_schema.columns
where table_name='investor_invites' and column_name='notion_page_id';
```
Expected: en rad.

- [ ] **Step 4: Commit**

```bash
cd /Users/johnguthed/elevante
git add supabase/migrations/20260626130000_investor_notion.sql
git commit -m "feat(investerare): Notion-master DB (notion_page_id, upsert/rollup/cache-RPC:er)"
```

---

## Fas 3 — Cookie, upplåsning, telemetri

### Task 4: Cookie bär `pid`

**Files:**
- Modify: `apps/web/lib/investor-access.ts`

- [ ] **Step 1: Lägg `pid` i typen och verifieringen**

Ändra `export type InvestorSession = { label: string; sid: string };` till:
```ts
export type InvestorSession = { label: string; sid: string; pid: string };
```
I `verifySession`, ändra valideringen av den parsade payloaden till att kräva `pid`:
```ts
    const parsed = JSON.parse(base64UrlToUtf8(body)) as Partial<InvestorSession>;
    if (
      typeof parsed.label === 'string' &&
      typeof parsed.sid === 'string' &&
      typeof parsed.pid === 'string'
    ) {
      return { label: parsed.label, sid: parsed.sid, pid: parsed.pid };
    }
    return null;
```
(`signSession(payload: InvestorSession)` behöver ingen annan ändring — den serialiserar hela payloaden.)

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: fel kvarstår tillfälligt i `actions.ts`/`route.ts` (de skickar ännu inte `pid`) — åtgärdas i Task 5–6. `investor-access.ts` självt felfritt.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/investor-access.ts
git commit -m "feat(investerare): cookie bär Notion page-id (pid)"
```

### Task 5: Upplåsning mot Notion + rollup-push

**Files:**
- Modify (overwrite): `apps/web/app/investerare/actions.ts`

- [ ] **Step 1: Ersätt filen med exakt**

```ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { INVESTOR_COOKIE, signSession } from '@/lib/investor-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyInvestorEvent } from '@/lib/investor-notify';
import { findInvestorByCode, pushRollup, deriveStatus } from '@/lib/notion-investor';

export type GateState = { error: boolean };

type CacheRow = { notion_page_id: string; label: string };
type RollupRow = { max_scroll: number; reached_ask: boolean; last_seen: string | null; sessions: number };

export async function unlockInvestorDeck(_prev: GateState, formData: FormData): Promise<GateState> {
  const code = (formData.get('password') ?? '').toString().trim();
  const nextRaw = (formData.get('next') ?? '/investerare').toString();
  const next = nextRaw.startsWith('/investerare') ? nextRaw : '/investerare';
  const lang = (formData.get('lang') ?? 'sv').toString() === 'en' ? 'en' : 'sv';

  if (!code) return { error: true };

  const supabase = await createSupabaseServerClient();
  const rpc = supabase as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };

  // Resolva koden mot Notion (auktoritativt). Vid Notion-FEL: cache-fallback.
  // Vid "ingen träff" (null): avvisa (respekterar avstängda/borttagna koder).
  let resolved: { pid: string; label: string } | null = null;
  let notionErrored = false;
  try {
    resolved = await findInvestorByCode(code);
  } catch {
    notionErrored = true;
  }
  if (!resolved && notionErrored) {
    const { data } = await rpc.rpc('get_cached_invite_by_code', { p_code: code });
    const row = (data as CacheRow[] | null)?.[0];
    if (row) resolved = { pid: row.notion_page_id, label: row.label };
  }
  if (!resolved) return { error: true };

  const { data: upsertData } = await rpc.rpc('upsert_investor_invite', {
    p_notion_page_id: resolved.pid,
    p_label: resolved.label,
    p_code: code,
  });
  const inviteId = upsertData as string | null;
  if (!inviteId) return { error: true };

  const sid = crypto.randomUUID();
  await rpc.rpc('record_investor_open', {
    p_invite_id: inviteId,
    p_session_id: sid,
    p_locale: lang,
  });

  const token = await signSession({ label: resolved.label, sid, pid: resolved.pid });
  if (token) {
    const store = await cookies();
    store.set(INVESTOR_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  await notifyInvestorEvent('open', resolved.label, { locale: lang });
  await rpc.rpc('mark_investor_notified', { p_session_id: sid, p_kind: 'open' });

  // Live push till Notion-raden.
  const { data: rollupData } = await rpc.rpc('get_investor_rollup', { p_notion_page_id: resolved.pid });
  const r = (rollupData as RollupRow[] | null)?.[0];
  if (r) {
    await pushRollup(resolved.pid, {
      status: deriveStatus(r.reached_ask, r.sessions),
      lastSeen: r.last_seen,
      maxScroll: r.max_scroll,
      reachedAsk: r.reached_ask,
      sessions: r.sessions,
    });
  }

  redirect(next);
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/web && pnpm typecheck && pnpm lint`
Expected: `actions.ts` rent (kvarvarande fel bara i `route.ts`, Task 6).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/investerare/actions.ts
git commit -m "feat(investerare): upplåsning resolvar mot Notion + pushar rollup"
```

### Task 6: Telemetri pushar rollup + `final`-beacon

**Files:**
- Modify (overwrite): `apps/web/app/api/investerare/telemetry/route.ts`
- Modify: `apps/web/components/showcase/DeckTelemetry.tsx`

- [ ] **Step 1: Ersätt `route.ts` med exakt**

```ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { INVESTOR_COOKIE, verifySession } from '@/lib/investor-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyInvestorEvent } from '@/lib/investor-notify';
import { pushRollup, deriveStatus } from '@/lib/notion-investor';

type EngagementRow = { newly_reached_ask: boolean; label: string | null };
type RollupRow = { max_scroll: number; reached_ask: boolean; last_seen: string | null; sessions: number };

export async function POST(request: Request) {
  const store = await cookies();
  const session = await verifySession(store.get(INVESTOR_COOKIE)?.value);
  if (!session) return new NextResponse(null, { status: 204 });

  let payload: { maxScroll?: unknown; seconds?: unknown; reachedAsk?: unknown; final?: unknown } = {};
  try {
    payload = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const maxScroll = Math.max(0, Math.min(100, Math.round(Number(payload.maxScroll) || 0)));
  const seconds = Math.max(0, Math.min(86400, Math.round(Number(payload.seconds) || 0)));
  const reachedAsk = payload.reachedAsk === true;
  const final = payload.final === true;

  const supabase = await createSupabaseServerClient();
  const rpc = supabase as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };

  const { data: engData } = await rpc.rpc('record_investor_engagement', {
    p_session_id: session.sid,
    p_max_scroll: maxScroll,
    p_seconds: seconds,
    p_reached_ask: reachedAsk,
  });
  const eng = (engData as EngagementRow[] | null)?.[0];

  if (eng?.newly_reached_ask) {
    await notifyInvestorEvent('ask', session.label, { maxScroll });
  }

  // Push rollup till Notion vid meningsfull ändring (the ask eller sessionsslut).
  if (eng?.newly_reached_ask || final) {
    const { data: rollupData } = await rpc.rpc('get_investor_rollup', {
      p_notion_page_id: session.pid,
    });
    const r = (rollupData as RollupRow[] | null)?.[0];
    if (r) {
      await pushRollup(session.pid, {
        status: deriveStatus(r.reached_ask, r.sessions),
        lastSeen: r.last_seen,
        maxScroll: r.max_scroll,
        reachedAsk: r.reached_ask,
        sessions: r.sessions,
      });
    }
  }

  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 2: `DeckTelemetry.tsx` — skicka `final`**

I `apps/web/components/showcase/DeckTelemetry.tsx`, ändra `send`-funktionen så den tar en `final`-flagga och inkluderar den i bodyn. Ersätt hela `const send = () => { … };` med:
```tsx
    const send = (final = false) => {
      if (!dirty.current && !final) return;
      dirty.current = false;
      const body = JSON.stringify({
        maxScroll: maxScroll.current,
        seconds: seconds.current,
        reachedAsk: reachedAsk.current,
        final,
      });
      try {
        navigator.sendBeacon?.(
          '/api/investerare/telemetry',
          new Blob([body], { type: 'application/json' }),
        );
      } catch {
        // sendBeacon kan saknas/blockeras — ignorera tyst.
      }
    };
```
Och ändra anropen som sker vid sessionsslut till `send(true)`:
- `onVisibility`: `if (document.visibilityState === 'hidden') send(true);`
- `window.addEventListener('pagehide', send);` → `window.addEventListener('pagehide', () => send(true));`
- cleanup-radens avslutande `send();` → `send(true);`

Lämna intervall-anropet (`setInterval(send, 15000)`) och the-ask-anropet (`send()` i IntersectionObserver-callbacken) som vanliga `send()` (final=false). **OBS:** byt `setInterval(send, 15000)` mot `setInterval(() => send(), 15000)` så intervallet inte råkar skicka tick-talet som `final`-argument.

- [ ] **Step 3: Typecheck + lint + build**

Run: `cd apps/web && pnpm typecheck && pnpm lint && pnpm build`
Expected: alla rena; `/api/investerare/telemetry` byggs; `/investerare` + `/investerare/en` byggs.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/investerare/telemetry/route.ts apps/web/components/showcase/DeckTelemetry.tsx
git commit -m "feat(investerare): telemetri pushar rollup till Notion + final-beacon"
```

---

## Fas 4 — Slutverifiering

### Task 7: End-to-end mot Notion

**Krav:** `NOTION_TOKEN` + `NOTION_INVESTOR_DB_ID` satta i `apps/web/.env.local`, databasen delad med integrationen (Task 1), och `INVESTOR_DECK_SECRET` satt lokalt.

- [ ] **Step 1: Skapa två testrader i Notion** (via Notion-MCP eller manuellt i UI): rad A `Investerare="Luminar Ventures", Kod="luminar-test", Aktiv=✓`; rad B `Investerare="Norrsken VC", Kod="norrsken-test", Aktiv=✓`.

- [ ] **Step 2: Starta preview** (`preview_start` "elevante-web"; starta om om den kör så env läses).

- [ ] **Step 3: Ny kod funkar direkt** — gå till `/investerare` → gate; lås upp med `luminar-test` (fyll fält + `document.querySelector('form').requestSubmit()`). Expected: in på `/investerare`, 19 sektioner.

- [ ] **Step 4: Notion-raden uppdaterad (öppning)** — kontrollera Luminar-raden i Notion (via MCP `notion-fetch` på sidan, eller UI): `Status=Öppnat`, `Senast inne` satt, `Antal sessioner=1`. Och Supabase:
```sql
select i.label, i.notion_page_id, count(v.*) sessions
from public.investor_invites i left join public.investor_deck_views v on v.invite_id=i.id
group by 1,2;
```
Expected: en invite med `notion_page_id` ifyllt.

- [ ] **Step 5: The ask + slut** — i preview: `fetch('/api/investerare/telemetry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({maxScroll:100,seconds:30,reachedAsk:true,final:true})})`. Kontrollera Notion-raden: `Nådde the ask=✓`, `Max scroll %=100`. Serverlogg: `[investor-notify] … kind:'ask'`.

- [ ] **Step 6: Avstängd kod nekas** — sätt `Aktiv=false` på Luminar-raden i Notion. Rensa cookie (`document.cookie='investor_access=;path=/;max-age=0'`), gå till `/investerare/las-upp`, försök `luminar-test`. Expected: "Fel lösenord" (Notion auktoritativ, ingen träff på inaktiv).

- [ ] **Step 7: Notion-nere-fallback** — tillfälligt sätt fel `NOTION_TOKEN` i `.env.local`, starta om. Lås upp med `norrsken-test` (som redan cachats? om inte: först låsa upp medan token är rätt, sedan bryt token). Förväntat: redan cachad kod släpps in via `get_cached_invite_by_code`; helt ny kod kan ej resolvas. Återställ token efteråt.

- [ ] **Step 8: Övriga rutter** — `/rektor` och `/sv` renderar normalt.

- [ ] **Step 9: Slutgates** — `cd apps/web && pnpm typecheck && pnpm lint && pnpm build` rena.

- [ ] **Step 10: Städa** testrader i Notion (ta bort eller `Aktiv=false`) och i Supabase:
```sql
delete from public.investor_invites where code in ('luminar-test','norrsken-test');
```
(cascade tar views). Commit ev. fixar.

---

## Self-Review (ifylld av planförfattaren)

**Spec-täckning:** Notion-DB-schema + integration (Task 1 ↔ spec §1–2); adapter `findInvestorByCode`/`pushRollup`/`deriveStatus` (Task 2 ↔ §3); `notion_page_id` + RPC:er + dropp `verify_investor_code` (Task 3 ↔ §4); cookie `pid` (Task 4 ↔ §5); upplåsning Notion-resolution + fallback + upsert + öppnat-mejl + rollup (Task 5 ↔ §6 unlock); telemetri rollup-push + the-ask-mejl + `final` (Task 6 ↔ §6 telemetri); felhantering/gränser (Task 5–6 fallback/svälj + Task 7 step 6–7 ↔ §7); verifiering inkl. avstängd kod + Notion-nere (Task 7 ↔ acceptans).

**Placeholder-scan:** Inga TBD/TODO. Task 1 är medvetet controller/John-lett (interaktiv Notion-MCP + UI-åtgärd som inte kan automatiseras) men varje steg är konkret. All kod fullständig.

**Typkonsistens:** `InvestorSession` får `pid` och används i `signSession`/`verifySession` (Task 4) + actions (Task 5) + route (Task 6). RPC-namn matchar migrationen: `upsert_investor_invite`, `get_investor_rollup`, `get_cached_invite_by_code` (+ behållna `record_investor_open`/`record_investor_engagement`/`mark_investor_notified`). `Rollup`/`deriveStatus`/`findInvestorByCode`-signaturer enhetliga mellan adapter, action och route. Notion property-namn identiska i adapter och spec.

**Beroendeordning:** Notion-setup/adapter (1–2) → DB (3) → cookie (4) → unlock (5) → telemetri (6) → verifiering (7). Task 4 lämnar typecheck tillfälligt bruten tills 5–6 — noterat i stegen.
