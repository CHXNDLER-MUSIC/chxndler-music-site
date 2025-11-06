"use client";

import React from "react";
import type { Song } from "@/data/songs";
import { buildPlanetSongs } from "@/lib/planets";

type PlanetDisplayMode = 'all' | 'single' | 'hidden';

type State = {
  songs: Song[];
  mainId: string | null;
  prevMainId: string | null;
  hoverId: string | null;
  planetsVisible: boolean;
  planetDisplayMode: PlanetDisplayMode; // NEW: Clear planet display state
  initSongs: (songs: Song[]) => void;
  setMain: (id: string, preservePlanetVisibility?: boolean) => void;
  setHover: (id: string | null) => void;
  togglePlanets: () => void;
  setPlanetsVisible: (visible: boolean) => void;
  setPlanetDisplayMode: (mode: PlanetDisplayMode) => void; // NEW: Direct mode control
};

// Minimal, dependency-free store using useSyncExternalStore
// Prebuild songs at module load so first render has data
// This avoids a first-paint where only the center heart appears until effects run.
const __prebuiltSongs = (() => {
  try {
    const { holoSongs } = buildPlanetSongs();
    if (Array.isArray(holoSongs) && holoSongs.length > 0) return holoSongs as unknown as Song[];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("playerStore: Failed to prebuild songs:", e);
  }
  return [] as Song[];
})();

let state: State = {
  songs: __prebuiltSongs,
  mainId: null,
  prevMainId: null,
  hoverId: null,
  planetsVisible: true, // Start visible for homepage
  planetDisplayMode: 'all', // Start showing all planets on homepage
  initSongs: (songs: Song[]) => {
    if (state.songs.length === 0) {
      setState({ songs, prevMainId: null });
    } else {
      setState({ songs });
    }
  },
  setMain: (id: string, preservePlanetVisibility = false) => {
    if (state.mainId === id) {
      return;
    }
    
    if (preservePlanetVisibility) {
      // Don't change planet display mode (for homepage navigation)
      setState({ prevMainId: state.mainId, mainId: id });
    } else {
      // Song selection: hide all planets immediately, set to single mode for later
      setState({ 
        prevMainId: state.mainId, 
        mainId: id, 
        planetDisplayMode: 'hidden', // Hide during warp
        planetsVisible: false // Ensure all planets toggle off immediately
      });
    }
  },
  setHover: (id: string | null) => setState({ hoverId: id }),
  togglePlanets: () => {
    const newValue = !state.planetsVisible;
    setState({ planetsVisible: newValue });
  },
  setPlanetsVisible: (visible: boolean) => {
    if (state.planetsVisible !== visible) {
      setState({ planetsVisible: visible });
    }
  },
  setPlanetDisplayMode: (mode: PlanetDisplayMode) => {
    if (state.planetDisplayMode !== mode) {
      setState({ planetDisplayMode: mode });
    }
  },
};

const listeners = new Set<() => void>();
function setState(partial: Partial<State>) {
  state = { ...state, ...partial };
  listeners.forEach((l) => l());
}
function getState() { return state; }
function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }

// Imperative store API for components/utilities
export const playerStore = {
  getState,
  setState,
  subscribe,
};

// Back-compat named exports for types
export type PlayerState = State;
