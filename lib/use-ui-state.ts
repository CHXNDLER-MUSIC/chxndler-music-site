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
  // Track if user has clicked the START button
  userClickedStart: boolean;
  setUserClickedStart: (value: boolean) => void;
  // Planetarium camera + selection state
  selectedPlanetId: string | null;
  setSelectedPlanetId: (id: string | null) => void;
  focusedPlanetId: string | null;
  setFocusedPlanetId: (id: string | null) => void;
  cameraMode: 'free' | 'animating' | 'locked';
  setCameraMode: (mode: 'free' | 'animating' | 'locked') => void;
  isUserInteracting: boolean;
  setIsUserInteracting: (v: boolean) => void;
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
      userClickedStart: false,
      setUserClickedStart: (value) => {
        if (typeof window !== 'undefined') {
          console.log("🚀 HeartverseState: setUserClickedStart", {
            previousValue: get().userClickedStart,
            newValue: value,
            timestamp: new Date().toISOString()
          });
        }
        set({ userClickedStart: value });
      },
      // Planetarium camera + selection state (non-persistent)
      selectedPlanetId: null,
      setSelectedPlanetId: (id) => {
        if (typeof window !== 'undefined') {
          console.log('🎯 UIState: setSelectedPlanetId', { id });
        }
        set({ selectedPlanetId: id });
      },
      focusedPlanetId: null,
      setFocusedPlanetId: (id) => {
        if (typeof window !== 'undefined') {
          console.log('🎯 UIState: setFocusedPlanetId', { id });
        }
        set({ focusedPlanetId: id });
      },
      cameraMode: 'free',
      setCameraMode: (mode) => {
        if (typeof window !== 'undefined') {
          console.log('🎯 UIState: setCameraMode', { mode });
        }
        set({ cameraMode: mode });
      },
      isUserInteracting: false,
      setIsUserInteracting: (v) => {
        if (typeof window !== 'undefined') {
          console.log('🎯 UIState: setIsUserInteracting', { v });
        }
        set({ isUserInteracting: v });
      },
    }),
    {
      name: 'heartverse-state',
      partialize: (state) => ({ hasEnteredHeartverse: state.hasEnteredHeartverse }),
    }
  )
);
