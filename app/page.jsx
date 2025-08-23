"use client";

import CockpitDashboard from "@/app/components/CockpitDashboard";
import FastAudioBus from "@/app/components/FastAudioBus";
import PerfHints from "@/app/components/PerfHints";
import SkyboxVideo from "@/app/components/SkyboxVideo";
import { tracks } from "@/config/tracks";

export default function Page() {
  // for now just load the first track in config
  const currentTrack = tracks[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* 🌌 Background video (outside cockpit) */}
      <SkyboxVideo src={currentTrack.bgVideo} poster={currentTrack.poster} />

      {/* 🚀 Cockpit HUD + hologram + rails */}
      <CockpitDashboard track={currentTrack} />

      {/* 🎵 Global audio bus / HUD controls */}
      <FastAudioBus track={currentTrack} />

      {/* ⚡ Perf hints for low-end devices */}
      <PerfHints />
    </main>
  );
}
