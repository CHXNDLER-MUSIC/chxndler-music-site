"use client";

import { create } from 'zustand';

interface UIState {
  showNamePrompt: boolean;
  namePromptFromAuth: boolean; // Track if opened from auth callback
  openNamePrompt: () => void;
  openNamePromptFromAuth: () => void;
  closeNamePrompt: () => void;
  showElementSelection: boolean;
  openElementSelection: () => void;
  closeElementSelection: () => void;
  profileRefreshTrigger: number;
  triggerProfileRefresh: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  showNamePrompt: false,
  namePromptFromAuth: false,
  openNamePrompt: () => set({ showNamePrompt: true, namePromptFromAuth: false }),
  openNamePromptFromAuth: () => {
    console.log('🎯 UI Store: openNamePromptFromAuth called');
    set({ showNamePrompt: true, namePromptFromAuth: true });
  },
  closeNamePrompt: () => set({ showNamePrompt: false, namePromptFromAuth: false }),
  showElementSelection: false,
  openElementSelection: () => set({ showElementSelection: true }),
  closeElementSelection: () => set({ showElementSelection: false }),
  profileRefreshTrigger: 0,
  triggerProfileRefresh: () => set((state) => ({ profileRefreshTrigger: state.profileRefreshTrigger + 1 })),
}));