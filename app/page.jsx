"use client";

import React, { useState, useEffect } from "react";
import SkyboxVideo from "@/components/SkyboxVideo";
import AmbientSpace from "@/components/AmbientSpace";
import SteeringWheelOverlay from "@/components/SteeringWheelOverlay";
import StationDialOverlay from "@/components/StationDialOverlay";
import { Slot } from "@/components/Slot";
import { DASHBOARD } from "@/config/dashboard";
import dynamic from "next/dynamic";
const HUDPanel = dynamic(() => import("@/components/HUDPanel"), { ssr: false });
import HoloHUD from "@/components/HoloHUD";
import { skyFor, introSky } from "@/lib/sky";
import MediaDock from "@/components/MediaDock";
import { sfx } from "@/lib/sfx";
import SocialIcons from "@/components/SocialIcons";
import StreamingButtons from "@/components/StreamingButtons";
import NeonCockpitRim from "@/components/NeonCockpitRim";
import { LINKS, POS } from "@/config/cockpit";
import { tracks } from "@/config/tracks";
import { buildPlanetSongs } from "@/lib/planets";
import { usePlayerStore } from "@/store/usePlayerStore";
import JoinAliensBox from "@/components/JoinAliensBox";
import PrewarmThree from "@/components/PrewarmThree";
// 3D overlay store is optional; left disabled until deps installed

export default function Dashboard() {
  const [channelIdx, setChannelIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sky, setSky] = useState({ webm: "/skies/space.webm", mp4: "/skies/space.mp4", key: "space" });
  const [links, setLinks] = useState({ spotify: "", apple: "" });
  const [curTrack, setCurTrack] = useState(tracks[0]);
  const [playSignal, setPlaySignal] = useState(0);
  const [toggleSignal, setToggleSignal] = useState(0);
  const [flySignal, setFlySignal] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [showHUD, setShowHUD] = useState(false);
  const [warpActive, setWarpActive] = useState(false);
  const [nextSky, setNextSky] = useState(null);
  const [beamOnly, setBeamOnly] = useState(true);

  function onSongChange(id){
    const slug = id;
    const idx = tracks.findIndex(t => (t.slug||"") === slug || (t.slug||"").startsWith(slug));
    if (idx >= 0) {
      setChannelIdx(idx);
      // Playback will start after warp SFX delay in MediaDock
    }
  }

  React.useEffect(() => { setFlySignal((n)=> n + 1); }, [channelIdx]);
  // Seed the 3D hologram store with all tracks mapped to planets
  const { hudSongs, holoSongs } = React.useMemo(() => buildPlanetSongs(), []);
  React.useEffect(() => {
    try {
      if (usePlayerStore && typeof usePlayerStore.getState === 'function') {
        usePlayerStore.getState().initSongs(holoSongs);
      }
    } catch {}
  }, [holoSongs]);
  // Sync the 3D holo route's main planet with the currently playing track
  React.useEffect(() => {
    if (!curTrack) return;
    const slug = (curTrack.slug || "").toLowerCase();
    if (slug) {
      try { usePlayerStore.getState().setMain(slug); } catch {}
    }
  }, [curTrack]);

  // When pausing playback, switch sky back to default space and show default HUD
  React.useEffect(() => {
    if (!mounted) return;
    if (!isPlaying) {
      setNextSky(introSky);
      setFlySignal((n) => n + 1);
    } else if (curTrack) {
      setNextSky(skyFor(curTrack.slug));
      setFlySignal((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Bridge to 3D overlay disabled (requires @react-three/* deps)
  useEffect(() => { setMounted(true); }, []);
  // Mouse move sequence: play join sound, show beam, then reveal HUD
  React.useEffect(() => {
    if (!mounted) return;
    const onFirstMove = () => {
      try { sfx.play('join', 0.9); } catch {}
      setShowHUD(true);
      setBeamOnly(true);
      // After a short lead, disable beamOnly so HUD content appears
      const t = setTimeout(() => setBeamOnly(false), 500);
      // Then immediately afterwards start ambient space track and welcome VO
      setTimeout(() => {
        try {
          const amb = document.querySelector('audio[data-ambient="1"]');
          if (amb) { amb.muted = false; amb.volume = 0.35; amb.play().catch(()=>{}); }
        } catch {}
        try {
          const intro = document.querySelector('audio[data-intro="1"]');
          if (intro) { intro.currentTime = 0; intro.volume = 0.9; intro.play().catch(()=>{}); }
        } catch {}
      }, 520);
      window.removeEventListener('mousemove', onFirstMove);
      window.removeEventListener('touchstart', onFirstMove);
      // Cleanup timeout on unmount
      const cleanup = () => clearTimeout(t);
      window.addEventListener('beforeunload', cleanup, { once: true });
    };
    window.addEventListener('mousemove', onFirstMove, { once: true });
    window.addEventListener('touchstart', onFirstMove, { once: true });
    return () => {
      window.removeEventListener('mousemove', onFirstMove);
      window.removeEventListener('touchstart', onFirstMove);
    };
  }, [mounted]);

  if (!mounted) return null;
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <PrewarmThree />
      {/* Ambient audio and sky */}
      <AmbientSpace ambientSrc="/audio/space-music.mp3" introSrc="/audio/welcome-to-the-heartverse.mp3" playingMusic={isPlaying} />
      <SkyboxVideo
        brightness={0.95}
        srcWebm={sky.webm}
        srcMp4={sky.mp4}
        videoKey={sky.key}
        flySignal={flySignal}
        offsetY="-1vh"
        onFlyStart={() => { setWarpActive(true); }}
        onFlyEnd={() => {
          setWarpActive(false);
          if (nextSky) { setSky(nextSky); setNextSky(null); }
          if (!showHUD) setShowHUD(true);
        }}
      />

      {/* Cockpit frame overlay */}
      <div className="cockpit-bg fixed inset-0 z-20 pointer-events-none" aria-hidden="true" />
      {/* Music-reactive neon rim overlay */}
      <NeonCockpitRim />

      {/* Overlays */}
      <SocialIcons LINKS={LINKS} POS={POS} trackLinks={links} />
      <StreamingButtons pos={POS.stream} links={links} />
      <SteeringWheelOverlay
        POS={POS}
        playing={isPlaying}
        onLaunch={() => {
          // Toggle play/pause
          setToggleSignal((n)=> n + 1);
          // Trigger warp overlay/sound for both pause and play
          if (isPlaying) setTimeout(() => setFlySignal((n) => n + 1), 300);
          else setFlySignal((n) => n + 1);
        }}
      />
      {/* Channel changer removed per request */}
      {/* Right side: Join the Aliens form */}
      <Slot rect={DASHBOARD.joinBox}>
        <JoinAliensBox />
      </Slot>

      {/* Console slot (kept for layout), but HUD content moves to overlay when enabled */}
      <Slot
        rects={[
          // iPhone 15 Pro Max (portrait ~430w)
          { minWidth: 420, maxWidth: 460, top: -1.2, left: 26.5, width: 52, height: 14, orientation: 'portrait' },
          // Other small portrait phones
          { maxWidth: 419, top: 0.0, left: 27, width: 51, height: 14, orientation: 'portrait' },
          // Phone landscape / narrow tablets landscape
          { minWidth: 480, maxWidth: 740, top: -1.2, left: 25, width: 58, height: 14, orientation: 'landscape' },
          // Tablets / small laptops
          { minWidth: 741, maxWidth: 1024, top: -0.8, left: 24.5, width: 54, height: 15 },
          // Larger screens
          { minWidth: 1025, top: -1.2, left: 24, width: 56, height: 15 },
        ]}
      >
        {showHUD && process.env.NEXT_PUBLIC_HOLOHUD !== '1' ? (
          <div className="relative h-full w-full p-0" style={{ overflow: 'visible' }} suppressHydrationWarning>
            <div className="absolute inset-0 p-0" suppressHydrationWarning>
              <HUDPanel inConsole songs={hudSongs} onSongChange={onSongChange} track={curTrack} currentId={curTrack?.slug} playing={isPlaying} beamOnly={beamOnly} />
            </div>
          </div>
        ) : null}
        {/* Hidden media engine for audio + sky sync */}
        <div className="hidden">
          <MediaDock
            onSkyChange={(webm, mp4, key) => setNextSky({ webm, mp4, key })}
            onPlayingChange={(p) => setIsPlaying(p)}
            onTrackChange={(t) => { setLinks({ spotify: t.spotify || "", apple: t.apple || "" }); setCurTrack(t); }}
            playSignal={playSignal}
            toggleSignal={toggleSignal}
            showHUDPlay={false}
            index={channelIdx}
            onIndexChange={(i)=> setChannelIdx(i)}
          />
        </div>
      </Slot>

      {/* Hologram HUD overlay via portal; uses existing HUD markup as projection */}
      {mounted && showHUD && process.env.NEXT_PUBLIC_HOLOHUD === '1' ? (
        <HoloHUD
          track={curTrack}
          playing={isPlaying}
          onToggle={() => setToggleSignal((n) => n + 1)}
        />
      ) : null}
    </main>
  );
}
