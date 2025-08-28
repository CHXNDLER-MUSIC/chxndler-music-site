"use client";

import React, { useState } from "react";
import SkyboxVideo from "@/components/SkyboxVideo";
import { DASHBOARD } from "@/config/dashboard";
import { Slot } from "@/components/Slot";
// import SocialDock from "@/components/SocialDock"; // replaced by SocialIcons overlay
import SocialIcons from "@/components/SocialIcons";
import StreamingButtons from "@/components/StreamingButtons";
import { LINKS, POS } from "@/config/cockpit";
import MediaDock from "@/components/MediaDock";
import AmbientSpace from "@/components/AmbientSpace";
import SteeringWheelOverlay from "@/components/SteeringWheelOverlay";
// import JoinAliensBox from "@/components/JoinAliensBox"; // optional

export default function Page() {
  const DEBUG = false;

  const [sky, setSky] = useState({
    webm: "/skies/ocean-girl.webm",
    mp4: "/skies/ocean-girl.mp4",
    key: "ocean-girl",
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [links, setLinks] = useState({ spotify: "", apple: "" });
  const [playSignal, setPlaySignal] = useState(0);
  const [toggleSignal, setToggleSignal] = useState(0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Ambient: space music on load; one-time welcome VO only at first page open */}
      <AmbientSpace ambientSrc="/audio/space-music.mp3" introSrc="/audio/welcome-to-the-heartverse.mp3" playingMusic={isPlaying} />
      <SkyboxVideo brightness={0.95} srcWebm={sky.webm} srcMp4={sky.mp4} videoKey={sky.key} offsetY="-12vh" />
      {/* Cockpit frame overlay (kept above video, below HUD) */}
      <div className="cockpit-bg fixed inset-0 z-20 pointer-events-none" aria-hidden="true" />

      {/* Left console social icons overlayed onto cockpit frame */}
      <SocialIcons LINKS={LINKS} POS={POS} trackLinks={links} />
      <StreamingButtons pos={POS.stream} links={links} />
      <SteeringWheelOverlay POS={POS} playing={isPlaying} onLaunch={() => setToggleSignal((n) => n + 1)} />

      <Slot rect={DASHBOARD.mediaDock} debug={DEBUG}>
        <MediaDock
          onSkyChange={(webm, mp4, key) => setSky({ webm, mp4, key })}
          onPlayingChange={(p) => setIsPlaying(p)}
          onTrackChange={(t) => setLinks({ spotify: t.spotify || "", apple: t.apple || "" })}
          playSignal={playSignal}
          toggleSignal={toggleSignal}
          showHUDPlay={false}
        />
      </Slot>

      {/* Optionally mount join box */}
      {/* <Slot rect={DASHBOARD.joinBox} debug={DEBUG}>
        <JoinAliensBox />
      </Slot> */}
    </main>
  );
}
