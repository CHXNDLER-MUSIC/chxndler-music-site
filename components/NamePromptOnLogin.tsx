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
    // Only react when explicit completeProfile flag is true
    const shouldComplete = searchParams.get('completeProfile') === '1';
    console.log('🔍 NamePromptOnLogin (Chrome debug):', { 
      shouldComplete, 
      mounted, 
      userAgent: navigator.userAgent,
      searchParams: searchParams.toString() 
    });
    
    if (!shouldComplete) return;

    // Open prompt exactly once per arrival
    try { 
      console.log('🚀 Opening name prompt (Chrome debug)');
      openNamePromptFromAuth(); 
      
      // Clean up URL after a longer delay for Chrome compatibility
      setTimeout(() => {
        try {
          const params = new URLSearchParams(searchParams.toString());
          params.delete('completeProfile');
          const newUrl = params.toString() ? `/?${params.toString()}` : '/';
          console.log('🧹 Cleaning up URL (Chrome debug):', newUrl);
          router.replace(newUrl);
        } catch (e) {
          console.warn('Failed to clean up URL parameters:', e);
        }
      }, 300); // Increased delay for Chrome
    } catch (e) {
      console.warn('Failed to open name prompt from auth:', e);
    }
  }, [mounted, searchParams, openNamePromptFromAuth, router]);

  return null;
}
