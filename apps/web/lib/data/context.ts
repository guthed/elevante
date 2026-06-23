import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/app/roles';

export type AppContext = {
  schoolName: string | null;
  className: string | null;
};

type ProfileLite = {
  id: string;
  role: Role;
  school_id: string | null;
};

/** Skola + (för elever) klass — för skol-identiteten i app-skalet. */
export async function getAppContext(profile: ProfileLite): Promise<AppContext> {
  const supabase = await createSupabaseServerClient();

  let schoolName: string | null = null;
  if (profile.school_id) {
    const { data } = await supabase
      .from('schools')
      .select('name')
      .eq('id', profile.school_id)
      .maybeSingle();
    schoolName = (data as { name: string } | null)?.name ?? null;
  }

  let className: string | null = null;
  if (profile.role === 'student') {
    const { data } = await supabase
      .from('class_members')
      .select('classes ( name )')
      .eq('profile_id', profile.id)
      .limit(1)
      .maybeSingle();
    const typed = data as { classes: { name: string } | { name: string }[] | null } | null;
    const cls = Array.isArray(typed?.classes) ? typed?.classes[0] : typed?.classes;
    className = cls?.name ?? null;
  }

  return { schoolName, className };
}
