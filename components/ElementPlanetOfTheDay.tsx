"use client";

import React, { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { getRandomRewardForRitual, PlanetReward, rarityLabel } from "@/lib/planetRewards";

// RewardRevealModal component
type RewardRevealModalProps = {
  reward: PlanetReward;
  onClose: () => void;
};

function RewardRevealModal({ reward, onClose }: RewardRevealModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="max-w-sm w-full rounded-2xl bg-slate-900/95 border border-pink-400/40 p-4 shadow-2xl">
        <h2 className="text-center text-sm font-semibold text-pink-300 mb-2">
          The ritual is complete
        </h2>
        <p className="text-center text-xs text-slate-300 mb-4">
          The Element of the Day has sent you a gift
        </p>

        <div className="flex flex-col items-center gap-3 mb-4">
          {reward.image_url && (
            <img
              src={reward.image_url}
              alt={reward.label}
              className="h-20 w-20 rounded-xl object-contain"
            />
          )}
          <div className="text-center">
            <p className="text-base font-semibold text-white">
              {reward.label}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
              {rarityLabel(reward.rarity)} reward
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {reward.kind === "HEART_COIN" &&
                "Your Heart balance has pulsed a little brighter."}
              {reward.kind === "CARD_SLOT" &&
                "Your binder has unlocked a new cosmic slot."}
              {reward.kind === "DOWNLOAD" &&
                "A piece of the Heartverse is now yours to keep."}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-pink-500/90 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-pink-400 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// Main ElementPlanetOfTheDay component
interface ElementPlanetOfTheDayProps {
  className?: string;
}

export default function ElementPlanetOfTheDay({ className = "" }: ElementPlanetOfTheDayProps) {
  const [isRitualRunning, setIsRitualRunning] = useState(false);
  const [revealedReward, setRevealedReward] = useState<PlanetReward | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = supabaseClient;

  async function applyRewardForUser(reward: PlanetReward) {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) {
      throw new Error("User not logged in");
    }

    if (reward.kind === "HEART_COIN") {
      const amount = reward.heart_amount ?? 0;
      if (amount <= 0) return;

      const { error } = await supabase.from("heartcoin_transactions").insert({
        user_id: userId,
        amount,
        reason: "ELEMENT_PLANET_RITUAL",
        source: "element_planet",
      });

      if (error) {
        throw error;
      }
    }

    if (reward.kind === "CARD_SLOT") {
      const { error } = await supabase.rpc("increment_card_slots", {
        p_user_id: userId,
        p_amount: 1,
      });

      if (error) {
        throw error;
      }
    }

    if (reward.kind === "DOWNLOAD" && reward.file_url) {
      // trigger browser download of reward.file_url
      const link = document.createElement("a");
      link.href = reward.file_url;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  async function handleElementPlanetClick() {
    if (isRitualRunning) return;

    setErrorMessage(null);
    setRevealedReward(null);
    setShowRewardModal(false);
    setIsRitualRunning(true);

    try {
      // Wait about 2.0 to 2.5 seconds to simulate the ritual
      await new Promise((resolve) => setTimeout(resolve, 2200));

      const reward = await getRandomRewardForRitual();

      // Immediately apply the reward effects (heart coins, card slot, or download)
      await applyRewardForUser(reward);

      // Save it for the modal and show it
      setRevealedReward(reward);
      setShowRewardModal(true);
    } catch (err: any) {
      console.error("Element ritual reward error", err);
      setErrorMessage("The ritual glitched. Please try again.");
    } finally {
      setIsRitualRunning(false);
    }
  }

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          onClick={handleElementPlanetClick}
          disabled={isRitualRunning}
          className="relative w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500 border-2 border-pink-300/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Planet visual */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 animate-pulse" />
          
          {/* Center symbol */}
          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            ✨
          </div>

          {/* Ritual progress overlay */}
          {isRitualRunning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
              <div className="text-center">
                <div className="animate-spin w-6 h-6 border-2 border-pink-300 border-t-transparent rounded-full mx-auto mb-1" />
                <span className="text-[8px] text-pink-200 font-medium">
                  Ritual...
                </span>
              </div>
            </div>
          )}
        </button>

        {/* Label */}
        <div className="text-center mt-2">
          <p className="text-xs text-slate-300 font-medium">
            Element Planet
          </p>
          <p className="text-[10px] text-slate-400">
            of the Day
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-2 text-xs text-red-400 text-center">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Reward reveal modal */}
      {showRewardModal && revealedReward && (
        <RewardRevealModal
          reward={revealedReward}
          onClose={() => setShowRewardModal(false)}
        />
      )}
    </>
  );
}