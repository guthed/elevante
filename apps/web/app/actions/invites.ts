'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { verifyInviteToken } from '@/lib/invites/token';
import { type Locale } from '@/lib/i18n/config';

export type ClaimInviteState =
  | { status: 'idle' }
  | { status: 'error'; code: 'invalid' | 'invite-invalid' | 'generic' };

const claimSchema = z.object({
  name: z.string().trim().min(1),
  password: z.string().min(8),
});

/**
 * Löser in en mejl-länk-invite (roster-only-flödet — skolor utan SSO). Token
 * = beviset: profilen sätts direkt till 'active' med invitens role/school_id,
 * ingen pending-omväg (jämfört med OAuth-gatingen i api/auth/callback som
 * kan lämna kontot pending vid domänmatchning utan invite).
 */
export async function claimInvite(
  _prev: ClaimInviteState,
  formData: FormData,
): Promise<ClaimInviteState> {
  const token = (formData.get('token') ?? '').toString();
  const locale = ((formData.get('locale') ?? 'sv').toString() as Locale) ?? 'sv';

  // Verifiera token igen server-side — sidans check (vid sidladdning) räcker
  // inte ensam, det här är en separat request.
  const inviteId = verifyInviteToken(token);
  if (!inviteId) {
    return { status: 'error', code: 'invite-invalid' };
  }

  const parsed = claimSchema.safeParse({
    name: formData.get('name'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { status: 'error', code: 'invalid' };
  }
  const { name, password } = parsed.data;

  const serviceRole = createSupabaseServiceRoleClient();

  // Hämta invite på nytt (inte klientens data) — täcker kapplöpningen där
  // länken hinner claimas (eller gå ut) mellan sidladdning och formulärsvar.
  const { data: invite, error: inviteError } = await serviceRole
    .from('user_invites')
    .select('id, email, school_id, role, claimed_at, expires_at')
    .eq('id', inviteId)
    .maybeSingle();

  if (inviteError || !invite) {
    return { status: 'error', code: 'invite-invalid' };
  }
  if (invite.claimed_at || new Date(invite.expires_at).getTime() < Date.now()) {
    return { status: 'error', code: 'invite-invalid' };
  }

  const { data: created, error: createError } = await serviceRole.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    // T.ex. e-posten har redan ett konto av något annat skäl — sällsynt givet
    // invite-systemet, men krascha aldrig okontrollerat.
    console.error('[claimInvite] createUser misslyckades:', createError);
    return { status: 'error', code: 'generic' };
  }

  const newUserId = created.user.id;

  // handle_new_auth_user()-triggern satte redan en 'pending'-profil på insert
  // — skriv över den direkt med invitens role/school_id och status 'active'.
  // Kontot är skapat vid det här laget, så ett engångs-retry på de två sista
  // (icke-atomiska) uppdateringarna minskar risken för att lämna ett
  // aktivt-men-role-lös konto eller en permanent olöst invite-rad kvar efter
  // ett rent transient fel, utan att bygga en full transaktion för detta.
  let profileError = (
    await serviceRole
      .from('profiles')
      .update({
        role: invite.role,
        school_id: invite.school_id,
        full_name: name,
        status: 'active',
      })
      .eq('id', newUserId)
  ).error;
  if (profileError) {
    profileError = (
      await serviceRole
        .from('profiles')
        .update({
          role: invite.role,
          school_id: invite.school_id,
          full_name: name,
          status: 'active',
        })
        .eq('id', newUserId)
    ).error;
  }
  if (profileError) {
    console.error('[claimInvite] profil-uppdatering misslyckades:', profileError);
    return { status: 'error', code: 'generic' };
  }

  let claimError = (
    await serviceRole
      .from('user_invites')
      .update({ claimed_at: new Date().toISOString() })
      .eq('id', invite.id)
  ).error;
  if (claimError) {
    claimError = (
      await serviceRole
        .from('user_invites')
        .update({ claimed_at: new Date().toISOString() })
        .eq('id', invite.id)
    ).error;
  }
  if (claimError) {
    // Inte kritiskt för användarens flöde — kontot är redan skapat och aktivt.
    console.error('[claimInvite] kunde inte markera invite som claimad efter retry:', claimError);
  }

  // Signera in användaren på riktigt så webbläsaren får en sessionscookie.
  // Måste vara den request-scopade klienten (cookies() via next/headers) —
  // service-role har ingen webbläsarsession att sätta cookie för.
  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });
  if (signInError) {
    console.error('[claimInvite] signInWithPassword misslyckades:', signInError);
    return { status: 'error', code: 'generic' };
  }

  redirect(`/${locale}/app`);
}
