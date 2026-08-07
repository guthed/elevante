import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database';

// Server-only. Kringgår RLS — används av kampanj-server-actions samt hela
// provisionerings-flödet (OAuth-callbacken, claim-invite, admin-godkännande)
// som avsiktligt behöver läsa/skriva förbi profiles/user_invites RLS.
export function createSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY saknas.');
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
