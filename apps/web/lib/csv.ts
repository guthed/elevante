/**
 * Minimal CSV-parser. Stöder:
 * - komma-separerade värden
 * - citerade fält med inbäddade kommatecken
 * - escape av " som ""
 * - CR/LF-variationer
 *
 * Inget externt beroende — håller bundle-size nere.
 */
export type CsvRow = Record<string, string>;

export function parseCsv(input: string): CsvRow[] {
  const text = input.replace(/\uFEFF/, '').replace(/\r\n?/g, '\n');
  const rows: string[][] = [];
  let i = 0;
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      pushField();
      i += 1;
      continue;
    }
    if (ch === '\n') {
      pushField();
      pushRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  // Sista fältet/raden
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  // Filtrera tomma rader
  const nonEmpty = rows.filter((r) => r.some((c) => c.length > 0));
  if (nonEmpty.length === 0) return [];

  const header = nonEmpty[0]!.map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const obj: CsvRow = {};
    header.forEach((key, idx) => {
      obj[key] = (r[idx] ?? '').trim();
    });
    return obj;
  });
}
