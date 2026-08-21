import { normalizeRow } from '../normalize.js';
import type { Logger } from '../log.js';
import type { RawRow, SchoolRow } from '../types.js';

// NOTION_API_BASE finns bara för att kunna köra paginering mot en stub i test.
const NOTION = process.env.NOTION_API_BASE ?? 'https://api.notion.com/v1';
const NOTION_VERSION = process.env.NOTION_VERSION ?? '2022-06-28';

type NotionPage = { id: string; properties: Record<string, unknown> };

/**
 * Plockar ut ett läsbart värde ur en Notion-property oavsett typ.
 * Formelfälten i databasen returnerar {type:'formula', formula:{...}} och
 * checkboxen kan vara antingen en riktig checkbox eller en formel som ger
 * boolean — båda hanteras här så källan kan ändras utan kodändring.
 */
export function readNotionProperty(prop: unknown): string | boolean | null {
  if (!prop || typeof prop !== 'object') return null;
  const p = prop as Record<string, any>;
  switch (p.type) {
    case 'title':
    case 'rich_text':
      return joinRichText(p[p.type]);
    case 'email':
      return p.email ?? null;
    case 'phone_number':
      return p.phone_number ?? null;
    case 'url':
      return p.url ?? null;
    case 'number':
      return p.number === null || p.number === undefined ? null : String(p.number);
    case 'checkbox':
      return typeof p.checkbox === 'boolean' ? p.checkbox : null;
    case 'select':
      return p.select?.name ?? null;
    case 'status':
      return p.status?.name ?? null;
    case 'multi_select':
      return (p.multi_select ?? []).map((s: any) => s?.name).filter(Boolean).join(', ') || null;
    case 'date':
      return p.date?.start ?? null;
    case 'people':
      return (p.people ?? []).map((u: any) => u?.name).filter(Boolean).join(', ') || null;
    case 'created_time':
      return p.created_time ?? null;
    case 'last_edited_time':
      return p.last_edited_time ?? null;
    case 'formula':
      return readFormula(p.formula);
    case 'rollup':
      if (p.rollup?.type === 'array') {
        const values = (p.rollup.array ?? []).map(readNotionProperty).filter((v: unknown) => v !== null);
        return values.length ? values.join(', ') : null;
      }
      return readFormula(p.rollup);
    default:
      return null;
  }
}

function readFormula(formula: any): string | boolean | null {
  if (!formula) return null;
  switch (formula.type) {
    case 'string':
      return formula.string ?? null;
    case 'boolean':
      return typeof formula.boolean === 'boolean' ? formula.boolean : null;
    case 'number':
      return formula.number === null || formula.number === undefined ? null : String(formula.number);
    case 'date':
      return formula.date?.start ?? null;
    default:
      return null;
  }
}

function joinRichText(parts: unknown): string | null {
  if (!Array.isArray(parts)) return null;
  const text = parts.map((p: any) => p?.plain_text ?? p?.text?.content ?? '').join('').trim();
  return text === '' ? null : text;
}

export function pageToRawRow(page: NotionPage): RawRow {
  const raw: RawRow = {};
  for (const [name, prop] of Object.entries(page.properties ?? {})) {
    raw[name] = readNotionProperty(prop);
  }
  return raw;
}

export type NotionOptions = {
  token: string;
  databaseId: string;
  logger: Logger;
};

/** Hämtar alla rader ur databasen (paginerat, 100 åt gången). */
export async function loadFromNotion({ token, databaseId, logger }: NotionOptions): Promise<SchoolRow[]> {
  const rows: SchoolRow[] = [];
  let cursor: string | undefined;
  let pageNo = 0;

  do {
    const res = await fetch(`${NOTION}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Notion API ${res.status}: ${body}\n` +
          'Kontrollera NOTION_TOKEN, NOTION_DATABASE_ID och att integrationen är ' +
          'inbjuden till databasen (Notion → ⋯ → Connections).',
      );
    }
    const json = (await res.json()) as { results: NotionPage[]; next_cursor: string | null; has_more: boolean };
    pageNo += 1;
    logger.debug(`Notion-sida ${pageNo}: ${json.results.length} rader`);
    for (const page of json.results) {
      rows.push(normalizeRow(pageToRawRow(page), page.id));
    }
    cursor = json.has_more ? json.next_cursor ?? undefined : undefined;
  } while (cursor);

  return rows;
}
