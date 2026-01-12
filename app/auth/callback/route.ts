import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';
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

        // Use upsert with minimal columns to handle edge cases:
        // - Email unique constraint conflicts
        // - Schema variations across deployments
        // The onboarding modal will set name/element through ProfileContext
        const { error: upsertError } = await supabaseAdmin
          .from('profiles')
          .upsert(
            {
              id: user.id,
              email: user.email,
            },
            {
              onConflict: 'id',
              ignoreDuplicates: false
            }
          );

        if (upsertError) {
          // Log detailed error for debugging
          console.error('[auth/callback] Failed to create/update profile:', {
            message: upsertError.message,
            code: upsertError.code,
            details: upsertError.details,
            hint: upsertError.hint,
            userId: user.id,
            email: user.email
          });

          // Try a second approach - simple insert without email (in case email has unique constraint issues)
          console.log('[auth/callback] Trying fallback insert without email...');
          const { error: fallbackError } = await supabaseAdmin
            .from('profiles')
            .insert({ id: user.id });

          if (fallbackError) {
            console.error('[auth/callback] Fallback insert also failed:', fallbackError.message);
          } else {
            console.log('[auth/callback] Fallback insert succeeded for:', user.id);
          }
        } else {
          console.log('[auth/callback] Profile created/updated successfully for:', user.email);
        }
      } else {
        console.log('[auth/callback] Profile already exists for user:', user.id);
      }
    } catch (profileError: any) {
      // Log but don't fail the auth flow
      console.error('[auth/callback] Profile creation error:', profileError?.message);
    }
  }

  // Build redirect URL with profileSetup parameter for new users
  // This triggers the onboarding modal flow (name prompt → element selection)
  const profileSetup = requestUrl.searchParams.get('profileSetup');
  let redirectUrl = `${origin}${next}`;

  // Pass profileSetup parameter through to trigger onboarding modal
  if (profileSetup === '1') {
    const separator = redirectUrl.includes('?') ? '&' : '?';
    redirectUrl = `${redirectUrl}${separator}profileSetup=1`;
  }

  console.log('[auth/callback] Success! Redirecting to:', redirectUrl);
  return NextResponse.redirect(redirectUrl);
}
