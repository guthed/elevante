'use server';
import { z } from 'zod';
import { after } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { searchSchoolUnits, type SchoolUnit } from '@/lib/skolverket';
import { syncProspect } from '@/lib/prospects';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { sendLoopsTransactional } from '@/lib/loops';
import { markProspectContacted } from '@/lib/notion';

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') throw new Error('Ej behörig');
}

const searchSchema = z.object({
  query: z.string().min(2).max(100),
  kommun: z.string().max(100).optional(),
  skolform: z.string().max(100).optional(),
});

export async function searchSchoolUnitsAction(
  input: z.infer<typeof searchSchema>,
): Promise<SchoolUnit[]> {
  await requireAdmin();
  const { query, kommun, skolform } = searchSchema.parse(input);
  return searchSchoolUnits(query, { kommun, skolform });
}

const syncSchema = z.object({
  code: z.string().min(4).max(20),
  name: z.string().min(1).max(200),
  skolform: z.array(z.string()).default([]),
});

export type SyncResult = { status: 'ok' | 'error' };

export async function syncSchoolUnitAction(
  input: z.infer<typeof syncSchema>,
): Promise<SyncResult> {
  await requireAdmin();
  const { code, name, skolform } = syncSchema.parse(input);
  try {
    // Kör synken i bakgrunden så UI:t svarar direkt.
    after(async () => {
      try {
        await syncProspect({ code, name, skolform, createdVia: 'admin_search' });
      } catch (err) { console.error('[crm] syncProspect misslyckades:', err); }
    });
    return { status: 'ok' };
  } catch {
    return { status: 'error' };
  }
}

const contactSchema = z.object({ code: z.string().min(4).max(40) });

export type SendContactResult = { status: 'ok' | 'no-recipient' | 'error' };

export async function sendProspectContactEmail(
  input: z.infer<typeof contactSchema>,
): Promise<SendContactResult> {
  await requireAdmin();
  const { code } = contactSchema.parse(input);
  const supabase = createSupabaseServiceRoleClient();
  const { data: row } = await supabase
    .from('school_prospects')
    .select('school_name, municipality, contact_email, latest_lead_email, notion_page_id')
    .eq('school_unit_code', code)
    .single();
  if (!row) return { status: 'error' };
  const recipient = row.contact_email ?? row.latest_lead_email;
  if (!recipient) return { status: 'no-recipient' };
  try {
    await sendLoopsTransactional(process.env.LOOPS_SKOL_KONTAKT_ID, recipient, {
      schoolName: row.school_name, ort: row.municipality ?? '',
    });
    await supabase.from('school_prospects')
      .update({ contacted_at: new Date().toISOString() })
      .eq('school_unit_code', code);
    if (row.notion_page_id) await markProspectContacted(row.notion_page_id);
    return { status: 'ok' };
  } catch (err) {
    console.error('[crm] sendProspectContactEmail misslyckades:', err);
    return { status: 'error' };
  }
}
