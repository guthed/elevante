'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/supabase/database';

export type UpdateRoleState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'generic'; detail?: string };

const validRoles: ReadonlySet<UserRole> = new Set(['student', 'teacher', 'admin']);

export async function updateUserRole(
  _prev: UpdateRoleState,
  formData: FormData,
): Promise<UpdateRoleState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const userId = (formData.get('user_id') ?? '').toString();
  const newRole = (formData.get('role') ?? '').toString() as UserRole;

  if (!userId || !validRoles.has(newRole)) {
    return { status: 'error', code: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();

  // RLS säkerställer att vi bara kan uppdatera profiles i samma skola
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .eq('school_id', profile.school_id);

  if (error) {
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/anvandare');
  revalidatePath('/en/app/admin/anvandare');
  return { status: 'success' };
}

export type CreateSchoolState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'duplicate' | 'generic'; detail?: string };

export async function createSchool(
  _prev: CreateSchoolState,
  formData: FormData,
): Promise<CreateSchoolState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return { status: 'error', code: 'unauthorized' };
  }

  const name = (formData.get('name') ?? '').toString().trim();
  const slug = (formData.get('slug') ?? '').toString().trim().toLowerCase();
  const country = (formData.get('country') ?? 'SE').toString().trim().toUpperCase();

  if (!name || !slug || !/^[a-z0-9-]+$/.test(slug)) {
    return { status: 'error', code: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('schools').insert({
    name,
    slug,
    country: country.slice(0, 2),
  });

  if (error) {
    if (error.code === '23505' || error.message.includes('duplicate')) {
      return { status: 'error', code: 'duplicate', detail: error.message };
    }
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/skolor');
  revalidatePath('/en/app/admin/skolor');
  return { status: 'success' };
}
