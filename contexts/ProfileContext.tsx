"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  element: string | null;
  heartcoin_balance: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfileNameAndElement: (displayName: string, element: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setProfile(null);
        return;
      }

      // Fetch profile from database - only read, never insert
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, email, display_name, element, heartcoin_balance, created_at, updated_at"
        )
        .eq("id", user.id)
        .maybeSingle(); // use maybeSingle to avoid throwing on 0 rows

      if (error) {
        console.error("Error fetching profile:", error.message, error);
        setProfile(null);
        return;
      }

      if (!data) {
        // No profile row yet for this user - wait for trigger to create it
        setProfile(null);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const updateProfileNameAndElement = async (
    displayName: string,
    element: string
  ) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          element,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating profile with name and element:", error.message, error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in updateProfileNameAndElement:', error);
    }
  };

  // Fetch profile when user changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchProfile();
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Initial fetch
    fetchProfile();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: ProfileContextType = {
    profile,
    loading,
    refreshProfile,
    updateProfileNameAndElement,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}