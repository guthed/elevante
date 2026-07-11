# Migrera all transaktionell mejl till Loops: design

**Datum:** 2026-07-12
**Status:** Godkänd design, redo för implementationsplan

---

## Syfte

Byt e-postmotor för all transaktionell mejl från **Resend** till **Loops**
(loops.so). Två drivkrafter:

1. **Fixar en akut leveransbugg.** `/try`-delningens mejl gick aldrig fram.
   Diagnos via Vercel runtime-loggar + kod-granskning: koden gör
   `await resend.emails.send(...)` men inspekterar aldrig `error`-objektet Resend
   returnerar (Resend-SDK:t kastar inte vid API-fel), så ett avvisande loggas
   tyst bort och användaren får ändå "success". Sannolik grundorsak: Resend-
   domänen för `elevante.se` var aldrig verifierad. **Loops-domänen är redan
   verifierad**, så mejl går fram där.
2. **Aligns med den uttalade planen** att Loops ska vara Elevantes e-postmotor
   (marketing + lifecycle + transactional på ett ställe).

## Beslut (låsta i brainstorm)

- **Scope:** *all* transaktionell mejl migreras — både `/try`-delningen och
  kontaktformuläret. **Resend rivs ut helt** (dep + kod + env). Ingen fallback.
- **Domän:** `elevante.se` är redan verifierad i Loops (SPF/DKIM klart).
- **Mall-strategi:** copy bor **i mallen** (som Elevantes befintliga mallar),
  inte som variabler. Delnings-mejlet är tvåspråkigt → **två mallar (sv + en)**,
  båda duplicerade från den befintliga **skol-kontaktmejl-mallen** för att ärva
  skal, ton och branding. Kontakt-mejlet är internt (svenska) → en mall.
- **Adapter:** `apps/web/lib/loops.ts` återställs (finns i build-cachen från en
  tidigare, omergad branch). Endast `sendLoopsTransactional` wire:as nu;
  `upsertLoopsContact`/`sendLoopsEvent` följer med för framtida lifecycle-mejl
  men lämnas okopplade (YAGNI-noterat).
- **Felhantering skiljer sig per flöde** (se nedan).

## Befintliga Loops-mallar (bekräftade i kontot)

| Mall | transactionalId | Variabler | Anmärkning |
|------|-----------------|-----------|------------|
| **Elevante — kontakt-notis** | `cmr2npu5t01i00j2t0g3p6zf5` | `topic, name, school, email, message` | **Klar att koppla.** Ingen `replyTo`-variabel — svara-knappen är `mailto:{{email}}`, så `email` = leadets adress. |
| Elevante — skol-kontaktmejl | `cmr2npqod01gq0j2s1fg407k0` | `schoolName` | Tonreferens + skal att duplicera för delnings-mallarna. |
| Elevante — lead-notis (prisberäknare) | `cmr2nps7i01jj0j0orc0wz9a9` | `schoolName, students, leadEmail, message` | Orörd. |
| Elevante — investerar-notis | `cmr2npvso01k80j0tktnxoif3` | `headline, investor, locale, maxScroll` | Orörd. |
| (faktura, Draft) | `cmr2c7lvi04kh018pis2rm18y` | — | Orelaterad. |

**Delnings-mallarna finns inte än** — de skapas som manuellt setup-steg (nedan).

## Manuellt Loops-setup (utanför koden — kan ej göras via API)

Skapa **två** transaktionsmallar genom att **duplicera skol-kontaktmejlet** (ärver
logga, eyebrow, H1-stil, mörk knapp, footer):

1. **"Elevante — tipsa en kollega (SV)"** → `LOOPS_SHARE_TRANSACTIONAL_ID_SV`
2. **"Elevante — tipsa en kollega (EN)"** → `LOOPS_SHARE_TRANSACTIONAL_ID_EN`

I varje mall:
- **Subject** (sv): `{{senderName}} tror att Elevante kan vara något för dig`
  **Subject** (en): `{{senderName}} thinks Elevante might be for you`
- **Reply-to** (header): gör dynamisk = `{{senderEmail}}`.
- **Data-variabler:** `senderName`, `message`, `url`, `senderEmail`.
- **`{{message}}`-raden** läggs i ett Loops **villkorsblock** som döljs när
  `message` är tomt (delningens hälsning är valfri). Faller villkorsblock bort
  skickar koden tom sträng och raden lämnas tom.
- Brödtext = copyn nedan.

### Copy — delnings-mejl (verbatim)

**🇸🇪 Svenska**
> **TIPS FRÅN {{senderName}}**
> # Prova Elevante — på en riktig lektion
>
> Hej!
>
> {{senderName}} har just testat Elevante och tänkte att du skulle gilla det.
>
> *"{{message}}"*  *(villkorsblock — visas bara om hälsning finns)*
>
> Elevante spelar in lektioner, transkriberar dem och låter eleverna ställa
> frågor om innehållet i efterhand — med svar grundade i den egna lektionen,
> aldrig ett generiskt svar från nätet.
>
> Du kan prova det direkt, utan att skapa konto:
>
> **[ Prova själv — utan inloggning ]** → {{url}}
>
> Eller svara på det här mejlet om du undrar något — det landar hos {{senderName}}.
>
> Vänliga hälsningar,
> Teamet på Elevante

**🇬🇧 English**
> **A TIP FROM {{senderName}}**
> # Try Elevante — on a real lesson
>
> Hi!
>
> {{senderName}} just tried Elevante and thought you'd like it.
>
> *"{{message}}"*  *(conditional block — only shown if a message exists)*
>
> Elevante records lessons, transcribes them and lets students ask questions
> about the content afterwards — with answers grounded in their own lesson,
> never a generic answer from the web.
>
> You can try it right away, no account needed:
>
> **[ Try it yourself — no sign-in ]** → {{url}}
>
> Or just reply to this email if you have a question — it goes straight to
> {{senderName}}.
>
> Best,
> The Elevante team

## Arkitektur

Ett server-only adapter-lager (`lib/loops.ts`) mot Loops REST-API:t. Server
Actions anropar `sendLoopsTransactional(transactionalId, email, dataVariables)`
efter att persistensen är gjord. Copy bor i Loops-mallarna; koden skickar bara
data. En motor, inga andra e-postberoenden.

### `lib/loops.ts` (återställs + en ändring)

Server-only. Raw `fetch` (ingen SDK-dep), timeout + en retry, fire-and-forget.
Behåller `upsertLoopsContact` och `sendLoopsEvent` (okopplade). **Ändring:**
`sendLoopsTransactional` returnerar `Promise<boolean>` (`true` = 2xx, `false` =
fel/saknad nyckel/saknat id) i stället för `void`, och kastar aldrig — så
anropare kan agera på utfallet.

```ts
export async function sendLoopsTransactional(
  transactionalId: string | undefined,
  email: string,
  dataVariables: Record<string, string> = {},
): Promise<boolean>
```

Saknas `transactionalId` eller `LOOPS_API_KEY`: logga (`console.info`) och
returnera `false`. Alla fel loggas (`console.error`) med status + body.

### `app/actions/try-share.ts` (delning — best-effort)

Ersätt hela Resend-blocket. Efter lyckad Supabase-insert:
```ts
const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://www.elevante.se';
const url = `${base}/${locale}/try`;
const templateId = locale === 'en'
  ? process.env.LOOPS_SHARE_TRANSACTIONAL_ID_EN
  : process.env.LOOPS_SHARE_TRANSACTIONAL_ID_SV;
await sendLoopsTransactional(templateId, recipientEmail, {
  senderName,
  message: message ?? '',
  url,
  senderEmail,
});
```
Returen **ignoreras** (best-effort — Supabase är sanningskällan, precis som
Notion-loggningen). Behåll `logShareToNotion` best-effort efteråt. Tar bort
`import { Resend }`, `escape`, och HTML-byggandet (copy bor i Loops nu).

### `app/actions/contact.ts` (kontakt — leveranskritisk)

Ersätt hela Resend-blocket:
```ts
const ok = await sendLoopsTransactional(
  process.env.LOOPS_CONTACT_TRANSACTIONAL_ID,
  process.env.CONTACT_TO_EMAIL ?? 'john@elevante.se',
  { topic, name, school, email, message },
);
if (!ok) return { status: 'error', code: 'generic' };
return { status: 'success' };
```
**Använder returen** — kontaktformuläret har ingen DB-backup, så en tyst miss
tappar leadet. Vid `false` returneras `generic` (samma UX som idag med Resend-
throw), så användaren vet att försöka igen / mejla direkt. Behåller honeypot,
validering, rate-limit, `CONTACT_TO_EMAIL`. Tar bort `import { Resend }`, `escape`,
HTML-byggandet. Variabelnamnen matchar den befintliga kontakt-notis-mallen exakt
(`topic, name, school, email, message`); `email` = leadets adress (svara via
mallens `mailto:{{email}}`-knapp).

### `package.json` + env

- Ta bort `resend` ur dependencies.
- `.env.example`: ta bort `RESEND_API_KEY`; lägg till `LOOPS_API_KEY`,
  `LOOPS_CONTACT_TRANSACTIONAL_ID`, `LOOPS_SHARE_TRANSACTIONAL_ID_SV`,
  `LOOPS_SHARE_TRANSACTIONAL_ID_EN`.
- **Vercel-env (prod):** säkerställ `LOOPS_API_KEY`; sätt de tre transactional-
  id:na. `RESEND_API_KEY` kan tas bort. Saknas ett id loggar adaptern bara
  (icke-blockerande — mejl aktiveras när id:t sätts, samma mönster som Notion).

## Dataflöde

**Delning:** formulär → `shareTry` → validering/rate-limit → **Supabase insert
(primärt, fäller vid fel)** → Loops delnings-mall (best-effort) → Notion
(best-effort) → success.

**Kontakt:** formulär → `sendContact` → validering/rate-limit → **Loops kontakt-
mall (leveranskritisk — fel ⇒ `generic`)** → success.

## Felhantering (sammanfattning)

| Flöde | Persistens | Mejl-miss ⇒ |
|-------|-----------|-------------|
| Delning | Supabase `try_shares` (primärt) | loggas, delningen lyckas ändå |
| Kontakt | ingen | `error: 'generic'` till användaren |

Adaptern kastar aldrig; allt loggas till Vercel runtime-loggar (`[loops] …`).

## Testning / verifiering

Enhets-/typnivå: `tsc`, `eslint`, `next build` gröna. Ingen ny testrunner
introduceras (repot har ingen; verifiering sker mot prod som tidigare).

Skarp prod-verifiering efter mallar + env + deploy:
1. **Delning:** skicka ett tips till `john@elevante.se` via `/sv/try` och `/en/try`
   → kolla Loops "Emails"-loggen (delivered) + inkorg (rätt språk, reply-to =
   avsändaren, ev. hälsning syns/döljs korrekt).
2. **Kontakt:** skicka kontaktformuläret → mejl till teamet, svara-knapp =
   `mailto:{{email}}`.
3. Vercel runtime-loggar (`query="loops"`) ska vara rena (inga `[loops]`-fel).

## Inte i scope

- Lifecycle-/marketing-mejl (`upsertLoopsContact`/`sendLoopsEvent` följer med i
  adaptern men kopplas inte här).
- Migrera de andra befintliga notis-mallarna (skol-kontakt, prisberäknar-lead,
  investerar-notis) — de lever redan i Loops och rörs inte.
- Loops-MCP för att sköta mallar programmatiskt (finns ej än; mallar författas i
  UI).

## Öppna punkter till planen

- Exakt syntax för Loops villkorsblock på `{{message}}` (verifieras när mallen
  byggs; kod-fallbacken "tom sträng" fungerar oavsett).
- Ordning: koden kan mergas före mallarna finns (adaptern degraderar tyst) —
  planen sekvenserar kod → env → mallar → prod-verifiering.
