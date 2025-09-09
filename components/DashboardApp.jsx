"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { DEBUG_MEDIA, dlog, dwarn, dumpAudio } from "@/lib/debug";
// import SocialIcons from "@/components/SocialIcons";
// import StreamingButtons from "@/components/StreamingButtons";
import NeonCockpitRim from "@/components/NeonCockpitRim";
import { LINKS, POS } from "@/config/cockpit";
import { tracks } from "@/config/tracks";
import { buildPlanetSongs } from "@/lib/planets";
import { usePlayerStore } from "@/store/usePlayerStore";
// import JoinAliensBox from "@/components/JoinAliensBox";
import PrewarmThree from "@/components/PrewarmThree";
import { track } from "@/lib/analytics";

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
  const [showOverlayUI, setShowOverlayUI] = useState(false); // comms + join buttons
  const [allowWarp, setAllowWarp] = useState(false);
  const [homeMode, setHomeMode] = useState(false);
  const [homeIntroEnabled, setHomeIntroEnabled] = useState(true);
  const [pendingHomePower, setPendingHomePower] = useState(false);
  const [pendingTrackPlay, setPendingTrackPlay] = useState(false);
  const trackPlayTimerRef = React.useRef(undefined);
  const [ambientSuspended, setAmbientSuspended] = useState(false);
  const [firstStartDone, setFirstStartDone] = useState(false);
  const welcomeOnStartRef = React.useRef(false); // signals that welcome VO should play now
  const [cardModalOpen, setCardModalOpen] = useState(false); // track card modal state for beam dimming
  const SPACE_SKY = { webm: "/skies/space.webm", mp4: "/skies/space.mp4", key: "space" };
  
  // Detect mobile device for performance optimizations
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, [mounted]);

  // Centralized HUD power sequencing: play SFX then run beam/HUD fades
  const triggerHudPower = React.useCallback((turnOn) => {
    if (powerBusy) return;
    setPowerBusy(true);
    const turningOn = typeof turnOn === 'boolean' ? turnOn : (!beamEnabled && !showHUD);
    // Fire SFX; for turning on, fade in UI immediately with the SFX,
    // then start beam after SFX ends and finally fade HUD in
    try {
      if (turningOn) {
        // Use WebAudio SFX to avoid interrupting the music stream
        try { sfx.play('join', 0.9); } catch {}
        // Fade in comms/power/join together right as SFX starts
        setShowOverlayUI(true);
        // Keep ambient paused until after HUD fades in
        // Start light beam immediately with audio
        try { setBeamEnabled(true); } catch {}
        // Fade HUD in shortly after beam starts fading in (faster response)
        setTimeout(() => {
          setBeamOnly(false);
          setPowerBusy(false);
          // Only change ambient suspension if not interrupting welcome audio
          if (!welcomeOnStartRef.current) {
            setAmbientSuspended(false); // allow AmbientSpace to resume ambient and then VO
          }
        }, 150); // Further reduced to 150ms for even faster HUD fade-in after Start button
        // Only manage welcome audio during initial startup sequence, not manual power toggle
        if (pendingHomePower) {
          // Simulate SFX end callbacks without relying on an <audio> element
          const onSfxEndMs = 1200;
          setTimeout(() => {
            if (!welcomeOnStartRef.current) {
              try {
                const intro = document.querySelector('audio[data-intro="1"]');
                if (intro && typeof (intro).pause === 'function') {
                  (intro).pause();
                  try { (intro).currentTime = 0; } catch {}
                }
              } catch {}
              setHomeIntroEnabled(false);
            }
            setTimeout(() => { welcomeOnStartRef.current = false; }, 6000);
          }, onSfxEndMs);
          // Fallback if timers were throttled
          setTimeout(() => { welcomeOnStartRef.current = false; }, 2600);
        }
      } else {
        // Turning off: play join-alien SFX when powering down
        try { sfx.play('join', 0.9); } catch {}
      }
    } catch {}

    if (turningOn) {
      // Preserve current HUD content/state when powering on via the power button.
      // Initial home-mode activation is handled by callers (e.g., Start or opening overlay),
      // so avoid resetting to CHXNDLER here.
      // 1) Mount HUD hidden
      setShowHUD(true);
      setBeamOnly(true);
      // Keep ambient paused until HUD fades in, but don't interrupt welcome audio if playing
      if (!welcomeOnStartRef.current) {
        try { setAmbientSuspended(true); } catch {}
      }
      // Do not start beam yet; will start after SFX ends (above)
    } else {
      // Powering off: play SFX immediately (done above), then fade beam out first,
      // and immediately afterwards fade HUD display out.
      setBeamEnabled(false); // start beam fade-out immediately with audio
      setTimeout(() => { 
        setBeamOnly(true); // hide HUD content immediately after beam fades
        setTimeout(() => { setShowHUD(false); setPowerBusy(false); }, 50); // unmount HUD right after
      }, 150); // Reduced to match faster HUD fade-in timing for consistency
    }
  }, [powerBusy, beamEnabled, showHUD]);

  function onSongChange(id){
    const slug = id;
    const idx = tracks.findIndex(t => (t.slug||"") === slug || (t.slug||"").startsWith(slug));
    if (idx >= 0) {
      // Track song selection from HUD
      const selectedTrack = tracks[idx];
      try {
        track('song_selected', { 
          song_slug: slug,
          payload: { 
            song_title: selectedTrack?.title || slug,
            source: 'hud_panel',
            track_index: idx
          } 
        });
      } catch {}
      
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
          try { a.muted = true; a.play().then(()=>{ a.pause(); a.currentTime = 0; }).catch((e)=>{ if (DEBUG_MEDIA) dwarn('gesture prime rejected', e?.name, e?.message); }); } catch {}
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
          if (DEBUG_MEDIA) { dlog('onSongChange: primed muted play', { src }); dumpAudio(audioEl, 'onSongChange:prime'); }
        }
      } catch {}
      // Defer audio start until lightspeed overlay finishes AND the target sky video is playing.
      // Mark this as a pending track play and let SkyboxVideo's onBasePlaying trigger it.
      setPendingTrackPlay(true);
      // Trigger lightspeed overlay + warp SFX and switch sky.
      setAllowWarp(true);
      setNextSky(skyFor(tracks[idx].slug));
      setFlySignal((n) => n + 1);
      // Extra safety: schedule a fallback play signal in case base video 'playing' isn't fired (same-sky key or race)
      try {
        if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); trackPlayTimerRef.current = undefined; }
        trackPlayTimerRef.current = window.setTimeout(() => {
          setPlaySignal((n) => n + 1);
          trackPlayTimerRef.current = undefined;
        }, 1850);
      } catch {}
    }
  }

  React.useEffect(() => { 
    if (!mounted) return;
    setFlySignal((n)=> n + 1); 
  }, [channelIdx, mounted]);
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

  // Listen for card modal events to dim light beam
  React.useEffect(() => {
    const handleShowCard = () => setCardModalOpen(true);
    const handleHideCard = () => setCardModalOpen(false);
    
    window.addEventListener('showCoverCard', handleShowCard);
    window.addEventListener('hideCoverCard', handleHideCard);
    
    return () => {
      window.removeEventListener('showCoverCard', handleShowCard);
      window.removeEventListener('hideCoverCard', handleHideCard);
    };
  }, []);

  // Spacebar and Pause key toggle for music play/pause
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Trigger on spacebar (not in input fields) or pause key (anywhere)
      const isSpacebar = e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target?.tagName);
      const isPauseKey = e.code === 'Pause';
      
      if (isSpacebar || isPauseKey) {
        e.preventDefault(); // Prevent default behavior
        setToggleSignal((n) => n + 1); // Trigger music toggle
        try { sfx.play('click', 0.6); } catch {} // Optional click sound feedback
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Memoize expensive style calculations
  const blurWrapperStyle = useMemo(() => ({
    filter: cardModalOpen ? 'blur(2px)' : 'none',
    transition: 'filter 300ms ease'
  }), [cardModalOpen]);

  const lightBeamStyle = useMemo(() => ({
    left: '50%',
    bottom: '40vh',
    top: '50vh', // Pulled down from 42vh to 50vh (8vh lower)
    width: 'min(1400px, 85vw)',
    transform: 'translateX(-50%)',
    opacity: beamEnabled ? (cardModalOpen ? 0.3 : 1) : 0,
    transition: 'opacity 300ms ease'
  }), [beamEnabled, cardModalOpen]);

  if (!mounted) return null;
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div 
        className="absolute inset-0"
        style={blurWrapperStyle}
      >
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
        onFlyStart={() => {
          setWarpActive(true);
          // Stop any currently playing track as soon as warp begins
          try {
            const a = document.querySelector('audio[data-audio-player="1"]');
            if (a) { a.pause(); if (DEBUG_MEDIA) dlog('onFlyStart: paused main audio'); }
          } catch {}
          setIsPlaying(false);
        }}
        onFlyEnd={() => {
          setWarpActive(false);
          setAllowWarp(false);
          if (nextSky) { setSky(nextSky); setNextSky(null); }
          // If this warp was due to Start (not track selection), prepare to land on home
          if (!pendingTrackPlay) setPendingHomePower(true);
          else {
            // Warp overlay just finished for a song change: start playback now.
            if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); trackPlayTimerRef.current = undefined; }
            setPlaySignal((n) => n + 1);
          }
        }}
        onBasePlaying={() => {
          if (DEBUG_MEDIA) dlog('Sky base video playing');
          if (pendingHomePower) {
            // Start path: ensure main track audio stays stopped on landing
            try {
              const a = document.querySelector('audio[data-audio-player="1"]');
              if (a) { a.pause(); try { a.currentTime = 0; } catch {} }
            } catch {}
            setIsPlaying(false);
            setPendingHomePower(false);
            // Now that space.mp4 is playing
            setHomeMode(true);
            // First Start: enable welcome VO to play over ambient once space-music is in
            if (!firstStartDone) {
              welcomeOnStartRef.current = true; // signal power-up not to cancel it
              setHomeIntroEnabled(true);
              setFirstStartDone(true);
            }
            setUserSelected(false);
            setLinks({ spotify: LINKS.spotify, apple: LINKS.apple });
            // Keep ambient paused until UI beam + HUD have faded in
            setAmbientSuspended(true);
            // Begin HUD power sequence: plays join-alien SFX, then beam fade-in, then HUD fade-in
            // Add brief delay after warp, then immediately start HUD sequence
            setTimeout(() => {
              try { triggerHudPower(true); } catch {}
            }, 400); // Reduced to 400ms for faster HUD appearance
          }
          if (pendingTrackPlay) {
            // Do not start audio here; wait for onFlyEnd so playback begins after warp SFX ends.
            // Clear any pending fallback timers; onFlyEnd will trigger play immediately.
            if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); trackPlayTimerRef.current = undefined; }
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
        onPowerToggle={() => { 
          // Manual power toggle should not start new welcome audio, but don't interrupt if it's already playing
          if (!welcomeOnStartRef.current) {
            // Only disable welcome intro if it's not currently playing
            setHomeIntroEnabled(false);
          }
          triggerHudPower(undefined); 
        }}
        onLaunch={() => {
          // Start: hide all UI first, then warp overlay + sound, then land on CHXNDLER homepage
          // Hide HUD, comms, join, and power buttons during warp
          setShowHUD(false);
          setShowOverlayUI(false);
          setBeamEnabled(false);
          
          // Hard-stop any main track audio so Start never blips a song
          try {
            const a = document.querySelector('audio[data-audio-player="1"]');
            if (a) {
              a.pause();
              try { a.currentTime = 0; } catch {}
              try { a.muted = true; } catch {}
              try { a.removeAttribute('src'); } catch {}
              try { a.load(); } catch {}
            }
          } catch {}
          setIsPlaying(false);
          setAllowWarp(true);
          setNextSky(SPACE_SKY);
          setFlySignal((n) => n + 1);
          // UI will reappear when space.mp4 starts playing via triggerHudPower
        }}
      />
      {/* Removed Join the Aliens dashboard panel per request */}
      </div> {/* Close blur wrapper */}

      <Slot
        className="slot-container"
        rects={[
          // Widen HUD much more: extend further on both sides, especially for mobile portrait
          { minWidth: 420, maxWidth: 460, top: -1.2, left: 12, width: 76, height: 14, orientation: 'portrait' }, // Much wider on mobile portrait
          { maxWidth: 419, top: 0.0, left: 10, width: 80, height: 14, orientation: 'portrait' }, // Even wider on small mobile portrait
          { minWidth: 480, maxWidth: 740, top: -8.0, left: 16, width: 74, height: 14, orientation: 'landscape' }, // Moved up significantly for mobile landscape
          { minWidth: 741, maxWidth: 1024, top: -0.8, left: 15.5, width: 72, height: 15 },
          { minWidth: 1025, top: -1.2, left: 15, width: 74, height: 15 },
        ]}
      >
        <div className="relative h-full w-full p-0" style={{ overflow: 'visible' }} suppressHydrationWarning>
          {showHUD ? (
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

      {/* Responsive upward shooting light beam - wider on mobile to match HUD proportions */}
      {mounted && (beamEnabled || showHUD) ? (
        <div 
          className="fixed pointer-events-none z-30 light-beam-animation"
          style={lightBeamStyle}
        >
          {/* Single main beam */}
          <div 
            style={{
              position: 'absolute',
              left: '3%', // Reduced from 5% to make beam wider on mobile
              right: '3%', // Reduced from 5% to make beam wider on mobile
              bottom: '0px', 
              top: '0%',
              clipPath: 'polygon(48% 100%, 52% 100%, 1% 0, 99% 0)', // Wider beam top to match wider HUD
              background: isMobile 
                ? // Simplified gradient for mobile performance
                  `linear-gradient(180deg, 
                    rgba(25,227,255,0.0) 0%, 
                    rgba(25,227,255,0.25) 50%, 
                    rgba(25,227,255,0.0) 100%)`
                : // Full complexity for desktop
                  `linear-gradient(180deg, 
                    rgba(25,227,255,0.0) 0%, 
                    rgba(25,227,255,0.15) 15%, 
                    rgba(25,227,255,0.35) 40%, 
                    rgba(25,227,255,0.55) 65%, 
                    rgba(25,227,255,0.35) 85%, 
                    rgba(25,227,255,0.0) 100%),
                  repeating-linear-gradient(180deg,
                    transparent 0px,
                    rgba(25,227,255,0.1) 20px,
                    rgba(25,227,255,0.2) 40px,
                    rgba(25,227,255,0.1) 60px,
                    transparent 80px)`,
              backgroundSize: isMobile ? '100% 100%' : '100% 100%, 100% 160px',
              filter: isMobile ? 'blur(4px)' : 'blur(8px)', // Less blur on mobile
              mixBlendMode: 'screen',
              animation: isMobile ? 'beamFlow 4s linear infinite' : 'beamFlow 3s linear infinite' // Slower on mobile
            }}
          />
        </div>
      ) : null}

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
