"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUIStore } from '@/store/useUIStore';
import { debug } from '@/lib/logger';

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

  // Memoize parameter checks to prevent unnecessary re-calculations
  const parameterChecks = useMemo(() => {
    const shouldComplete = searchParams.get('completeProfile') === '1';
    const urlHasCompleteProfile = typeof window !== 'undefined' && window.location.search.includes('completeProfile=1');
    const isWelcomeFromMagicLink = searchParams.get('welcome') === '1';
    const urlHasWelcome = typeof window !== 'undefined' && window.location.search.includes('welcome=1');
    // Also check for profileSetup parameter (used by magic link flow)
    const isProfileSetup = searchParams.get('profileSetup') === '1';
    const urlHasProfileSetup = typeof window !== 'undefined' && window.location.search.includes('profileSetup=1');

    return {
      shouldComplete,
      urlHasCompleteProfile,
      isWelcomeFromMagicLink,
      urlHasWelcome,
      isProfileSetup,
      urlHasProfileSetup,
      shouldOpen: shouldComplete || urlHasCompleteProfile || isWelcomeFromMagicLink || urlHasWelcome || isProfileSetup || urlHasProfileSetup
    };
  }, [searchParams]);

  // Memoize debug data to prevent object creation on every render
  const debugData = useMemo(() => ({
    mounted, 
    ...parameterChecks,
    searchParamsString: searchParams.toString(),
    url: typeof window !== 'undefined' ? window.location.href : 'server-side'
  }), [mounted, parameterChecks, searchParams]);

  // Only log when debug data actually changes
  useEffect(() => {
    debug('NamePromptOnLogin check:', debugData);
  }, [debugData]);

  const handleOpenPrompt = useCallback(() => {
    try {
      debug('Calling openNamePromptFromAuth...');
      openNamePromptFromAuth();
      debug('openNamePromptFromAuth called successfully');
    } catch (e) {
      console.error('Failed to open name prompt from auth:', e);
    }
  }, [openNamePromptFromAuth]);

  const handleCleanupURL = useCallback(() => {
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('completeProfile');
      params.delete('profileSetup');
      params.delete('welcome');
      const newUrl = params.toString() ? `/?${params.toString()}` : '/';
      debug('Cleaning up URL from', window.location.href, 'to', newUrl);
      router.replace(newUrl);
    } catch (e) {
      console.error('Failed to clean up URL parameters:', e);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!mounted) return;

    if (!parameterChecks.shouldOpen) {
      debug('No completeProfile, profileSetup, or welcome parameter found');
      return;
    }

    debug('Magic link detected - will show name prompt after START button warp');

    // DO NOT auto-open the name prompt here - let the user click START first
    // The handleStartClick in DashboardApp will show the name prompt AFTER the warp animation
    // This ensures the flow: magic link → START button → warp → name prompt

    // Clean up URL after a delay
    const cleanupTimeoutId = setTimeout(handleCleanupURL, 2000);

    return () => {
      clearTimeout(cleanupTimeoutId);
    };
  }, [mounted, parameterChecks.shouldOpen, handleCleanupURL]);

  // Temporary debug button - remove after testing
  if (typeof window !== 'undefined' && window.location.search.includes('debug=1')) {
    return (
      <button
        onClick={() => {
          debug('Manual debug trigger');
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
