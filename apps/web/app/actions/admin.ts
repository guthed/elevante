'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { inviteUserCore } from '@/lib/admin/invite-user';
import type { UserRole } from '@/lib/supabase/database';
import { isLocale, type Locale } from '@/lib/i18n/config';

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
  if (!profile || profile.role !== 'admin' || !profile.is_staff) {
    return { status: 'error', code: 'unauthorized' };
  }

  const name = (formData.get('name') ?? '').toString().trim();
  const slug = (formData.get('slug') ?? '').toString().trim().toLowerCase();
  const country = (formData.get('country') ?? 'SE').toString().trim().toUpperCase();

  if (!name || !slug || !/^[a-z0-9-]+$/.test(slug)) {
    return { status: 'error', code: 'invalid' };
  }

  const supabase = createSupabaseServiceRoleClient();
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

const inviteUserSchema = z.object({
  email: z.string().trim().email().max(200),
  fullName: z.string().trim().min(1).max(200),
  role: z.enum(['student', 'teacher', 'admin']),
  schoolId: z.string().uuid(),
});

export type InviteUserState =
  | { status: 'idle' }
  | { status: 'success'; email: string }
  | {
      status: 'error';
      code: 'unauthorized' | 'invalid' | 'already-exists' | 'generic';
      detail?: string;
    };

export async function inviteUser(
  _prev: InviteUserState,
  formData: FormData,
): Promise<InviteUserState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return { status: 'error', code: 'unauthorized' };
  }

  const parsed = inviteUserSchema.safeParse({
    email: formData.get('email'),
    fullName: formData.get('full_name'),
    role: formData.get('role'),
    schoolId: formData.get('school_id'),
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }
  const { email, fullName, role, schoolId } = parsed.data;
  const rawLocale = (formData.get('locale') ?? '').toString();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'sv';

  const isOwnSchool = profile.school_id === schoolId;
  let allowed = isOwnSchool;

  if (!isOwnSchool) {
    // Bootstrap: en skola utan admin ännu får sin första admin av
    // valfri befintlig Elevante-STAFF-admin (samma grind som
    // createSchool efter Task 1b — inte "vilken admin som helst",
    // annars kan en kunds egen admin bootstrap:a admin åt andra skolor).
    if (!profile.is_staff) {
      return { status: 'error', code: 'unauthorized' };
    }
    // Service-role: profiles_select_same_school-RLS skulle annars göra
    // målskolans rader osynliga för den inloggade adminen och count alltid
    // bli 0 — precis den bugg vi stänger här. Samma klient verifierar också
    // att skolan faktiskt finns, så ett ogiltigt schoolId inte glider igenom
    // till inviteUserCore och skapar ett föräldralöst konto.
    const serviceClient = createSupabaseServiceRoleClient();
    const { data: school } = await serviceClient
      .from('schools')
      .select('id')
      .eq('id', schoolId)
      .maybeSingle();
    if (!school) {
      return { status: 'error', code: 'invalid' };
    }
    const { count } = await serviceClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'admin');
    allowed = (count ?? 0) === 0 && role === 'admin';
  }

  if (!allowed) {
    return { status: 'error', code: 'unauthorized' };
  }

  const result = await inviteUserCore({ email, fullName, role, schoolId, locale });
  if (!result.ok) {
    return { status: 'error', code: result.code, detail: result.detail };
  }

  revalidatePath('/sv/app/admin/anvandare');
  revalidatePath('/en/app/admin/anvandare');
  revalidatePath('/sv/app/admin/skolor');
  revalidatePath('/en/app/admin/skolor');
  return { status: 'success', email };
}

const createClassSchema = z.object({
  name: z.string().trim().min(1).max(100),
  year: z.coerce.number().int().min(1).max(12).optional(),
});

export type CreateClassState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'duplicate' | 'generic'; detail?: string };

export async function createClass(
  _prev: CreateClassState,
  formData: FormData,
): Promise<CreateClassState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const yearRaw = formData.get('year');
  const parsed = createClassSchema.safeParse({
    name: formData.get('name'),
    year: yearRaw && yearRaw.toString().length > 0 ? yearRaw : undefined,
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('classes').insert({
    school_id: profile.school_id,
    name: parsed.data.name,
    year: parsed.data.year ?? null,
  });
  if (error) {
    if (error.code === '23505') return { status: 'error', code: 'duplicate' };
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/klasser');
  revalidatePath('/en/app/admin/klasser');
  return { status: 'success' };
}

export type DeleteClassState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'has-lessons' | 'generic'; detail?: string };

export async function deleteClass(
  _prev: DeleteClassState,
  formData: FormData,
): Promise<DeleteClassState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const classId = (formData.get('class_id') ?? '').toString();
  if (!classId) return { status: 'error', code: 'unauthorized' };
  if (!z.string().uuid().safeParse(classId).success) {
    return { status: 'error', code: 'unauthorized' };
  }

  const supabase = await createSupabaseServerClient();

  // lessons.class_id är ON DELETE CASCADE — blockera radering om
  // klassen har inspelade lektioner, annars försvinner transkript och
  // chatthistorik tyst med den. Räknar AVSIKTLIGT även arkiverade
  // lektioner (ingen .is('archived_at', null)) — cascaden skulle radera
  // dem lika tyst, så de ska också blockera radering.
  const { count, error: countError } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId);
  if (countError) {
    return { status: 'error', code: 'generic', detail: countError.message };
  }
  if ((count ?? 0) > 0) {
    return { status: 'error', code: 'has-lessons' };
  }

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', classId)
    .eq('school_id', profile.school_id);
  if (error) {
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/klasser');
  revalidatePath('/en/app/admin/klasser');
  return { status: 'success' };
}
