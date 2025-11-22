"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabaseClient } from "@/lib/supabaseClient";

interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  element: string | null;
  journey: string | null;
  heartcoin_balance: number | null;
  heartcoin_total: number | null;
  profile_complete: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfileNameAndElement: (name: string, element: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      // Prefer getSession to avoid noisy "Auth session missing" errors when logged out
      const {
        data: { session },
        error: sessionError,
      } = await supabaseClient.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError.message, sessionError);
      }

      const user = session?.user;
      if (!user) {
        setProfile(null);
        return;
      }

      // Read profile only; trigger is responsible for creation
      const { data, error } = await supabaseClient
        .from("profiles")
        .select(
          "id, email, name, element, journey, heartcoin_balance, heartcoin_total, profile_complete, created_at, updated_at"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error.message, error);
        setProfile(null);
        return;
      }

      if (!data) {
        // No profile row yet, wait for trigger to create it
        setProfile(null);
        return;
      }

      // Map database columns to interface format
      const mappedProfile: Profile = {
        id: data.id,
        email: data.email,
        name: data.name,
        element: data.element,
        journey: data.journey,
        heartcoin_balance: data.heartcoin_balance ?? 0,
        heartcoin_total: data.heartcoin_total ?? 0,
        profile_complete: data.profile_complete ?? !!(data.name && data.element),
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setProfile(mappedProfile);
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseClient.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError.message, sessionError);
        return;
      }

      const user = session?.user;
      if (!user) return;

      // Map interface fields to database columns  
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.element !== undefined) dbUpdates.element = updates.element;
      if (updates.journey !== undefined) dbUpdates.journey = updates.journey;
      if (updates.heartcoin_balance !== undefined) dbUpdates.heartcoin_balance = updates.heartcoin_balance;
      if (updates.heartcoin_total !== undefined) dbUpdates.heartcoin_total = updates.heartcoin_total;
      if (updates.profile_complete !== undefined) dbUpdates.profile_complete = updates.profile_complete;
      
      // Update the existing profile (no insert logic - trigger handles creation)
      const { data, error } = await supabaseClient
        .from("profiles")
        .update(dbUpdates)
        .eq("id", user.id)
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Error updating profile:", error.message, error);
        return;
      }

      if (data) {
        // Map the updated data back to Profile interface
        const mappedProfile: Profile = {
          id: data.id,
          email: data.email,
          name: data.name,
          element: data.element,
          journey: data.journey,
          heartcoin_balance: data.heartcoin_balance ?? 0,
          heartcoin_total: data.heartcoin_total ?? 0,
          profile_complete: data.profile_complete ?? !!(data.name && data.element),
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setProfile(mappedProfile);
      } else {
        console.warn("Profile update returned no data. Profile may not exist yet - waiting for trigger to create it.");
      }
    } catch (error) {
      console.error("Error in updateProfile:", error);
    }
  };

  const updateProfileNameAndElement = async (
    name: string,
    element: string
  ) => {
    await updateProfile({ name, element });
  };

  useEffect(() => {
    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Initial fetch on mount
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
    updateProfile,
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
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
