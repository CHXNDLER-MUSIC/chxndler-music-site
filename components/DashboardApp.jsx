"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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
import MediaPlayer from "@/components/MediaPlayer";
import { sfx } from "@/lib/sfx";
import { LINKS, POS } from "@/config/cockpit";
import { tracks } from "@/lib/songs-consolidated";
import { buildPlanetSongs } from "@/lib/planets";
import { usePlayerStore } from "@/store/usePlayerStore";
import PrewarmThree from "@/components/PrewarmThree";
import { track } from "@/lib/analytics";
import PreloadMedia from "@/components/PreloadMedia";
import { slugify } from "@/lib/slug";

export default function DashboardApp({ initialSlug } = {}) {
  const [channelIdx, setChannelIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sky, setSky] = useState(introSky);
  const [links, setLinks] = useState({ spotify: LINKS.spotify, apple: LINKS.apple });
  const [userSelected, setUserSelected] = useState(false);
  const [curTrack, setCurTrack] = useState(tracks.find(t => t.slug === initialSlug) || tracks.find(t => t.title === "WE'RE JUST FRIENDS") || tracks[0]);
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
  const [uiCloseSignal, setUiCloseSignal] = useState(0); // increment to force-close buttons/menus during warp
  // Gate overlay + HUD power-up until Start is pressed (or deep link)
  const [uiUnlocked, setUiUnlocked] = useState(false);
  const [allowWarp, setAllowWarp] = useState(false); // show initial lightspeed overlay
  const [landingMode, setLandingMode] = useState(true); // initial screen state
  const [landingRevealReady, setLandingRevealReady] = useState(false); // when true, allow initial overlay to hide
  const [homeMode, setHomeMode] = useState(false);
  const [homeIntroEnabled, setHomeIntroEnabled] = useState(true);
  const [pendingHomePower, setPendingHomePower] = useState(false);
  const [pendingTrackPlay, setPendingTrackPlay] = useState(false);
  const [pendingOverlayReveal, setPendingOverlayReveal] = useState(false); // wait to show overlay until warp SFX ends
  const trackPlayTimerRef = React.useRef(undefined);
  // Keep ambient fully silent until Start is clicked
  const [ambientSuspended, setAmbientSuspended] = useState(true);
  const [firstStartDone, setFirstStartDone] = useState(false);
  const [welcomeHasPlayed, setWelcomeHasPlayed] = useState(false); // tracks if welcome has ever been played
  const welcomeOnStartRef = React.useRef(false); // signals that welcome VO should play now
  const startButtonWarpRef = React.useRef(false); // prevents double warp when start button is clicked
  // Ensure song MP3 starts only after button SFX finishes; start SFX at warp end
  const buttonSfxWaitRef = React.useRef(null);
  const [cardModalOpen, setCardModalOpen] = useState(false); // track card modal state for beam dimming
  const [joinAlienOpen, setJoinAlienOpen] = useState(false); // track join alien button state for pink beam
  const [beamColor, setBeamColor] = useState('blue'); // track active beam color
  const [showDimmingOverlay, setShowDimmingOverlay] = useState(true); // show dimming overlay on initial load
  const [beamTransitioning, setBeamTransitioning] = useState(false); // prevent rapid beam changes
  const SPACE_SKY = { webm: "/skies/space.webm", mp4: "/skies/space.mp4", key: "space" };
  

  // Centralized HUD power sequencing: play SFX then run beam/HUD fades
  const triggerHudPower = React.useCallback((turnOn) => {
    // Prevent HUD/beam/buttons enabling before Start press
    if (!uiUnlocked) return;
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
          setShowHUD(true);
          setBeamOnly(false);
          setPowerBusy(false);
          // Ensure overlay UI is visible after HUD fades in (in case of race conditions)
          setShowOverlayUI(true);
          // If welcome audio should play, delay ambient resumption for better timing
          if (welcomeOnStartRef.current) {
            setTimeout(() => {
              setAmbientSuspended(false); // Resume ambient and trigger welcome VO after HUD fade
            }, 200); // Small delay after HUD fade completes to ensure smooth transition
          } else {
            setAmbientSuspended(false); // allow AmbientSpace to resume ambient immediately
          }
        }, 150); // Further reduced to 150ms for even faster HUD fade-in after Start button
        // Do not cancel welcome VO here; reveal path (onWarpSfxEnd) manages it
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
      // Keep ambient paused until HUD fades in; reveal path will resume and play VO if needed
      try { setAmbientSuspended(true); } catch {}
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
  }, [powerBusy, beamEnabled, showHUD, uiUnlocked]);

  function onSongChange(id){
    // In-app song change without spotlight/beam/route reloads
    const slug = slugify(String(id || ''));
    let idx = tracks.findIndex(t => (t.slug || '').toLowerCase() === slug);
    if (idx < 0) idx = tracks.findIndex(t => (t.title || '').toLowerCase().includes(slug));
    if (idx < 0) return;

    // Mark as user-driven to suppress fly/warp flashes on index change
    setUserSelected(true);
    setHomeMode(false);

    // Update HUD copy and streaming links
    const t = tracks[idx];
    setCurTrack(t);
    setLinks({ spotify: t.spotify || LINKS.spotify, apple: t.apple || LINKS.apple });

    // Switch MediaPlayer channel; MediaPlayer handles audio swap without reloading page
    setChannelIdx(idx);
    // Proactively point the hidden audio element at the selected track so that
    // any subsequent play trigger (after warp/base video) uses the correct song.
    try {
      const audioEl = document.querySelector('audio[data-audio-player="1"]');
      const src = t?.src || '';
      if (audioEl && src) {
        if (audioEl.getAttribute('src') !== src) audioEl.setAttribute('src', src);
        audioEl.muted = true; audioEl.volume = 0.0;
        // Prime buffer quietly to satisfy autoplay policies later
        audioEl.play().then(() => { try { audioEl.pause(); audioEl.currentTime = 0; } catch {} }).catch(()=>{});
      }
    } catch {}
    // After user selects a song, we want to warp and then start playback
    // once the warp completes and base sky is confirmed playing.
    setPendingTrackPlay(true);
    
    // Trigger warp sequence with new song's sky
    setAllowWarp(true);
    // Switch base sky immediately so it loads while lightspeed overlay plays
    setSky(skyFor(t.slug));
    setNextSky(null);
    setFlySignal((n) => n + 1);
  }

  // Trigger a fly transition only when the channel index actually changes (not on initial mount)
  // and only if it wasn't driven by an explicit user selection. This prevents the initial
  // page load from auto-revealing the UI before the Start button is clicked.
  // JS file: avoid TypeScript generics here
  const prevIdxRef = React.useRef(null);
  React.useEffect(() => {
    if (!mounted) return;
    // Skip first run to avoid triggering on initial mount
    if (prevIdxRef.current === null) { prevIdxRef.current = channelIdx; return; }
    // Only trigger when index changes implicitly (e.g., auto-advance), not when user selected
    if (!userSelected && !startButtonWarpRef.current && !warpActive && prevIdxRef.current !== channelIdx) {
      setFlySignal((n) => n + 1);
    }
    prevIdxRef.current = channelIdx;
  }, [channelIdx, mounted, userSelected, warpActive]);
  const { hudSongs, holoSongs } = React.useMemo(() => buildPlanetSongs(), []);
  React.useEffect(() => {
    try {
      if (usePlayerStore && typeof usePlayerStore.getState === 'function') {
        usePlayerStore.getState().initSongs(holoSongs);
      }
    } catch {}
  }, [holoSongs]);
  React.useEffect(() => {
    if (!curTrack || homeMode) return;
    const slug = (curTrack.slug || "").toLowerCase();
    if (slug) {
      try { usePlayerStore.getState().setMain(slug); } catch {}
    }
  }, [curTrack?.slug, homeMode]);

  // Note: Song selection is now handled directly by calling onSongChange from user gestures

  // (Removed) implicit sky change on track change to avoid accidental warps.

  useEffect(() => { setMounted(true); }, []);

  // If an initial slug is provided (route-based song page), orchestrate warp + playback
  useEffect(() => {
    if (!mounted) return;
    if (!initialSlug) return;
    if (startButtonWarpRef.current) return; // Skip if start button is handling warp
    const t = tracks.find((x) => x.slug === initialSlug);
    if (!t) return;
    // Deep link unlocks overlay UI so buttons can show after warp
    setUiUnlocked(true);
    // Mirror onSongChange sequencing but for route entry
    setCurTrack(t);
    setUserSelected(true);
    setHomeMode(false);
    setLinks({ spotify: t.spotify || LINKS.spotify, apple: t.apple || LINKS.apple });
    // Hide UI before warp
    setShowHUD(false);
    setShowOverlayUI(false);
    setBeamEnabled(false);
    setAmbientSuspended(true);
    // Select channel index for MediaPlayer
    const idx = tracks.findIndex((x) => (x.slug || '').toLowerCase() === (t.slug || '').toLowerCase());
    if (idx >= 0) setChannelIdx(idx);
    // Prime hidden audio element for autoplay (muted)
    try {
      const audioEl = document.querySelector('audio[data-audio-player="1"]');
      const src = t?.src || '';
      if (audioEl && src) {
        if (audioEl.getAttribute('src') !== src) audioEl.setAttribute('src', src);
        audioEl.muted = true; (audioEl).volume = 0.0;
        audioEl.play().then(() => { (audioEl).pause(); (audioEl).currentTime = 0; }).catch(()=>{});
      }
    } catch {}
    // Defer audio until warp completes and base sky is playing
    try { buttonSfxWaitRef.current = null; } catch {}
    setPendingTrackPlay(true);
    // Trigger warp overlay and switch sky to this song
    setAllowWarp(true);
    setNextSky(skyFor(t.slug));
    setFlySignal((n) => n + 1);
  }, [mounted, initialSlug]);
  // Disable auto actions on random interactions; nothing should trigger on click/touch/move
  React.useEffect(() => { /* intentionally empty */ }, [mounted]);

  // Removed deferral: switch base sky earlier so it loads under the lightspeed overlay.

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

  // Handle beam color control with strict mutual exclusion between displays
  const handleBeamToggle = React.useCallback((color) => {
    if (beamTransitioning) return; // Prevent rapid changes during transitions
    
    // Always close ALL displays first, then open the target display
    const closeAllDisplays = () => {
      setShowHUD(false);
      setJoinAlienOpen(false);
      setBeamEnabled(false);
    };
    
    if (color === 'off') {
      // Explicit request to turn everything off without switching to blue display
      closeAllDisplays();
      setBeamColor('blue'); // reset baseline without opening HUD
      return;
    }

    if (color === 'pink') {
      if (beamColor === 'pink' && joinAlienOpen) {
        // Already showing pink - toggle off
        setBeamTransitioning(true);
        closeAllDisplays();
        setTimeout(() => {
          setBeamColor('blue');
          setBeamTransitioning(false);
        }, 150);
      } else {
        // Switch to pink - close everything first
        setBeamTransitioning(true);
        closeAllDisplays();
        setTimeout(() => {
          setBeamColor('pink');
          setBeamEnabled(true);
          setJoinAlienOpen(true);
          setBeamTransitioning(false);
        }, 150);
      }
    } else if (color === 'yellow') {
      if (beamColor === 'yellow') {
        // Already showing yellow - keep beam active but menu will close itself
        // Do nothing - let yellow menu handle its own toggle
      } else {
        // Switch to yellow - close everything first
        closeAllDisplays();
        setTimeout(() => {
          setBeamColor('yellow');
          setBeamEnabled(true);
          // Yellow menu will open itself
        }, 150);
      }
    } else if (color === 'blue') {
      if (beamColor === 'blue' && showHUD) {
        // Already showing blue - toggle off
        closeAllDisplays();
        setTimeout(() => {
          setBeamColor('blue'); // Keep blue as default
        }, 100);
      } else {
        // Switch to blue - close everything first
        closeAllDisplays();
        setTimeout(() => {
          setBeamColor('blue');
          setBeamEnabled(true);
          setShowHUD(true);
        }, 150);
      }
    }
  }, [beamColor, showHUD, joinAlienOpen, beamTransitioning]);

  // Spacebar and Pause key toggle for music play/pause (disabled until Start unlocks UI)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (!uiUnlocked) return; // Ignore all media key input before Start
      // Trigger on spacebar (not in input fields) or pause/media keys (anywhere)
      const tag = (e.target?.tagName || '').toUpperCase();
      const inTextField = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target?.isContentEditable === true);
      const isSpacebar = !inTextField && (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar');
      const isPauseKey = e.code === 'Pause' || e.code === 'MediaPlayPause' || e.key === 'MediaPlayPause';
      
      if (isSpacebar || isPauseKey) {
        e.preventDefault(); // Prevent default behavior (scroll/click on focused buttons)
        setToggleSignal((n) => n + 1); // Trigger music toggle
        try { sfx.play('click', 0.6); } catch {} // Optional click sound feedback
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiUnlocked]);

  // Enable SFX globally only after Start unlocks the UI
  React.useEffect(() => {
    try { sfx.setEnabled(!!uiUnlocked); } catch {}
    try { (window).__CHX_UI_UNLOCKED = !!uiUnlocked; } catch {}
  }, [uiUnlocked]);

  // Compute effective playing state: true if main track OR space music is playing
  const effectivelyPlaying = useMemo(() => {
    // Main track is playing
    if (isPlaying) return true;
    // Space music is playing when not suspended and not main track playing
    return !ambientSuspended && !warpActive && !isPlaying;
  }, [isPlaying, ambientSuspended, warpActive]);

  // Helper function to get beam gradient based on active beam color
  const getBeamGradient = useMemo(() => {
    const gradients = {
      blue: `linear-gradient(180deg, 
        rgba(25,227,255, 0.0) 0%, 
        rgba(25,227,255, 0.15) 15%, 
        rgba(25,227,255, 0.35) 40%, 
        rgba(25,227,255, 0.55) 65%, 
        rgba(25,227,255, 0.35) 85%, 
        rgba(25,227,255, 0.0) 100%),
      repeating-linear-gradient(180deg,
        transparent 0px,
        rgba(25,227,255, 0.1) 20px,
        rgba(25,227,255, 0.2) 40px,
        rgba(25,227,255, 0.1) 60px,
        transparent 80px)`,
      yellow: `linear-gradient(180deg, 
        rgba(242,239,29, 0.0) 0%, 
        rgba(242,239,29, 0.15) 15%, 
        rgba(242,239,29, 0.35) 40%, 
        rgba(242,239,29, 0.55) 65%, 
        rgba(242,239,29, 0.35) 85%, 
        rgba(242,239,29, 0.0) 100%),
      repeating-linear-gradient(180deg,
        transparent 0px,
        rgba(242,239,29, 0.1) 20px,
        rgba(242,239,29, 0.2) 40px,
        rgba(242,239,29, 0.1) 60px,
        transparent 80px)`,
      pink: `linear-gradient(180deg, 
        rgba(252,84,175, 0.0) 0%, 
        rgba(252,84,175, 0.15) 15%, 
        rgba(252,84,175, 0.35) 40%, 
        rgba(252,84,175, 0.55) 65%, 
        rgba(252,84,175, 0.35) 85%, 
        rgba(252,84,175, 0.0) 100%),
      repeating-linear-gradient(180deg,
        transparent 0px,
        rgba(252,84,175, 0.1) 20px,
        rgba(252,84,175, 0.2) 40px,
        rgba(252,84,175, 0.1) 60px,
        transparent 80px)`
    };
    return gradients[beamColor] || gradients.blue;
  }, [beamColor]);

  // Memoize expensive style calculations
  const blurWrapperStyle = useMemo(() => ({
    filter: cardModalOpen ? 'blur(2px)' : 'none',
    transition: 'filter 300ms ease'
  }), [cardModalOpen]);

  const lightBeamStyle = useMemo(() => {
    // Position the light beam independently (higher), using global CSS variable
    return {
      left: '50%',
      bottom: 'var(--beam-bottom)',
      height: 'var(--beam-height)',
      width: 'var(--display-width)',
      transform: 'translate3d(-50%,0,0)',
      // Tie beam visibility to overlay UI being shown and Start having been pressed, and hide during warp
      opacity: (uiUnlocked && showOverlayUI && (beamEnabled || showHUD) && !warpActive) ? (cardModalOpen ? 0.3 : 1) : 0,
      transition: 'opacity 400ms ease-in-out'
    };
  }, [beamEnabled, showHUD, cardModalOpen, uiUnlocked, showOverlayUI, warpActive]);

  // Position the blue display so its bottom touches the light beam top
  const hudBottom = useMemo(() => 'var(--display-touch-top)', []);

  // Provide CSS variables globally (avoids any runtime style factory edge cases)

  if (!mounted) {
    // Return a black screen with proper dimensions while loading
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-white max-w-screen overflow-x-hidden" style={{ minWidth: '100vw', minHeight: '100vh' }}>
        <div className="absolute inset-0 bg-black" />
      </main>
    );
  }
  const SHOW_CENTER_BEAM = true; // Enable center light beam
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white max-w-screen overflow-x-hidden" style={{ minWidth: '100vw', minHeight: '100vh' }}>
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
        // Keep the lightspeed overlay visible until overlay UI appears
        holdLightspeed={true}
        readyToReveal={uiUnlocked && showOverlayUI}
        minDurationMs={3000}
        offsetY="-1vh"
        onWarpSfxEnd={() => {
          // If we're landing on home via Start, reveal overlay/UI after warp finishes
          if (pendingOverlayReveal) {
            // Ensure we are in home mode (CHXNDLER) before revealing HUD
            try { setHomeMode(true); } catch {}
            try { setUserSelected(false); } catch {}
            try { usePlayerStore.setState({ mainId: null }); } catch {}
            try { setLinks({ spotify: LINKS.spotify, apple: LINKS.apple }); } catch {}
            // Enable welcome VO once if Start requested it and it hasn't played yet
            try {
              if (welcomeOnStartRef.current && !welcomeHasPlayed) {
                setHomeIntroEnabled(true);
                setWelcomeHasPlayed(true);
              } else {
                setHomeIntroEnabled(false);
              }
            } catch {}
            // Switch background sky in the same render pass for simultaneous reveal
            try {
              if (nextSky) { setSky(nextSky); setNextSky(null); }
            } catch {}
            // Play the button sound exactly at reveal time
            try { sfx.play('button', 0.9); } catch {}
            try { setShowOverlayUI(true); } catch {}
            try { setBeamEnabled(true); } catch {}
            try { setShowHUD(true); } catch {}
            try { setBeamOnly(false); } catch {}
            try { setPowerBusy(false); } catch {}
            try { setLandingRevealReady(true); } catch {}
            // Resume ambient slightly after UI fades begin for smoothness
            setTimeout(() => { 
              setAmbientSuspended(false); 
              try { window.dispatchEvent(new Event('ambient:play')); } catch {}
            }, 100);
            // Clear one-time flag to avoid repeats on later Starts
            try { welcomeOnStartRef.current = false; } catch {}
            setPendingOverlayReveal(false);
          }
        }}
        onFlyStart={() => {
          setWarpActive(true);
          // Stop any currently playing track as soon as warp begins
          try {
            const a = document.querySelector('audio[data-audio-player="1"]');
            if (a) { a.pause(); }
          } catch {}
          setIsPlaying(false);
        }}
        onFlyEnd={() => {
          setWarpActive(false);
          setAllowWarp(false);
          setLandingMode(false); // leave landing mode after first warp
          // Reset start button warp flag to allow normal effects to resume
          startButtonWarpRef.current = false;
          // If a track play is pending, begin UI fade-in immediately at warp end
          // and start the button SFX right away so it completes before music starts
          if (pendingTrackPlay) {
            try {
              // Cancel any fallback that might race with our sequencing
              if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); trackPlayTimerRef.current = undefined; }
            } catch {}
            // Reveal UI elements together (beam + HUD + buttons) now
            setShowHUD(true);
            setBeamEnabled(true);
            setBeamOnly(false);
            setShowOverlayUI(true);
            // Kick off button SFX now (right after warp)
            try { buttonSfxWaitRef.current = sfx.playAndWait('button', 0.9); } catch { buttonSfxWaitRef.current = null; }
            // Safety: if base video readiness callback is delayed, start music after a grace period
            try {
              if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); }
              trackPlayTimerRef.current = window.setTimeout(() => {
                if (pendingTrackPlay) {
                  setPlaySignal((n) => n + 1);
                  setPendingTrackPlay(false);
                }
                trackPlayTimerRef.current = undefined;
              }, 4500);
            } catch {}
          }
          // Defer applying nextSky until overlay UI is visible so base stays lightspeed
          // If this warp was due to Start (not track selection), prepare to land on home.
          // For song selections (userSelected), do not fall back to home even if timers race.
          if (!pendingTrackPlay && !userSelected) setPendingHomePower(true);
          else {
            // Only start UI fade-in and audio sequencing when the base sky MP4 is confirmed playing via onBasePlaying
          }
        }}
        onBasePlaying={() => {
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
            // Clear any selected planet for home mode
            try { usePlayerStore.setState({ mainId: null }); } catch {}
            // First Start: enable welcome VO to play over ambient once space-music is in
            if (!firstStartDone && !welcomeHasPlayed) {
              welcomeOnStartRef.current = true; // signal power-up not to cancel it
              setHomeIntroEnabled(true);
              setFirstStartDone(true);
              setWelcomeHasPlayed(true); // mark that welcome will play/has played
            }
            setUserSelected(false);
            setLinks({ spotify: LINKS.spotify, apple: LINKS.apple });
            // Keep ambient paused until UI beam + HUD have faded in
            setAmbientSuspended(true);
            // Defer overlay/UI reveal until warp SFX has finished
            setPendingOverlayReveal(true);
          }
          // For track changes: only trigger music when warp has ended and we are pending a track play
          if (pendingTrackPlay && !warpActive) {
            // Clear any pending fallback timers now that we'll start playback here
            if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); trackPlayTimerRef.current = undefined; }
            // UI has already been revealed at warp end. Now, only start the song MP3
            // after the button SFX has finished.
            if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); trackPlayTimerRef.current = undefined; }
            const startSong = () => { setPlaySignal((n) => n + 1); setPendingTrackPlay(false); buttonSfxWaitRef.current = null; };
            try {
              const p = buttonSfxWaitRef.current;
              if (p && typeof p.then === 'function') {
                p.then(startSong).catch(() => { setTimeout(startSong, 200); });
              } else {
                // If SFX wasn't started, play it now and wait
                sfx.playAndWait('button', 0.9).then(startSong).catch(() => setTimeout(startSong, 1000));
              }
            } catch {
              // Fallback: if SFX path fails, delay slightly before starting
              setTimeout(startSong, 600);
            }
          }
        }}
      />

      <div 
        className="fixed inset-0 z-20 pointer-events-none cockpit-bg"
        aria-hidden="true" 
      />
      <SteeringWheelOverlay
        POS={POS}
        playing={isPlaying}
        showUI={uiUnlocked && showOverlayUI && !warpActive}
        onJoinToggle={setJoinAlienOpen}
        onBeamColorChange={handleBeamToggle}
        closeAllSignal={uiCloseSignal}
        suspendUI={warpActive}
        onPowerToggle={() => { 
          // Manual power toggle should not start new welcome audio, but don't interrupt if it's already playing
          if (!welcomeOnStartRef.current) {
            // Only disable welcome intro if it's not currently playing
            setHomeIntroEnabled(false);
          }
          // Blue button behavior is now handled entirely by handleBeamToggle('blue')
          // No need to call triggerHudPower since beam system manages everything
        }}
        onLaunch={() => {
          // Mark welcome VO to play exactly once on first Start
          if (!welcomeHasPlayed) { welcomeOnStartRef.current = true; }
          // For Start flow: reveal overlay only after warp.mp3 finishes
          setPendingOverlayReveal(true);
          // Unlock overlay UI/HUD sequencing on Start press
          setUiUnlocked(true);
          // Hide dimming overlay when start is clicked
          setShowDimmingOverlay(false);
          // Allow the initial lightspeed loop to hide when we kick off warp
          setLandingRevealReady(true);
          
          // ALWAYS trigger warp sequence when start button is pressed
          // Reset any track selection state to ensure we go to homepage BEFORE setting warp flag
          setUserSelected(false);
          setHomeMode(false); // Will be set to true after warp completes
          
          // Set flag to prevent double warp from automatic effects AFTER state changes
          startButtonWarpRef.current = true;
          
          // Stop any playing audio and clear track state
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
          
          // Clear any selected planet for homepage
          try { usePlayerStore.setState({ mainId: null }); } catch {}
          
          // Fade out all UI elements before warp
          setShowHUD(false);
          setShowOverlayUI(false);
          setBeamEnabled(false);
          
          // Set flag to indicate we should go to home mode after warp
          setPendingHomePower(true);
          
          // ALWAYS start warp sequence to take user to CHXNDLER homepage
          setAllowWarp(true);
          // Switch to space sky immediately so the base video can preload under lightspeed
          setSky(SPACE_SKY);
          setNextSky(null);
          setFlySignal((n) => n + 1);
          
          // Reset to homepage defaults
          setLinks({ spotify: LINKS.spotify, apple: LINKS.apple });
        }}
      />
      </div> {/* Close blur wrapper */}

      {/* Blue display rendered as overlay sibling via portal */}
      {typeof window !== 'undefined' ? createPortal(
        (
          <div 
            className="slot-container"
            style={{
              position: 'fixed',
              bottom: hudBottom,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'var(--display-width)',
              height: 'var(--display-width)',
              zIndex: 93,
              borderRadius: 'var(--display-border-radius)'
            }}
          >
            <div className="relative h-full w-full p-0" style={{ overflow: 'visible' }} suppressHydrationWarning>
              {/* Pre-mount HUDPanel; reveal via opacity so it is ready instantly */}
              <motion.div
                className="absolute inset-0 p-0"
                suppressHydrationWarning
                initial={{ opacity: 0 }}
                animate={{ opacity: (uiUnlocked && showOverlayUI && showHUD && !warpActive) ? 1 : 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200, duration: 0.3 }}
                style={{ pointerEvents: (uiUnlocked && showOverlayUI && showHUD && !warpActive) ? 'auto' : 'none', visibility: (uiUnlocked && showOverlayUI) ? 'visible' : 'hidden' }}
              >
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
              </motion.div>
              {!showHUD ? (
                <button
                  type="button"
                  className="absolute inset-0 pointer-events-auto"
                  aria-label="Activate HUD"
                  title="Activate HUD"
                  style={{ background:'transparent', zIndex: 30, cursor:'pointer' }}
                  onClick={() => {
                    if (!uiUnlocked) return;
                    setShowDimmingOverlay(false);
                    setHomeMode(true);
                    try { usePlayerStore.setState({ mainId: null }); } catch {}
                    setHomeIntroEnabled(false);
                    setUserSelected(false);
                    setLinks({ spotify: LINKS.spotify, apple: LINKS.apple });
                    triggerHudPower(true);
                  }}
                />
              ) : null}
            </div>
            <div className="hidden">
              <MediaPlayer
                onSkyChange={(webm, mp4, key) => setNextSky({ webm, mp4, key })}
                onPlayingChange={(p) => { setIsPlaying(p); if (p) setAmbientSuspended(false); }}
                onAudioReady={() => {}}
                onTrackChange={(t) => { 

                  setCurTrack(t); 
                  if (userSelected) { setLinks({ spotify: t.spotify || LINKS.spotify, apple: t.apple || LINKS.apple }); } else { setLinks({ spotify: LINKS.spotify, apple: LINKS.apple }); } 
                }}
                playSignal={playSignal}
                toggleSignal={toggleSignal}
                showHUDPlay={false}
                index={channelIdx}
                onIndexChange={(i)=> setChannelIdx(i)}
                autoPlayOnIndex={false}
                unlockPlays={false}
              />
            </div>
          </div>
        ),
        document.body
      ) : null}

      {/* Light Beam - keep mounted to avoid animation resets/flicker; control via opacity */}
      {SHOW_CENTER_BEAM && mounted ? (
        <div 
          className="fixed pointer-events-none z-[95] light-beam"
          style={lightBeamStyle}
        >
          {/* Single main beam */}
          <div 
            style={{
              position: 'absolute',
              left: '5%',
              right: '5%',
              bottom: '0px', 
              top: '0%',
              clipPath: 'polygon(48% 100%, 52% 100%, 15% 0, 85% 0)',
              backgroundImage: getBeamGradient,
              backgroundSize: '100% 100%, 100% 160px',
              filter: 'blur(4px)',
              mixBlendMode: 'screen',
              animation: 'beamFlow 3s linear infinite',
              animationPlayState: (beamEnabled || showHUD) ? 'running' : 'paused',
              willChange: 'background-position'
            }}
          />
          {/* Light-beam styles moved to globals to avoid nested styled-jsx */}
        </div>
      ) : null}


      {mounted && uiUnlocked && showOverlayUI && showHUD && process.env.NEXT_PUBLIC_HOLOHUD === '1' ? (
        <HoloHUD
          track={curTrack}
          playing={effectivelyPlaying}
          onToggle={() => setToggleSignal((n) => n + 1)}
          onSelect={(slug) => {
            try { onSongChange(slug); } catch {}
          }}
        />
      ) : null}


      {/* Dimming Overlay with Animated Spotlight on Start Button */}
      {mounted && showDimmingOverlay ? (
        (() => {
          // Helper function to get responsive values (matching SteeringWheelOverlay logic)
          const getResponsiveValue = (config) => {
            if (!config) return config;
            const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
            const isTablet = typeof window !== 'undefined' && window.innerWidth > 768 && window.innerWidth <= 1024;
            
            if (isMobile && config.mobile) {
              return { ...config, ...config.mobile };
            } else if (isTablet && config.tablet) {
              return { ...config, ...config.tablet };
            }
            return config;
          };

          const wheel = POS?.wheel || {};
          const lp = wheel.logo || { topVh: 66, leftVw: 26, sizePx: 72 };
          const ppConfig = getResponsiveValue(wheel.play) || { topVh: lp.topVh, leftVw: lp.leftVw, sizePx: Math.round(lp.sizePx * 0.9) };
          const pp = ppConfig;

          // Calculate exact button center position (matching SteeringWheelOverlay actual positioning)
          // SteeringWheelOverlay positions button at: bottom: calc(-5vh + ${vs * 0.3}px - 32px), left: 50%
          const vs = Math.round(Math.min(Math.min(window.innerWidth, window.innerHeight) * 0.70, 980));
          const startSize = Math.round(Math.min(Math.max(Math.min(window.innerWidth, window.innerHeight) * 0.14, 64), 180));
          
          const buttonCenterX = '50%'; // Button is centered horizontally
          // Convert bottom positioning to top: 100vh - bottom_offset - half_button_height
          const bottomExpr = `-5vh + ${vs * 0.3}px - 32px`;
          const buttonCenterY = `calc(100vh - (${bottomExpr}) - ${(startSize * 1.02)/2}px)`;
          
          return (
            <div className="fixed inset-0 z-[100] pointer-events-none">
              {/* Base dimming layer with clean spotlight cutout */}
              <div 
                className="absolute inset-0"
                style={{
                  background: `
                    radial-gradient(
                      circle at ${buttonCenterX} ${buttonCenterY},
                      transparent ${(startSize * 1.02) * 0.35}px,
                      rgba(0, 0, 0, 0.85) ${(startSize * 1.02) * 0.35 + 2}px,
                      rgba(0, 0, 0, 0.95) 100%
                    )
                  `,
                  transition: 'opacity 500ms ease-out'
                }}
              />
              
              
            </div>
          );
        })()
      ) : null}

      {/* Background preloader: covers + first ~5s of audio/skies */}
      {mounted ? <PreloadMedia maxImage={8} maxAudio={3} maxVideo={2} /> : null}

    </main>
  );
}
