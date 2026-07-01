'use server';

import { after } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { fetchGymnasiumPupilCount } from '@/lib/skolverket';
import { estimateAnnualPrice } from '@/lib/pricing';
import { syncProspect } from '@/lib/prospects';
import { upsertLoopsContact, sendLoopsEvent, sendLoopsTransactional } from '@/lib/loops';

// Interna notiser går till John. Överstyrbart via env.
const notifyTo = () => process.env.CONTACT_TO_EMAIL ?? 'john@elevante.se';

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
      await syncProspect({
        code, name, skolform: ['Gymnasieskolan'], createdVia: 'school_lookup',
        students, bumpLookup: true,
      });
    } catch (err) {
      console.error('[campaign] syncProspect misslyckades:', err);
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
    // Upsert so the lead is never silently dropped even if syncProspect hasn't run yet (it's
    // scheduled below via after() and runs post-response).
    // On conflict only the supplied columns are updated; existing enrichment data is untouched.
    // Manual entries (code starts with "manual-") are never enriched via syncProspect,
    // so mark them done immediately to avoid a perpetual "pending" badge in the admin view.
    const isManual = code.startsWith('manual-');
    await supabase.from('school_prospects').upsert(
      { school_unit_code: code, school_name: name, students: Math.round(students),
        latest_lead_email: email, latest_lead_message: message, latest_lead_at: now,
        updated_at: now, created_via: 'price_lead',
        ...(isManual ? { enrichment_status: 'done' } : {}) },
      { onConflict: 'school_unit_code' },
    );
  } catch (err) {
    console.error('[campaign] kunde inte spara lead:', err);
    return { status: 'error', code: 'generic' };
  }

  after(async () => {
    try {
      await syncProspect({
        code, name, skolform: ['Gymnasieskolan'], createdVia: 'price_lead',
        students: Math.round(students), bumpLookup: false,
      });
    } catch (err) {
      console.error('[campaign] syncProspect efter lead misslyckades:', err);
    }
    await upsertLoopsContact(email, {
      source: 'price_lead', schoolName: name,
      students: Math.round(students), priceSek: estimateAnnualPrice(students), locale,
    });
    await sendLoopsEvent(email, 'intresseanmalan', { schoolName: name, locale });
    await sendLoopsTransactional(process.env.LOOPS_LEAD_NOTIS_ID, notifyTo(), {
      schoolName: name, students: String(Math.round(students)),
      leadEmail: email, message: message ?? '', replyToAddress: email,
    });
  });
  return { status: 'success' };
}
