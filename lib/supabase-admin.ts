// lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Lazily creates the Supabase admin client.
 * Never call createClient at module scope in the App Router.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // Throw at request-time, not at build-time
    throw new Error('Missing Supabase env vars (URL or SERVICE_ROLE_KEY)');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'chxndler-music-site/api' } },
  });
}
