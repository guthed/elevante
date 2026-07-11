export type NotionProspect = {
  notionPageId: string | null;
  schoolUnitCode: string;
  schoolName: string;
  municipality: string | null;
  huvudman: string | null;
  students: number | null;
  priceSek: number | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  aiBrief: string | null;
  contactEmail: string | null;
  lookupCount: number;
  leadEmail: string | null;
  skolform: string[];
  dataSource: 'Skoluppslag' | 'Prisberäknare-lead' | 'Kontaktformulär' | 'Prospektering' | 'Batch';
  firstSeen: string;
  lastSeen: string;
};

const NOTION = 'https://api.notion.com/v1';

function notionHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
}

const rich = (t: string | null) =>
  t ? { rich_text: [{ text: { content: t.slice(0, 1900) } }] } : { rich_text: [] };

// Fält som synken ALLTID får skriva (maskinstyrda). Rör aldrig Status/Owner/
// Anteckningar/Nästa steg/Senast kontaktad/Kontaktväg — de är manuella i Notion.
function machineProperties(p: NotionProspect) {
  return {
    Skola: { title: [{ text: { content: p.schoolName } }] },
    Skolenhetskod: rich(p.schoolUnitCode),
    Kommun: rich(p.municipality),
    Huvudman: rich(p.huvudman),
    'Antal elever': { number: p.students },
    'Uppskattat pris': { number: p.priceSek },
    Telefon: { phone_number: p.phone },
    'E-post': { email: p.email },
    Adress: rich(p.address),
    'Antal uppslag': { number: p.lookupCount },
    'Lead-e-post': { email: p.leadEmail },
    'Lead-status': { select: { name: p.leadEmail ? 'Kontaktuppgift lämnad' : 'Ny' } },
    Skolform: { multi_select: p.skolform.map((name) => ({ name })) },
    Datakälla: { select: { name: p.dataSource } },
    Synkstatus: { select: { name: 'OK' } },
    'Senast synkad': { date: { start: new Date().toISOString() } },
    'Först sedd': { date: { start: p.firstSeen } },
    'Senast sedd': { date: { start: p.lastSeen } },
  };
}

// Genererat innehåll (AI-brief + Kontaktmail). Skrivs BARA vid första berikningen,
// så nattlig faktauppdatering aldrig skriver över användarens redigeringar.
function generatedProperties(p: NotionProspect) {
  return {
    'AI-brief': rich(p.aiBrief),
    Kontaktmail: rich(p.contactEmail),
  };
}

// Bara vid create: sätt initial Status. Vid update rörs det aldrig (manuellt CRM-fält).
function createOnlyProperties() {
  return { Status: { select: { name: 'Ny' } } };
}

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

// Returnerar page-id, null (0 träffar), eller 'DUPLICATE' (>1 träff).
export async function queryNotionProspectByCode(
  code: string,
): Promise<string | 'DUPLICATE' | null> {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_LEADS_DATABASE_ID;
  if (!token || !databaseId) return null;
  const res = await fetch(`${NOTION}/databases/${databaseId}/query`, {
    method: 'POST', headers: notionHeaders(token),
    body: JSON.stringify({
      filter: { property: 'Skolenhetskod', rich_text: { equals: code } },
      page_size: 2,
    }),
  });
  if (!res.ok) return null;
  const results = (await res.json()).results ?? [];
  if (results.length === 0) return null;
  if (results.length > 1) return 'DUPLICATE';
  return results[0].id;
}

async function markNeedsCheck(code: string): Promise<void> {
  const id = await firstPageIdRaw(code);
  const token = process.env.NOTION_TOKEN;
  if (!id || !token) return;
  await fetch(`${NOTION}/pages/${id}`, {
    method: 'PATCH', headers: notionHeaders(token),
    body: JSON.stringify({ properties: { Synkstatus: { select: { name: 'Behöver kollas' } } } }),
  }).catch(() => {});
}

async function firstPageIdRaw(code: string): Promise<string | null> {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_LEADS_DATABASE_ID;
  if (!token || !databaseId) return null;
  const res = await fetch(`${NOTION}/databases/${databaseId}/query`, {
    method: 'POST', headers: notionHeaders(token),
    body: JSON.stringify({
      filter: { property: 'Skolenhetskod', rich_text: { equals: code } }, page_size: 1,
    }),
  });
  if (!res.ok) return null;
  return (await res.json()).results?.[0]?.id ?? null;
}

// För cron: skolor i aktiv pipeline (Status ∉ {Ny, Tappad}). Returnerar {pageId, code}.
export async function queryPrioritizedProspects(): Promise<
  { pageId: string; code: string }[]
> {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_LEADS_DATABASE_ID;
  if (!token || !databaseId) return [];
  const out: { pageId: string; code: string }[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetch(`${NOTION}/databases/${databaseId}/query`, {
      method: 'POST', headers: notionHeaders(token),
      body: JSON.stringify({
        filter: { and: [
          { property: 'Status', select: { does_not_equal: 'Ny' } },
          { property: 'Status', select: { does_not_equal: 'Tappad' } },
        ] },
        start_cursor: cursor, page_size: 100,
      }),
    });
    if (!res.ok) break;
    const json = await res.json();
    for (const page of json.results ?? []) {
      const codeProp = page.properties?.Skolenhetskod?.rich_text?.[0]?.plain_text;
      if (codeProp) out.push({ pageId: page.id, code: codeProp });
    }
    cursor = json.has_more ? json.next_cursor : undefined;
  } while (cursor);
  return out;
}

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
