"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
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
  last_streak_activity_date?: string | null; // last date streak was updated
  cards: OwnedCardRow[];
  badges: OwnedBadgeRow[];
  // Badge progress counter fields
  total_reflections?: number | null;
  total_listening_minutes?: number | null;
  total_heartcoins_earned?: number | null;
  elemental_sessions_count?: number | null;
  community_interactions?: number | null;
  achievements_unlocked?: number | null;
  streams_attended?: number | null;
  concerts_attended?: number | null;
  cards_owned?: number | null;
  merch_items_owned?: number | null;
  donations_made?: number | null;
  heartcoins_sent?: number | null;
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
  id: string; // Add the daily prompt ID
  prompt_date: string;
  element: string;
  intention: {
    id: string;
    text: string;
    element: string;
    prompt_type: string;
  };
  soul_star: {
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

      // Prefer getSession to avoid noisy "Auth session missing" errors when logged out
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError.message, sessionError);
      }

      const user = session?.user;
      
      // Debug log for ProfileContext
      if (typeof window !== 'undefined') {
        console.log("DEBUG ProfileContext fetchProfile", {
          browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
          hasSession: !!session,
          hasUser: !!user,
          userId: user?.id,
          userEmail: user?.email,
          sessionError: sessionError?.message,
          timestamp: new Date().toISOString()
        });
      }
      
      setUser(user);
      if (!user) {
        setProfile(null);
        return;
      }

      // Read profile only; trigger is responsible for creation
      const { data, error } = await supabaseBrowser
        .from("profiles")
        .select(
          "id, email, phone, name, element, journey, heartcoin_balance, heartcoin_total, profile_complete, created_at, updated_at, daily_streak_current, last_streak_activity_date, profile_image_url, has_seen_tour, total_reflections, total_listening_minutes, total_heartcoins_earned, elemental_sessions_count, community_interactions, achievements_unlocked, streams_attended, concerts_attended, cards_owned, merch_items_owned, donations_made, heartcoins_sent"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error.message, error);
        setProfile(null);
        return;
      }

      if (!data) {
        // No profile row yet - this might indicate an invalid session
        console.warn('ProfileContext: No profile data found for authenticated user - session may be invalid');
        setProfile(null);
        
        // If user has been authenticated for more than 10 seconds but still no profile, 
        // the session might be stale - sign them out
        setTimeout(async () => {
          const { data: currentSession } = await supabaseBrowser.auth.getSession();
          if (currentSession?.session?.user?.id === user.id && !profile) {
            console.warn('ProfileContext: Clearing potentially stale session after timeout');
            await supabaseBrowser.auth.signOut();
          }
        }, 10000);
        
        return;
      }

      // Fetch user cards and badges in parallel
      const [{ data: cardRows, error: cardError }, { data: badgeRows, error: badgeError }] =
        await Promise.all([
          supabaseBrowser
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
          supabaseBrowser
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
        // Badge progress counter fields
        total_reflections: data.total_reflections ?? 0,
        total_listening_minutes: data.total_listening_minutes ?? 0,
        total_heartcoins_earned: data.total_heartcoins_earned ?? 0,
        elemental_sessions_count: data.elemental_sessions_count ?? 0,
        community_interactions: data.community_interactions ?? 0,
        achievements_unlocked: data.achievements_unlocked ?? 0,
        streams_attended: data.streams_attended ?? 0,
        concerts_attended: data.concerts_attended ?? 0,
        cards_owned: data.cards_owned ?? 0,
        merch_items_owned: data.merch_items_owned ?? 0,
        donations_made: data.donations_made ?? 0,
        heartcoins_sent: data.heartcoins_sent ?? 0,
      };

      // Debug log when profile is successfully loaded
      if (typeof window !== 'undefined') {
        console.log("DEBUG ProfileContext profile loaded", {
          browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
          loading: false,
          currentUser: user,
          profile: mappedProfile,
          hasUser: true,
          hasProfile: !!mappedProfile.profile_complete,
          profileId: mappedProfile.id,
          profileName: mappedProfile.name,
          profileElement: mappedProfile.element,
          heartcoinBalance: mappedProfile.heartcoin_balance,
          profileComplete: mappedProfile.profile_complete,
          cardsCount: mappedProfile.cards.length,
          badgesCount: mappedProfile.badges.length,
          timestamp: new Date().toISOString()
        });
      }

      setProfile(mappedProfile);
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();

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
      const { data, error } = await supabaseBrowser
        .from("profiles")
        .update(dbUpdates)
        .eq("id", user.id)
        .select("id, email, phone, name, element, journey, heartcoin_balance, heartcoin_total, profile_complete, created_at, updated_at, daily_streak_current, last_streak_activity_date, profile_image_url, has_seen_tour, total_reflections, total_listening_minutes, total_heartcoins_earned, elemental_sessions_count, community_interactions, achievements_unlocked, streams_attended, concerts_attended, cards_owned, merch_items_owned, donations_made, heartcoins_sent")
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
          // Badge progress counter fields
          total_reflections: data.total_reflections ?? 0,
          total_listening_minutes: data.total_listening_minutes ?? 0,
          total_heartcoins_earned: data.total_heartcoins_earned ?? 0,
          elemental_sessions_count: data.elemental_sessions_count ?? 0,
          community_interactions: data.community_interactions ?? 0,
          achievements_unlocked: data.achievements_unlocked ?? 0,
          streams_attended: data.streams_attended ?? 0,
          concerts_attended: data.concerts_attended ?? 0,
          cards_owned: data.cards_owned ?? 0,
          merch_items_owned: data.merch_items_owned ?? 0,
          donations_made: data.donations_made ?? 0,
          heartcoins_sent: data.heartcoins_sent ?? 0,
        };
        setProfile(mappedProfile);
      } else {
        console.warn("Profile update returned no data. Profile may not exist yet - waiting for trigger to create it.");
      }
    } catch (error) {
      console.error("Error in updateProfile:", error);
    }
  }, [profile]);

  const updateProfileNameAndElement = useCallback(async (
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
  }, [updateProfile]);

  const updateProfileName = useCallback(async (name: string) => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();

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
      const { data, error } = await supabaseBrowser
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
  }, [profile]);

  useEffect(() => {
    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      // Debug log for auth state changes
      if (typeof window !== 'undefined') {
        console.log("DEBUG ProfileContext auth state change", {
          browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          timestamp: new Date().toISOString()
        });
      }
      
      if (session?.user) {
        if (typeof window !== 'undefined') {
          console.log("DEBUG ProfileContext user session detected, fetching profile", {
            browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
            userId: session.user.id,
            timestamp: new Date().toISOString()
          });
        }
        await fetchProfile();
        await loadJournalEntries(session.user.id);
      } else {
        if (typeof window !== 'undefined') {
          console.log("DEBUG ProfileContext no user session, clearing profile", {
            browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
            timestamp: new Date().toISOString()
          });
        }
        setProfile(null);
        setUser(null);
        setJournalEntries([]);
        setLoading(false);
      }
    });

    // Listen for forced profile refresh events
    const handleProfileUpdate = async () => {
      if (process.env.NODE_ENV === "development") {
        console.log('Profile update event received, forcing refresh...');
      }
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
  const loadJournalEntries = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabaseBrowser
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
  }, []);

  const saveJournalEntry = useCallback(async (entry: Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<JournalEntry | null> => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();

      if (sessionError) {
        console.error('Error getting session:', sessionError.message);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      const user = session?.user;
      if (!user) {
        console.error('No user session found');
        throw new Error('No user session found. Please log in again.');
      }

      // Build entry data with only the core columns that should exist
      const entryData: any = {
        user_id: user.id,
        entry_date: entry.entry_date,
        element: entry.element,
        soul_star: entry.soul_star?.trim() || null,
      };

      // Add optional columns that may exist
      if (entry.intention !== null && entry.intention !== undefined) {
        entryData.intention = entry.intention;
      }
      if (entry.prompt !== null && entry.prompt !== undefined) {
        entryData.soul_star = entry.prompt; // Map prompt to soul_star column
      }
      if (entry.prompt_id !== null && entry.prompt_id !== undefined) {
        entryData.prompt_id = entry.prompt_id;
      }

      // Try to add optional columns that may not exist yet in all databases
      try {
        if (entry.is_private !== null && entry.is_private !== undefined) {
          entryData.is_private = entry.is_private;
        }
      } catch (error) {
        console.warn('is_private column may not exist in database schema');
      }

      console.log('Saving journal entry with data:', entryData);

      const { data, error } = await supabaseBrowser
        .from('soul_journal_entries')
        .upsert(
          entryData,
          { 
            onConflict: 'user_id,entry_date,element',
            ignoreDuplicates: false 
          }
        )
        .select()
        .single();

      if (error) {
        console.error('Database error details:', error);
        throw new Error(`Failed to save journal entry: ${error.message || error.details || 'Unknown database error'}`);
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
      throw error; // Re-throw so the UI can show the specific error
    }
  }, []);

  const updateJournalEntry = useCallback(async (entryId: string, updates: Partial<Pick<JournalEntry, 'soul_star' | 'intention' | 'prompt' | 'is_private'>>) => {
    try {
      const { error } = await supabaseBrowser
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
  }, []);

  const deleteJournalEntry = useCallback(async (entryId: string) => {
    try {
      const { error } = await supabaseBrowser
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
  }, []);

  const getDailyPrompts = useCallback(async (): Promise<DailyPrompts | null> => {
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
      if (!data.element || !data.intention || !data.soul_star) {
        throw new Error('Invalid prompt data received from database');
      }
      
      return data;
    } catch (error) {
      console.error('Error in getDailyPrompts:', error);
      throw error; // Re-throw so journal component can handle it
    }
  }, []);

  const savePhone = useCallback(async (phone: string) => {
    if (!user) {
      console.error('No user found - cannot save phone');
      return;
    }

    try {
      const { data, error } = await supabaseBrowser
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
  }, [user, profile]);

  const value: ProfileContextType = useMemo(() => ({
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
  }), [
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
  ]);

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
