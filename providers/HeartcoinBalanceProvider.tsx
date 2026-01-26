"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { triggerHeartCoinCelebration } from "@/utils/heartcoinCelebration";
import { getNYDateString } from "@/lib/time";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ============================================================================
// DEBUG FLAGS - Toggle these to enable/disable debug logging
// ============================================================================
const DEBUG_BALANCE = true; // Set to false in production
const DEBUG_CELEBRATIONS = true; // Set to false in production

// Minimum delay after initial load before celebrations can fire
// This prevents celebrations on hydration/page load
const INITIAL_LOAD_CELEBRATION_DELAY_MS = 500;

function debugBalance(message: string, data?: any) {
  if (DEBUG_BALANCE) {
    console.log(`[BALANCE] ${message}`, data ?? "");
  }
}

function debugCelebration(message: string, data?: any) {
  if (DEBUG_CELEBRATIONS) {
    console.log(`[CELEBRATION] ${message}`, data ?? "");
  }
}

// ============================================================================
// Context Types
// ============================================================================
interface HeartcoinBalanceContextType {
  balance: number;
  loading: boolean;
  error: string | null;
  songOfDayCompletedToday: boolean;
  refetchBalance: () => Promise<void>;
  refetchBalanceAfterAward: () => Promise<void>;
  refreshProfileState: () => Promise<void>;
}

const HeartcoinBalanceContext = createContext<HeartcoinBalanceContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================
export function HeartcoinBalanceProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [songOfDayCompletedToday, setSongOfDayCompletedToday] = useState<boolean>(false);

  // Track previous balance to detect increases and trigger celebration
  const prevBalanceRef = useRef<number | null>(null);

  // Flag to suppress celebration on initial load
  const isInitialLoadRef = useRef<boolean>(true);

  // Timestamp when initial load completed - used to prevent celebration on first update
  const initialLoadCompletedAtRef = useRef<number>(0);

  // Track the last balance we celebrated to prevent duplicate celebrations
  const lastCelebratedBalanceRef = useRef<number | null>(null);

  // Realtime channel refs for cleanup
  const balanceChannelRef = useRef<RealtimeChannel | null>(null);
  const sotdChannelRef = useRef<RealtimeChannel | null>(null);

  // Track if channels are already set up to prevent duplicates
  const channelsSetupRef = useRef<boolean>(false);

  // ============================================================================
  // Balance Update with Celebration Logic
  // ============================================================================
  const updateBalanceWithCelebration = useCallback((newBalance: number, source: string) => {
    const prevBalance = prevBalanceRef.current;
    const lastCelebratedBalance = lastCelebratedBalanceRef.current;
    const timeSinceInitialLoad = Date.now() - initialLoadCompletedAtRef.current;

    debugBalance(`${source}`, {
      newBalance,
      prevBalance,
      lastCelebratedBalance,
      isInitialLoad: isInitialLoadRef.current,
      timeSinceInitialLoad
    });

    // Determine if we should celebrate:
    // 1. Not initial load (isInitialLoadRef is false)
    // 2. Enough time has passed since initial load completed (prevents race conditions)
    // 3. Previous balance is set
    // 4. New balance is greater than previous
    // 5. We haven't already celebrated this exact balance (dedupe)
    const shouldCelebrate =
      !isInitialLoadRef.current &&
      timeSinceInitialLoad >= INITIAL_LOAD_CELEBRATION_DELAY_MS &&
      prevBalance !== null &&
      newBalance > prevBalance &&
      (lastCelebratedBalance === null || newBalance > lastCelebratedBalance);

    if (shouldCelebrate) {
      const delta = newBalance - prevBalance;
      debugCelebration("COIN_CELEBRATION", {
        delta,
        newBalance,
        prevBalance,
        source,
        timeSinceInitialLoad
      });

      // Mark this balance as celebrated BEFORE triggering (prevents duplicates)
      lastCelebratedBalanceRef.current = newBalance;

      // Trigger celebration with the delta
      try {
        triggerHeartCoinCelebration(delta);
      } catch (err) {
        console.error("[BALANCE] Failed to trigger celebration:", err);
      }
    } else if (newBalance > (prevBalance ?? 0) && !shouldCelebrate) {
      debugCelebration("COIN_CELEBRATION_SKIPPED", {
        reason: isInitialLoadRef.current
          ? "initial_load"
          : timeSinceInitialLoad < INITIAL_LOAD_CELEBRATION_DELAY_MS
            ? "too_soon_after_load"
            : lastCelebratedBalance !== null && newBalance <= lastCelebratedBalance
              ? "already_celebrated"
              : "unknown",
        newBalance,
        prevBalance,
        timeSinceInitialLoad
      });
    }

    // Update state and ref
    prevBalanceRef.current = newBalance;
    setBalance(newBalance);
  }, []);

  // ============================================================================
  // Fetch Balance from Database
  // ============================================================================
  const fetchBalance = useCallback(async (): Promise<number | null> => {
    try {
      const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession();

      if (sessionError || !session?.user) {
        debugBalance("No session, skipping balance fetch");
        return null;
      }

      const currentUserId = session.user.id;
      setUserId(currentUserId);

      // Fetch from heartcoin_balance view (canonical source of truth)
      const { data: balanceData, error: balanceError } = await supabaseBrowser
        .from("heartcoin_balance")
        .select("balance")
        .maybeSingle();

      if (balanceError) {
        console.error("[BALANCE] Error fetching from view:", balanceError);
        // Fallback to profiles table
        const { data: profileData, error: profileError } = await supabaseBrowser
          .from("profiles")
          .select("heartcoin_balance")
          .eq("id", currentUserId)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        return profileData?.heartcoin_balance ?? 0;
      }

      return balanceData?.balance ?? 0;
    } catch (err) {
      console.error("[BALANCE] Error fetching balance:", err);
      setError("Failed to fetch balance");
      return null;
    }
  }, []);

  // ============================================================================
  // Fetch Song of Day Completion Status
  // ============================================================================
  const fetchSongOfDayStatus = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();

      if (!session?.user) {
        return false;
      }

      const nyDay = getNYDateString();

      const { count, error: claimError } = await supabaseBrowser
        .from("user_song_of_day_claims")
        .select("*", { head: true, count: "exact" })
        .eq("user_id", session.user.id)
        .eq("day", nyDay);

      if (claimError) {
        console.error("[BALANCE] Error fetching SOTD status:", claimError);
        return false;
      }

      const completed = (count ?? 0) > 0;
      debugBalance("QUEST_SOD_STATE", { completed, day: nyDay });
      return completed;
    } catch (err) {
      console.error("[BALANCE] Error fetching SOTD status:", err);
      return false;
    }
  }, []);

  // ============================================================================
  // Initialize Balance and SOTD Status
  // ============================================================================
  const initializeState = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [initialBalance, sotdCompleted] = await Promise.all([
      fetchBalance(),
      fetchSongOfDayStatus(),
    ]);

    if (initialBalance !== null) {
      debugBalance("BALANCE_INIT", { value: initialBalance });
      prevBalanceRef.current = initialBalance;
      // Also set lastCelebratedBalance to initial value to prevent
      // celebrating the initial balance if realtime sends it again
      lastCelebratedBalanceRef.current = initialBalance;
      setBalance(initialBalance);
    }

    setSongOfDayCompletedToday(sotdCompleted);

    // Mark initial load as complete immediately but record the timestamp
    // The celebration logic will use the timestamp to add a small delay
    // This is much faster than the old 2-second timeout approach
    isInitialLoadRef.current = false;
    initialLoadCompletedAtRef.current = Date.now();
    debugBalance("Initial load complete, celebrations enabled", {
      timestamp: initialLoadCompletedAtRef.current,
      delayMs: INITIAL_LOAD_CELEBRATION_DELAY_MS
    });

    setLoading(false);
  }, [fetchBalance, fetchSongOfDayStatus]);

  // ============================================================================
  // Public Refetch Functions
  // ============================================================================
  const refetchBalance = useCallback(async () => {
    const prev = prevBalanceRef.current;
    const newBalance = await fetchBalance();
    if (newBalance !== null) {
      debugBalance("BALANCE_REFETCH", { prev, next: newBalance });
      updateBalanceWithCelebration(newBalance, "refetch");
    }
  }, [fetchBalance, updateBalanceWithCelebration]);

  const refetchBalanceAfterAward = useCallback(async () => {
    debugBalance("refetch after award triggered");

    const prev = prevBalanceRef.current;
    const maxRetries = 5;
    const delays = [300, 500, 800, 1200, 2000]; // Increasing delays for retries

    let newBalance: number | null = null;

    // Retry with increasing delays until balance changes or max retries reached
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));

      newBalance = await fetchBalance();
      debugBalance("BALANCE_REFETCH_ATTEMPT", {
        attempt: attempt + 1,
        prev,
        next: newBalance,
        source: "after_award"
      });

      // If balance increased, we got the update - break out of retry loop
      if (newBalance !== null && prev !== null && newBalance > prev) {
        debugBalance("BALANCE_INCREASED", { prev, next: newBalance, attempt: attempt + 1 });
        break;
      }

      // If this is the last attempt, use whatever balance we got
      if (attempt === maxRetries - 1) {
        debugBalance("MAX_RETRIES_REACHED", { prev, next: newBalance });
      }
    }

    if (newBalance !== null) {
      updateBalanceWithCelebration(newBalance, "refetch after award");
    }

    // Also refresh SOTD status
    const sotdCompleted = await fetchSongOfDayStatus();
    setSongOfDayCompletedToday(sotdCompleted);
  }, [fetchBalance, fetchSongOfDayStatus, updateBalanceWithCelebration]);

  const refreshProfileState = useCallback(async () => {
    debugBalance("refreshProfileState called");
    await Promise.all([
      refetchBalance(),
      fetchSongOfDayStatus().then(setSongOfDayCompletedToday),
    ]);
  }, [refetchBalance, fetchSongOfDayStatus]);

  // ============================================================================
  // Setup Realtime Subscriptions
  // ============================================================================
  const setupRealtimeSubscriptions = useCallback((currentUserId: string) => {
    // Prevent duplicate channel setup
    if (channelsSetupRef.current) {
      debugBalance("Channels already set up, skipping");
      return;
    }

    // Clean up existing channels if any
    if (balanceChannelRef.current) {
      debugBalance("Cleaning up existing balance channel");
      supabaseBrowser.removeChannel(balanceChannelRef.current);
      balanceChannelRef.current = null;
    }
    if (sotdChannelRef.current) {
      debugBalance("Cleaning up existing SOTD channel");
      supabaseBrowser.removeChannel(sotdChannelRef.current);
      sotdChannelRef.current = null;
    }

    debugBalance("Setting up realtime subscriptions", { userId: currentUserId });

    // Channel 1: Subscribe to profiles table for balance updates
    const balanceChannel = supabaseBrowser
      .channel(`heartcoin-balance-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${currentUserId}`,
        },
        (payload) => {
          const prev = prevBalanceRef.current;
          const newBalance = payload.new?.heartcoin_balance;
          debugBalance("BALANCE_RT_UPDATE", { prev, next: newBalance });

          if (typeof newBalance === "number") {
            updateBalanceWithCelebration(newBalance, "realtime update");
          }
        }
      )
      .subscribe((status) => {
        debugBalance("Balance subscription status", { status });
        if (status === "SUBSCRIBED") {
          debugBalance("Successfully subscribed to balance updates");
        } else if (status === "CHANNEL_ERROR") {
          console.error("[BALANCE] Balance subscription error");
          setError("Realtime subscription failed");
        }
      });

    balanceChannelRef.current = balanceChannel;

    // Channel 2: Subscribe to user_song_of_day_claims for SOTD completion
    const nyDay = getNYDateString();
    const sotdChannel = supabaseBrowser
      .channel(`sotd-claims-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_song_of_day_claims",
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          debugBalance("SOTD claim INSERT received", payload);
          // Check if this claim is for today
          if (payload.new?.day === nyDay) {
            debugBalance("QUEST_SOD_STATE", { completed: true, source: "realtime" });
            setSongOfDayCompletedToday(true);

            // Also refetch balance to trigger celebration (backend awards heartcoin with claim)
            debugBalance("Triggering balance refetch after SOTD claim via realtime");
            // Small delay to ensure backend has updated the balance
            await new Promise(resolve => setTimeout(resolve, 300));
            const newBalance = await fetchBalance();
            if (newBalance !== null) {
              updateBalanceWithCelebration(newBalance, "realtime SOTD claim");
            }
          }
        }
      )
      .subscribe((status) => {
        debugBalance("SOTD subscription status", { status });
      });

    sotdChannelRef.current = sotdChannel;
    channelsSetupRef.current = true;
  }, [updateBalanceWithCelebration, fetchBalance]);

  // ============================================================================
  // Cleanup Realtime Subscriptions
  // ============================================================================
  const cleanupSubscriptions = useCallback(() => {
    if (balanceChannelRef.current) {
      debugBalance("Cleaning up balance channel on unmount");
      supabaseBrowser.removeChannel(balanceChannelRef.current);
      balanceChannelRef.current = null;
    }
    if (sotdChannelRef.current) {
      debugBalance("Cleaning up SOTD channel on unmount");
      supabaseBrowser.removeChannel(sotdChannelRef.current);
      sotdChannelRef.current = null;
    }
    channelsSetupRef.current = false;
  }, []);

  // ============================================================================
  // Initialize on Mount and Handle Auth State Changes
  // ============================================================================
  useEffect(() => {
    let mounted = true;

    // Initialize state on mount
    initializeState();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        debugBalance("Auth state change", { event, userId: session?.user?.id });

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session?.user) {
            setUserId(session.user.id);
            isInitialLoadRef.current = true;
            initialLoadCompletedAtRef.current = 0;
            lastCelebratedBalanceRef.current = null;
            channelsSetupRef.current = false; // Allow re-setup
            await initializeState();
            setupRealtimeSubscriptions(session.user.id);
          }
        } else if (event === "SIGNED_OUT" || !session) {
          // Clear state on sign out
          setUserId(null);
          setBalance(0);
          setSongOfDayCompletedToday(false);
          prevBalanceRef.current = null;
          lastCelebratedBalanceRef.current = null;
          isInitialLoadRef.current = true;
          initialLoadCompletedAtRef.current = 0;
          cleanupSubscriptions();
        }
      }
    );

    // Check for existing session and set up realtime
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session?.user) {
        setupRealtimeSubscriptions(session.user.id);
      }
    });

    // Cleanup on unmount
    return () => {
      mounted = false;
      subscription.unsubscribe();
      cleanupSubscriptions();
    };
  }, [initializeState, setupRealtimeSubscriptions, cleanupSubscriptions]);

  // ============================================================================
  // Listen for External Events
  // ============================================================================
  useEffect(() => {
    const handleProfileRefresh = async () => {
      debugBalance("Profile refresh event received");
      await refreshProfileState();
    };

    window.addEventListener("auth:profile-updated", handleProfileRefresh);
    window.addEventListener("profile:force-refresh", handleProfileRefresh);

    return () => {
      window.removeEventListener("auth:profile-updated", handleProfileRefresh);
      window.removeEventListener("profile:force-refresh", handleProfileRefresh);
    };
  }, [refreshProfileState]);

  // Listen for Song of Day completion event (fallback if realtime is delayed)
  useEffect(() => {
    const handleSotdCompleted = async () => {
      debugBalance("dailySongQuestCompleted event received, refetching state");
      // Mark as completed immediately for UI responsiveness
      setSongOfDayCompletedToday(true);
      // Then refetch to ensure balance is updated
      await refetchBalanceAfterAward();
    };

    window.addEventListener("dailySongQuestCompleted", handleSotdCompleted);

    return () => {
      window.removeEventListener("dailySongQuestCompleted", handleSotdCompleted);
    };
  }, [refetchBalanceAfterAward]);

  // Listen for songOfDay:refresh event
  useEffect(() => {
    const handleSotdRefresh = async () => {
      debugBalance("songOfDay:refresh event received");
      const completed = await fetchSongOfDayStatus();
      setSongOfDayCompletedToday(completed);
    };

    window.addEventListener("songOfDay:refresh", handleSotdRefresh);

    return () => {
      window.removeEventListener("songOfDay:refresh", handleSotdRefresh);
    };
  }, [fetchSongOfDayStatus]);

  // ============================================================================
  // Context Value
  // ============================================================================
  const value: HeartcoinBalanceContextType = {
    balance,
    loading,
    error,
    songOfDayCompletedToday,
    refetchBalance,
    refetchBalanceAfterAward,
    refreshProfileState,
  };

  return (
    <HeartcoinBalanceContext.Provider value={value}>
      {children}
    </HeartcoinBalanceContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to access the heartcoin balance state and functions.
 * The balance updates in real-time via Supabase subscription and triggers
 * celebration animations when the balance increases.
 */
export function useHeartcoinBalance() {
  const context = useContext(HeartcoinBalanceContext);
  if (context === undefined) {
    throw new Error("useHeartcoinBalance must be used within a HeartcoinBalanceProvider");
  }
  return context;
}

/**
 * Optional hook that safely returns null if used outside provider.
 * Useful for components that may be rendered before provider is available.
 */
export function useHeartcoinBalanceSafe() {
  return useContext(HeartcoinBalanceContext);
}
