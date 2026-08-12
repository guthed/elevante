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

export type ImportStudentsState =
  | { status: 'idle' }
  | { status: 'success'; invited: number; skipped: { email: string; reason: string }[] }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'generic'; detail?: string };

export async function importStudents(
  _prev: ImportStudentsState,
  formData: FormData,
): Promise<ImportStudentsState> {
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
  // Skydd mot att en enda stor fil blockerar Server Action-requesten
  // (varje rad gör ett separat Auth Admin API-anrop, som i sin tur
  // skickar ett mejl, plus en DB-insert) eller triggar Supabase Auths
  // rate limit för inviteUserByEmail. vercel.json sätter maxDuration: 30
  // för app/**/*.tsx (routen den här actionen körs på); vid 150–500 ms/rad
  // rymmer det 30s-taket bekvämt bara upp till ~40–60 rader, inte 200 —
  // därav den lägre gränsen. En riktig bakgrundsjobb/kö-arkitektur för
  // större importer är en rimlig framtida förbättring, utanför scope här.
  if (rows.length > 40) {
    return { status: 'error', code: 'invalid', detail: 'Max 40 rader per import' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .eq('school_id', profile.school_id);
  const classMap = new Map((classes ?? []).map((c) => [c.name, c.id]));

  let invited = 0;
  const skipped: { email: string; reason: string }[] = [];

  for (const row of rows) {
    const email = (row['email'] ?? '').trim();
    const fullName = (row['full_name'] ?? '').trim();
    const className = (row['class_name'] ?? '').trim();
    const classId = classMap.get(className);

    if (!email || !fullName || !classId) {
      skipped.push({ email: email || '(saknas)', reason: 'invalid-row' });
      continue;
    }

    const result = await inviteUserCore({
      email,
      fullName,
      role: 'student',
      schoolId: profile.school_id,
      locale,
    });

    let studentId: string;
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
          .eq('school_id', profile.school_id)
          .maybeSingle();
        if (!existing) {
          skipped.push({ email, reason: result.code });
          continue;
        }
        studentId = existing.id;
      } else {
        skipped.push({ email, reason: result.code });
        continue;
      }
    } else {
      studentId = result.userId;
    }

    // Upsert (inte insert) så att en omuppladdning av en redan fullt
    // lyckad rad inte faller på en duplicate-key-krock — hela importen
    // blir därmed idempotent och självläkande vid omuppladdning.
    const { error: memberError } = await supabase
      .from('class_members')
      .upsert({ class_id: classId, profile_id: studentId }, { onConflict: 'class_id,profile_id' });
    if (memberError) {
      skipped.push({ email, reason: 'class-link-failed' });
      continue;
    }
    invited += 1;
  }

  revalidatePath('/sv/app/admin/anvandare');
  revalidatePath('/en/app/admin/anvandare');
  revalidatePath('/sv/app/admin/klasser');
  revalidatePath('/en/app/admin/klasser');
  return { status: 'success', invited, skipped };
}
