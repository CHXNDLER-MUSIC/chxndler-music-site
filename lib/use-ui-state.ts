"use client";

import { create } from "zustand";

type UIState = {
  hasEnteredHeartverse: boolean;
  setHasEnteredHeartverse: (value: boolean) => void;
  // Convenience action matching requested API
  enterHeartverse: () => void;
};

// No persistence - ProfileBar should always start hidden on each page load
export const useUIState = create<UIState>()((set) => ({
  hasEnteredHeartverse: false,
  setHasEnteredHeartverse: (value) => set({ hasEnteredHeartverse: value }),
  enterHeartverse: () => set({ hasEnteredHeartverse: true }),
}));
