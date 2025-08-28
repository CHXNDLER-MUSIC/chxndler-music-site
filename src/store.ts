"use client";
import { create } from "zustand";

export type Song = {
  id: string;
  title: string;
  artUrl: string;
  tagline: string;
  seed: number;
};

type State = {
  songs: Song[];
  previewId: string | null;
  selectedId: string | null;
  setSongs: (s: Song[]) => void;
  setPreview: (id: string | null) => void;
  setSelected: (id: string | null) => void;
};

export const useStore = create<State>((set) => ({
  songs: [],
  previewId: null,
  selectedId: null,
  setSongs: (s) => set({ songs: s, previewId: s[0]?.id ?? null }),
  setPreview: (id) => set({ previewId: id }),
  setSelected: (id) => set({ selectedId: id }),
}));

