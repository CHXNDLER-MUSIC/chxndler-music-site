import { useMemo } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";

export type LayoutOut = {
  id: string;
  ringIndex: number;
  orbitRadius: number;
  angle0: number;
  ecc: number;
  tiltDeg: number;
  scale: number;
};

type SongLike = { id: string; planet?: any; bpm?: number; durationSec?: number; orbitIndex?: number };

export function computePlanetLayout(
  songs: SongLike[],
  opts: {
    ringGap?: number;
    baseRadius?: number;
    eccMin?: number; eccMax?: number;
    tiltPerRing?: number;
    minScale?: number; maxScale?: number;
  } = {}
): Record<string, LayoutOut> {
  const {
    ringGap = 1.8,
    baseRadius = 2.2,
    eccMin = 0.05,
    eccMax = 0.22,
    tiltPerRing = 6,
    minScale = 0.7,
    maxScale = 1.25,
  } = opts;

  const byRing: Map<number, SongLike[]> = new Map();
  const explicit = songs.some((s) => (s as any)?.planet?.orbitIndex != null || (s as any)?.orbitIndex != null);
  if (explicit) {
    for (const s of songs) {
      const r = (s as any)?.planet?.orbitIndex ?? (s as any)?.orbitIndex ?? 0;
      if (!byRing.has(r)) byRing.set(r, []);
      byRing.get(r)!.push(s);
    }
  } else {
    const perRing = 7; // ~6–8 per ring
    const ringCount = Math.max(1, Math.ceil(songs.length / perRing));
    for (let i = 0; i < songs.length; i++) {
      const r = Math.floor(i / perRing);
      if (!byRing.has(r)) byRing.set(r, []);
      byRing.get(r)!.push(songs[i]);
    }
    // Balance last ring if very uneven
    const last = byRing.get(ringCount - 1);
    const prev = byRing.get(ringCount - 2);
    if (ringCount > 1 && last && prev && last.length < Math.floor(perRing * 0.5)) {
      // move a few from prev to last
      const need = Math.min(prev.length - Math.ceil(perRing * 0.5), Math.ceil((perRing - last.length) / 2));
      if (need > 0) {
        const moved = prev.splice(prev.length - need, need);
        last.unshift(...moved);
      }
    }
  }

  const out: Record<string, LayoutOut> = {};
  const GOLDEN = 2.3999632297; // radians

  // Compute scale domain
  let bpmMin = Infinity, bpmMax = -Infinity;
  let durMin = Infinity, durMax = -Infinity;
  let radMin = Infinity, radMax = -Infinity;
  for (const s of songs) {
    const bpm = (s as any)?.bpm;
    const dur = (s as any)?.durationSec;
    const rad = (s as any)?.planet?.radius;
    if (typeof bpm === 'number') { bpmMin = Math.min(bpmMin, bpm); bpmMax = Math.max(bpmMax, bpm); }
    if (typeof dur === 'number') { durMin = Math.min(durMin, dur); durMax = Math.max(durMax, dur); }
    if (typeof rad === 'number') { radMin = Math.min(radMin, rad); radMax = Math.max(radMax, rad); }
  }

  const ringIndices = Array.from(byRing.keys()).sort((a, b) => a - b);
  const ringCount = ringIndices.length;
  for (const ringIndex of ringIndices) {
    const list = byRing.get(ringIndex)!;
    const eccBase = lerp(eccMin, eccMax, ringCount > 1 ? ringIndex / (ringCount - 1) : 0);
    const tiltDeg = ringIndex * tiltPerRing;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const id = s.id;
      const orbitRadius = baseRadius + ringIndex * ringGap;
      const angle0 = wrapTau(i * GOLDEN);
      const eccRand = 1 + (hash01(id) - 0.5) * 0.2; // ±10%
      const ecc = clamp(eccBase * eccRand, 0, 0.25);

      // Scale mapping: prefer bpm (higher -> smaller), else durationSec (longer -> bigger), else planet.radius
      let scale = 1.0;
      const bpm = (s as any)?.bpm;
      const dur = (s as any)?.durationSec;
      const rad = (s as any)?.planet?.radius;
      if (typeof bpm === 'number' && isFinite(bpmMin) && bpmMax > bpmMin) {
        const t = 1 - (bpm - bpmMin) / (bpmMax - bpmMin);
        scale = lerp(minScale, maxScale, t);
      } else if (typeof dur === 'number' && isFinite(durMin) && durMax > durMin) {
        const t = (dur - durMin) / (durMax - durMin);
        scale = lerp(minScale, maxScale, t);
      } else if (typeof rad === 'number' && isFinite(radMin) && radMax > radMin) {
        const t = (rad - radMin) / (radMax - radMin);
        scale = lerp(minScale, maxScale, t);
      } else {
        scale = (minScale + maxScale) * 0.5;
      }

      out[id] = { id, ringIndex, orbitRadius, angle0, ecc, tiltDeg, scale };
    }
  }

  return out;
}

export function usePlanetLayout(songId: string): LayoutOut | undefined {
  const { songs } = usePlayerStore();
  // Responsive opts: tighten on small screens
  const { innerWidth: w } = typeof window !== 'undefined' ? window : { innerWidth: 1280 } as any;
  const narrow = w < 640;
  const opts = useMemo(() => ({
    ringGap: narrow ? 1.55 : 1.8,
    baseRadius: 2.2,
    eccMin: 0.05, eccMax: 0.22,
    tiltPerRing: 6,
    minScale: 0.7,
    maxScale: narrow ? 1.05 : 1.25,
  }), [narrow]);
  const layout = useMemo(() => computePlanetLayout(songs as any, opts), [songs, opts]);
  return layout[songId];
}

// Helpers
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(x: number, a: number, b: number) { return Math.max(a, Math.min(b, x)); }
function wrapTau(x: number) { const T = Math.PI * 2; x %= T; return x < 0 ? x + T : x; }
function hash01(id: string) { let h = 2166136261 >>> 0; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

