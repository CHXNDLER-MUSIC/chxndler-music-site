import { TIER_ORDER, Tier, tierRank } from './tier';

export interface Card {
  id: string;
  title?: string;
  card_name: string;
  element?: string;
  rarity?: string;
  image_url?: string;
  is_released: boolean;
  min_tier: Tier;
}

export interface Profile {
  id: string;
  tier?: string;
}

export interface UserCard {
  user_id: string;
  card_id: string;
  card_name?: string;
}

export type CardGateState = "comingSoon" | "lockedTier" | "available" | "owned";

export function getCardGateState(
  card: Card, 
  profile: Profile | null, 
  userCards: UserCard[]
): CardGateState {
  // Check if user owns this card
  const isOwned = userCards.some(userCard => 
    userCard.card_id === card.id || userCard.card_name === card.card_name
  );
  
  if (isOwned) {
    return "owned";
  }
  
  // Check if card is released
  if (!card.is_released) {
    return "comingSoon";
  }
  
  // Check tier requirements
  if (!profile?.tier) {
    // No profile means lowest tier (wanderer)
    const userTierRank = 0;
    const requiredTierRank = tierRank(card.min_tier);
    
    if (userTierRank < requiredTierRank) {
      return "lockedTier";
    }
  } else {
    const userTier = profile.tier.toLowerCase() as Tier;
    if (TIER_ORDER.includes(userTier)) {
      const userTierRank = tierRank(userTier);
      const requiredTierRank = tierRank(card.min_tier);
      
      if (userTierRank < requiredTierRank) {
        return "lockedTier";
      }
    }
  }
  
  return "available";
}