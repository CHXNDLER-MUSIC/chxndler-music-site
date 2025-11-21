"use client";

import { create } from 'zustand';

interface UIState {
  showNamePrompt: boolean;
  openNamePrompt: () => void;
  closeNamePrompt: () => void;
  showElementSelection: boolean;
  openElementSelection: () => void;
  closeElementSelection: () => void;
  profileRefreshTrigger: number;
  triggerProfileRefresh: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  showNamePrompt: false,
  openNamePrompt: () => set({ showNamePrompt: true }),
  closeNamePrompt: () => set({ showNamePrompt: false }),
  showElementSelection: false,
  openElementSelection: () => set({ showElementSelection: true }),
  closeElementSelection: () => set({ showElementSelection: false }),
  profileRefreshTrigger: 0,
  triggerProfileRefresh: () => set((state) => ({ profileRefreshTrigger: state.profileRefreshTrigger + 1 })),
}));