import { createBrowserClient } from '@supabase/ssr';
import { debug } from '@/lib/logger';

// Debug environment variables (only when NEXT_PUBLIC_DEBUG_LOGS is enabled)
if (typeof window !== 'undefined') {
  debug('Supabase config:', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
    browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'
  });
}

// Use @supabase/ssr's createBrowserClient for cookie-based auth (SSR-compatible)
// This ensures auth tokens are stored in cookies, not just localStorage,
// so server-side route handlers can access the session.
export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
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
