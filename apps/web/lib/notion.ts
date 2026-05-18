export type NotionProspect = {
  notionPageId: string | null;
  schoolName: string;
  municipality: string | null;
  huvudman: string | null;
  students: number | null;
  priceSek: number | null;
  contact: string | null;        // sammanslagen telefon/e-post/adress
  aiBrief: string | null;
  lookupCount: number;
  leadEmail: string | null;
  firstSeen: string;
  lastSeen: string;
};

function properties(p: NotionProspect) {
  const rich = (t: string | null) =>
    t ? { rich_text: [{ text: { content: t.slice(0, 1900) } }] } : { rich_text: [] };
  return {
    Skola: { title: [{ text: { content: p.schoolName } }] },
    Kommun: rich(p.municipality),
    Huvudman: rich(p.huvudman),
    'Antal elever': { number: p.students },
    'Uppskattat pris': { number: p.priceSek },
    Kontakt: rich(p.contact),
    'AI-brief': rich(p.aiBrief),
    'Antal uppslag': { number: p.lookupCount },
    'Lead-e-post': { email: p.leadEmail },
    Status: { select: { name: p.leadEmail ? 'Kontaktuppgift lämnad' : 'Ny' } },
    'Först sedd': { date: { start: p.firstSeen } },
    'Senast sedd': { date: { start: p.lastSeen } },
  };
}

// Returnerar Notion-sidans id, eller null om synk hoppades över/misslyckades mjukt.
export async function upsertNotionProspect(p: NotionProspect): Promise<string | null> {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_LEADS_DATABASE_ID;
  if (!token || !databaseId) {
    console.warn('[notion] env saknas — hoppar över synk.');
    return null;
  }
  const headers = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
  const url = p.notionPageId
    ? `https://api.notion.com/v1/pages/${p.notionPageId}`
    : 'https://api.notion.com/v1/pages';
  const body = p.notionPageId
    ? { properties: properties(p) }
    : { parent: { database_id: databaseId }, properties: properties(p) };
  const res = await fetch(url, {
    method: p.notionPageId ? 'PATCH' : 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Notion API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.id ?? p.notionPageId;
}
