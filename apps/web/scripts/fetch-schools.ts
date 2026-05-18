/**
 * Hämtar aktiva gymnasieskolor från Skolverkets planned-educations API v3.
 * Skriver lib/data/schools.json = [{ code, name }], sorterat på namn.
 *
 * Kör: npx tsx scripts/fetch-schools.ts (från apps/web)
 *
 * API: https://api.skolverket.se/planned-educations/v3/school-units
 *   Stöder ?typeOfSchooling=gy — returnerar bara gymnasieskolor.
 *   Paginering: ?page=N&size=100 (max ~100 per sida).
 *   Fält per post: { code, name, ... }
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = 'https://api.skolverket.se/planned-educations/v3';
const ACCEPT = 'application/vnd.skolverket.plannededucations.api.v3.hal+json';
const PAGE_SIZE = 100;

type ApiSchoolUnit = {
  code: string;
  name: string;
};

type PageBody = {
  _embedded: {
    listedSchoolUnits: ApiSchoolUnit[];
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
};

type ApiResponse = {
  status: string;
  message: string;
  body: PageBody;
};

async function fetchPage(page: number): Promise<ApiResponse> {
  const url = `${BASE_URL}/school-units?typeOfSchooling=gy&page=${page}&size=${PAGE_SIZE}`;
  const res = await fetch(url, { headers: { accept: ACCEPT } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} för sida ${page}: ${await res.text()}`);
  }
  return res.json() as Promise<ApiResponse>;
}

async function main() {
  console.log('Hämtar gymnasieskolor från Skolverkets planned-educations API...');

  // Hämta första sidan för att få totalPages
  const first = await fetchPage(0);
  const { totalElements, totalPages } = first.body.page;
  console.log(`Totalt ${totalElements} gymnasieskolor på ${totalPages} sidor (storlek ${PAGE_SIZE}).`);

  const allSchools: ApiSchoolUnit[] = [
    ...first.body._embedded.listedSchoolUnits,
  ];

  // Hämta resterande sidor med begränsad parallellitet (5 åt gången)
  const CONCURRENCY = 5;
  for (let start = 1; start < totalPages; start += CONCURRENCY) {
    const batch = Array.from(
      { length: Math.min(CONCURRENCY, totalPages - start) },
      (_, i) => fetchPage(start + i),
    );
    const results = await Promise.all(batch);
    for (const r of results) {
      allSchools.push(...r.body._embedded.listedSchoolUnits);
    }
    process.stdout.write(
      `  Hämtat ${allSchools.length} / ${totalElements}...\r`,
    );
  }
  process.stdout.write('\n');

  // Normalisera: { code, name }, filtrera bort poster utan kod eller namn
  const schools = allSchools
    .filter((s) => s.code && s.name)
    .map((s) => ({ code: s.code.trim(), name: s.name.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'));

  const outPath = resolve(import.meta.dirname, '../lib/data/schools.json');
  writeFileSync(outPath, JSON.stringify(schools, null, 2), 'utf-8');

  console.log(`✓ ${schools.length} gymnasieskolor skrivna till lib/data/schools.json`);
}

main().catch((err) => {
  console.error('Fel:', err);
  process.exit(1);
});
