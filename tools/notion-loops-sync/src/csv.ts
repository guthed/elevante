/**
 * Minimal CSV-parser, portad från apps/web/lib/csv.ts och utökad med
 * avgränsar-detektion: Notions egen export är kommaseparerad, men samma fil
 * öppnad och sparad i svensk Excel blir semikolonseparerad. Att gissa fel ger
 * en enda kolumn med hela raden i — och en tyst "0 rader att synka".
 */
export type CsvRow = Record<string, string>;

export function detectDelimiter(text: string): ',' | ';' | '\t' {
  const firstLine = text.replace(/\uFEFF/, '').split(/\r?\n/, 1)[0] ?? '';
  const counts: Array<[',' | ';' | '\t', number]> = [
    [',', countOutsideQuotes(firstLine, ',')],
    [';', countOutsideQuotes(firstLine, ';')],
    ['\t', countOutsideQuotes(firstLine, '\t')],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  const best = counts[0]!;
  return best[1] > 0 ? best[0] : ',';
}

function countOutsideQuotes(line: string, char: string): number {
  let inQuotes = false;
  let n = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch === char) n++;
  }
  return n;
}

export function parseCsv(input: string, delimiter?: string): CsvRow[] {
  const text = input.replace(/\uFEFF/, '').replace(/\r\n?/g, '\n');
  const sep = delimiter ?? detectDelimiter(text);
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
    if (ch === sep) {
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
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

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
