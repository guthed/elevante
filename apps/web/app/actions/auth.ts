'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type Locale } from '@/lib/i18n/config';

export type AuthState =
  | { status: 'idle' }
  | { status: 'error'; code: 'invalid' | 'weak-password' | 'email-taken' | 'generic' }
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

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = (formData.get('email') ?? '').toString().trim();
  const password = (formData.get('password') ?? '').toString();
  const fullName = (formData.get('name') ?? '').toString().trim();
  const locale = ((formData.get('locale') ?? 'sv').toString() as Locale) ?? 'sv';

  if (!email || !password || !fullName) {
    return { status: 'error', code: 'invalid' };
  }
  if (password.length < 8) {
    return { status: 'error', code: 'weak-password' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const supabase = await supabaseForAuth();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/api/auth/callback?next=/${locale}/app`,
      data: { full_name: fullName },
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered')) {
      return { status: 'error', code: 'email-taken' };
    }
    if (msg.includes('weak') || msg.includes('short')) {
      return { status: 'error', code: 'weak-password' };
    }
    return { status: 'error', code: 'generic' };
  }

  return { status: 'success' };
}

export async function signOut(locale: Locale = 'sv'): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
