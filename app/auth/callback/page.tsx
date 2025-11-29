"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  const handleSuccessfulAuth = async (session: any) => {
    console.log('🎉 AUTH SUCCESS! User:', session.user.id, 'Email:', session.user.email);
    console.log('🔍 Session details:', JSON.stringify(session, null, 2));

    // Ensure a profile exists; if none, create a minimal one
    let needsName = false;
    try {
      const { data: existing, status } = await supabaseClient
        .from('profiles')
        .select('id, name, email')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!existing || status === 406) {
        // Create a bare profile row
        await supabaseClient
          .from('profiles')
          .insert({ id: session.user.id, email: session.user.email || null, name: null })
          .throwOnError();
        needsName = true;
      } else {
        needsName = !existing.name || existing.name.trim() === '';
      }
    } catch (e) {
      console.warn('⚠️ Profile fetch/create failed; defaulting to needsName flow if uncertain:', e);
      needsName = true;
    }

    // Redirect back to cockpit with an explicit flag to show the name prompt once
    if (needsName) {
      console.log('🚀 REDIRECTING: User needs name, going to /?completeProfile=1');
      router.push('/?completeProfile=1');
      return;
    }

    // Otherwise, proceed to normal welcome path for returning users
    console.log('🏠 REDIRECTING: User has profile, going to /?welcome=1');
    router.push('/?welcome=1');
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    async function handleAuthCallback() {
      try {
        console.log('🚨 AUTH CALLBACK PAGE HIT! 🚨');
        console.log('🚨 CURRENT URL:', window.location.href);

        // Set a safety timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.error('⏰ AUTH CALLBACK TIMEOUT - redirecting to home with error');
          router.replace('/?error=timeout');
        }, 10000); // 10 second timeout

        // First, try to let Supabase auto-detect the session from URL
        console.log('🔄 Attempting to get current session...');
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        
        console.log('🔍 Initial session check:', {
          hasSession: !!sessionData?.session,
          hasUser: !!sessionData?.session?.user,
          userId: sessionData?.session?.user?.id,
          userEmail: sessionData?.session?.user?.email,
          error: sessionError?.message
        });

        // If we have a session, use it
        if (sessionData?.session?.user) {
          console.log('✅ Found existing session, proceeding with auth');
          clearTimeout(timeoutId);
          await handleSuccessfulAuth(sessionData.session);
          return;
        }

        // If no session, try to exchange OAuth code or parse tokens from URL hash manually
        console.log('🔄 No session found, checking URL for tokens/code...');
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const oauthCode = searchParams.get('code');
        
        console.log('🔍 URL token/code check:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasOAuthCode: !!oauthCode,
          fullHash: window.location.hash,
          fullSearch: window.location.search
        });

        // Handle OAuth code flow (e.g., Google)
        if (oauthCode) {
          console.log('🔄 Found OAuth code, exchanging for session...');
          const { data: exchangeData, error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(oauthCode);

          if (exchangeError) {
            console.error('❌ Error exchanging code for session:', exchangeError);
          } else if (exchangeData?.session?.user) {
            console.log('✅ Successfully exchanged code for session');
            clearTimeout(timeoutId);
            await handleSuccessfulAuth(exchangeData.session);
            return;
          }
        }

        if (accessToken) {
          console.log('🔄 Found tokens in URL, setting session...');
          const { data: setSessionData, error: setSessionError } = await supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (setSessionError) {
            console.error('❌ Error setting session:', setSessionError);
          } else if (setSessionData?.session?.user) {
            console.log('✅ Successfully set session from URL tokens');
            clearTimeout(timeoutId);
            await handleSuccessfulAuth(setSessionData.session);
            return;
          }
        }

        // Check for error parameters in the URL
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
          
          // Enhanced error handling: Check if we have a valid session despite the error
          const { data: { session: existingSession } } = await supabaseClient.auth.getSession();
          
          if (existingSession && 
              errorMsg === 'access_denied' && 
              errorDescription && errorDescription.includes("Email link is invalid or has expired")) {
            
            // We have a valid session despite the expired link error - treat as success
            console.warn('⚠️ Ignoring Supabase auth error because a session already exists:', errorMsg, errorDescription);
            
            // Continue with normal success flow based on auth type
            const authType = hashParams.get("type");
            // Fallback: if we had a session despite an error, conservatively send to completeProfile
            clearTimeout(timeoutId);
            router.push('/?completeProfile=1');
            return;
          }

          // Special handling: expired/invalid magic link without a session
          if (
            errorMsg === 'access_denied' &&
            errorDescription && errorDescription.includes('Email link is invalid or has expired')
          ) {
            console.warn('⚠️ Magic link is invalid/expired. Guiding user to sign in again.');
            clearTimeout(timeoutId);
            router.replace('/?magic_link_expired=1');
            return;
          }
          
          // No valid session exists, treat as genuine error
          console.error('❌ Auth error detected:', errorMsg, errorDescription);
          clearTimeout(timeoutId);
          router.replace(`/?error=auth_failed&details=${encodeURIComponent(errorMsg)}`);
          return;
        }

        // As a final safeguard, wait briefly for any late session detection, then re-check
        await new Promise((r) => setTimeout(r, 200));
        const { data: finalCheck } = await supabaseClient.auth.getSession();
        if (finalCheck?.session?.user) {
          console.log('✅ Session appeared after brief wait');
          clearTimeout(timeoutId);
          await handleSuccessfulAuth(finalCheck.session);
          return;
        }

        // If we get here, no auth methods worked
        console.error('❌ All authentication methods failed - no session or tokens found');
        console.log('🔍 Final debug info:', {
          fullUrl: window.location.href,
          hash: window.location.hash,
          search: window.location.search,
          sessionError: sessionError?.message
        });
        
        clearTimeout(timeoutId);
        router.replace('/?error=no_session');
      } catch (error) {
        console.error('❌ Unexpected error during auth callback:', error);
        clearTimeout(timeoutId);
        router.replace('/?error=unexpected');
      }
    }

    handleAuthCallback();

    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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
