import { TIER_ORDER, Tier, tierRank, getTierDisplayName } from '../utils/tier';
import { getCardGateState, type CardGateState } from '../utils/cardGating';

// Re-export types for convenience
export type { Tier, CardGateState };
export { TIER_ORDER, tierRank, getTierDisplayName, getCardGateState };

// Legacy types - kept for backward compatibility
export type CardTier = Tier;
export type ProfileTier = Tier;

// Card interface
export interface Card {
  id: string;
  title?: string;
  image_url?: string;
  element?: string;
  rarity?: string;
  card_name: string;
  // Gating fields
  is_released: boolean;
  min_tier: Tier;
  // Legacy fields for compatibility
  name?: string;
  image?: string;
}

// Legacy utility function - kept for backward compatibility
export function isCardLocked(card: Card, userTier: Tier | string | undefined): boolean {
  // unreleased cards are always locked
  if (!card.is_released) return true;

  if (!userTier) return true;

  const user = userTier.toString().toLowerCase() as Tier;
  const min = (card.min_tier || "wanderer").toLowerCase() as Tier;

  if (!TIER_ORDER.includes(user) || !TIER_ORDER.includes(min)) return false;

  // locked if user tier is below required tier
  return tierRank(user) < tierRank(min);
}