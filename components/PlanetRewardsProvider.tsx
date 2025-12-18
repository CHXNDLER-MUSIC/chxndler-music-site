'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { usePlanetRewards, ElementType, PlanetReward } from '@/lib/usePlanetRewards';
import { useAuth } from '@/app/providers/AuthProvider';
import PlanetRewardCelebration from './PlanetRewardCelebration';

interface PlanetRewardsContextValue {
  claimPlanetReward: (element: ElementType) => Promise<PlanetReward | null>;
  isClaimingReward: boolean;
  cooldownActive: boolean;
  error: string | null;
  clearError: () => void;
  isAuthenticated: boolean;
}

const PlanetRewardsContext = createContext<PlanetRewardsContextValue | null>(null);

interface PlanetRewardsProviderProps {
  children: ReactNode;
  onRelicClaimed?: () => void; // Callback to refresh relics
  onBoostClaimed?: () => void; // Callback to refresh boosts
  onSignInRequired?: () => void; // Callback when sign in is needed
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
    };
  }
  return context;
}

// Higher-order component to wrap planet click handlers with reward claiming
export function withPlanetRewards<P extends { onPlanetSelect?: (planetId: string) => void }>(
  Component: React.ComponentType<P>
) {
  return function WithPlanetRewards(props: P) {
    const { claimPlanetReward, isClaimingReward, cooldownActive } = usePlanetRewardsContext();

    const handlePlanetSelect = useCallback((planetId: string) => {
      // Only claim rewards for element planets, not center or song planets
      const elementPlanets: ElementType[] = ['heart', 'water', 'lightning', 'darkness'];

      if (elementPlanets.includes(planetId as ElementType)) {
        // Don't block if already claiming - the hook handles that
        if (!isClaimingReward && !cooldownActive) {
          claimPlanetReward(planetId as ElementType);
        }
      }

      // Always call the original handler for song selection etc
      props.onPlanetSelect?.(planetId);
    }, [claimPlanetReward, isClaimingReward, cooldownActive, props.onPlanetSelect]);

    return <Component {...props} onPlanetSelect={handlePlanetSelect} />;
  };
}
