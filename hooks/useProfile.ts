"use client";

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  element: string | null;
  has_completed_onboarding: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface UseProfileReturn {
  user: any | null;
  profile: Profile | null;
  isLoading: boolean;
  needsOnboarding: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  completeOnboarding: (displayName: string) => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine if user needs onboarding based on profile state
  const needsOnboarding = Boolean(
    user && 
    profile && 
    (!profile.has_completed_onboarding || !profile.display_name || profile.display_name.trim() === '')
  );

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current session
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        setError(sessionError.message);
        return;
      }

      const currentUser = session?.user;
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        return;
      }

      // Fetch profile with new onboarding field
      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, email, phone, display_name, element, has_completed_onboarding, created_at, updated_at')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setError(profileError.message);
        setProfile(null);
        return;
      }

      if (!profileData) {
        // No profile exists yet - wait for trigger to create it or create manually
        try {
          const { data: newProfile, error: createError } = await supabaseClient
            .from('profiles')
            .insert({
              id: currentUser.id,
              email: currentUser.email || null,
              display_name: null,
              element: null,
              has_completed_onboarding: false
            })
            .select('id, email, phone, display_name, element, has_completed_onboarding, created_at, updated_at')
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            setError(createError.message);
            setProfile(null);
          } else {
            setProfile(newProfile);
          }
        } catch (createErr) {
          console.error('Failed to create profile:', createErr);
          setError('Failed to create profile');
          setProfile(null);
        }
      } else {
        setProfile(profileData);
      }

    } catch (err) {
      console.error('Error in fetchProfile:', err);
      setError('Failed to load profile');
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) {
      throw new Error('No user or profile to update');
    }

    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select('id, email, phone, display_name, element, has_completed_onboarding, created_at, updated_at')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setProfile(data);
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  const completeOnboarding = async (displayName: string) => {
    if (!user || !profile) {
      throw new Error('No user or profile to update');
    }

    try {
      await updateProfile({
        display_name: displayName.trim(),
        has_completed_onboarding: true
      });
    } catch (err) {
      console.error('Error completing onboarding:', err);
      throw err;
    }
  };

  // Set up auth state listener and initial fetch
  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchProfile();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setError(null);
          setIsLoading(false);
        }
      }
    );

    // Initial fetch
    fetchProfile();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    isLoading,
    needsOnboarding,
    error,
    refreshProfile,
    updateProfile,
    completeOnboarding
  };
}