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
import { debug } from "@/lib/logger";
import { ProfileTier } from "@/types/card";
import { TIER_ORDER } from "@/utils/tier";
import { getLocalDateString } from "@/utils/dateHelpers";
// HeartCoin celebrations are now triggered explicitly from logHeartcoinTransaction()
// instead of detecting balance changes here (removed triggerHeartCoinCelebration import)
import { updateBadgeProgressCounters } from "@/lib/updateBadgeProgress";
import { suppressBadgeCelebrations, enableBadgeCelebrations } from "@/utils/celebrationQueue";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Types for user owned cards and badges (joined from user_cards + cards table)
type OwnedCardRow = {
  id: string;
  user_id: string;
  card_id: string;
  slot_index: number | null;
  acquired_at: string;
  acquisition_source?: string | null;
  is_public?: boolean | null;
  is_digital?: boolean | null;
  cards: {
    id: string;
    card_name: string;
    element: string;
    rarity: string;
    artwork_url?: string | null;
    description?: string | null;
    is_released?: boolean;
    min_tier?: string;
    is_starter?: boolean;
    price_heartcoins?: number | null;
    physical_price_heartcoins?: number | null;
    is_physical_available?: boolean;
    cost_physical_heartcoins?: number | null;
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
  livestreams_attended?: number | null;
  concerts_attended?: number | null;
  cards_owned?: number | null;
  merch_items_owned?: number | null;
  unique_merch_items?: number | null;
  digital_cards_owned?: number | null;
  donations_made?: number | null;
  heartcoins_sent?: number | null;
  aliens_invited?: number | null;
  // Legacy fields for compatibility
  journey_tag?: string | null;
  tierName?: string | null;
  display_name?: string | null;
  username?: string | null;
  // Binder functionality
  card_slots?: number | null;
}

interface JournalEntry {
  entry_id: string; // primary key
  user_id: string;
  prompt_id: string | null;
  prompt: string | null; // denormalized copy of prompt text
  entry_text: string | null; // user writing
  intention: string | null;
  element: string | null;
  entry_date: string;
  created_at: string;
  stars_count?: number; // optional
  is_public?: boolean | null; // may not exist in current schema
  // Optional legacy fields kept for UI compatibility if present
  reflection?: string | null;
  intention_response?: string | null;
  reflection_response?: string | null;
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
  entry_text: {
    id: string;
    text: string;
    element: string;
    prompt_type: string;
  };
}

// Badge-related types
interface BadgeDefinition {
  id: string;
  slug: string;
  badge_name: string;
  description: string | null;
  requirement_type: string;
  requirement_count: number;
  icon_url: string | null;
  category: string | null;
  sub_category: string | null;
  created_at: string;
}

interface UserBadgeRecord {
  id: string;
  badge_id: string;
  earned_at: string;
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
  saveJournalEntry: (
    entry: Omit<JournalEntry, 'entry_id' | 'user_id' | 'created_at'>,
    options?: { sharePublic?: boolean }
  ) => Promise<JournalEntry | null>;
  updateJournalEntry: (entryId: string, updates: Partial<Pick<JournalEntry, 'intention' | 'is_public' | 'entry_text'>>) => Promise<void>;
  deleteJournalEntry: (entryId: string) => Promise<void>;
  getDailyPrompts: () => Promise<DailyPrompts | null>;
  isJournalOpen: boolean;
  setIsJournalOpen: (open: boolean) => void;
  // Badge functionality
  allBadges: BadgeDefinition[];
  userBadges: UserBadgeRecord[];
  unlockedBadges: BadgeDefinition[];
  badgesLoading: boolean;
  badgesError: string | null;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [previousHeartcoinBalance, setPreviousHeartcoinBalance] = useState<number | null>(null);
  // Badge state
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadgeRecord[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [badgesError, setBadgesError] = useState<string | null>(null);

  // Guard ref to prevent duplicate profile fetches from INITIAL_SESSION + SIGNED_IN race
  const isFetchingProfileRef = React.useRef(false);

  // Realtime channel for user_badges INSERT events
  const userBadgesChannelRef = React.useRef<RealtimeChannel | null>(null);
  const userBadgesSubscribedUserRef = React.useRef<string | null>(null);

  // Wrapper for setProfile that detects heartcoin balance increases
  // Function to fetch all badges from the database
  const fetchAllBadges = useCallback(async () => {
    try {
      setBadgesLoading(true);
      setBadgesError(null);

      const { data, error } = await supabaseBrowser
        .from('badges')
        .select('*')
        .order('category', { ascending: true })
        .order('badge_name', { ascending: true });

      if (error) {
        console.error('Error fetching badges:', error);
        setBadgesError(`Failed to load badges: ${error.message}`);
        return;
      }

      setAllBadges(data || []);
    } catch (err) {
      console.error('Error in fetchAllBadges:', err);
      setBadgesError(`Failed to fetch badges: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBadgesLoading(false);
    }
  }, []);

  // Function to fetch user's earned badges
  const fetchUserBadges = useCallback(async (userId: string) => {
    try {
      setBadgesError(null);

      const { data, error } = await supabaseBrowser
        .from('user_badges')
        .select('id, badge_id, earned_at')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user badges:', error);
        setBadgesError(`Failed to load user badges: ${error.message}`);
        return;
      }

      setUserBadges(data || []);
    } catch (err) {
      console.error('Error in fetchUserBadges:', err);
      setBadgesError(`Failed to fetch user badges: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  // Calculate unlocked badges based on allBadges and userBadges
  const unlockedBadges = useMemo(() => {
    if (!allBadges.length || !userBadges.length) {
      return [];
    }

    const userBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
    return allBadges.filter(badge => userBadgeIds.has(badge.id));
  }, [allBadges, userBadges]);

  const setProfileWithCelebration = useCallback((newProfile: Profile | null) => {
    // NOTE: Auto-celebration from balance detection has been DISABLED.
    // HeartCoin celebrations are now triggered explicitly from logHeartcoinTransaction()
    // to avoid duplicate celebrations and false positives on page load/navigation.
    // The previous auto-detection caused:
    // 1. Duplicate celebrations (logHeartcoinTransaction + balance detection)
    // 2. Random audio on page load when balance differed from cached state

    // Update the previous balance for tracking (keeping this for potential future use)
    if (newProfile?.heartcoin_balance !== null && newProfile?.heartcoin_balance !== undefined) {
      setPreviousHeartcoinBalance(newProfile.heartcoin_balance ?? 0);
    }

    setProfile(newProfile);
  }, []);

  const fetchProfile = async (options?: { skipBadgeCheck?: boolean }) => {
    // Prevent duplicate concurrent fetch calls
    if (isFetchingProfileRef.current) return;
    isFetchingProfileRef.current = true;

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
        debug("ProfileContext fetchProfile", {
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
        setProfileWithCelebration(null);
        return;
      }

      // Read profile only; trigger is responsible for creation
      const { data, error } = await supabaseBrowser
        .from("profiles")
        .select(
          "id, email, phone, name, element, journey, tier, heartcoin_balance, heartcoin_total, profile_complete, created_at, updated_at, daily_streak_current, last_streak_activity_date, profile_image_url, has_seen_tour, total_reflections, total_listening_minutes, total_heartcoins_earned, elemental_sessions_count, community_interactions, achievements_unlocked, streams_attended, livestreams_attended, concerts_attended, cards_owned, merch_items_owned, unique_merch_items, digital_cards_owned, donations_made, heartcoins_sent, aliens_invited, card_slots"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error.message, error);
        setProfile(null);
        return;
      }

      if (!data) {
        // No profile row yet - auth callback route should create one
        // Don't sign out - the profile may still be getting created
        if (process.env.NODE_ENV !== "production") console.warn('ProfileContext: No profile data found for authenticated user');
        setProfile(null);
        return;
      }

      // Fetch user cards, badges, and computed heartcoin balance in parallel
      // Cards query: joined with cards table, ordered by slot_index then acquired_at
      const [{ data: cardRows, error: cardError }, { data: badgeRows, error: badgeError }, { data: balanceData, error: balanceError }] =
        await Promise.all([
          supabaseBrowser
            .from("user_cards")
            .select(`
              id,
              user_id,
              card_id,
              slot_index,
              acquired_at,
              acquisition_source,
              is_public,
              is_digital,
              cards:card_id (
                id,
                card_name,
                element,
                rarity,
                artwork_url,
                description,
                is_released,
                min_tier,
                is_starter,
                price_heartcoins,
                physical_price_heartcoins,
                is_physical_available,
                cost_physical_heartcoins
              )
            `)
            .eq("user_id", user.id)
            .order("slot_index", { ascending: true, nullsFirst: false })
            .order("acquired_at", { ascending: true }),
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
          // Fetch computed heartcoin balance from canonical view
          // Uses maybeSingle() since row may not exist yet during session transitions
          supabaseBrowser
            .from("heartcoin_balance")
            .select("balance")
            .maybeSingle(),
        ]);

      if (cardError) {
        console.error("Error loading user_cards", cardError);
      }

      if (badgeError) {
        console.error("Error loading user_badges", badgeError);
      }

      // Note: balanceError is not logged because null results are expected
      // during session transitions when the user has no transactions yet

      // Use computed balance from view, fallback to profiles.heartcoin_balance if view fails
      const computedBalance = balanceData?.balance ?? data.heartcoin_balance ?? 0;

      // Filter out card rows where the join failed (defensive null handling)
      const validCardRows = (cardRows || []).filter((row: OwnedCardRow) => {
        if (!row.cards) {
          if (process.env.NODE_ENV !== "production") console.warn("[ProfileContext] user_cards row missing cards join", row);
          return false;
        }
        return true;
      }) as OwnedCardRow[];

      // Prefer explicit tier from DB if present; fallback to derived tier from totals/journey
      let computedTier: ProfileTier = "wanderer";
      const rawTier = (data.tier ?? data.journey ?? "wanderer")?.toString().toLowerCase();
      // Derive tier from heartcoin_total thresholds if no valid tier set
      if (typeof data.heartcoin_total === 'number') {
        if (data.heartcoin_total >= 25) computedTier = "lover";
        else if (data.heartcoin_total >= 5) computedTier = "dreamer";
      }
      // If DB has a valid tier value in allowed order, prefer it
      if (rawTier && (TIER_ORDER as readonly string[]).includes(rawTier)) {
        computedTier = rawTier as ProfileTier;
      }

      // Map database columns to interface format
      const mappedProfile: Profile = {
        id: data.id,
        email: data.email,
        phone: data.phone,
        name: data.name,
        element: data.element,
        journey: data.journey,
        heartcoin_balance: computedBalance,
        heartcoin_total: (data.heartcoin_total ?? 0),
        profile_complete: data.profile_complete ?? !!(data.name && data.element),
        created_at: data.created_at,
        updated_at: data.updated_at,
        tier: computedTier,
        has_seen_tour: data.has_seen_tour ?? false,
        profile_image_url: data.profile_image_url ?? null,
        daily_streak: data.daily_streak_current ?? 0,
        last_streak_activity_date: data.last_streak_activity_date ?? null,
        cards: validCardRows,
        badges: badgeRows ?? [],
        // Badge progress counter fields
        total_reflections: data.total_reflections ?? 0,
        total_listening_minutes: data.total_listening_minutes ?? 0,
        total_heartcoins_earned: data.total_heartcoins_earned ?? 0,
        elemental_sessions_count: data.elemental_sessions_count ?? 0,
        community_interactions: data.community_interactions ?? 0,
        achievements_unlocked: data.achievements_unlocked ?? 0,
        streams_attended: data.streams_attended ?? 0,
        livestreams_attended: data.livestreams_attended ?? 0,
        concerts_attended: data.concerts_attended ?? 0,
        cards_owned: data.cards_owned ?? 0,
        merch_items_owned: data.merch_items_owned ?? 0,
        unique_merch_items: data.unique_merch_items ?? 0,
        digital_cards_owned: data.digital_cards_owned ?? 0,
        donations_made: data.donations_made ?? 0,
        heartcoins_sent: data.heartcoins_sent ?? 0,
        aliens_invited: data.aliens_invited ?? 0,
        card_slots: data.card_slots ?? 0,
      };

      // Debug log when profile is successfully loaded
      if (typeof window !== 'undefined') {
        debug("ProfileContext profile loaded", {
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
          totalReflections: mappedProfile.total_reflections,
          timestamp: new Date().toISOString()
        });
      }

      // Update badge progress counters only on initial page load, NOT on
      // refreshProfile() calls (e.g., after merch purchases). Running badge
      // checks during refreshProfile() causes a race condition: badges like
      // True Alien or Stream Seeker get awarded, and the realtime INSERT event
      // arrives after suppression ends, triggering unwanted celebrations.
      if (!options?.skipBadgeCheck) {
        suppressBadgeCelebrations(10000); // safety timeout
        updateBadgeProgressCounters(user.id)
          .then(() => {
            // Refresh user badges to pick up any newly awarded badges
            fetchUserBadges(user.id);
          })
          .catch(err => {
            if (process.env.NODE_ENV !== "production") console.warn('Failed to update badge progress counters:', err);
          })
          .finally(() => {
            // Re-enable celebrations now that the initial check is done.
            // Any badges that were awarded during this window are already in the
            // pending queue and will be marked as seen (not celebrated).
            enableBadgeCelebrations();
          });
      }

      setProfileWithCelebration(mappedProfile);
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      setProfileWithCelebration(null);
    } finally {
      setLoading(false);
      isFetchingProfileRef.current = false;
    }
  };

  const refreshProfile = useCallback(async () => {
    // Skip badge checks on refresh — badge checks should only run on initial
    // page load. Running them here causes merch/card purchases to incorrectly
    // trigger unrelated badge celebrations (e.g., True Alien, Stream Seeker).
    await fetchProfile({ skipBadgeCheck: true });
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
      // Note: Do NOT send updated_at - it conflicts with the public_profiles_table view trigger
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.element !== undefined) dbUpdates.element = updates.element;
      if (updates.journey !== undefined) dbUpdates.journey = updates.journey;
      // Never allow front-end to directly update heartcoin fields
      if (updates.profile_complete !== undefined) dbUpdates.profile_complete = updates.profile_complete;
      
      // Update the existing profile (no insert logic - trigger handles creation)
      const { data, error } = await supabaseBrowser
        .from("profiles")
        .update(dbUpdates)
        .eq("id", user.id)
        .select("id, email, phone, name, element, journey, tier, heartcoin_balance, heartcoin_total, profile_complete, created_at, updated_at, daily_streak_current, last_streak_activity_date, profile_image_url, has_seen_tour, total_reflections, total_listening_minutes, total_heartcoins_earned, elemental_sessions_count, community_interactions, achievements_unlocked, streams_attended, livestreams_attended, concerts_attended, cards_owned, merch_items_owned, unique_merch_items, digital_cards_owned, donations_made, heartcoins_sent, aliens_invited, card_slots")
        .maybeSingle();

      if (error) {
        console.error("Error updating profile:", error.message, error);
        return;
      }

      if (data) {
        // Map the updated data back to Profile interface, preserving existing cards, badges, and heartcoin_balance
        // Keep existing heartcoin_balance from state (already from computed view) since profile updates don't change it
        // Derive tier similarly to fetchProfile
        let updatedTier: ProfileTier = profile?.tier ?? "wanderer";
        const rawTier2 = (data.tier ?? data.journey ?? updatedTier)?.toString().toLowerCase();
        if (typeof data.heartcoin_total === 'number') {
          if (data.heartcoin_total >= 25) updatedTier = "lover";
          else if (data.heartcoin_total >= 5) updatedTier = "dreamer";
        }
        if (rawTier2 && (TIER_ORDER as readonly string[]).includes(rawTier2)) {
          updatedTier = rawTier2 as ProfileTier;
        }

        const mappedProfile: Profile = {
          id: data.id,
          email: data.email,
          phone: data.phone,
          name: data.name,
          element: data.element,
          journey: data.journey,
          heartcoin_balance: profile?.heartcoin_balance ?? 0,
          heartcoin_total: (data.heartcoin_total ?? 0),
          profile_complete: data.profile_complete ?? !!(data.name && data.element),
          created_at: data.created_at,
          updated_at: data.updated_at,
          tier: updatedTier,
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
          livestreams_attended: data.livestreams_attended ?? 0,
          concerts_attended: data.concerts_attended ?? 0,
          cards_owned: data.cards_owned ?? 0,
          merch_items_owned: data.merch_items_owned ?? 0,
          unique_merch_items: data.unique_merch_items ?? 0,
          digital_cards_owned: data.digital_cards_owned ?? 0,
          donations_made: data.donations_made ?? 0,
          heartcoins_sent: data.heartcoins_sent ?? 0,
          aliens_invited: data.aliens_invited ?? 0,
          card_slots: data.card_slots ?? 0,
        };
        setProfileWithCelebration(mappedProfile);
      } else {
        if (process.env.NODE_ENV !== "production") console.warn("Profile update returned no data. Profile may not exist yet - waiting for trigger to create it.");
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

      // If no profile exists, create one first using upsert
      if (!profile) {
        if (process.env.NODE_ENV !== "production") console.log("No profile found, creating one for user:", user.id);
        const { error: upsertError } = await supabaseBrowser
          .from("profiles")
          .upsert(
            {
              id: user.id,
              email: user.email,
              name: name.trim()
            },
            { onConflict: 'id' }
          );

        if (upsertError) {
          console.error("Error creating profile:", upsertError.message, upsertError);
          throw new Error("Failed to create profile");
        }

        // Fetch the newly created profile
        await fetchProfile();
        return;
      }

      // Update the profile name (profiles table only - do NOT send updated_at)
      const { data, error } = await supabaseBrowser
        .from("profiles")
        .update({
          name: name.trim()
        })
        .eq("id", user.id)
        .select("id, email, phone, name, element, journey, heartcoin_balance, heartcoin_total, profile_complete, created_at, updated_at, daily_streak_current, last_streak_activity_date, profile_image_url, has_seen_tour, card_slots")
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

  // Set up realtime subscription for user_badges INSERT events
  // This keeps userBadges state current when new badges are awarded in real-time
  const setupUserBadgesRealtime = useCallback((subscribedUserId: string) => {
    // Skip if already subscribed to this user
    if (userBadgesSubscribedUserRef.current === subscribedUserId) return;

    // Clean up existing channel
    if (userBadgesChannelRef.current) {
      supabaseBrowser.removeChannel(userBadgesChannelRef.current);
      userBadgesChannelRef.current = null;
    }

    const channelName = `user-badges-profile-${subscribedUserId}-${Date.now()}`;
    userBadgesChannelRef.current = supabaseBrowser
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${subscribedUserId}`,
        },
        (payload) => {
          const newRow = payload.new as { id: string; badge_id: string; earned_at: string } | undefined;
          if (!newRow) return;

          debug('[ProfileContext] user_badges INSERT detected', { badge_id: newRow.badge_id });

          // Add the new badge to state, avoiding duplicates
          setUserBadges(prev => {
            if (prev.some(b => b.badge_id === newRow.badge_id)) return prev;
            return [...prev, {
              id: newRow.id,
              badge_id: newRow.badge_id,
              earned_at: newRow.earned_at,
            }];
          });
        }
      )
      .subscribe();

    userBadgesSubscribedUserRef.current = subscribedUserId;
  }, []);

  const cleanupUserBadgesRealtime = useCallback(() => {
    if (userBadgesChannelRef.current) {
      supabaseBrowser.removeChannel(userBadgesChannelRef.current);
      userBadgesChannelRef.current = null;
    }
    userBadgesSubscribedUserRef.current = null;
  }, []);

  useEffect(() => {
    // Track if we've already fetched for this mount to avoid duplicate calls
    let hasFetchedInitial = false;

    // Subscribe to auth state changes
    // This handles magic link sign-ins and other auth events
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      // Debug log for auth state changes
      if (typeof window !== 'undefined') {
        debug("ProfileContext auth state change", {
          browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          timestamp: new Date().toISOString()
        });
      }

      if (session?.user) {
        // For SIGNED_IN events (magic link, OAuth, etc.), always fetch profile
        // For INITIAL_SESSION, only fetch if we haven't already
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || !hasFetchedInitial) {
          hasFetchedInitial = true;
          if (typeof window !== 'undefined') {
            debug("ProfileContext user session detected, fetching profile", {
              browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
              userId: session.user.id,
              event,
              timestamp: new Date().toISOString()
            });
          }
          await fetchProfile();
          await Promise.all([
            loadJournalEntries(session.user.id),
            fetchAllBadges(),
            fetchUserBadges(session.user.id),
          ]);
          // Set up realtime subscription for user_badges changes
          setupUserBadgesRealtime(session.user.id);
        }
      } else {
        if (typeof window !== 'undefined') {
          debug("ProfileContext no user session, clearing profile", {
            browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
            timestamp: new Date().toISOString()
          });
        }
        setProfile(null);
        setUser(null);
        setJournalEntries([]);
        // Don't clear allBadges - badges are public data viewable by anyone
        // Only clear user-specific badge data
        setUserBadges([]);
        cleanupUserBadgesRealtime();
        setLoading(false);

        // Still fetch badges for logged-out users since they're public
        fetchAllBadges();
      }
    });

    // Listen for forced profile refresh events
    const handleProfileUpdate = async () => {
      debug('Profile update event received, forcing refresh...');
      await fetchProfile();
    };

    window.addEventListener('auth:profile-updated', handleProfileUpdate);
    window.addEventListener('profile:force-refresh', handleProfileUpdate);

    // Check for existing session on mount
    // This handles page refreshes when user is already logged in
    // For magic link flows, the onAuthStateChange will fire with SIGNED_IN event
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabaseBrowser.auth.getSession();

        if (error) {
          console.error("Error checking initial session:", error.message, error.code, error);
          setLoading(false);
          return;
        }

        // If there's an existing session, fetch the profile
        // The auth listener may also fire, but we track hasFetchedInitial to avoid duplicates
        if (session?.user && !hasFetchedInitial) {
          hasFetchedInitial = true;
          if (typeof window !== 'undefined') {
            debug("ProfileContext initial session found, fetching profile", {
              browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
              userId: session.user.id,
              timestamp: new Date().toISOString()
            });
          }
          await fetchProfile();
          await Promise.all([
            loadJournalEntries(session.user.id),
            fetchUserBadges(session.user.id),
          ]);
          // Set up realtime subscription for user_badges changes
          setupUserBadgesRealtime(session.user.id);
        } else if (!session) {
          // No session - user is logged out
          setLoading(false);
        }
      } catch (err) {
        console.error("Error in initializeSession:", err);
        setLoading(false);
      }
    };

    initializeSession();
    // Always fetch badges since they're public data
    fetchAllBadges();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('auth:profile-updated', handleProfileUpdate);
      window.removeEventListener('profile:force-refresh', handleProfileUpdate);
      cleanupUserBadgesRealtime();
    };
  }, []);

  // Helper: Ensure profile row exists for the given user ID
  // This is idempotent - will not overwrite existing data
  const ensureProfileExists = useCallback(async (userId: string, email?: string | null): Promise<boolean> => {
    try {
      const { error } = await supabaseBrowser
        .from("profiles")
        .upsert(
          {
            id: userId,
            email: email || null,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );

      if (error) {
        console.error("[ProfileContext] ensureProfileExists upsert failed:", error.message, error);
        return false;
      }

      debug("[ProfileContext] ensureProfileExists: profile row ensured for user", { userId });
      return true;
    } catch (err) {
      console.error("[ProfileContext] ensureProfileExists exception:", err);
      return false;
    }
  }, []);

  // Journal helper functions
  const loadJournalEntries = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabaseBrowser
        .from('soul_journal_entries')
        .select('*, stars_count')
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

  const saveJournalEntry = useCallback(async (
    entry: Omit<JournalEntry, 'entry_id' | 'user_id' | 'created_at'>,
    options?: { sharePublic?: boolean }
  ): Promise<JournalEntry | null> => {
    try {
      const { data: { user }, error: userError } = await supabaseBrowser.auth.getUser();

      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error(`Authentication error: ${userError.message}`);
      }
      if (!user) {
        console.error('No user session found');
        throw new Error('You must be logged in to save a journal entry. Please sign in and try again.');
      }

      // Debug log (once per save) for troubleshooting
      debug("[saveJournalEntry] Auth and profile state", {
        authUserId: user.id,
        profileId: profile?.id,
        profileExists: !!profile,
        userIdForInsert: user.id,
      });

      // Always ensure profile exists before saving journal entry (foreign key constraint)
      // This handles the case where the profile row doesn't exist yet
      const profileOk = await ensureProfileExists(user.id, user.email);
      if (!profileOk) {
        throw new Error("Unable to verify your profile. Please refresh and try again.");
      }

      // Build entry data with only the columns that exist in the schema
      const entryData: any = {
        user_id: user.id,
        entry_date: entry.entry_date,
        element: entry.element,
        // Denormalize author info for public feed display
        author_name: profile?.name || null,
        author_avatar_url: profile?.profile_image_url || null,
      };

      // Add prompt_id if provided and valid
      if (entry.prompt_id !== null && entry.prompt_id !== undefined) {
        // Validate that prompt_id is a valid UUID before adding it
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.prompt_id);
        
        // Special check for known problematic values (excluding temporary relic-id-here)
        const isProblematicValue = (entry.prompt_id.includes('relic') && entry.prompt_id !== 'relic-id-here') ||
                                  entry.prompt_id.includes('placeholder') ||
                                  entry.prompt_id.includes('example');
        
        if ((isValidUUID || entry.prompt_id === 'relic-id-here') && !isProblematicValue) {
          entryData.prompt_id = entry.prompt_id;
        } else {
          if (process.env.NODE_ENV !== "production") console.warn('Invalid or problematic UUID for prompt_id, skipping:', {
            prompt_id: entry.prompt_id,
            isValidUUID,
            isProblematicValue
          });
          
          // If this is a problematic value, throw a specific error to help user understand
          if (isProblematicValue) {
            throw new Error(`Invalid UUID format detected for value "${entry.prompt_id}". Please refresh the page and try again.`);
          }
        }
      }

      // Add other fields that exist in the schema
      if (entry.prompt !== null && entry.prompt !== undefined) {
        entryData.prompt = entry.prompt;
      }
      if (entry.entry_text !== null && entry.entry_text !== undefined) {
        entryData.entry_text = entry.entry_text;
      }
      if (entry.intention !== null && entry.intention !== undefined) {
        entryData.intention = entry.intention;
      }

      // Handle is_public field (Note: this may not exist in current schema)
      if (entry.is_public !== null && entry.is_public !== undefined) {
        entryData.is_public = entry.is_public;
      }

      debug('Saving journal entry with data:', entryData);

      // Check if entry already exists for this user and date
      const { data: existingEntry } = await supabaseBrowser
        .from('soul_journal_entries')
        .select('*')
        .eq('user_id', entryData.user_id)
        .eq('entry_date', entryData.entry_date)
        .single();

      let data, error;
      
      if (existingEntry) {
        // Update existing entry
        const updateResult = await supabaseBrowser
          .from('soul_journal_entries')
          .update(entryData)
          .eq('entry_id', existingEntry.entry_id)
          .select()
          .single();
        data = updateResult.data;
        error = updateResult.error;
      } else {
        // Insert new entry
        const insertResult = await supabaseBrowser
          .from('soul_journal_entries')
          .insert(entryData)
          .select()
          .single();
        data = insertResult.data;
        error = insertResult.error;
      }

      if (error) {
        // Defensive logging - log all error details and the payload
        console.error('Database error details:', {
          message: error.message,
          details: error.details,
          code: error.code,
          hint: error.hint
        });
        console.error('Entry data payload that failed to save:', entryData);
        
        // Provide more specific error messages for common UUID issues
        if (error.message?.includes('invalid input syntax for type uuid')) {
          const uuidField = error.message.match(/invalid input syntax for type uuid: "([^"]+)"/)?.[1];
          throw new Error(`Invalid UUID format detected${uuidField ? ` for value "${uuidField}"` : ''}. Please refresh the page and try again.`);
        }
        
        throw new Error(`Failed to save journal entry: ${error.message || error.details || 'Unknown database error'}`);
      }

      // Update local state
      setJournalEntries(prev => {
        const filtered = prev.filter(e => e.entry_date !== (data as any).entry_date || e.element !== (data as any).element);
        return [data as unknown as JournalEntry, ...filtered].sort((a, b) =>
          new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
        );
      });

      // Update badge progress counters after saving a journal entry.
      // Suppress celebrations during this check so that unrelated badges
      // (e.g. Live Witness, Stream Seeker) don't celebrate at the wrong time.
      // Only reflection-related badges should celebrate here, but we suppress
      // all because checkAndAwardEligibleBadges marks awarded badges as seen
      // in localStorage, preventing future celebrations via the realtime handler.
      if (user?.id) {
        suppressBadgeCelebrations(10000);
        updateBadgeProgressCounters(user.id)
          .then(() => {
            // Refresh user badges to pick up any newly awarded badges
            fetchUserBadges(user.id);
          })
          .catch(err => {
            if (process.env.NODE_ENV !== "production") console.warn('Failed to update badge progress after journal save:', err);
          })
          .finally(() => {
            enableBadgeCelebrations();
          });
      }

      // Public sharing is now handled via the is_public column in the main entry

      return data;
    } catch (error) {
      console.error('Error in saveJournalEntry:', error);
      throw error; // Re-throw so the UI can show the specific error
    }
  }, [profile, ensureProfileExists]);

  const updateJournalEntry = useCallback(async (entryId: string, updates: Partial<Pick<JournalEntry, 'intention' | 'is_public' | 'entry_text'>>) => {
    try {
      const { error } = await supabaseBrowser
        .from('soul_journal_entries')
        .update({
          ...updates
        })
        .eq('entry_id', entryId);

      if (error) {
        throw error;
      }

      // Update local state
      setJournalEntries(prev =>
        prev.map(entry =>
          entry.entry_id === entryId
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
        .eq('entry_id', entryId);

      if (error) {
        throw error;
      }

      // Update local state
      setJournalEntries(prev => prev.filter(entry => entry.entry_id !== entryId));
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
      if (!data.element || !data.intention || !data.entry_text) {
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
    // Badge data
    allBadges,
    userBadges,
    unlockedBadges,
    badgesLoading,
    badgesError,
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
    allBadges,
    userBadges,
    unlockedBadges,
    badgesLoading,
    badgesError,
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
