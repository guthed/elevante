import { FIELDS, type FieldKey } from './fields.js';
import type { RawRow, SchoolRow } from './types.js';

function pick(raw: RawRow, key: FieldKey): string | boolean | null {
  for (const name of FIELDS[key]) {
    const value = raw[name];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function asText(value: string | boolean | null): string | null {
  if (value === null) return null;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function asBool(value: string | boolean | null): boolean | null {
  if (value === null) return null;
  if (typeof value === 'boolean') return value;
  const v = value.trim().toLowerCase();
  if (['true', 'ja', 'yes', 'x', '1', 'sant', '✓'].includes(v)) return true;
  if (['false', 'nej', 'no', '0', 'falskt', ''].includes(v)) return false;
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

export function isValidEmail(value: string | null | undefined): value is string {
  return typeof value === 'string' && EMAIL_RE.test(value.trim());
}

export function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  // Notion-fält innehåller ibland "info@skola.se, rektor@skola.se" — vi tar
  // första adressen hellre än att skicka en ogiltig sträng till Loops.
  const first = value.split(/[,;\s]+/).find((part) => part.includes('@'));
  const cleaned = (first ?? value).trim().toLowerCase();
  return isValidEmail(cleaned) ? cleaned : null;
}

/**
 * Gör en rå rad till en SchoolRow.
 *
 * Formelfälten (Personlig kontakt?, Mottagaradress, Hälsningsvariant) räknas om
 * lokalt när de saknas i källan — en CSV kan vara exporterad innan formlerna
 * fanns, och då ska synken fungera ändå i stället för att tappa hela raden.
 */
export function normalizeRow(raw: RawRow, sourceId: string): SchoolRow {
  const rectorName = asText(pick(raw, 'rectorName'));
  const schoolEmail = normalizeEmail(asText(pick(raw, 'schoolEmail')));
  const rectorEmail = normalizeEmail(asText(pick(raw, 'rectorEmail')));

  const declaredPersonal = asBool(pick(raw, 'personalContact'));
  const personalContact = declaredPersonal ?? rectorEmail !== null;

  const declaredRecipient = normalizeEmail(asText(pick(raw, 'recipientEmail')));
  const recipientEmail =
    declaredRecipient ?? (personalContact ? rectorEmail : null) ?? rectorEmail ?? schoolEmail;

  const declaredGreeting = asText(pick(raw, 'greeting'));
  const greeting =
    declaredGreeting ?? (personalContact && rectorName ? `Hej ${rectorName},` : 'Hej,');

  return {
    sourceId,
    schoolName: asText(pick(raw, 'schoolName')) ?? '(namnlös skola)',
    rectorName,
    schoolEmail,
    rectorEmail,
    personalContact,
    recipientEmail,
    greeting,
    contactStatus: asText(pick(raw, 'contactStatus')),
    schoolUnitCode: asText(pick(raw, 'schoolUnitCode')),
    municipality: asText(pick(raw, 'municipality')),
    huvudman: asText(pick(raw, 'huvudman')),
    phone: asText(pick(raw, 'phone')),
    website: asText(pick(raw, 'website')),
    address: asText(pick(raw, 'address')),
  };
}

/**
 * Loops har inbyggda firstName/lastName. Hela hälsningsraden ligger kvar i
 * `halsning` — det är den mallarna bör använda. firstName finns för de fall
 * där man vill skriva "{{firstName}}" mitt i en mening.
 */
export function splitName(fullName: string | null): { firstName: string | null; lastName: string | null } {
  if (!fullName) return { firstName: null, lastName: null };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: null, lastName: null };
  const firstName = parts[0]!;
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
  return { firstName, lastName };
}
