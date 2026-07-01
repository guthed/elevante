import 'server-only';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { fetchPupilCount, fetchSchoolFacts, searchSchoolUnits } from '@/lib/skolverket';
import { estimateAnnualPrice } from '@/lib/pricing';
import { generateSchoolBrief, generateContactEmail } from '@/lib/campaign-brief';
import {
  upsertNotionProspect,
  markNeedsCheckWithCandidates,
  type NotionProspect,
} from '@/lib/notion';

type CreatedVia =
  | 'school_lookup' | 'price_lead' | 'contact_form' | 'admin_search' | 'batch';
const dataSourceLabel: Record<CreatedVia, NotionProspect['dataSource']> = {
  school_lookup: 'Skoluppslag', price_lead: 'Prisberäknare-lead',
  contact_form: 'Kontaktformulär', admin_search: 'Prospektering', batch: 'Batch',
};

type ProspectRow = {
  id: string; school_unit_code: string; school_name: string;
  contact_address: string | null; contact_phone: string | null;
  contact_email: string | null; municipality: string | null;
  huvudman_name: string | null; students: number | null;
  ai_brief: string | null; contact_email_draft: string | null;
  lookup_count: number; skolform: string[] | null;
  created_via: string; first_seen_at: string; last_seen_at: string;
  latest_lead_email: string | null; notion_page_id: string | null;
};

function toNotion(p: ProspectRow): NotionProspect {
  return {
    notionPageId: p.notion_page_id, schoolUnitCode: p.school_unit_code,
    schoolName: p.school_name, municipality: p.municipality, huvudman: p.huvudman_name,
    students: p.students, priceSek: p.students != null ? estimateAnnualPrice(p.students) : null,
    phone: p.contact_phone, email: p.contact_email, address: p.contact_address,
    aiBrief: p.ai_brief, contactEmail: p.contact_email_draft,
    lookupCount: p.lookup_count, leadEmail: p.latest_lead_email,
    skolform: p.skolform ?? [],
    dataSource: dataSourceLabel[(p.created_via as CreatedVia)] ?? 'Skoluppslag',
    firstSeen: p.first_seen_at, lastSeen: p.last_seen_at,
  };
}

async function syncNotion(
  prospectId: string, row: ProspectRow, writeGenerated: boolean,
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  try {
    const pageId = await upsertNotionProspect(toNotion(row), { writeGenerated });
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
  ownerName?: string | null; notionPageId?: string | null;
}): Promise<void> {
  const { code, name, skolform, createdVia, bumpLookup = false } = opts;
  const supabase = createSupabaseServiceRoleClient();
  const started = Date.now();
  const now = new Date().toISOString();

  await supabase.from('school_prospects').upsert(
    { school_unit_code: code, school_name: name, skolform, created_via: createdVia,
      enrichment_status: 'pending', first_seen_at: now, last_seen_at: now, lookup_count: 0,
      ...(opts.notionPageId ? { notion_page_id: opts.notionPageId } : {}) },
    { onConflict: 'school_unit_code', ignoreDuplicates: true },
  );
  const { data: row } = await supabase
    .from('school_prospects').select('*').eq('school_unit_code', code).single();
  if (!row) return;

  // Peka om till den manuellt skapade raden om en pageId gavs (outbound-flödet).
  if (opts.notionPageId && row.notion_page_id !== opts.notionPageId) {
    await supabase.from('school_prospects')
      .update({ notion_page_id: opts.notionPageId }).eq('id', row.id);
    row.notion_page_id = opts.notionPageId;
  }

  const students = opts.students ?? (await fetchPupilCount(code, skolform));
  let justGenerated = false;
  if (row.enrichment_status === 'pending' && row.ai_brief == null) {
    const facts = await fetchSchoolFacts(code);
    const briefInput = {
      name, students, address: facts?.address ?? null, phone: facts?.phone ?? null,
      email: facts?.email ?? null, web: facts?.web ?? null,
      municipality: facts?.municipality ?? null, principalType: facts?.principalType ?? null,
      huvudman: facts?.huvudman ?? null, orientation: facts?.orientation ?? null,
    };
    let brief: string | null = null;
    let contactEmail: string | null = null;
    try { brief = await generateSchoolBrief(briefInput); }
    catch (err) { console.error('[prospects] brief misslyckades:', err); }
    try { contactEmail = await generateContactEmail(briefInput, opts.ownerName ?? null); }
    catch (err) { console.error('[prospects] kontaktmejl misslyckades:', err); }
    justGenerated = brief != null || contactEmail != null;
    await supabase.from('school_prospects').update({
      contact_address: facts?.address ?? null, contact_phone: facts?.phone ?? null,
      contact_email: facts?.email ?? null, contact_web: facts?.web ?? null,
      municipality: facts?.municipality ?? null, principal_type: facts?.principalType ?? null,
      huvudman_name: facts?.huvudman ?? null, school_orientation: facts?.orientation ?? null,
      students, ai_brief: brief, contact_email_draft: contactEmail,
      enrichment_status: brief ? 'done' : 'failed', updated_at: now,
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
    if (fresh) await syncNotion(fresh.id, fresh as ProspectRow, justGenerated);
  } catch { status = 'error'; }
  await supabase.from('school_sync_log').insert({
    school_unit_code: code, status, duration_ms: Date.now() - started,
    error: status === 'error' ? 'notion' : null,
  });
}

// Outbound: matcha ett fritt skolnamn → Skolverket → berika den befintliga raden.
export async function enrichNotionRowByName(
  pageId: string, name: string, ownerName: string | null,
): Promise<'ok' | 'needs_check' | 'error'> {
  const q = name.trim().toLowerCase();
  const hits = searchSchoolUnits(name);
  const exact = hits.filter((u) => u.name.toLowerCase() === q);
  if (exact.length !== 1) {
    await markNeedsCheckWithCandidates(
      pageId, hits.slice(0, 5).map((u) => ({ name: u.name, kommun: u.kommun })),
    );
    return 'needs_check';
  }
  const unit = exact[0];
  try {
    await syncProspect({
      code: unit.code, name: unit.name, skolform: unit.skolform,
      createdVia: 'admin_search', notionPageId: pageId, ownerName,
    });
    return 'ok';
  } catch (err) {
    console.error('[prospects] enrichNotionRowByName misslyckades:', err);
    return 'error';
  }
}
