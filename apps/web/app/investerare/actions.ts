'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { INVESTOR_COOKIE, makeAccessToken } from '@/lib/investor-access';

export type GateState = { error: boolean };

export async function unlockInvestorDeck(_prev: GateState, formData: FormData): Promise<GateState> {
  const password = process.env.INVESTOR_DECK_PASSWORD;
  const input = (formData.get('password') ?? '').toString();
  const nextRaw = (formData.get('next') ?? '/investerare').toString();
  const next = nextRaw.startsWith('/investerare') ? nextRaw : '/investerare';

  if (!password || input !== password) {
    return { error: true };
  }

  const token = await makeAccessToken(password);
  const store = await cookies();
  store.set(INVESTOR_COOKIE, token, {
    httpOnly: true,
    // Secure i produktion (HTTPS); av i lokal dev så cookien fungerar över http://localhost.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/investerare',
    maxAge: 60 * 60 * 24 * 30, // 30 dagar
  });
  redirect(next);
}
