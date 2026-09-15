"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

const BAR_COUNT = 28;
// Deterministic per-bar timing/height so server and client markup match
// (no Math.random at render time) while still reading as an organic signal,
// not a uniform equalizer.
function barSeed(i: number) {
  const t = (i * 37) % 100;
  return {
    base: 0.15 + ((t * 13) % 60) / 100, // 0.15–0.75
    duration: 1.6 + ((t * 7) % 14) / 10, // 1.6–3.0s
    delay: ((t * 5) % 20) / 10, // 0–2s
  };
}

/**
 * A purely decorative "signal" band behind the hero copy — understated on
 * purpose (low opacity, no glow, no color competing with the headline).
 * Not tied to real audio (nothing is playing yet at this point on the page),
 * so it's a lightweight CSS/transform animation rather than the
 * AnalyserNode-driven SonicWaveform used once a track is actually active.
 * Renders a single static row under prefers-reduced-motion.
 */
export default function AmbientSignal({ className = "" }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const bars = React.useMemo(() => Array.from({ length: BAR_COUNT }, (_, i) => barSeed(i)), []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none flex items-end justify-center gap-[0.3rem] sm:gap-[0.45rem] ${className}`}
    >
      {bars.map((bar, i) =>
        reduceMotion ? (
          <span
            key={i}
            className="w-[0.1rem] sm:w-[0.15rem] rounded-full bg-white/15"
            style={{ height: `${bar.base * 100}%` }}
          />
        ) : (
          <motion.span
            key={i}
            className="w-[0.1rem] sm:w-[0.15rem] rounded-full bg-white/15"
            initial={{ height: `${bar.base * 100}%` }}
            animate={{ height: [`${bar.base * 100}%`, `${Math.min(bar.base + 0.35, 1) * 100}%`, `${bar.base * 100}%`] }}
            transition={{ duration: bar.duration, delay: bar.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        )
      )}
    </div>
  );
}
