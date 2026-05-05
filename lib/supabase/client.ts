// Single source of truth for the browser Supabase client.
// All components must import from here — never call createBrowserClient() again elsewhere.
export { supabaseBrowser } from "@/lib/supabase-browser";
export { supabaseBrowser as supabaseClient } from "@/lib/supabase-browser";
export type { SupabaseClient } from "@supabase/supabase-js";
