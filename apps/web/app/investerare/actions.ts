'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { INVESTOR_COOKIE, signSession } from '@/lib/investor-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyInvestorEvent } from '@/lib/investor-notify';
import { findInvestorByCode, pushRollup, deriveStatus } from '@/lib/notion-investor';

export type GateState = { error: boolean };

type CacheRow = { notion_page_id: string; label: string };
type RollupRow = { max_scroll: number; reached_ask: boolean; last_seen: string | null; sessions: number };

export async function unlockInvestorDeck(_prev: GateState, formData: FormData): Promise<GateState> {
  const code = (formData.get('password') ?? '').toString().trim();
  const nextRaw = (formData.get('next') ?? '/investerare').toString();
  const next = nextRaw.startsWith('/investerare') ? nextRaw : '/investerare';
  const lang = (formData.get('lang') ?? 'sv').toString() === 'en' ? 'en' : 'sv';

  if (!code) return { error: true };

  const supabase = await createSupabaseServerClient();
  const rpc = supabase as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };

  // Resolva koden mot Notion (auktoritativt). Vid Notion-FEL: cache-fallback.
  // Vid "ingen träff" (null): avvisa (respekterar avstängda/borttagna koder).
  let resolved: { pid: string; label: string } | null = null;
  let notionErrored = false;
  try {
    resolved = await findInvestorByCode(code);
  } catch {
    notionErrored = true;
  }
  if (!resolved && notionErrored) {
    const { data } = await rpc.rpc('get_cached_invite_by_code', { p_code: code });
    const row = (data as CacheRow[] | null)?.[0];
    if (row) resolved = { pid: row.notion_page_id, label: row.label };
  }
  if (!resolved) return { error: true };

  const { data: upsertData } = await rpc.rpc('upsert_investor_invite', {
    p_notion_page_id: resolved.pid,
    p_label: resolved.label,
    p_code: code,
  });
  const inviteId = upsertData as string | null;
  if (!inviteId) return { error: true };

  const sid = crypto.randomUUID();
  await rpc.rpc('record_investor_open', {
    p_invite_id: inviteId,
    p_session_id: sid,
    p_locale: lang,
  });

  const token = await signSession({ label: resolved.label, sid, pid: resolved.pid });
  if (token) {
    const store = await cookies();
    store.set(INVESTOR_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  await notifyInvestorEvent('open', resolved.label, { locale: lang });
  await rpc.rpc('mark_investor_notified', { p_session_id: sid, p_kind: 'open' });

  const { data: rollupData } = await rpc.rpc('get_investor_rollup', { p_notion_page_id: resolved.pid });
  const r = (rollupData as RollupRow[] | null)?.[0];
  if (r) {
    await pushRollup(resolved.pid, {
      status: deriveStatus(r.reached_ask, r.sessions),
      lastSeen: r.last_seen,
      maxScroll: r.max_scroll,
      reachedAsk: r.reached_ask,
      sessions: r.sessions,
    });
  }

  redirect(next);
}
