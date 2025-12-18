'use client';

import React, { createContext, useContext, useCallback, ReactNode, useState, useEffect } from 'react';
import { usePlanetRewards, ElementType, PlanetReward } from '@/lib/usePlanetRewards';
import { useAuth } from '@/app/providers/AuthProvider';
import PlanetRewardCelebration from './PlanetRewardCelebration';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { getLocalDateString } from '@/utils/dateHelpers';

interface PlanetRewardsContextValue {
  claimPlanetReward: (element: ElementType) => Promise<PlanetReward | null>;
  isClaimingReward: boolean;
  cooldownActive: boolean;
  error: string | null;
  clearError: () => void;
  isAuthenticated: boolean;
  elementOfDay: ElementType | null;
}

const PlanetRewardsContext = createContext<PlanetRewardsContextValue | null>(null);

interface PlanetRewardsProviderProps {
  children: ReactNode;
  onRelicClaimed?: () => void; // Callback to refresh relics
  onBoostClaimed?: () => void; // Callback to refresh boosts
  onSignInRequired?: () => void; // Callback when sign in is needed
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
}: PlanetRewardsProviderProps) {
  const { user } = useAuth();
  const {
    isClaimingReward,
    cooldownActive,
    lastReward,
    error,
    claimReward,
    clearReward,
    clearError,
    isAuthenticated,
  } = usePlanetRewards();

  // Element of the day - only this element's planet can give rewards
  const [elementOfDay, setElementOfDay] = useState<ElementType | null>(null);

  // Fetch element of the day from soul_daily_prompts
  useEffect(() => {
    async function fetchElementOfDay() {
      try {
        const today = getLocalDateString();
        const { data, error: fetchError } = await supabaseBrowser
          .from("soul_daily_prompts")
          .select("element")
          .eq("prompt_date", today)
          .maybeSingle();

        if (fetchError) {
          console.warn("Error fetching element of day for rewards:", fetchError.message);
          setElementOfDay("heart"); // fallback
        } else if (data?.element) {
          const normalized = normalizeElement(data.element);
          setElementOfDay(normalized || "heart");
          console.log("Planet rewards - element of day:", normalized || "heart");
        } else {
          setElementOfDay("heart"); // fallback if no entry
        }
      } catch (err) {
        console.error("Failed to fetch element of day for rewards:", err);
        setElementOfDay("heart");
      }
    }

    fetchElementOfDay();
  }, []);

  const claimPlanetReward = useCallback(async (element: ElementType): Promise<PlanetReward | null> => {
    // Check authentication first
    if (!user) {
      onSignInRequired?.();
      return null;
    }

    const reward = await claimReward(element);

    if (reward) {
      // Trigger appropriate callback after a delay to let celebration show
      setTimeout(() => {
        if (reward.type === 'RELIC') {
          onRelicClaimed?.();
        } else if (reward.type === 'BOOST') {
          onBoostClaimed?.();
        }
      }, 100);
    }

    return reward;
  }, [user, claimReward, onRelicClaimed, onBoostClaimed, onSignInRequired]);

  const handleCelebrationComplete = useCallback(() => {
    clearReward();
  }, [clearReward]);

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
      }}
    >
      {children}
      <PlanetRewardCelebration
        reward={lastReward}
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
    };
  }
  return context;
}

// Higher-order component to wrap planet click handlers with reward claiming
export function withPlanetRewards<P extends { onPlanetSelect?: (planetId: string) => void }>(
  Component: React.ComponentType<P>
) {
  return function WithPlanetRewards(props: P) {
    const { claimPlanetReward, isClaimingReward, cooldownActive, elementOfDay } = usePlanetRewardsContext();

    const handlePlanetSelect = useCallback((planetId: string) => {
      // Only claim rewards for element planets, not center or song planets
      const elementPlanets: ElementType[] = ['heart', 'water', 'lightning', 'darkness'];

      if (elementPlanets.includes(planetId as ElementType)) {
        // Only allow clicking the element of the day for daily rewards
        // Other element planets are not clickable for rewards
        if (planetId === elementOfDay && !isClaimingReward && !cooldownActive) {
          claimPlanetReward(planetId as ElementType);
        }
      }

      // Always call the original handler for song selection etc
      props.onPlanetSelect?.(planetId);
    }, [claimPlanetReward, isClaimingReward, cooldownActive, elementOfDay, props.onPlanetSelect]);

    return <Component {...props} onPlanetSelect={handlePlanetSelect} />;
  };
}
