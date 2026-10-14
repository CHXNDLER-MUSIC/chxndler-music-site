import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

// Shared server-side auth checks for API routes.
// Uses the `sb-access-token` cookie that middleware keeps in sync with the
// validated Supabase session — the same token every existing route reads.

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'info@chxndler-music.com').toLowerCase();

export type ApiUser = { user: User; supabase: SupabaseClient };

/** Returns the signed-in user and an RLS-scoped client, or null if not signed in. */
export async function getApiUser(): Promise<ApiUser | null> {
  const token = (await cookies()).get('sb-access-token')?.value;
  if (!token) return null;
  const supabase = createSupabaseServerClientWithJwt(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return { user: data.user, supabase };
}

export function isAdminUser(user: User): boolean {
  return !!user.email && user.email.toLowerCase() === ADMIN_EMAIL;
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
