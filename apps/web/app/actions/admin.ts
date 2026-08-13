'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { inviteUserCore } from '@/lib/admin/invite-user';
import type { UserRole } from '@/lib/supabase/database';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { parseCsv } from '@/lib/csv';

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

export type RemoveUserState =
  | { status: 'idle' }
  | { status: 'success' }
  | {
      status: 'error';
      code: 'unauthorized' | 'invalid' | 'self' | 'last-admin' | 'generic';
      detail?: string;
    };

export async function removeUser(
  _prev: RemoveUserState,
  formData: FormData,
): Promise<RemoveUserState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const userId = (formData.get('user_id') ?? '').toString();
  if (!userId) {
    return { status: 'error', code: 'invalid' };
  }
  if (userId === profile.id) {
    return { status: 'error', code: 'self' };
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: target } = await serviceClient
    .from('profiles')
    .select('id, role, school_id')
    .eq('id', userId)
    .maybeSingle();
  if (!target) {
    return { status: 'error', code: 'invalid' };
  }
  // Skol-scopat precis som updateUserRole — en admin kan bara ta bort
  // användare i sin egen skola, staff är inte undantaget (samma grind som
  // resten av /admin/anvandare).
  if (target.school_id !== profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  if (target.role === 'admin') {
    const { count } = await serviceClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', profile.school_id)
      .eq('role', 'admin');
    if ((count ?? 0) <= 1) {
      return { status: 'error', code: 'last-admin' };
    }
  }

  // auth.admin.deleteUser cascadar till profiles (on delete cascade från
  // auth.users) — samma mekanism som städningen av testkontona tidigare.
  const { error } = await serviceClient.auth.admin.deleteUser(userId);
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

const setStaffAccessSchema = z.object({
  email: z.string().trim().email().max(200),
  grant: z.enum(['true', 'false']),
});

export type SetStaffAccessState =
  | { status: 'idle' }
  | { status: 'success' }
  | {
      status: 'error';
      code: 'unauthorized' | 'invalid' | 'not-found' | 'self' | 'generic';
      detail?: string;
    };

export async function setStaffAccess(
  _prev: SetStaffAccessState,
  formData: FormData,
): Promise<SetStaffAccessState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.is_staff) {
    return { status: 'error', code: 'unauthorized' };
  }

  const parsed = setStaffAccessSchema.safeParse({
    email: formData.get('email'),
    grant: formData.get('grant'),
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }
  const grant = parsed.data.grant === 'true';

  // Service-role: is_staff är skrivskyddat mot allt utom service-role
  // (protect_is_staff-triggern) — det är den avsiktliga öppningen den här
  // actionen använder, gated på att anroparen redan är is_staff.
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: target } = await serviceClient
    .from('profiles')
    .select('id, email')
    .eq('email', parsed.data.email)
    .maybeSingle();
  if (!target) {
    return { status: 'error', code: 'not-found' };
  }
  if (target.id === profile.id && !grant) {
    return { status: 'error', code: 'self' };
  }

  const { error } = await serviceClient
    .from('profiles')
    .update({ is_staff: grant })
    .eq('id', target.id);
  if (error) {
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
  let schoolName: string | undefined;

  if (isOwnSchool) {
    // RLS tillåter att läsa sin egen skola, ingen service-role behövs.
    const supabase = await createSupabaseServerClient();
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', schoolId)
      .maybeSingle();
    // Ska aldrig kunna hända (schoolId är adminens egen, redan validerad
    // vid inloggning) — men om det ändå gör det ska vi hellre avbryta än
    // tyst skicka ett mejl med tomt skolnamn ("Du har bjudits in till ,
    // klass...").
    if (!school) {
      return { status: 'error', code: 'generic', detail: 'Skolan hittades inte' };
    }
    schoolName = school.name;
  } else {
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
      .select('id, name')
      .eq('id', schoolId)
      .maybeSingle();
    if (!school) {
      return { status: 'error', code: 'invalid' };
    }
    schoolName = school.name;
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

  const result = await inviteUserCore({
    email,
    fullName,
    role,
    schoolId,
    schoolName,
    locale,
  });
  if (!result.ok) {
    return { status: 'error', code: result.code, detail: result.detail };
  }

  revalidatePath('/sv/app/admin/anvandare');
  revalidatePath('/en/app/admin/anvandare');
  revalidatePath('/sv/app/admin/skolor');
  revalidatePath('/en/app/admin/skolor');
  return { status: 'success', email };
}

const resendInviteSchema = z.object({
  userId: z.string().uuid(),
});

export type ResendInviteState =
  | { status: 'idle' }
  | { status: 'success'; email: string }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'not-found' | 'generic'; detail?: string };

// Löser en engångslänk som blivit förbrukad (t.ex. användaren klickade
// den två gånger, eller nätverket hackade mitt i setSession() på
// /auth/confirm) utan att kontot behöver raderas och bjudas in på nytt.
// inviteUserCore försöker type:'invite' först, men den avvisas alltid
// för ett redan existerande konto (dokumenterad GoTrue-begränsning, se
// kommentaren i lib/admin/invite-user.ts) och faller då tillbaka till
// type:'magiclink' — exakt samma väg som redan används för CSV-importens
// "kontot fanns redan"-fall, bara nu explicit istället för implicit.
export async function resendInvite(
  _prev: ResendInviteState,
  formData: FormData,
): Promise<ResendInviteState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return { status: 'error', code: 'unauthorized' };
  }

  const parsed = resendInviteSchema.safeParse({ userId: formData.get('user_id') });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }
  const rawLocale = (formData.get('locale') ?? '').toString();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'sv';

  // Icke-staff får bara skicka om till användare i sin egen skola (samma
  // gräns som getAdminUserDetail sätter via RLS för dem). Staff kan skicka
  // om tvärs skolor, precis som de kan öppna vilken användares detaljsida
  // som helst.
  const client = profile.is_staff
    ? createSupabaseServiceRoleClient()
    : await createSupabaseServerClient();

  let targetQuery = client
    .from('profiles')
    .select('id, email, full_name, role, school_id')
    .eq('id', parsed.data.userId);
  if (!profile.is_staff) {
    targetQuery = targetQuery.eq('school_id', profile.school_id ?? '');
  }
  const { data: target } = await targetQuery.maybeSingle();

  if (!target || !target.email || !target.school_id) {
    return { status: 'error', code: 'not-found' };
  }

  const { data: school } = await client
    .from('schools')
    .select('name')
    .eq('id', target.school_id)
    .maybeSingle();
  if (!school) {
    return { status: 'error', code: 'generic', detail: 'Skolan hittades inte' };
  }

  const result = await inviteUserCore({
    email: target.email,
    fullName: target.full_name ?? target.email,
    role: target.role,
    schoolId: target.school_id,
    schoolName: school.name,
    locale,
  });
  if (!result.ok) {
    return { status: 'error', code: 'generic', detail: result.detail };
  }

  return { status: 'success', email: target.email };
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
  //
  // timeslots.class_id är också ON DELETE CASCADE. I fönstret mellan att
  // admin skapar en klass + laddar upp ett schema (CSV) och att den
  // första lektionen faktiskt spelas in är lessonsCount 0 — utan denna
  // koll skulle raderingen tyst sudda hela schemat (de timeslots
  // mobilappens REC-flöde bygger på) utan varning.
  const [lessonsResult, timeslotsResult] = await Promise.all([
    supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('class_id', classId),
    supabase.from('timeslots').select('id', { count: 'exact', head: true }).eq('class_id', classId),
  ]);
  if (lessonsResult.error) {
    return { status: 'error', code: 'generic', detail: lessonsResult.error.message };
  }
  if (timeslotsResult.error) {
    return { status: 'error', code: 'generic', detail: timeslotsResult.error.message };
  }
  if ((lessonsResult.count ?? 0) > 0 || (timeslotsResult.count ?? 0) > 0) {
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

const createCourseSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(200),
});

export type CreateCourseState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'duplicate' | 'generic'; detail?: string };

export async function createCourse(
  _prev: CreateCourseState,
  formData: FormData,
): Promise<CreateCourseState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const parsed = createCourseSchema.safeParse({
    code: formData.get('code'),
    name: formData.get('name'),
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('courses').insert({
    school_id: profile.school_id,
    code: parsed.data.code,
    name: parsed.data.name,
  });
  if (error) {
    if (error.code === '23505') return { status: 'error', code: 'duplicate' };
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/kurser');
  revalidatePath('/en/app/admin/kurser');
  return { status: 'success' };
}

export type DeleteCourseState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'has-lessons' | 'generic'; detail?: string };

export async function deleteCourse(
  _prev: DeleteCourseState,
  formData: FormData,
): Promise<DeleteCourseState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const courseId = (formData.get('course_id') ?? '').toString();
  if (!courseId) return { status: 'error', code: 'unauthorized' };
  if (!z.string().uuid().safeParse(courseId).success) {
    return { status: 'error', code: 'unauthorized' };
  }

  const supabase = await createSupabaseServerClient();

  // lessons.course_id är ON DELETE CASCADE — blockera radering om
  // kursen har inspelade lektioner, annars försvinner transkript och
  // chatthistorik tyst med den. Räknar AVSIKTLIGT även arkiverade
  // lektioner (ingen .is('archived_at', null)) — cascaden skulle radera
  // dem lika tyst, så de ska också blockera radering.
  //
  // timeslots.course_id är också ON DELETE CASCADE. I fönstret mellan att
  // admin skapar en kurs + laddar upp ett schema (CSV) och att den första
  // lektionen faktiskt spelas in är lessonsCount 0 — utan denna koll
  // skulle raderingen tyst sudda hela schemat (de timeslots mobilappens
  // REC-flöde bygger på) utan varning.
  const [lessonsResult, timeslotsResult] = await Promise.all([
    supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('course_id', courseId),
    supabase.from('timeslots').select('id', { count: 'exact', head: true }).eq('course_id', courseId),
  ]);
  if (lessonsResult.error) {
    return { status: 'error', code: 'generic', detail: lessonsResult.error.message };
  }
  if (timeslotsResult.error) {
    return { status: 'error', code: 'generic', detail: timeslotsResult.error.message };
  }
  if ((lessonsResult.count ?? 0) > 0 || (timeslotsResult.count ?? 0) > 0) {
    return { status: 'error', code: 'has-lessons' };
  }

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)
    .eq('school_id', profile.school_id);
  if (error) {
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/kurser');
  revalidatePath('/en/app/admin/kurser');
  return { status: 'success' };
}

const assignTeacherSchema = z.object({
  courseId: z.string().uuid(),
  teacherId: z.string().uuid(),
});

export type AssignTeacherState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'duplicate' | 'generic'; detail?: string };

export async function assignTeacherToCourse(
  _prev: AssignTeacherState,
  formData: FormData,
): Promise<AssignTeacherState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const parsed = assignTeacherSchema.safeParse({
    courseId: formData.get('course_id'),
    teacherId: formData.get('teacher_id'),
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();

  // RLS på course_teachers kollar bara att kursen tillhör adminens
  // skola — inte att den valda profilen gör det. Måste kollas i kod.
  const { data: teacher } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', parsed.data.teacherId)
    .eq('school_id', profile.school_id)
    .eq('role', 'teacher')
    .maybeSingle();
  if (!teacher) {
    return { status: 'error', code: 'invalid', detail: 'Läraren tillhör inte din skola' };
  }

  const { error } = await supabase.from('course_teachers').insert({
    course_id: parsed.data.courseId,
    profile_id: parsed.data.teacherId,
  });
  if (error) {
    if (error.code === '23505') return { status: 'error', code: 'duplicate' };
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/kurser');
  revalidatePath('/en/app/admin/kurser');
  return { status: 'success' };
}

export async function removeTeacherFromCourse(
  _prev: AssignTeacherState,
  formData: FormData,
): Promise<AssignTeacherState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const parsed = assignTeacherSchema.safeParse({
    courseId: formData.get('course_id'),
    teacherId: formData.get('teacher_id'),
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('course_teachers')
    .delete()
    .eq('course_id', parsed.data.courseId)
    .eq('profile_id', parsed.data.teacherId);
  if (error) {
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/kurser');
  revalidatePath('/en/app/admin/kurser');
  return { status: 'success' };
}

export type ImportUsersState =
  | { status: 'idle' }
  | { status: 'success'; invited: number; skipped: { email: string; reason: string }[] }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'generic'; detail?: string };

export async function importUsers(
  _prev: ImportUsersState,
  formData: FormData,
): Promise<ImportUsersState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', code: 'invalid', detail: 'Ingen fil vald' };
  }
  const rawLocale = (formData.get('locale') ?? '').toString();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'sv';

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { status: 'error', code: 'invalid', detail: 'Kunde inte läsa filen' };
  }

  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { status: 'error', code: 'invalid', detail: 'Filen är tom' };
  }

  const required = ['full_name', 'email', 'class_name'];
  const missing = required.filter((k) => !(k in rows[0]!));
  if (missing.length > 0) {
    return {
      status: 'error',
      code: 'invalid',
      detail: `Rubriker saknas: ${missing.join(', ')}`,
    };
  }
  // En admin ska kunna ladda upp en hel skola i ett svep (skolor har
  // 2000+ elever), så importen körs i parallella batchar istället för en
  // rad i taget (se PARALLEL_ROWS nedan). vercel.json ger den här sidan
  // maxDuration: 300 (Vercel Pro-taket). Verifierat mot skarpt Loops+
  // Supabase 2026-08-12 på 543 rader: ~23s vid concurrency 10, men det
  // fick Loops att rate-limita (429) på en stor andel anrop. Concurrency
  // sänkt till 5 + retry-med-backoff på 429 i lib/loops.ts. Med
  // marginal för retries rymmer 3000 rader väl inom 300s-taket. En
  // riktig bakgrundsjobb/kö-arkitektur (valfri filstorlek, progress,
  // ingen timeout-risk alls) är en rimlig framtida förbättring om
  // massimport av jättestora skolor blir vanligt.
  const MAX_IMPORT_ROWS = 3000;
  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      status: 'error',
      code: 'invalid',
      detail: `Max ${MAX_IMPORT_ROWS} rader per import`,
    };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: classes }, { data: school }] = await Promise.all([
    supabase.from('classes').select('id, name').eq('school_id', profile.school_id),
    supabase.from('schools').select('name').eq('id', profile.school_id).maybeSingle(),
  ]);
  // Ska aldrig kunna hända (school_id är adminens egen) — men om det ändå
  // gör det ska vi hellre avbryta hela importen än tyst skicka massvis med
  // mejl med tomt skolnamn.
  if (!school) {
    return { status: 'error', code: 'generic', detail: 'Skolan hittades inte' };
  }
  const classMap = new Map((classes ?? []).map((c) => [c.name, c.id]));
  const schoolName = school.name;
  const schoolId = profile.school_id;

  // Hur många rader som körs samtidigt per batch. Sänkt från 10 → 5 efter
  // ett verkligt 543-raders test (2026-08-12) som fick Loops att svara
  // 429 på en stor andel anrop vid concurrency 10 — se retry-fixen i
  // lib/loops.ts (sendLoopsTransactional retry:ar nu på 429 också, men
  // lägre concurrency minskar hur ofta det behövs överhuvudtaget).
  const PARALLEL_ROWS = 5;

  type RowResult =
    | { invited: true }
    | { invited: false; skipped: { email: string; reason: string } };

  async function processRow(row: Record<string, string>): Promise<RowResult> {
    const email = (row['email'] ?? '').trim();
    const fullName = (row['full_name'] ?? '').trim();
    const className = (row['class_name'] ?? '').trim();
    const rawRole = (row['role'] ?? '').trim().toLowerCase();
    // Tomt/saknat role-fält = elev (bakåtkompatibelt med filer utan
    // role-kolumn). Bara student/teacher stöds här — bulk-invite av admins
    // via CSV är avsiktligt inte tillåtet.
    const role: 'student' | 'teacher' = rawRole === 'teacher' ? 'teacher' : 'student';

    if (rawRole && role !== rawRole) {
      return { invited: false, skipped: { email: email || '(saknas)', reason: 'invalid-row' } };
    }
    if (!email || !fullName) {
      return { invited: false, skipped: { email: email || '(saknas)', reason: 'invalid-row' } };
    }

    // Lärare är kopplade till klasser via kurser (course_teachers), inte
    // class_members — den kopplingen görs på /admin/kurser, inte här.
    // class_name är därför bara obligatoriskt för elever.
    const classId = role === 'student' ? classMap.get(className) : undefined;
    if (role === 'student' && !classId) {
      return { invited: false, skipped: { email, reason: 'invalid-row' } };
    }

    const result = await inviteUserCore({
      email,
      fullName,
      role,
      schoolId,
      schoolName,
      className: role === 'student' ? className : undefined,
      locale,
    });

    let userId: string;
    if (!result.ok) {
      if (result.code === 'already-exists') {
        // Kan vara en omuppladdning efter en avbruten import (t.ex.
        // timeout mitt i loopen) — kontot finns redan men hann kanske
        // aldrig få sin class_members-länk. Hämta profilen (scopad till
        // samma skola — vi rör aldrig ett konto som hör till en annan
        // skola vid en e-postkrock) och länka ändå, annars blir kontot
        // permanent oklassat utan att gå att laga via omuppladdning.
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .eq('school_id', schoolId)
          .maybeSingle();
        if (!existing) {
          return { invited: false, skipped: { email, reason: result.code } };
        }
        userId = existing.id;
      } else {
        return { invited: false, skipped: { email, reason: result.code } };
      }
    } else {
      userId = result.userId;
    }

    if (role === 'teacher') {
      return { invited: true };
    }

    // Upsert (inte insert) så att en omuppladdning av en redan fullt
    // lyckad rad inte faller på en duplicate-key-krock — hela importen
    // blir därmed idempotent och självläkande vid omuppladdning.
    const { error: memberError } = await supabase
      .from('class_members')
      .upsert({ class_id: classId!, profile_id: userId }, { onConflict: 'class_id,profile_id' });
    if (memberError) {
      return { invited: false, skipped: { email, reason: 'class-link-failed' } };
    }
    return { invited: true };
  }

  let invited = 0;
  const skipped: { email: string; reason: string }[] = [];

  for (let i = 0; i < rows.length; i += PARALLEL_ROWS) {
    const batch = rows.slice(i, i + PARALLEL_ROWS);
    const results = await Promise.all(batch.map(processRow));
    for (const result of results) {
      if (result.invited) {
        invited += 1;
      } else {
        skipped.push(result.skipped);
      }
    }
  }

  revalidatePath('/sv/app/admin/anvandare');
  revalidatePath('/en/app/admin/anvandare');
  revalidatePath('/sv/app/admin/klasser');
  revalidatePath('/en/app/admin/klasser');
  return { status: 'success', invited, skipped };
}

const EMAIL_PATTERN = /[^\s<>,;]+@[^\s<>,;]+\.[^\s<>,;]+/;

// Tolererar friformat per rad: "Namn <mejl>", "Namn, mejl", "Namn mejl"
// eller bara "mejl" (namnet gissas då fram ur mejladressens lokaldel).
// Adminen ska kunna klistra in en lista utan att formatera om den.
function parseMassInviteLine(line: string): { fullName: string; email: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = trimmed.match(EMAIL_PATTERN);
  if (!match) return null;
  const email = match[0];
  const rest = trimmed
    .replace(email, '')
    .replace(/[<>,;]/g, ' ')
    .trim();
  if (rest) {
    return { fullName: rest, email };
  }
  const localPart = email.split('@')[0] ?? email;
  const guessedName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return { fullName: guessedName || email, email };
}

export type MassInviteState =
  | { status: 'idle' }
  | { status: 'success'; invited: number; skipped: { email: string; reason: string }[] }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'generic'; detail?: string };

const massInviteSchema = z.object({
  role: z.enum(['student', 'teacher', 'admin']),
  classId: z.string().uuid().optional(),
  entries: z.string().trim().min(1),
  locale: z.string(),
});

const MAX_MASS_INVITE_ROWS = 3000;

export async function massInvite(
  _prev: MassInviteState,
  formData: FormData,
): Promise<MassInviteState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const rawLocale = (formData.get('locale') ?? '').toString();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'sv';
  const parsed = massInviteSchema.safeParse({
    role: formData.get('role'),
    classId: (formData.get('class_id') ?? '').toString() || undefined,
    entries: formData.get('entries'),
    locale,
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }
  const { role, classId } = parsed.data;

  if (role === 'student' && !classId) {
    return { status: 'error', code: 'invalid', detail: 'Klass krävs för elever' };
  }

  const lines = parsed.data.entries.split('\n');
  const entries = lines
    .map(parseMassInviteLine)
    .filter((e): e is { fullName: string; email: string } => e !== null);
  if (entries.length === 0) {
    return { status: 'error', code: 'invalid', detail: 'Ingen giltig rad hittades' };
  }
  if (entries.length > MAX_MASS_INVITE_ROWS) {
    return {
      status: 'error',
      code: 'invalid',
      detail: `Max ${MAX_MASS_INVITE_ROWS} rader per omgång`,
    };
  }

  const supabase = await createSupabaseServerClient();
  const schoolId = profile.school_id;
  const [{ data: school }, { data: className }] = await Promise.all([
    supabase.from('schools').select('name').eq('id', schoolId).maybeSingle(),
    classId
      ? supabase.from('classes').select('name').eq('id', classId).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
  ]);
  if (!school) {
    return { status: 'error', code: 'generic', detail: 'Skolan hittades inte' };
  }
  if (role === 'student' && !className) {
    return { status: 'error', code: 'invalid', detail: 'Klassen hittades inte' };
  }
  const schoolName = school.name;

  type RowResult =
    | { invited: true }
    | { invited: false; skipped: { email: string; reason: string } };

  async function processEntry(entry: { fullName: string; email: string }): Promise<RowResult> {
    const result = await inviteUserCore({
      email: entry.email,
      fullName: entry.fullName,
      role,
      schoolId,
      schoolName,
      className: role === 'student' ? className!.name : undefined,
      locale,
    });

    let userId: string;
    if (!result.ok) {
      if (result.code === 'already-exists') {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', entry.email)
          .eq('school_id', schoolId)
          .maybeSingle();
        if (!existing) {
          return { invited: false, skipped: { email: entry.email, reason: result.code } };
        }
        userId = existing.id;
      } else {
        return { invited: false, skipped: { email: entry.email, reason: result.code } };
      }
    } else {
      userId = result.userId;
    }

    if (role !== 'student') {
      return { invited: true };
    }

    const { error: memberError } = await supabase
      .from('class_members')
      .upsert({ class_id: classId!, profile_id: userId }, { onConflict: 'class_id,profile_id' });
    if (memberError) {
      return { invited: false, skipped: { email: entry.email, reason: 'class-link-failed' } };
    }
    return { invited: true };
  }

  // Samma batchning + Loops-retry som importUsers (se den för resonemang
  // kring PARALLEL_ROWS och maxDuration).
  const PARALLEL_ROWS = 5;
  let invited = 0;
  const skipped: { email: string; reason: string }[] = [];
  for (let i = 0; i < entries.length; i += PARALLEL_ROWS) {
    const batch = entries.slice(i, i + PARALLEL_ROWS);
    const results = await Promise.all(batch.map(processEntry));
    for (const result of results) {
      if (result.invited) {
        invited += 1;
      } else {
        skipped.push(result.skipped);
      }
    }
  }

  revalidatePath('/sv/app/admin/anvandare');
  revalidatePath('/en/app/admin/anvandare');
  revalidatePath('/sv/app/admin/klasser');
  revalidatePath('/en/app/admin/klasser');
  return { status: 'success', invited, skipped };
}
