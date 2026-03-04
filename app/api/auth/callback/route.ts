import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';
  const origin = requestUrl.origin;
  const profileSetup = requestUrl.searchParams.get('profileSetup');

  if (process.env.NODE_ENV !== "production") {
    console.log('[auth/callback] ========== REQUEST RECEIVED ==========');
    console.log('[auth/callback] Full URL:', requestUrl.toString());
    console.log('[auth/callback] Parsed:', {
      code: code ? `${code.substring(0, 10)}...` : 'MISSING',
      token_hash: token_hash ? `${token_hash.substring(0, 10)}...` : 'MISSING',
      type,
      next,
      profileSetup,
      origin
    });
  }

  // Handle case where no code is provided (could be token_hash for older flows)
  if (!code && !token_hash) {
    console.error('[auth/callback] Missing both code and token_hash parameters');
    return NextResponse.redirect(`${origin}/?error=missing_code&details=no_auth_params`);
  }

  // Build redirect URL early so we can set cookies directly on it
  let redirectUrl = `${origin}${next}`;
  if (profileSetup === '1') {
    const separator = redirectUrl.includes('?') ? '&' : '?';
    redirectUrl = `${redirectUrl}${separator}profileSetup=1`;
  }
  if (process.env.NODE_ENV !== "production") console.log('[auth/callback] Will redirect to:', redirectUrl);

  // Create the response object first - cookies will be set directly on this
  const response = NextResponse.redirect(redirectUrl);

  // Track cookies being set for debugging
  const cookiesSet: string[] = [];

  // Create Supabase client that sets cookies on the redirect response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = request.cookies.getAll();
          if (process.env.NODE_ENV !== "production") console.log('[auth/callback] Reading cookies:', cookies.map(c => c.name));
          return cookies;
        },
        setAll(cookiesToSet) {
          if (process.env.NODE_ENV !== "production") console.log('[auth/callback] Setting cookies:', cookiesToSet.map(c => ({ name: c.name, hasValue: !!c.value })));
          cookiesToSet.forEach(({ name, value, options }) => {
            // Ensure cookies work on localhost (http)
            const cookieOptions = {
              ...options,
              secure: origin.includes('localhost') ? false : options?.secure,
            };
            response.cookies.set(name, value, cookieOptions);
            cookiesSet.push(name);
          });
        },
      },
    }
  );

  let sessionData;
  let error;

  // Try code exchange first (PKCE flow)
  if (code) {
    if (process.env.NODE_ENV !== "production") console.log('[auth/callback] Exchanging code for session (PKCE flow)...');
    const result = await supabase.auth.exchangeCodeForSession(code);
    sessionData = result.data;
    error = result.error;
  }
  // Fallback to token_hash verification (older magic link flow)
  else if (token_hash && type) {
    if (process.env.NODE_ENV !== "production") console.log('[auth/callback] Verifying token_hash (legacy flow)...');
    const result = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'magiclink',
    });
    sessionData = result.data;
    error = result.error;
  }

  if (error) {
    console.error('[auth/callback] Code exchange failed:', {
      message: error.message,
      status: error.status,
      name: error.name,
    });

    // Handle specific error types
    if (error.message?.includes('code verifier') || error.message?.includes('PKCE')) {
      console.error('[auth/callback] PKCE error - user likely clicked link in different browser');
      return NextResponse.redirect(`${origin}/?error=wrong_browser&details=pkce_mismatch`);
    }
    if (error.message?.includes('expired') || error.message?.includes('invalid')) {
      console.error('[auth/callback] Link expired or invalid');
      return NextResponse.redirect(`${origin}/?error=link_expired`);
    }

    return NextResponse.redirect(`${origin}/?error=auth_exchange_failed&details=${encodeURIComponent(error.message)}`);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log('[auth/callback] ========== AUTH SUCCESS ==========');
    console.log('[auth/callback] User:', sessionData?.session?.user?.email);
    console.log('[auth/callback] User ID:', sessionData?.session?.user?.id);
    console.log('[auth/callback] Session exists:', !!sessionData?.session);
  }

  // If we got here without an error but also without a session, something went wrong
  if (!sessionData?.session) {
    console.error('[auth/callback] No session returned despite no error');
    return NextResponse.redirect(`${origin}/?error=no_session&details=auth_returned_empty`);
  }

  // ========== ENSURE PROFILE EXISTS ==========
  // Call the ensure_profile RPC to create profile if it doesn't exist
  // This runs as the authenticated user (no service role needed)
  try {
    if (process.env.NODE_ENV !== "production") console.log('[auth/callback] Calling ensure_profile RPC...');
    const { error: rpcError } = await supabase.rpc('ensure_profile');

    if (rpcError) {
      console.error('[auth/callback] ensure_profile RPC failed:', rpcError.message);
      // Don't fail the auth flow, just log the error
    } else {
      if (process.env.NODE_ENV !== "production") console.log('[auth/callback] ensure_profile RPC succeeded');
    }
  } catch (profileError: any) {
    console.error('[auth/callback] Profile creation error:', profileError?.message);
    // Don't fail the auth flow
  }

  if (process.env.NODE_ENV !== "production") {
    console.log('[auth/callback] ========== REDIRECT ==========');
    console.log('[auth/callback] Redirecting to:', redirectUrl);
    console.log('[auth/callback] Cookies set:', cookiesSet);
  }
  return response;
}

