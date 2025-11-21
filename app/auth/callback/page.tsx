"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  const handleSuccessfulAuth = async (session: any) => {
    console.log('🎉 AUTH SUCCESS! User:', session.user.id, 'Email:', session.user.email);
    
    // Check if this is coming from an email confirmation link
    // With auto-detect flow, check both URL params and hash params
    const urlSearchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const urlType = urlSearchParams.get('type');
    const hashType = hashParams.get('type');
    const type = urlType || hashType;
    
    const isFromEmailLink = type === 'magiclink' || type === 'signup' || type === 'recovery';
    
    console.log('🔍 Auth type check:', {
      urlType,
      hashType,
      finalType: type,
      isFromEmailLink,
      hasTokenInHash: !!hashParams.get('access_token'),
      userEmail: session.user.email,
      fullUrl: window.location.href
    });
    
    if (isFromEmailLink) {
      console.log('🎯 EMAIL CONFIRMATION DETECTED! Redirecting with email_confirmed=1');
      console.log('🔔 This should trigger the name prompt modal');
      // This is from clicking email confirmation link - show name prompt
      router.replace('/?email_confirmed=1');
    } else {
      console.log('🎯 General auth success, redirecting with basic welcome flag');
      // This is from OAuth or other flow - basic welcome
      router.replace('/?welcome=1');
    }
  };

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        console.log('🚨 AUTH CALLBACK PAGE HIT! 🚨');
        console.log('🚨 CURRENT URL:', window.location.href);

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
          await handleSuccessfulAuth(sessionData.session);
          return;
        }

        // If no session, try to parse tokens from URL hash manually
        console.log('🔄 No session found, checking URL for tokens...');
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        console.log('🔍 URL token check:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          fullHash: window.location.hash
        });

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
            await handleSuccessfulAuth(setSessionData.session);
            return;
          }
        }

        // Check for error parameters in the URL
        const hashError = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        const urlParams = new URLSearchParams(window.location.search);
        const urlError = urlParams.get('error');
        
        console.log('🔍 Error parameter check:', {
          hashError,
          errorDescription,
          urlError
        });
        
        if (hashError || urlError) {
          const errorMsg = hashError || urlError;
          console.error('❌ Auth error detected:', errorMsg, errorDescription);
          router.replace(`/?error=auth_failed&details=${encodeURIComponent(errorMsg)}`);
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
        
        router.replace('/?error=no_session');
      } catch (error) {
        console.error('❌ Unexpected error during auth callback:', error);
        router.replace('/?error=unexpected');
      }
    }

    handleAuthCallback();
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