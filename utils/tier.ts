export const TIER_ORDER = ["wanderer", "dreamer", "lover", "guide"] as const;
export type Tier = (typeof TIER_ORDER)[number];

export const tierRank = (tier: Tier) => TIER_ORDER.indexOf(tier);

export function getTierDisplayName(tier: Tier): string {
  const names = {
    wanderer: "Wanderer",
    dreamer: "Dreamer", 
    lover: "Lover",
    guide: "Guide"
  };
  return names[tier];
}