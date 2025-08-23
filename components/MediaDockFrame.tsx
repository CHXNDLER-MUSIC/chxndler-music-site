"use client";
import React from "react";
import FastAudioBus from "@/components/FastAudioBus"; // keep your current minimal player

export default function MediaDockFrame() {
  return (
    <div className="h-full w-full rounded-2xl bg-black/35 backdrop-blur-md p-3 glow cockpit-glow">
      <FastAudioBus />
    </div>
  );
}
