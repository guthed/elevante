'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { INVESTOR_COOKIE, signSession } from '@/lib/investor-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyInvestorEvent } from '@/lib/investor-notify';

export type GateState = { error: boolean };

type VerifyRow = { invite_id: string; label: string };

export async function unlockInvestorDeck(_prev: GateState, formData: FormData): Promise<GateState> {
  const code = (formData.get('password') ?? '').toString().trim();
  const nextRaw = (formData.get('next') ?? '/investerare').toString();
  const next = nextRaw.startsWith('/investerare') ? nextRaw : '/investerare';
  const lang = (formData.get('lang') ?? 'sv').toString() === 'en' ? 'en' : 'sv';

  if (!code) return { error: true };

  const supabase = await createSupabaseServerClient();
  const rpc = supabase as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: VerifyRow[] | null }>;
  };

  const { data } = await rpc.rpc('verify_investor_code', { p_code: code });
  const invite = data?.[0];
  if (!invite) return { error: true };

  const sid = crypto.randomUUID();
  await rpc.rpc('record_investor_open', {
    p_invite_id: invite.invite_id,
    p_session_id: sid,
    p_locale: lang,
  });

  const token = await signSession({ label: invite.label, sid });
  if (token) {
    const store = await cookies();
    store.set(INVESTOR_COOKIE, token, {
      httpOnly: true,
      // Secure i produktion (HTTPS); av i lokal dev så cookien fungerar över http://localhost.
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      // path '/' så cookien når både /investerare* (gaten) och
      // /api/investerare/telemetry (en /investerare-path skulle inte matcha /api/...).
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 dagar
    });
  }

  await notifyInvestorEvent('open', invite.label, { locale: lang });
  await rpc.rpc('mark_investor_notified', { p_session_id: sid, p_kind: 'open' });

  redirect(next);
}
