import 'server-only';
import { signPayload, verifyPayload } from '@/lib/signed-token';

/**
 * Skolbesök: personlig länk till /rektor och /larare (?k=<kod>).
 *
 * Till skillnad från investerardecket finns ingen lösenordsvägg — sidan är
 * densamma för alla. Koden identifierar bara vilken CRM-rad besöket hör till.
 * Sessionen bärs i en signerad token som skickas tillbaka till klienten, inte i
 * en cookie: sidan renderas statiskt och kan därför inte sätta cookies.
 *
 * Signeringen hindrar att någon postar hittepå-engagemang mot en främmande
 * session. Payloaden är läsbar för den som har token — inget hemligt i den.
 */

export type VisitSession = {
  sid: string;
  prospectId: string;
  school: string;
  page: string;
  pid: string | null;
};

function secret(): string | undefined {
  return process.env.SCHOOL_VISIT_SECRET ?? process.env.INVESTOR_DECK_SECRET;
}

function isVisitSession(value: unknown): value is VisitSession {
  const v = value as Partial<VisitSession> | null;
  return (
    typeof v === 'object' && v !== null &&
    typeof v.sid === 'string' &&
    typeof v.prospectId === 'string' &&
    typeof v.school === 'string' &&
    typeof v.page === 'string' &&
    (typeof v.pid === 'string' || v.pid === null)
  );
}

export async function signVisitToken(session: VisitSession): Promise<string | null> {
  return signPayload(secret(), session);
}

export async function verifyVisitToken(token: string | undefined): Promise<VisitSession | null> {
  return verifyPayload(secret(), token, isVisitSession);
}

// Utelämnar 0/O/1/I/l — koden läses och skrivs av människor när en länk
// felsöks. 8 tecken ur 32 ≈ 10^12 kombinationer; koden är inte en hemlighet
// (den skyddar ingenting), bara svår att råka gissa.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function generateVisitCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export const VISIT_PAGES = ['rektor', 'larare'] as const;
export type VisitPage = (typeof VISIT_PAGES)[number];

export function isVisitPage(value: unknown): value is VisitPage {
  return typeof value === 'string' && (VISIT_PAGES as readonly string[]).includes(value);
}
