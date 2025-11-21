"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { useUIStore } from '@/store/useUIStore';

interface Profile {
  id: string;
  display_name: string | null;
}

export default function NamePromptOnLogin() {
  const openNamePrompt = useUIStore(state => state.openNamePrompt);
  const searchParams = useSearchParams();

  useEffect(() => {
    console.log('🚀🚀🚀 NamePromptOnLogin useEffect triggered!');
    
    const checkUserProfile = async () => {
      try {
        // Check if this is an email confirmation redirect (only then show name prompt)
        const isEmailConfirmed = searchParams.get('email_confirmed') === '1';
        const isGeneralWelcome = searchParams.get('welcome') === '1';
        
        console.log('🚀 NamePromptOnLogin - Component executing!');
        console.log('🔍 NamePromptOnLogin - URL params check:', {
          currentUrl: window.location.href,
          isEmailConfirmed,
          isGeneralWelcome,
          allParams: Object.fromEntries(searchParams),
          searchParamsString: searchParams.toString()
        });
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          return;
        }

        // If no session, user is not logged in
        if (!session?.user) {
          console.log('🚫 No session found, not showing name prompt');
          console.log('🔍 Session details:', { session, sessionError });
          return;
        }

        console.log('✅ Session found for user:', session.user.email);

        // Only show name prompt for email confirmation, not general welcome
        if (isEmailConfirmed) {
          console.log('🎯 EMAIL CONFIRMED DETECTED! Opening name prompt modal');
          console.log('🔔 About to call openNamePrompt()');
          openNamePrompt();
          return;
        }
        
        // For general welcome (OAuth, etc.), don't auto-show name prompt
        if (isGeneralWelcome) {
          console.log('🎯 General welcome redirect - checking profile without auto-prompting');
          // Continue to profile check below, but don't auto-show prompt
        }

        // Only check profile and auto-prompt if this is not a first-time signup
        // (we want users to only see the name prompt after confirming their email)
        if (!isGeneralWelcome || isEmailConfirmed) {
          // Query user profile
          const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, display_name')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            // If profile doesn't exist yet, only show name prompt if email is confirmed
            if (profileError.code === 'PGRST116' && isEmailConfirmed) {
              console.log('📝 Profile not found after email confirmation, showing name prompt');
              openNamePrompt();
              return;
            }
            
            if (profileError.code !== 'PGRST116') {
              console.error('Error fetching profile:', profileError);
            }
            return;
          }

          // If display_name is null or blank, only prompt if email is confirmed
          if ((!profile?.display_name || profile.display_name.trim() === '') && isEmailConfirmed) {
            console.log('📝 No display name after email confirmation, showing name prompt');
            openNamePrompt();
          }
        }

      } catch (error) {
        console.error('❌ Unexpected error in NamePromptOnLogin:', error);
        console.error('❌ Error details:', { error, searchParams: searchParams.toString() });
      }
    };

    checkUserProfile();
  }, [openNamePrompt, searchParams]);

  // This component renders nothing - it just handles the logic
  return null;
}