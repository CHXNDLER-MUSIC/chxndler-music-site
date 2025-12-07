"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase-browser";
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
  tier: ProfileTier;
  has_seen_tour?: boolean | null;
  profile_image_url?: string | null;
  daily_streak?: number | null;
  last_streak_activity_date?: string | null;
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
  prompt: string | null;
  soul_star: string | null;
  is_private: boolean;
  created_at: string;
  created_date: string;
  updated_at: string;
}

interface DailyPrompts {
  id: string;
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
  saveJournalEntry: (entry: Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'created_date' | 'updated_at'>) => Promise<JournalEntry | null>;
  updateJournalEntry: (entryId: string, updates: Partial<Pick<JournalEntry, 'soul_star' | 'intention' | 'prompt' | 'is_private'>>) => Promise<void>;
  deleteJournalEntry: (entryId: string) => Promise<void>;
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

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

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
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, email, phone, name, element, journey, heartcoin_balance, heartcoin_total, profile_complete, created_at, updated_at, daily_streak_current, last_streak_activity_date, profile_image_url, has_seen_tour"
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
          supabase
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
          supabase
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

      // Debug heartcoin data from database - only in development
      if (process.env.NODE_ENV === "development") {
        console.log('ProfileContext: Raw database profile data:', {
          id: data.id,
          name: data.name,
          heartcoin_balance: data.heartcoin_balance,
          heartcoin_total: data.heartcoin_total,
          dataType: typeof data.heartcoin_balance
        });
      }

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
        has_seen_tour: data.has_seen_tour ?? false,
        profile_image_url: data.profile_image_url ?? null,
        daily_streak: data.daily_streak_current ?? 0,
        last_streak_activity_date: data.last_streak_activity_date ?? null,
        cards: cardRows ?? [],
        badges: badgeRows ?? [],
      };

      if (process.env.NODE_ENV === "development") {
        console.log('ProfileContext: Mapped profile HeartCoin balance:', mappedProfile.heartcoin_balance);
      }

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
      } = await supabase.auth.getSession();

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
      const { data, error } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("id", user.id)
        .select("id, email, phone, name, element, journey, heartcoin_balance, heartcoin_total, profile_complete, created_at, updated_at, daily_streak_current, last_streak_activity_date, profile_image_url, has_seen_tour")
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
          has_seen_tour: data.has_seen_tour ?? false,
          profile_image_url: data.profile_image_url ?? null,
          daily_streak: data.daily_streak_current ?? 0,
          last_streak_activity_date: data.last_streak_activity_date ?? null,
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
      } = await supabase.auth.getSession();

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
      const { data, error } = await supabase
        .from("profiles")
        .update({ 
          name: name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id)
        .select("id, email, phone, name, element, journey, heartcoin_balance, heartcoin_total, profile_complete, created_at, updated_at, daily_streak_current, last_streak_activity_date, profile_image_url, has_seen_tour")
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

  // STABLE useEffect - only depends on user ID changes
  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      setJournalEntries([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadUserData = async () => {
      setLoading(true);

      try {
        await Promise.all([
          fetchProfile(),
          loadJournalEntries(user.id)
        ]);
      } catch (error) {
        console.error("Error loading user data:", error);
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    loadUserData();

    return () => {
      cancelled = true;
    };
  }, [user?.id]); // ONLY depend on user.id

  // Auth state subscription - stable, no dependencies
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (process.env.NODE_ENV === "development") {
          console.log('ProfileContext: Auth state changed:', { event, userId: session?.user?.id });
        }
        
        setUser(session?.user || null);
      }
    );

    // Listen for forced profile refresh events
    const handleProfileUpdate = async () => {
      if (process.env.NODE_ENV === "development") {
        console.log('Profile update event received, forcing refresh...');
      }
      await fetchProfile();
    };

    window.addEventListener('auth:profile-updated', handleProfileUpdate);
    window.addEventListener('profile:force-refresh', handleProfileUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('auth:profile-updated', handleProfileUpdate);
      window.removeEventListener('profile:force-refresh', handleProfileUpdate);
    };
  }, []); // Empty dependency array - only run once

  // Journal helper functions
  const loadJournalEntries = async (userId: string) => {
    try {
      const { data, error } = await supabase
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
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error getting session:', sessionError.message, sessionError);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      const user = session?.user;
      if (!user) {
        console.error('No user session found');
        throw new Error('You must be logged in to save journal entries');
      }

      // Prepare data for upsert with correct schema
      const entryData = {
        user_id: user.id,
        intention: entry.intention,
        prompt: entry.prompt,
        soul_star: entry.soul_star,
        entry_date: new Date().toISOString().slice(0, 10), // ISO date string YYYY-MM-DD
        is_private: entry.is_private || false
      };

      if (process.env.NODE_ENV === "development") {
        console.log('Saving journal entry with data:', entryData);
      }

      const { data, error } = await supabase
        .from('soul_journal_entries')
        .upsert(
          entryData,
          { 
            onConflict: 'user_id, entry_date',
            returning: 'representation'
          }
        )
        .select()
        .single();

      if (process.env.NODE_ENV === "development") {
        console.log('Upsert result - data:', data, 'error:', error);
      }

      if (error) {
        console.error('Error saving journal entry:', error.message || error.details || error);
        throw new Error(`Failed to save journal entry: ${error.message || error.details || 'Unknown database error'}`);
      }

      if (!data) {
        console.error('No data returned from upsert operation');
        throw new Error('No data returned from save operation');
      }

      // Update local state
      setJournalEntries(prev => {
        const filtered = prev.filter(e => e.entry_date !== data.entry_date);
        return [data, ...filtered].sort((a, b) => 
          new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
        );
      });

      return data;
    } catch (error) {
      console.error('Error in saveJournalEntry:', error);
      throw error; // Re-throw to let caller handle
    }
  };

  const updateJournalEntry = async (entryId: string, updates: Partial<Pick<JournalEntry, 'soul_star' | 'intention' | 'prompt' | 'is_private'>>) => {
    try {
      const { error } = await supabase
        .from('soul_journal_entries')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId);

      if (error) {
        throw error;
      }

      // Update local state
      setJournalEntries(prev => 
        prev.map(entry => 
          entry.id === entryId 
            ? { ...entry, ...updates }
            : entry
        )
      );
    } catch (error) {
      console.error('Error updating journal entry:', error);
      throw error;
    }
  };

  const deleteJournalEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('soul_journal_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        throw error;
      }

      // Update local state
      setJournalEntries(prev => prev.filter(entry => entry.id !== entryId));
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      throw error;
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
      const { data, error } = await supabase
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
    updateJournalEntry,
    deleteJournalEntry,
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