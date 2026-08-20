'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { commitSchedule, ScheduleCommitError } from '@/lib/schedule/commit';
import { parseGenericScheduleCsv } from '@/lib/schedule/parse-generic-csv';

export type ScheduleUploadState =
  | { status: 'idle' }
  | {
      status: 'success';
      created: number;
      updated: number;
      skipped: number;
      unmappedTeachers: string[];
    }
  | {
      status: 'error';
      code: 'invalid' | 'unauthorized' | 'generic';
      detail?: string;
      issues?: string[];
    };

const optionsSchema = z.object({
  // Terminsdatum styr valid_from/valid_until. Default = idag och tills
  // vidare, precis som det fungerade före omskrivningen.
  termStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ogiltigt startdatum')
    .optional(),
  termEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ogiltigt slutdatum')
    .nullable()
    .optional(),
  // Tom lista = alla klasser. Piloten kör 2–3 av skolans klasser.
  includeClasses: z.array(z.string().min(1)).default([]),
  includeNonRecordable: z.boolean().default(true),
});

export async function uploadSchedule(
  _prev: ScheduleUploadState,
  formData: FormData,
): Promise<ScheduleUploadState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', code: 'invalid', detail: 'Ingen fil vald' };
  }

  const parsedOptions = optionsSchema.safeParse({
    termStart: (formData.get('term_start') ?? '').toString() || undefined,
    termEnd: (formData.get('term_end') ?? '').toString() || null,
    includeClasses: formData
      .getAll('include_classes')
      .map((value) => value.toString().trim())
      .filter(Boolean),
    includeNonRecordable: formData.get('include_non_recordable') !== null,
  });
  if (!parsedOptions.success) {
    return {
      status: 'error',
      code: 'invalid',
      detail: parsedOptions.error.issues[0]?.message ?? 'Ogiltiga inställningar',
    };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { status: 'error', code: 'invalid', detail: 'Kunde inte läsa filen' };
  }

  const parsed = parseGenericScheduleCsv(text);
  if (!parsed.ok) {
    return { status: 'error', code: 'invalid', detail: parsed.detail };
  }

  const supabase = await createSupabaseServerClient();
  const options = parsedOptions.data;

  try {
    const result = await commitSchedule(supabase, parsed.schedule, {
      schoolId: profile.school_id,
      startedBy: profile.id,
      source: 'csv',
      termStart: options.termStart ?? new Date().toISOString().slice(0, 10),
      termEnd: options.termEnd ?? null,
      includeClasses: options.includeClasses,
      includeNonRecordable: options.includeNonRecordable,
    });

    revalidatePath('/sv/app/admin/schema');
    revalidatePath('/en/app/admin/schema');
    return {
      status: 'success',
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      unmappedTeachers: result.unmappedTeachers.map((t) => t.displayName),
    };
  } catch (error) {
    if (error instanceof ScheduleCommitError) {
      return {
        status: 'error',
        code: 'invalid',
        detail: error.message,
        issues: error.issues.slice(0, 10),
      };
    }
    return {
      status: 'error',
      code: 'generic',
      detail: error instanceof Error ? error.message : undefined,
    };
  }
}
