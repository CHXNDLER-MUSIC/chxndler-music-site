import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';
  const origin = requestUrl.origin;
  const profileSetup = requestUrl.searchParams.get('profileSetup');

  console.log('[auth/callback] Received request:', {
    url: requestUrl.toString(),
    code: code ? `${code.substring(0, 10)}...` : 'MISSING',
    next,
    profileSetup,
    origin
  });

  // If no code, redirect with error
  if (!code) {
    console.error('[auth/callback] Missing code parameter');
    return NextResponse.redirect(`${origin}/?error=missing_code`);
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

  // Create Supabase client that sets cookies on the redirect response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Exchange the code for a session
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

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

  // ========== ENSURE PROFILE EXISTS ==========
  // Database triggers should create the profile, but if they fail (column mismatch, etc.)
  // we create the profile here as a fallback using the admin client
  const user = sessionData?.session?.user;
  if (user) {
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
            display_name: displayName,
            heartcoin_balance: 0,
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
                  display_name: displayName,
                  heartcoin_balance: 0,
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

  console.log('[auth/callback] Success! Redirecting to:', redirectUrl);
  return response;
}
