/**
 * Kopplingen mellan Kontaktstatus i Notion och event-namnet i Loops.
 *
 * Det här är den ENDA plats du behöver röra för att lägga till en ny fas:
 * lägg till ett objekt nedan, skapa ett workflow i Loops som lyssnar på
 * eventName, och lägg till statusvärdet i Notion-databasens select-fält.
 */
export type Phase = {
  /** Exakt som statusvärdet står i Notion. */
  status: string;
  /** eventName som skickas till POST /v1/events/send. */
  eventName: string;
  /** Kort etikett för loggen. */
  label: string;
};

export const PHASES: readonly Phase[] = [
  {
    status: 'Att kontakta – Fas 1',
    eventName: 'outreach_fas1_started',
    label: 'Fas 1',
  },
  {
    status: 'Flaggskepp – prioritera parallellt',
    eventName: 'outreach_flaggskepp_started',
    label: 'Flaggskepp',
  },
  {
    status: 'Kommunal – tidig dialog',
    eventName: 'outreach_kommunal_dialog_started',
    label: 'Kommunal',
  },
];

/**
 * Statusvärden som medvetet inte ska ge något event. Raden räknas som
 * "hoppas över", inte som ett fel.
 *
 * "Redan i dialog" är skolor vi redan har en relation med — Amerikanska
 * Gymnasiet har påskriven LOI. De ska aldrig få ett kall-outreach-mejl, och
 * en tom fas är rätt svar för dem, inte en varning.
 */
export const IGNORED_STATUSES: readonly string[] = ['Ej påbörjad', 'Redan i dialog'];

/**
 * Statusvärden jämförs normaliserat: Notion, CSV-exporter och handpåläggning
 * blandar en dash (–), bindestreck (-) och dubbla mellanslag. Att matcha på
 * exakt sträng gör att en osynlig teckenskillnad tyst tappar en hel fas.
 */
export function normalizeStatus(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const BY_STATUS = new Map(PHASES.map((p) => [normalizeStatus(p.status), p]));
const IGNORED = new Set(IGNORED_STATUSES.map(normalizeStatus));

export type PhaseLookup =
  | { kind: 'phase'; phase: Phase }
  | { kind: 'ignored' }
  | { kind: 'empty' }
  | { kind: 'unknown' };

export function lookupPhase(status: string | null | undefined): PhaseLookup {
  const key = normalizeStatus(status);
  if (!key) return { kind: 'empty' };
  const phase = BY_STATUS.get(key);
  if (phase) return { kind: 'phase', phase };
  if (IGNORED.has(key)) return { kind: 'ignored' };
  return { kind: 'unknown' };
}
