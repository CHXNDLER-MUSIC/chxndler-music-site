import { createBrowserClient } from "@supabase/ssr";

export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: {
      headers: { "X-Client-Info": "chxndler-music-site/browser" },
    },
    db: { schema: "public" },
    realtime: { params: { eventsPerSecond: 10 } },
  }
);

export type { SupabaseClient } from "@supabase/supabase-js";

