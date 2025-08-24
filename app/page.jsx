"use client";

import React, { useState } from "react";
import SkyboxVideo from "@/components/SkyboxVideo";
import { DASHBOARD } from "@/config/dashboard";
import { Slot } from "@/components/Slot";
import SocialDock from "@/components/SocialDock";
import MediaDock from "@/components/MediaDock";
// import JoinAliensBox from "@/components/JoinAliensBox"; // optional

export default function Page() {
  const DEBUG = false;

  const [sky, setSky] = useState({
    webm: "/skies/ocean-girl.webm",
    mp4: "/skies/ocean-girl.mp4",
    key: "ocean-girl",
  });
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <SkyboxVideo brightness={0.95} srcWebm={sky.webm} srcMp4={sky.mp4} videoKey={sky.key} />

      <Slot rect={DASHBOARD.socialDock} debug={DEBUG}>
        <SocialDock />
      </Slot>

      <Slot rect={DASHBOARD.mediaDock} debug={DEBUG}>
        <MediaDock
          onSkyChange={(webm, mp4, key) => setSky({ webm, mp4, key })}
          onPlayingChange={(p) => setIsPlaying(p)}
        />
      </Slot>

      {/* Optionally mount join box */}
      {/* <Slot rect={DASHBOARD.joinBox} debug={DEBUG}>
        <JoinAliensBox />
      </Slot> */}
    </main>
  );
}
