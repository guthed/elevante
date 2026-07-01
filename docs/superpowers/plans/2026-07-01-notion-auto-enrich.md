# Notion auto-berikning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lägg till en rad i Notion med bara skolans namn + sätt `Ägare` → raden fylls automatiskt med Skolverket-fakta, en saklig `AI-brief` och ett färdigt `Kontaktmail` signerat med ägaren.

**Architecture:** En Notion-automation ("`Ägare` satt") POST:ar en webhook till en ny token-skyddad endpoint. Endpointen hämtar sidan, matchar namnet mot det befintliga `school-units.json`-datasetet och kör berikningen via den delade `syncProspect` (som nu även genererar kontaktmejl). Brief + mejl skrivs bara vid första berikningen; nattkörningen rör dem aldrig.

**Tech Stack:** Next.js 16 route handler, TypeScript, Supabase (service role), Notion API, Anthropic SDK. Ingen test-runner — verifiering via `pnpm typecheck` + `pnpm lint` + `tsx`-körda kontroller.

**Spec:** `docs/superpowers/specs/2026-07-01-notion-auto-enrich-design.md`

---

## Filstruktur

| Fil | Ansvar |
|-----|--------|
| `apps/web/lib/campaign-brief.ts` (modifiera) | Strama `generateSchoolBrief` (saklig sammanfattning); ny `generateContactEmail(input, ownerName)` |
| `apps/web/lib/notion.ts` (modifiera) | `NotionProspect.contactEmail`; dela maskin-props (fakta) från genererat innehåll (brief+mejl) via `writeGenerated`; ny `Kontaktmail`; helpers `getPageForEnrichment`, `resolveNotionUserName`, `markNeedsCheckWithCandidates` |
| `apps/web/lib/prospects.ts` (modifiera) | `syncProspect` genererar+cachar mejl, `ownerName`/`notionPageId`-opts, `writeGenerated`-tråd; ny `enrichNotionRowByName` |
| `apps/web/app/api/notion/enrich-prospect/route.ts` (ny) | Token-skyddad POST-endpoint för Notion-webhooken |
| `supabase/migrations/20260701140000_contact_email.sql` (ny) | `school_prospects.contact_email_draft text` |
| `apps/web/lib/supabase/database.ts` (modifiera) | Typ för nya kolumnen |

**Externa aktiveringssteg (utanför kodtasksen, görs sist):** applicera migrationen mot prod; döp om Notion-property `Owner`→`Ägare` + skapa `Kontaktmail` via MCP; sätt `NOTION_ENRICH_TOKEN` i Vercel; konfigurera Notion-automationen; re-berika Vasa Real. Se **Task 6**.

---

## Task 1: Migration — contact_email_draft

**Files:**
- Create: `supabase/migrations/20260701140000_contact_email.sql`
- Modify: `apps/web/lib/supabase/database.ts`

- [ ] **Step 1: Skriv migrationen**

```sql
-- Cachar det AI-genererade kontaktmejlet så det bara skrivs en gång.
alter table public.school_prospects
  add column if not exists contact_email_draft text;
```

- [ ] **Step 2: Lägg till typen i `database.ts`**

I `SchoolProspect` (Row) lägg `contact_email_draft: string | null;` och i `SchoolProspectInsert` `contact_email_draft?: string | null;` — matcha exakt hur övriga nullable-kolumner (t.ex. `sync_error`) är skrivna i filen.

- [ ] **Step 3: Verifiera + commit**

Run: `cd /Users/johnguthed/elevante/apps/web && pnpm typecheck`
Expected: inga fel.
```bash
cd /Users/johnguthed/elevante && git add supabase/migrations/20260701140000_contact_email.sql apps/web/lib/supabase/database.ts && git commit -m "feat(crm): contact_email_draft-kolumn"
```
(Migrationen appliceras mot prod i Task 6, inte här.)

---

## Task 2: AI-innehåll — saklig brief + kontaktmejl

**Files:**
- Modify: `apps/web/lib/campaign-brief.ts`

Läs först hela filen. Den har `type BriefInput = SchoolFacts & { name: string; students: number | null }` och `generateSchoolBrief(input): Promise<string | null>`.

- [ ] **Step 1: Strama `generateSchoolBrief`-prompten**

Ersätt `system`- och user-`content`-strängarna i `generateSchoolBrief` med:

```ts
    system:
      'Du skriver en kort, saklig BESKRIVNING av en svensk skola på svenska — en intern ' +
      'faktasammanfattning för en säljare på EdTech-bolaget Elevante. Det är INTE ett mejl: ' +
      'inga hälsningsfraser, ingen mottagare, ingen avslutning. Skriv 2–3 meningar i tredje ' +
      'person som beskriver skolan (storlek, huvudman, inriktning). Använd ENDAST de fakta ' +
      'du får — hitta inte på något.',
    messages: [{ role: 'user', content: `Fakta:\n${facts}\n\nSkriv sammanfattningen.` }],
```

- [ ] **Step 2: Lägg till `generateContactEmail`**

Efter `generateSchoolBrief`, lägg till (återanvänder samma `facts`-uppbyggnad):

```ts
export async function generateContactEmail(
  input: BriefInput,
  ownerName: string | null,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[brief] ANTHROPIC_API_KEY saknas — hoppar över kontaktmejl.');
    return null;
  }
  const facts = [
    `Skola: ${input.name}`,
    input.municipality && `Kommun/område: ${input.municipality}`,
    input.principalType && `Huvudmannatyp: ${input.principalType}`,
    input.huvudman && `Huvudman: ${input.huvudman}`,
    input.orientation && `Inriktning: ${input.orientation}`,
    input.students != null && `Antal elever: ${input.students}`,
  ].filter(Boolean).join('\n');
  const signature = ownerName ?? '[Ditt namn]';

  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929',
    max_tokens: 400,
    system:
      'Du skriver ett kort, varmt kontaktmejl på svenska från EdTech-bolaget Elevante till ' +
      'en svensk skola. Du-tilltal, max ~120 ord. Inkludera en mening om varför Elevante ' +
      'passar just den här skolan utifrån fakta. Mjuk avslutning med förslag på ett kort ' +
      'samtal. Avsluta EXAKT med raderna:\nVänliga hälsningar,\n' + signature + '\n' +
      'Använd bara givna fakta — hitta inte på något. Returnera enbart mejltexten.',
    messages: [{ role: 'user', content: `Fakta om skolan:\n${facts}\n\nSkriv kontaktmejlet.` }],
  });
  const block = msg.content.find((b) => b.type === 'text');
  return block && block.type === 'text' ? block.text.trim() : null;
}
```

- [ ] **Step 3: Verifiera + commit**

Run: `cd /Users/johnguthed/elevante/apps/web && pnpm typecheck && npx eslint lib/campaign-brief.ts`
Expected: inga fel (ignorera ev. känt DeckNav-fel på annat håll).
```bash
cd /Users/johnguthed/elevante && git add apps/web/lib/campaign-brief.ts && git commit -m "feat(crm): saklig brief-prompt + generateContactEmail"
```

---

## Task 3: Notion — split maskin/genererat + Kontaktmail + enrich-helpers

**Files:**
- Modify: `apps/web/lib/notion.ts`

Läs hela filen först (Task 4+5 från förra featuren skrev om den — den har `NotionProspect`, `machineProperties`, `createOnlyProperties`, `upsertNotionProspect`, `queryNotionProspectByCode`, `queryPrioritizedProspects`, privata `markNeedsCheck`/`firstPageIdRaw`/`notionHeaders`/`rich`, konstant `NOTION`).

- [ ] **Step 1: Lägg `contactEmail` på `NotionProspect`**

Lägg fältet efter `aiBrief`:
```ts
  aiBrief: string | null;
  contactEmail: string | null;
```

- [ ] **Step 2: Flytta genererat innehåll ur `machineProperties`**

I `machineProperties`, TA BORT raden `'AI-brief': rich(p.aiBrief),`. Lägg sedan (efter `machineProperties`):

```ts
// Genererat innehåll (AI-brief + Kontaktmail). Skrivs BARA vid första berikningen,
// så nattlig faktauppdatering aldrig skriver över användarens redigeringar.
function generatedProperties(p: NotionProspect) {
  return {
    'AI-brief': rich(p.aiBrief),
    Kontaktmail: rich(p.contactEmail),
  };
}
```

- [ ] **Step 3: Låt `upsertNotionProspect` ta en `writeGenerated`-flagga**

Ändra signaturen och property-sammansättningen:

```ts
export async function upsertNotionProspect(
  p: NotionProspect,
  opts: { writeGenerated?: boolean } = {},
): Promise<string | null> {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_LEADS_DATABASE_ID;
  if (!token || !databaseId) {
    console.warn('[notion] env saknas — hoppar över synk.');
    return null;
  }
  const headers = notionHeaders(token);
  const pageId = p.notionPageId ?? (await queryNotionProspectByCode(p.schoolUnitCode));
  if (pageId === 'DUPLICATE') {
    await markNeedsCheck(p.schoolUnitCode);
    return null;
  }
  const base = pageId
    ? machineProperties(p)
    : { ...machineProperties(p), ...createOnlyProperties() };
  const properties = opts.writeGenerated ? { ...base, ...generatedProperties(p) } : base;
  const url = pageId ? `${NOTION}/pages/${pageId}` : `${NOTION}/pages`;
  const body = pageId
    ? { properties }
    : { parent: { database_id: databaseId }, properties };
  const res = await fetch(url, {
    method: pageId ? 'PATCH' : 'POST', headers, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Notion API ${res.status}: ${await res.text()}`);
  return (await res.json()).id ?? pageId;
}
```

- [ ] **Step 4: Lägg till enrich-helpers (i slutet av filen)**

```ts
// Läser fälten endpointen behöver för att avgöra om/hur en rad ska berikas.
export async function getPageForEnrichment(
  pageId: string,
): Promise<{ name: string; ownerUserId: string | null; alreadySynced: boolean } | null> {
  const token = process.env.NOTION_TOKEN;
  if (!token) return null;
  const res = await fetch(`${NOTION}/pages/${pageId}`, { headers: notionHeaders(token) });
  if (!res.ok) return null;
  const props = (await res.json()).properties ?? {};
  return {
    name: props.Skola?.title?.[0]?.plain_text ?? '',
    ownerUserId: props['Ägare']?.people?.[0]?.id ?? null,
    alreadySynced: Boolean(props.Synkstatus?.select?.name),
  };
}

export async function resolveNotionUserName(userId: string | null): Promise<string | null> {
  const token = process.env.NOTION_TOKEN;
  if (!token || !userId) return null;
  const res = await fetch(`${NOTION}/users/${userId}`, { headers: notionHeaders(token) });
  if (!res.ok) return null;
  return (await res.json()).name ?? null;
}

// Sätter "Behöver kollas" + skriver kandidater i Anteckningar (bara i detta fall).
export async function markNeedsCheckWithCandidates(
  pageId: string,
  candidates: { name: string; kommun: string | null }[],
): Promise<void> {
  const token = process.env.NOTION_TOKEN;
  if (!token) return;
  const note = candidates.length
    ? 'Flera möjliga träffar i Skolverket — förtydliga namnet. Kandidater: ' +
      candidates.map((c) => `${c.name} (${c.kommun ?? '?'})`).join('; ')
    : 'Ingen träff i Skolverket på skolnamnet — kontrollera stavningen.';
  await fetch(`${NOTION}/pages/${pageId}`, {
    method: 'PATCH', headers: notionHeaders(token),
    body: JSON.stringify({ properties: {
      Synkstatus: { select: { name: 'Behöver kollas' } },
      Anteckningar: { rich_text: [{ text: { content: note.slice(0, 1900) } }] },
    } }),
  }).catch(() => {});
}
```

- [ ] **Step 5: Verifiera + commit**

Run: `cd /Users/johnguthed/elevante/apps/web && pnpm typecheck` → **väntat FEL**: `prospects.ts` bygger `NotionProspect` utan `contactEmail` och kallar `upsertNotionProspect` utan writeGenerated — det fixas i Task 4. Kör istället `npx eslint lib/notion.ts` → inga fel, och läs diffen för hand. Commit ihop med Task 4 (de är kopplade). **Ingen commit här** — gå vidare till Task 4 och commita båda tillsammans.

---

## Task 4: prospects.ts — mejlgenerering + enrichNotionRowByName

**Files:**
- Modify: `apps/web/lib/prospects.ts`

Läs hela filen först (`ProspectRow`, `toNotion`, `syncNotion`, `syncProspect`).

- [ ] **Step 1: Utöka `ProspectRow` + `toNotion`**

Lägg `contact_email_draft: string | null;` i `ProspectRow`. I `toNotion`, lägg `contactEmail: p.contact_email_draft` i det returnerade objektet (bredvid `aiBrief`).

- [ ] **Step 2: Låt `syncNotion` föra vidare `writeGenerated`**

Ändra `syncNotion` till att ta en tredje parameter och skicka den vidare:

```ts
async function syncNotion(
  prospectId: string, row: ProspectRow, writeGenerated: boolean,
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  try {
    const pageId = await upsertNotionProspect(toNotion(row), { writeGenerated });
    await supabase.from('school_prospects').update({
      notion_page_id: pageId ?? row.notion_page_id,
      sync_status: 'ok', sync_error: null, last_synced_at: new Date().toISOString(),
    }).eq('id', prospectId);
  } catch (err) {
    await supabase.from('school_prospects').update({
      sync_status: 'error', sync_error: String(err).slice(0, 500),
      last_synced_at: new Date().toISOString(),
    }).eq('id', prospectId);
    throw err;
  }
}
```

- [ ] **Step 3: Uppdatera `syncProspect` (opts + mejl + writeGenerated)**

Ändra signaturen och kroppen:

```ts
export async function syncProspect(opts: {
  code: string; name: string; skolform: string[]; createdVia: CreatedVia;
  students?: number | null; bumpLookup?: boolean;
  ownerName?: string | null; notionPageId?: string | null;
}): Promise<void> {
  const { code, name, skolform, createdVia, bumpLookup = false } = opts;
  const supabase = createSupabaseServiceRoleClient();
  const started = Date.now();
  const now = new Date().toISOString();

  await supabase.from('school_prospects').upsert(
    { school_unit_code: code, school_name: name, skolform, created_via: createdVia,
      enrichment_status: 'pending', first_seen_at: now, last_seen_at: now, lookup_count: 0,
      ...(opts.notionPageId ? { notion_page_id: opts.notionPageId } : {}) },
    { onConflict: 'school_unit_code', ignoreDuplicates: true },
  );
  const { data: row } = await supabase
    .from('school_prospects').select('*').eq('school_unit_code', code).single();
  if (!row) return;

  // Peka om till den manuellt skapade raden om en pageId gavs (outbound-flödet).
  if (opts.notionPageId && row.notion_page_id !== opts.notionPageId) {
    await supabase.from('school_prospects')
      .update({ notion_page_id: opts.notionPageId }).eq('id', row.id);
    row.notion_page_id = opts.notionPageId;
  }

  const students = opts.students ?? (await fetchPupilCount(code, skolform));
  let justGenerated = false;
  if (row.enrichment_status === 'pending' && row.ai_brief == null) {
    const facts = await fetchSchoolFacts(code);
    const briefInput = {
      name, students, address: facts?.address ?? null, phone: facts?.phone ?? null,
      email: facts?.email ?? null, web: facts?.web ?? null,
      municipality: facts?.municipality ?? null, principalType: facts?.principalType ?? null,
      huvudman: facts?.huvudman ?? null, orientation: facts?.orientation ?? null,
    };
    let brief: string | null = null;
    let contactEmail: string | null = null;
    try { brief = await generateSchoolBrief(briefInput); }
    catch (err) { console.error('[prospects] brief misslyckades:', err); }
    try { contactEmail = await generateContactEmail(briefInput, opts.ownerName ?? null); }
    catch (err) { console.error('[prospects] kontaktmejl misslyckades:', err); }
    justGenerated = brief != null || contactEmail != null;
    await supabase.from('school_prospects').update({
      contact_address: facts?.address ?? null, contact_phone: facts?.phone ?? null,
      contact_email: facts?.email ?? null, contact_web: facts?.web ?? null,
      municipality: facts?.municipality ?? null, principal_type: facts?.principalType ?? null,
      huvudman_name: facts?.huvudman ?? null, school_orientation: facts?.orientation ?? null,
      students, ai_brief: brief, contact_email_draft: contactEmail,
      enrichment_status: brief ? 'done' : 'failed', updated_at: now,
    }).eq('id', row.id);
  }
  await supabase.from('school_prospects').update({
    last_seen_at: now, updated_at: now, skolform,
    students: students ?? row.students,
    ...(bumpLookup ? { lookup_count: row.lookup_count + 1 } : {}),
  }).eq('id', row.id);

  const { data: fresh } = await supabase
    .from('school_prospects').select('*').eq('id', row.id).single();
  let status = 'ok';
  try {
    if (fresh) await syncNotion(fresh.id, fresh as ProspectRow, justGenerated);
  } catch { status = 'error'; }
  await supabase.from('school_sync_log').insert({
    school_unit_code: code, status, duration_ms: Date.now() - started,
    error: status === 'error' ? 'notion' : null,
  });
}
```

Uppdatera importen överst i filen: `import { generateSchoolBrief, generateContactEmail } from '@/lib/campaign-brief';`

- [ ] **Step 4: Lägg till `enrichNotionRowByName`**

I slutet av filen:

```ts
import { searchSchoolUnits } from '@/lib/skolverket';
import { markNeedsCheckWithCandidates } from '@/lib/notion';

// Outbound: matcha ett fritt skolnamn → Skolverket → berika den befintliga raden.
export async function enrichNotionRowByName(
  pageId: string, name: string, ownerName: string | null,
): Promise<'ok' | 'needs_check' | 'error'> {
  const q = name.trim().toLowerCase();
  const hits = searchSchoolUnits(name);
  const exact = hits.filter((u) => u.name.toLowerCase() === q);
  if (exact.length !== 1) {
    await markNeedsCheckWithCandidates(
      pageId, hits.slice(0, 5).map((u) => ({ name: u.name, kommun: u.kommun })),
    );
    return 'needs_check';
  }
  const unit = exact[0];
  try {
    await syncProspect({
      code: unit.code, name: unit.name, skolform: unit.skolform,
      createdVia: 'admin_search', notionPageId: pageId, ownerName,
    });
    return 'ok';
  } catch (err) {
    console.error('[prospects] enrichNotionRowByName misslyckades:', err);
    return 'error';
  }
}
```

(Placera de nya importerna högst upp bland övriga importer, inte mitt i filen.)

- [ ] **Step 5: Verifiera + commit (Task 3 + 4 ihop)**

Run: `cd /Users/johnguthed/elevante/apps/web && pnpm typecheck && npx eslint lib/notion.ts lib/prospects.ts`
Expected: inga fel.
```bash
cd /Users/johnguthed/elevante && git add apps/web/lib/notion.ts apps/web/lib/prospects.ts && git commit -m "feat(crm): skriv-en-gång brief/mejl + enrichNotionRowByName"
```

---

## Task 5: Endpoint — POST /api/notion/enrich-prospect

**Files:**
- Create: `apps/web/app/api/notion/enrich-prospect/route.ts`

- [ ] **Step 1: Skriv routen**

```ts
import { NextResponse } from 'next/server';
import { getPageForEnrichment, resolveNotionUserName } from '@/lib/notion';
import { enrichNotionRowByName } from '@/lib/prospects';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.NOTION_ENRICH_TOKEN;
  const url = new URL(req.url);
  if (!secret || url.searchParams.get('token') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown = {};
  try { body = await req.json(); } catch { /* tom/ogiltig body — hanteras nedan */ }
  const b = body as Record<string, unknown> & { data?: { id?: string }; page?: { id?: string }; source?: { id?: string }; id?: string };
  const pageId = b?.data?.id ?? b?.page?.id ?? b?.source?.id ?? b?.id ?? null;
  if (!pageId) return NextResponse.json({ error: 'no page id' }, { status: 400 });

  const page = await getPageForEnrichment(pageId);
  if (!page) return NextResponse.json({ error: 'page not found' }, { status: 404 });
  if (page.alreadySynced) return NextResponse.json({ skipped: 'redan synkad' });
  if (page.name.trim().length < 2) return NextResponse.json({ skipped: 'inget namn' });

  const ownerName = await resolveNotionUserName(page.ownerUserId);
  const result = await enrichNotionRowByName(pageId, page.name, ownerName);
  return NextResponse.json({ result });
}
```

- [ ] **Step 2: Verifiera bygget**

Run: `cd /Users/johnguthed/elevante/apps/web && pnpm typecheck && npx eslint app/api/notion/enrich-prospect/route.ts && pnpm build`
Expected: bygget lyckas; routen `/api/notion/enrich-prospect` syns i output. (Om `pnpm build` faller enbart på det kända `DeckNav.tsx`-lintfelet — notera det, bekräfta att routen ändå kompilerade.)

- [ ] **Step 3: Lokalt rök-test av auth + no-op-vägen**

Run (utan token → 401):
```bash
cd /Users/johnguthed/elevante/apps/web && node -e "fetch('http://localhost:3000/api/notion/enrich-prospect',{method:'POST'}).then(r=>console.log(r.status)).catch(()=>console.log('server ej igång — hoppa'))"
```
(Om ingen dev-server körs, hoppa — bygget i Step 2 räcker som verifiering i denna task. Riktig end-to-end görs i Task 6 mot deployen.)

- [ ] **Step 4: Commit**

```bash
cd /Users/johnguthed/elevante && git add apps/web/app/api/notion/enrich-prospect/route.ts && git commit -m "feat(crm): webhook-endpoint för Notion auto-berikning"
```

---

## Task 6: Aktivering + verifiering (controller kör detta, inte en subagent)

Dessa steg rör externa system och körs av controllern efter att kod-tasksen är granskade och mergade (eller på branchen inför merge).

- [ ] **Step 1: Applicera migrationen mot prod-Supabase** (`msqfuywpbrteyrzjggsw`) via Supabase MCP `apply_migration` (name `contact_email`), SQL:en från Task 1. Verifiera kolumnen via `execute_sql`.

- [ ] **Step 2: Notion-schema via MCP** (`notion-update-data-source`, data source `f831983c-4aa9-4c07-9874-2fe849b69b2a`):
  `RENAME COLUMN "Owner" TO "Ägare"; ADD COLUMN "Kontaktmail" RICH_TEXT`

- [ ] **Step 3: Sätt `NOTION_ENRICH_TOKEN`** (långt slumpvärde) i Vercel (Production + Preview). Dokumentera i Notion "Nycklar".

- [ ] **Step 4: Konfigurera Notion-automationen** (Notion-UI, användaren gör detta med givna steg): databasen *Intresseanmälningar* → Automations → **När `Ägare` ändras** → Action **Send webhook** → URL `https://<prod-domän>/api/notion/enrich-prospect?token=<NOTION_ENRICH_TOKEN>`. Verifiera att planen stödjer webhook-actions; annars fall tillbaka på en Button-property som anropar samma URL.

- [ ] **Step 5: Rök-test end-to-end** — skapa en testrad i Notion, sätt `Ägare` → bekräfta att raden fylls i (fakta + saklig brief + signerat mejl) inom några sekunder, och att ett tvetydigt namn blir `Behöver kollas` med kandidater. Verifiera prod-endpointen svarar `401` utan token.

- [ ] **Step 6: Re-berika Vasa Real** — kör `enrichNotionRowByName(<vasa-real-page-id>, 'Vasa Real', '<ägare>')` (via en engångs-`tsx`, som tidigare) så briefen blir en riktig sammanfattning och `Kontaktmail` fylls i. Bekräfta i Notion.

- [ ] **Step 7: Fasminne** — lägg en rad i `CLAUDE.md` + `CHANGELOG.md`, commit.

---

## Self-Review (ifylld)

- **Spec-täckning:** auto-trigger på `Ägare` (Task 5 endpoint + Task 6 automation) ✓; namnmatch exakt + `Behöver kollas`/kandidater (Task 4 `enrichNotionRowByName` + `markNeedsCheckWithCandidates`) ✓; `AI-brief` saklig (Task 2) ✓; `Kontaktmail` signerat med Ägare (Task 2 `generateContactEmail` + Task 3/4 owner-resolve) ✓; brief/mejl skrivs en gång (Task 3 `generatedProperties` + `writeGenerated`, Task 4 `justGenerated`) ✓; icke-destruktivt (maskin-props skriver aldrig `Ägare`/`Status`/notes) ✓; Supabase-spårning via `syncProspect` ✓; Vasa Real-fix (Task 6) ✓; rename Owner→Ägare + Kontaktmail-property (Task 6) ✓.
- **Typkonsistens:** `NotionProspect.contactEmail` (Task 3) ↔ `toNotion` (Task 4) ↔ `contact_email_draft` (Task 1 migration + database.ts); `upsertNotionProspect(p, {writeGenerated})` (Task 3) ↔ anropas i `syncNotion` (Task 4); `enrichNotionRowByName(pageId, name, ownerName)` (Task 4) ↔ anropas i endpoint (Task 5); `getPageForEnrichment`/`resolveNotionUserName`/`markNeedsCheckWithCandidates` (Task 3) ↔ används i Task 4/5.
- **Ordningsberoende:** Task 3 typecheck:ar inte ensam (avsiktligt) — commitas ihop med Task 4. Uttryckligt i Task 3 Step 5.
- **Placeholders:** inga.
