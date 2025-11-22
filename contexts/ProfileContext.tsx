"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabaseClient } from "@/lib/supabaseClient";

// Types for user owned cards and badges
type OwnedCardRow = {
  id: string;
  card_id: string;
  acquired_at: string;
  cards: {
    id: string;
    card_name: string;
    element: string;
    rarity: string;
  };
};

type OwnedBadgeRow = {
  id: string;
  badge_id: string;
  awarded_at: string;
  badges: {
    id: string;
    badge_name: string;
    description: string | null;
    icon_url: string | null;
  };
};

const ELEMENT_LABEL_TO_CODE: Record<string, "water" | "heart" | "lightning" | "darkness"> = {
  "💖 Heart": "heart",
  "🌊 Water": "water",
  "⚡ Lightning": "lightning",
  "🌑 Darkness": "darkness",
  "Heart": "heart",
  "Water": "water",
  "Lightning": "lightning",
  "Darkness": "darkness",
  "heart": "heart",
  "water": "water",
  "lightning": "lightning",
  "darkness": "darkness",
};

interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  element: string | null;
  journey: string | null;
  heartcoin_balance: number | null;
  heartcoin_total: number | null;
  profile_complete: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  cards: OwnedCardRow[];
  badges: OwnedBadgeRow[];
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfileNameAndElement: (name: string, elementLabel: string) => Promise<void>;
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
          "id, email, phone, name, element, journey, heartcoin_balance, heartcoin_total, profile_complete, created_at, updated_at"
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

      // Fetch user cards and badges in parallel
      const [{ data: cardRows, error: cardError }, { data: badgeRows, error: badgeError }] =
        await Promise.all([
          supabaseClient
            .from("user_cards")
            .select(`
              id,
              card_id,
              acquired_at,
              cards (
                id,
                card_name,
                element,
                rarity
              )
            `)
            .eq("user_id", user.id),
          supabaseClient
            .from("user_badges")
            .select(`
              id,
              badge_id,
              earned_at,
              badges (
                id,
                badge_name,
                description,
                icon_url
              )
            `)
            .eq("user_id", user.id),
        ]);

      if (cardError) {
        console.error("Error loading user_cards", cardError);
      }

      if (badgeError) {
        console.error("Error loading user_badges", badgeError);
      }

      // Map database columns to interface format
      const mappedProfile: Profile = {
        id: data.id,
        email: data.email,
        phone: data.phone,
        name: data.name,
        element: data.element,
        journey: data.journey,
        heartcoin_balance: data.heartcoin_balance ?? 0,
        heartcoin_total: data.heartcoin_total ?? 0,
        profile_complete: data.profile_complete ?? !!(data.name && data.element),
        created_at: data.created_at,
        updated_at: data.updated_at,
        cards: cardRows ?? [],
        badges: badgeRows ?? [],
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
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
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
        // Map the updated data back to Profile interface, preserving existing cards and badges
        const mappedProfile: Profile = {
          id: data.id,
          email: data.email,
          phone: data.phone,
          name: data.name,
          element: data.element,
          journey: data.journey,
          heartcoin_balance: data.heartcoin_balance ?? 0,
          heartcoin_total: data.heartcoin_total ?? 0,
          profile_complete: data.profile_complete ?? !!(data.name && data.element),
          created_at: data.created_at,
          updated_at: data.updated_at,
          cards: profile?.cards ?? [],
          badges: profile?.badges ?? [],
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
    elementLabel: string
  ) => {
    const elementCode = ELEMENT_LABEL_TO_CODE[elementLabel] ?? ELEMENT_LABEL_TO_CODE[elementLabel.toLowerCase()];

    if (!elementCode) {
      console.error("Invalid element label passed to updateProfileNameAndElement:", elementLabel);
      return;
    }

    await updateProfile({
      name,
      element: elementCode,
      profile_complete: !!(name && elementCode),
    });
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
