"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type UIState = {
  hasEnteredHeartverse: boolean;
  setHasEnteredHeartverse: (value: boolean) => void;
  // Convenience action matching requested API
  enterHeartverse: () => void;
  // Track when warp effect fully completes (including sound effects)
  warpFullyComplete: boolean;
  setWarpFullyComplete: (value: boolean) => void;
};

// Enhanced Heartverse state with persistence and clear debugging
export const useUIState = create<UIState>()(
  persist(
    (set, get) => ({
      hasEnteredHeartverse: false,
      setHasEnteredHeartverse: (value) => {
        if (typeof window !== 'undefined') {
          console.log("🚀 HeartverseState: setHasEnteredHeartverse", {
            previousValue: get().hasEnteredHeartverse,
            newValue: value,
            timestamp: new Date().toISOString()
          });
        }
        set({ hasEnteredHeartverse: value });
      },
      enterHeartverse: () => {
        if (typeof window !== 'undefined') {
          console.log("🚀 HeartverseState: enterHeartverse called", {
            previousValue: get().hasEnteredHeartverse,
            newValue: true,
            timestamp: new Date().toISOString()
          });
        }
        set({ hasEnteredHeartverse: true });
      },
      warpFullyComplete: false,
      setWarpFullyComplete: (value) => {
        if (typeof window !== 'undefined') {
          console.log("🚀 HeartverseState: setWarpFullyComplete", {
            previousValue: get().warpFullyComplete,
            newValue: value,
            timestamp: new Date().toISOString()
          });
        }
        set({ warpFullyComplete: value });
      },
    }),
    {
      name: 'heartverse-state',
      partialize: (state) => ({ hasEnteredHeartverse: state.hasEnteredHeartverse }),
    }
  )
);
