import { readFileSync } from 'node:fs';
import { parseCsv } from '../csv.js';
import { primaryFieldNames } from '../fields.js';
import { normalizeRow } from '../normalize.js';
import type { Logger } from '../log.js';
import type { SchoolRow } from '../types.js';

/** Läser en Notion-CSV-export och normaliserar den till SchoolRow[]. */
export function loadFromCsv(path: string, logger: Logger): SchoolRow[] {
  const text = readFileSync(path, 'utf8');
  const rows = parseCsv(text);
  if (rows.length === 0) {
    logger.warn(`CSV-filen ${path} innehåller inga rader.`);
    return [];
  }

  // En kolumnrubrik som stavats fel ger annars en tyst tom synk.
  const headers = new Set(Object.keys(rows[0]!));
  const missing = primaryFieldNames().filter((name) => !headers.has(name));
  if (missing.length > 0) {
    logger.debug(`Kolumner som saknas i CSV:n (härleds om möjligt): ${missing.join(', ')}`);
  }

  // +2: rad 1 är rubrikraden, och radnummer räknas från 1 i kalkylprogram.
  return rows.map((raw, index) => normalizeRow(raw, `csv:${index + 2}`));
}
