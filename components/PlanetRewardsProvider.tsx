'use client';

import React, { createContext, useContext, useCallback, ReactNode, useState, useEffect, useRef } from 'react';
import { ElementType, PlanetReward } from '@/lib/usePlanetRewards';
import { useAuth } from '@/app/providers/AuthProvider';
import PlanetRewardCelebration from './PlanetRewardCelebration';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { triggerHeartCoinCelebration } from '@/utils/heartcoinCelebration';
import { logHeartcoinTransaction } from '@/utils/heartcoins';

interface PlanetRewardsContextValue {
  claimPlanetReward: (element: ElementType) => Promise<PlanetReward | null>;
  isClaimingReward: boolean;
  cooldownActive: boolean;
  error: string | null;
  clearError: () => void;
  isAuthenticated: boolean;
  elementOfDay: ElementType | null;
  intentionOfDay: string | null; // Today's intention text from element_of_day table
  songOfDayTitle: string | null; // Today's song title from element_of_day table
  songOfDaySlug: string | null; // Today's song slug for warp navigation
  claimedToday: boolean;
  isSyncing: boolean; // True when element of day is being refetched (e.g., after midnight rollover)
  refetchElementOfDay: () => Promise<void>; // Force refetch element of day from server
}

const PlanetRewardsContext = createContext<PlanetRewardsContextValue | null>(null);

interface PlanetRewardsProviderProps {
  children: ReactNode;
  onRelicClaimed?: () => void; // Callback to refresh relics
  onBoostClaimed?: () => void; // Callback to refresh boosts
  onSignInRequired?: () => void; // Callback when sign in is needed
  onClaimsRefetch?: () => void; // Callback to refresh user_element_claims
  onQuestsRefetch?: () => void; // Callback to refresh daily quests
}

function normalizeElement(s: string | null | undefined): ElementType | null {
  const v = String(s || "").toLowerCase();
  if (["heart", "water", "lightning", "darkness"].includes(v)) return v as ElementType;
  return null;
}

export function PlanetRewardsProvider({
  children,
  onRelicClaimed,
  onBoostClaimed,
  onSignInRequired,
  onClaimsRefetch,
  onQuestsRefetch,
}: PlanetRewardsProviderProps) {
  const { user } = useAuth();
  // Local state fully governs Element-of-Day flow and UI
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [lastReward, setLastReward] = useState<PlanetReward | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = !!user;
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Element of the day - only this element's planet can give rewards
  const [elementOfDay, setElementOfDay] = useState<ElementType | null>(null);
  const [intentionOfDay, setIntentionOfDay] = useState<string | null>(null);
  const [songOfDayTitle, setSongOfDayTitle] = useState<string | null>(null);
  const [songOfDaySlug, setSongOfDaySlug] = useState<string | null>(null);
  const [claimedToday, setClaimedToday] = useState<boolean>(false);
  // Store server date for consistency with backend
  const [serverDate, setServerDate] = useState<string | null>(null);
  // True when element is being synced (refetched after midnight rollover or error)
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Function to fetch today's element from server API
  const fetchTodayElement = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Fetch from server API to get server-time based "today"
      const res = await fetch('/api/element-of-day');
      if (!res.ok) {
        console.warn('Error fetching element-of-day API:', res.status);
        setElementOfDay(null);
        setIsSyncing(false);
        return null;
      }
      const data = await res.json();
      if (data.error) {
        console.warn('Error in element-of-day API:', data.error);
        setElementOfDay(null);
        setIsSyncing(false);
        return null;
      }
      const normalized = normalizeElement(data.element);
      setElementOfDay(normalized);
      setIntentionOfDay(data.intentionOfDay ?? null);
      setSongOfDayTitle(data.songOfDayTitle ?? null);
      setSongOfDaySlug(data.songOfDaySlug ?? null);
      setServerDate(data.serverDate);
      setIsSyncing(false);
      return data.serverDate;
    } catch (err) {
      console.error('Failed to fetch element-of-day:', err);
      setElementOfDay(null);
      setIsSyncing(false);
      return null;
    }
  }, []);

  // Fetch today's element and whether current user has claimed
  const fetchRunRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function fetchTodayAndClaim() {
      try {
        // 1) Fetch the element of the day from server API (uses server time)
        const dateToCheck = await fetchTodayElement();

        if (cancelled) return;

        // 2) Check if this user has already claimed today
        if (user?.id && dateToCheck) {
          const { count, error: claimErr } = await supabaseBrowser
            .from('user_element_claims')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('day', dateToCheck);

          if (cancelled) return;

          if (claimErr) {
            console.warn('Error fetching user_element_claims:', claimErr.message);
            setClaimedToday(false);
          } else {
            const alreadyClaimed = (count ?? 0) > 0;
            setClaimedToday(alreadyClaimed);
          }
        } else {
          setClaimedToday(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed initial Element-of-Day fetch:', err);
          setElementOfDay(null);
          setClaimedToday(false);
        }
      }
    }

    // Use a simple key for initial fetch detection
    const todayKey = `${user?.id || 'anon'}:init`;
    if (fetchRunRef.current === null) {
      fetchRunRef.current = todayKey;
      fetchTodayAndClaim();
    } else if (user?.id && !fetchRunRef.current.startsWith(user.id)) {
      // User changed, re-fetch
      fetchRunRef.current = todayKey;
      fetchTodayAndClaim();
    }
    return () => { cancelled = true; };
  }, [user?.id, fetchTodayElement]);

  // Full refetch: element + claim status - exposed for manual refresh (e.g., on app resume)
  const refetchElementOfDay = useCallback(async () => {
    const newDate = await fetchTodayElement();
    if (user?.id && newDate) {
      const { count } = await supabaseBrowser
        .from('user_element_claims')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('day', newDate);
      setClaimedToday((count ?? 0) > 0);
    }
  }, [user?.id, fetchTodayElement]);

  const claimPlanetReward = useCallback(async (element: ElementType): Promise<PlanetReward | null> => {
    // If user is not authenticated, still show the celebration but prompt sign in
    if (!user) {
      // Show the celebration display even without claiming
      const displayReward: PlanetReward = {
        type: 'BOOST',
        element,
        code: 'element_of_day_display',
        label: 'Sign in to claim your daily blessing',
      } as any;
      setLastReward(displayReward);
      onSignInRequired?.();
      return displayReward;
    }

    // Prevent duplicate claims while in-flight or during brief cooldown
    if (isClaimingReward || cooldownActive) return null;

    // Clear any pending cooldown
    if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);

    setIsClaimingReward(true);
    setError(null);

    try {
      const { data, error: rpcErr } = await supabaseBrowser.rpc('claim_element_of_day', { p_element: element });

      if (rpcErr) {
        const msg = String(rpcErr.message || '').toLowerCase();
        if (msg.includes('already claimed')) {
          // Consider it claimed for today; stop glow
          setClaimedToday(true);
          setIsClaimingReward(false);
          setCooldownActive(true);
          cooldownTimeoutRef.current = setTimeout(() => setCooldownActive(false), 1200);

          // Ensure quest is marked completed in localStorage (idempotent)
          const questDateKey = serverDate || new Date().toISOString().split('T')[0];
          try {
            localStorage.setItem(`quest_element_${questDateKey}`, 'true');
          } catch {}

          // Dispatch event so QuestList updates (idempotent)
          try {
            window.dispatchEvent(new CustomEvent('element-of-day-claimed', {
              detail: { element, source: 'already-claimed' }
            }));
          } catch {}

          // Still show the celebration with the element of day info
          const displayReward: PlanetReward = {
            type: 'BOOST',
            element,
            code: 'element_of_day_claimed',
            label: 'Already claimed today',
          } as any;
          setLastReward(displayReward);
          return displayReward;
        }
        if (msg.includes('wrong element')) {
          // Element of the Day just changed - auto-refetch and show friendly message
          setError('The Element of the Day just changed. Syncing…');
          setIsClaimingReward(false);
          try {
            window.dispatchEvent(new CustomEvent('toast:show', {
              detail: { message: 'The Element of the Day just changed. Syncing…', type: 'info' }
            }));
          } catch {}
          // Auto-refetch to get the new element and claim status
          setTimeout(async () => {
            const newDate = await fetchTodayElement();
            // Also re-check claim status for the new date
            if (user?.id && newDate) {
              const { count } = await supabaseBrowser
                .from('user_element_claims')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('day', newDate);
              setClaimedToday((count ?? 0) > 0);
            }
            setError(null);
            // Notify UI that element has changed
            try {
              window.dispatchEvent(new CustomEvent('element-of-day-changed', {
                detail: { serverDate: newDate }
              }));
            } catch {}
          }, 500);
          return null;
        }
        setError('Could not claim reward, try again');
        setIsClaimingReward(false);
        return null;
      }

      // Success: mark claimed and show confirmation UI
      setClaimedToday(true);
      setIsClaimingReward(false);
      setCooldownActive(true);
      cooldownTimeoutRef.current = setTimeout(() => setCooldownActive(false), 1200);

      // Create a lightweight confirmation reward object for UI only
      const reward: PlanetReward = {
        type: 'BOOST',
        element,
        code: 'element_of_day_claimed',
        label: 'Daily blessing received',
      } as any;

      setLastReward(reward);

      // Award listening boost to user_active_boosts
      try {
        const boostPayload = {
          user_id: user.id,
          boost_key: 'boost_listening',
          scope: 'listen_rewards',
          source: 'element_of_day',
          multiplier: 2,
          add_amount: 0,
          uses_total: 1,
          uses_remaining: 1,
          starts_at: new Date().toISOString(),
          expires_at: null,
        };

        const { error: boostError } = await supabaseBrowser
          .from('user_active_boosts')
          .insert(boostPayload);

        if (boostError) {
          console.warn('[PlanetRewardsProvider] Failed to insert boost:', boostError.message);
        } else {
          console.log('[PlanetRewardsProvider] Boost awarded: boost_listening');
        }
      } catch (boostErr) {
        console.error('[PlanetRewardsProvider] Error awarding boost:', boostErr);
      }

      // Award HeartCoin for element of the day quest completion
      try {
        await logHeartcoinTransaction(supabaseBrowser, {
          user_id: user.id,
          amount: 1,
          reason: 'ELEMENT_OF_DAY',
          description: 'Element of the Day reward (via warp)',
          transaction_type: 'bonus',
          metadata: { element, source: 'warp' }
        });
      } catch (err) {
        console.warn('Failed to log HeartCoin transaction:', err);
      }

      // Trigger HeartCoin celebration animation
      triggerHeartCoinCelebration(1);

      // Update localStorage for quest tracking (syncs with QuestList)
      // Use serverDate to ensure consistency with backend
      const questDateKey = serverDate || new Date().toISOString().split('T')[0];
      try {
        localStorage.setItem(`quest_element_${questDateKey}`, 'true');
      } catch {}

      // Dispatch event so QuestList can update its state immediately
      try {
        window.dispatchEvent(new CustomEvent('element-of-day-claimed', {
          detail: { element, source: 'warp' }
        }));
      } catch {}

      // Let host screens refresh if needed
      setTimeout(() => {
        try { onBoostClaimed?.(); } catch {}
        try { onRelicClaimed?.(); } catch {}
        try { onClaimsRefetch?.(); } catch {}
        try { onQuestsRefetch?.(); } catch {}
      }, 100);

      return reward;
    } catch (err) {
      console.error('Element-of-Day claim error:', err);
      setIsClaimingReward(false);
      setError('Could not claim reward, try again');
      return null;
    }
  }, [user, isClaimingReward, cooldownActive, serverDate, onBoostClaimed, onRelicClaimed, onSignInRequired, onClaimsRefetch, onQuestsRefetch, fetchTodayElement]);

  const handleCelebrationComplete = useCallback(() => {
    setLastReward(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <PlanetRewardsContext.Provider
      value={{
        claimPlanetReward,
        isClaimingReward,
        cooldownActive,
        error,
        clearError,
        isAuthenticated,
        elementOfDay,
        intentionOfDay,
        songOfDayTitle,
        songOfDaySlug,
        claimedToday,
        isSyncing,
        refetchElementOfDay,
      }}
    >
      {children}
      <PlanetRewardCelebration
        reward={lastReward}
        intentionOfDay={intentionOfDay}
        onComplete={handleCelebrationComplete}
      />
    </PlanetRewardsContext.Provider>
  );
}

export function usePlanetRewardsContext() {
  const context = useContext(PlanetRewardsContext);
  // Return a no-op implementation if context is not available
  // This allows components to work even outside the provider
  if (!context) {
    return {
      claimPlanetReward: async () => null,
      isClaimingReward: false,
      cooldownActive: false,
      error: null,
      clearError: () => {},
      isAuthenticated: false,
      elementOfDay: null as ElementType | null,
      intentionOfDay: null as string | null,
      claimedToday: false,
      isSyncing: false,
      refetchElementOfDay: async () => {},
    };
  }
  return context;
}

// Higher-order component to wrap planet click handlers with reward claiming
export function withPlanetRewards<P extends { onPlanetSelect?: (planetId: string) => void }>(
  Component: React.ComponentType<P>
) {
  return function WithPlanetRewards(props: P) {
    const { claimPlanetReward, isClaimingReward, cooldownActive, elementOfDay, claimedToday } = usePlanetRewardsContext();

    const handlePlanetSelect = useCallback((planetId: string) => {
      // Only claim rewards for element planets, not center or song planets
      const elementPlanets: ElementType[] = ['heart', 'water', 'lightning', 'darkness'];

      if (elementPlanets.includes(planetId as ElementType)) {
        // Only allow clicking the element of the day for daily rewards
        // Other element planets are not clickable for rewards
        if (planetId === elementOfDay && !claimedToday && !isClaimingReward && !cooldownActive) {
          claimPlanetReward(planetId as ElementType);
        }
        // Block non-today element clicks entirely
        return;
      }

      // Always call the original handler for song selection etc
      props.onPlanetSelect?.(planetId);
    }, [claimPlanetReward, isClaimingReward, cooldownActive, elementOfDay, claimedToday, props.onPlanetSelect]);

    return <Component {...props} onPlanetSelect={handlePlanetSelect} />;
  };
}
