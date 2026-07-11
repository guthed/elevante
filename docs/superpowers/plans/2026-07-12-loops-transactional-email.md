# Loops transaktionell mejl — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrera all transaktionell mejl (kontakt, `/try`-delning, investerardeck-notiser) från Resend till Loops och ta bort Resend helt.

**Architecture:** Ett server-only adapter-lager (`lib/loops.ts`) mot Loops REST-API:t. Server Actions/hjälpare anropar `sendLoopsTransactional(transactionalId, email, dataVariables)` efter persistens. All copy bor i Loops-mallarna; koden skickar bara data. Resend (dep + kod + env) tas bort.

**Tech Stack:** Next.js 16 App Router (Server Actions), TypeScript, Loops transactional API (raw `fetch`), pnpm.

**Testnotis:** Repot har ingen enhetstest-runner. "Grön gate" per task = `pnpm exec tsc --noEmit` + `pnpm run lint`; slutlig verifiering = `pnpm run build` + skarp prod-rök-test (efter mallar + env). Detta ersätter TDD-stegen; skriv ingen ny testrunner.

**Manuellt Loops-beroende (utanför koden, görs parallellt/innan prod-verifiering):** två nya delnings-mallar (sv + en) skapas i Loops UI enligt specen. Koden degraderar tyst tills deras id:n är satta, så kod kan mergas oberoende.

---

## Filstruktur

| Fil | Ansvar | Åtgärd |
|-----|--------|--------|
| `apps/web/lib/loops.ts` | Server-only Loops-adapter (`sendLoopsTransactional` + framtida contact/event) | Skapa (återställ) |
| `apps/web/app/actions/try-share.ts` | Delnings-Server-Action | Ändra (Resend → Loops) |
| `apps/web/app/actions/contact.ts` | Kontakt-Server-Action | Ändra (Resend → Loops) |
| `apps/web/lib/investor-notify.ts` | Investerardeck-notiser | Ändra (Resend → Loops) |
| `apps/web/package.json` | Beroenden | Ändra (ta bort `resend`) |
| `apps/web/.env.example` | Env-dokumentation | Ändra |
| `CLAUDE.md` | Fasminne | Ändra (ny post) |

---

### Task 1: Loops-adapter (`lib/loops.ts`)

**Files:**
- Create: `apps/web/lib/loops.ts`

- [ ] **Step 1: Skapa adaptern**

Skapa `apps/web/lib/loops.ts` med exakt detta innehåll. `sendLoopsTransactional` returnerar `Promise<boolean>` (`true` = 2xx); `upsertLoopsContact`/`sendLoopsEvent` följer med för framtida lifecycle-mejl men kopplas inte i denna plan.

```ts
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

// Alla funktioner kastar aldrig uppåt: saknas nyckel eller felar API:t loggas det
// bara. Persistens sker alltid före mejl hos anroparen.
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

// Returnerar true vid 2xx, annars false (kastar aldrig). Anroparen avgör om ett
// misslyckande ska påverka användarflödet (kontakt = ja, delning/notis = nej).
export async function sendLoopsTransactional(
  transactionalId: string | undefined,
  email: string,
  dataVariables: Record<string, string> = {},
): Promise<boolean> {
  if (!transactionalId) {
    console.info('[loops] transactionalId saknas — loggar mejl:', { email, dataVariables });
    return false;
  }
  try {
    const res = await loopsFetch('/v1/transactional', { email, transactionalId, dataVariables });
    if (!res.ok) {
      console.error('[loops] transactional misslyckades:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    if (String(err).includes('NO_KEY')) {
      console.info('[loops] LOOPS_API_KEY saknas — loggar mejl:', { email, transactionalId, dataVariables });
    } else {
      console.error('[loops] transactional error:', err);
    }
    return false;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: exit 0 (inga fel).

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/loops.ts
git commit -m "feat(loops): server-only adapter — transactional/contact/event"
```

---

### Task 2: Migrera delningen (`try-share.ts`)

**Files:**
- Modify: `apps/web/app/actions/try-share.ts`

Delningen är best-effort: Supabase-insert är sanningskällan (fäller vid fel), mejlet ignorerar returen. All e-post-copy bor nu i Loops-mallen, så HTML-byggandet och `escape` tas bort.

- [ ] **Step 1: Byt import**

Byt rad 4 från:
```ts
import { Resend } from 'resend';
```
till:
```ts
import { sendLoopsTransactional } from '@/lib/loops';
```

- [ ] **Step 2: Ta bort `escape`-hjälparen**

Ta bort dessa rader (används bara av det gamla HTML-mejlet):
```ts
function escape(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

- [ ] **Step 3: Ersätt Resend-blocket med Loops**

Ersätt hela blocket som börjar med `// Mejl via Resend (graceful fallback om nyckel saknas)` och slutar precis före `// Notion best-effort` (dvs. `const apiKey = process.env.RESEND_API_KEY;` t.o.m. det avslutande `}` för `else`-grenen) med:

```ts
  // Mejl via Loops (best-effort — Supabase är loggen). Copy bor i Loops-mallen;
  // koden skickar bara data. Reply-to = avsändaren (satt som {{senderEmail}} i mallen).
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://www.elevante.se';
  const url = `${base}/${locale}/try`;
  const templateId =
    locale === 'en'
      ? process.env.LOOPS_SHARE_TRANSACTIONAL_ID_EN
      : process.env.LOOPS_SHARE_TRANSACTIONAL_ID_SV;
  await sendLoopsTransactional(templateId, recipientEmail, {
    senderName,
    message,
    url,
    senderEmail,
  });
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd apps/web && pnpm exec tsc --noEmit && pnpm run lint`
Expected: exit 0. (Om lint klagar på oanvänd variabel: kontrollera att inga Resend-rester finns kvar.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/actions/try-share.ts
git commit -m "feat(try): delnings-mejl via Loops i stället för Resend"
```

---

### Task 3: Migrera kontaktformuläret (`contact.ts`)

**Files:**
- Modify: `apps/web/app/actions/contact.ts`

Kontakt är leveranskritiskt (ingen DB-backup): en Loops-miss returnerar `generic` så användaren vet att försöka igen. Variabelnamnen matchar den befintliga kontakt-notis-mallen exakt (`topic, name, school, email, message`); `email` = leadets adress (svar via mallens `mailto:{{email}}`-knapp).

- [ ] **Step 1: Byt import**

Byt rad 4 från:
```ts
import { Resend } from 'resend';
```
till:
```ts
import { sendLoopsTransactional } from '@/lib/loops';
```

- [ ] **Step 2: Ta bort `escape`-hjälparen**

Ta bort dessa rader (används bara av det gamla HTML-mejlet):
```ts
function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

- [ ] **Step 3: Ersätt hela mejl-blocket**

Ersätt allt från `const apiKey = process.env.RESEND_API_KEY;` t.o.m. den avslutande `}` för `catch`-grenen (dvs. hela `if (!apiKey) {...}`-blocket + `try/catch`-blocket) med:

```ts
  const to = process.env.CONTACT_TO_EMAIL ?? 'john@elevante.se';

  // Leveranskritiskt: kontaktformuläret har ingen DB-backup, så en miss måste
  // synas för användaren. Variablerna matchar Loops-mallen "Elevante — kontakt-notis".
  const ok = await sendLoopsTransactional(process.env.LOOPS_CONTACT_TRANSACTIONAL_ID, to, {
    topic,
    name,
    school,
    email,
    message,
  });
  if (!ok) return { status: 'error', code: 'generic' };
  return { status: 'success' };
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd apps/web && pnpm exec tsc --noEmit && pnpm run lint`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/actions/contact.ts
git commit -m "feat(contact): kontaktmejl via Loops i stället för Resend"
```

---

### Task 4: Migrera investerar-notiser (`investor-notify.ts`)

**Files:**
- Modify: `apps/web/lib/investor-notify.ts`

Best-effort (notiser, ingen användarvänd väg). Variabelnamnen matchar den befintliga Loops-mallen "Elevante — investerar-notis" exakt (`headline, investor, locale, maxScroll`).

- [ ] **Step 1: Ersätt hela filen**

Ersätt hela innehållet i `apps/web/lib/investor-notify.ts` med:

```ts
import { sendLoopsTransactional } from '@/lib/loops';

type Meta = { locale?: string; maxScroll?: number };

/**
 * Mejlar John när en investerare öppnar decket ('open') eller når the ask ('ask').
 * Best-effort: felar Loops eller saknas nyckel/id loggas det bara (inget kast).
 */
export async function notifyInvestorEvent(
  kind: 'open' | 'ask',
  label: string,
  meta: Meta = {},
): Promise<void> {
  const headline =
    kind === 'open' ? `${label} öppnade investerardecket` : `${label} nådde "the ask"`;

  // Investerarnotiser går alltid till john@elevante.se (ärver inte CONTACT_TO_EMAIL,
  // som kan peka på en annan inbox). Kan överstyras med INVESTOR_NOTIFY_EMAIL.
  await sendLoopsTransactional(
    process.env.LOOPS_INVESTOR_TRANSACTIONAL_ID,
    process.env.INVESTOR_NOTIFY_EMAIL ?? 'john@elevante.se',
    {
      headline,
      investor: label,
      locale: meta.locale ?? '',
      maxScroll: typeof meta.maxScroll === 'number' ? String(meta.maxScroll) : '',
    },
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/web && pnpm exec tsc --noEmit && pnpm run lint`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/investor-notify.ts
git commit -m "feat(investerare): notiser via Loops i stället för Resend"
```

---

### Task 5: Ta bort Resend (dep + env-dokumentation)

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/.env.example`

- [ ] **Step 1: Verifiera att inga Resend-referenser finns kvar i koden**

Run: `cd /Users/johnguthed/elevante && grep -rniE "from 'resend'|new Resend|RESEND_API_KEY" apps/web --include="*.ts" --include="*.tsx" | grep -vE "node_modules|\.next"`
Expected: ingen utdata (tomt). Finns träffar: åtgärda dem innan du fortsätter.

- [ ] **Step 2: Ta bort `resend` ur package.json**

Ta bort denna rad (rad ~22) i `apps/web/package.json`:
```json
    "resend": "^4.0.1",
```

- [ ] **Step 3: Uppdatera lockfilen**

Run: `cd /Users/johnguthed/elevante && pnpm install`
Expected: lockfilen uppdateras, `resend` försvinner ur `pnpm-lock.yaml`.

- [ ] **Step 4: Uppdatera `.env.example`**

I `apps/web/.env.example`: ta bort raden `RESEND_API_KEY=`. Byt de tre översta e-postraderna (`NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`) så toppen blir:

```
NEXT_PUBLIC_SITE_URL=https://elevante.se
CONTACT_TO_EMAIL=john@elevante.se

# Loops — e-postmotor (transaktionell). Utan LOOPS_API_KEY loggas mejl bara.
# transactionalId per mall (skapas i Loops UI).
LOOPS_API_KEY=
LOOPS_CONTACT_TRANSACTIONAL_ID=
LOOPS_SHARE_TRANSACTIONAL_ID_SV=
LOOPS_SHARE_TRANSACTIONAL_ID_EN=
LOOPS_INVESTOR_TRANSACTIONAL_ID=
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/.env.example pnpm-lock.yaml
git commit -m "chore(email): ta bort resend-beroendet + dokumentera Loops-env"
```

---

### Task 6: Full build + fasminne

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Full produktionsbuild**

Run: `cd apps/web && pnpm run build`
Expected: bygget går igenom (exit 0), hela rutträdet kompilerar utan Resend.

- [ ] **Step 2: Lägg till fasminne i CLAUDE.md**

I `CLAUDE.md`, direkt efter raden som slutar `/try`-delnings-fasminnet (`... Spec+plan i \`docs/superpowers/\`.` under rubriken "### \`/try\`-delning — tipsa en kollega: KLAR (2026-07-11)"), lägg till:

```markdown
### E-postmotor → Loops (all transaktionell mejl): KLAR (2026-07-12)
Bytte e-postmotor från Resend till **Loops** för all transaktionell mejl. Bakgrund: `/try`-delningens mejl gick aldrig fram — koden inspekterade aldrig `error`-returen från Resend (SDK:t kastar inte vid API-fel), och Resend-domänen var sannolikt aldrig verifierad; **Loops-domänen `elevante.se` är verifierad**. Server-only adapter `lib/loops.ts` (raw `fetch`, timeout + retry, `sendLoopsTransactional` returnerar `boolean`, kastar aldrig; `upsertLoopsContact`/`sendLoopsEvent` följer med okopplade för framtida lifecycle). Tre migreringar: `contact.ts` (leveranskritisk — Loops-miss ⇒ `error: 'generic'`), `try-share.ts` (best-effort — Supabase är loggen), `lib/investor-notify.ts` (best-effort). Copy bor i Loops-mallarna; koden skickar bara data. **Resend borttaget helt** (dep + kod + env). Loops-mallar: kontakt `cmr2npu5t01i00j2t0g3p6zf5` (variabler `topic/name/school/email/message`, svara via `mailto:{{email}}`), investerar-notis `cmr2npvso01k80j0tktnxoif3` (`headline/investor/locale/maxScroll`), samt två nya delnings-mallar sv+en (duplicerade från skol-kontaktmejlet, copy-i-mall, variabler `senderName/message/url/senderEmail`, reply-to `{{senderEmail}}`). **Prod-env:** `LOOPS_API_KEY` + `LOOPS_CONTACT_TRANSACTIONAL_ID` + `LOOPS_SHARE_TRANSACTIONAL_ID_SV/_EN` + `LOOPS_INVESTOR_TRANSACTIONAL_ID`. Viktigt: prod-`NOTION_TOKEN`/Loops-nyckel skiljer sig från lokala — verifiera alltid mot prod-loggen. Spec+plan i `docs/superpowers/`.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(loops): fasminne — e-postmotor migrerad till Loops"
```

---

## Post-merge (manuellt + prod-verifiering)

Dessa steg är utanför koden och görs av John / i prod. Koden degraderar tyst tills id:na finns, så de blockerar inte merge.

- [ ] **Loops-mallar:** skapa de två delnings-mallarna (sv + en) genom att duplicera "Elevante — skol-kontaktmejl", klistra in copyn ur specen, sätt data-variabler `senderName/message/url/senderEmail`, Subject + Reply-to dynamiska, villkorsblock för `{{message}}`. Notera deras `transactionalId`.
- [ ] **Vercel-env (production):** säkerställ `LOOPS_API_KEY`; sätt `LOOPS_CONTACT_TRANSACTIONAL_ID=cmr2npu5t01i00j2t0g3p6zf5`, `LOOPS_INVESTOR_TRANSACTIONAL_ID=cmr2npvso01k80j0tktnxoif3`, `LOOPS_SHARE_TRANSACTIONAL_ID_SV=<nytt>`, `LOOPS_SHARE_TRANSACTIONAL_ID_EN=<nytt>`. Ta bort `RESEND_API_KEY`.
- [ ] **Deploy** (merge → auto-deploy).
- [ ] **Skarp verifiering:**
  1. Delning via `/sv/try` + `/en/try` till `john@elevante.se` → Loops "Emails"-logg (delivered) + inkorg (rätt språk, reply-to = avsändaren, hälsning syns/döljs korrekt).
  2. Kontaktformuläret → mejl till teamet, svara-knapp = `mailto:{{email}}`.
  3. Vercel runtime-loggar (`query="loops"`) rena (inga `[loops]`-fel).
