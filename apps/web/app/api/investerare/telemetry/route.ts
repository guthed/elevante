import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { INVESTOR_COOKIE, verifySession } from '@/lib/investor-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyInvestorEvent } from '@/lib/investor-notify';
import { pushRollup, deriveStatus } from '@/lib/notion-investor';

type EngagementRow = { newly_reached_ask: boolean; label: string | null };
type RollupRow = { max_scroll: number; reached_ask: boolean; last_seen: string | null; sessions: number; total_seconds: number };

export async function POST(request: Request) {
  const store = await cookies();
  const session = await verifySession(store.get(INVESTOR_COOKIE)?.value);
  if (!session) return new NextResponse(null, { status: 204 });

  let payload: { maxScroll?: unknown; seconds?: unknown; reachedAsk?: unknown; final?: unknown } = {};
  try {
    payload = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const maxScroll = Math.max(0, Math.min(100, Math.round(Number(payload.maxScroll) || 0)));
  const seconds = Math.max(0, Math.min(86400, Math.round(Number(payload.seconds) || 0)));
  const reachedAsk = payload.reachedAsk === true;
  const final = payload.final === true;

  const supabase = await createSupabaseServerClient();
  const rpc = supabase as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };

  const { data: engData } = await rpc.rpc('record_investor_engagement', {
    p_session_id: session.sid,
    p_max_scroll: maxScroll,
    p_seconds: seconds,
    p_reached_ask: reachedAsk,
  });
  const eng = (engData as EngagementRow[] | null)?.[0];

  if (eng?.newly_reached_ask) {
    await notifyInvestorEvent('ask', session.label, { maxScroll });
  }

  if (eng?.newly_reached_ask || final) {
    const { data: rollupData } = await rpc.rpc('get_investor_rollup', {
      p_notion_page_id: session.pid,
    });
    const r = (rollupData as RollupRow[] | null)?.[0];
    if (r) {
      await pushRollup(session.pid, {
        status: deriveStatus(r.reached_ask, r.sessions),
        lastSeen: r.last_seen,
        maxScroll: r.max_scroll,
        reachedAsk: r.reached_ask,
        sessions: r.sessions,
        totalMinutes: Math.round((r.total_seconds / 60) * 10) / 10,
      });
    }
  }

  return new NextResponse(null, { status: 204 });
}
