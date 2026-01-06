import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  const profileSetup = requestUrl.searchParams.get('profileSetup');
  const origin = requestUrl.origin;

  // If no code, redirect with error
  if (!code) {
    console.error('[auth/callback] Missing code parameter');
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  // Create Supabase client with cookie handling for route handlers
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Exchange the code for a session
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] Code exchange failed:', error.message);

    // Handle specific error types
    if (error.message?.includes('code verifier') || error.message?.includes('PKCE')) {
      return NextResponse.redirect(`${origin}/?error=wrong_browser`);
    }
    if (error.message?.includes('expired') || error.message?.includes('invalid')) {
      return NextResponse.redirect(`${origin}/?error=link_expired`);
    }

    return NextResponse.redirect(`${origin}/?error=auth_exchange_failed`);
  }

  // Build redirect URL with optional profileSetup param
  let redirectUrl = `${origin}${next}`;
  if (profileSetup) {
    const separator = redirectUrl.includes('?') ? '&' : '?';
    redirectUrl = `${redirectUrl}${separator}profileSetup=${profileSetup}`;
  }

  console.log('[auth/callback] Success! Redirecting to:', redirectUrl);
  return NextResponse.redirect(redirectUrl);
}
