import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  // Log for debugging
  console.log('Auth callback - URL params:', Object.fromEntries(url.searchParams.entries()));
  console.log('Auth callback - Code present:', !!code);

  if (!code) {
    console.log('Auth callback - No code present, redirecting to home');
    return NextResponse.redirect(new URL('/', req.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !anonKey) {
    console.log('Auth callback - Missing environment variables');
    return NextResponse.redirect(new URL('/?error=missing-env', req.url));
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession({ authCode: code });
  if (error || !data.session || !data.user) {
    console.log('Auth callback - Exchange failed:', error);
    return NextResponse.redirect(new URL('/?error=exchange_failed', req.url));
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
  const redirectUrl = isNewUser ? '/?new_user=true' : '/';
  const res = NextResponse.redirect(new URL(redirectUrl, req.url));
  console.log('Auth callback - Redirecting to:', redirectUrl);
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
    const email: string | undefined = (data.user as any)?.email || undefined;
    
    console.log('Auth callback - Creating profile for user:', data.user.id, 'email:', email);
    
    // Try the simplest possible insert first - just id and email
    const { data: profileData, error: profileError } = await admin.from('profiles').upsert({
      id: data.user.id,
      email: email,
    }, { onConflict: 'id' });
    
    if (profileError) {
      console.error('Auth callback - Profile creation error:', profileError);
    } else {
      console.log('Auth callback - Profile created/updated successfully:', profileData);
    }
  } catch (error) {
    console.error('Auth callback - Profile creation failed:', error);
    // Continue with redirect even if profile creation fails
  }

  return res;
}
