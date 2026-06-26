# Investerardeck — flera koder + läs-spårning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ge varje investerare en egen kod till `/investerare`, logga vem som öppnar och hur långt de läser (scroll-djup + "nådde the ask"), och mejla John vid öppning och vid the ask.

**Architecture:** Koder i en Supabase-tabell (åtkomst via security-definer-RPC:er). Unlock-sidan verifierar koden, skapar en `views`-rad, sätter en **signerad sessions-cookie** `{label, sid}` (HMAC med `INVESTOR_DECK_SECRET`) och mejlar. `proxy.ts` verifierar bara cookien (ingen DB-träff). En klient-telemetrikomponent rapporterar scroll/tid till en API-route som uppdaterar raden och mejlar när the ask nås.

**Tech Stack:** Next.js 16 (`proxy.ts`, Route Handlers, Server Actions), React 19, Supabase (Postgres + RLS + security-definer-RPC), Resend, Web Crypto (HMAC). Inga nya beroenden.

---

## Förutsättningar & konventioner

- **Inget unit-test-ramverk** finns i `apps/web`. Verifiering sker med **`pnpm typecheck`**, **`pnpm lint`** (`--max-warnings 0`), **`pnpm build`**, **Supabase MCP** (för DB) och **preview-webbläsarflödet** (för gate/telemetri end-to-end).
- **Kommandon körs från `apps/web/`** om inget annat sägs. Pakethanterare: `pnpm`.
- **Supabase-projekt:** `msqfuywpbrteyrzjggsw` (eu-central, `public`-schema). Migrationer ligger i `supabase/migrations/` (repo-rot, INTE under `apps/web`) och namnges `YYYYMMDDHHMMSS_namn.sql`.
- **RPC-anrop typas via cast** (befintligt mönster, t.ex. `app/actions/chat.ts:64`): `const rpc = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: T[] | null }> };`. Då slipper vi regenerera `database.ts` (där `Functions` är tomt).
- **Resend graceful fallback:** om `RESEND_API_KEY` saknas → logga och returnera (inget kast). Mönster: `app/actions/contact.ts`.
- **Lint-regel `react-hooks/set-state-in-effect`** är aktiv. Telemetrikomponenten använder bara `useRef` (ingen `setState`), så den är opåverkad.
- **Branch:** `investerardeck-webb` (redan utcheckad). Commit-messages avslutas med `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Bygger på befintlig gate:** `lib/investor-access.ts`, `proxy.ts` (gate-block runt rad 110), `app/investerare/actions.ts`, `app/investerare/las-upp/UnlockForm.tsx` + `page.tsx`.

---

## Filstruktur

**Nya filer:**

| Fil | Ansvar |
|-----|--------|
| `supabase/migrations/20260626120000_investor_invites.sql` | Tabeller, RLS, fyra security-definer-RPC:er |
| `apps/web/lib/investor-notify.ts` | Resend-wrapper: mejla "öppnat"/"nådde the ask" |
| `apps/web/components/showcase/DeckTelemetry.tsx` | Klient: mäter scroll/tid/the-ask, skickar beacon |
| `apps/web/app/api/investerare/telemetry/route.ts` | POST-endpoint: uppdaterar engagemang, mejlar vid the ask |

**Modifierade filer:**

| Fil | Ändring |
|-----|---------|
| `apps/web/lib/investor-access.ts` | Skrivs om: `signSession`/`verifySession` (bär `{label, sid}`, `INVESTOR_DECK_SECRET`) |
| `apps/web/proxy.ts` | Gate-blocket använder `verifySession` i stället för `verifyAccessToken` |
| `apps/web/app/investerare/actions.ts` | Verifierar kod mot tabell-RPC, skapar views-rad, signerad cookie, öppnat-mejl |
| `apps/web/app/investerare/las-upp/UnlockForm.tsx` | Skicka även `lang` som dolt fält |
| `apps/web/app/investerare/InvestorDeck.tsx` | `id="ask"` på ask-sektionen + rendera `<DeckTelemetry />` |
| `apps/web/.env.example` | Ta bort `INVESTOR_DECK_PASSWORD`; lägg till `INVESTOR_DECK_SECRET` (+ valfri `INVESTOR_NOTIFY_EMAIL`) |

---

## Fas 1 — Databas

### Task 1: Migration — tabeller, RLS, RPC:er

**Files:**
- Create: `supabase/migrations/20260626120000_investor_invites.sql`

- [ ] **Step 1: Skriv migrationsfilen**

```sql
-- Investerardeck: en kod per investerare + läs-spårning.
-- Båda tabellerna RLS-låsta; all åtkomst via security-definer-RPC:erna nedan.

create table if not exists public.investor_invites (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.investor_deck_views (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.investor_invites(id) on delete cascade,
  session_id text not null unique,
  locale text not null default 'sv',
  opened_at timestamptz not null default now(),
  last_seen_at timestamptz,
  max_scroll_pct int not null default 0,
  seconds int not null default 0,
  reached_ask boolean not null default false,
  notified_open boolean not null default false,
  notified_ask boolean not null default false
);

create index if not exists investor_deck_views_invite_idx
  on public.investor_deck_views(invite_id);

alter table public.investor_invites enable row level security;
alter table public.investor_deck_views enable row level security;
-- Inga policys = ingen anon/authenticated-åtkomst. Endast RPC:erna nedan.

-- Verifiera kod → returnerar matchande aktiv invite (eller tom).
create or replace function public.verify_investor_code(p_code text)
returns table (invite_id uuid, label text)
language sql
security definer
set search_path = public
as $$
  select i.id, i.label
  from public.investor_invites i
  where i.code = p_code and i.active
  limit 1;
$$;

-- Logga en öppning (skapar en views-rad; idempotent på session_id).
create or replace function public.record_investor_open(
  p_invite_id uuid, p_session_id text, p_locale text
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.investor_deck_views (invite_id, session_id, locale, last_seen_at)
  values (p_invite_id, p_session_id, coalesce(p_locale, 'sv'), now())
  on conflict (session_id) do nothing;
$$;

-- Markera öppnat-mejl skickat.
create or replace function public.mark_investor_notified(p_session_id text, p_kind text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.investor_deck_views
  set notified_open = case when p_kind = 'open' then true else notified_open end
  where session_id = p_session_id;
$$;

-- Uppdatera engagemang. Returnerar (newly_reached_ask, label) så routen vet
-- om "nådde the ask"-mejl ska skickas. Atomiskt via radlås.
create or replace function public.record_investor_engagement(
  p_session_id text, p_max_scroll int, p_seconds int, p_reached_ask boolean
) returns table (newly_reached_ask boolean, label text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_notified boolean;
  v_invite uuid;
  v_label text := null;
  v_newly boolean := false;
begin
  select v.notified_ask, v.invite_id into v_was_notified, v_invite
  from public.investor_deck_views v
  where v.session_id = p_session_id
  for update;

  if not found then
    return;  -- ingen rad för denna session → no-op
  end if;

  update public.investor_deck_views v
  set
    max_scroll_pct = greatest(v.max_scroll_pct, coalesce(p_max_scroll, 0)),
    seconds        = greatest(v.seconds, coalesce(p_seconds, 0)),
    last_seen_at   = now(),
    reached_ask    = v.reached_ask or coalesce(p_reached_ask, false),
    notified_ask   = v.notified_ask or coalesce(p_reached_ask, false)
  where v.session_id = p_session_id;

  v_newly := coalesce(p_reached_ask, false) and not coalesce(v_was_notified, false);
  if v_newly then
    select i.label into v_label from public.investor_invites i where i.id = v_invite;
  end if;

  newly_reached_ask := v_newly;
  label := v_label;
  return next;
end;
$$;

grant execute on function public.verify_investor_code(text) to anon, authenticated;
grant execute on function public.record_investor_open(uuid, text, text) to anon, authenticated;
grant execute on function public.mark_investor_notified(text, text) to anon, authenticated;
grant execute on function public.record_investor_engagement(text, int, int, boolean) to anon, authenticated;
```

- [ ] **Step 2: Applicera migrationen mot Supabase-projektet**

Ladda Supabase MCP-verktygen via ToolSearch (`apply_migration`, `list_tables`, `execute_sql`). Applicera filen mot projekt `msqfuywpbrteyrzjggsw`:
- `apply_migration` med `name: "investor_invites"` och `query:` = hela SQL:en ovan.

Expected: lyckas utan fel.

- [ ] **Step 3: Verifiera**

Kör via `list_tables` (schema `public`) — `investor_invites` och `investor_deck_views` ska finnas. Kör `execute_sql`:
```sql
select proname from pg_proc where proname in
('verify_investor_code','record_investor_open','mark_investor_notified','record_investor_engagement');
```
Expected: fyra rader.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260626120000_investor_invites.sql
git commit -m "feat(investerare): DB för flera koder + läs-spårning (tabeller, RLS, RPC:er)"
```

---

## Fas 2 — Signerad sessions-cookie + proxy

### Task 2: Skriv om `lib/investor-access.ts`

**Files:**
- Modify (overwrite): `apps/web/lib/investor-access.ts`

- [ ] **Step 1: Ersätt filens innehåll med exakt**

```ts
// Signerad sessions-cookie för investerardecket. Bär { label, sid } signerat
// med INVESTOR_DECK_SECRET. Web Crypto → funkar i både proxy- och Node-runtime.

export const INVESTOR_COOKIE = 'investor_access';

export type InvestorSession = { label: string; sid: string };

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function utf8ToBase64Url(s: string): string {
  return toBase64Url(new TextEncoder().encode(s));
}

function base64UrlToUtf8(s: string): string {
  return new TextDecoder().decode(fromBase64Url(s));
}

async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

/** Signerar en sessions-payload. Returnerar null om INVESTOR_DECK_SECRET saknas. */
export async function signSession(payload: InvestorSession): Promise<string | null> {
  const secret = process.env.INVESTOR_DECK_SECRET;
  if (!secret) return null;
  const body = utf8ToBase64Url(JSON.stringify(payload));
  const sig = await hmac(secret, body);
  return `${body}.${sig}`;
}

/** Verifierar en token och returnerar payloaden, eller null. */
export async function verifySession(token: string | undefined): Promise<InvestorSession | null> {
  const secret = process.env.INVESTOR_DECK_SECRET;
  if (!secret || !token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(secret, body);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const parsed = JSON.parse(base64UrlToUtf8(body)) as Partial<InvestorSession>;
    if (typeof parsed.label === 'string' && typeof parsed.sid === 'string') {
      return { label: parsed.label, sid: parsed.sid };
    }
    return null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: fel kvarstår tillfälligt i `proxy.ts` och `actions.ts` (de använder de gamla funktionerna) — åtgärdas i Task 3 och 4. Bekräfta att `investor-access.ts` SJÄLV inte har egna fel (läs felutskriften: inga fel ska peka på `lib/investor-access.ts`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/investor-access.ts
git commit -m "feat(investerare): signerad sessions-cookie (label+sid) med INVESTOR_DECK_SECRET"
```

### Task 3: Uppdatera `proxy.ts`

**Files:**
- Modify: `apps/web/proxy.ts`

- [ ] **Step 1: Byt importraden**

Ersätt `import { INVESTOR_COOKIE, verifyAccessToken } from './lib/investor-access';` med:
```ts
import { INVESTOR_COOKIE, verifySession } from './lib/investor-access';
```

- [ ] **Step 2: Ersätt gate-blocket**

Hitta det befintliga investerardeck-blocket (börjar med kommentaren `// Investerardeck — delad lösenordsgate.`) och ersätt HELA blocket med:

```ts
  // Investerardeck — delad lösenordsgate. Ligger utanför [locale].
  if (pathname === '/investerare' || pathname.startsWith('/investerare/')) {
    if (pathname === '/investerare/las-upp') {
      return NextResponse.next();
    }
    const secret = process.env.INVESTOR_DECK_SECRET;
    if (secret) {
      const session = await verifySession(request.cookies.get(INVESTOR_COOKIE)?.value);
      if (!session) {
        const url = request.nextUrl.clone();
        url.pathname = '/investerare/las-upp';
        url.searchParams.set('next', pathname);
        url.searchParams.set('lang', pathname.startsWith('/investerare/en') ? 'en' : 'sv');
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }
```

(Behåller fail-open när `INVESTOR_DECK_SECRET` saknas, och `?lang=`-vidarebefordran från den tidigare fixen.)

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: inga fel i `proxy.ts` längre (kvarvarande fel bara i `actions.ts`, åtgärdas i Task 4).

- [ ] **Step 4: Commit**

```bash
git add apps/web/proxy.ts
git commit -m "feat(investerare): proxy verifierar signerad sessions-cookie"
```

---

## Fas 3 — Unlock mot tabell + öppnat-mejl

### Task 4: Mejl-wrapper `lib/investor-notify.ts`

**Files:**
- Create: `apps/web/lib/investor-notify.ts`

- [ ] **Step 1: Skriv filen**

```ts
import { Resend } from 'resend';

type Meta = { locale?: string; maxScroll?: number };

function escapeHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Mejlar John när en investerare öppnar decket ('open') eller når the ask ('ask').
 * Graceful fallback: saknas RESEND_API_KEY loggas bara (inget kast).
 */
export async function notifyInvestorEvent(
  kind: 'open' | 'ask',
  label: string,
  meta: Meta = {},
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.INVESTOR_NOTIFY_EMAIL ?? process.env.CONTACT_TO_EMAIL ?? 'john@elevante.se';
  const headline =
    kind === 'open' ? `${label} öppnade investerardecket` : `${label} nådde ”the ask”`;

  if (!apiKey) {
    console.info('[investor-notify] Resend not configured, logging only:', { kind, label, meta });
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const rows = [
      `<h2>${escapeHtml(headline)}</h2>`,
      `<p><strong>Investerare:</strong> ${escapeHtml(label)}</p>`,
      meta.locale ? `<p><strong>Språk:</strong> ${escapeHtml(meta.locale)}</p>` : '',
      typeof meta.maxScroll === 'number'
        ? `<p><strong>Scroll-djup:</strong> ${meta.maxScroll}%</p>`
        : '',
    ];
    await resend.emails.send({
      from: 'Elevante <hej@elevante.se>',
      to,
      subject: `Investerardeck · ${headline}`,
      html: rows.filter(Boolean).join('\n'),
    });
  } catch (error) {
    console.error('[investor-notify] Resend error:', error);
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/lib/investor-notify.ts
git commit -m "feat(investerare): Resend-wrapper för öppnat/the-ask-mejl"
```

### Task 5: Skriv om unlock-action + form + .env.example

**Files:**
- Modify (overwrite): `apps/web/app/investerare/actions.ts`
- Modify: `apps/web/app/investerare/las-upp/UnlockForm.tsx`
- Modify: `apps/web/.env.example`

- [ ] **Step 1: Ersätt `actions.ts` med exakt**

```ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { INVESTOR_COOKIE, signSession } from '@/lib/investor-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyInvestorEvent } from '@/lib/investor-notify';

export type GateState = { error: boolean };

type VerifyRow = { invite_id: string; label: string };

export async function unlockInvestorDeck(_prev: GateState, formData: FormData): Promise<GateState> {
  const code = (formData.get('password') ?? '').toString().trim();
  const nextRaw = (formData.get('next') ?? '/investerare').toString();
  const next = nextRaw.startsWith('/investerare') ? nextRaw : '/investerare';
  const lang = (formData.get('lang') ?? 'sv').toString() === 'en' ? 'en' : 'sv';

  if (!code) return { error: true };

  const supabase = await createSupabaseServerClient();
  const rpc = supabase as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: VerifyRow[] | null }>;
  };

  const { data } = await rpc.rpc('verify_investor_code', { p_code: code });
  const invite = data?.[0];
  if (!invite) return { error: true };

  const sid = crypto.randomUUID();
  await rpc.rpc('record_investor_open', {
    p_invite_id: invite.invite_id,
    p_session_id: sid,
    p_locale: lang,
  });

  const token = await signSession({ label: invite.label, sid });
  if (token) {
    const store = await cookies();
    store.set(INVESTOR_COOKIE, token, {
      httpOnly: true,
      // Secure i produktion (HTTPS); av i lokal dev så cookien fungerar över http://localhost.
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/investerare',
      maxAge: 60 * 60 * 24 * 30, // 30 dagar
    });
  }

  await notifyInvestorEvent('open', invite.label, { locale: lang });
  await rpc.rpc('mark_investor_notified', { p_session_id: sid, p_kind: 'open' });

  redirect(next);
}
```

- [ ] **Step 2: Lägg till dolt `lang`-fält i `UnlockForm.tsx`**

I `apps/web/app/investerare/las-upp/UnlockForm.tsx`, direkt efter raden
`<input type="hidden" name="next" value={next} />`
lägg till:
```tsx
      <input type="hidden" name="lang" value={lang} />
```
(`lang` finns redan som prop på komponenten.)

- [ ] **Step 3: Uppdatera `.env.example`**

Ta bort raderna för `INVESTOR_DECK_PASSWORD` (kommentar + nyckel). Lägg till:
```
# Serverhemlighet som signerar investerardeckets sessions-cookie (valfri stark sträng).
INVESTOR_DECK_SECRET=
# Mottagare för investerardeck-notiser (default: CONTACT_TO_EMAIL → john@elevante.se).
INVESTOR_NOTIFY_EMAIL=
```

- [ ] **Step 4: Verifiera att inga referenser till INVESTOR_DECK_PASSWORD finns kvar**

Run: `cd apps/web && grep -rn "INVESTOR_DECK_PASSWORD" . --exclude-dir=node_modules || echo "clean"`
Expected: `clean`.

- [ ] **Step 5: Typecheck + lint + build**

Run: `cd apps/web && pnpm typecheck && pnpm lint && pnpm build`
Expected: alla rena; rutterna byggs.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/investerare/actions.ts apps/web/app/investerare/las-upp/UnlockForm.tsx apps/web/.env.example
git commit -m "feat(investerare): unlock verifierar kod mot tabell, sätter sessions-cookie, mejlar öppning"
```

---

## Fas 4 — Telemetri (scroll-djup + the ask)

### Task 6: `DeckTelemetry`-komponent

**Files:**
- Create: `apps/web/components/showcase/DeckTelemetry.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import { useEffect, useRef } from 'react';

/**
 * Mäter max scroll-%, aktiv tid (bara när fliken är synlig) och om "the ask"
 * (id="ask") nåtts. Skickar en beacon till /api/investerare/telemetry vid
 * intervall, vid the ask, och när fliken lämnas. Renderar inget.
 * Använder bara refs (ingen setState) → ingen react-hooks/set-state-in-effect.
 */
export default function DeckTelemetry({ askSelector = '#ask' }: { askSelector?: string }) {
  const maxScroll = useRef(0);
  const seconds = useRef(0);
  const reachedAsk = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const send = () => {
      if (!dirty.current) return;
      dirty.current = false;
      const body = JSON.stringify({
        maxScroll: maxScroll.current,
        seconds: seconds.current,
        reachedAsk: reachedAsk.current,
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

    const computeScroll = () => {
      const d = document.documentElement;
      const max = d.scrollHeight - d.clientHeight;
      const pct = max > 0 ? Math.round((d.scrollTop / max) * 100) : 0;
      if (pct > maxScroll.current) {
        maxScroll.current = pct;
        dirty.current = true;
      }
    };

    computeScroll();
    window.addEventListener('scroll', computeScroll, { passive: true });

    const timeTick = setInterval(() => {
      if (document.visibilityState === 'visible') {
        seconds.current += 1;
        dirty.current = true;
      }
    }, 1000);

    const askEl = document.querySelector(askSelector);
    let io: IntersectionObserver | null = null;
    if (askEl) {
      io = new IntersectionObserver(
        (entries) => {
          if (!reachedAsk.current && entries.some((e) => e.isIntersecting)) {
            reachedAsk.current = true;
            dirty.current = true;
            send(); // skicka direkt när the ask nås
          }
        },
        { threshold: 0.4 },
      );
      io.observe(askEl);
    }

    const sendTick = setInterval(send, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') send();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', send);

    return () => {
      window.removeEventListener('scroll', computeScroll);
      clearInterval(timeTick);
      clearInterval(sendTick);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', send);
      io?.disconnect();
      send();
    };
  }, [askSelector]);

  return null;
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/web && pnpm typecheck && pnpm lint`
Expected: rena (särskilt inga `react-hooks/set-state-in-effect`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/showcase/DeckTelemetry.tsx
git commit -m "feat(investerare): DeckTelemetry (scroll-djup, tid, the-ask) via sendBeacon"
```

### Task 7: API-route `/api/investerare/telemetry`

**Files:**
- Create: `apps/web/app/api/investerare/telemetry/route.ts`

- [ ] **Step 1: Skriv route-handlern**

```ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { INVESTOR_COOKIE, verifySession } from '@/lib/investor-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyInvestorEvent } from '@/lib/investor-notify';

type EngagementRow = { newly_reached_ask: boolean; label: string | null };

export async function POST(request: Request) {
  const store = await cookies();
  const session = await verifySession(store.get(INVESTOR_COOKIE)?.value);
  if (!session) return new NextResponse(null, { status: 204 });

  let payload: { maxScroll?: unknown; seconds?: unknown; reachedAsk?: unknown } = {};
  try {
    payload = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const maxScroll = Math.max(0, Math.min(100, Math.round(Number(payload.maxScroll) || 0)));
  const seconds = Math.max(0, Math.round(Number(payload.seconds) || 0));
  const reachedAsk = payload.reachedAsk === true;

  const supabase = await createSupabaseServerClient();
  const rpc = supabase as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: EngagementRow[] | null }>;
  };

  const { data } = await rpc.rpc('record_investor_engagement', {
    p_session_id: session.sid,
    p_max_scroll: maxScroll,
    p_seconds: seconds,
    p_reached_ask: reachedAsk,
  });

  const row = data?.[0];
  if (row?.newly_reached_ask && row.label) {
    await notifyInvestorEvent('ask', row.label, { maxScroll });
  }

  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 2: Typecheck + lint + build**

Run: `cd apps/web && pnpm typecheck && pnpm lint && pnpm build`
Expected: rena; `/api/investerare/telemetry` listas som route.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/investerare/telemetry/route.ts
git commit -m "feat(investerare): telemetri-endpoint uppdaterar engagemang + mejlar vid the ask"
```

### Task 8: Koppla in telemetri i `InvestorDeck`

**Files:**
- Modify: `apps/web/app/investerare/InvestorDeck.tsx`

- [ ] **Step 1: Importera och rendera `DeckTelemetry`**

Lägg importen bland de övriga showcase-importerna:
```tsx
import DeckTelemetry from '@/components/showcase/DeckTelemetry';
```
Rendera den högst upp i `<main>`, bredvid `<ScrollProgress />`:
```tsx
      <ScrollProgress />
      <DeckTelemetry />
```

- [ ] **Step 2: Ge ask-sektionen `id="ask"`**

Hitta ask-sektionen (den mörka `bg-ink`-sektionen, kommentar `{/* … ask … */}` eller motsvarande — den som renderar `COPY.ask.*`). Lägg till `id="ask"` på dess `<section>`-element, t.ex.:
```tsx
      <section id="ask" className="bg-ink px-6 py-24 text-canvas sm:px-10 sm:py-32">
```
(Ändra inte övriga klasser.)

- [ ] **Step 3: Typecheck + lint + build**

Run: `cd apps/web && pnpm typecheck && pnpm lint && pnpm build`
Expected: rena; `/investerare` + `/investerare/en` byggs.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/investerare/InvestorDeck.tsx
git commit -m "feat(investerare): rendera DeckTelemetry + id=ask på ask-sektionen"
```

---

## Fas 5 — Slutverifiering (end-to-end)

### Task 9: Seed + full flödesverifiering

**Files:** (inga kodändringar om allt funkar — annars fixa och committa)

- [ ] **Step 1: Sätt lokala env-variabler**

I `apps/web/.env.local` (gitignorerad): ta bort `INVESTOR_DECK_PASSWORD`-raden om den finns, och lägg till:
```
INVESTOR_DECK_SECRET=local-test-secret-0123456789
```
(Lämna `RESEND_API_KEY` osatt lokalt — mejlen loggas då bara, vilket är ok för verifiering.)

- [ ] **Step 2: Seeda två koder**

Via Supabase MCP `execute_sql`:
```sql
insert into public.investor_invites (label, code) values
  ('Luminar Ventures', 'luminar-2026'),
  ('Norrsken VC', 'norrsken-2026')
on conflict (code) do nothing;
```

- [ ] **Step 3: Starta preview** (`preview_start` "elevante-web"). Om servern redan kör: stoppa och starta om så env läses in.

- [ ] **Step 4: Gate blockerar** — navigera till `/investerare`. Expected: redirect till `/investerare/las-upp?next=/investerare&lang=sv`.

- [ ] **Step 5: Fel kod** — fyll `fel-kod`, submit. Expected: kvar på gate, "Fel lösenord."

- [ ] **Step 6: Rätt kod** — fyll `luminar-2026`, submit. Expected: redirect till `/investerare`, decket visas (19 sektioner). Kontrollera serverloggen: `[investor-notify] … { kind: 'open', label: 'Luminar Ventures' }`.

- [ ] **Step 7: Öppnings-rad skapad** — via `execute_sql`:
```sql
select i.label, v.session_id, v.locale, v.notified_open, v.reached_ask
from public.investor_deck_views v join public.investor_invites i on i.id = v.invite_id
order by v.opened_at desc limit 3;
```
Expected: en rad för Luminar Ventures, `notified_open = true`, `reached_ask = false`.

- [ ] **Step 8: Telemetri uppdaterar** — i preview, scrolla till botten (`preview_eval`: `window.scrollTo(0, document.body.scrollHeight)`), vänta ~2 s, och tvinga en beacon (`preview_eval`: dispatcha `document.dispatchEvent(new Event('visibilitychange'))` efter att ha satt `Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true})`, eller enklare: `preview_eval` som POST:ar `fetch('/api/investerare/telemetry',{method:'POST',body:JSON.stringify({maxScroll:100,seconds:30,reachedAsk:true})})`). Kör sedan:
```sql
select max_scroll_pct, seconds, reached_ask, notified_ask from public.investor_deck_views
order by opened_at desc limit 1;
```
Expected: `max_scroll_pct = 100`, `reached_ask = true`, `notified_ask = true`. Serverlogg: `[investor-notify] … { kind: 'ask', label: 'Luminar Ventures' }`.

- [ ] **Step 9: Andra koden separat** — i ett rent läge (rensa cookie via `preview_eval`: `document.cookie='investor_access=;path=/investerare;max-age=0'` och navigera om) lås upp med `norrsken-2026`. Expected: ny rad för Norrsken VC, egen session.

- [ ] **Step 10: Övriga rutter opåverkade** — `/rektor` och `/sv` renderar normalt (ingen gate).

- [ ] **Step 11: Slutgates**

Run: `cd apps/web && pnpm typecheck && pnpm lint && pnpm build`
Expected: alla rena.

- [ ] **Step 12: Commit ev. fixar**

```bash
git add -A
git commit -m "chore(investerare): slutverifiering flerkod + spårning"
```

---

## Self-Review (ifylld av planförfattaren)

**Spec-täckning:** Tabeller + RLS + 4 RPC:er (Task 1 ↔ spec §1–2); cookie-omskrivning + secret (Task 2 ↔ §3); proxy (Task 3 ↔ §4); unlock mot tabell + öppnat-mejl + ta bort PASSWORD (Task 4–5 ↔ §5, §7); telemetri-komponent + route + the-ask-mejl + `id="ask"` (Task 6–8 ↔ §6–7); hantera investerare via Supabase (Task 9 step 2 ↔ §8); slutverifiering (Task 9 ↔ acceptans). Alla spec-krav har en task.

**Placeholder-scan:** Inga TBD/TODO. All kod är fullständig. Step 8 i Task 9 ger ett konkret `fetch`-alternativ för att trigga beaconen deterministiskt.

**Typkonsistens:** `signSession`/`verifySession` + `InvestorSession` används enhetligt (Task 2 → 3, 5, 7). RPC-namn matchar migrationen: `verify_investor_code`, `record_investor_open`, `mark_investor_notified`, `record_investor_engagement`. RPC-argumentnamn (`p_code`, `p_invite_id`, `p_session_id`, `p_locale`, `p_max_scroll`, `p_seconds`, `p_reached_ask`, `p_kind`) matchar mellan SQL och anrop. `notifyInvestorEvent(kind, label, meta)`-signaturen matchar i action och route. `record_investor_engagement` returnerar `newly_reached_ask`+`label`, vilket routen läser.

**Beroendeordning:** DB (1) → cookie/proxy (2–3) → unlock/mejl (4–5) → telemetri (6–8) → verifiering (9). Inga framåtberoenden.
