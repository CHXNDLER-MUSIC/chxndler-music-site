// Re-export the single browser client to maintain backward compatibility
export { supabaseBrowser as supabaseClient } from '@/lib/supabase-browser';

// Export a function that returns the client for consistency with the analytics spec
export function createClient() {
  return require('@/lib/supabase-browser').supabaseBrowser;
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
