'use server';
import { z } from 'zod';
import { after } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { searchSchoolUnits, type SchoolUnit } from '@/lib/skolverket';
import { syncProspect } from '@/lib/prospects';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { generateVisitCode } from '@/lib/school-visit';
import { SITE_URL } from '@/lib/site';

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.is_staff) throw new Error('Ej behörig');
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

const visitLinkSchema = z.object({ code: z.string().min(4).max(20) });

export type VisitLinks = { rektor: string; larare: string } | null;

/**
 * Hämtar prospectets personliga besökslänkar och myntar koden första gången.
 * Koden är stabil — en länk du redan mejlat ut slutar aldrig fungera.
 */
export async function ensureVisitLinkAction(
  input: z.infer<typeof visitLinkSchema>,
): Promise<VisitLinks> {
  await requireAdmin();
  const { code } = visitLinkSchema.parse(input);

  const supabase = createSupabaseServiceRoleClient();
  const { data: row } = await supabase
    .from('school_prospects')
    .select('id, visit_code')
    .eq('school_unit_code', code)
    .single();
  if (!row) return null;

  let visitCode = row.visit_code as string | null;
  if (!visitCode) {
    visitCode = generateVisitCode();
    const { error } = await supabase
      .from('school_prospects')
      .update({ visit_code: visitCode })
      .eq('id', row.id);
    if (error) {
      console.error('[crm] kunde inte spara visit_code:', error);
      return null;
    }
  }

  return {
    rektor: `${SITE_URL}/rektor?k=${visitCode}`,
    larare: `${SITE_URL}/larare?k=${visitCode}`,
  };
}
