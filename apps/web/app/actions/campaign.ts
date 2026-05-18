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
  return {
    notionPageId: p.notion_page_id,
    schoolName: p.school_name,
    municipality: p.municipality,
    huvudman: p.huvudman_name,
    students: p.students,
    priceSek: p.students != null ? estimateAnnualPrice(p.students) : null,
    phone: p.contact_phone,
    email: p.contact_email,
    address: p.contact_address,
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

async function enrichProspect(code: string, name: string, students: number | null) {
  const supabase = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();

  // Step 1: Race-safe skeleton upsert — ignoreDuplicates so concurrent callers don't crash.
  await supabase.from('school_prospects').upsert(
    { school_unit_code: code, school_name: name, students,
      enrichment_status: 'pending', first_seen_at: now, last_seen_at: now, lookup_count: 0 },
    { onConflict: 'school_unit_code', ignoreDuplicates: true },
  );

  // Step 2: Re-fetch the authoritative row.
  const { data: row } = await supabase
    .from('school_prospects').select('*').eq('school_unit_code', code).single();
  if (!row) return;

  // Step 3: Enrich only if not already enriched.
  if (row.enrichment_status === 'pending' && row.ai_brief == null) {
    const facts = await fetchSchoolFacts(code);
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
      contact_address: facts?.address ?? null, contact_phone: facts?.phone ?? null,
      contact_email: facts?.email ?? null, contact_web: facts?.web ?? null,
      municipality: facts?.municipality ?? null, principal_type: facts?.principalType ?? null,
      huvudman_name: facts?.huvudman ?? null, school_orientation: facts?.orientation ?? null,
      ai_brief: brief, enrichment_status: brief ? 'done' : 'failed', updated_at: now,
    }).eq('id', row.id);
  }

  // Step 4: Always bump soft counters (read-modify-write; occasional miss under exact
  // concurrency is acceptable for this metric).
  await supabase.from('school_prospects').update({
    lookup_count: row.lookup_count + 1, last_seen_at: now,
    students: students ?? row.students, updated_at: now,
  }).eq('id', row.id);

  // Step 5: Sync to Notion with the freshest data.
  const { data: fresh } = await supabase
    .from('school_prospects').select('*').eq('id', row.id).single();
  if (fresh) await syncNotion(fresh.id, fresh as ProspectRow);
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
  after(async () => {
    try {
      await enrichProspect(code, name, students);
    } catch (err) {
      console.error('[campaign] enrichProspect misslyckades:', err);
    }
  });
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
    // Upsert so the lead is never silently dropped even if enrichProspect hasn't run yet.
    // On conflict only the supplied columns are updated; existing enrichment data is untouched.
    // Manual entries (code starts with "manual-") are never passed through enrichProspect,
    // so mark them done immediately to avoid a perpetual "pending" badge in the admin view.
    const isManual = code.startsWith('manual-');
    await supabase.from('school_prospects').upsert(
      { school_unit_code: code, school_name: name, students: Math.round(students),
        latest_lead_email: email, latest_lead_message: message, latest_lead_at: now,
        updated_at: now,
        ...(isManual ? { enrichment_status: 'done' } : {}) },
      { onConflict: 'school_unit_code' },
    );
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
