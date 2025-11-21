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
    const checkUserProfile = async () => {
      try {
        // Check if this is a welcome redirect from email link
        const isWelcome = searchParams.get('welcome') === '1';
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          return;
        }

        // If no session, user is not logged in
        if (!session?.user) {
          return;
        }

        // If this is a welcome redirect, show the name prompt immediately
        if (isWelcome) {
          console.log('🎯 Welcome redirect detected, showing name prompt');
          openNamePrompt();
          return;
        }

        // Otherwise, check if user needs to set display name
        // Query user profile
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id, display_name')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          // If profile doesn't exist yet, create it and show name prompt
          if (profileError.code === 'PGRST116') {
            console.log('📝 Profile not found, creating new profile and showing name prompt');
            try {
              const { error: insertError } = await supabaseClient
                .from('profiles')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  display_name: null,
                  heartcoin_balance: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

              if (insertError) {
                console.error('Error creating profile:', insertError);
                return;
              }

              openNamePrompt();
              return;
            } catch (createError) {
              console.error('Failed to create profile:', createError);
              return;
            }
          }
          
          console.error('Error fetching profile:', profileError);
          return;
        }

        // If display_name is null or blank, open name prompt
        if (!profile?.display_name || profile.display_name.trim() === '') {
          openNamePrompt();
        }

      } catch (error) {
        console.error('Unexpected error in NamePromptOnLogin:', error);
      }
    };

    checkUserProfile();
  }, [openNamePrompt, searchParams]);

  // This component renders nothing - it just handles the logic
  return null;
}