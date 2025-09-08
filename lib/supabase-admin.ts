import { createClient, SupabaseClient } from '@supabase/supabase-js';

let admin: SupabaseClient | undefined;

export function getSupabaseAdmin() {
  if (admin) return admin;

  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase env missing: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  }

  admin = createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: 'analytics' }, // 👈 talk to the analytics schema by default
  });

  return admin;
}
