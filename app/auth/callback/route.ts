import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(new URL('/login?error=missing-env', req.url));
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession({ authCode: code });
  if (error || !data.session || !data.user) {
    return NextResponse.redirect(new URL('/login?error=exchange_failed', req.url));
  }

  const accessToken = data.session.access_token;
  const refreshToken = data.session.refresh_token;

  // Check if this is a new user (profile doesn't exist yet)
  let isNewUser = false;
  try {
    const admin = getSupabaseAdmin();
    const { data: existingProfile } = await admin.from('profiles').select('id').eq('id', data.user.id).single();
    isNewUser = !existingProfile;
  } catch {
    isNewUser = true;
  }

  // Set auth cookies so our API routes can read them
  const redirectUrl = isNewUser ? '/?new_user=true' : '/dashboard';
  const res = NextResponse.redirect(new URL(redirectUrl, req.url));
  // Mirror cookie names expected by our API route
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set('sb-access-token', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  res.cookies.set('sb-refresh-token', refreshToken ?? '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  // Ensure a profile row exists (use admin client to bypass RLS for insert)
  try {
    const admin = getSupabaseAdmin();
    const meta = (data.user as any)?.user_metadata || {};
    const name: string | undefined = meta.full_name || meta.name || undefined;
    const email: string | undefined = (data.user as any)?.email || undefined;
    const emailPrefix = email ? email.split('@')[0] : undefined;
    const displayName = name || emailPrefix || 'Wanderer';
    await admin.from('profiles').upsert({
      id: data.user.id,
      email: email,
      name: displayName,
      journey: 'wanderer',
      heart_coins_current: 0,
      heart_coins_total: 0,
      profile_complete: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch {
    // Swallow errors; redirect proceeds regardless. Consider logging in real app.
  }

  return res;
}
