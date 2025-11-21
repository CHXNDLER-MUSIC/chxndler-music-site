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

        // Parse URL parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        // Try to get the tokens from either hash or query params
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
        const error = hashParams.get('error') || searchParams.get('error');
        const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

        if (error) {
          console.error('Auth error from URL:', error, errorDescription);
          router.replace('/?error=auth_failed');
          return;
        }

        if (!accessToken) {
          console.error('No access token found in URL');
          router.replace('/?error=no_token');
          return;
        }

        // Set the session using the tokens
        const { data, error: sessionError } = await supabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          router.replace('/?error=session_failed');
          return;
        }

        if (!data.session || !data.user) {
          console.error('No session or user data received');
          router.replace('/?error=no_session');
          return;
        }

        // Set the access token cookie for server-side API routes (if needed)
        const isProduction = window.location.protocol === 'https:';
        const cookieString = `sb-access-token=${accessToken}; path=/; max-age=3600; SameSite=Lax${isProduction ? '; Secure' : ''}`;
        document.cookie = cookieString;
        
        console.log('🎉 AUTH SUCCESS! User:', data.user.id, 'Email:', data.user.email);
        console.log('🎯 Redirecting to home with welcome flag');
        
        // Redirect to home page with welcome flag to trigger onboarding
        router.replace('/?welcome=1');
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