import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { verifyVisitToken } from '@/lib/school-visit';
import { pushVisitRollup } from '@/lib/notion';

type RollupRow = {
  max_scroll: number;
  last_seen: string | null;
  sessions: number;
  total_seconds: number;
  pages: string | null;
};

/**
 * Tar emot scroll/tid från VisitTracker. Sessionen identifieras av den
 * signerade token som /api/skolbesok/oppna delade ut — utan giltig signatur
 * skrivs ingenting.
 */
export async function POST(request: Request) {
  let payload: { token?: unknown; maxScroll?: unknown; seconds?: unknown; final?: unknown } = {};
  try {
    payload = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const session = await verifyVisitToken(
    typeof payload.token === 'string' ? payload.token : undefined,
  );
  if (!session) return new NextResponse(null, { status: 204 });

  const maxScroll = Math.max(0, Math.min(100, Math.round(Number(payload.maxScroll) || 0)));
  const seconds = Math.max(0, Math.min(86400, Math.round(Number(payload.seconds) || 0)));
  const final = payload.final === true;

  try {
    const supabase = await createSupabaseServerClient();
    const rpc = supabase as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
    };

    await rpc.rpc('record_school_visit_engagement', {
      p_session_id: session.sid,
      p_max_scroll: maxScroll,
      p_seconds: seconds,
    });

    // Rollup till Notion bara när besöket är över — annars skulle varje
    // 15-sekundersbeacon bli en Notion-skrivning.
    if (final && session.pid) {
      const { data } = await rpc.rpc('get_school_visit_rollup', {
        p_prospect_id: session.prospectId,
      });
      const r = (data as RollupRow[] | null)?.[0];
      if (r) {
        await pushVisitRollup(session.pid, {
          lastSeen: r.last_seen,
          maxScroll: r.max_scroll,
          sessions: r.sessions,
          totalMinutes: Math.round((r.total_seconds / 60) * 10) / 10,
          pages: r.pages,
        });
      }
    }
  } catch (error) {
    console.error('[skolbesok] kunde inte spara engagemang:', error);
  }

  return new NextResponse(null, { status: 204 });
}
