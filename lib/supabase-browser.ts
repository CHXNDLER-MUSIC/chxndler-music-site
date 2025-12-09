import { createClient } from '@supabase/supabase-js';

// Debug environment variables (only in development)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  console.log('DEBUG Supabase config:', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
    browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'
  });
}

export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'supabase.auth.token',
    },
    global: {
      headers: {
        'X-Client-Info': 'chxndler-music-site/browser'
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
