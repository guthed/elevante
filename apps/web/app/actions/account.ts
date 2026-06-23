'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { isLocale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';

export type AccountState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'weak-password' | 'mismatch' | 'generic' };

function revalidateAccount(formData: FormData) {
  const locale = (formData.get('locale') ?? '').toString();
  const role = (formData.get('role') ?? '').toString();
  if (isLocale(locale) && isRole(role)) {
    // Layout-revalidering så att namnet i sidomenyn också uppdateras.
    revalidatePath(`/${locale}/app/${role}`, 'layout');
  }
}

export async function updateProfileName(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: 'error', code: 'unauthorized' };

  const name = (formData.get('name') ?? '').toString().trim();
  if (!name) return { status: 'error', code: 'invalid' };

  const supabase = await createSupabaseServerClient();
  // RLS (profiles_update_self) säkerställer att man bara kan uppdatera sin egen rad.
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: name })
    .eq('id', profile.id);

  if (error) return { status: 'error', code: 'generic' };

  revalidateAccount(formData);
  return { status: 'success' };
}

export async function updatePassword(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: 'error', code: 'unauthorized' };

  const password = (formData.get('password') ?? '').toString();
  const confirm = (formData.get('confirm') ?? '').toString();

  if (password.length < 8) return { status: 'error', code: 'weak-password' };
  if (password !== confirm) return { status: 'error', code: 'mismatch' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('weak') || msg.includes('short') || msg.includes('at least')) {
      return { status: 'error', code: 'weak-password' };
    }
    return { status: 'error', code: 'generic' };
  }

  return { status: 'success' };
}
