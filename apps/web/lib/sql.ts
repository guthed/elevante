// Delad SQL-hjälpare. `identity_domain`/e-post kan ha sparats med vilken casing
// en admin (eller ett CSV-import-flöde) råkade skriva in — jämförelser mot dem
// måste vara case-insensitive. `.eq()` är det inte, så vi använder `.ilike()`
// (case-insensitive) och escapar bort ILIKE:s egna wildcard-tecken (`%`, `_`,
// `\`) så matchningen förblir exakt, inte ett mönster — domännamn kan i teorin
// innehålla understreck. Extraherad ur app/api/auth/callback/route.ts (Task 3)
// för återanvändning i lib/data/admin.ts (Task 6) — samma logik, en källa.
export function escapeForIlike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
