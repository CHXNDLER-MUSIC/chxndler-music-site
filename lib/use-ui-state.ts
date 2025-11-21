"use client";

import { create } from "zustand";

type UIState = {
  hasEnteredHeartverse: boolean;
  setHasEnteredHeartverse: (value: boolean) => void;
};

export const useUIState = create<UIState>((set) => ({
  hasEnteredHeartverse: false,
  setHasEnteredHeartverse: (value) => set({ hasEnteredHeartverse: value }),
}));