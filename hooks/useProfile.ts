"use client";

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  element: string | null;
  profile_complete: boolean;
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
    (!profile.profile_complete || !profile.name || profile.name.trim() === '')
  );

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current session
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', {
          message: sessionError?.message,
          status: sessionError?.status,
          fullError: sessionError
        });
        setError(sessionError.message || 'Session error');
        return;
      }

      const currentUser = session?.user;
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        return;
      }

      // Fetch profile using the correct column names
      let { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, email, phone, name, element, profile_complete, created_at, updated_at')
        .eq('id', currentUser.id)
        .maybeSingle();

      // The profile should exist with the correct columns, no fallback needed

      if (profileError) {
        console.error('Error fetching profile:', {
          message: profileError?.message,
          code: profileError?.code,
          details: profileError?.details,
          hint: profileError?.hint,
          fullError: profileError
        });
        const errorMessage = profileError?.message || 'Failed to load profile data';
        setError(errorMessage);
        setProfile(null);
        return;
      }

      if (!profileData) {
        // No profile exists yet - the ProfileProvider handles profile creation via triggers
        // Just set profile to null and let the user complete onboarding
        setProfile(null);
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
      // Filter out has_completed_onboarding from updates if column doesn't exist
      const updateData = { ...updates, updated_at: new Date().toISOString() };
      
      let { data, error } = await supabaseClient
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select('id, email, phone, name, element, profile_complete, created_at, updated_at')
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
    if (!user) {
      throw new Error('No user to update');
    }

    try {
      await updateProfile({
        name: displayName.trim(),
        profile_complete: true
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