"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUIStore } from '@/store/useUIStore';

// This lightweight gate only opens the name prompt when completeProfile=1 is present.
// It does NOT fetch sessions or profiles to avoid any flash on first load.
export default function NamePromptOnLogin() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const openNamePromptFromAuth = useUIStore(state => state.openNamePromptFromAuth);

  useEffect(() => {
    // Only react when explicit completeProfile flag is true
    const shouldComplete = searchParams.get('completeProfile') === '1';
    
    if (!shouldComplete) return;

    // Open prompt exactly once per arrival
    try { 
      openNamePromptFromAuth(); 
      
      // Clean up URL after a short delay to allow modal state to settle
      setTimeout(() => {
        try {
          const params = new URLSearchParams(searchParams.toString());
          params.delete('completeProfile');
          const newUrl = params.toString() ? `/?${params.toString()}` : '/';
          router.replace(newUrl);
        } catch (e) {
          console.warn('Failed to clean up URL parameters:', e);
        }
      }, 100);
    } catch (e) {
      console.warn('Failed to open name prompt from auth:', e);
    }
  }, [searchParams, openNamePromptFromAuth, router]);

  return null;
}
