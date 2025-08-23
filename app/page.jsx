"use client";

import { useState } from "react";

import CockpitDashboard from "@/components/CockpitDashboard";
import FastAudioBus from "@/components/FastAudioBus";
import PerfHints from "@/components/PerfHints";
import SkyboxVideo from "@/components/SkyboxVideo";
import { tracks } from "@/config/tracks";

export default function Page() {
  // pick first track by default; swap via dropdown
  const [idx, setIdx] = useState(0);
  const currentTrack = tracks[idx]; // expects { title, bgVideo, poster, src, ... }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* SKY LAYER */}
      <SkyboxVideo src={currentTrack.bgVideo} poster={currentTrack.poster} />

      {/* QUICK TRACK SWITCHER (fast + light) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 bg-black/40 backdrop-blur-md rounded-xl px-3 py-2">
        <label className="sr-only" htmlFor="track">Track</label>
        <select
          id="track"
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          className="bg-transparent outline-none"
        >
          {tracks.map((t, i) => (
            <option key={t.slug ?? t.title ?? i} value={i}>
              {t.title ?? `Track ${i + 1}`}
            </option>
          ))}
        </select>
      </div>

      {/* COCKPIT UI (consumes the selected track) */}
      <CockpitDashboard track={currentTrack} />

      {/* GLOBAL AUDIO (consumes the selected track) */}
      <FastAudioBus track={currentTrack} />

      {/* PERF TOGGLES / DEBUG */}
      <PerfHints />
    </main>
  );
}
