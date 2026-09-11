"use client";

// One reusable hook for every "meaningful music/creative interaction" sound
// on the brand-pitch template (hero play, Hear the Concept tabs/player,
// Sonic Identity play buttons). Wraps the existing sitewide WebAudio bus
// (lib/sfx.ts) instead of duplicating preload/playback logic — that bus
// already preloads hover/click, dedupes concurrent decodes, and creates a
// fresh BufferSource per play() so rapid repeats restart cleanly without
// manual stop/reset bookkeeping.
import { useCallback, useEffect, useRef } from "react";
import { sfx } from "@/lib/sfx";

// Guards against uncontrolled overlapping sounds from rapid-fire duplicate
// events (e.g. a pointer flickering across adjacent hover targets) without
// blocking legitimate fast, distinct interactions.
const MIN_REPEAT_INTERVAL_MS = 70;

export function useInteractionSound(options?: { hoverKey?: string; clickKey?: string }) {
  const lastPlayedAt = useRef<Record<string, number>>({});
  const hoverKey = options?.hoverKey || "hover";
  const clickKey = options?.clickKey || "click";

  // Marks the bus enabled so sounds are audible as soon as the browser
  // allows it. No sound is ever actually audible until a real user gesture
  // resumes the underlying AudioContext (handled globally by sfx.attachUnlock),
  // so this never triggers autoplay — it only removes the need for the brand
  // page to have its own separate "unlock" gesture like other site features do.
  useEffect(() => {
    try {
      sfx.setEnabled(true);
    } catch {}
  }, []);

  const playGuarded = useCallback((key: string, volume: number) => {
    const now = Date.now();
    const last = lastPlayedAt.current[key] || 0;
    if (now - last < MIN_REPEAT_INTERVAL_MS) return;
    lastPlayedAt.current[key] = now;
    try {
      sfx.play(key, volume);
    } catch {
      // Missing/unavailable asset — never block the interaction it's attached to.
    }
  }, []);

  const playHover = useCallback(() => playGuarded(hoverKey, 0.32), [playGuarded, hoverKey]);
  const playClick = useCallback(() => playGuarded(clickKey, 0.55), [playGuarded, clickKey]);

  return { playHover, playClick };
}
