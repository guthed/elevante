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
  // Default false: lunch, mentorstid och möten ska normalt INTE bli pass.
  // Läses ur en kryssruta, så värdet är alltid satt — .default() är bara
  // ett skydd om fältet någon gång försvinner ur formuläret igen.
  includeNonRecordable: z.boolean().default(false),
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

export type MapTeacherState =
  | { status: 'idle' }
  | { status: 'success'; linkedTimeslots: number; linkedCourses: number }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'generic'; detail?: string };

const mapTeacherSchema = z.object({
  teacherMapId: z.string().uuid(),
  // Tom sträng = koppla loss. Adminen ska kunna ångra en felaktig mappning.
  profileId: z.string().uuid().nullable(),
});

/**
 * Kopplar en lärare i schemat till ett Elevante-konto — och backfyllar.
 *
 * Backfyllet är hela poängen. En mappning som bara skriver
 * `schedule_teacher_map.profile_id` gör ingenting förrän nästa import:
 * passen ligger redan inne med `teacher_id = null`, och mobilappens
 * getTodayLessons() slår upp via `course_teachers`. Därför skrivs båda här,
 * för alla pass som redan pekar på den här schemaläraren.
 */
export async function mapScheduleTeacher(
  _prev: MapTeacherState,
  formData: FormData,
): Promise<MapTeacherState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const rawProfileId = (formData.get('profile_id') ?? '').toString().trim();
  const parsed = mapTeacherSchema.safeParse({
    teacherMapId: (formData.get('teacher_map_id') ?? '').toString(),
    profileId: rawProfileId === '' ? null : rawProfileId,
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid', detail: 'Ogiltigt val' };
  }
  const { teacherMapId, profileId } = parsed.data;

  const supabase = await createSupabaseServerClient();

  // Kontot måste tillhöra samma skola. RLS på profiles skulle redan hindra
  // en läsning över skolgräns, men vi vill ge ett begripligt fel i stället
  // för en tyst no-op.
  if (profileId) {
    const { data: target } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', profileId)
      .eq('school_id', profile.school_id)
      .maybeSingle();
    if (!target) {
      return { status: 'error', code: 'invalid', detail: 'Kontot finns inte i din skola' };
    }
    if (target.role === 'student') {
      return { status: 'error', code: 'invalid', detail: 'Elevkonton kan inte undervisa' };
    }
  }

  const updated = await supabase
    .from('schedule_teacher_map')
    .update({ profile_id: profileId, updated_at: new Date().toISOString() })
    .eq('id', teacherMapId)
    .eq('school_id', profile.school_id)
    .select('id');
  if (updated.error) {
    return { status: 'error', code: 'generic', detail: updated.error.message };
  }
  if ((updated.data ?? []).length === 0) {
    return { status: 'error', code: 'invalid', detail: 'Läraren finns inte i schemat' };
  }

  // Vilka pass hör till den här schemaläraren?
  const { data: links, error: linkError } = await supabase
    .from('timeslot_teachers')
    .select('timeslot_id')
    .eq('teacher_map_id', teacherMapId);
  if (linkError) {
    return { status: 'error', code: 'generic', detail: linkError.message };
  }
  const timeslotIds = (links ?? []).map((l) => l.timeslot_id);
  if (timeslotIds.length === 0) {
    revalidatePath('/sv/app/admin/schema');
    revalidatePath('/en/app/admin/schema');
    return { status: 'success', linkedTimeslots: 0, linkedCourses: 0 };
  }

  const { data: slots, error: slotError } = await supabase
    .from('timeslots')
    .select('id, course_id, teacher_id')
    .in('id', timeslotIds);
  if (slotError) {
    return { status: 'error', code: 'generic', detail: slotError.message };
  }

  // Sätt primär lärare bara där ingen redan är satt — ett pass med två
  // lärare ska inte byta ansikte för att den andra mappades senare.
  const claimable = (slots ?? []).filter(
    (s) => s.teacher_id === null || s.teacher_id === profileId,
  );
  if (profileId && claimable.length > 0) {
    const { error } = await supabase
      .from('timeslots')
      .update({ teacher_id: profileId })
      .in('id', claimable.map((s) => s.id));
    if (error) return { status: 'error', code: 'generic', detail: error.message };
  }
  if (!profileId) {
    // Koppling borttagen: nolla teacher_id på de pass som pekade hit.
    const owned = (slots ?? []).filter((s) => s.teacher_id !== null).map((s) => s.id);
    if (owned.length > 0) {
      await supabase.from('timeslots').update({ teacher_id: null }).in('id', owned);
    }
  }

  const courseIds = [...new Set((slots ?? []).map((s) => s.course_id))];
  let linkedCourses = 0;
  if (profileId && courseIds.length > 0) {
    const { error } = await supabase
      .from('course_teachers')
      .upsert(
        courseIds.map((course_id) => ({ course_id, profile_id: profileId })),
        { onConflict: 'course_id,profile_id' },
      );
    if (error) return { status: 'error', code: 'generic', detail: error.message };
    linkedCourses = courseIds.length;
  }
  if (!profileId && courseIds.length > 0) {
    // Ta bara bort kopplingen till kurser som INTE har något annat pass
    // med samma lärare — annars raderar vi en koppling läraren behöver.
    const previous = (slots ?? []).find((s) => s.teacher_id)?.teacher_id;
    if (previous) {
      await supabase
        .from('course_teachers')
        .delete()
        .eq('profile_id', previous)
        .in('course_id', courseIds);
    }
  }

  revalidatePath('/sv/app/admin/schema');
  revalidatePath('/en/app/admin/schema');
  return {
    status: 'success',
    linkedTimeslots: profileId ? claimable.length : timeslotIds.length,
    linkedCourses,
  };
}
