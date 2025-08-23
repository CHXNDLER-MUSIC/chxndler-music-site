"use client";

import React, { useState } from "react";
import { Slot } from "@/components/Slot";
import SocialDock from "@/components/SocialDock";
import MediaDock from "@/components/MediaDock";
import JoinAliensBox from "@/components/JoinAliensBox";
import SkyboxVideo from "@/components/SkyboxVideo";
import AmbientSpace from "@/components/AmbientSpace";
import StartMusic from "@/components/StartMusic";
import ClickFX from "@/components/ClickFX";
import { DASHBOARD } from "@/config/dashboard";
import { introSky } from "@/lib/sky";

export default function Page() {
  // global sky
  const [sky, setSky] = useState(introSky);
  const onSkyChange = (webm, mp4, key) => setSky({ key, webm, mp4 });

  // music plays? (for ducking)
  const [playingMusic, setPlayingMusic] = useState(false);

  // start overlay control
  const [started, setStarted] = useState(false);
  const [startSignal, setStartSignal] = useState(0);
  const handleStart = () => {
    setStarted(true);
    setStartSignal((s) => s + 1); // tell MediaDock to jump to first track and play
  };

  return (
    <main className="relative min-h-screen overflow-hidden cockpit-bg">
      {/* Sky video (intro galaxy → per-track planet with warp flash) */}
      <SkyboxVideo webm={sky.webm} mp4={sky.mp4} skyKey={sky.key} brightness={0.96} />

      {/* Ambient breeze + welcome VO; ducks when music plays */}
      <AmbientSpace
        ambientSrc="/audio/space-breeze.mp3"
        introSrc="/Tracks/welcome-to-the-heartverse.mp3"
        volume={0.35}
        duckTo={0.15}
        playingMusic={playingMusic}
      />

      {/* HUD slots */}
      <Slot rect={DASHBOARD.socialDock}><SocialDock /></Slot>
      <Slot rect={DASHBOARD.mediaDock}>
        <MediaDock
          onSkyChange={onSkyChange}
          onPlayingChange={setPlayingMusic}
          wrapChannels
          startSignal={startSignal}
          startIndex={0}
        />
      </Slot>
      <Slot rect={DASHBOARD.joinBox}><JoinAliensBox /></Slot>

      {/* Start/Launch overlay: show until first click / music starts */}
      <StartMusic show={!started && !playingMusic} onStart={handleStart} />

      {/* global click FX */}
      <ClickFX />
    </main>
  );
}
