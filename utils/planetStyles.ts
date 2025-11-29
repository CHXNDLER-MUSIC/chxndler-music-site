export type ElementKey = "water" | "heart" | "lightning" | "darkness";
export type GateState = "comingSoon" | "lockedTier" | "available" | "owned";

export const ELEMENT_STYLES: Record<ElementKey, {
  coreColor: string;
  rimColor: string;
  innerGlow: string;
}> = {
  water: {
    coreColor: "#38B6FF",
    rimColor: "#1E6FA3",
    innerGlow: "#9BDEFF",
  },
  heart: {
    coreColor: "#FC54AF",
    rimColor: "#B32473",
    innerGlow: "#FFD1EC",
  },
  lightning: {
    coreColor: "#F2EF1D",
    rimColor: "#E0C91C",
    innerGlow: "#FFFFC2",
  },
  darkness: {
    coreColor: "#6A4C93",
    rimColor: "#9C7BB8",
    innerGlow: "#3A2B5C",
  },
};

// Helper function to determine card gate state
export function getCardGateState(
  card: any,
  profile: any,
  userCards: any[]
): GateState {
  // comingSoon - !is_released
  if (!card.is_released) {
    return "comingSoon";
  }

  // lockedTier - is_released true but user tier is less than card.min_tier
  const userTier = profile?.current_tier || 0;
  const minTier = card.min_tier || 0;
  if (userTier < minTier) {
    return "lockedTier";
  }

  // owned - is_released true, user tier >= card.min_tier, in user_cards
  const isOwned = userCards?.some(uc => uc.card_id === card.id);
  if (isOwned) {
    return "owned";
  }

  // available - is_released true, user tier >= card.min_tier, not in user_cards
  return "available";
}