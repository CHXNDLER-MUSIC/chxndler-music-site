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
  
  // Global modal management
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  isModalOpen: (modalId: string) => boolean;
}

export const useUIStore = create<UIState>((set, get) => ({
  showNamePrompt: false,
  namePromptFromAuth: false,
  openNamePrompt: () => set({ showNamePrompt: true, namePromptFromAuth: false }),
  openNamePromptFromAuth: () => set({ showNamePrompt: true, namePromptFromAuth: true }),
  closeNamePrompt: () => set({ showNamePrompt: false, namePromptFromAuth: false }),
  showElementSelection: false,
  openElementSelection: () => set({ showElementSelection: true }),
  closeElementSelection: () => set({ showElementSelection: false }),
  profileRefreshTrigger: 0,
  triggerProfileRefresh: () => set((state) => ({ profileRefreshTrigger: state.profileRefreshTrigger + 1 })),
  
  // Global modal management
  activeModal: null,
  openModal: (modalId: string) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  isModalOpen: (modalId: string) => get().activeModal === modalId,
}));