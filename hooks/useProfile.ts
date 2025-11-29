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
    (!profile.has_completed_onboarding || !profile.display_name || profile.display_name.trim() === '')
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

      // Fetch profile - try with onboarding field first, fallback if column doesn't exist
      let { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, email, phone, display_name, element, has_completed_onboarding, created_at, updated_at')
        .eq('id', currentUser.id)
        .maybeSingle();

      // If error suggests column doesn't exist, try without the onboarding field
      if (profileError && (
        profileError.message?.includes('has_completed_onboarding') || 
        profileError.code === 'PGRST116' ||
        profileError.message?.includes('column') ||
        profileError.message?.includes('does not exist')
      )) {
        const fallbackResult = await supabaseClient
          .from('profiles')
          .select('id, email, phone, display_name, element, created_at, updated_at')
          .eq('id', currentUser.id)
          .maybeSingle();
        profileData = fallbackResult.data;
        profileError = fallbackResult.error;
        
        // If we got data without the column, add the missing field with default value
        if (profileData && !profileError) {
          profileData = {
            ...profileData,
            has_completed_onboarding: Boolean(profileData.display_name && profileData.element)
          } as Profile;
        }
      }

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
        // No profile exists yet - wait for trigger to create it or create manually
        try {
          // Try to insert with onboarding field, fallback without it
          let insertData = {
            id: currentUser.id,
            email: currentUser.email || null,
            display_name: null,
            element: null
          };

          // Try with onboarding field first
          let { data: newProfile, error: createError } = await supabaseClient
            .from('profiles')
            .insert({
              ...insertData,
              has_completed_onboarding: false
            })
            .select('id, email, phone, display_name, element, has_completed_onboarding, created_at, updated_at')
            .single();

          // If error suggests column doesn't exist, try without onboarding field
          if (createError && (
            createError.message?.includes('has_completed_onboarding') || 
            createError.code === 'PGRST116' ||
            createError.message?.includes('column') ||
            createError.message?.includes('does not exist')
          )) {
            const fallbackResult = await supabaseClient
              .from('profiles')
              .insert(insertData)
              .select('id, email, phone, display_name, element, created_at, updated_at')
              .single();
            
            newProfile = fallbackResult.data;
            createError = fallbackResult.error;
            
            // Add missing field with default value
            if (newProfile && !createError) {
              newProfile = {
                ...newProfile,
                has_completed_onboarding: false
              } as Profile;
            }
          }

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
      // Filter out has_completed_onboarding from updates if column doesn't exist
      const updateData = { ...updates, updated_at: new Date().toISOString() };
      
      let { data, error } = await supabaseClient
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select('id, email, phone, display_name, element, has_completed_onboarding, created_at, updated_at')
        .single();

      // If error suggests column doesn't exist, try without onboarding field
      if (error && (
        error.message?.includes('has_completed_onboarding') || 
        error.code === 'PGRST116' ||
        error.message?.includes('column') ||
        error.message?.includes('does not exist')
      )) {
        // Remove has_completed_onboarding from update data if it exists
        const { has_completed_onboarding, ...updateDataWithoutOnboarding } = updateData;
        
        const fallbackResult = await supabaseClient
          .from('profiles')
          .update(updateDataWithoutOnboarding)
          .eq('id', user.id)
          .select('id, email, phone, display_name, element, created_at, updated_at')
          .single();
          
        data = fallbackResult.data;
        error = fallbackResult.error;
        
        // Add missing field with computed value
        if (data && !error) {
          data = {
            ...data,
            has_completed_onboarding: Boolean(data.display_name && data.element)
          } as Profile;
        }
      }

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