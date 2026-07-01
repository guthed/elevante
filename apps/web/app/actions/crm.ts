'use server';
import { z } from 'zod';
import { after } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { searchSchoolUnits, type SchoolUnit } from '@/lib/skolverket';
import { syncProspect } from '@/lib/prospects';

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
