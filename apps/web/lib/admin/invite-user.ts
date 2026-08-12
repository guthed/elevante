import 'server-only';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import type { UserRole } from '@/lib/supabase/database';
import type { Locale } from '@/lib/i18n/config';

export type InviteUserInput = {
  email: string;
  fullName: string;
  role: UserRole;
  schoolId: string;
  locale: Locale;
};

export type InviteUserResult =
  | { ok: true; userId: string }
  | { ok: false; code: 'already-exists' | 'generic'; detail?: string };

// Delad av inviteUser (app/actions/admin.ts, en-och-en) och
// importStudents (bulk via CSV) — båda ska skapa kontot på samma sätt.
export async function inviteUserCore(
  input: InviteUserInput,
): Promise<InviteUserResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(input.email, {
    data: {
      full_name: input.fullName,
      role: input.role,
      school_id: input.schoolId,
    },
    redirectTo: `${siteUrl}/${input.locale}/auth/confirm?next=/${input.locale}/app/${input.role}/konto`,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (
      error.code === 'email_exists' ||
      error.code === 'user_already_exists' ||
      msg.includes('already') ||
      msg.includes('registered')
    ) {
      return { ok: false, code: 'already-exists' };
    }
    return { ok: false, code: 'generic', detail: error.message };
  }
  if (!data.user) {
    return { ok: false, code: 'generic', detail: 'Inget user-objekt returnerades' };
  }
  return { ok: true, userId: data.user.id };
}
