/**
 * Kolumnnamnen i Notion-databasen "Gymnasieskolor i Stockholms län".
 * Ändras ett fältnamn i Notion räcker det att ändra här — både Notion-API-
 * källan och CSV-källan läser samma nycklar.
 *
 * Varje post är en lista med accepterade namn: första träffen vinner. Det gör
 * att en CSV som exporterats innan ett fält döptes om fortfarande går att köra.
 */
export const FIELDS = {
  schoolName: ['Skolnamn', 'Skola', 'Name'],
  rectorName: ['Rektor (namn)', 'Rektor'],
  schoolEmail: ['E-post (skolans allmänna)', 'E-post', 'Epost'],
  rectorEmail: ['Rektor e-post (direkt)', 'Rektor e-post'],
  personalContact: ['Personlig kontakt?', 'Personlig kontakt'],
  recipientEmail: ['Mottagaradress (utskick)', 'Mottagaradress'],
  greeting: ['Hälsningsvariant (utskick)', 'Hälsningsvariant'],
  contactStatus: ['Kontaktstatus', 'Status'],
  schoolUnitCode: ['Skolenhetskod'],
  municipality: ['Kommun'],
  huvudman: ['Huvudman'],
  phone: ['Telefon'],
  website: ['Webbplats', 'Hemsida'],
  address: ['Adress'],
} as const satisfies Record<string, readonly string[]>;

export type FieldKey = keyof typeof FIELDS;

/** Alla fältnamn vi någonsin frågar efter — används av CSV-diagnostiken. */
export function primaryFieldNames(): string[] {
  return Object.values(FIELDS).map((names) => names[0]!);
}
