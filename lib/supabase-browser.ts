"use client";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: "sb-hjpaiolhhugwzblarfix-auth-token",
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Legacy export for backward compatibility - will be deprecated
export const supabaseBrowser = supabase;
export const supabaseClient = supabase;