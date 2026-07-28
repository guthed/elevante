// Signerad sessions-cookie för investerardecket. Bär { label, sid, pid }
// signerat med INVESTOR_DECK_SECRET. Signeringen delas med skolbesöken via
// lib/signed-token.ts.

import { signPayload, verifyPayload } from '@/lib/signed-token';

export const INVESTOR_COOKIE = 'investor_access';

export type InvestorSession = { label: string; sid: string; pid: string };

function isInvestorSession(value: unknown): value is InvestorSession {
  const v = value as Partial<InvestorSession> | null;
  return (
    typeof v === 'object' && v !== null &&
    typeof v.label === 'string' &&
    typeof v.sid === 'string' &&
    typeof v.pid === 'string'
  );
}

/** Signerar en sessions-payload. Returnerar null om INVESTOR_DECK_SECRET saknas. */
export async function signSession(payload: InvestorSession): Promise<string | null> {
  return signPayload(process.env.INVESTOR_DECK_SECRET, payload);
}

/** Verifierar en token och returnerar payloaden, eller null. */
export async function verifySession(token: string | undefined): Promise<InvestorSession | null> {
  return verifyPayload(process.env.INVESTOR_DECK_SECRET, token, isInvestorSession);
}
