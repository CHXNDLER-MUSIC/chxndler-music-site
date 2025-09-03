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

export default function DashboardApp() {
  const [channelIdx, setChannelIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sky, setSky] = useState(introSky);
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
  const [beamEnabled, setBeamEnabled] = useState(false);
  const [powerBusy, setPowerBusy] = useState(false);
  const powerRef = React.useRef(null);

  function onSongChange(id){
    const slug = id;
    const idx = tracks.findIndex(t => (t.slug||"") === slug || (t.slug||"").startsWith(slug));
    if (idx >= 0) {
      setChannelIdx(idx);
    }
  }

  React.useEffect(() => { setFlySignal((n)=> n + 1); }, [channelIdx]);
  const { hudSongs, holoSongs } = React.useMemo(() => buildPlanetSongs(), []);
  React.useEffect(() => {
    try {
      if (usePlayerStore && typeof usePlayerStore.getState === 'function') {
        usePlayerStore.getState().initSongs(holoSongs);
      }
    } catch {}
  }, [holoSongs]);
  React.useEffect(() => {
    if (!curTrack) return;
    const slug = (curTrack.slug || "").toLowerCase();
    if (slug) {
      try { usePlayerStore.getState().setMain(slug); } catch {}
    }
  }, [curTrack]);

  React.useEffect(() => {
    if (!mounted) return;
    if (!isPlaying) {
      setNextSky(introSky);
      setFlySignal((n) => n + 1);
    } else if (curTrack) {
      setNextSky(skyFor(curTrack.slug));
      setFlySignal((n) => n + 1);
    }
  }, [isPlaying, mounted, curTrack]);

  useEffect(() => { setMounted(true); }, []);
  // Disable auto actions on random interactions; nothing should trigger on click/touch/move
  React.useEffect(() => { /* intentionally empty */ }, [mounted]);

  if (!mounted) return null;
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <PrewarmThree />
      <AmbientSpace ambientSrc="/audio/space-music.mp3" playingMusic={isPlaying} />
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
        }}
      />

      <div className="cockpit-bg fixed inset-0 z-20 pointer-events-none" aria-hidden="true" />
      <NeonCockpitRim />

      <SocialIcons LINKS={LINKS} POS={POS} trackLinks={links} />
      <StreamingButtons pos={POS.stream} links={links} />
      <SteeringWheelOverlay
        POS={POS}
        playing={isPlaying}
        onLaunch={() => {
          setToggleSignal((n)=> n + 1);
          if (isPlaying) setTimeout(() => setFlySignal((n) => n + 1), 300);
          else setFlySignal((n) => n + 1);
        }}
      />
      <Slot rect={DASHBOARD.joinBox}>
        <JoinAliensBox />
      </Slot>

      <Slot
        rects={[
          { minWidth: 420, maxWidth: 460, top: -1.2, left: 26.5, width: 52, height: 14, orientation: 'portrait' },
          { maxWidth: 419, top: 0.0, left: 27, width: 51, height: 14, orientation: 'portrait' },
          { minWidth: 480, maxWidth: 740, top: -1.2, left: 25, width: 58, height: 14, orientation: 'landscape' },
          { minWidth: 741, maxWidth: 1024, top: -0.8, left: 24.5, width: 54, height: 15 },
          { minWidth: 1025, top: -1.2, left: 24, width: 56, height: 15 },
        ]}
      >
        <div className="relative h-full w-full p-0" style={{ overflow: 'visible' }} suppressHydrationWarning>
          {showHUD && process.env.NEXT_PUBLIC_HOLOHUD !== '1' ? (
            <div className="absolute inset-0 p-0" suppressHydrationWarning>
              <HUDPanel inConsole songs={hudSongs} onSongChange={onSongChange} track={curTrack} currentId={curTrack?.slug} playing={isPlaying} beamOnly={beamOnly} beamEnabled={beamEnabled} />
            </div>
          ) : null}
          {/* Power button below the beam base */}
            <button
              type="button"
              className="pointer-events-auto power-btn"
              onClick={async () => {
                if (powerBusy) return;
                setPowerBusy(true);
                try {
                  const a = powerRef.current;
                  if (a) { a.currentTime = 0; a.volume = 0.9; await a.play().catch(()=>{}); }
                } catch {}
                const isOff = !beamEnabled && !showHUD;
                if (isOff) {
                  // Mount HUD, keep content hidden, beam off until SFX done
                  setShowHUD(true);
                  setBeamOnly(true);
                  // Delay to let audio play first
                  setTimeout(() => {
                    setBeamEnabled(true); // fade beam in
                    // after beam in, fade content in
                    setTimeout(() => { setBeamOnly(false); setPowerBusy(false); }, 360);
                  }, 240);
                } else {
                  // Fade content out, then beam out, then unmount
                  setBeamOnly(true);
                  setTimeout(() => {
                    setBeamEnabled(false);
                    setTimeout(() => { setShowHUD(false); setPowerBusy(false); }, 220);
                  }, 260);
                }
              }}
              aria-label="Power"
              title="Power"
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: 'calc(100% + 84px)',
                width: 42, height: 42, borderRadius: 9999, zIndex: 95,
              }}
            >
              <span className="sr-only">Toggle HUD Power</span>
            </button>
            <audio ref={powerRef} src="/audio/join-alien.mp3" preload="auto" playsInline />
            <style jsx>{`
              .power-btn{
                background:
                  radial-gradient(60% 60% at 50% 40%, rgba(255,255,255,.10), rgba(255,255,255,0) 60%),
                  radial-gradient(closest-side, rgba(25,227,255,.30), rgba(0,0,0,0) 70%),
                  radial-gradient(120% 120% at 50% 60%, #0b0f12, #000);
                border:1px solid rgba(25,227,255,.55);
                box-shadow:
                  0 8px 16px rgba(0,0,0,.55),
                  0 0 18px rgba(25,227,255,.85),
                  0 0 48px rgba(25,227,255,.55),
                  inset 0 2px 0 rgba(255,255,255,.35),
                  inset 0 -6px 14px rgba(0,0,0,.6),
                  inset 0 0 22px rgba(19,180,220,.35);
                transition: transform .12s ease, box-shadow .18s ease, filter .18s ease;
                display:grid; place-items:center; color:#19E3FF; font-weight:800; font-size:14px;
                animation: powerPulse 2s ease-in-out infinite;
              }
              .power-btn::before{ content:""; position:absolute; inset:18%; border-radius:9999px; box-shadow: inset 0 0 0 2px rgba(25,227,255,.28), inset 0 0 24px rgba(25,227,255,.28); }
              .power-btn:hover{ transform: scale(1.06); box-shadow: 0 8px 18px rgba(0,0,0,.6), 0 0 26px rgba(25,227,255,1), 0 0 72px rgba(25,227,255,.7), inset 0 2px 0 rgba(255,255,255,.5); }
              .power-btn:active{ transform: scale(.96); }
              @keyframes powerPulse{ 0%{ filter: brightness(1)} 50%{ filter: brightness(1.06)} 100%{ filter: brightness(1)} }
            `}</style>
        </div>
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
