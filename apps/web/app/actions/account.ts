'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
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

const AVATAR_MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export type AvatarState =
  | { status: 'idle' }
  | { status: 'success'; avatarUrl: string | null }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'too-large' | 'generic' };

export async function uploadAvatar(
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: 'error', code: 'unauthorized' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', code: 'invalid' };
  }
  const ext = AVATAR_MIME_EXT[file.type];
  if (!ext) return { status: 'error', code: 'invalid' };
  if (file.size > AVATAR_MAX_BYTES) return { status: 'error', code: 'too-large' };

  // Service-role för själva Storage-anropet: en direkt RLS-check mot
  // storage.objects (samma foldername()=auth.uid()-mönster som
  // elevante-materials) gav genomgående "row-level security policy"-fel
  // här trots att predikatet stämde exakt (verifierat med de riktiga
  // värdena direkt i SQL) — troligen hur Storage-tjänsten hanterar JWT:t
  // för den här klient-konstruktionen, inte ett fel i policyn själv.
  // Säkert ändå: path byggs uteslutande från profile.id (redan verifierad
  // via getCurrentProfile ovan), aldrig från klient-input.
  const serviceClient = createSupabaseServiceRoleClient();
  const path = `${profile.id}/avatar.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Rensa ev. tidigare fil med annan filändelse (t.ex. byte från .png till
  // .webp) — annars ligger den kvar oanvänd i bucketen.
  const otherExts = Object.values(AVATAR_MIME_EXT).filter((e) => e !== ext);
  await serviceClient.storage
    .from('elevante-avatars')
    .remove(otherExts.map((e) => `${profile.id}/avatar.${e}`));

  const { error: uploadError } = await serviceClient.storage
    .from('elevante-avatars')
    .upload(path, buffer, { upsert: true, contentType: file.type });
  if (uploadError) {
    console.error('[avatar] upload misslyckades:', uploadError);
    return { status: 'error', code: 'generic' };
  }

  const { data: publicUrlData } = serviceClient.storage.from('elevante-avatars').getPublicUrl(path);
  // Cache-bust: samma path återanvänds vid byte, annars kan webbläsaren/CDN
  // fortsätta visa den gamla bilden efter en lyckad uppladdning.
  const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const supabase = await createSupabaseServerClient();
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', profile.id);
  if (updateError) {
    console.error('[avatar] profiluppdatering misslyckades:', updateError);
    return { status: 'error', code: 'generic' };
  }

  revalidateAccount(formData);
  return { status: 'success', avatarUrl };
}

export async function removeAvatar(
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: 'error', code: 'unauthorized' };

  const serviceClient = createSupabaseServiceRoleClient();
  const paths = Object.values(AVATAR_MIME_EXT).map((e) => `${profile.id}/avatar.${e}`);
  await serviceClient.storage.from('elevante-avatars').remove(paths);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', profile.id);
  if (error) return { status: 'error', code: 'generic' };

  revalidateAccount(formData);
  return { status: 'success', avatarUrl: null };
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
