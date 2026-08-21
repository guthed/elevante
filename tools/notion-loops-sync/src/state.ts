import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Lokal idempotens-logg. Nyckel = e-postadress (gemener), eftersom det är
 * identiteten i Loops — samma rektor på två Notion-rader ska inte få två mejl.
 */
export type ContactState = {
  /** Senast synkade Kontaktstatus, för läsbarhet i filen och i loggen. */
  lastStatus: string | null;
  /** Hash av kontakt-propertyna. Ändras inget skippar vi ett onödigt API-anrop. */
  contactHash: string | null;
  contactSyncedAt: string | null;
  /** eventName → ISO-tidpunkt då det skickades. */
  events: Record<string, string>;
  schoolName?: string;
};

export type StateFile = {
  version: 1;
  updatedAt: string;
  contacts: Record<string, ContactState>;
};

export function emptyState(): StateFile {
  return { version: 1, updatedAt: new Date().toISOString(), contacts: {} };
}

export function loadState(path: string): StateFile {
  if (!existsSync(path)) return emptyState();
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<StateFile>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.contacts !== 'object') {
      return emptyState();
    }
    return { version: 1, updatedAt: parsed.updatedAt ?? new Date().toISOString(), contacts: parsed.contacts as Record<string, ContactState> };
  } catch {
    // Hellre en tom state än en krasch: värsta fallet blir ett omskickat event,
    // och filen skrivs om korrekt direkt efter körningen.
    return emptyState();
  }
}

/** Skriver atomärt (temp + rename) så ett avbrott inte lämnar en trasig fil. */
export function saveState(path: string, state: StateFile): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  const payload: StateFile = { ...state, version: 1, updatedAt: new Date().toISOString() };
  writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

export function getContactState(state: StateFile, email: string): ContactState {
  return (
    state.contacts[email.toLowerCase()] ?? {
      lastStatus: null,
      contactHash: null,
      contactSyncedAt: null,
      events: {},
    }
  );
}

export function setContactState(state: StateFile, email: string, next: ContactState): void {
  state.contacts[email.toLowerCase()] = next;
}

export function hashProperties(properties: Record<string, unknown>): string {
  const stable = Object.keys(properties)
    .sort()
    .map((key) => [key, properties[key]]);
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex').slice(0, 16);
}
