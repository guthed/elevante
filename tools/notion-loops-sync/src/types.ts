/** En normaliserad skolrad — samma form oavsett om källan är Notion eller CSV. */
export type SchoolRow = {
  /** Notion page-id, eller "csv:<radnummer>" när källan är en CSV-export. */
  sourceId: string;
  schoolName: string;
  rectorName: string | null;
  /** Skolans allmänna adress. */
  schoolEmail: string | null;
  /** Rektorns direktadress, om vi har den. */
  rectorEmail: string | null;
  personalContact: boolean;
  /** "Mottagaradress (utskick)" — den adress vi faktiskt skickar till. */
  recipientEmail: string | null;
  /** "Hälsningsvariant (utskick)" — t.ex. "Hej Anna," eller "Hej,". */
  greeting: string | null;
  contactStatus: string | null;
  /** Skolverkets skolenhetskod — stabil nyckel för samma skola i CRM och Loops. */
  schoolUnitCode: string | null;
  municipality: string | null;
  huvudman: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
};

/** Rådata från källan: fältnamn (som de heter i Notion) → strängvärde. */
export type RawRow = Record<string, string | boolean | null>;
