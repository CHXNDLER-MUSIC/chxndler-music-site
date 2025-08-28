"use client";
import React from "react";
import FastAudioBus from "@/components/FastAudioBus";
import { tracks } from "@/config/tracks";

export default function MediaDockFrame() {
  return (
    <div className="h-full w-full rounded-2xl bg-black/35 backdrop-blur-md p-3 glow cockpit-glow">
      {/* Provide a default track so the HUD works out of the box */}
      <FastAudioBus track={tracks[0]} />
    </div>
  );
}
