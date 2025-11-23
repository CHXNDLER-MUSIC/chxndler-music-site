// Card tier types
export type CardTier = "wanderer" | "dreamer" | "lover";
export type ProfileTier = "wanderer" | "dreamer" | "lover";

// Card interface
export interface Card {
  id: string;
  title: string;
  image_url: string;
  element: string;
  rarity: string;
  card_name: string;
  // New fields for lock system
  is_released: boolean;
  min_tier: CardTier;
}

// Utility functions for card lock system
const TIER_ORDER: ProfileTier[] = ["wanderer", "dreamer", "lover"];

export function isCardLocked(card: Card, userTier: ProfileTier | undefined): boolean {
  // unreleased cards are always locked
  if (!card.is_released) return true;

  const user = (userTier || "wanderer").toLowerCase() as ProfileTier;
  const min = (card.min_tier || "wanderer").toLowerCase() as CardTier;

  const userIndex = TIER_ORDER.indexOf(user);
  const minIndex = TIER_ORDER.indexOf(min);

  if (userIndex === -1 || minIndex === -1) return false;

  // locked if user tier is below required tier
  return userIndex < minIndex;
}