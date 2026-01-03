"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isDebug, debugLog } from "@/lib/debug";

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

// Enhanced Heartverse state with persistence and guards against redundant updates
export const useUIState = create<UIState>()(
  persist(
    (set, get) => ({
      hasEnteredHeartverse: false,
      setHasEnteredHeartverse: (value) => {
        const current = get().hasEnteredHeartverse;
        // Guard: skip if value unchanged
        if (current === value) return;
        if (isDebug()) {
          debugLog("🚀 HeartverseState: setHasEnteredHeartverse", {
            previousValue: current,
            newValue: value,
          });
        }
        set({ hasEnteredHeartverse: value });
      },
      enterHeartverse: () => {
        const current = get().hasEnteredHeartverse;
        // Guard: skip if already true
        if (current === true) return;
        if (isDebug()) {
          debugLog("🚀 HeartverseState: enterHeartverse called", {
            previousValue: current,
            newValue: true,
          });
        }
        set({ hasEnteredHeartverse: true });
      },
      warpFullyComplete: false,
      setWarpFullyComplete: (value) => {
        const current = get().warpFullyComplete;
        // Guard: skip if value unchanged
        if (current === value) return;
        if (isDebug()) {
          debugLog("🚀 HeartverseState: setWarpFullyComplete", {
            previousValue: current,
            newValue: value,
          });
        }
        set({ warpFullyComplete: value });
      },
      userClickedStart: false,
      setUserClickedStart: (value) => {
        const current = get().userClickedStart;
        // Guard: skip if value unchanged
        if (current === value) return;
        if (isDebug()) {
          debugLog("🚀 HeartverseState: setUserClickedStart", {
            previousValue: current,
            newValue: value,
          });
        }
        set({ userClickedStart: value });
      },
      // Planetarium camera + selection state (non-persistent)
      selectedPlanetId: null,
      setSelectedPlanetId: (id) => {
        const current = get().selectedPlanetId;
        // Guard: skip if value unchanged
        if (current === id) return;
        if (isDebug()) {
          debugLog('🎯 UIState: setSelectedPlanetId', { from: current, to: id });
        }
        set({ selectedPlanetId: id });
      },
      focusedPlanetId: null,
      setFocusedPlanetId: (id) => {
        const current = get().focusedPlanetId;
        // Guard: skip if value unchanged
        if (current === id) return;
        if (isDebug()) {
          debugLog('🎯 UIState: setFocusedPlanetId', { from: current, to: id });
        }
        set({ focusedPlanetId: id });
      },
      cameraMode: 'free',
      setCameraMode: (mode) => {
        const current = get().cameraMode;
        // Guard: skip if value unchanged
        if (current === mode) return;
        if (isDebug()) {
          debugLog('🎯 UIState: setCameraMode', { from: current, to: mode });
        }
        set({ cameraMode: mode });
      },
      isUserInteracting: false,
      setIsUserInteracting: (v) => {
        const current = get().isUserInteracting;
        // Guard: skip if value unchanged
        if (current === v) return;
        if (isDebug()) {
          debugLog('🎯 UIState: setIsUserInteracting', { from: current, to: v });
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
