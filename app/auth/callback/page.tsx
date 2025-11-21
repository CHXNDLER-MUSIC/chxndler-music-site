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

        // Exchange the code for a session using the full URL
        const { data, error } = await supabaseClient.auth.exchangeCodeForSession(window.location.href);
        
        if (error) {
          console.error('Auth callback error:', error);
          router.replace('/?error=auth_failed');
          return;
        }

        if (!data.session || !data.user) {
          console.error('No session or user data received');
          router.replace('/?error=no_session');
          return;
        }

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