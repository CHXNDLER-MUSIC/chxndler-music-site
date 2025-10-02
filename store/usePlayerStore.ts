"use client";

import React from "react";
import type { Song } from "@/data/songs";

type State = {
  songs: Song[];
  mainId: string | null;
  prevMainId: string | null;
  hoverId: string | null;
  planetsVisible: boolean;
  initSongs: (songs: Song[]) => void;
  setMain: (id: string, preservePlanetVisibility?: boolean) => void;
  setHover: (id: string | null) => void;
  togglePlanets: () => void;
  setPlanetsVisible: (visible: boolean) => void;
};

// Minimal, dependency-free store using useSyncExternalStore
let state: State = {
  songs: [],
  mainId: null,
  prevMainId: null,
  hoverId: null,
  planetsVisible: false,
  initSongs: (songs: Song[]) => {
    console.log('🎵 PlayerStore: initSongs called', { currentLength: state.songs.length, newLength: songs.length });
    if (state.songs.length === 0) {
      setState({ songs, prevMainId: null });
    } else {
      setState({ songs });
    }
    console.log('🎵 PlayerStore: songs updated', { finalLength: state.songs.length });
  },
  setMain: (id: string, preservePlanetVisibility = false) => {
    console.log('🎵 PlayerStore: setMain called', { currentMainId: state.mainId, newId: id, preservePlanetVisibility });
    if (state.mainId === id) {
      console.log('🎵 PlayerStore: ID unchanged, skipping');
      return;
    }
    
    if (preservePlanetVisibility) {
      // Don't change planet visibility (for homepage navigation)
      console.log('🎵 PlayerStore: Setting mainId without changing planet visibility');
      setState({ prevMainId: state.mainId, mainId: id });
    } else {
      // Immediately hide all planets when a new song is selected - they stay hidden
      console.log('🎵 PlayerStore: Hiding planets for warp sequence - keeping them hidden');
      setState({ prevMainId: state.mainId, mainId: id, planetsVisible: false });
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
};

const listeners = new Set<() => void>();
function setState(partial: Partial<State>) {
  state = { ...state, ...partial };
  listeners.forEach((l) => l());
}
function getState() { return state; }
function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }

export function usePlayerStore<T = State>(selector?: (s: State) => T): T {
  const getSnapshot = React.useCallback(() => state, []);
  const useSyncExternalStore = (React as any).useSyncExternalStore;
  const snap = useSyncExternalStore && typeof useSyncExternalStore === 'function'
    ? useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    : state; // fallback without SSR correctness
  return (selector ? selector(snap) : (snap as unknown as T));
}

// Attach imperative helpers to match zustand API usage in code
(usePlayerStore as any).getState = getState;
(usePlayerStore as any).setState = setState;
(usePlayerStore as any).subscribe = subscribe;

// Type declaration for static properties on the function (non-breaking)
export namespace usePlayerStore {
  export const getState: () => State = getState;
  export const setState: (partial: Partial<State>) => void = setState;
  export const subscribe: (l: () => void) => () => void = subscribe;
}
