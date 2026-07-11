# Loops.io som mejlmotor + separerade lead-källor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ersätt Resend med Loops.io som e-postmotor och koppla alla tre inkommande lead-flödena till CRM:et med en distinkt `Datakälla` per ingång.

**Architecture:** Ny server-only `lib/loops.ts` (fetch + timeout, graceful fallback) ersätter Resend i `contact.ts` och `investor-notify.ts`. Lead-källorna separeras via en utökad `CreatedVia`-typ och `Datakälla`-mappning. Kontaktformulärets demo/pris-inskick blir kodlösa prospects. En ny "Skicka kontaktmejl"-knapp i admin-CRM:et släpper en statisk Loops-mall till skolan och stämplar Notion `Kontaktad`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Server Actions, Supabase (service-role), Notion REST API, Loops REST API. Ingen testrunner finns i repot — QA-grinden är `pnpm typecheck` + `pnpm lint` + `pnpm build` + manuellt röktest, per CLAUDE.md.

**Verifieringskonvention:** Alla kommandon körs från `apps/web/`. Efter varje task: `pnpm typecheck` och `pnpm lint` ska vara gröna. Ett samlat bygg- och röktest ligger sist (Task 11).

---

## Filstruktur

- **Ny:** `apps/web/lib/loops.ts` — Loops-klient (contact/event/transactional + fallback).
- **Ny:** `apps/web/supabase/migrations/20260701140000_prospect_contacted_at.sql` — `contacted_at`-kolumn.
- **Ändras:** `apps/web/lib/notion.ts` — `dataSource`-typ + `markProspectContacted`.
- **Ändras:** `apps/web/lib/prospects.ts` — `CreatedVia`, `dataSourceLabel`, källprioritet.
- **Ändras:** `apps/web/app/actions/campaign.ts` — Typ 1 `school_lookup`, Typ 2 `price_lead` + Loops.
- **Ändras:** `apps/web/app/actions/contact.ts` — Typ 3 persistens + Loops-notis.
- **Ändras:** `apps/web/app/actions/crm.ts` — ny `sendProspectContactEmail`-action.
- **Ändras:** `apps/web/lib/investor-notify.ts` — Loops i stället för Resend.
- **Ändras:** `apps/web/lib/data/admin.ts` — `getProspects` + `ProspectListItem` nya fält.
- **Ändras:** `apps/web/components/app/admin/CrmProspectList.tsx` — ny knappkolumn.
- **Ny:** `apps/web/components/app/admin/SendContactEmailButton.tsx` — klientknapp.
- **Ändras:** `apps/web/app/[locale]/app/[role]/crm/page.tsx` — trådar ny label.
- **Ändras:** `apps/web/lib/i18n/locales/sv.ts` + `en.ts` — ny CRM-label.
- **Ändras:** `apps/web/app/[locale]/(public)/integritetspolicy/page.tsx` — Resend → Loops.
- **Ändras:** `apps/web/package.json` — ta bort `resend`.

---

### Task 1: Loops-klient (`lib/loops.ts`)

**Files:**
- Create: `apps/web/lib/loops.ts`

- [ ] **Step 1: Skriv modulen**

```typescript
import 'server-only';

const LOOPS = 'https://app.loops.so/api';

// Fetch med timeout + en retry med backoff, samma mönster som lib/skolverket.ts.
async function loopsFetch(path: string, body: unknown): Promise<Response> {
  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) throw new Error('NO_KEY');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(`${LOOPS}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      if (attempt === 1) throw err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

// Alla funktioner är fire-and-forget och kastar aldrig uppåt: saknas nyckel eller
// felar API:t loggas det bara. Persistens sker alltid före mejl hos anroparen.
export async function upsertLoopsContact(
  email: string,
  properties: Record<string, unknown>,
): Promise<void> {
  try {
    const res = await loopsFetch('/v1/contacts/update', { email, ...properties });
    if (!res.ok) console.error('[loops] contact update misslyckades:', res.status, await res.text());
  } catch (err) {
    if (String(err).includes('NO_KEY')) {
      console.info('[loops] LOOPS_API_KEY saknas — loggar kontakt:', { email, properties });
    } else {
      console.error('[loops] contact update error:', err);
    }
  }
}

export async function sendLoopsEvent(
  email: string,
  eventName: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const res = await loopsFetch('/v1/events/send', { email, eventName, eventProperties: properties });
    if (!res.ok) console.error('[loops] event misslyckades:', res.status, await res.text());
  } catch (err) {
    if (String(err).includes('NO_KEY')) {
      console.info('[loops] LOOPS_API_KEY saknas — loggar event:', { email, eventName, properties });
    } else {
      console.error('[loops] event error:', err);
    }
  }
}

export async function sendLoopsTransactional(
  transactionalId: string | undefined,
  email: string,
  dataVariables: Record<string, string> = {},
): Promise<void> {
  if (!transactionalId) {
    console.info('[loops] transactionalId saknas — loggar mejl:', { email, dataVariables });
    return;
  }
  try {
    const res = await loopsFetch('/v1/transactional', { email, transactionalId, dataVariables });
    if (!res.ok) console.error('[loops] transactional misslyckades:', res.status, await res.text());
  } catch (err) {
    if (String(err).includes('NO_KEY')) {
      console.info('[loops] LOOPS_API_KEY saknas — loggar mejl:', { email, transactionalId, dataVariables });
    } else {
      console.error('[loops] transactional error:', err);
    }
  }
}
```

- [ ] **Step 2: Verifiera typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS (inga fel).

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/loops.ts
git commit -m "feat(loops): server-only Loops-klient med graceful fallback"
```

---

### Task 2: Utöka källtyper + `markProspectContacted` (Notion)

**Files:**
- Modify: `apps/web/lib/notion.ts:17` (`dataSource`-typ) och slutet (ny funktion)
- Modify: `apps/web/lib/prospects.ts:12-15` (`CreatedVia` + `dataSourceLabel`)

- [ ] **Step 1: Uppdatera `dataSource`-typen i `notion.ts`**

Ersätt rad 17:

```typescript
  dataSource: 'Skoluppslag' | 'Prisberäknare-lead' | 'Kontaktformulär' | 'Prospektering' | 'Batch';
```

- [ ] **Step 2: Lägg till `markProspectContacted` sist i `notion.ts`**

```typescript
// Skriver ett äkta kontakt-event på kortet. Medvetet undantag från synk-regeln
// "rör aldrig Status" — detta är en manuell kontakt, inte en maskin-synk.
export async function markProspectContacted(pageId: string): Promise<void> {
  const token = process.env.NOTION_TOKEN;
  if (!token || !pageId) return;
  const now = new Date().toISOString();
  await fetch(`${NOTION}/pages/${pageId}`, {
    method: 'PATCH',
    headers: notionHeaders(token),
    body: JSON.stringify({
      properties: {
        Status: { select: { name: 'Kontaktad' } },
        'Senast kontaktad': { date: { start: now } },
        Kontaktväg: { select: { name: 'E-post' } },
      },
    }),
  }).catch((err) => console.error('[notion] markProspectContacted misslyckades:', err));
}
```

- [ ] **Step 3: Uppdatera `CreatedVia` + `dataSourceLabel` i `prospects.ts`**

Ersätt rad 12-15:

```typescript
type CreatedVia =
  | 'school_lookup' | 'price_lead' | 'contact_form' | 'admin_search' | 'batch';
const dataSourceLabel: Record<CreatedVia, NotionProspect['dataSource']> = {
  school_lookup: 'Skoluppslag', price_lead: 'Prisberäknare-lead',
  contact_form: 'Kontaktformulär', admin_search: 'Prospektering', batch: 'Batch',
};
```

- [ ] **Step 4: Uppdatera fallback i `toNotion` (prospects.ts rad ~37)**

Ersätt `?? 'Inbound-uppslag'` med `?? 'Skoluppslag'`:

```typescript
    dataSource: dataSourceLabel[(p.created_via as CreatedVia)] ?? 'Skoluppslag',
```

- [ ] **Step 5: Verifiera typecheck (fångar alla anropställen som skickar gamla createdVia-värden)**

Run: `pnpm typecheck`
Expected: FEL i `campaign.ts` och `cron/sync-prospects/route.ts` som fortfarande skickar `'inbound_lookup'`. Dessa fixas i Task 4/5. `admin_search` och `batch` är oförändrade och felar inte.

> Not: typecheck är rött här tills Task 4 och 5 är klara. Commit ändå — det är en atomär typändring som resten bygger på.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/notion.ts apps/web/lib/prospects.ts
git commit -m "feat(crm): separerade Datakälla-värden + markProspectContacted"
```

---

### Task 3: DB-migration — `contacted_at`-kolumn

**Files:**
- Create: `apps/web/supabase/migrations/20260701140000_prospect_contacted_at.sql`

- [ ] **Step 1: Skriv migrationen**

```sql
-- Lokal spårning av när kontaktmejlet släpptes från CRM:et (Typ 1).
-- Notion Status='Kontaktad' är källan för människor; denna kolumn styr knappens
-- inaktivering utan att läsa Notion per rad.
alter table public.school_prospects
  add column if not exists contacted_at timestamptz;
```

- [ ] **Step 2: Applicera mot prod-projektet**

Applicera via Supabase MCP `apply_migration` (projekt `msqfuywpbrteyrzjggsw`, name `prospect_contacted_at`) eller `supabase db push`. Verifiera med `list_tables` att kolumnen finns.

- [ ] **Step 3: Commit**

```bash
git add apps/web/supabase/migrations/20260701140000_prospect_contacted_at.sql
git commit -m "feat(db): school_prospects.contacted_at för CRM-kontaktmejl"
```

---

### Task 4: Typ 2 — prisberäknar-lead → `price_lead` + Loops

**Files:**
- Modify: `apps/web/app/actions/campaign.ts` (`submitCampaignLead`, rad ~81-90)

- [ ] **Step 1: Lägg till Loops-import högst upp i `campaign.ts`**

Efter rad 7 (`import { syncProspect }...`). `estimateAnnualPrice` importeras redan i filen — lägg bara till:

```typescript
import { upsertLoopsContact, sendLoopsEvent, sendLoopsTransactional } from '@/lib/loops';
```

- [ ] **Step 2: I `submitCampaignLead`, promota `created_via` till `price_lead` explicit i upserten (rad ~69-75)**

Lägg `created_via: 'price_lead'` i objektet som upsertas till `school_prospects`:

```typescript
    await supabase.from('school_prospects').upsert(
      { school_unit_code: code, school_name: name, students: Math.round(students),
        latest_lead_email: email, latest_lead_message: message, latest_lead_at: now,
        updated_at: now, created_via: 'price_lead',
        ...(isManual ? { enrichment_status: 'done' } : {}) },
      { onConflict: 'school_unit_code' },
    );
```

- [ ] **Step 3: Ersätt `after()`-blocket (rad ~81-90) så syncen kör `price_lead` + Loops**

```typescript
  after(async () => {
    try {
      await syncProspect({
        code, name, skolform: ['Gymnasieskolan'], createdVia: 'price_lead',
        students: Math.round(students), bumpLookup: false,
      });
    } catch (err) {
      console.error('[campaign] syncProspect efter lead misslyckades:', err);
    }
    await upsertLoopsContact(email, {
      source: 'price_lead', schoolName: name,
      students: Math.round(students), priceSek: estimateAnnualPrice(students), locale,
    });
    await sendLoopsEvent(email, 'intresseanmalan', { schoolName: name, locale });
    await sendLoopsTransactional(process.env.LOOPS_LEAD_NOTIS_ID, notifyTo(), {
      schoolName: name, students: String(Math.round(students)),
      leadEmail: email, message: message ?? '', replyToAddress: email,
    });
  });
```

- [ ] **Step 4: Lägg till `notifyTo`-hjälpare högst upp i `campaign.ts` (efter imports)**

```typescript
// Interna notiser går till John. Överstyrbart via env.
const notifyTo = () => process.env.CONTACT_TO_EMAIL ?? 'john@elevante.se';
```

- [ ] **Step 5: Verifiera typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS för campaign.ts (cron-route kan fortfarande vara röd tills Task 5 — den delar inte fil).

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/actions/campaign.ts
git commit -m "feat(campaign): prisberäknar-lead → price_lead + Loops kontakt/event/notis"
```

---

### Task 5: Typ 1 — skoluppslag → `school_lookup` + cron `batch` oförändrad

**Files:**
- Modify: `apps/web/app/actions/campaign.ts` (`getSchoolEstimate`, rad ~24-33)
- Modify: `apps/web/app/api/cron/sync-prospects/route.ts` (verifiera `batch`)

- [ ] **Step 1: Byt `createdVia` i `getSchoolEstimate` (rad ~27)**

```typescript
      await syncProspect({
        code, name, skolform: ['Gymnasieskolan'], createdVia: 'school_lookup',
        students, bumpLookup: true,
      });
```

- [ ] **Step 2: Bekräfta cron-routen använder `batch` (rad ~44) — ingen ändring behövs**

Run: `grep -n "createdVia" apps/web/app/api/cron/sync-prospects/route.ts`
Expected: `createdVia: 'batch'` — redan giltigt i den nya typen. Ingen ändring.

- [ ] **Step 3: Verifiera typecheck + lint (nu ska hela projektet vara grönt igen)**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/actions/campaign.ts
git commit -m "feat(campaign): skoluppslag → school_lookup (skiljt från lead)"
```

---

### Task 6: Typ 3 — kontaktformulär (demo/pris) → prospect + Loops-notis

**Files:**
- Modify: `apps/web/app/actions/contact.ts`

- [ ] **Step 1: Byt imports högst upp i `contact.ts`**

Ersätt `import { Resend } from 'resend';` med:

```typescript
import { after } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { syncProspect } from '@/lib/prospects';
import { sendLoopsTransactional } from '@/lib/loops';
```

- [ ] **Step 2: Lägg till en deterministisk hash-hjälpare (efter `escape`, rad ~40)**

```typescript
// Kort deterministisk kod för kodlösa kontaktformulär-rader: samma person + skola
// → samma rad (ingen dubblett). Inte kryptografisk, bara stabil.
function contactCode(email: string, school: string): string {
  const s = `${email.toLowerCase()}|${school.toLowerCase()}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `contact-${(h >>> 0).toString(36)}`;
}
```

- [ ] **Step 3: Ersätt hela Resend-blocket (rad ~71-113) med persistens + Loops**

```typescript
  // Persistens först (bara sälj-relevanta ämnen), mejl sekundärt.
  const isSalesLead = topic === 'demo' || topic === 'pricing';
  if (isSalesLead) {
    const code = contactCode(email, school);
    const now = new Date().toISOString();
    try {
      const supabase = createSupabaseServiceRoleClient();
      await supabase.from('school_prospects').upsert(
        { school_unit_code: code, school_name: school,
          latest_lead_email: email, latest_lead_message: message, latest_lead_at: now,
          created_via: 'contact_form', enrichment_status: 'done', updated_at: now },
        { onConflict: 'school_unit_code' },
      );
    } catch (err) {
      console.error('[contact] kunde inte spara prospect:', err);
    }
    after(async () => {
      try {
        await syncProspect({
          code, name: school, skolform: [], createdVia: 'contact_form',
          students: null, bumpLookup: false,
        });
      } catch (err) {
        console.error('[contact] syncProspect misslyckades:', err);
      }
    });
  }

  // Notis till John via Loops (alla ämnen).
  await sendLoopsTransactional(process.env.LOOPS_KONTAKT_NOTIS_ID, to, {
    name, email, school, topic, message, replyToAddress: email,
  });

  return { status: 'success' };
```

- [ ] **Step 4: Ta bort den nu oanvända `apiKey`-grinden och `to`-defaulten justeras**

Behåll `const to = process.env.CONTACT_TO_EMAIL ?? 'john@elevante.se';` (rad ~72). Ta bort raderna som läser `RESEND_API_KEY` och den `if (!apiKey)`-fallbacken (rad ~71, 77-86) — Loops-klienten har egen fallback.

- [ ] **Step 5: Verifiera typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/actions/contact.ts
git commit -m "feat(contact): demo/pris-inskick → prospect (contact_form) + Loops-notis"
```

---

### Task 7: Investerarnotiser → Loops + ta bort resend-dependency

**Files:**
- Modify: `apps/web/lib/investor-notify.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Skriv om `investor-notify.ts` att använda Loops**

```typescript
import { sendLoopsTransactional } from '@/lib/loops';

type Meta = { locale?: string; maxScroll?: number };

/**
 * Mejlar John när en investerare öppnar decket ('open') eller når the ask ('ask').
 * Graceful fallback via Loops-klienten: saknas nyckel loggas bara.
 */
export async function notifyInvestorEvent(
  kind: 'open' | 'ask',
  label: string,
  meta: Meta = {},
): Promise<void> {
  const to = process.env.INVESTOR_NOTIFY_EMAIL ?? 'john@elevante.se';
  const headline =
    kind === 'open' ? `${label} öppnade investerardecket` : `${label} nådde "the ask"`;
  await sendLoopsTransactional(process.env.LOOPS_INVESTOR_NOTIS_ID, to, {
    headline,
    investor: label,
    locale: meta.locale ?? '',
    maxScroll: typeof meta.maxScroll === 'number' ? `${meta.maxScroll}%` : '',
  });
}
```

- [ ] **Step 2: Ta bort `resend` ur `package.json`**

Ta bort raden `"resend": "^4.0.1",` ur `dependencies`.

- [ ] **Step 3: Installera om så lockfilen uppdateras**

Run (från repo-roten): `pnpm install`
Expected: `resend` borta ur `pnpm-lock.yaml`, inga andra ändringar.

- [ ] **Step 4: Bekräfta att ingen annan fil importerar `resend`**

Run: `grep -rn "from 'resend'" apps/web --include="*.ts" --include="*.tsx"`
Expected: inga träffar.

- [ ] **Step 5: Verifiera typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/investor-notify.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(investor): notiser via Loops, ta bort resend-dependency"
```

---

### Task 8: "Skicka kontaktmejl"-action (Typ 1 release)

**Files:**
- Modify: `apps/web/app/actions/crm.ts`

- [ ] **Step 1: Lägg till imports i `crm.ts`**

Efter rad 6 (`import { syncProspect }...`):

```typescript
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { sendLoopsTransactional } from '@/lib/loops';
import { markProspectContacted } from '@/lib/notion';
```

- [ ] **Step 2: Lägg till action sist i `crm.ts`**

```typescript
const contactSchema = z.object({ code: z.string().min(4).max(40) });

export type SendContactResult = { status: 'ok' | 'no-recipient' | 'error' };

export async function sendProspectContactEmail(
  input: z.infer<typeof contactSchema>,
): Promise<SendContactResult> {
  await requireAdmin();
  const { code } = contactSchema.parse(input);
  const supabase = createSupabaseServiceRoleClient();
  const { data: row } = await supabase
    .from('school_prospects')
    .select('school_name, municipality, contact_email, latest_lead_email, notion_page_id')
    .eq('school_unit_code', code)
    .single();
  if (!row) return { status: 'error' };
  const recipient = row.contact_email ?? row.latest_lead_email;
  if (!recipient) return { status: 'no-recipient' };
  try {
    await sendLoopsTransactional(process.env.LOOPS_SKOL_KONTAKT_ID, recipient, {
      schoolName: row.school_name, ort: row.municipality ?? '',
    });
    await supabase.from('school_prospects')
      .update({ contacted_at: new Date().toISOString() })
      .eq('school_unit_code', code);
    if (row.notion_page_id) await markProspectContacted(row.notion_page_id);
    return { status: 'ok' };
  } catch (err) {
    console.error('[crm] sendProspectContactEmail misslyckades:', err);
    return { status: 'error' };
  }
}
```

- [ ] **Step 3: Verifiera typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/actions/crm.ts
git commit -m "feat(crm): sendProspectContactEmail — statiskt Loops-mejl + Notion-stämpel"
```

---

### Task 9: CRM-lista — nytt fält, knapp och i18n

**Files:**
- Modify: `apps/web/lib/data/admin.ts` (`ProspectListItem` + `getProspects`)
- Create: `apps/web/components/app/admin/SendContactEmailButton.tsx`
- Modify: `apps/web/components/app/admin/CrmProspectList.tsx`
- Modify: `apps/web/app/[locale]/app/[role]/crm/page.tsx`
- Modify: `apps/web/lib/i18n/locales/sv.ts` + `en.ts`

- [ ] **Step 1: Utöka `ProspectListItem` + select i `admin.ts`**

Lägg tre fält i typen (efter `createdVia: string;`):

```typescript
  contactEmail: string | null;
  latestLeadEmail: string | null;
  contactedAt: string | null;
```

Utöka `.select(...)` i `getProspects` med `contact_email, latest_lead_email, contacted_at` och mappningen:

```typescript
    contactEmail: r.contact_email,
    latestLeadEmail: r.latest_lead_email,
    contactedAt: r.contacted_at,
```

- [ ] **Step 2: Skapa knappen `SendContactEmailButton.tsx`**

```typescript
'use client';
import { useState, useTransition } from 'react';
import { sendProspectContactEmail } from '@/app/actions/crm';

export function SendContactEmailButton({
  code, disabled, label, sentLabel,
}: {
  code: string; disabled: boolean; label: string; sentLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  if (disabled && !sent) return <span className="text-xs text-ink/40">—</span>;
  if (sent) return <span className="text-xs text-ink/50">{sentLabel}</span>;

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          const res = await sendProspectContactEmail({ code });
          if (res.status === 'ok') setSent(true);
        })
      }
      disabled={pending}
      className="rounded-lg border border-ink/15 bg-canvas px-2.5 py-1 text-xs text-ink/70 disabled:opacity-50"
    >
      {pending ? '…' : label}
    </button>
  );
}
```

- [ ] **Step 3: Trå in knappen i `CrmProspectList.tsx`**

Utöka `Dict`-typen med `sendContact: string;` och `sentContact: string;`. Utöka `ProspectListItem`-import (redan där). I raden efter `<ResyncButton .../>` lägg:

```tsx
                <SendContactEmailButton
                  code={p.code}
                  disabled={!(p.contactEmail ?? p.latestLeadEmail) || Boolean(p.contactedAt)}
                  label={dict.sendContact}
                  sentLabel={dict.sentContact}
                />
```

Lägg importen överst: `import { SendContactEmailButton } from './SendContactEmailButton';`

- [ ] **Step 4: Skicka nya labels från `crm/page.tsx`**

I `dict={{ ... }}` till `CrmProspectList`, lägg: `sendContact: t.sendContact, sentContact: t.sentContact,`.

- [ ] **Step 5: Lägg labels i `sv.ts` (crm-blocket rad ~444) och `en.ts`**

`sv.ts`:

```typescript
          sendContact: 'Skicka kontaktmejl',
          sentContact: 'Kontaktad',
```

`en.ts` (motsvarande crm-block):

```typescript
          sendContact: 'Send intro email',
          sentContact: 'Contacted',
```

- [ ] **Step 6: Verifiera typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. (Typecheck fångar om `en.ts` saknar nycklarna.)

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/data/admin.ts apps/web/components/app/admin/ apps/web/app/[locale]/app/[role]/crm/page.tsx apps/web/lib/i18n/locales/
git commit -m "feat(crm): Skicka kontaktmejl-knapp i prospektlistan"
```

---

### Task 10: Integritetspolicy — Resend → Loops

**Files:**
- Modify: `apps/web/app/[locale]/(public)/integritetspolicy/page.tsx`

- [ ] **Step 1: Hitta Resend-omnämnandet**

Run: `grep -n "Resend\|resend" apps/web/app/[locale]/(public)/integritetspolicy/page.tsx`

- [ ] **Step 2: Byt "Resend" mot "Loops" som personuppgiftsbiträde för e-post**

Ersätt namnet Resend med Loops (Loops Inc., USA) i biträdeslistan. Behåll formuleringen om att kontaktdata (ej elevdata) behandlas för att svara på förfrågningar. Gör i båda locale-grenarna om texten är hårdkodad per språk.

- [ ] **Step 3: Verifiera typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/[locale]/(public)/integritetspolicy/page.tsx"
git commit -m "docs(privacy): Loops ersätter Resend som personuppgiftsbiträde"
```

---

### Task 11: Samlad verifiering (bygge + röktest)

**Files:** inga (verifiering).

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: PASS, alla rutter genereras.

- [ ] **Step 2: Röktest utan `LOOPS_API_KEY` (fallback-loggning)**

Starta dev-servern. Testa i tur och ordning, och verifiera i serverkonsolen + Supabase `school_prospects`:
1. `/sv/vad-kostar-elevante` → sök en skola, klicka → rad med `created_via='school_lookup'`.
2. Samma sida → fyll lead-formuläret → samma/annan rad blir `created_via='price_lead'`, konsol loggar `[loops] ... event` + `... transactional`.
3. `/sv/kontakt` → skicka med ämne "demo" → ny rad `contact-<hash>`, `created_via='contact_form'`, `enrichment_status='done'`. Skicka med ämne "press" → ingen rad skapas.

- [ ] **Step 3: Verifiera admin-knappen**

Logga in som admin → `/sv/app/admin/crm`. En rad med `contact_email` eller `latest_lead_email` visar "Skicka kontaktmejl". Klicka → knappen blir "Kontaktad", `contacted_at` sätts i DB. En rad utan mottagare visar "—".

- [ ] **Step 4: Grep-kontroll att Resend är helt borta**

Run: `grep -rn "resend\|Resend\|RESEND_API_KEY" apps/web --include="*.ts" --include="*.tsx" --include="*.json" | grep -v node_modules`
Expected: inga funktionella träffar (ev. kvar bara i historik/kommentar — ta bort om så).

- [ ] **Step 5: Slutcommit om något justerats**

```bash
git add -A && git commit -m "chore: verifiering Loops-migrering + lead-källor"
```

---

## Manuella steg utanför koden (checklista för John, ej blockerande för implementation)

- [ ] Verifiera elevante.se i Loops → DNS (SPF/DKIM) hos Loopia.
- [ ] Skapa transactional-mallar och kopiera IDs: skol-kontaktmejl (variabler `schoolName`, `ort`); lead-notis, kontakt-notis, investerar-notis (alla med `replyToAddress` i "Reply to"-fältet).
- [ ] Bygg loopen `event: intresseanmalan → bekräftelsemejl` i Loops UI.
- [ ] Sätt i Vercel + `.env.local`: `LOOPS_API_KEY`, `LOOPS_SKOL_KONTAKT_ID`, `LOOPS_LEAD_NOTIS_ID`, `LOOPS_KONTAKT_NOTIS_ID`, `LOOPS_INVESTOR_NOTIS_ID`.
- [ ] Skapa/verifiera de tre nya `Datakälla`-optionerna + byt `Admin-sök` → `Prospektering` i Notion leads-DB. Lägg select-värdet `E-post` på `Kontaktväg` om det saknas.
```
