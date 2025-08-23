"use client";

import CockpitDashboard from "@/components/CockpitDashboard";
import FastAudioBus from "@/components/FastAudioBus";
import PerfHints from "@/components/PerfHints";
import SkyboxVideo from "@/components/SkyboxVideo";
import { tracks } from "@/config/tracks";

export default function Page() {
  const currentTrack = tracks[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <SkyboxVideo src={currentTrack.bgVideo} poster={currentTrack.poster} />
      <CockpitDashboard track={currentTrack} />
      <FastAudioBus track={currentTrack} />
      <PerfHints />
    </main>
  );
}
