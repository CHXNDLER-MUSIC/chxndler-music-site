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
// import SocialIcons from "@/components/SocialIcons";
// import StreamingButtons from "@/components/StreamingButtons";
import NeonCockpitRim from "@/components/NeonCockpitRim";
import { LINKS, POS } from "@/config/cockpit";
import { tracks } from "@/config/tracks";
import { buildPlanetSongs } from "@/lib/planets";
import { usePlayerStore } from "@/store/usePlayerStore";
// import JoinAliensBox from "@/components/JoinAliensBox";
import PrewarmThree from "@/components/PrewarmThree";

export default function DashboardApp() {
  const [channelIdx, setChannelIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sky, setSky] = useState(introSky);
  const [links, setLinks] = useState({ spotify: LINKS.spotify, apple: LINKS.apple });
  const [userSelected, setUserSelected] = useState(false);
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
  const [showPowerBtn, setShowPowerBtn] = useState(false);
  const [showOverlayUI, setShowOverlayUI] = useState(false); // comms + join buttons
  const powerRef = React.useRef(null);
  const powerHoverRef = React.useRef(null);
  const [allowWarp, setAllowWarp] = useState(false);
  const [homeMode, setHomeMode] = useState(false);
  const [homeIntroEnabled, setHomeIntroEnabled] = useState(true);
  const [pendingHomePower, setPendingHomePower] = useState(false);
  const [pendingTrackPlay, setPendingTrackPlay] = useState(false);
  const trackPlayTimerRef = React.useRef(undefined);
  const [ambientSuspended, setAmbientSuspended] = useState(false);
  const [firstStartDone, setFirstStartDone] = useState(false);
  const SPACE_SKY = { webm: "/skies/space.webm", mp4: "/skies/space.mp4", key: "space" };

  // Centralized HUD power sequencing: play SFX then run beam/HUD fades
  const triggerHudPower = React.useCallback((turnOn) => {
    if (powerBusy) return;
    setPowerBusy(true);
    const a = powerRef.current;
    const turningOn = typeof turnOn === 'boolean' ? turnOn : (!beamEnabled && !showHUD);
    // Fire SFX; for turning on, delay beam/HUD until SFX ends
    try {
      if (a) {
        a.currentTime = 0; a.volume = 0.9; a.play().catch(()=>{});
        // Suspend ambient/intro until join-alien finishes (for clean timing)
        setAmbientSuspended(true);
        a.onended = () => {
          try { a.onended = null; } catch {}
          setAmbientSuspended(false);
          if (turningOn) {
            // 2) Start beam after SFX
            setBeamEnabled(true);
            // 3) Fade HUD in shortly after beam begins (~150–180ms)
            setTimeout(() => { setBeamOnly(false); setPowerBusy(false); }, 170);
            // Reveal cockpit UI buttons (power/comms/join) after SFX finishes
            setShowOverlayUI(true);
            setShowPowerBtn(true);
          }
        };
        // Fallback if ended doesn't fire
        setTimeout(() => {
          setAmbientSuspended(false);
          if (turningOn) {
            setBeamEnabled(true);
            setTimeout(() => { setBeamOnly(false); setPowerBusy(false); }, 170);
            setShowOverlayUI(true);
            setShowPowerBtn(true);
          }
        }, 1500);
      }
    } catch {}

    if (turningOn) {
      // Ensure home-mode visuals/content when powering on from opening screen
      setHomeMode(true);
      setUserSelected(false);
      setLinks({ spotify: LINKS.spotify, apple: LINKS.apple });
      // Do NOT force sky to space here; only Start changes the sky
      // 1) Mount HUD hidden
      setShowHUD(true);
      setBeamOnly(true);
      // Beam/HUD will start after SFX end (handled above)
    } else {
      // Powering off: play SFX immediately (done above), then fade beam out now,
      // and fade HUD out shortly after for a snappy close.
      setBeamEnabled(false); // start beam fade-out immediately
      setTimeout(() => { setBeamOnly(true); }, 120); // hide HUD content right after beam starts fading
      setTimeout(() => { setShowHUD(false); setPowerBusy(false); }, 320); // unmount once fades complete
    }
  }, [powerBusy, beamEnabled, showHUD]);

  function onSongChange(id){
    const slug = id;
    const idx = tracks.findIndex(t => (t.slug||"") === slug || (t.slug||"").startsWith(slug));
    if (idx >= 0) {
      setUserSelected(true);
      setHomeMode(false);
      setAmbientSuspended(true);
      // Immediately reflect selection in HUD (title/cover/subtitle)
      try {
        const t = tracks[idx];
        if (t) {
          setCurTrack(t);
          setLinks({ spotify: t.spotify || LINKS.spotify, apple: t.apple || LINKS.apple });
        }
      } catch {}
      // Stop all audio immediately
      try {
        const a = document.querySelector('audio[data-audio-player="1"]');
        if (a) {
          a.pause();
          // Prime autoplay permission within this gesture without output
          try { a.muted = true; a.play().then(()=>{ a.pause(); a.currentTime = 0; }).catch(()=>{}); } catch {}
        }
      } catch {}
      // Update selected channel.
      setChannelIdx(idx);
      // Prime the hidden audio element within this click to satisfy autoplay policies.
      // Start it muted so actual audio output only occurs after warp completes.
      try {
        const audioEl = document.querySelector('audio[data-audio-player="1"]');
        const src = tracks[idx]?.src || '';
        if (audioEl && src) {
          if (audioEl.getAttribute('src') !== src) audioEl.setAttribute('src', src);
          audioEl.muted = true; audioEl.volume = 0.0;
          audioEl.play().catch(()=>{});
        }
      } catch {}
      // Defer audio start until lightspeed overlay finishes AND the target sky video is playing.
      // Mark this as a pending track play and let SkyboxVideo's onBasePlaying trigger it.
      setPendingTrackPlay(true);
      // Trigger lightspeed overlay + warp SFX and switch sky.
      setAllowWarp(true);
      setNextSky(skyFor(tracks[idx].slug));
      setFlySignal((n) => n + 1);
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

  // Only update sky when track changes; do not auto-warp
  React.useEffect(() => {
    if (!mounted) return;
    if (curTrack) setNextSky(skyFor(curTrack.slug));
  }, [mounted, curTrack]);

  useEffect(() => { setMounted(true); }, []);
  // Disable auto actions on random interactions; nothing should trigger on click/touch/move
  React.useEffect(() => { /* intentionally empty */ }, [mounted]);

  if (!mounted) return null;
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <PrewarmThree />
      <AmbientSpace ambientSrc="/audio/space-music.mp3" introSrc={homeMode && homeIntroEnabled ? "/audio/welcome-to-the-heartverse.mp3" : undefined} playingMusic={isPlaying} suspend={warpActive || ambientSuspended} />
      <SkyboxVideo
        brightness={0.95}
        srcWebm={sky.webm}
        srcMp4={sky.mp4}
        videoKey={sky.key}
        flySignal={flySignal}
        allowWarp={allowWarp}
        offsetY="-1vh"
        onFlyStart={() => { setWarpActive(true); }}
        onFlyEnd={() => {
          setWarpActive(false);
          setAllowWarp(false);
          if (nextSky) { setSky(nextSky); setNextSky(null); }
          // If this warp was due to Start (not track selection), prepare to land on home
          if (!pendingTrackPlay) setPendingHomePower(true);
          else {
            // Fallback: if base video playing event doesn't fire, kick off audio after a short delay
            if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); }
            trackPlayTimerRef.current = window.setTimeout(() => {
              setPlaySignal((n) => n + 1);
              trackPlayTimerRef.current = undefined;
            }, 1400);
          }
        }}
        onBasePlaying={() => {
          if (pendingHomePower) {
            setPendingHomePower(false);
            // Now that space.mp4 is playing
            setHomeMode(true);
            // Play welcome VO only on the first time start is pressed
            setHomeIntroEnabled(!firstStartDone);
            if (!firstStartDone) setFirstStartDone(true);
            setUserSelected(false);
            setLinks({ spotify: LINKS.spotify, apple: LINKS.apple });
            // Begin HUD power sequence: plays join-alien SFX, then beam fade-in, then HUD fade-in
            try { triggerHudPower(true); } catch {}
          }
          if (pendingTrackPlay) {
            // Selected a song: stop warp overlay and allow MediaDock to handle playback
            setPendingTrackPlay(false);
            setAllowWarp(false);
            // Start the selected track now that its sky video is playing
            if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); trackPlayTimerRef.current = undefined; }
            setPlaySignal((n) => n + 1);
          }
        }}
      />

      <div className="cockpit-bg fixed inset-0 z-20 pointer-events-none" aria-hidden="true" />
      <NeonCockpitRim />

      {/* Social + Streaming buttons removed per request */}
      <SteeringWheelOverlay
        POS={POS}
        playing={isPlaying}
        showUI={showOverlayUI}
        onLaunch={() => {
          // Start: warp overlay + sound, then land on CHXNDLER homepage
          // Stop track playback so ambient can play on homepage
          try { const a = document.querySelector('audio[data-audio-player="1"]'); if (a) a.pause(); } catch {}
          setIsPlaying(false);
          setAllowWarp(true);
          setNextSky(SPACE_SKY);
          setFlySignal((n) => n + 1);
          // Do not reveal UI yet; will fade in after join SFX ends in triggerHudPower
        }}
      />
      {/* Removed Join the Aliens dashboard panel per request */}

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
              <HUDPanel
                inConsole
                songs={hudSongs}
                onSongChange={onSongChange}
                track={curTrack}
                currentId={homeMode ? undefined : curTrack?.slug}
                playing={isPlaying}
                beamOnly={beamOnly}
                beamEnabled={beamEnabled}
              />
            </div>
          ) : null}
          {/* Power button below the beam base (hidden until Start is clicked) */}
            {showPowerBtn ? (
              <button
                type="button"
                className="pointer-events-auto power-btn"
                onMouseEnter={() => { try { const a = powerHoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
                onClick={() => triggerHudPower(undefined)}
                aria-label="Power"
                title="Power"
                style={{
                  position: 'fixed',
                  left: 'calc(50% - 52px)', // slightly left of center (adjusted for larger size)
                  top: 'calc(50vh + 24px)', // nudged a little more down
                  width: 48, height: 48, borderRadius: 9999, zIndex: 95,
                  opacity: showOverlayUI ? 1 : 0,
                  transition: 'opacity 300ms ease',
                  pointerEvents: showOverlayUI ? 'auto' : 'none',
                }}
              >
                <span className="sr-only">Toggle HUD Power</span>
                <span className="power-glyph" aria-hidden>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 3v7" strokeLinecap="round" />
                    <path d="M6.7 6.7a7 7 0 1 0 9.9 0" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            ) : null}
            <audio ref={powerRef} src="/audio/join-alien.mp3" preload="auto" playsInline />
            <audio ref={powerHoverRef} src="/audio/hover.mp3" preload="auto" playsInline />
            {/* Click-to-activate overlay on opening screen: turn HUD on when area is tapped */}
            {!showHUD ? (
              <button
                type="button"
                className="absolute inset-0 pointer-events-auto"
                aria-label="Activate HUD"
                title="Activate HUD"
                style={{ background:'transparent', zIndex: 30, cursor:'pointer' }}
                onClick={() => { setHomeMode(true); setHomeIntroEnabled(false); setUserSelected(false); setLinks({ spotify: LINKS.spotify, apple: LINKS.apple }); triggerHudPower(true); }}
              />
            ) : null}
            <style jsx>{`
              .power-btn{
                position: relative;
                display:grid; place-items:center;
                border-radius:9999px;
                /* Hologram ring (blue) */
                background:
                  radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%),
                  linear-gradient(180deg, rgba(8,16,26,.45), rgba(0,0,0,.38));
                border:1px solid rgba(255,255,255,.14);
                box-shadow:
                  0 14px 28px rgba(0,0,0,.6),
                  0 0 38px #19E3FFCC,
                  0 0 110px #19E3FF88,
                  inset 0 1px 0 rgba(255,255,255,.22),
                  inset 0 -6px 14px rgba(0,0,0,.6);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                transition: transform .15s ease, box-shadow .2s ease, filter .18s ease;
                animation: powerPulse 2.6s ease-in-out infinite;
              }
              .power-btn::before{ /* outer halo */
                content:""; position:absolute; inset:-20%; border-radius:9999px; pointer-events:none;
                box-shadow: 0 0 56px #19E3FFFF, 0 0 150px #19E3FF99;
              }
              .power-btn::after{ /* sheen + scanlines */
                content:""; position:absolute; inset:0; border-radius:9999px; pointer-events:none; mix-blend-mode:screen; opacity:.6;
                background:
                  linear-gradient(120deg, rgba(255,255,255,.18), rgba(255,255,255,0) 60%),
                  repeating-linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.08) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px);
                transform: translateX(-130%);
                animation: powerSheen 3s ease-in-out infinite;
              }
              .power-glyph{ display:inline-flex; align-items:center; justify-content:center; color:#fff; filter: drop-shadow(0 0 16px #19E3FF) drop-shadow(0 0 46px #19E3FF); }
              .power-btn:hover{
                transform: scale(1.07);
                box-shadow:
                  0 18px 34px rgba(0,0,0,.68),
                  0 0 72px #19E3FFFF,
                  0 0 180px #19E3FFCC,
                  inset 0 1px 0 rgba(255,255,255,.28),
                  inset 0 -8px 18px rgba(0,0,0,.65);
                filter: brightness(1.08) saturate(1.15);
              }
              .power-btn:active{ transform: scale(.96); }
              @keyframes powerPulse{ 0%,100%{ filter: brightness(1) } 50%{ filter: brightness(1.08) } }
              @keyframes powerSheen { 0% { transform: translateX(-130%);} 55% { transform: translateX(130%);} 100% { transform: translateX(130%);} }
            `}</style>
        </div>
        <div className="hidden">
          <MediaDock
            onSkyChange={(webm, mp4, key) => setNextSky({ webm, mp4, key })}
        onPlayingChange={(p) => { setIsPlaying(p); if (p) setAmbientSuspended(false); }}
            onTrackChange={(t) => { setCurTrack(t); if (userSelected) { setLinks({ spotify: t.spotify || LINKS.spotify, apple: t.apple || LINKS.apple }); } else { setLinks({ spotify: LINKS.spotify, apple: LINKS.apple }); } }}
            playSignal={playSignal}
            toggleSignal={toggleSignal}
            showHUDPlay={false}
            index={channelIdx}
            onIndexChange={(i)=> setChannelIdx(i)}
            autoPlayOnIndex={false}
            unlockPlays={false}
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
