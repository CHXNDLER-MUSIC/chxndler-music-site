"use client";

import React from "react";
import type { Song } from "@/data/songs";

type State = {
  songs: Song[];
  mainId: string | null;
  prevMainId: string | null;
  hoverId: string | null;
  initSongs: (songs: Song[]) => void;
  setMain: (id: string) => void;
  setHover: (id: string | null) => void;
};

// Minimal, dependency-free store using useSyncExternalStore
let state: State = {
  songs: [],
  mainId: null,
  prevMainId: null,
  hoverId: null,
  initSongs: (songs: Song[]) => {
    console.log('🎵 PlayerStore: initSongs called', { currentLength: state.songs.length, newLength: songs.length });
    if (state.songs.length === 0) {
      setState({ songs, prevMainId: null });
    } else {
      setState({ songs });
    }
    console.log('🎵 PlayerStore: songs updated', { finalLength: state.songs.length });
  },
  setMain: (id: string) => {
    console.log('🎵 PlayerStore: setMain called', { currentMainId: state.mainId, newId: id });
    if (state.mainId === id) {
      console.log('🎵 PlayerStore: ID unchanged, skipping');
      return;
    }
    setState({ prevMainId: state.mainId, mainId: id });
    console.log('🎵 PlayerStore: mainId updated to', id);
  },
  setHover: (id: string | null) => setState({ hoverId: id }),
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
