"use client";

import { create } from "zustand";

type UIState = {
  hasEnteredHeartverse: boolean;
  setHasEnteredHeartverse: (value: boolean) => void;
  // Convenience action matching requested API
  enterHeartverse: () => void;
  // Track when warp effect fully completes (including sound effects)
  warpFullyComplete: boolean;
  setWarpFullyComplete: (value: boolean) => void;
};

// Clear any old persisted state from localStorage (one-time cleanup)
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("heartverse_entered");
  } catch (e) {
    // Ignore localStorage errors
  }
}

// No persistence - ProfileBar should always start hidden on each page load
export const useUIState = create<UIState>()((set) => ({
  hasEnteredHeartverse: false,
  setHasEnteredHeartverse: (value) => {
    if (typeof window !== 'undefined') {
      console.log("DEBUG useUIState setHasEnteredHeartverse", {
        browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
        newValue: value,
        timestamp: new Date().toISOString()
      });
    }
    set({ hasEnteredHeartverse: value });
  },
  enterHeartverse: () => {
    if (typeof window !== 'undefined') {
      console.log("DEBUG useUIState enterHeartverse", {
        browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
        timestamp: new Date().toISOString()
      });
    }
    set({ hasEnteredHeartverse: true });
  },
  warpFullyComplete: false,
  setWarpFullyComplete: (value) => {
    if (typeof window !== 'undefined') {
      console.log("DEBUG useUIState setWarpFullyComplete", {
        browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
        newValue: value,
        timestamp: new Date().toISOString()
      });
    }
    set({ warpFullyComplete: value });
  },
}));
