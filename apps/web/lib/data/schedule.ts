import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Ren funktion, bor i lib/schedule/ så den går att testa utan server-only.
export { suggestProfileForName } from '@/lib/schedule/suggest-teacher';

export type ScheduleTeacherRow = {
  id: string;
  externalRef: string;
  /** Så som schemakällan skriver läraren — RS-filen ger bara förnamn. */
  displayName: string;
  profileId: string | null;
  profileName: string | null;
  /** Antal pass läraren har i schemat. Ger adminen en känsla för vikten. */
  timeslotCount: number;
};

export type SchoolTeacherOption = {
  id: string;
  name: string;
  email: string | null;
};

/**
 * Lärarna som schemat känner till, med sin ev. koppling till ett konto.
 * Omappade först — det är dem adminen ska agera på.
 */
export async function getScheduleTeachers(
  schoolId: string,
): Promise<ScheduleTeacherRow[]> {
  const supabase = await createSupabaseServerClient();

  const [{ data: mapRows }, { data: links }] = await Promise.all([
    supabase
      .from('schedule_teacher_map')
      .select('id, external_ref, display_name, profile_id, profiles ( full_name )')
      .eq('school_id', schoolId)
      .order('display_name', { ascending: true }),
    supabase.from('timeslot_teachers').select('teacher_map_id'),
  ]);

  const counts = new Map<string, number>();
  for (const link of (links ?? []) as { teacher_map_id: string }[]) {
    counts.set(link.teacher_map_id, (counts.get(link.teacher_map_id) ?? 0) + 1);
  }

  // Supabase-joinen blir objekt eller array beroende på FK-arity — samma
  // mönster som pickOne() i mobilappens lessons.ts.
  type Row = {
    id: string;
    external_ref: string;
    display_name: string;
    profile_id: string | null;
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  };

  const rows = ((mapRows ?? []) as unknown as Row[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      externalRef: row.external_ref,
      displayName: row.display_name,
      profileId: row.profile_id,
      profileName: profile?.full_name ?? null,
      timeslotCount: counts.get(row.id) ?? 0,
    };
  });

  return rows.sort((a, b) => {
    if (!a.profileId !== !b.profileId) return a.profileId ? 1 : -1;
    return a.displayName.localeCompare(b.displayName, 'sv');
  });
}

/** Skolans lärarkonton, att välja bland i mappningen. */
export async function getSchoolTeacherOptions(
  schoolId: string,
): Promise<SchoolTeacherOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('school_id', schoolId)
    .eq('role', 'teacher')
    .order('full_name', { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.full_name ?? row.email ?? 'Namnlös',
    email: row.email,
  }));
}
