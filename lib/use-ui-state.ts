"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type UIState = {
  hasEnteredHeartverse: boolean;
  setHasEnteredHeartverse: (value: boolean) => void;
  // Convenience action matching requested API
  enterHeartverse: () => void;
};

// Persist only the minimal UI flag in localStorage to keep the bar visible on refresh
export const useUIState = create<UIState>()(
  persist(
    (set) => ({
      hasEnteredHeartverse: false,
      setHasEnteredHeartverse: (value) => set({ hasEnteredHeartverse: value }),
      enterHeartverse: () => set({ hasEnteredHeartverse: true }),
    }),
    {
      name: "heartverse_entered",
      // Persist shape as { hasEnteredHeartverse: boolean }
      partialize: (state) => ({ hasEnteredHeartverse: state.hasEnteredHeartverse }),
    }
  )
);
