import { supabaseClient } from "@/lib/supabaseClient";

export type RewardKind = "HEART_COIN" | "CARD_SLOT" | "DOWNLOAD" | "RELIC";

export type RewardRarity = 1 | 2 | 3;

export interface PlanetReward {
  id: string;
  code: string;
  label: string;
  kind: RewardKind;
  rarity: RewardRarity;
  heart_amount: number | null;
  image_url: string | null;
  file_url: string | null;
}

export function pickRarityOptionA(): RewardRarity {
  const r = Math.random();
  if (r < 0.10) return 3;           // rare 10%
  if (r < 0.10 + 0.25) return 2;    // uncommon 25%
  return 1;                         // common 65%
}

export function rarityLabel(rarity: RewardRarity): string {
  if (rarity === 3) return "rare";
  if (rarity === 2) return "uncommon";
  return "common";
}

export async function getRandomRewardForRitual(): Promise<PlanetReward> {
  const supabase = supabaseClient;

  const rarity = pickRarityOptionA();

  // Try to get rewards for the chosen rarity
  const { data, error } = await supabase
    .from("planet_rewards")
    .select("*")
    .eq("rarity", rarity)
    .eq("is_active", true);

  let availableRewards = data;

  // If no rewards found for this rarity or there was an error, fall back to any active rewards
  if (error || !data || data.length === 0) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("planet_rewards")
      .select("*")
      .eq("is_active", true);

    if (fallbackError || !fallbackData || fallbackData.length === 0) {
      throw new Error("No active rewards available in the planet rewards system");
    }

    availableRewards = fallbackData;
  }

  // Choose one reward at random from the available rewards
  const randomIndex = Math.floor(Math.random() * availableRewards.length);
  const selectedReward = availableRewards[randomIndex];

  return {
    id: selectedReward.id,
    code: selectedReward.code,
    label: selectedReward.label,
    kind: selectedReward.kind as RewardKind,
    rarity: selectedReward.rarity as RewardRarity,
    heart_amount: selectedReward.heart_amount,
    image_url: selectedReward.image_url,
    file_url: selectedReward.file_url,
  };
}