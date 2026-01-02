"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  const handleSuccessfulAuth = async (session: any) => {
    console.log('🎉 AUTH SUCCESS! User:', session.user.id, 'Email:', session.user.email);

    // Check if this came from an email signup flow by looking for profileSetup parameter
    const urlParams = new URLSearchParams(window.location.search);
    const isFromEmailSignup = urlParams.get('profileSetup') === '1';

    console.log('🔍 Auth callback context:', {
      isFromEmailSignup,
      searchParams: window.location.search,
      fullUrl: window.location.href,
      allParams: Object.fromEntries(urlParams.entries())
    });

    // For all auth flows, check profile completeness using profile_complete (same as profile hook)
    let needsOnboarding = false;
    try {
      const { data: existing, error } = await supabaseClient
        .from('profiles')
        .select('id, name, profile_complete')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ Profile fetch failed:', error);
        needsOnboarding = true;
      } else if (!existing) {
        // No profile exists yet - create one and mark as needing onboarding
        await supabaseClient
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email || null,
            name: null,
            profile_complete: false
          })
          .throwOnError();
        needsOnboarding = true;
      } else {
        // Profile exists - check if onboarding is complete using same logic as profile hook
        needsOnboarding = !existing.profile_complete ||
                          !existing.name ||
                          existing.name.trim() === '';
      }
    } catch (e) {
      console.warn('⚠️ Profile check failed; defaulting to onboarding flow:', e);
      needsOnboarding = true;
    }

    // Redirect based on onboarding status
    if (needsOnboarding) {
      console.log('📝 User needs onboarding - redirecting to name prompt');
      router.push('/?showNamePrompt=1');
      return;
    }

    // User has completed onboarding - proceed to normal home
    console.log('✅ User onboarding complete - redirecting to home');

    // Force a profile refresh by emitting a custom event with a small delay
    // to ensure the session is fully established
    setTimeout(() => {
      try {
        console.log('🔔 Dispatching auth:profile-updated event');
        window.dispatchEvent(new CustomEvent('auth:profile-updated'));
        // Also dispatch a more general refresh event as backup
        window.dispatchEvent(new CustomEvent('profile:force-refresh'));
      } catch (e) {
        console.error('Error dispatching profile refresh events:', e);
      }
    }, 100);

    router.push('/');
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    // Helper to clear timeout safely
    const clearSafetyTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // Helper to clear URL hash without triggering navigation
    const clearHashFromUrl = () => {
      if (window.location.hash) {
        console.log('🧹 Clearing hash from URL to prevent re-processing');
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    async function handleAuthCallback() {
      try {
        // === COMPREHENSIVE LOGGING ===
        console.log('='.repeat(60));
        console.log('🚨 AUTH CALLBACK PAGE HIT! 🚨');
        console.log('='.repeat(60));

        const fullUrl = window.location.href;
        const search = window.location.search;
        const hash = window.location.hash;

        console.log('📍 URL:', fullUrl);
        console.log('📍 Search:', search);
        console.log('📍 Hash:', hash);

        const searchParams = new URLSearchParams(search);
        const oauthCode = searchParams.get('code');
        const hasCode = !!oauthCode;
        const hasHashToken = hash.includes('access_token=');

        console.log('🔑 HAS ?code= PARAMETER:', hasCode);
        console.log('🔑 HAS #access_token= in hash:', hasHashToken);
        if (hasCode) {
          console.log('🔑 CODE VALUE (first 20 chars):', oauthCode?.substring(0, 20) + '...');
        }
        console.log('='.repeat(60));

        // Set a safety timeout to prevent infinite loading (30s while debugging)
        timeoutId = setTimeout(() => {
          console.error('⏰ AUTH CALLBACK TIMEOUT (30s) - redirecting to home with error');
          router.replace('/?error=timeout');
        }, 30000); // 30 second timeout for debugging

        // === FLOW 1: PKCE flow - If ?code= exists, exchange it for session ===
        if (hasCode) {
          console.log('🔄 PKCE FLOW: CODE DETECTED - calling exchangeCodeForSession with FULL URL...');

          const { data: exchangeData, error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(fullUrl);

          console.log('='.repeat(60));
          console.log('📦 exchangeCodeForSession RESULT:');
          console.log('   - Has data:', !!exchangeData);
          console.log('   - Has session:', !!exchangeData?.session);
          console.log('   - Has user:', !!exchangeData?.session?.user);
          console.log('   - User ID:', exchangeData?.session?.user?.id ?? 'N/A');
          console.log('   - User email:', exchangeData?.session?.user?.email ?? 'N/A');
          console.log('   - Has error:', !!exchangeError);
          if (exchangeError) {
            console.log('   - Error message:', exchangeError.message);
            console.log('   - Error name:', exchangeError.name);
          }
          console.log('='.repeat(60));

          if (exchangeError) {
            console.error('❌ exchangeCodeForSession FAILED:', exchangeError.message);
            clearSafetyTimeout();

            // Check if this is a PKCE verifier error (magic link opened in wrong browser)
            if (exchangeError.message?.includes('code verifier') ||
                exchangeError.message?.includes('PKCE') ||
                exchangeError.message?.includes('code_verifier')) {
              router.replace('/?error=wrong_browser');
              return;
            }

            // Check if the code is expired or already used
            if (exchangeError.message?.includes('expired') ||
                exchangeError.message?.includes('invalid') ||
                exchangeError.message?.includes('already used')) {
              router.replace('/?error=link_expired');
              return;
            }

            // Generic code exchange error - encode the error message
            const encodedError = encodeURIComponent(exchangeError.message || 'Unknown error');
            router.replace(`/?error=${encodedError}`);
            return;
          }

          if (exchangeData?.session?.user) {
            console.log('✅ CODE EXCHANGE SUCCESSFUL! Proceeding with auth flow...');
            clearSafetyTimeout();
            await handleSuccessfulAuth(exchangeData.session);
            return;
          }

          // Code existed but no session returned and no error - unusual state
          console.error('❌ Code exchange returned no session and no error');
          clearSafetyTimeout();
          router.replace('/?error=no_session_after_exchange');
          return;
        }

        // === FLOW 2: Magic link hash token flow - If #access_token= exists ===
        if (hasHashToken) {
          console.log('🔄 MAGIC LINK FLOW: #access_token= detected in hash');
          console.log('🔄 Calling getSession() to process hash tokens...');

          // Supabase client automatically detects and processes tokens in URL hash
          const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

          console.log('='.repeat(60));
          console.log('📦 getSession() RESULT (after hash token):');
          console.log('   - Has session:', !!sessionData?.session);
          console.log('   - Has user:', !!sessionData?.session?.user);
          console.log('   - User ID:', sessionData?.session?.user?.id ?? 'N/A');
          console.log('   - User email:', sessionData?.session?.user?.email ?? 'N/A');
          console.log('   - Has error:', !!sessionError);
          if (sessionError) {
            console.log('   - Error message:', sessionError.message);
          }
          console.log('='.repeat(60));

          if (sessionError) {
            console.error('❌ getSession after hash token FAILED:', sessionError.message);
            clearSafetyTimeout();
            clearHashFromUrl();
            router.replace(`/?error=${encodeURIComponent(sessionError.message)}`);
            return;
          }

          if (sessionData?.session?.user) {
            console.log('✅ MAGIC LINK SESSION ESTABLISHED! Proceeding with auth flow...');
            clearSafetyTimeout();
            clearHashFromUrl();
            await handleSuccessfulAuth(sessionData.session);
            return;
          }

          // Hash token existed but no session - try setSession as fallback
          console.log('⚠️ getSession() did not return session, trying setSession as fallback...');
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken) {
            const { data: setSessionData, error: setSessionError } = await supabaseClient.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });

            console.log('📦 setSession RESULT:', {
              hasSession: !!setSessionData?.session,
              hasUser: !!setSessionData?.session?.user,
              error: setSessionError?.message
            });

            if (setSessionError) {
              console.error('❌ setSession FAILED:', setSessionError.message);
              clearSafetyTimeout();
              clearHashFromUrl();
              router.replace(`/?error=${encodeURIComponent(setSessionError.message)}`);
              return;
            }

            if (setSessionData?.session?.user) {
              console.log('✅ setSession SUCCESSFUL! Proceeding with auth flow...');
              clearSafetyTimeout();
              clearHashFromUrl();
              await handleSuccessfulAuth(setSessionData.session);
              return;
            }
          }

          // Hash tokens existed but couldn't establish session
          console.error('❌ Could not establish session from hash tokens');
          clearSafetyTimeout();
          clearHashFromUrl();
          router.replace('/?error=hash_token_failed');
          return;
        }

        // === FALLBACK: No ?code= and no #access_token= ===
        console.log('⚠️ NO ?code= AND NO #access_token= - checking for existing session...');

        // Check for existing session
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

        console.log('📦 getSession() RESULT (existing check):', {
          hasSession: !!sessionData?.session,
          hasUser: !!sessionData?.session?.user,
          userId: sessionData?.session?.user?.id,
          userEmail: sessionData?.session?.user?.email,
          error: sessionError?.message
        });

        if (sessionData?.session?.user) {
          console.log('✅ Found existing session, proceeding with auth');
          clearSafetyTimeout();
          await handleSuccessfulAuth(sessionData.session);
          return;
        }

        // Check for error parameters in the URL
        const hashParams = new URLSearchParams(hash.substring(1));
        const hashError = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        const urlError = searchParams.get('error');

        console.log('🔍 Error parameter check:', {
          hashError,
          errorDescription,
          urlError
        });

        if (hashError || urlError) {
          const errorMsg = hashError || urlError;

          // Check if we have a valid session despite the error
          const { data: { session: existingSession } } = await supabaseClient.auth.getSession();

          if (existingSession &&
              errorMsg === 'access_denied' &&
              errorDescription && errorDescription.includes("Email link is invalid or has expired")) {

            console.warn('⚠️ Ignoring error because session exists:', errorMsg);
            clearSafetyTimeout();
            clearHashFromUrl();
            router.push('/?completeProfile=1');
            return;
          }

          // Special handling: expired/invalid magic link without a session
          if (
            errorMsg === 'access_denied' &&
            errorDescription && errorDescription.includes('Email link is invalid or has expired')
          ) {
            console.warn('⚠️ Magic link is invalid/expired.');
            clearSafetyTimeout();
            clearHashFromUrl();
            router.replace('/?magic_link_expired=1');
            return;
          }

          // Genuine error
          console.error('❌ Auth error detected:', errorMsg, errorDescription);
          clearSafetyTimeout();
          clearHashFromUrl();
          router.replace(`/?error=${encodeURIComponent(errorMsg || 'auth_failed')}`);
          return;
        }

        // NO CODE, NO TOKENS, NO ERROR - redirect with missing_code error
        console.error('❌ NO ?code= OR #access_token= FOUND - cannot complete auth callback');
        console.log('🔍 Final URL state:', {
          fullUrl: window.location.href,
          search: window.location.search,
          hash: window.location.hash
        });

        clearSafetyTimeout();
        router.replace('/?error=missing_code');

      } catch (error) {
        console.error('❌ UNEXPECTED ERROR during auth callback:', error);
        clearSafetyTimeout();
        const errorMessage = error instanceof Error ? error.message : 'unexpected';
        router.replace(`/?error=${encodeURIComponent(errorMessage)}`);
      }
    }

    handleAuthCallback();

    // Cleanup timeout on unmount
    return () => {
      clearSafetyTimeout();
    };
  }, [router]);

  // Show a simple loading screen while processing
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div
        className="text-center"
        style={{
          color: '#00FFFF',
          textShadow: '0 0 8px rgba(0,255,255,0.6)'
        }}
      >
        <div className="mb-4 text-lg font-medium">
          Entering the Heartverse...
        </div>
        <div className="animate-pulse text-sm">
          Processing authentication
        </div>
      </div>
    </div>
  );
}
