"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { ProfileTier } from "@/types/card";

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
    is_released?: boolean;
    min_tier?: string;
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
  tier: ProfileTier; // default "wanderer"
  has_seen_tour?: boolean | null; // for onboarding tour
  profile_image_url?: string | null; // for profile image selection
  daily_streak?: number | null; // daily streak counter
  streak_last_updated?: string | null; // last date streak was updated
  cards: OwnedCardRow[];
  badges: OwnedBadgeRow[];
  // Legacy fields for compatibility
  journey_tag?: string | null;
  tierName?: string | null;
  display_name?: string | null;
  username?: string | null;
}

interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  element: string;
  prompt_id: string | null;
  intention: string | null;
  reflection: string | null;
  intention_response: string | null;
  reflection_response: string | null;
  soul_star: string | null;
  created_at: string;
  updated_at: string;
}

interface DailyPrompts {
  id: string; // Add the daily prompt ID
  prompt_date: string;
  element: string;
  intention: {
    id: string;
    text: string;
    element: string;
    prompt_type: string;
  };
  reflection: {
    id: string;
    text: string;
    element: string;
    prompt_type: string;
  };
}

interface ProfileContextType {
  profile: Profile | null;
  user: any | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfileNameAndElement: (name: string, elementLabel: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
  savePhone: (phone: string) => Promise<void>;
  // Journal functionality
  journalEntries: JournalEntry[];
  loadJournalEntries: (userId: string) => Promise<void>;
  saveJournalEntry: (entry: Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<JournalEntry | null>;
  getDailyPrompts: () => Promise<DailyPrompts | null>;
  isJournalOpen: boolean;
  setIsJournalOpen: (open: boolean) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isJournalOpen, setIsJournalOpen] = useState(false);

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
      setUser(user);
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
                rarity,
                is_released,
                min_tier
              )
            `)
            .eq("user_id", user.id),
          supabaseClient
            .from("user_badges")
            .select(`
              id,
              badge_id,
              awarded_at,
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

      // Debug heartcoin data from database
      console.log('ProfileContext: Raw database profile data:', {
        id: data.id,
        name: data.name,
        heartcoin_balance: data.heartcoin_balance,
        heartcoin_total: data.heartcoin_total,
        dataType: typeof data.heartcoin_balance
      });

      // Map database columns to interface format
      const mappedProfile: Profile = {
        id: data.id,
        email: data.email,
        phone: data.phone,
        name: data.name,
        element: data.element,
        journey: data.journey,
        heartcoin_balance: (data.heartcoin_balance ?? 0),
        heartcoin_total: (data.heartcoin_total ?? 0),
        profile_complete: data.profile_complete ?? !!(data.name && data.element),
        created_at: data.created_at,
        updated_at: data.updated_at,
        tier: "wanderer" as ProfileTier,
        has_seen_tour: false,
        profile_image_url: null,
        daily_streak: 0,
        streak_last_updated: null,
        cards: cardRows ?? [],
        badges: badgeRows ?? [],
      };

      console.log('ProfileContext: Mapped profile HeartCoin balance:', mappedProfile.heartcoin_balance);

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
          heartcoin_balance: (data.heartcoin_balance ?? 0),
          heartcoin_total: (data.heartcoin_total ?? 0),
          profile_complete: data.profile_complete ?? !!(data.name && data.element),
          created_at: data.created_at,
          updated_at: data.updated_at,
          tier: "wanderer" as ProfileTier,
          has_seen_tour: false,
          profile_image_url: null,
          daily_streak: 0,
          streak_last_updated: null,
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

  const updateProfileName = async (name: string) => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseClient.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError.message, sessionError);
        throw new Error("Authentication required to update name");
      }

      const user = session?.user;
      if (!user) {
        throw new Error("You must be logged in to update your name");
      }

      if (!profile) {
        throw new Error("Profile not found. Please complete your registration first");
      }

      // Update the profile name
      const { data, error } = await supabaseClient
        .from("profiles")
        .update({ 
          name: name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id)
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Error updating profile name:", error.message, error);
        throw new Error("Failed to update name");
      }

      if (data) {
        // Update local state immediately
        setProfile(prev => prev ? { ...prev, name: name.trim() } : prev);
      }
    } catch (error) {
      console.error("Error in updateProfileName:", error);
      throw error;
    }
  };

  useEffect(() => {
    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('ProfileContext: Auth state changed:', { event, userId: session?.user?.id });
      
      if (session?.user) {
        console.log('ProfileContext: User session detected, fetching profile...');
        await fetchProfile();
        await loadJournalEntries(session.user.id);
      } else {
        setProfile(null);
        setUser(null);
        setJournalEntries([]);
        setLoading(false);
      }
    });

    // Listen for forced profile refresh events
    const handleProfileUpdate = async () => {
      console.log('Profile update event received, forcing refresh...');
      await fetchProfile();
    };

    window.addEventListener('auth:profile-updated', handleProfileUpdate);
    window.addEventListener('profile:force-refresh', handleProfileUpdate);

    // Initial fetch on mount
    fetchProfile();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('auth:profile-updated', handleProfileUpdate);
      window.removeEventListener('profile:force-refresh', handleProfileUpdate);
    };
  }, []);

  // Journal helper functions
  const loadJournalEntries = async (userId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('soul_journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });

      if (error) {
        console.error('Error loading journal entries:', error);
        return;
      }

      setJournalEntries(data || []);
    } catch (error) {
      console.error('Error in loadJournalEntries:', error);
    }
  };

  const saveJournalEntry = async (entry: Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<JournalEntry | null> => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseClient.auth.getSession();

      if (sessionError) {
        console.error('Error getting session:', sessionError.message);
        return null;
      }

      const user = session?.user;
      if (!user) {
        console.error('No user session found');
        return null;
      }

      const { data, error } = await supabaseClient
        .from('soul_journal_entries')
        .upsert(
          {
            user_id: user.id,
            entry_date: entry.entry_date,
            element: entry.element,
            prompt_id: entry.prompt_id,
            intention: entry.intention,
            reflection: entry.reflection,
            intention_response: entry.intention_response,
            reflection_response: entry.reflection_response,
            soul_star: entry.soul_star,
          },
          { 
            onConflict: 'user_id,entry_date,element',
            ignoreDuplicates: false 
          }
        )
        .select()
        .single();

      if (error) {
        console.error('Error saving journal entry:', error);
        return null;
      }

      // Update local state
      setJournalEntries(prev => {
        const filtered = prev.filter(e => e.entry_date !== data.entry_date || e.element !== data.element);
        return [data, ...filtered].sort((a, b) => 
          new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
        );
      });

      return data;
    } catch (error) {
      console.error('Error in saveJournalEntry:', error);
      return null;
    }
  };

  const getDailyPrompts = async (): Promise<DailyPrompts | null> => {
    try {
      const response = await fetch('/api/soulPrompt/daily');
      
      if (!response.ok) {
        // If database doesn't have entry, throw error so journal can show proper message
        const errorData = await response.json();
        console.error('Error fetching daily prompts:', errorData.message || response.statusText);
        throw new Error(errorData.message || 'Failed to fetch daily prompt from database');
      }

      const data = await response.json();
      
      // Validate that we received proper data structure
      if (!data.element || !data.intention || !data.reflection) {
        throw new Error('Invalid prompt data received from database');
      }
      
      return data;
    } catch (error) {
      console.error('Error in getDailyPrompts:', error);
      throw error; // Re-throw so journal component can handle it
    }
  };

  const savePhone = async (phone: string) => {
    if (!user) {
      console.error('No user found - cannot save phone');
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("profiles")
        .update({ phone })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error saving phone:", error.message, error);
        return;
      }

      if (data && profile) {
        // Update local profile state
        setProfile({
          ...profile,
          phone: phone
        });
      }
    } catch (error) {
      console.error("Error in savePhone:", error);
    }
  };

  const value: ProfileContextType = {
    profile,
    user,
    loading,
    refreshProfile,
    updateProfileNameAndElement,
    updateProfile,
    updateProfileName,
    savePhone,
    journalEntries,
    loadJournalEntries,
    saveJournalEntry,
    getDailyPrompts,
    isJournalOpen,
    setIsJournalOpen,
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
