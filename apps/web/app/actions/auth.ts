'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type Locale } from '@/lib/i18n/config';

export type AuthState =
  | { status: 'idle' }
  | { status: 'error'; code: 'invalid' | 'generic' }
  | { status: 'success'; message?: string };

async function supabaseForAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars saknas');
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>,
      ) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = (formData.get('email') ?? '').toString().trim();
  const password = (formData.get('password') ?? '').toString();
  const locale = ((formData.get('locale') ?? 'sv').toString() as Locale) ?? 'sv';
  const next = (formData.get('next') ?? '').toString();

  if (!email || !password) {
    return { status: 'error', code: 'invalid' };
  }

  const supabase = await supabaseForAuth();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes('invalid')) {
      return { status: 'error', code: 'invalid' };
    }
    return { status: 'error', code: 'generic' };
  }

  redirect(next || `/${locale}/app`);
}

export async function signOut(locale: Locale = 'sv'): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
