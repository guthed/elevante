import municipalitiesRaw from '@/lib/data/municipalities.json';
import schoolUnitsRaw from '@/lib/data/school-units.json';

const municipalities = municipalitiesRaw as Record<string, string>;

export type SchoolFacts = {
  address: string | null;
  phone: string | null;
  email: string | null;
  web: string | null;
  municipality: string | null;
  principalType: string | null;
  huvudman: string | null;
  orientation: string | null;
};

export type SchoolUnit = {
  code: string;
  name: string;
  kommun: string | null;
  skolform: string[];
};

const schoolUnits = schoolUnitsRaw as SchoolUnit[];

const PE = 'https://api.skolverket.se/planned-educations/v3';
const PE_ACCEPT = 'application/vnd.skolverket.plannededucations.api.v3.hal+json';

export function parsePupilCount(value: string): number | null {
  const m = value.replace(/cirka/i, '').trim().match(/\d[\d\s]*/);
  if (!m) return null;
  const n = parseInt(m[0].replace(/\s/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

// Fetch med timeout + en retry med backoff. Mjuk: kastar bara vid sista försöket.
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      if (attempt === 1) throw err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

// Server-only sök över det cachade datasetet. Matchar namn (och valfritt
// kommun/skolform). Returnerar max 25 träffar, prefix-match rankas först.
export function searchSchoolUnits(
  query: string,
  filters: { kommun?: string; skolform?: string } = {},
): SchoolUnit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const matches = schoolUnits.filter((u) => {
    if (!u.name.toLowerCase().includes(q)) return false;
    if (filters.kommun && u.kommun !== filters.kommun) return false;
    if (filters.skolform && !u.skolform.some((s) => s === filters.skolform)) return false;
    return true;
  });
  matches.sort((a, b) => {
    const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    return ap - bp || a.name.localeCompare(b.name, 'sv');
  });
  return matches.slice(0, 25);
}

// Skolforms-kod (gy/gr/…) → statistics-subpath. null om vi inte stödjer skolformen.
function statisticsPath(skolform: string[]): string | null {
  const joined = skolform.join(' ').toLowerCase();
  if (joined.includes('gymnasie')) return 'gy';
  if (joined.includes('grundskol')) return 'gr';
  return null; // best-effort: övriga skolformer saknar pålitligt aggregat här
}

export async function fetchPupilCount(
  code: string,
  skolform: string[],
): Promise<number | null> {
  const path = statisticsPath(skolform);
  if (!path) return null;
  try {
    const res = await fetchWithRetry(`${PE}/school-units/${code}/statistics/${path}`, {
      headers: { accept: PE_ACCEPT }, next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const body = (await res.json())?.body ?? {};
    const series = body?.totalNumberOfPupils;
    if (!Array.isArray(series)) return null;
    const latest = series.find((p: { valueType?: string }) => p?.valueType === 'EXISTS');
    return latest ? parsePupilCount(String(latest.value)) : null;
  } catch {
    return null;
  }
}

// Bevarad för den publika priskalkylatorn (gymnasium).
export async function fetchGymnasiumPupilCount(code: string): Promise<number | null> {
  return fetchPupilCount(code, ['Gymnasieskola']);
}

// Skolans kontaktuppgifter + fakta (offentlig data). null-fält om något saknas.
// Fältnamn verifierade mot Skolverket planned-educations API v3 2026-05-19:
//   contactInfo.telephone (inte phone), contactInfo.web (inte url),
//   addresses[].street (inte streetAddress).
export async function fetchSchoolFacts(code: string): Promise<SchoolFacts | null> {
  try {
    const res = await fetchWithRetry(`${PE}/school-units/${code}`, {
      headers: { accept: PE_ACCEPT }, next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const b = (await res.json())?.body ?? {};
    const c = b?.contactInfo ?? {};
    // Föredra postadress; annars första adressen. Bygg fullständig sträng.
    const addrs: Array<{ type?: string; street?: string; zipCode?: string; city?: string }> =
      Array.isArray(c.addresses) ? c.addresses : [];
    const addr = addrs.find((a) => /POSTAL/i.test(a?.type ?? '')) ?? addrs[0];
    const address = addr
      ? [addr.street, [addr.zipCode, addr.city].filter(Boolean).join(' ')]
          .filter(Boolean).join(', ') || null
      : null;
    return {
      address,
      phone: c.telephone ?? null,
      email: c.email ?? null,
      web: c.web ?? null,
      municipality: b?.geographicalAreaCode
        ? (municipalities[b.geographicalAreaCode] ?? b.geographicalAreaCode)
        : null,
      principalType: b?.principalOrganizerType ?? null,
      huvudman: b?.corporationName ?? null,
      orientation: Array.isArray(b?.schoolOrientation)
        ? b.schoolOrientation.join(', ') : (b?.schoolOrientation ?? null),
    };
  } catch {
    return null;
  }
}
