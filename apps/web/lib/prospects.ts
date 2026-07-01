import 'server-only';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { fetchPupilCount, fetchSchoolFacts } from '@/lib/skolverket';
import { estimateAnnualPrice } from '@/lib/pricing';
import { generateSchoolBrief } from '@/lib/campaign-brief';
import { upsertNotionProspect, type NotionProspect } from '@/lib/notion';

type CreatedVia = 'inbound_lookup' | 'admin_search' | 'batch';
const dataSourceLabel: Record<CreatedVia, NotionProspect['dataSource']> = {
  inbound_lookup: 'Inbound-uppslag', admin_search: 'Admin-sök', batch: 'Batch',
};

type ProspectRow = {
  id: string; school_unit_code: string; school_name: string;
  contact_address: string | null; contact_phone: string | null;
  contact_email: string | null; municipality: string | null;
  huvudman_name: string | null; students: number | null;
  ai_brief: string | null; lookup_count: number; skolform: string[] | null;
  created_via: string; first_seen_at: string; last_seen_at: string;
  latest_lead_email: string | null; notion_page_id: string | null;
};

function toNotion(p: ProspectRow): NotionProspect {
  return {
    notionPageId: p.notion_page_id, schoolUnitCode: p.school_unit_code,
    schoolName: p.school_name, municipality: p.municipality, huvudman: p.huvudman_name,
    students: p.students, priceSek: p.students != null ? estimateAnnualPrice(p.students) : null,
    phone: p.contact_phone, email: p.contact_email, address: p.contact_address,
    aiBrief: p.ai_brief, lookupCount: p.lookup_count, leadEmail: p.latest_lead_email,
    skolform: p.skolform ?? [],
    dataSource: dataSourceLabel[(p.created_via as CreatedVia)] ?? 'Inbound-uppslag',
    firstSeen: p.first_seen_at, lastSeen: p.last_seen_at,
  };
}

async function syncNotion(prospectId: string, row: ProspectRow): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  try {
    const pageId = await upsertNotionProspect(toNotion(row));
    await supabase.from('school_prospects').update({
      notion_page_id: pageId ?? row.notion_page_id,
      sync_status: 'ok', sync_error: null, last_synced_at: new Date().toISOString(),
    }).eq('id', prospectId);
  } catch (err) {
    await supabase.from('school_prospects').update({
      sync_status: 'error', sync_error: String(err).slice(0, 500),
      last_synced_at: new Date().toISOString(),
    }).eq('id', prospectId);
    throw err;
  }
}

/**
 * Berikar en skolenhet och synkar icke-destruktivt till Notion.
 * `bumpLookup` = true bara för inbound (räknar uppslag). Loggar till school_sync_log.
 */
export async function syncProspect(opts: {
  code: string; name: string; skolform: string[]; createdVia: CreatedVia;
  students?: number | null; bumpLookup?: boolean;
}): Promise<void> {
  const { code, name, skolform, createdVia, bumpLookup = false } = opts;
  const supabase = createSupabaseServiceRoleClient();
  const started = Date.now();
  const now = new Date().toISOString();

  await supabase.from('school_prospects').upsert(
    { school_unit_code: code, school_name: name, skolform, created_via: createdVia,
      enrichment_status: 'pending', first_seen_at: now, last_seen_at: now, lookup_count: 0 },
    { onConflict: 'school_unit_code', ignoreDuplicates: true },
  );
  const { data: row } = await supabase
    .from('school_prospects').select('*').eq('school_unit_code', code).single();
  if (!row) return;

  const students = opts.students ?? (await fetchPupilCount(code, skolform));
  if (row.enrichment_status === 'pending' && row.ai_brief == null) {
    const facts = await fetchSchoolFacts(code);
    let brief: string | null = null;
    try {
      brief = await generateSchoolBrief({
        name, students, address: facts?.address ?? null, phone: facts?.phone ?? null,
        email: facts?.email ?? null, web: facts?.web ?? null,
        municipality: facts?.municipality ?? null, principalType: facts?.principalType ?? null,
        huvudman: facts?.huvudman ?? null, orientation: facts?.orientation ?? null,
      });
    } catch (err) { console.error('[prospects] brief misslyckades:', err); }
    await supabase.from('school_prospects').update({
      contact_address: facts?.address ?? null, contact_phone: facts?.phone ?? null,
      contact_email: facts?.email ?? null, contact_web: facts?.web ?? null,
      municipality: facts?.municipality ?? null, principal_type: facts?.principalType ?? null,
      huvudman_name: facts?.huvudman ?? null, school_orientation: facts?.orientation ?? null,
      students, ai_brief: brief, enrichment_status: brief ? 'done' : 'failed', updated_at: now,
    }).eq('id', row.id);
  }
  await supabase.from('school_prospects').update({
    last_seen_at: now, updated_at: now, skolform,
    students: students ?? row.students,
    ...(bumpLookup ? { lookup_count: row.lookup_count + 1 } : {}),
  }).eq('id', row.id);

  const { data: fresh } = await supabase
    .from('school_prospects').select('*').eq('id', row.id).single();
  let status = 'ok';
  try {
    if (fresh) await syncNotion(fresh.id, fresh as ProspectRow);
  } catch { status = 'error'; }
  await supabase.from('school_sync_log').insert({
    school_unit_code: code, status, duration_ms: Date.now() - started,
    error: status === 'error' ? 'notion' : null,
  });
}
