# `/try`-delning → mejl + lead-loggning: design

**Datum:** 2026-07-11
**Status:** Godkänd design, redo för implementationsplan

---

## Syfte

Låt en besökare på `/try` (typiskt en lärare eller rektor) tipsa en kollega om
Elevante direkt från sidan. När de delar:

1. Kollegan får ett mejl med en länk till `/try` och en valfri hälsning.
2. **Både avsändare och mottagare loggas som leads i Notion "Intresseanmälningar"**
   — mottagaren som referrad lead, avsändaren som en varm lead (hen har både
   testat och delat vidare).

Affärsvärde: lärarledd viral spridning + varma leads i CRM:et.

## Beslut (låsta i brainstorm)

- **Mekanik:** vi skickar mejlet (inte bara fångar adressen).
- **Loggning:** samtliga inblandade (avsändare + mottagare) i en **egen, dedikerad
  Notion-DB "📤 Elevante – Delningar"** — inte i den skol-centrerade
  Intresseanmälningar (person-tips ska inte blandas in i skol-pipelinen).
- **Placering:** delnings-sektionen är **alltid synlig** i det säljande avslutet.

## Begränsningar (viktiga, styr implementationen)

- **Mejl-motor = Resend** (inte Loops). `lib/loops.ts` finns inte på `main`;
  `app/actions/contact.ts` skickar redan via Resend (`RESEND_API_KEY`, graceful
  fallback). Delnings-mejlet återanvänder det mönstret. (Loops-migrationen lever
  på en separat, omergad branch — ingen påverkan här.)
- **Notion-access bekräftad** (ansluten MCP `6116c3ad…`, workspace AVAIL) — jag
  kan skapa databaser och skriva rader.
- **Egen "Delningar"-DB:** i stället för att blanda in person-tips i den
  skol-centrerade Intresseanmälningar skapar vi en dedikerad databas
  **"📤 Elevante – Delningar"** (jag skapar den via MCP och får dess id). Renare —
  inga person-kort i skol-pipelinen.
- App:en skriver dit i runtime via `lib/notion.ts` (Notion API, `NOTION_TOKEN`)
  med **nytt env `NOTION_SHARES_DATABASE_ID`** (sätts i Vercel).

## UI

**Delnings-sektion i avslutet på `/try`** (alltid synlig), bredvid "Boka demo":
- Rubrik + kort rad ("Känner du någon som borde se det här? Tipsa en kollega.").
- Formulär (Server Action, progressive enhancement): **ditt namn**, **din mejl**,
  **kollegans mejl**, **valfri hälsning** (textarea, kort).
- **Honeypot-fält** (dolt) mot bottar.
- Efter skick: bekräftelse ("Tack — vi har skickat tipset till {mottagare}.").
  Fel visas inline (ogiltig mejl, rate-limit, etc.).
- Tvåspråkig copy (sv/en) via samma mönster som resten av `/try`.

Komponent: `components/try/ShareTeaser.tsx` (client, `useActionState`).

## Server Action: `shareTry` (`app/actions/try-share.ts`)

Zod-validerad. Flöde:

1. **Validering & missbruksskydd:**
   - Giltiga e-postadresser (avsändare + **en** mottagare; V1 = en kollega per skick).
   - Avsändarens mejl **krävs** (deter + reply-to + lead).
   - Honeypot tomt, annars tyst no-op (låtsas lyckas).
   - **Rate-limit per IP** via Supabase-tidsfönster (t.ex. max 5 delningar/timme) —
     detta är det primära missbruksskyddet mot massutskick.
   - Inputtak på hälsning (≤ 500 tecken) och namn (≤ 100 tecken).
2. **Primär logg i Supabase** — tabell `try_shares` (sanningskälla + abuse):
   `id, sender_name, sender_email, recipient_email, message, locale, ip, created_at`.
   En rad per mottagare.
3. **Mejl via Resend** — ett brev per mottagare: ämne "{Namn} tror att Elevante
   kan vara något för dig", kropp med hälsning + länk till `/{locale}/try`,
   **reply-to = avsändaren**. Graceful fallback (loggar om `RESEND_API_KEY` saknas).
4. **Notion best-effort** — skapa rader i den egna Delningar-DB:n via ny
   `lib/notion.ts`-funktion (Notion API, `NOTION_TOKEN` + `NOTION_SHARES_DATABASE_ID`):
   - **Mottagare-rad:** Namn=mottagarens mejl, E-post=mottagaren, Roll="Mottagare",
     Delad av="{avsändarens namn} <{avsändarens mejl}>", Meddelande=hälsningen,
     Status="Ny".
   - **Avsändare-rad:** Namn=avsändarens namn, E-post=avsändaren, Roll="Avsändare",
     Status="Ny".
   - Fel i Notion-steget fäller **inte** delningen (best-effort, loggas).
   - **Engångs-setup (jag gör via MCP innan lansering):** skapa databasen
     "📤 Elevante – Delningar" (schema nedan) och notera id:t → `NOTION_SHARES_DATABASE_ID`.

## Datamodell

**Supabase-migration** `try_shares`:
```
create table public.try_shares (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null,
  sender_email text not null,
  recipient_email text not null,
  message text,
  locale text not null default 'sv',
  ip text,
  created_at timestamptz not null default now()
);
```
RLS: ingen publik läsning (server-only skrivning via service-role, som CRM:et).
En separat `try_share_ratelimit`-mekanism eller återanvänd `try_shares` +
tidsfönster-räkning per IP (avgörs i planen).

**Notion — ny DB "📤 Elevante – Delningar"** (jag skapar via MCP, under Elevante-sidan):
- **Namn** (title), **E-post** (email), **Roll** (select: Avsändare, Mottagare),
  **Delad av** (text), **Meddelande** (text), **Status** (select: Ny, Kontaktad,
  Kvalificerad, Vunnen, Tappad), **Skapad** (created_time, auto).
- id → `NOTION_SHARES_DATABASE_ID` (Vercel-env). En egen liten Kanban på Status
  ger teamet en pipeline för person-tipsen, skild från skol-CRM:et.

## i18n / copy

Ny copy i `lib/try/copy.ts` (tvåspråkig): rubrik, hjälptext, fält-labels/placeholders,
knapp, bekräftelse, felmeddelanden.

## Kvalitetskrav

- WCAG AA (labels, fokus, `aria-live` på bekräftelse/fel).
- Zod på Server Action. Inga hårdkodade strängar.
- Responsivt; ingen horisontell overflow.
- Graceful fallback utan Resend/Notion-nycklar (loggar, felar inte sidan).

## Inte i V1

- Flera mottagare per skick (V1 = en kollega åt gången).
- Delnings-statistik/analytics (egen uppgift #2).
- Dubbelriktad Notion-sync (best-effort en väg räcker).
- Verifiering att avsändaren äger sin mejl (ingen bekräftelselänk i V1).

## Öppna punkter till planen

- Exakt rate-limit-lagring (egen tabell vs. fönster-räkning på `try_shares`).
- Var Supabase-migrationen läggs och hur den appliceras mot prod
  (`msqfuywpbrteyrzjggsw`).

(Notion är löst: jag skapar "📤 Elevante – Delningar"-DB:n via MCP och lägger
dess id i `NOTION_SHARES_DATABASE_ID`. Ingen manuell Notion-setup för teamet.)
