import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { INVESTOR_COOKIE, verifySession } from '@/lib/investor-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyInvestorEvent } from '@/lib/investor-notify';

type EngagementRow = { newly_reached_ask: boolean; label: string | null };

export async function POST(request: Request) {
  const store = await cookies();
  const session = await verifySession(store.get(INVESTOR_COOKIE)?.value);
  if (!session) return new NextResponse(null, { status: 204 });

  let payload: { maxScroll?: unknown; seconds?: unknown; reachedAsk?: unknown } = {};
  try {
    payload = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const maxScroll = Math.max(0, Math.min(100, Math.round(Number(payload.maxScroll) || 0)));
  const seconds = Math.max(0, Math.round(Number(payload.seconds) || 0));
  const reachedAsk = payload.reachedAsk === true;

  const supabase = await createSupabaseServerClient();
  const rpc = supabase as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: EngagementRow[] | null }>;
  };

  const { data } = await rpc.rpc('record_investor_engagement', {
    p_session_id: session.sid,
    p_max_scroll: maxScroll,
    p_seconds: seconds,
    p_reached_ask: reachedAsk,
  });

  const row = data?.[0];
  if (row?.newly_reached_ask && row.label) {
    await notifyInvestorEvent('ask', row.label, { maxScroll });
  }

  return new NextResponse(null, { status: 204 });
}
