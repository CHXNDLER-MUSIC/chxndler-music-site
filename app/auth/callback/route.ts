import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';
  const origin = requestUrl.origin;
  const profileSetup = requestUrl.searchParams.get('profileSetup');

  console.log('[auth/callback] ========== REQUEST RECEIVED ==========');
  console.log('[auth/callback] Full URL:', requestUrl.toString());
  console.log('[auth/callback] All params:', Object.fromEntries(requestUrl.searchParams.entries()));
  console.log('[auth/callback] Parsed:', {
    code: code ? `${code.substring(0, 10)}...` : 'MISSING',
    token_hash: token_hash ? `${token_hash.substring(0, 10)}...` : 'MISSING',
    type,
    next,
    profileSetup,
    origin
  });

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
  console.log('[auth/callback] Will redirect to:', redirectUrl);

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
          console.log('[auth/callback] Reading cookies:', cookies.map(c => c.name));
          return cookies;
        },
        setAll(cookiesToSet) {
          console.log('[auth/callback] Setting cookies:', cookiesToSet.map(c => ({ name: c.name, hasValue: !!c.value, options: c.options })));
          cookiesToSet.forEach(({ name, value, options }) => {
            // Ensure cookies work on localhost (http)
            const cookieOptions = {
              ...options,
              // Don't require secure on localhost
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
    console.log('[auth/callback] Exchanging code for session (PKCE flow)...');
    const result = await supabase.auth.exchangeCodeForSession(code);
    sessionData = result.data;
    error = result.error;
  }
  // Fallback to token_hash verification (older magic link flow)
  else if (token_hash && type) {
    console.log('[auth/callback] Verifying token_hash (legacy flow)...');
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
      code: code?.substring(0, 20) + '...'
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

  console.log('[auth/callback] ========== AUTH SUCCESS ==========');
  console.log('[auth/callback] User:', sessionData?.session?.user?.email);
  console.log('[auth/callback] User ID:', sessionData?.session?.user?.id);
  console.log('[auth/callback] Cookies set during auth:', cookiesSet);
  console.log('[auth/callback] Session exists:', !!sessionData?.session);
  console.log('[auth/callback] Access token exists:', !!sessionData?.session?.access_token);

  // If we got here without an error but also without a session, something went wrong
  if (!sessionData?.session) {
    console.error('[auth/callback] No session returned despite no error - this is unexpected');
    return NextResponse.redirect(`${origin}/?error=no_session&details=auth_returned_empty`);
  }

  // ========== ENSURE PROFILE EXISTS ==========
  // Database triggers should create the profile, but if they fail (column mismatch, etc.)
  // we create the profile here as a fallback using the admin client
  const user = sessionData?.session?.user;
  if (user) {
    console.log('[auth/callback] ========== PROFILE CHECK ==========');

    // Check if service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[auth/callback] WARNING: SUPABASE_SERVICE_ROLE_KEY is not set - cannot create profile as fallback');
      console.error('[auth/callback] Profile must be created by database trigger or will not exist');
    }

    try {
      const supabaseAdmin = getSupabaseAdmin();

      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('[auth/callback] Error checking profile:', checkError.message);
      }

      // Create profile if it doesn't exist
      if (!existingProfile) {
        console.log('[auth/callback] No profile found, creating one for user:', user.id);

        const displayName = user.user_metadata?.full_name ||
                           user.user_metadata?.name ||
                           user.email?.split('@')[0] ||
                           'Heartverse Wanderer';

        // Try minimal insert first with only guaranteed columns
        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            name: displayName,
            heart_coins_current: 0,
            heart_coins_total: 0,
            profile_complete: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('[auth/callback] Initial insert failed:', {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
            userId: user.id,
            email: user.email
          });

          // If it's a duplicate key error, the profile might already exist (race condition)
          if (insertError.code === '23505') {
            console.log('[auth/callback] Profile already exists (race condition), continuing...');
          } else {
            // Try even more minimal insert - just id
            console.log('[auth/callback] Trying minimal insert with just id...');
            const { error: minimalError } = await supabaseAdmin
              .from('profiles')
              .insert({ id: user.id });

            if (minimalError) {
              console.error('[auth/callback] Minimal insert also failed:', minimalError.message);
            } else {
              console.log('[auth/callback] Minimal insert succeeded, updating with details...');
              // Now update with additional fields
              await supabaseAdmin
                .from('profiles')
                .update({
                  email: user.email,
                  name: displayName,
                  heart_coins_current: 0,
                  heart_coins_total: 0,
                  profile_complete: false,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);
            }
          }
        } else {
          console.log('[auth/callback] Profile created successfully for:', user.email);
        }
      } else {
        console.log('[auth/callback] Profile already exists for user:', user.id);
      }
    } catch (profileError: any) {
      // Log but don't fail the auth flow
      console.error('[auth/callback] Profile creation error:', profileError?.message);
    }
  }

  console.log('[auth/callback] ========== REDIRECT ==========');
  console.log('[auth/callback] Redirecting to:', redirectUrl);
  console.log('[auth/callback] Total cookies set:', cookiesSet.length, cookiesSet);
  console.log('[auth/callback] Response cookies:', response.cookies.getAll().map(c => c.name));
  return response;
}
