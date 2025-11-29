"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUIStore } from '@/store/useUIStore';

// This lightweight gate only opens the name prompt when completeProfile=1 is present.
// It does NOT fetch sessions or profiles to avoid any flash on first load.
export default function NamePromptOnLogin() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const openNamePromptFromAuth = useUIStore(state => state.openNamePromptFromAuth);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Check for completeProfile parameter in multiple ways
    const shouldComplete = searchParams.get('completeProfile') === '1';
    const urlHasCompleteProfile = typeof window !== 'undefined' && window.location.search.includes('completeProfile=1');
    
    // ALSO check for welcome parameter - this happens when user clicks magic link but is already logged in
    const isWelcomeFromMagicLink = searchParams.get('welcome') === '1';
    const urlHasWelcome = typeof window !== 'undefined' && window.location.search.includes('welcome=1');
    
    console.log('🔍 NamePromptOnLogin check:', { 
      mounted, 
      shouldComplete, 
      urlHasCompleteProfile,
      isWelcomeFromMagicLink,
      urlHasWelcome,
      searchParamsString: searchParams.toString(),
      url: typeof window !== 'undefined' ? window.location.href : 'server-side'
    });
    
    if (!shouldComplete && !urlHasCompleteProfile && !isWelcomeFromMagicLink && !urlHasWelcome) {
      console.log('🚫 No completeProfile or welcome parameter found, not opening modal');
      return;
    }

    console.log('✅ Opening name prompt from auth');
    // Open prompt exactly once per arrival - use a small delay to ensure all components are ready
    const timeoutId = setTimeout(() => {
      try { 
        console.log('🔄 Calling openNamePromptFromAuth...');
        openNamePromptFromAuth(); 
        console.log('✅ openNamePromptFromAuth called successfully');
      } catch (e) {
        console.error('❌ Failed to open name prompt from auth:', e);
      }
    }, 100); // Small delay to ensure components are ready

    // Clean up URL after a longer delay
    const cleanupTimeoutId = setTimeout(() => {
      try {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('completeProfile');
        const newUrl = params.toString() ? `/?${params.toString()}` : '/';
        console.log('🧹 Cleaning up URL from', window.location.href, 'to', newUrl);
        router.replace(newUrl);
      } catch (e) {
        console.warn('Failed to clean up URL parameters:', e);
      }
    }, 2000); // Increased delay so you can see the modal

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(cleanupTimeoutId);
    };
  }, [mounted, searchParams, openNamePromptFromAuth, router]);

  // Temporary debug button - remove after testing
  if (typeof window !== 'undefined' && window.location.search.includes('debug=1')) {
    return (
      <button 
        onClick={() => {
          console.log('🔧 Manual debug trigger');
          openNamePromptFromAuth();
        }}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 999999,
          background: 'red',
          color: 'white',
          padding: '10px',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        DEBUG: Open Modal
      </button>
    );
  }

  return null;
}
