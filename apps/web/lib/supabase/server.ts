import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from './database';

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY m\u00e5ste vara satta i .env.local',
    );
  }
  return { url, key };
}

/** Server-side Supabase-klient för Server Components, Route Handlers och Server Actions.  */
export async function createSupabaseServerClient() {
  const { url, key } = env();
  const cookieStore = await cookies();

  return createServerClient<Database, 'elevante'>(url, key, {
    db: { schema: 'elevante' },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>,
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll() anropas från Server Components — Next.js tillåter inte
          // cookies().set() där. Proxy.ts tar hand om session-refresh istället.
        }
      },
    },
  });
}

/** Hämta aktuell användare (eller null). Safe för SSG-sidor — fångar fel. */
export async function getCurrentUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

/** Hämta aktuell profil (role, school_id, full_name). */
export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, school_id, full_name, email')
      .eq('id', user.id)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
