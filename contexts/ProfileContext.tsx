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
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError.message, userError);
      }

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

      setProfile(data as Profile);
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

  const updateProfileNameAndElement = async (
    name: string,
    element: string
  ) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError.message, userError);
        return;
      }

      if (!user) return;

      const { data, error } = await supabaseClient
        .from("profiles")
        .update({
          name,
          element,
          updated_at: new Date().toISOString(),
          // profile_complete and journey are handled in triggers
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error(
          "Error updating profile with name and element:",
          error.message,
          error
        );
        return;
      }

      setProfile(data as Profile);
    } catch (error) {
      console.error("Error in updateProfileNameAndElement:", error);
    }
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
