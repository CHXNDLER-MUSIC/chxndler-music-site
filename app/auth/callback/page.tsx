"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        console.log('🚨 AUTH CALLBACK PAGE HIT! 🚨');
        console.log('🚨 CURRENT URL:', window.location.href);

        // Parse the URL parameters first
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        
        console.log('🔍 Search params:', window.location.search);
        console.log('🔍 Auth code found:', !!code);
        console.log('🔍 Hash params:', window.location.hash);
        
        let data, error;
        
        // Try Supabase's built-in session detection first (recommended)
        console.log('🔄 Trying Supabase built-in session detection...');
        
        // Give Supabase a moment to process the URL and establish the session
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const result = await supabaseClient.auth.getSession();
        data = result.data;
        error = result.error;
        
        console.log('🔍 Built-in session result:', {
          hasSession: !!data?.session,
          hasUser: !!data?.user,
          userId: data?.user?.id,
          error: error?.message
        });
        
        // Fallback: manually parse tokens if built-in detection fails
        if (!data?.session) {
          console.log('🔄 Built-in detection failed, trying manual token parsing...');
          
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          console.log('🔍 Hash token analysis:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            fullHash: window.location.hash
          });
          
          if (accessToken) {
            console.log('🔄 Found tokens in hash, setting session manually...');
            const manualResult = await supabaseClient.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            data = manualResult.data;
            error = manualResult.error;
            
            console.log('🔍 Manual session result:', {
              hasSession: !!data?.session,
              hasUser: !!data?.user,
              userId: data?.user?.id,
              error: error?.message
            });
          }
        }

        if (error) {
          console.error('Auth error:', error.message);
          
          // Check for specific error types
          if (error.message.includes('expired') || error.message.includes('invalid')) {
            console.error('Auth link expired or invalid');
            router.replace('/?error=link_expired');
            return;
          }
          
          // Check hash for error parameters (OAuth errors)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const hashError = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');

          if (hashError) {
            console.error('Auth error from hash:', hashError, errorDescription);
            router.replace('/?error=auth_failed');
            return;
          }
          
          router.replace('/?error=auth_failed');
          return;
        }

        if (!data?.session || !data?.user) {
          console.warn('No session or user data on first attempt, retrying...');
          
          // Wait a moment and try again - sometimes session needs time to establish
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const retryResult = await supabaseClient.auth.getSession();
          
          console.log('🔄 Retry session result:', {
            hasSession: !!retryResult.data?.session,
            hasUser: !!retryResult.data?.user,
            userId: retryResult.data?.user?.id,
            error: retryResult.error?.message
          });
          
          if (retryResult.data?.session && retryResult.data?.user) {
            data = retryResult.data;
            error = retryResult.error;
          } else {
            console.error('No session or user data received after retry');
            router.replace('/?error=no_session');
            return;
          }
        }
        
        console.log('🎉 AUTH SUCCESS! User:', data.user.id, 'Email:', data.user.email);
        
        // Check if this is coming from an email confirmation link
        // With implicit flow, check both URL params and hash params
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
          userEmail: data.user.email,
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
      } catch (error) {
        console.error('Unexpected error during auth callback:', error);
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