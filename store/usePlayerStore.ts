"use client";

import React from "react";
import type { Song } from "@/data/songs";

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
let state: State = {
  songs: [],
  mainId: null,
  prevMainId: null,
  hoverId: null,
  planetsVisible: true, // Start visible for homepage
  planetDisplayMode: 'all', // Start showing all planets on homepage
  initSongs: (songs: Song[]) => {
    console.log('🚨 PlayerStore: initSongs called', { 
      currentLength: state.songs.length, 
      newLength: songs.length,
      songIds: songs.map(s => s.id),
      trace: new Error().stack?.split('\n')[1]?.trim() || 'unknown'
    });
    if (state.songs.length === 0) {
      setState({ songs, prevMainId: null });
      console.log('🚨 PlayerStore: FIRST TIME - Set songs to', songs.length);
    } else {
      setState({ songs });
      console.log('🚨 PlayerStore: REPLACING - Set songs to', songs.length);
    }
    console.log('🚨 PlayerStore: songs updated', { finalLength: state.songs.length, finalIds: state.songs.map(s => s.id) });
  },
  setMain: (id: string, preservePlanetVisibility = false) => {
    console.log('🎵 PlayerStore: setMain called', { currentMainId: state.mainId, newId: id, preservePlanetVisibility });
    if (state.mainId === id) {
      console.log('🎵 PlayerStore: ID unchanged, skipping');
      return;
    }
    
    if (preservePlanetVisibility) {
      // Don't change planet display mode (for homepage navigation)
      console.log('🎵 PlayerStore: Setting mainId without changing planet display');
      setState({ prevMainId: state.mainId, mainId: id });
    } else {
      // Song selection: hide all planets immediately, set to single mode for later
      console.log('🎵 PlayerStore: Song selected - hiding all planets during warp');
      setState({ 
        prevMainId: state.mainId, 
        mainId: id, 
        planetDisplayMode: 'hidden' // Hide during warp
      });
    }
    
    console.log('🎵 PlayerStore: mainId updated to', id);
  },
  setHover: (id: string | null) => setState({ hoverId: id }),
  togglePlanets: () => {
    console.log('🎵 PlayerStore: togglePlanets called', { current: state.planetsVisible, willBecomeTo: !state.planetsVisible });
    const newValue = !state.planetsVisible;
    setState({ planetsVisible: newValue });
    console.log('🎵 PlayerStore: planetsVisible updated from', state.planetsVisible, 'to', newValue);
    // Verify the state actually changed
    setTimeout(() => {
      console.log('🎵 PlayerStore: togglePlanets verification - state is now:', state.planetsVisible);
    }, 10);
  },
  setPlanetsVisible: (visible: boolean) => {
    console.log('🎵 PlayerStore: setPlanetsVisible called', { current: state.planetsVisible, new: visible });
    if (state.planetsVisible !== visible) {
      setState({ planetsVisible: visible });
      console.log('🎵 PlayerStore: planetsVisible updated to', visible);
    }
  },
  setPlanetDisplayMode: (mode: PlanetDisplayMode) => {
    console.log('🎵 PlayerStore: setPlanetDisplayMode called', { current: state.planetDisplayMode, new: mode });
    if (state.planetDisplayMode !== mode) {
      setState({ planetDisplayMode: mode });
      console.log('🎵 PlayerStore: planetDisplayMode updated to', mode);
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
