import 'server-only';
import { createHash } from 'node:crypto';

/**
 * Ogenomskinlig referens till en elev, för Notion-kopian.
 *
 * Notion är US-baserat och det här är minderåriga i en pilot — namn och mejl
 * stannar i Supabase (EU). Referensen är DETERMINISTISK: samma elev får samma
 * referens över tid, annars går mönster ("samma elev rapporterar samma sak
 * tre gånger") inte att se i Notion. Uppslag referens → elev görs mot
 * feedback_reports i Supabase.
 *
 * student_id är ett slumpat uuid, så en hash av det är redan opraktisk att
 * vända på. FEEDBACK_REF_SALT gör det omöjligt även för den som skulle råka
 * ha en lista på elevernas uuid:n — sätts den inte faller vi tillbaka på ett
 * konstant salt (fortfarande ogenomskinligt utåt), aldrig på ett tomt.
 */
export function studentReference(studentId: string): string {
  const salt = process.env.FEEDBACK_REF_SALT ?? 'elevante-feedback-v1';
  const digest = createHash('sha256').update(`${salt}:${studentId}`).digest('hex');
  // Base36 av de första 40 bitarna ger 8 tecken utan tvetydiga specialtecken.
  const short = parseInt(digest.slice(0, 10), 16).toString(36).toUpperCase();
  return `E-${short.padStart(8, '0')}`;
}
