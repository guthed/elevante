'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database';

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY måste vara satta',
    );
  }
  return createBrowserClient<Database>(url, key);
}
