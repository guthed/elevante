# `/try`-delning (tipsa kollega → mejl + leads) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En "Tipsa en kollega"-funktion på `/try` som skickar ett mejl (Resend) till kollegan, loggar delningen i Supabase, och skapar leads (avsändare + mottagare) i en egen Notion-DB "📤 Elevante – Delningar".

**Architecture:** Client-formulär (`ShareTeaser`, `useActionState`) → Server Action `shareTry` (Zod-liknande validering + honeypot + IP-rate-limit) → primär logg i Supabase `try_shares` → Resend-mejl (graceful fallback) → best-effort Notion-loggning. Notion-DB:n och Supabase-migrationen sätts upp av controllern via MCP (infra-steg).

**Tech Stack:** Next.js 16 Server Actions, `resend`, Supabase (service-role), Notion REST API (`fetch`), Tailwind v4.

**Verifiering (repo-konvention):** inget testramverk — varje task verifieras med `pnpm --filter @elevante/web typecheck` + `lint`, och funktions-tasken med en riktig test-delning (Supabase-rad + Notion-rad + mejl-loggning).

---

## Filstruktur

**Nya filer:**
- `supabase/migrations/20260711120000_try_shares.sql` — tabellen.
- `apps/web/lib/try/share-log.ts` — Supabase-insert, rate-limit-läsning, Notion-skrivning (server-only). Håller all delnings-loggning på ett ställe, skilt från skol-CRM:et i `lib/notion.ts`.
- `apps/web/app/actions/try-share.ts` — Server Action `shareTry`.
- `apps/web/components/try/ShareTeaser.tsx` — formuläret (client).

**Modifierade filer:**
- `apps/web/lib/supabase/database.ts` — regenererade typer (får `try_shares`). Controller-steg via MCP.
- `apps/web/lib/try/copy.ts` — delnings-copy.
- `apps/web/app/[locale]/(public)/try/page.tsx` — rendera `ShareTeaser` i avslutet.
- `apps/web/.env.example` — `NOTION_SHARES_DATABASE_ID`.

**Infra (controller gör via MCP, inte subagent):**
- Skapa Notion-DB "📤 Elevante – Delningar" → id till `NOTION_SHARES_DATABASE_ID`.
- Applicera migrationen mot prod (`msqfuywpbrteyrzjggsw`).
- Regenerera Supabase-typer.

---

## Task 1: Supabase-migration `try_shares` (+ applicera + regenerera typer)

**Files:**
- Create: `supabase/migrations/20260711120000_try_shares.sql`
- Modify (controller via MCP): `apps/web/lib/supabase/database.ts`

- [ ] **Step 1: Skriv migrationen**

```sql
-- Delningar från /try (tipsa en kollega). Primär logg + rate-limit-underlag.
create table if not exists public.try_shares (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null,
  sender_email text not null,
  recipient_email text not null,
  message text,
  locale text not null default 'sv',
  ip text,
  created_at timestamptz not null default now()
);

-- Bara service-role (kringgår RLS) skriver/läser. Ingen publik access.
alter table public.try_shares enable row level security;

create index if not exists try_shares_created_at_idx on public.try_shares (created_at desc);
create index if not exists try_shares_ip_created_idx on public.try_shares (ip, created_at desc);
```

- [ ] **Step 2: (Controller, via Supabase-MCP) applicera migrationen mot prod**

Kör `apply_migration` mot projekt `msqfuywpbrteyrzjggsw` med namn `try_shares` och SQL:en ovan. Expected: success, tabellen finns i `public`.

- [ ] **Step 3: (Controller, via Supabase-MCP) regenerera TypeScript-typer**

Kör `generate_typescript_types` för `msqfuywpbrteyrzjggsw` och skriv resultatet till `apps/web/lib/supabase/database.ts`. Verifiera att `try_shares` finns i `Database['public']['Tables']`.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @elevante/web typecheck`
Expected: inga fel (typen `try_shares` finns nu).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260711120000_try_shares.sql apps/web/lib/supabase/database.ts
git commit -m "feat(try): try_shares-tabell + regenererade Supabase-typer"
```

---

## Task 2: `lib/try/share-log.ts` — Supabase + rate-limit + Notion

**Files:**
- Create: `apps/web/lib/try/share-log.ts`

- [ ] **Step 1: Skriv modulen**

```typescript
import 'server-only';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

const NOTION = 'https://api.notion.com/v1';

export type ShareRecord = {
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  message: string | null;
  locale: string;
  ip: string;
};

/** Primär logg i Supabase. Kastar vid fel (anroparen behandlar som generic). */
export async function insertShare(s: ShareRecord): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from('try_shares').insert({
    sender_name: s.senderName,
    sender_email: s.senderEmail,
    recipient_email: s.recipientEmail,
    message: s.message,
    locale: s.locale,
    ip: s.ip,
  });
  if (error) throw new Error(`try_shares insert: ${error.message}`);
}

/** Antal delningar från denna IP senaste timmen (rate-limit-underlag). */
export async function shareCountLastHour(ip: string): Promise<number> {
  const supabase = createSupabaseServiceRoleClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('try_shares')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', since);
  if (error) return 0; // fail-open: loggningen är det primära, inte spärren
  return count ?? 0;
}

function notionHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
}

const title = (t: string) => ({ title: [{ text: { content: t.slice(0, 200) } }] });
const rich = (t: string) =>
  t ? { rich_text: [{ text: { content: t.slice(0, 1900) } }] } : { rich_text: [] };

async function createDelningRow(props: Record<string, unknown>): Promise<void> {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_SHARES_DATABASE_ID;
  if (!token || !databaseId) {
    console.warn('[try-share] Notion env saknas — hoppar över.');
    return;
  }
  const res = await fetch(`${NOTION}/pages`, {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify({ parent: { database_id: databaseId }, properties: props }),
  });
  if (!res.ok) {
    console.error(`[try-share] Notion ${res.status}: ${await res.text()}`);
  }
}

/** Loggar mottagare + avsändare som två rader i Delningar-DB:n (best-effort). */
export async function logShareToNotion(s: ShareRecord): Promise<void> {
  await createDelningRow({
    Namn: title(s.recipientEmail),
    'E-post': { email: s.recipientEmail },
    Roll: { select: { name: 'Mottagare' } },
    'Delad av': rich(`${s.senderName} <${s.senderEmail}>`),
    Meddelande: rich(s.message ?? ''),
    Status: { select: { name: 'Ny' } },
  });
  await createDelningRow({
    Namn: title(s.senderName),
    'E-post': { email: s.senderEmail },
    Roll: { select: { name: 'Avsändare' } },
    Status: { select: { name: 'Ny' } },
  });
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint`
Expected: inga fel (kräver att Task 1 gett `try_shares` i typerna).

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/try/share-log.ts
git commit -m "feat(try): share-log — Supabase-insert, rate-limit, Notion-skrivning"
```

---

## Task 3: (Controller via Notion-MCP) skapa "📤 Elevante – Delningar"-DB

**Ingen kodfil — controllern gör detta via MCP och noterar id:t.**

- [ ] **Step 1: Skapa databasen**

Skapa en Notion-databas under Elevante-sidan (`19884c8f-289e-80cb-9fbc-cf86dc860aef`), titel "📤 Elevante – Delningar", med properties:
- `Namn` — title
- `E-post` — email
- `Roll` — select: `Avsändare`, `Mottagare`
- `Delad av` — rich_text
- `Meddelande` — rich_text
- `Status` — select: `Ny`, `Kontaktad`, `Kvalificerad`, `Vunnen`, `Tappad`
- (`Skapad` — created_time; skapas automatiskt av Notion, valfritt att lägga till en explicit)

- [ ] **Step 2: Notera databas-id → env**

Sätt `NOTION_SHARES_DATABASE_ID=<nytt-id>` i `apps/web/.env.local` (för lokal verifiering). Notera för användaren att samma env måste sättas i Vercel (prod) tillsammans med befintlig `NOTION_TOKEN`.

- [ ] **Step 3: Verifiera skrivning**

Efter Task 2 finns `logShareToNotion`. Verifieras i Task 8 (funktionstest) — en test-delning ska skapa två rader i DB:n.

---

## Task 4: Delnings-copy i `lib/try/copy.ts`

**Files:**
- Modify: `apps/web/lib/try/copy.ts`

- [ ] **Step 1: Lägg copy-nycklarna** (i `TRY_COPY`, t.ex. efter `forSchools`)

```typescript
  // Delning (tipsa en kollega)
  shareTitle: { sv: 'Känner du någon som borde se det här?', en: 'Know someone who should see this?' },
  shareHint: {
    sv: 'Tipsa en kollega — vi skickar dem en länk att prova själva.',
    en: 'Tip a colleague — we’ll send them a link to try it themselves.',
  },
  shareName: { sv: 'Ditt namn', en: 'Your name' },
  shareYourEmail: { sv: 'Din mejl', en: 'Your email' },
  shareColleagueEmail: { sv: 'Kollegans mejl', en: 'Colleague’s email' },
  shareMessage: { sv: 'Hälsning (valfritt)', en: 'Message (optional)' },
  shareSend: { sv: 'Skicka tipset', en: 'Send the tip' },
  shareSending: { sv: 'Skickar…', en: 'Sending…' },
  shareThanks: {
    sv: 'Tack — vi har skickat tipset till {recipient}.',
    en: 'Thanks — we’ve sent the tip to {recipient}.',
  },
  shareErrorMissing: {
    sv: 'Fyll i ditt namn och två giltiga mejladresser.',
    en: 'Enter your name and two valid email addresses.',
  },
  shareErrorRate: {
    sv: 'Du har delat många gånger nyss — försök igen om en stund.',
    en: 'You’ve shared a lot recently — try again in a bit.',
  },
  shareErrorGeneric: {
    sv: 'Kunde inte skicka just nu. Försök igen om en stund.',
    en: 'Couldn’t send right now. Please try again in a moment.',
  },
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/try/copy.ts
git commit -m "feat(try): copy för delnings-formuläret"
```

---

## Task 5: Server Action `shareTry`

**Files:**
- Create: `apps/web/app/actions/try-share.ts`

- [ ] **Step 1: Skriv Server Action**

```typescript
'use server';

import { headers } from 'next/headers';
import { Resend } from 'resend';
import {
  insertShare,
  shareCountLastHour,
  logShareToNotion,
  type ShareRecord,
} from '@/lib/try/share-log';

export type ShareState =
  | { status: 'idle' }
  | { status: 'success'; recipient: string }
  | { status: 'error'; code: 'missing' | 'rate-limit' | 'generic' };

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function escape(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const MAX_PER_HOUR = 5;

export async function shareTry(
  _prev: ShareState,
  formData: FormData,
): Promise<ShareState> {
  // Honeypot — bots fyller ofta i dolda fält
  const honeypot = formData.get('website');
  if (typeof honeypot === 'string' && honeypot.length > 0) {
    return { status: 'success', recipient: '' };
  }

  const senderName = (formData.get('senderName') ?? '').toString().trim().slice(0, 100);
  const senderEmail = (formData.get('senderEmail') ?? '').toString().trim();
  const recipientEmail = (formData.get('recipientEmail') ?? '').toString().trim();
  const message = (formData.get('message') ?? '').toString().trim().slice(0, 500);
  const locale = (formData.get('locale') ?? 'sv').toString() === 'en' ? 'en' : 'sv';

  if (!senderName || !isEmail(senderEmail) || !isEmail(recipientEmail)) {
    return { status: 'error', code: 'missing' };
  }
  if (senderEmail.toLowerCase() === recipientEmail.toLowerCase()) {
    return { status: 'error', code: 'missing' };
  }

  const headerList = await headers();
  const ip =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerList.get('x-real-ip') ??
    'unknown';

  if (ip !== 'unknown' && (await shareCountLastHour(ip)) >= MAX_PER_HOUR) {
    return { status: 'error', code: 'rate-limit' };
  }

  const record: ShareRecord = {
    senderName,
    senderEmail,
    recipientEmail,
    message: message || null,
    locale,
    ip,
  };

  // Primär logg — fäller vid fel
  try {
    await insertShare(record);
  } catch (err) {
    console.error('[try-share] insert error:', err);
    return { status: 'error', code: 'generic' };
  }

  // Mejl via Resend (graceful fallback om nyckel saknas)
  const apiKey = process.env.RESEND_API_KEY;
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://www.elevante.se';
  const link = `${base}/${locale}/try`;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const sv = locale === 'sv';
      const subject = sv
        ? `${senderName} tror att Elevante kan vara något för dig`
        : `${senderName} thinks Elevante might be for you`;
      const greeting = message ? `<p>${escape(message)}</p>` : '';
      const html = sv
        ? `<p>Hej!</p><p>${escape(senderName)} har testat Elevante och ville tipsa dig.</p>${greeting}<p><a href="${link}">Prova själv — ingen inloggning</a></p>`
        : `<p>Hi!</p><p>${escape(senderName)} tried Elevante and wanted to share it with you.</p>${greeting}<p><a href="${link}">Try it yourself — no sign-in</a></p>`;
      await resend.emails.send({
        from: 'Elevante <hej@elevante.se>',
        to: recipientEmail,
        replyTo: senderEmail,
        subject,
        html,
      });
    } catch (err) {
      console.error('[try-share] Resend error:', err);
      // fäller inte — loggen är redan gjord
    }
  } else {
    console.info('[try-share] Resend not configured, logging only:', record);
  }

  // Notion best-effort
  try {
    await logShareToNotion(record);
  } catch (err) {
    console.error('[try-share] Notion error:', err);
  }

  return { status: 'success', recipient: recipientEmail };
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/actions/try-share.ts
git commit -m "feat(try): shareTry Server Action — validering, rate-limit, Resend, loggning"
```

---

## Task 6: `ShareTeaser`-komponenten

**Files:**
- Create: `apps/web/components/try/ShareTeaser.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
'use client';

import { useActionState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { TRY_COPY, tr } from '@/lib/try/copy';
import { shareTry, type ShareState } from '@/app/actions/try-share';

const initial: ShareState = { status: 'idle' };

const fieldClass =
  'w-full rounded-full border border-[var(--color-sand)] bg-[var(--color-surface)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)]';

export function ShareTeaser({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(shareTry, initial);

  if (state.status === 'success') {
    return (
      <div
        aria-live="polite"
        className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6 text-[0.9375rem] text-[var(--color-ink)]"
      >
        {tr(locale, TRY_COPY.shareThanks).replace('{recipient}', state.recipient)}
      </div>
    );
  }

  const errorText =
    state.status === 'error'
      ? state.code === 'rate-limit'
        ? tr(locale, TRY_COPY.shareErrorRate)
        : state.code === 'generic'
          ? tr(locale, TRY_COPY.shareErrorGeneric)
          : tr(locale, TRY_COPY.shareErrorMissing)
      : null;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot — dolt för människor, bots fyller i det */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="senderName"
          required
          maxLength={100}
          aria-label={tr(locale, TRY_COPY.shareName)}
          placeholder={tr(locale, TRY_COPY.shareName)}
          className={fieldClass}
        />
        <input
          name="senderEmail"
          type="email"
          required
          aria-label={tr(locale, TRY_COPY.shareYourEmail)}
          placeholder={tr(locale, TRY_COPY.shareYourEmail)}
          className={fieldClass}
        />
      </div>
      <input
        name="recipientEmail"
        type="email"
        required
        aria-label={tr(locale, TRY_COPY.shareColleagueEmail)}
        placeholder={tr(locale, TRY_COPY.shareColleagueEmail)}
        className={fieldClass}
      />
      <textarea
        name="message"
        rows={2}
        maxLength={500}
        aria-label={tr(locale, TRY_COPY.shareMessage)}
        placeholder={tr(locale, TRY_COPY.shareMessage)}
        className="w-full rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)]"
      />

      {errorText ? (
        <p aria-live="polite" className="text-[0.875rem] text-[var(--color-coral)]">
          {errorText}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--color-ink)] px-6 py-3 text-[0.9375rem] font-medium text-[var(--color-canvas)] transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? tr(locale, TRY_COPY.shareSending) : tr(locale, TRY_COPY.shareSend)}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint`
Expected: inga fel.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/try/ShareTeaser.tsx
git commit -m "feat(try): ShareTeaser — tipsa-en-kollega-formulär"
```

---

## Task 7: Rendera `ShareTeaser` i avslutet + env-example

**Files:**
- Modify: `apps/web/app/[locale]/(public)/try/page.tsx`
- Modify: `apps/web/.env.example`

- [ ] **Step 1: Importera och rendera i avsluts-sektionen**

I `page.tsx`, lägg importen bredvid de andra `@/components/try`-importerna:
```tsx
import { ShareTeaser } from '@/components/try/ShareTeaser';
```

I avsluts-`<section>`:en, under CTA-blocket (efter `</div>` som stänger CTA-kolumnen men inuti `<Container>`/grid), lägg ett eget block som spänner båda kolumnerna på desktop. Konkret: efter grid-diven med foto+CTA, lägg en ny rad i samma `Container`:
```tsx
          <div className="mt-12 border-t border-[var(--color-sand)] pt-10">
            <h3 className="font-serif text-[clamp(1.375rem,1.5vw+1rem,1.75rem)] leading-tight text-[var(--color-ink)]">
              {tr(locale, TRY_COPY.shareTitle)}
            </h3>
            <p className="mb-5 mt-2 max-w-md text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {tr(locale, TRY_COPY.shareHint)}
            </p>
            <div className="max-w-xl">
              <ShareTeaser locale={locale} />
            </div>
          </div>
```
(Placera den inuti `<Container width="wide">` i avsluts-sektionen, direkt efter grid-diven `grid items-center gap-8 md:grid-cols-2 …` och dess stängande `</div>`.)

- [ ] **Step 2: Lägg env-nyckeln i `.env.example`**

I `apps/web/.env.example`, i Notion-blocket:
```
NOTION_SHARES_DATABASE_ID
```

- [ ] **Step 3: Typecheck + lint + build**

Run: `pnpm --filter @elevante/web typecheck && pnpm --filter @elevante/web lint && pnpm --filter @elevante/web build`
Expected: allt grönt; `/[locale]/try` byggs.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/[locale]/(public)/try/page.tsx" apps/web/.env.example
git commit -m "feat(try): rendera delnings-formuläret i avslutet + env-example"
```

---

## Task 8: Funktionsverifiering (controller, live)

- [ ] **Step 1: Säkerställ env lokalt**

`apps/web/.env.local` har `NOTION_TOKEN`, `NOTION_SHARES_DATABASE_ID` (från Task 3), `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`. `RESEND_API_KEY` valfritt (utan → mejl-loggning i konsolen).

- [ ] **Step 2: Kör dev + gör en test-delning**

`preview_start` → `/sv/try` → scrolla till "Känner du någon…" → fyll i namn + två mejl + hälsning → skicka. Expected: bekräftelse "Tack — vi har skickat tipset till …".

- [ ] **Step 3: Verifiera loggning**

- Supabase: `select * from public.try_shares order by created_at desc limit 1;` (via Supabase-MCP `execute_sql`) → raden finns.
- Notion: två nya rader i "📤 Elevante – Delningar" (Mottagare + Avsändare) — verifiera via MCP `query_data_sources`.
- Mejl: med `RESEND_API_KEY` → brev skickat; utan → `[try-share] Resend not configured` i `preview_logs`.

- [ ] **Step 4: Verifiera skydd**

- Ogiltig mejl → `shareErrorMissing`. Avsändare = mottagare → samma fel.
- Honeypot ifyllt (via devtools) → "success" men ingen rad i Supabase.
- Rate-limit: >5 delningar/timme från samma IP → `shareErrorRate`.

- [ ] **Step 5: A11y + mobil**

375px: formuläret staplar rent, ingen overflow; `aria-live` på bekräftelse/fel; alla fält har label.

---

## Self-Review (ifylld)

**Spec-täckning:**
- Mejl via Resend till mottagaren (reply-to avsändaren) → Task 5.
- Logga samtliga (avsändare + mottagare) → Task 5 (`logShareToNotion`) + Task 2.
- Egen "Delningar"-DB → Task 3 (skapas via MCP) + Task 2 (skriver dit).
- Alltid synlig delnings-sektion i avslutet → Task 7.
- Missbruksskydd (honeypot, rate-limit, giltiga mejl, sender krävs) → Task 5.
- Supabase primär logg → Task 1 + 2 + 5.
- Tvåspråkig copy, a11y, graceful fallback → Task 4, 6, 8.
- `NOTION_SHARES_DATABASE_ID` env → Task 3 + 7.

**Placeholder-scan:** all kod är komplett; enda "controller gör via MCP"-stegen (skapa DB, applicera migration, regen typer) är infra som inte kan uttryckas som kod — de har exakta instruktioner.

**Typkonsistens:** `ShareRecord` definieras i Task 2 och konsumeras i Task 5. `ShareState` definieras i Task 5 och konsumeras i Task 6. Copy-nycklar i Task 4 matchar `tr(locale, TRY_COPY.share*)` i Task 6/7. `try_shares`-kolumnnamn i migrationen (Task 1) matchar insert i Task 2.
