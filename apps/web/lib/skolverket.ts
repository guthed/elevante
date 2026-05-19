import municipalitiesRaw from '@/lib/data/municipalities.json';

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

const PE = 'https://api.skolverket.se/planned-educations/v3';
const PE_ACCEPT = 'application/vnd.skolverket.plannededucations.api.v3.hal+json';

export function parsePupilCount(value: string): number | null {
  const m = value.replace(/cirka/i, '').trim().match(/\d[\d\s]*/);
  if (!m) return null;
  const n = parseInt(m[0].replace(/\s/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

// Senaste kända elevantal för en gymnasieskola; null om saknas/maskerat/fel.
export async function fetchGymnasiumPupilCount(code: string): Promise<number | null> {
  try {
    const res = await fetch(`${PE}/school-units/${code}/statistics/gy`, {
      headers: { accept: PE_ACCEPT }, next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const body = (await res.json())?.body ?? {};
    // totalNumberOfPupils finns på toppnivå i body (aggregat för hela skolan).
    const series = body?.totalNumberOfPupils;
    if (!Array.isArray(series)) return null;
    const latest = series.find((p: { valueType?: string }) => p?.valueType === 'EXISTS');
    return latest ? parsePupilCount(String(latest.value)) : null;
  } catch {
    return null;
  }
}

// Skolans kontaktuppgifter + fakta (offentlig data). null-fält om något saknas.
// Fältnamn verifierade mot Skolverket planned-educations API v3 2026-05-19:
//   contactInfo.telephone (inte phone), contactInfo.web (inte url),
//   addresses[].street (inte streetAddress).
export async function fetchSchoolFacts(code: string): Promise<SchoolFacts | null> {
  try {
    const res = await fetch(`${PE}/school-units/${code}`, {
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
