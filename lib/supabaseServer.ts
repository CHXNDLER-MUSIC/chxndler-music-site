import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase utilities
// - Use service role key ONLY on the server for privileged operations.
// - For RLS-aware user actions, prefer creating a client with a user access token.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}
if (!anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// RLS-aware client using a user's access token (do not bypass RLS)
export function createSupabaseServerClientWithJwt(accessToken: string): SupabaseClient {
  if (!accessToken) throw new Error('Access token required');
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// Admin client using service role key (bypasses RLS). Use sparingly and only on server.
export function getSupabaseAdmin(): SupabaseClient {
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for admin operations');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

