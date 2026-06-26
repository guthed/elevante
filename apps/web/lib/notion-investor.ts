const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

function notionHeaders(): Record<string, string> | null {
  const token = process.env.NOTION_TOKEN;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

export type InvestorMatch = { pid: string; label: string };

/**
 * Slår upp en kod i Notion-databasen (bara aktiva rader). Returnerar
 * { pid, label } eller null vid ingen träff. KASTAR vid genuint API-fel
 * (anroparen kan då falla tillbaka på cachen).
 */
export async function findInvestorByCode(code: string): Promise<InvestorMatch | null> {
  const headers = notionHeaders();
  const dbId = process.env.NOTION_INVESTOR_DB_ID;
  if (!headers || !dbId) throw new Error('Notion ej konfigurerad');

  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filter: {
        and: [
          { property: 'Kod', rich_text: { equals: code } },
          { property: 'Aktiv', checkbox: { equals: true } },
        ],
      },
      page_size: 1,
    }),
  });
  if (!res.ok) throw new Error(`Notion query failed: ${res.status}`);

  const data = (await res.json()) as {
    results?: Array<{ id: string; properties?: { Investerare?: { title?: Array<{ plain_text?: string }> } } }>;
  };
  const page = data.results?.[0];
  if (!page) return null;
  const title = page.properties?.Investerare?.title ?? [];
  const label = title.map((t) => t.plain_text ?? '').join('').trim() || 'Investerare';
  return { pid: page.id, label };
}

export type Rollup = {
  status: string;
  lastSeen: string | null;
  maxScroll: number;
  reachedAsk: boolean;
  sessions: number;
  totalMinutes: number;
};

/** Skriver rollup till Notion-raden. Sväljer fel (Supabase har datan). */
export async function pushRollup(pid: string, rollup: Rollup): Promise<void> {
  const headers = notionHeaders();
  if (!headers) return;
  try {
    const res = await fetch(`${NOTION_API}/pages/${pid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        properties: {
          Status: { select: { name: rollup.status } },
          'Senast inne': rollup.lastSeen ? { date: { start: rollup.lastSeen } } : { date: null },
          'Max scroll %': { number: rollup.maxScroll },
          'Nådde the ask': { checkbox: rollup.reachedAsk },
          'Antal sessioner': { number: rollup.sessions },
          'Tid på sidan (min)': { number: rollup.totalMinutes },
        },
      }),
    });
    if (!res.ok) {
      console.error('[notion-investor] pushRollup failed:', res.status, await res.text());
    }
  } catch (error) {
    console.error('[notion-investor] pushRollup error:', error);
  }
}

export function deriveStatus(reachedAsk: boolean, sessions: number): string {
  if (reachedAsk) return 'Nådde the ask';
  if (sessions > 0) return 'Öppnat';
  return 'Inte öppnat';
}
