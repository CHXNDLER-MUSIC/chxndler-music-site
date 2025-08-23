"use client";

import CockpitDashboard from "./components/CockpitDashboard";
import FastAudioBus from "./components/FastAudioBus";
import PerfHints from "./components/PerfHints";
import SkyboxVideo from "./components/SkyboxVideo";
import { tracks } from "../config/tracks";

export default function Page() {
  // load the first track for now (update with state/switcher later)
  const currentTrack = tracks[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Background video outside the cockpit */}
      <SkyboxVideo src={currentTrack.bgVideo} poster={currentTrack.poster} />

      {/* Cockpit UI (rails + hologram) */}
      <CockpitDashboard track={currentTrack} />

      {/* Global audio controls */}
      <FastAudioBus track={currentTrack} />

      {/* Perf tweaks for low-end devices */}
      <PerfHints />
    </main>
  );
}
