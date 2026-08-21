import { lookupPhase } from './phases.js';
import { splitName } from './normalize.js';
import { getContactState, hashProperties, setContactState, type StateFile } from './state.js';
import type { LoopsApi } from './loops.js';
import type { Logger } from './log.js';
import type { SchoolRow } from './types.js';

/**
 * Adresser som Loops behandlar som testadresser: kontakten skapas och eventet
 * registreras, men inget mejl lämnar systemet. Perfekt för att verifiera att
 * ett workflow triggar innan man kör skarpt mot riktiga rektorer.
 */
export const TEST_DOMAINS = ['example.com', 'example.org', 'example.net', 'test.com'] as const;

export function isTestAddress(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return TEST_DOMAINS.some((d) => domain === d);
}

export type SyncOptions = {
  dryRun: boolean;
  testMode: boolean;
  /** Skicka om event även om state säger att de redan gått ut. */
  force: boolean;
  limit: number | null;
  /** Kör bara raden vars mottagaradress matchar exakt. */
  only: string | null;
};

export type Outcome =
  | { kind: 'synced'; contact: 'uppdaterad' | 'oförändrad'; event: 'skickat' | 'redan skickat' }
  | { kind: 'skipped'; reason: string }
  | { kind: 'error'; reason: string };

export type RowResult = {
  school: string;
  email: string | null;
  status: string | null;
  eventName: string | null;
  outcome: Outcome;
};

export type SyncSummary = {
  total: number;
  processed: number;
  contactsUpdated: number;
  eventsSent: number;
  eventsAlreadySent: number;
  skipped: number;
  errors: number;
  results: RowResult[];
};

/**
 * Kontakt-propertyn som skrivs till Loops. Utelämnade nycklar rörs inte —
 * därför sätts firstName bara när vi faktiskt har en personlig kontakt, i
 * stället för att skickas som tom sträng (det hade nollat ett befintligt värde).
 */
export function contactProperties(row: SchoolRow, eventName: string): Record<string, unknown> {
  const { firstName, lastName } = splitName(row.personalContact ? row.rectorName : null);
  const props: Record<string, unknown> = {
    skolnamn: row.schoolName,
    skolenhetskod: row.schoolUnitCode ?? '',
    kommun: row.municipality ?? '',
    huvudman: row.huvudman ?? '',
    halsning: row.greeting ?? 'Hej,',
    personligKontakt: row.personalContact,
    kontaktstatus: row.contactStatus ?? '',
    outreachEvent: eventName,
  };
  if (firstName) props.firstName = firstName;
  if (lastName) props.lastName = lastName;
  return props;
}

/** Loops-properties som måste finnas innan de går att segmentera på. */
export const CUSTOM_PROPERTIES: ReadonlyArray<{ name: string; type: 'string' | 'boolean' }> = [
  { name: 'skolnamn', type: 'string' },
  { name: 'skolenhetskod', type: 'string' },
  { name: 'kommun', type: 'string' },
  { name: 'huvudman', type: 'string' },
  { name: 'halsning', type: 'string' },
  { name: 'personligKontakt', type: 'boolean' },
  { name: 'kontaktstatus', type: 'string' },
  { name: 'outreachEvent', type: 'string' },
];

export type RunDeps = {
  rows: SchoolRow[];
  state: StateFile;
  loops: LoopsApi;
  logger: Logger;
  options: SyncOptions;
  /** Kallas efter varje ändring av state — så ett avbrott inte ger dubbla mejl. */
  persist: () => void;
};

export async function runSync({ rows, state, loops, logger, options, persist }: RunDeps): Promise<SyncSummary> {
  const summary: SyncSummary = {
    total: rows.length,
    processed: 0,
    contactsUpdated: 0,
    eventsSent: 0,
    eventsAlreadySent: 0,
    skipped: 0,
    errors: 0,
    results: [],
  };

  const seenEmails = new Set<string>();

  const record = (row: SchoolRow, email: string | null, eventName: string | null, outcome: Outcome) => {
    summary.results.push({ school: row.schoolName, email, status: row.contactStatus, eventName, outcome });
    if (outcome.kind === 'skipped') summary.skipped += 1;
    if (outcome.kind === 'error') summary.errors += 1;
  };

  for (const row of rows) {
    if (options.limit !== null && summary.processed >= options.limit) {
      record(row, row.recipientEmail, null, { kind: 'skipped', reason: `över --limit ${options.limit}` });
      continue;
    }

    const phase = lookupPhase(row.contactStatus);
    if (phase.kind !== 'phase') {
      const reason =
        phase.kind === 'empty'
          ? 'ingen Kontaktstatus satt'
          : phase.kind === 'ignored'
            ? `status "${row.contactStatus}" ska inte kontaktas`
            : `okänd Kontaktstatus "${row.contactStatus}" — saknas i phases.ts`;
      if (phase.kind === 'unknown') logger.warn(`${row.schoolName}: ${reason}`);
      record(row, row.recipientEmail, null, { kind: 'skipped', reason });
      continue;
    }
    const { eventName } = phase.phase;

    const email = row.recipientEmail;
    if (!email) {
      // I testläge är en rad utan adress per definition inte en testadress —
      // då är den överhoppad, inte trasig, och ska inte färga körningen röd.
      if (options.testMode) {
        record(row, null, eventName, { kind: 'skipped', reason: 'testläge: inte en testadress' });
        continue;
      }
      logger.error(`${row.schoolName}: saknar giltig mottagaradress (varken rektor- eller skoladress).`);
      record(row, null, eventName, { kind: 'error', reason: 'saknar giltig e-postadress' });
      continue;
    }

    if (options.only && email !== options.only.toLowerCase()) {
      record(row, email, eventName, { kind: 'skipped', reason: 'matchar inte --only' });
      continue;
    }

    const testAddress = isTestAddress(email);
    if (options.testMode && !testAddress) {
      record(row, email, eventName, { kind: 'skipped', reason: 'testläge: inte en testadress' });
      continue;
    }
    if (!options.testMode && testAddress) {
      // Skarp körning ska inte fylla den riktiga listan med testkontakter.
      record(row, email, eventName, { kind: 'skipped', reason: 'testadress — kör med --test' });
      continue;
    }

    if (seenEmails.has(email)) {
      logger.warn(`${row.schoolName}: ${email} förekommer på fler än en rad — hoppar över dubbletten.`);
      record(row, email, eventName, { kind: 'skipped', reason: 'dubblett i källan' });
      continue;
    }
    seenEmails.add(email);
    summary.processed += 1;

    const props = contactProperties(row, eventName);
    const hash = hashProperties(props);
    const prior = getContactState(state, email);
    const next = { ...prior, events: { ...prior.events }, schoolName: row.schoolName };

    let contactOutcome: 'uppdaterad' | 'oförändrad' = 'oförändrad';
    if (options.force || prior.contactHash !== hash) {
      const res = await loops.upsertContact(email, props);
      if (!res.ok) {
        logger.error(`${row.schoolName} <${email}>: kontaktuppdatering misslyckades (${res.status}) ${res.error}`);
        record(row, email, eventName, { kind: 'error', reason: `contacts/update ${res.status}` });
        continue;
      }
      contactOutcome = 'uppdaterad';
      summary.contactsUpdated += 1;
      next.contactHash = hash;
      next.contactSyncedAt = new Date().toISOString();
      next.lastStatus = row.contactStatus;
      if (!options.dryRun) {
        setContactState(state, email, next);
        persist();
      }
    }

    const alreadySent = Boolean(prior.events[eventName]);
    let eventOutcome: 'skickat' | 'redan skickat' = 'redan skickat';
    if (alreadySent && !options.force) {
      summary.eventsAlreadySent += 1;
      logger.debug(`${row.schoolName} <${email}>: ${eventName} skickades redan ${prior.events[eventName]}`);
    } else {
      const res = await loops.sendEvent(email, eventName, {
        skolnamn: row.schoolName,
        kommun: row.municipality ?? '',
        kontaktstatus: row.contactStatus ?? '',
        personligKontakt: row.personalContact,
      });
      if (!res.ok) {
        logger.error(`${row.schoolName} <${email}>: event ${eventName} misslyckades (${res.status}) ${res.error}`);
        record(row, email, eventName, { kind: 'error', reason: `events/send ${res.status}` });
        continue;
      }
      eventOutcome = 'skickat';
      summary.eventsSent += 1;
      next.events[eventName] = new Date().toISOString();
      next.lastStatus = row.contactStatus;
      if (!options.dryRun) {
        setContactState(state, email, next);
        persist();
      }
    }

    logger.info(
      `✓ ${row.schoolName} <${email}> — ${phase.phase.label}: kontakt ${contactOutcome}, event ${eventName} ${eventOutcome}`,
    );
    record(row, email, eventName, { kind: 'synced', contact: contactOutcome, event: eventOutcome });
  }

  return summary;
}
