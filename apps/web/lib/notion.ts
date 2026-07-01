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
  lookupCount: number;
  leadEmail: string | null;
  skolform: string[];
  dataSource: 'Inbound-uppslag' | 'Admin-sök' | 'Batch';
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

// Fält som synken ALLTID får skriva (maskinstyrda). Rör aldrig Pipeline/Owner/
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
    'AI-brief': rich(p.aiBrief),
    'Antal uppslag': { number: p.lookupCount },
    'Lead-e-post': { email: p.leadEmail },
    'Lead-status': { select: { name: p.leadEmail ? 'Kontaktuppgift lämnad' : 'Ny' } },
    Skolform: { multi_select: p.skolform.map((name) => ({ name })) },
    Datakälla: { select: { name: p.dataSource } },
    Synkstatus: { status: { name: 'OK' } },
    'Senast synkad': { date: { start: new Date().toISOString() } },
    'Först sedd': { date: { start: p.firstSeen } },
    'Senast sedd': { date: { start: p.lastSeen } },
  };
}

// Bara vid create: sätt initial Pipeline. Vid update rörs den aldrig.
function createOnlyProperties() {
  return { Pipeline: { status: { name: 'Ej kontaktad' } } };
}

export async function upsertNotionProspect(p: NotionProspect): Promise<string | null> {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_LEADS_DATABASE_ID;
  if (!token || !databaseId) {
    console.warn('[notion] env saknas — hoppar över synk.');
    return null;
  }
  const headers = notionHeaders(token);
  // Föredra känt sid-id; annars fallback-query på Skolenhetskod.
  const pageId = p.notionPageId ?? (await queryNotionProspectByCode(p.schoolUnitCode));
  if (pageId === 'DUPLICATE') {
    await markNeedsCheck(p.schoolUnitCode);
    return null;
  }
  const url = pageId ? `${NOTION}/pages/${pageId}` : `${NOTION}/pages`;
  const properties = pageId
    ? machineProperties(p)
    : { ...machineProperties(p), ...createOnlyProperties() };
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
    body: JSON.stringify({ properties: { Synkstatus: { status: { name: 'Behöver kollas' } } } }),
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

// För cron: alla sidor med Pipeline ≠ Nej. Returnerar {pageId, code}.
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
        filter: { property: 'Pipeline', status: { does_not_equal: 'Nej' } },
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
