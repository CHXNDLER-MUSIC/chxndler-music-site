'use client';

import { useState, useCallback, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useAuth } from '@/app/providers/AuthProvider';

export type ElementType = 'heart' | 'water' | 'lightning' | 'darkness';

export interface RelicReward {
  type: 'RELIC';
  element: string;
  code: string;
  relic_id: string;
  label: string;
  image_url: string | null;
}

export interface BoostReward {
  type: 'BOOST';
  element: string;
  code: string;
  label: string;
}

export type PlanetReward = RelicReward | BoostReward;

export interface PlanetRewardsState {
  isClaimingReward: boolean;
  lastReward: PlanetReward | null;
  error: string | null;
  cooldownActive: boolean;
}

const COOLDOWN_MS = 1200;

// Boost descriptions by code
export const BOOST_DESCRIPTIONS: Record<string, string> = {
  boost_reflection: 'Next journal entry gives +1 HeartCoin',
  boost_streak_shield: 'Miss tomorrow and your streak will not break',
  boost_deep_focus: 'Next listen counts as 2 toward listening badges',
};

export function usePlanetRewards() {
  const { user } = useAuth();
  const [state, setState] = useState<PlanetRewardsState>({
    isClaimingReward: false,
    lastReward: null,
    error: null,
    cooldownActive: false,
  });

  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const claimReward = useCallback(async (element: ElementType): Promise<PlanetReward | null> => {
    // Check if user is authenticated
    if (!user) {
      setState(prev => ({ ...prev, error: 'Please sign in to claim rewards' }));
      return null;
    }

    // Check if already claiming or in cooldown
    if (state.isClaimingReward || state.cooldownActive) {
      return null;
    }

    // Clear any pending cooldown
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
    }

    setState(prev => ({ ...prev, isClaimingReward: true, error: null }));

    try {
      const { data, error } = await supabaseBrowser.rpc('claim_planet_click_reward', {
        p_element: element
      });

      if (error) {
        console.error('Planet reward RPC error:', error);
        setState(prev => ({
          ...prev,
          isClaimingReward: false,
          error: 'Could not claim reward, try again'
        }));
        return null;
      }

      const reward = data as PlanetReward;

      setState(prev => ({
        ...prev,
        isClaimingReward: false,
        lastReward: reward,
        cooldownActive: true,
      }));

      // Start cooldown timer
      cooldownTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, cooldownActive: false }));
      }, COOLDOWN_MS);

      return reward;
    } catch (err) {
      console.error('Planet reward error:', err);
      setState(prev => ({
        ...prev,
        isClaimingReward: false,
        error: 'Could not claim reward, try again'
      }));
      return null;
    }
  }, [user, state.isClaimingReward, state.cooldownActive]);

  const clearReward = useCallback(() => {
    setState(prev => ({ ...prev, lastReward: null }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    claimReward,
    clearReward,
    clearError,
    isAuthenticated: !!user,
  };
}
