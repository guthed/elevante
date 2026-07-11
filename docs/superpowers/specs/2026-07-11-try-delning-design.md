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
- **Loggning:** samtliga inblandade (avsändare + varje mottagare) i den
  **befintliga** Notion-DB:n Intresseanmälningar, käll-taggat.
- **Placering:** delnings-sektionen är **alltid synlig** i det säljande avslutet.

## Begränsningar (viktiga, styr implementationen)

- **Mejl-motor = Resend** (inte Loops). `lib/loops.ts` finns inte på `main`;
  `app/actions/contact.ts` skickar redan via Resend (`RESEND_API_KEY`, graceful
  fallback). Delnings-mejlet återanvänder det mönstret. (Loops-migrationen lever
  på en separat, omergad branch — ingen påverkan här.)
- **Notion-schemat kan inte inspekteras/ändras i denna session** (Notion-MCP
  kräver auth som saknas). Appen skriver ändå till Notion i runtime via
  `lib/notion.ts` (API-token i env). Om nya properties behövs i Intresseanmälningar
  skapas de manuellt i Notion av teamet — planen listar exakt vilka.
- **Intresseanmälningar är skol-centrerad** (`upsertNotionProspect` dedupar på
  Skolverkets `school_unit_code`). En delad person-mejl har ingen skolkod → vi
  behöver en **ny, e-postbaserad lead-väg** i `lib/notion.ts` (append/upsert på
  e-post), inte den befintliga skol-dedupen.

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
4. **Notion best-effort** — logga i Intresseanmälningar via ny e-postbaserad väg:
   - Mottagare: lead med `created_via: "try_share"`, Status "Ny", roll "mottagare".
   - Avsändare: lead med `created_via: "try_share"`, Status "Ny", roll "avsändare"
     (dedup på e-post så samma avsändare inte dubblas vid upprepade delningar).
   - Fel i Notion-steget fäller **inte** delningen (best-effort, loggas).

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

**Notion (Intresseanmälningar)** — nya/återanvända properties (bekräftas i planen;
teamet skapar ev. saknade):
- E-post (lead-mejl), Namn, Status ("Ny"), `Källa/created_via` = "try_share",
  Roll ("avsändare"/"mottagare"), ev. Anteckning (hälsningen).

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
- Exakta Notion-properties + den nya e-postbaserade `lib/notion.ts`-funktionen.
- Var Supabase-migrationen läggs och hur den appliceras mot prod
  (`msqfuywpbrteyrzjggsw`).
