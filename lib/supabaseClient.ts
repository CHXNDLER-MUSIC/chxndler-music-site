import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Browser/client-side Supabase instance (uses anon key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Let Supabase auto-detect the best flow type
  },
});

// Export a function that returns the client for consistency with the analytics spec
export function createClient() {
  return supabaseClient;
}

import { ProfileTier } from '@/types/card';

// Optional: shared types for the profiles table
export type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  phone: string | null;
  hearts: number | null;
  created_at: string | null;
  updated_at: string | null;
  tier: ProfileTier;
};
