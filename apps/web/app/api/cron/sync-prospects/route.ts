import { NextResponse } from 'next/server';
import { queryPrioritizedProspects } from '@/lib/notion';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { syncProspect } from '@/lib/prospects';

export const dynamic = 'force-dynamic';
const MAX_PER_RUN = 20; // ryms inom 60s-gränsen; äldst synkade först

// GET /api/cron/sync-prospects
// Nattlig cron: håller [SKV]-fakta färska för prioriterade prospects (Pipeline ≠ Nej).
// Synkar de MAX_PER_RUN med äldst last_synced_at (aldrig synkade först).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const prioritized = await queryPrioritizedProspects();
  const supabase = createSupabaseServiceRoleClient();

  // Välj de MAX_PER_RUN med äldst last_synced_at (eller aldrig synkade).
  const codes = prioritized.map((p) => p.code);
  const { data: rows } = await supabase
    .from('school_prospects')
    .select('school_unit_code, school_name, skolform, last_synced_at')
    .in('school_unit_code', codes.length ? codes : ['__none__']);
  const byCode = new Map((rows ?? []).map((r) => [r.school_unit_code, r]));
  const ordered = prioritized
    .map((p) => ({ ...p, row: byCode.get(p.code) }))
    .sort((a, b) => {
      const at = a.row?.last_synced_at ?? '';
      const bt = b.row?.last_synced_at ?? '';
      return at.localeCompare(bt); // tom sträng (aldrig synkad) sorteras först
    });
  const batch = ordered.slice(0, MAX_PER_RUN);

  let ok = 0;
  let failed = 0;
  for (const item of batch) {
    try {
      await syncProspect({
        code: item.code,
        name: item.row?.school_name ?? item.code,
        skolform: item.row?.skolform ?? [],
        createdVia: 'batch',
      });
      ok++;
    } catch {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 350)); // strypning mot Notion
  }
  const skipped = Math.max(0, prioritized.length - batch.length);
  return NextResponse.json({ prioritized: prioritized.length, ok, failed, skipped });
}
