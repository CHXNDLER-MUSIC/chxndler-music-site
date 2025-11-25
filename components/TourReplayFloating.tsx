"use client";

import { useTour } from "@/contexts/TourContext";
import { useProfile } from "@/contexts/ProfileContext";

export default function TourReplayFloating() {
  const { start } = useTour();
  const { profile } = useProfile();

  // Only show once a profile exists (regardless of has_seen_tour)
  if (!profile) return null;

  return (
    <button
      onClick={start}
      className="fixed bottom-4 right-4 z-[220] text-white/70 hover:text-white text-xs underline decoration-cyan-400/50 hover:decoration-cyan-400 underline-offset-4 px-3 py-2 rounded-lg bg-black/30 border border-white/10 backdrop-blur-md"
      style={{ textShadow: '0 0 8px rgba(25,227,255,0.5)' }}
    >
      Show me around again
    </button>
  );
}

