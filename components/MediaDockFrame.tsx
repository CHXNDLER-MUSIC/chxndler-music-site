"use client";
import React from "react";

/**
 * Minimal, dependency-free media dock so the page compiles.
 * Point the src to any audio file you have under /public/tracks
 */
export default function MediaDockFrame() {
  return (
    <div className="h-full w-full rounded-2xl bg-black/35 backdrop-blur-md p-3 glow cockpit-glow">
      <div className="text-xs md:text-sm opacity-80 mb-2">Now Playing: OCEAN GIRL (demo)</div>
      <audio src="/tracks/ocean-girl.m4a" controls className="w-full" preload="metadata" />
    </div>
  );
}
