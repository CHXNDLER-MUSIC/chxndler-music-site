"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUIStore } from '@/store/useUIStore';

// This lightweight gate only opens the name prompt when completeProfile=1 is present.
// It does NOT fetch sessions or profiles to avoid any flash on first load.
export default function NamePromptOnLogin() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const openNamePrompt = useUIStore(state => state.openNamePrompt);

  useEffect(() => {
    // Only react when explicit completeProfile flag is true
    const shouldComplete = searchParams.get('completeProfile') === '1';
    if (!shouldComplete) return;

    // Open prompt exactly once per arrival, then clean up the URL
    try { openNamePrompt(); } catch {}
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('completeProfile');
      router.replace(`/?${params.toString()}`);
    } catch {}
  }, [searchParams, openNamePrompt, router]);

  return null;
}
