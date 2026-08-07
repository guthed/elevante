'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { parseCsv } from '@/lib/csv';
import { sendInviteEmail } from '@/lib/invites/notify';
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

  if (userId === profile.id) {
    // profiles_protect_privileged_columns-triggern nollar tyst egen
    // role/school_id/status-ändring (skydd mot själveskalering) — ett
    // admin-försök att ändra SIN EGEN roll här skulle annars se ut att
    // lyckas (ingen DB-felkod) trots att inget faktiskt ändrades.
    return { status: 'error', code: 'invalid', detail: 'Kan inte ändra din egen roll här' };
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
  // Frivilligt fält — bara skolor som faktiskt kör Google/Microsoft-SSO sätter
  // det. Tomt textfält ska lagras som null, inte '' (kolumnen är nullable och
  // '' är inte en giltig domän).
  const identityDomainRaw = (formData.get('identity_domain') ?? '').toString().trim().toLowerCase();
  const identityDomain = identityDomainRaw.length > 0 ? identityDomainRaw : null;

  if (!name || !slug || !/^[a-z0-9-]+$/.test(slug)) {
    return { status: 'error', code: 'invalid' };
  }
  if (identityDomain && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(identityDomain)) {
    return { status: 'error', code: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('schools').insert({
    name,
    slug,
    country: country.slice(0, 2),
    identity_domain: identityDomain,
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

export type ApproveUserState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'stale' | 'generic'; detail?: string };

const approveUserSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(['student', 'teacher', 'admin']),
});

/**
 * Godkänner en väntande (status='pending') profil vars e-post matchar
 * adminens skolas identity_domain (listad av getPendingApprovals). En
 * pending-rad har school_id=null och är osynlig/oredigerbar för adminens
 * request-scopade klient (RLS: profiles_select_same_school/profiles_admin_manage
 * kräver `school_id = current_school_id()`, vilket aldrig är sant för null)
 * — service-role krävs. Behörigheten (adminens roll + skola) kollas explicit
 * här, eftersom service-role kringgår RLS helt.
 *
 * Litar aldrig på att UI-listan fortfarande stämmer vid submit — den
 * väntande raden hämtas och valideras på nytt (status fortfarande 'pending',
 * e-postens domän matchar fortfarande) precis innan uppdateringen, samma
 * försvarsdisciplin som claimInvite i app/actions/invites.ts.
 */
export async function approveUser(
  _prev: ApproveUserState,
  formData: FormData,
): Promise<ApproveUserState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const parsed = approveUserSchema.safeParse({
    userId: formData.get('user_id'),
    role: formData.get('role'),
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }
  const { userId, role } = parsed.data;

  const serviceRole = createSupabaseServiceRoleClient();

  const [{ data: target }, { data: school }] = await Promise.all([
    serviceRole.from('profiles').select('id, email, status').eq('id', userId).maybeSingle(),
    serviceRole.from('schools').select('identity_domain').eq('id', profile.school_id).maybeSingle(),
  ]);

  const domain = school?.identity_domain?.trim().toLowerCase();
  const targetEmailDomain = target?.email?.trim().toLowerCase().split('@')[1];

  if (
    !target ||
    target.status !== 'pending' ||
    !domain ||
    !targetEmailDomain ||
    targetEmailDomain !== domain
  ) {
    // Raden ändrades (redan godkänd/avvisad) eller matchar inte längre
    // adminens skoladomän — mjukt fel, inte en krasch.
    return { status: 'error', code: 'stale' };
  }

  // `.eq('status', 'pending')` skyddar mot en dubbel-godkännande-kapplöpning
  // — om 0 rader träffades har någon annan redan godkänt/ändrat kontot
  // mellan re-hämtningen ovan och den här uppdateringen.
  const { data: updated, error } = await serviceRole
    .from('profiles')
    .update({ role, school_id: profile.school_id, status: 'active' })
    .eq('id', userId)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    return { status: 'error', code: 'generic', detail: error.message };
  }
  if (!updated || updated.length === 0) {
    return { status: 'error', code: 'stale' };
  }

  revalidatePath('/sv/app/admin/anvandare');
  revalidatePath('/en/app/admin/anvandare');
  return { status: 'success' };
}

export type InviteUserState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'duplicate' | 'generic'; detail?: string };

const inviteUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1),
  role: z.enum(['student', 'teacher', 'admin']),
});

/**
 * Bjuder in en enskild användare via mejl-länk (roster-only-flödet). Insert i
 * user_invites görs via den request-scopade klienten — till skillnad från
 * godkännande-flödet ovan behövs INGEN service-role här: policyn
 * user_invites_admin_all tillåter redan `insert ... school_id = <adminens
 * egen school_id>` för en inloggad admin, RLS blockerar inget vi behöver göra.
 */
export async function inviteUser(
  _prev: InviteUserState,
  formData: FormData,
): Promise<InviteUserState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const parsed = inviteUserSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
    role: formData.get('role'),
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }
  const { email, name, role } = parsed.data;

  const supabase = await createSupabaseServerClient();

  const { data: school } = await supabase
    .from('schools')
    .select('name')
    .eq('id', profile.school_id)
    .single();

  const { data: newInvite, error } = await supabase
    .from('user_invites')
    .insert({
      school_id: profile.school_id,
      email,
      full_name: name,
      role,
      invited_by: profile.id,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      // Partiellt unikt index (lower(email) where claimed_at is null) —
      // e-posten har redan en oanvänd invite.
      return { status: 'error', code: 'duplicate' };
    }
    return { status: 'error', code: 'generic', detail: error.message };
  }

  // Best-effort — sendInviteEmail kastar aldrig, se lib/loops.ts.
  await sendInviteEmail({
    inviteId: newInvite.id,
    email,
    name,
    schoolName: school?.name ?? '',
  });

  revalidatePath('/sv/app/admin/anvandare');
  revalidatePath('/en/app/admin/anvandare');
  return { status: 'success' };
}

export type BulkInviteState =
  | { status: 'idle' }
  | { status: 'success'; invited: number; alreadyInvited: number; failed: number }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'generic'; detail?: string };

const bulkInviteRowSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1),
  // Case-insensitiv som email — en hopklistrad/Excel-exporterad CSV med
  // "Student"/"TEACHER" ska inte fälla hela uppladdningen.
  role: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.enum(['student', 'teacher', 'admin']),
  ),
});

/**
 * CSV-bulkimport av inbjudningar. Samma parse/validera-mönster som
 * uploadSchedule (app/actions/schedule.ts) — men till skillnad från den görs
 * INTE en batch-insert. user_invites har ett partiellt unikt index
 * (lower(email) where claimed_at is null): laddar en admin upp en CSV där en
 * rad redan har en oanvänd invite (t.ex. ett omladdat/uppdaterat register)
 * skulle en batch-insert fälla HELA importen på den enda konflikterande
 * raden. Vi insertar därför en rad i taget, fångar 23505 (unique violation)
 * som "redan inbjuden" och fortsätter — resten av raderna påverkas inte.
 */
export async function bulkInviteUsers(
  _prev: BulkInviteState,
  formData: FormData,
): Promise<BulkInviteState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', code: 'invalid', detail: 'Ingen fil vald' };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { status: 'error', code: 'invalid', detail: 'Kunde inte läsa filen' };
  }

  const rawRows = parseCsv(text);
  if (rawRows.length === 0) {
    return { status: 'error', code: 'invalid', detail: 'Filen är tom' };
  }

  // Case-insensitiva rubriker — en Excel-export med "Email"/"Namn" ska inte
  // fälla på "Rubriker saknas" trots att datan är fin.
  const rows = rawRows.map((row) => {
    const lower: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      lower[key.trim().toLowerCase()] = value;
    }
    return lower;
  });

  const required = ['email', 'name', 'role'];
  const first = rows[0]!;
  const missing = required.filter((k) => !(k in first));
  if (missing.length > 0) {
    return {
      status: 'error',
      code: 'invalid',
      detail: `Rubriker saknas: ${missing.join(', ')}`,
    };
  }

  // Validera samtliga rader strukturellt innan något skrivs — en felformaterad
  // rad ska fälla hela uppladdningen (som uploadSchedule), eftersom inget är
  // sparat än. Bara den efterföljande unique-violation-kapplöpningen per rad
  // (redan inbjuden) ska hanteras med skip-and-continue.
  const parsedRows: { email: string; name: string; role: UserRole }[] = [];
  for (const row of rows) {
    const parsed = bulkInviteRowSchema.safeParse({
      email: row['email'],
      name: row['name'],
      role: row['role'],
    });
    if (!parsed.success) {
      return {
        status: 'error',
        code: 'invalid',
        detail: `Rad med e-post="${row['email'] ?? ''}" kunde inte tolkas`,
      };
    }
    parsedRows.push(parsed.data);
  }

  const supabase = await createSupabaseServerClient();

  const { data: school } = await supabase
    .from('schools')
    .select('name')
    .eq('id', profile.school_id)
    .single();
  const schoolName = school?.name ?? '';

  let alreadyInvited = 0;
  let failed = 0;
  // Insert-fasen hålls ren från nätverksanrop till Loops — vid pilotens
  // skala (60–90 rader) skulle sekventiella insert+mejl-par per rad riskera
  // Vercel-funktionens tidsgräns. Mejlen skickas parallellt efter att alla
  // inserts är klara istället (sendInviteEmail kastar aldrig, se lib/loops.ts).
  const insertedForEmail: { inviteId: string; email: string; name: string }[] = [];

  for (const row of parsedRows) {
    const { data: newInvite, error } = await supabase
      .from('user_invites')
      .insert({
        school_id: profile.school_id,
        email: row.email,
        full_name: row.name,
        role: row.role,
        invited_by: profile.id,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        alreadyInvited += 1;
      } else {
        console.error('[bulkInviteUsers] insert misslyckades för rad:', row.email, error.message);
        failed += 1;
      }
      continue;
    }

    insertedForEmail.push({ inviteId: newInvite.id, email: row.email, name: row.name });
  }

  await Promise.allSettled(
    insertedForEmail.map((row) => sendInviteEmail({ ...row, schoolName })),
  );

  revalidatePath('/sv/app/admin/anvandare');
  revalidatePath('/en/app/admin/anvandare');
  return {
    status: 'success',
    invited: insertedForEmail.length,
    alreadyInvited,
    failed,
  };
}
