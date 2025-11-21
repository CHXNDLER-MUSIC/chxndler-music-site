"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { useUIStore } from '@/store/useUIStore';

export default function NamePromptOnLogin() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const openNamePrompt = useUIStore(state => state.openNamePrompt);

  useEffect(() => {
    const checkUserProfile = async () => {
      console.log('🔍 NamePromptOnLogin - URL params:', {
        currentUrl: window.location.href,
        allParams: Object.fromEntries(searchParams),
        searchParamsString: searchParams.toString()
      });

      const finishProfile = searchParams.get('finish_profile') === '1';
      
      console.log('🔍 finish_profile flag present:', finishProfile);
      
      if (!finishProfile) {
        console.log('🚫 finish_profile flag missing, not showing name prompt');
        return;
      }

      // Get the current authenticated user
      const { data: userData } = await supabaseClient.auth.getUser();
      
      if (!userData?.user) {
        console.log('🚫 No user found, not showing name prompt');
        return;
      }

      setUser(userData.user);
      console.log('✅ User found and finish_profile=1, checking profile...');

      const { data: profile, error, status } = await supabaseClient
        .from("profiles")
        .select("id, display_name")
        .eq("id", userData.user.id)
        .maybeSingle();

      console.log('🔍 Supabase query status:', status);
      console.log('🔍 Profile data:', profile);
      console.log('🔍 Query error:', error);

      if (status === 406 || !profile) {
        console.log('📝 No profile row found (status 406 or null profile), opening name prompt');
        openNamePrompt();
        return;
      }

      if (!profile.display_name || profile.display_name.trim() === '') {
        console.log('📝 Profile exists but display_name is null/empty, opening name prompt');
        openNamePrompt();
        return;
      }

      console.log('✅ Profile exists with display_name, not opening prompt');
    };

    checkUserProfile();
  }, [searchParams, openNamePrompt]);

  return null;
}