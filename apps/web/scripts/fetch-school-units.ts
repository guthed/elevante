// apps/web/scripts/fetch-school-units.ts
/**
 * Hämtar ALLA skolenheter (alla skolformer) från planned-educations v3.
 * Skriver lib/data/school-units.json = [{ code, name, kommun, skolform }].
 * Server-only dataset för admin-CRM-sök. Publika schools.json rörs inte.
 * Kör: npx tsx scripts/fetch-school-units.ts (från apps/web)
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import municipalitiesRaw from '../lib/data/municipalities.json';

const municipalities = municipalitiesRaw as Record<string, string>;
const BASE = 'https://api.skolverket.se/planned-educations/v3';
const ACCEPT = 'application/vnd.skolverket.plannededucations.api.v3.hal+json';
const PAGE_SIZE = 100;

type ApiUnit = {
  code: string;
  name: string;
  geographicalAreaCode?: string;
  typeOfSchooling?: { code: string; displayName: string }[];
};
type PageBody = {
  _embedded?: { listedSchoolUnits?: ApiUnit[] };
  page: { totalPages: number; number: number };
};

async function fetchPage(page: number): Promise<PageBody> {
  const res = await fetch(`${BASE}/school-units?page=${page}&size=${PAGE_SIZE}`, {
    headers: { accept: ACCEPT },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} sida ${page}`);
  return (await res.json()).body as PageBody;
}

async function main() {
  const first = await fetchPage(0);
  const total = first.page.totalPages;
  const all: ApiUnit[] = [...(first._embedded?.listedSchoolUnits ?? [])];
  for (let p = 1; p < total; p++) {
    const body = await fetchPage(p);
    all.push(...(body._embedded?.listedSchoolUnits ?? []));
    if (p % 10 === 0) console.log(`sida ${p}/${total}, ${all.length} enheter`);
  }
  const out = all
    .map((u) => ({
      code: u.code,
      name: u.name,
      kommun: u.geographicalAreaCode
        ? (municipalities[u.geographicalAreaCode] ?? u.geographicalAreaCode)
        : null,
      skolform: (u.typeOfSchooling ?? []).map((t) => t.displayName),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'));
  writeFileSync(
    resolve(__dirname, '../lib/data/school-units.json'),
    JSON.stringify(out),
  );
  console.log(`Skrev ${out.length} skolenheter.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
