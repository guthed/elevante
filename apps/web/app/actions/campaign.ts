'use server';

import { after } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { fetchGymnasiumPupilCount, fetchSchoolFacts } from '@/lib/skolverket';
import { estimateAnnualPrice } from '@/lib/pricing';
import { generateSchoolBrief } from '@/lib/campaign-brief';
import { upsertNotionProspect, type NotionProspect } from '@/lib/notion';

type ProspectRow = {
  id: string; school_unit_code: string; school_name: string;
  contact_address: string | null; contact_phone: string | null;
  contact_email: string | null; municipality: string | null;
  huvudman_name: string | null; students: number | null;
  ai_brief: string | null; lookup_count: number;
  first_seen_at: string; last_seen_at: string;
  latest_lead_email: string | null; notion_page_id: string | null;
};

function toNotion(p: ProspectRow): NotionProspect {
  const contact = [p.contact_phone, p.contact_email, p.contact_address]
    .filter(Boolean).join(' · ') || null;
  return {
    notionPageId: p.notion_page_id,
    schoolName: p.school_name,
    municipality: p.municipality,
    huvudman: p.huvudman_name,
    students: p.students,
    priceSek: p.students != null ? estimateAnnualPrice(p.students) : null,
    contact,
    aiBrief: p.ai_brief,
    lookupCount: p.lookup_count,
    leadEmail: p.latest_lead_email,
    firstSeen: p.first_seen_at,
    lastSeen: p.last_seen_at,
  };
}

async function syncNotion(prospectId: string, row: ProspectRow) {
  try {
    const pageId = await upsertNotionProspect(toNotion(row));
    if (pageId && pageId !== row.notion_page_id) {
      const supabase = createSupabaseServiceRoleClient();
      await supabase.from('school_prospects')
        .update({ notion_page_id: pageId }).eq('id', prospectId);
    }
  } catch (err) {
    console.error('[campaign] Notion-synk misslyckades:', err);
  }
}

async function enrichProspect(code: string, name: string, students: number | null, locale: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { data: existing } = await supabase
    .from('school_prospects').select('*').eq('school_unit_code', code).maybeSingle();
  const now = new Date().toISOString();

  if (existing) {
    const row = { ...existing,
      lookup_count: existing.lookup_count + 1, last_seen_at: now,
      students: students ?? existing.students } as ProspectRow;
    await supabase.from('school_prospects').update({
      lookup_count: row.lookup_count, last_seen_at: now,
      students: row.students, updated_at: now,
    }).eq('id', existing.id);
    await syncNotion(existing.id, row);
    return;
  }

  const facts = await fetchSchoolFacts(code);
  const { data: created } = await supabase.from('school_prospects').insert({
    school_unit_code: code, school_name: name, students,
    contact_address: facts?.address ?? null, contact_phone: facts?.phone ?? null,
    contact_email: facts?.email ?? null, contact_web: facts?.web ?? null,
    municipality: facts?.municipality ?? null, principal_type: facts?.principalType ?? null,
    huvudman_name: facts?.huvudman ?? null, school_orientation: facts?.orientation ?? null,
    enrichment_status: 'pending', first_seen_at: now, last_seen_at: now, lookup_count: 1,
  }).select('*').single();
  if (!created) return;

  let brief: string | null = null;
  try {
    brief = await generateSchoolBrief({
      name, students,
      address: facts?.address ?? null, phone: facts?.phone ?? null,
      email: facts?.email ?? null, web: facts?.web ?? null,
      municipality: facts?.municipality ?? null, principalType: facts?.principalType ?? null,
      huvudman: facts?.huvudman ?? null, orientation: facts?.orientation ?? null,
    });
  } catch (err) {
    console.error('[campaign] brief-generering misslyckades:', err);
  }
  await supabase.from('school_prospects').update({
    ai_brief: brief, enrichment_status: brief ? 'done' : 'failed', updated_at: now,
  }).eq('id', created.id);

  await syncNotion(created.id, { ...created, ai_brief: brief } as ProspectRow);
}

export type EstimateResult = { students: number | null };

export async function getSchoolEstimate(
  code: string, name: string, locale: string,
): Promise<EstimateResult> {
  const students = await fetchGymnasiumPupilCount(code);
  try {
    const supabase = createSupabaseServiceRoleClient();
    await supabase.from('school_lookups').insert({
      school_unit_code: code, school_name: name, students,
      price_sek: students != null ? estimateAnnualPrice(students) : null, locale,
    });
  } catch (err) {
    console.error('[campaign] kunde inte logga uppslag:', err);
  }
  after(async () => { await enrichProspect(code, name, students, locale); });
  return { students };
}

export type LeadState = { status: 'idle' | 'success' | 'error'; code?: 'validation' | 'generic' };

export async function submitCampaignLead(
  _prev: LeadState, formData: FormData,
): Promise<LeadState> {
  if (formData.get('company')) return { status: 'success' }; // honeypot

  const email = String(formData.get('email') ?? '').trim();
  const code = String(formData.get('schoolUnitCode') ?? '').trim();
  const name = String(formData.get('schoolName') ?? '').trim();
  const students = Number(formData.get('students'));
  const locale = String(formData.get('locale') ?? 'sv');
  const message = String(formData.get('message') ?? '').trim() || null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name
      || !Number.isFinite(students) || students <= 0) {
    return { status: 'error', code: 'validation' };
  }
  const now = new Date().toISOString();
  try {
    const supabase = createSupabaseServiceRoleClient();
    await supabase.from('school_lookups').insert({
      school_unit_code: code, school_name: name, students: Math.round(students),
      price_sek: estimateAnnualPrice(students), locale,
      lead_email: email, lead_message: message,
    });
    // Attaching lead till prospektet (skapas av enrichProspect; finns oftast redan).
    await supabase.from('school_prospects').update({
      latest_lead_email: email, latest_lead_message: message, latest_lead_at: now,
      updated_at: now,
    }).eq('school_unit_code', code);
  } catch (err) {
    console.error('[campaign] kunde inte spara lead:', err);
    return { status: 'error', code: 'generic' };
  }

  after(async () => {
    try {
      const supabase = createSupabaseServiceRoleClient();
      const { data: row } = await supabase
        .from('school_prospects').select('*').eq('school_unit_code', code).maybeSingle();
      if (row) await syncNotion(row.id, row as ProspectRow);
    } catch (err) {
      console.error('[campaign] Notion-uppdatering efter lead misslyckades:', err);
    }
  });
  return { status: 'success' };
}
