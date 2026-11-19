import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';
import { isConfiguredAdmin } from '@/lib/collaborationRules.mjs';
import { isAdminEmail } from '@/lib/adminAccess';

// Shared server-side auth checks for API routes.
// Uses the `sb-access-token` cookie that middleware keeps in sync with the
// validated Supabase session — the same token every existing route reads.

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'info@chxndler-music.com').toLowerCase();

export type ApiUser = { user: User; supabase: SupabaseClient };

/** Returns the signed-in user and an RLS-scoped client, or null if not signed in. */
export async function getApiUser(): Promise<ApiUser | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (values) => {
          // Server components cannot write cookies; middleware owns refreshes.
          try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    },
  );
  const { data, error } = await supabase.auth.getUser();
  if (!error && data?.user) return { user: data.user, supabase };

  // Keep compatibility with clients that have not yet migrated from the
  // legacy access-token cookie to Supabase's chunked SSR session cookies.
  const token = cookieStore.get('sb-access-token')?.value;
  if (!token) return null;
  const legacyClient = createSupabaseServerClientWithJwt(token);
  const legacy = await legacyClient.auth.getUser();
  return legacy.error || !legacy.data?.user ? null : { user: legacy.data.user, supabase: legacyClient };
}

export function isAdminUser(user: User): boolean {
  return isAdminEmail(user.email) || isConfiguredAdmin(user.email, ADMIN_EMAIL);
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
