import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Create anonymous Supabase client (no session/cookies)
 * Use this for logged-out users to subscribe to public data
 */
export function createAnonClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: undefined,
      },
      global: {
        headers: {
          'X-Client-Info': 'chxndler-anon-client'
        }
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }
  );
}

/**
 * Get the appropriate Supabase client based on auth state
 * - If session exists: return authenticated client
 * - If no session: return anonymous client
 */
export async function getSupabaseClient(authedClient: SupabaseClient): Promise<SupabaseClient> {
  const { data: { session } } = await authedClient.auth.getSession();

  if (session?.user) {
    return authedClient;
  }

  return createAnonClient();
}
