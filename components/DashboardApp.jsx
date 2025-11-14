"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import SkyboxVideo from "@/components/SkyboxVideo";
import LumaKeyVideo from "@/components/LumaKeyVideo";
import AmbientSpace from "@/components/AmbientSpace";
import SteeringWheelOverlay from "@/components/SteeringWheelOverlay";
import StationDialOverlay from "@/components/StationDialOverlay";
import { Slot } from "@/components/Slot";
import { DASHBOARD } from "@/config/dashboard";
import dynamic from "next/dynamic";
const HUDPanel = dynamic(() => import("@/components/HUDPanel"), { ssr: false });
const PlanetSystem = dynamic(() => import("@/components/holo/PlanetSystem"), { ssr: false });
const HoloHUD = dynamic(() => import("@/components/HoloHUD"), { ssr: false });
import { skyFor, introSky } from "@/lib/sky";
import { youtubeSkyFor, HOME_YOUTUBE_SKY } from "@/lib/sky-youtube";
const MediaPlayer = dynamic(() => import("@/components/MediaPlayer"), { ssr: false });
import { sfx } from "@/lib/sfx";
import { LINKS, POS } from "@/config/cockpit";
import { tracks } from "@/lib/songs-consolidated";
import { buildPlanetSongs } from "@/lib/planets";
import { playerStore } from "@/store/usePlayerStore";
import PrewarmThree from "@/components/PrewarmThree";
import { track } from "@/lib/analytics";
import PreloadMedia from "@/components/PreloadMedia";
import { slugify } from "@/lib/slug";
import { audioCoordinator } from "@/lib/audio-coordinator";
import { debugLog } from "@/lib/debug";

export default function DashboardApp({ initialSlug } = {}) {
  // Global wheel render mode (LUMA vs PLAIN). Must be top-level to obey Hooks rules.
  const [wheelPlain, setWheelPlain] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      if (window.localStorage.getItem('WHEEL_FORCE_LUMA') === '1') return false;
      const ls = window.localStorage.getItem('PLAIN_WHEEL');
      if (ls === '1') return true;
      if (ls === '0') return false;
      window.localStorage.setItem('PLAIN_WHEEL', '0');
      return false; // default to LUMA (keyed) for transparent background
    } catch { return false; }
  });
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'W' || e.key === 'w') && (e.metaKey || e.ctrlKey || e.shiftKey)) {
        e.preventDefault();
        setWheelPlain(prev => {
          const next = !prev;
          try { if (typeof window !== 'undefined') window.localStorage.setItem('PLAIN_WHEEL', next ? '1' : '0'); } catch {}
          return next;
        });
      }
    };
    try { window.addEventListener('keydown', onKey); } catch {}
    return () => { try { window.removeEventListener('keydown', onKey); } catch {} };
  }, []);
  const [channelIdx, setChannelIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sky, setSky] = useState(introSky);
  const [links, setLinks] = useState({ spotify: LINKS.spotify, apple: LINKS.apple });
  const [userSelected, setUserSelected] = useState(false);
  const [curTrack, setCurTrack] = useState(initialSlug ? (tracks.find(t => t.slug === initialSlug) || tracks.find(t => t.title === "WE'RE JUST FRIENDS") || tracks[0]) : null);
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
  const [allowWarp, setAllowWarp] = useState(!initialSlug); // show lightspeed on opening homepage
  const [landingMode, setLandingMode] = useState(true); // initial screen state
  const [landingRevealReady, setLandingRevealReady] = useState(false); // when true, allow initial overlay to hide
  const [homeMode, setHomeMode] = useState(!initialSlug); // true when on homepage (no initial slug)
  const [homeIntroEnabled, setHomeIntroEnabled] = useState(false);
  const [pendingHomePower, setPendingHomePower] = useState(false);
  const [pendingTrackPlay, setPendingTrackPlay] = useState(false);
  // Track which YouTube sky has been armed by playback (keep looping even if audio pauses)
  const [ytSkyStartedSlug, setYtSkyStartedSlug] = useState(null);
  // Hide 3D planets during warp when a song is selected; reveal on warp SFX end
  const [hidePlanetsForSelection, setHidePlanetsForSelection] = useState(false);
  const [pendingOverlayReveal, setPendingOverlayReveal] = useState(false); // wait to show overlay until warp SFX ends
  const trackPlayTimerRef = React.useRef(undefined);
  // Keep ambient suspended initially, but allow faster startup
  const [ambientSuspended, setAmbientSuspended] = useState(true);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  // Track first page load in this mounted session
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [firstStartDone, setFirstStartDone] = useState(false);
  const [welcomeHasPlayed, setWelcomeHasPlayed] = useState(false); // tracks if welcome has been played (resets on page refresh)
  const welcomeOnStartRef = React.useRef(false); // signals that welcome VO should play now
  const startButtonWarpRef = React.useRef(false); // prevents double warp when start button is clicked
  // Ensure song MP3 starts only after join-alien SFX finishes (played at warp end)
  const buttonSfxWaitRef = React.useRef(null);
  // Join-alien SFX promise used to gate song start after warp
  const joinSfxWaitRef = React.useRef(null);
  const [cardModalOpen, setCardModalOpen] = useState(false); // track card modal state for beam dimming
  const [joinAlienOpen, setJoinAlienOpen] = useState(false); // track join alien button state for pink beam
  const [beamColor, setBeamColor] = useState('blue'); // track active beam color
  const [showDimmingOverlay, setShowDimmingOverlay] = useState(true); // show dimming overlay on initial load
  const [beamTransitioning, setBeamTransitioning] = useState(false); // prevent rapid beam changes
  const [explicitClose, setExplicitClose] = useState(false); // track when explicitly closing without opening another display
  const [safariRefreshKey, setSafariRefreshKey] = useState(0); // Safari refresh mechanism
  // Unified timing constants for display/beam sequencing
  // Keep conservative defaults for overlapping transitions, but tighten a bit for snappier feel
  const BEAM_SWITCH_DELAY_MS = 300; // was 450ms; faster when switching between colors
  const BLUE_OPEN_AFTER_BEAM_MS = 90; // was 140ms; snappier blue HUD reveal after beam

  // Live refs for visibility guards (avoid stale closures in timeouts)
  const showHUDRef = React.useRef(showHUD);
  React.useEffect(() => { showHUDRef.current = showHUD; }, [showHUD]);
  const beamEnabledRef = React.useRef(beamEnabled);
  React.useEffect(() => { beamEnabledRef.current = beamEnabled; }, [beamEnabled]);

  // Guard: wait until blue HUD and beam are fully hidden before continuing (with a hard cap)
  const waitUntilBlueHidden = React.useCallback((next) => {
    const start = Date.now();
    const MAX_WAIT = 900; // ms safety cap
    const TICK = 50; // ms polling cadence
    const step = () => {
      const blueHidden = !showHUDRef.current && !beamEnabledRef.current;
      if (blueHidden || Date.now() - start > MAX_WAIT) {
        try { next(); } catch {}
      } else {
        setTimeout(step, TICK);
      }
    };
    setTimeout(step, TICK);
  }, []);
  const SPACE_SKY = { webm: "/skies/space.webm", mp4: "/skies/space.mp4", key: "space" };

  // Spotlight follows Start button dimensions/position exactly
  const [spotlightPos, setSpotlightPos] = useState({ x: null, y: null, r: null });
  const spotlightRafRef = React.useRef(0);

  const computeStartSpotlight = React.useCallback(() => {
    const run = () => {
      try {
        // Try measuring the actual Start button DOM for exact size/position
        const btn = document.querySelector('.wheel-play.chx');
        if (btn) {
          const rect = btn.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          const r = Math.min(rect.width, rect.height) / 2;
          setSpotlightPos({ x, y, r });
          return;
        }
      } catch {}
      
      // Fallback to computed geometry if the element isn't found yet
      try {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const vmin = Math.min(vw, vh);
        const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
        const scaleFactor = (vw <= 480) ? 0.95 : (vw <= 768) ? 0.90 : (vw <= 1024) ? 0.85 : 0.80;
        const vs = Math.round(clamp(vmin * scaleFactor, 420, 980) * 0.8);
        const startBase = vmin * (vw <= 480 ? 0.19 : vw <= 768 ? 0.17 : 0.16);
        const startSize = Math.round(clamp(startBase, vw <= 480 ? 112 : 92, 210)) * 1.02;
        const r = startSize / 2;
        const bottomPx = (-2 * vh / 100) + (vs * 0.35) - 54; // -2vh + vs*0.35 - 54
        const y = vh - bottomPx - r;
        const x = vw / 2;
        setSpotlightPos({ x, y, r });
      } catch {
        // Last resort: center of screen with a safe radius
        try { setSpotlightPos({ x: window.innerWidth / 2, y: window.innerHeight / 2, r: 80 }); } catch {}
      }
    };
    cancelAnimationFrame(spotlightRafRef.current || 0);
    spotlightRafRef.current = requestAnimationFrame(run);
  }, []);

  // Keep spotlight synced on mount, resize, and when overlay state changes
  useEffect(() => {
    if (!mounted || !showDimmingOverlay) return;
    computeStartSpotlight();
    const onResize = () => computeStartSpotlight();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    // Also recompute once more after a short delay to catch layout shifts
    const t = setTimeout(computeStartSpotlight, 50);
    const t2 = setTimeout(computeStartSpotlight, 200);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      clearTimeout(t); clearTimeout(t2);
    };
  }, [mounted, showDimmingOverlay, computeStartSpotlight]);

  // Listen for welcome audio play/end and set a window-scoped flag so
  // it only plays once per in-tab session (resets on full refresh).
  useEffect(() => {
    const onIntroPlay = () => {
      // Mark as played immediately to ensure it never replays this session
      try { (window).__CHX_WELCOME_PLAYED = true; } catch {}
      // Also flip local state and stop offering intro on subsequent renders
      setWelcomeHasPlayed(true);
      try { setHomeIntroEnabled(false); } catch {}
    };
    const onIntroEnded = () => {
      try { (window).__CHX_WELCOME_PLAYED = true; } catch {}
      setWelcomeHasPlayed(true);
      // After playing once, mark that the first load flow is complete
      try { setIsFirstLoad(false); } catch {}
    };
    
    // Listen for the intro audio ending
    const checkIntroElement = () => {
      const intro = document.querySelector('audio[data-intro="1"]');
      if (intro) {
        intro.addEventListener('play', onIntroPlay, { once: true });
        intro.addEventListener('ended', onIntroEnded, { once: true });
        return () => { try { intro.removeEventListener('play', onIntroPlay); } catch {}; try { intro.removeEventListener('ended', onIntroEnded); } catch {} };
      }
      return null;
    };
    
    // Check immediately and then periodically until we find the intro element
    const cleanup = checkIntroElement();
    if (cleanup) return cleanup;
    
    const interval = setInterval(() => {
      const cleanup = checkIntroElement();
      if (cleanup) {
        clearInterval(interval);
        return cleanup;
      }
    }, 100);
    
    return () => { clearInterval(interval); };
  }, []);

  // Ensure planets are visible on homepage load
  useEffect(() => {
    // Only run this for homepage (no initialSlug)
    if (!initialSlug) {
      
      try {
        // CRITICAL: Always show all planets on homepage load - use new planetDisplayMode system
        const currentState = playerStore.getState();
        
        
        playerStore.getState().setPlanetDisplayMode('all');
        playerStore.getState().setPlanetsVisible(true); // CRITICAL: Ensure planets are visible
        playerStore.setState({ mainId: null }); // Ensure no specific song is selected
        
        // Verify the state was set
        const newState = playerStore.getState();
        
        
        // CRITICAL: Ensure songs are initialized for planet rendering
        const currentSongs = playerStore.getState().songs;
        
        
        if (currentSongs.length === 0) {
          
          try {
            const { buildPlanetSongs } = require('@/lib/planets');
            const { holoSongs } = buildPlanetSongs();
            
            
            playerStore.getState().initSongs(holoSongs);
            const finalCount = playerStore.getState().songs.length;
            
            
            if (finalCount === 0) {
              console.error('🌍 DashboardApp: CRITICAL ERROR - Songs still 0 after initialization!');
            }
          } catch (error) {
            console.error('🌍 DashboardApp: Error loading songs:', error);
          }
        } else {
          
        }
        
        // Verification: check final state
        const finalState = playerStore.getState();
        
        
        // Force a re-render to ensure planets appear
        setTimeout(() => {
          const verifyState = playerStore.getState();
          
          if (!verifyState.planetsVisible && verifyState.songs.length > 0) {
            
            playerStore.getState().setPlanetsVisible(true);
          }
        }, 100);
      } catch (e) {
        console.warn('🌍 DashboardApp: Error initializing homepage planets:', e);
      }
    }
  }, []); // Only run once on mount

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
        // Do not start ambient on home/opening page
        // Fade HUD in shortly after beam starts fading in (faster response)
        setTimeout(() => {
          setShowHUD(true);
          setBeamOnly(false);
          setPowerBusy(false);
          // Ensure overlay UI is visible after HUD fades in (in case of race conditions)
          setShowOverlayUI(true);
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
      // Don't pause ambient during power transitions - let it continue smoothly
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
    if (idx < 0) {
      console.warn('DashboardApp: onSongChange - track not found for id:', id, 'slug:', slug);
      return;
    }
    

    // Focus the selected planet immediately and bring camera closer
    
    try {
      playerStore.getState().setMain(slug, true);
      playerStore.getState().setPlanetDisplayMode('single');
      playerStore.getState().setPlanetsVisible(true);
    } catch {}

    // STEP 2: Stop all music immediately when song is selected
    
    
    // Stop main music player audio
    try {
      const audioEl = document.querySelector('audio[data-audio-player="1"]');
      if (audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
      }
    } catch (e) {
      console.warn('DashboardApp: Error stopping main audio:', e);
    }
    
    // IMMEDIATELY stop ambient space music - don't wait for fade
    try {
      const ambientEl = document.querySelector('audio[data-ambient="1"]');
      if (ambientEl) {
        ambientEl.pause();
        ambientEl.currentTime = 0;
        
      }
    } catch (e) {
      console.warn('DashboardApp: Error stopping ambient audio:', e);
    }
    // Also stop welcome VO immediately if present
    try {
      const introEl = document.querySelector('audio[data-intro="1"]');
      if (introEl) {
        introEl.pause();
        introEl.currentTime = 0;
        
      }
    } catch (e) {
      console.warn('DashboardApp: Error stopping intro VO:', e);
    }
    
    // Stop ambient space music by setting isPlaying to false 
    setIsPlaying(false);
    
    // Force ambient suspension during song change sequence
    setAmbientSuspended(true);
    // Ensure welcome VO won’t queue up while leaving home
    setHomeIntroEnabled(false);
    try { window.dispatchEvent(new CustomEvent('ambient:userPause')); } catch {}

    // Mark as user-driven to suppress fly/warp flashes on index change
    setUserSelected(true);
    // Exit home overview immediately so planets can hide during warp
    setHomeMode(false);
    // Clear any pending home overlay reveal since we're selecting a specific song
    setPendingOverlayReveal(false);

    // Get track and update links immediately to avoid race conditions
    const t = tracks[idx];
    setCurTrack(t);
    setLinks({ spotify: t.spotify || LINKS.spotify, apple: t.apple || LINKS.apple });

    // Switch MediaPlayer channel; MediaPlayer handles audio swap and loading
    setChannelIdx(idx);
    
    // Set flags for selection sequencing: keep planets visible during warp on homepage
    setPendingTrackPlay(true);
    setHidePlanetsForSelection(false);
    
    // Let MediaPlayer handle audio element configuration through its index change
    // Don't manually set src here to avoid race conditions
    
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
    // Also ensure UI is unlocked before allowing automatic warps
    if (!userSelected && !startButtonWarpRef.current && !warpActive && uiUnlocked && prevIdxRef.current !== channelIdx) {
      setFlySignal((n) => n + 1);
    }
    prevIdxRef.current = channelIdx;
  }, [channelIdx, mounted, userSelected, warpActive, uiUnlocked]);
  const { hudSongs, holoSongs } = React.useMemo(() => buildPlanetSongs(), []);
  // Initialize planet songs as early as possible so the 3D system
  // has data on the very first paint (prevents "only heart" flash).
  React.useLayoutEffect(() => {
    try { playerStore.getState().initSongs(holoSongs); } catch {}
  }, [holoSongs]);
  React.useEffect(() => {
    if (!curTrack || homeMode) return;
    const slug = (curTrack.slug || "").toLowerCase();
    if (slug) {
    try { playerStore.getState().setMain(slug); } catch {}
    }
  }, [curTrack?.slug, homeMode]);

  // Note: Song selection is now handled directly by calling onSongChange from user gestures

  // (Removed) implicit sky change on track change to avoid accidental warps.

  useEffect(() => { 
    setMounted(true);
    // Explicitly disable SFX on mount until Start is pressed
    try { sfx.setEnabled(false); } catch {}

    // Safari-specific: previously used a 5s interval to force portal refreshes,
    // which caused periodic layout jitter. Replace with event-driven bumps only.
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      const bump = () => setSafariRefreshKey(prev => prev + 1);
      // Bump once shortly after mount to ensure initial render settles
      const mountTimer = setTimeout(bump, 50);
      window.addEventListener('resize', bump);
      window.addEventListener('orientationchange', bump);
      const onVis = () => { if (document.visibilityState === 'visible') bump(); };
      document.addEventListener('visibilitychange', onVis);
      return () => {
        clearTimeout(mountTimer);
        window.removeEventListener('resize', bump);
        window.removeEventListener('orientationchange', bump);
        document.removeEventListener('visibilitychange', onVis);
      };
    }
  }, []);

  // Enable welcome VO on first homepage open (before Start), once per refresh
  useEffect(() => {
    try {
      const playedFlag = (typeof window !== 'undefined' && (window).__CHX_WELCOME_PLAYED === true);
      if (homeMode && isFirstLoad && !playedFlag) {
        setHomeIntroEnabled(true);
        // Proactively prime and attempt enable to start VO ASAP
        try { window.dispatchEvent(new CustomEvent('ambient:prime')); } catch {}
        // Small delay to ensure <audio data-intro> is mounted, then try enable
        setTimeout(() => { try { window.dispatchEvent(new CustomEvent('ambient:enable')); } catch {} }, 60);
      }
    } catch {}
  }, [homeMode, isFirstLoad]);

  // Track ambient audio playing state for accurate button state on homepage
  useEffect(() => {
    if (!mounted) return;
    
    const trackAmbientState = () => {
      const ambient = document.querySelector('audio[data-ambient="1"]');
      if (!ambient) {
        // Try again later if element not found
        setTimeout(trackAmbientState, 100);
        return;
      }
      
      const onPlay = () => setAmbientPlaying(true);
      const onPause = () => setAmbientPlaying(false);
      const onEnded = () => setAmbientPlaying(false);
      
      // Set initial state
      setAmbientPlaying(!ambient.paused && ambient.currentTime > 0);
      
      ambient.addEventListener('play', onPlay);
      ambient.addEventListener('pause', onPause);
      ambient.addEventListener('ended', onEnded);
      
      return () => {
        ambient.removeEventListener('play', onPlay);
        ambient.removeEventListener('pause', onPause);
        ambient.removeEventListener('ended', onEnded);
      };
    };
    
    return trackAmbientState();
  }, [mounted]);

  // If an initial slug is provided (route-based song page), orchestrate warp + playback
  useEffect(() => {
    if (!mounted) return;
    if (!initialSlug) return;
    if (startButtonWarpRef.current) return; // Skip if start button is handling warp
    const t = tracks.find((x) => x.slug === initialSlug);
    if (!t) return;
    // Ensure planets are hidden when arriving on a song route
    
    try { playerStore.getState().setPlanetsVisible(false); } catch {}
    // Ensure focused planet is this route's song
    try { playerStore.getState().setMain(t.slug || ''); } catch {}
    // Deep link unlocks overlay UI so buttons can show after warp
    setUiUnlocked(true);
    // Enable SFX when unlocking UI for deep links
    try { sfx.setEnabled(true); } catch {}
    // Mirror onSongChange sequencing but for route entry
    setCurTrack(t);
    setUserSelected(true);
    setHomeMode(false);
    setLinks({ spotify: t.spotify || LINKS.spotify, apple: t.apple || LINKS.apple });
    // Hide UI before warp
    setShowHUD(false);
    setShowOverlayUI(false);
    setBeamEnabled(false);
    // Don't suspend ambient during route transitions
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
    setHidePlanetsForSelection(true);
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

  // Safari-specific: Force refresh when blue display state changes
  React.useEffect(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari && (showHUD || beamEnabled || showOverlayUI)) {
      // Trigger refresh when display becomes active
      setSafariRefreshKey(prev => prev + 1);
    }
  }, [showHUD, beamEnabled, showOverlayUI, curTrack?.slug, isPlaying]);

  // Handle beam color control with strict mutual exclusion between displays
  const handleBeamToggle = React.useCallback((color) => {
    // Allow immediate OFF even during transitions; otherwise guard
    if (beamTransitioning && color !== 'off') return;
    
    // Always close ALL displays first, then open the target display
    const closeAllDisplays = (skipYellowClose = false) => {
      setShowHUD(false);
      setJoinAlienOpen(false);
      setBeamEnabled(false);
      // Force-close yellow menu and any other UI elements, unless we're opening yellow
      if (!skipYellowClose) {
        setUiCloseSignal(prev => prev + 1);
      }
    };
    
    if (color === 'off') {
      // Explicit request to turn everything off without switching to blue display
      // Check if this is part of a pink-to-yellow transition by looking at current beam color
      const skipYellowClose = beamColor === 'pink'; // Don't force-close yellow menu during pink-to-yellow transition
      closeAllDisplays(skipYellowClose);
      setBeamColor('blue'); // reset baseline without opening HUD
      return;
    }

    if (color === 'pink') {
      if (beamColor === 'pink' && joinAlienOpen) {
        // Already showing pink - toggle off (don't open blue display)
        setBeamTransitioning(true);
        setExplicitClose(true);
        closeAllDisplays();
        setTimeout(() => {
          // Don't flash blue - just turn off beam completely then reset to blue  
          setBeamEnabled(false);
          setTimeout(() => {
            setBeamColor('blue');
            setBeamTransitioning(false);
            setExplicitClose(false);
            // Explicitly keep all displays closed when closing pink
          }, 100);
        }, 150);
      } else {
        // Switch to pink - close everything first
        setBeamTransitioning(true);
        closeAllDisplays();
        // Strictly wait for blue HUD + beam to be fully hidden before enabling pink
        waitUntilBlueHidden(() => {
          setBeamColor('pink');
          setBeamEnabled(true);
          setJoinAlienOpen(true);
          setBeamTransitioning(false);
        });
      }
    } else if (color === 'yellow') {
      if (beamColor === 'yellow') {
        // Already showing yellow - toggle off without opening blue display
        setBeamTransitioning(true);
        setExplicitClose(true);
        closeAllDisplays();
        setTimeout(() => {
          setBeamColor('blue'); // Reset to blue but keep displays closed
          setBeamTransitioning(false);
          setExplicitClose(false);
        }, 150);
      } else {
        // Switch to yellow - close other displays but don't force-close yellow menu
        setBeamTransitioning(true);
        closeAllDisplays(true); // Skip yellow close since we're opening it
        setTimeout(() => {
          setBeamColor('yellow');
          setBeamEnabled(true);
          setBeamTransitioning(false);
          // Yellow menu will open itself via HoloHubMenu onToggle
        }, BEAM_SWITCH_DELAY_MS);
      }
    } else if (color === 'blue') {
      const blueActiveNow = (beamColor === 'blue') && (beamEnabled || showHUD);
      if (blueActiveNow) {
        // Already showing blue - toggle off
        setBeamTransitioning(true);
        setExplicitClose(true);
        closeAllDisplays();
        // Keep baseline color set to blue but everything hidden/off (no delay needed)
        setBeamColor('blue');
        setBeamTransitioning(false);
        setExplicitClose(false);
      } else if (!explicitClose) {
        // Fast-path: if nothing is currently open, enable blue immediately (no pre-wait)
        const nothingOpen = !joinAlienOpen && !showHUD && !beamEnabled;
        if (nothingOpen) {
          setBeamTransitioning(true);
          setBeamColor('blue');
          setBeamEnabled(true);
          // very short cushion before revealing the HUD so the beam registers first
          setTimeout(() => {
            setShowHUD(true);
            setBeamTransitioning(false);
          }, BLUE_OPEN_AFTER_BEAM_MS);
          return;
        }
        // Special handling: when coming from pink, fade out pink first, then flip beam to blue,
        // then reveal the blue display — keep the beam ON during color change for smoothness.
        const comingFromPink = (beamColor === 'pink') || joinAlienOpen;
        if (comingFromPink) {
          setBeamTransitioning(true);
          // Start pink display fade-out only; do not turn off the beam so its color can flip smoothly
          try { setShowHUD(false); } catch {}
          try { setJoinAlienOpen(false); } catch {}
          // Ensure the beam is enabled during the color switch; if it was off for any reason, turn it on
          try { setBeamEnabled(true); } catch {}
          // Pink display opacity transition is ~350ms in SteeringWheelOverlay; give it a touch more time
          const PINK_FADE_MS = 320;
          setTimeout(() => {
            setBeamColor('blue');
            setTimeout(() => {
              setShowHUD(true);
              setBeamTransitioning(false);
            }, BLUE_OPEN_AFTER_BEAM_MS);
          }, PINK_FADE_MS);
        } else {
          // Default path: close other displays → beam blue → open blue
          setBeamTransitioning(true);
          closeAllDisplays();
          setTimeout(() => {
            setBeamColor('blue');
            setBeamEnabled(true);
            setTimeout(() => {
              setShowHUD(true);
              setBeamTransitioning(false);
            }, BLUE_OPEN_AFTER_BEAM_MS);
          }, BEAM_SWITCH_DELAY_MS);
        }
      }
    }
  }, [beamColor, showHUD, joinAlienOpen, beamTransitioning, explicitClose]);

  // Spacebar and Pause key toggle (works even when 3D is active)
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
        try {
          const main = document.querySelector('audio[data-audio-player="1"]');
          const ambient = document.querySelector('audio[data-ambient="1"]');
          const intro = document.querySelector('audio[data-intro="1"]');
          const mainIsPlaying = !!(main && !main.paused && (main.currentTime || 0) > 0);
          const ambientIsPlaying = !!(ambient && !ambient.paused && (ambient.currentTime || 0) > 0);
          const introIsPlaying = !!(intro && !intro.paused && (intro.currentTime || 0) > 0);
          const isHome = !!homeMode;

          // 1) If a main song is currently playing, always control it
          if (mainIsPlaying || isPlaying) {
            setToggleSignal((n) => n + 1);
            try { sfx.play('click', 0.6); } catch {}
            return;
          }
          // 2) If on the CHXNDLER homepage, control the ambient space music
          if (isHome) {
            if (ambientIsPlaying) {
              try { window.dispatchEvent(new CustomEvent('ambient:userPause')); } catch {}
              ambient.pause();
              try { sfx.play('click', 0.6); } catch {}
              return;
            }
            // If we're on home and ambient is paused, play ambient (do NOT start a song)
            if (ambient) {
              try { window.dispatchEvent(new CustomEvent('ambient:userPlay')); } catch {}
              ambient.play().catch(()=>{});
              try { sfx.play('click', 0.6); } catch {}
              return;
            }
          }

          // 3) Off homepage: control the main player when available
          if (!isHome) {
            if (main && ((main.getAttribute('src') || main.src || '').length > 0 || main.readyState >= 2)) {
              setToggleSignal((n) => n + 1);
              try { sfx.play('click', 0.6); } catch {}
              return;
            }
          }
        } catch (error) {
          // Fall through to safe default
        }
        // Safe default: if nothing matched, do nothing to avoid starting unintended audio on home
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiUnlocked, homeMode, isPlaying]);

  // Enable SFX globally only after Start unlocks the UI
  React.useEffect(() => {
    try { sfx.setEnabled(!!uiUnlocked); } catch {}
    try { (window).__CHX_UI_UNLOCKED = !!uiUnlocked; } catch {}
    try { (window).__CHX_SHOW_DIMMING_OVERLAY = !!showDimmingOverlay; } catch {}
  }, [uiUnlocked, showDimmingOverlay]);

  // Compute effective playing state: true if main track OR space music is playing
  const effectivelyPlaying = useMemo(() => {
    // Main track is playing
    if (isPlaying) return true;
    // Space music is playing when actually playing (not just not suspended)
    return ambientPlaying;
  }, [isPlaying, ambientPlaying]);

  // Debug function for welcome VO issues
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.debugWelcomeVO = () => {
        // Log current relevant state
        debugLog('WelcomeVO state:', {
          homeMode,
          homeIntroEnabled,
          welcomeHasPlayed,
          firstStartDone,
          uiUnlocked,
          showOverlayUI,
          pendingOverlayReveal,
          ambientSuspended,
          warpActive,
          welcomeOnStart: welcomeOnStartRef.current
        });

        // Inspect intro audio element
        const intro = document.querySelector('audio[data-intro="1"]');
        debugLog('Intro audio:', intro ? {
          src: intro.src,
          paused: intro.paused,
          volume: intro.volume,
          currentTime: intro.currentTime,
          readyState: intro.readyState
        } : 'Not found');

        // Inspect ambient audio element
        const ambient = document.querySelector('audio[data-ambient="1"]');
        debugLog('Ambient audio:', ambient ? {
          src: ambient.src,
          paused: ambient.paused,
          volume: ambient.volume,
          currentTime: ambient.currentTime,
          readyState: ambient.readyState
        } : 'Not found');
      };
      
      // Force welcome VO to play for debugging
      window.forceWelcomeVO = () => {
        
        try { delete (window).__CHX_WELCOME_PLAYED; } catch {}
        setHomeMode(true);
        setHomeIntroEnabled(true);
        setWelcomeHasPlayed(false);
        setAmbientSuspended(false);
        
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.debugWelcomeVO;
        delete window.forceWelcomeVO;
      }
    };
  }, [homeMode, homeIntroEnabled, welcomeHasPlayed, firstStartDone, uiUnlocked, showOverlayUI, pendingOverlayReveal, ambientSuspended, warpActive]);

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
    // Position the light beam lower to align with the moved display
    // Move beam down by 30px to match the display adjustment
    return {
      left: '50%',
      bottom: 'calc(var(--display-touch-top) - var(--beam-height) - 30px)',
      height: 'var(--beam-height)',
      width: 'var(--display-width)',
      transform: 'translate3d(-50%,0,0)',
      // Tie beam visibility to overlay UI being shown and Start having been pressed, and hide during warp
      opacity: (uiUnlocked && showOverlayUI && (beamEnabled || showHUD) && !warpActive) ? (cardModalOpen ? 0.3 : 1) : 0,
      transition: 'opacity 400ms ease-in-out'
    };
  }, [beamEnabled, showHUD, cardModalOpen, uiUnlocked, showOverlayUI, warpActive]);

  // Compute background-position for the lightbeam base PNG so it anchors under the blue button
  const [beamBaseBgPos, setBeamBaseBgPos] = useState(null);
  useEffect(() => {
    function computeBeamBaseBgPos() {
      try {
        const root = document.documentElement;
        const cs = getComputedStyle(root);
        const nudgePx = parseFloat(cs.getPropertyValue('--beam-base-nudge')) || 0; // px

        // Prefer exact DOM measurement of the power button top edge
        const powerEl = document.querySelector('.power-btn');
        if (powerEl) {
          const rect = powerEl.getBoundingClientRect();
          const topY = Math.round(rect.top + nudgePx);
          setBeamBaseBgPos(`center ${topY}px`);
          return;
        }

        // Fallback to variable-based calculation if the element isn't present yet
        const buttonsBottomStr = cs.getPropertyValue('--buttons-bottom').trim();
        const buttonsBottom = parseFloat(buttonsBottomStr || '31') || 31; // percent
        const powerSizeStr = cs.getPropertyValue('--power-size-px').trim();
        const powerSizePx = parseFloat(powerSizeStr || '72') || 72;
        const vh = window.innerHeight || 0;
        // Align to TOP of the power button: baseline (from top) - full button height + translateY(8px) + nudge
        const fromTopForBg = Math.round((vh - (vh * (buttonsBottom / 100))) - powerSizePx + 8 + nudgePx);
        setBeamBaseBgPos(`center ${fromTopForBg}px`);
      } catch {
        // Fallback stays null; CSS default will be used
      }
    }
    computeBeamBaseBgPos();
    window.addEventListener('resize', computeBeamBaseBgPos);
    return () => window.removeEventListener('resize', computeBeamBaseBgPos);
  }, []);

  // Position the blue display slightly lower than the light beam top  
  const hudBottom = useMemo(() => 'calc(var(--display-touch-top) - 30px)', []);

  // Provide CSS variables globally (avoids any runtime style factory edge cases)

  if (!mounted) {
    // Return a black screen with proper dimensions while loading
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-white max-w-screen overflow-x-hidden" style={{ minWidth: '100vw', minHeight: '100vh' }}>
        <div className="absolute inset-0 bg-black" />
        {/* Ensure cockpit frame preloads immediately alongside lightbeam base */}
        <div 
          className="fixed inset-0 z-20 pointer-events-none cockpit-bg"
          aria-hidden="true" 
        />
        {/* Render the steering wheel video immediately on opening screen */}
        <div
          style={{
            position: 'fixed',
            // Slight upward nudge to align with cockpit wheel area
            bottom: '-3vh',
            left: '50vw',
            transform: 'translateX(-50%)',
            width: 'calc(clamp(460px, 80vmin, 980px) * 0.8)',
            height: 'calc(clamp(460px, 80vmin, 980px) * 0.8)',
            // Above dimming overlay (z-[89]) and lightbeam base (z-[100]) to ensure visibility
            zIndex: 101,
            pointerEvents: 'none',
            contain: 'layout paint',
            willChange: 'opacity, transform',
            outline: (typeof window !== 'undefined' && window.localStorage.getItem('WHEEL_DEBUG') === '1') ? '2px dashed rgba(255,0,0,0.5)' : undefined,
          }}
        >
          {wheelPlain ? (
            <video
              src="/cockpit/wheel.mp4"
              autoPlay
              muted
              loop
              playsInline
              aria-label="wheel-video-plain"
              style={{ width: '100%', height: '100%', objectFit: 'cover', background: 'transparent' }}
            />
          ) : (
            <LumaKeyVideo
              srcMp4="/cockpit/wheel.mp4"
              threshold={0.02}
              softness={0.04}
              saturation={1.0}
              contrast={1.15}
              offsetYRatio={0}
              paused={false}
              forceEnabled
              highQuality
              className="block"
              style={{ width: '100%', height: '100%', background: 'transparent' }}
            />
          )}
        </div>
        {/* Show light beam base on initial page too */}
        <div 
          className="fixed inset-0 z-[100] pointer-events-none lightbeam-base-bg"
          aria-hidden="true" 
          style={{ opacity: 1 }}
        />
      </main>
    );
  }
  const SHOW_CENTER_BEAM = true; // Enable center light beam
  // HUD vertical sizing + offset mapping so inner items shift down as height shrinks
  const hudHeightFactor = 0.01; // minimal height; bottom stays fixed
  const hudBaseFactor = 0.56;   // original baseline factor used earlier
  const hudYOffset = Math.max(0, Math.round(100 * (hudBaseFactor - hudHeightFactor)));
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white max-w-screen overflow-x-hidden" style={{ minWidth: '100vw', minHeight: '100vh' }}>
      <div 
        className="absolute inset-0"
        style={blurWrapperStyle}
      >
        <PrewarmThree />
        <AmbientSpace 
          ambientSrc="https://ik.imagekit.io/CHXNDLER/tracks/space-music.mp3?updatedAt=1762392378623" 
          introSrc={homeMode && homeIntroEnabled && !welcomeHasPlayed ? "https://ik.imagekit.io/CHXNDLER/tracks/welcome-to-the-heartverse.mp3?updatedAt=1762392390137" : undefined} 
          playingMusic={isPlaying} 
          suspend={ambientSuspended} 
          userSelectedSong={userSelected} 
        />
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
        // Use the current track's YouTube sky as soon as a selection is in progress
        // or playback has started; keep looping even if audio pauses.
        youtubeUrl={(() => {
          const slug = curTrack?.slug;
          const mapped = slug ? youtubeSkyFor(slug) : undefined;
          // On the homepage, always prefer the space video; do not show a track's video
          if (homeMode) return uiUnlocked ? HOME_YOUTUBE_SKY : undefined;
          // Off-home (song view): show the mapped YouTube sky as soon as a selection is happening
          // or after playback has started (ytSkyStartedSlug guard), so users see it right after clicking.
          if (slug && mapped) {
            if (pendingTrackPlay || userSelected) return mapped;
            if (ytSkyStartedSlug && slug === ytSkyStartedSlug) return mapped;
          }
          return undefined;
        })()}
        // Use provided YouTube clip for lightspeed overlay on opening and Start
        lightspeedYoutubeUrl={'https://youtu.be/KFssNa5WvKc'}
        onWarpSfxEnd={() => {
          // After a song is selected, reveal ONLY the selected planet post-warp
          if (userSelected || pendingTrackPlay) {
            try { 
              const slug = (curTrack && curTrack.slug) ? curTrack.slug : null;
              if (slug) { 
                // Focus the selected planet and switch to single-planet mode
                playerStore.getState().setMain(slug);
                playerStore.getState().setPlanetDisplayMode('single');
                playerStore.getState().setPlanetsVisible(true);
              }
            } catch {}
            // Leave homepage mode so PlanetSystem doesn't force show-all
            try { setHomeMode(false); } catch {}
          } else {
            // Start button warp back to CHXNDLER (homepage): show ALL planets
            
            try {
              playerStore.getState().setPlanetDisplayMode('all');
              playerStore.getState().setPlanetsVisible(true);
            } catch {}
          }
          // If we're landing on home via Start, reveal overlay/UI after warp finishes
          // Only revert to home if this isn't a user-selected song
          if (pendingOverlayReveal && !userSelected && !pendingTrackPlay) {
            // Ensure we are in home mode (CHXNDLER) before revealing HUD
            try { setHomeMode(true); } catch {}
            try { setUserSelected(false); } catch {}
            try { playerStore.setState({ mainId: null }); } catch {}
            try { setLinks({ spotify: LINKS.spotify, apple: LINKS.apple }); } catch {}
            // Enable welcome VO only if it hasn't played this session
            try {
              const playedFlag = (typeof window !== 'undefined' && (window).__CHX_WELCOME_PLAYED === true);
              setHomeIntroEnabled(!playedFlag);
            } catch {}
            // Don't set welcomeHasPlayed here - wait for audio to actually finish
            // Switch background sky in the same render pass for simultaneous reveal
            try {
              if (nextSky) { setSky(nextSky); setNextSky(null); }
            } catch {}
            // Play the button sound; start ambient from the beginning after it finishes.
            // Welcome VO will now play AFTER the first full ambient loop completes.
            try {
              const p = sfx.playAndWait('button', 0.9);
              let settled = false;
              const startAudioFromBeginning = () => {
                if (settled) return; settled = true;
                
                
                // Reset ambient to beginning and trigger ambient playback.
                try {
                  const ambientEl = document.querySelector('audio[data-ambient="1"]');
                  
                  // Reset to beginning
                  if (ambientEl) {
                    ambientEl.currentTime = 0;
                    
                  }
                  
                  // Trigger ambient start via coordinator event; AmbientSpace will
                  // handle delayed VO playback after the first loop completes.
                  setAmbientSuspended(false);
                  try { window.dispatchEvent(new CustomEvent('ambient:play')); } catch {}
                  
                } catch (e) {
                  console.error('🎵 DashboardApp: Error starting audio from beginning:', e);
                }
              };
              
              p.then(startAudioFromBeginning).catch(() => {
                // If SFX fails, still start audio soon after to avoid silence
                setTimeout(startAudioFromBeginning, 200);
              });
              // Watchdog: if SFX promise neither resolves nor rejects (shouldn't happen),
              // start after a generous timeout to avoid getting stuck on silence.
              setTimeout(() => { if (!settled) startAudioFromBeginning(); }, 3000);
            } catch {
              // If SFX throws synchronously, still resume ambient shortly after
              setTimeout(() => {
                try { setAmbientSuspended(false); } catch {}
                try { window.dispatchEvent(new CustomEvent('ambient:play')); } catch {}
              }, 300);
            }
            try { setShowOverlayUI(true); } catch {}
            try { setBeamEnabled(true); } catch {}
            try { setShowHUD(true); } catch {}
            try { setBeamOnly(false); } catch {}
            try { setPowerBusy(false); } catch {}
            try { setLandingRevealReady(true); } catch {}
            // Ensure homepage shows all planets after warp
            
            try { 
              playerStore.getState().setPlanetDisplayMode('all');
              playerStore.getState().setPlanetsVisible(true); 
            } catch {}
            // Clear one-time flag to avoid repeats on later Starts
            try { welcomeOnStartRef.current = false; } catch {}
            setPendingOverlayReveal(false);
          }
        }}
        onFlyStart={() => {
          setWarpActive(true);
          // Song selection: hide ALL planets immediately before warp
          if (pendingTrackPlay || userSelected) {
            try { playerStore.getState().setPlanetDisplayMode('hidden'); } catch {}
            try { playerStore.getState().setPlanetsVisible(false); } catch {}
            try { setHomeMode(false); } catch {}
          }
          // MediaPlayer will handle its own pause/resume logic for song changes
          // Don't interfere with audio here - let MediaPlayer manage it
        }}
        onFlyEnd={() => {
          setWarpActive(false);
          setAllowWarp(false);
          setLandingMode(false); // leave landing mode after first warp
          // Reset start button warp flag to allow normal effects to resume
          startButtonWarpRef.current = false;
          // Only hard-stop ambient audio at warp end when a track play is pending (song selection flow).
          // For homepage reveal, keep ambient/welcome playing.
          if (pendingTrackPlay) {
            try {
              const amb = document.querySelector('audio[data-ambient=\"1\"]');
              if (amb) { 
                amb.pause(); 
                amb.currentTime = 0;
              }
            } catch {}
            // Only stop intro if this is NOT a Start button warp to homepage
            if (!startButtonWarpRef.current) {
              try {
                const intro = document.querySelector('audio[data-intro=\"1\"]');
                if (intro) { intro.pause(); intro.currentTime = 0; }
              } catch {}
            }
            setAmbientSuspended(true);
            // Selection flow: transition to single-planet mode after warp
            try { 
              setHomeMode(false);
              playerStore.getState().setPlanetDisplayMode('single');
              playerStore.getState().setPlanetsVisible(true);
            } catch {}
          }
          // If a track play is pending, begin UI fade-in immediately at warp end
          // and play join-alien SFX right away; the song will wait for it to finish
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
            // Kick off join-alien SFX now (right after warp). Song waits for this to complete.
            try { joinSfxWaitRef.current = sfx.playAndWait('join', 0.9); } catch { joinSfxWaitRef.current = null; }
            // Safety: if base video readiness callback is delayed, start music after a grace period
            try {
              if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); }
              trackPlayTimerRef.current = window.setTimeout(() => {
                
                const proceed = () => {
                  if (pendingTrackPlay) {
                    setPlaySignal((n) => n + 1);
                    setPendingTrackPlay(false);
                  }
                };
                // Respect join SFX completion if present even on fallback
                try {
                  const p = joinSfxWaitRef.current;
                  if (p && typeof p.then === 'function') { p.then(proceed).catch(proceed); }
                  else { proceed(); }
                } catch { proceed(); }
                trackPlayTimerRef.current = undefined;
              }, 5000);
            } catch {}
          }
          // Conditional warp destination:
          // - Start button: always go to CHXNDLER homepage
          // - Song selection: go to that song
          if (startButtonWarpRef.current || (!pendingTrackPlay && !userSelected)) {
            // Start button was pressed OR no track/user selection pending - go to homepage
            setPendingHomePower(true);
          } else {
            // Song selection - proceed to that song (handled by onBasePlaying)
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
            // Make sure all planets are visible on the homepage after Start
            
            try { 
              playerStore.getState().setPlanetDisplayMode('all'); 
              playerStore.getState().setPlanetsVisible(true);
            } catch {}
            // Clear any selected planet for home mode
            try { playerStore.setState({ mainId: null }); } catch {}
            // Don't enable welcome VO in this path - it's handled in onWarpSfxEnd
            setFirstStartDone(true);
            setUserSelected(false);
            setLinks({ spotify: LINKS.spotify, apple: LINKS.apple });
            // Keep ambient suspended until warp SFX fully ends; we'll enable it in onWarpSfxEnd
            // so ambient (space-music.mp3) starts only after the blue display is showing.
            setAmbientSuspended(true);
            // Let ambient continue during UI transitions for smoother experience
            // Defer overlay/UI reveal until warp SFX has finished
            setPendingOverlayReveal(true);
          }
          // For track changes: trigger music when we are pending a track play
          // Allow playback even if warpActive is still true to handle race conditions with onFlyEnd
          // SAFETY: Only auto-play if user has explicitly selected a song or there was an initialSlug
          // Also ensure UI is unlocked (user has interacted) to prevent auto-play on page load
          // Only start audio after warp has fully ended
          if (pendingTrackPlay && (userSelected || initialSlug) && uiUnlocked && !warpActive) {
            // Ensure ambient and intro are fully stopped just before starting the song
            try {
              const amb = document.querySelector('audio[data-ambient="1"]');
              if (amb) { 
                amb.pause(); 
                amb.currentTime = 0; 
                // Don't manipulate volume directly - let AmbientSpace component handle it
                // Remove any event listeners that might try to restart it
                amb.removeAttribute('autoplay');
              }
              // Dispatch events to ensure ambient component knows to stop
              try { window.dispatchEvent(new CustomEvent('ambient:userPause')); } catch {}
            } catch {}
            // Only stop intro if this is NOT a Start button warp (which should preserve welcome VO)
            if (!startButtonWarpRef.current) {
              try {
                const intro = document.querySelector('audio[data-intro="1"]');
                if (intro) { intro.pause(); intro.currentTime = 0; }
              } catch {}
            }
            setAmbientSuspended(true);
            // Reveal the focused planet immediately after warp/base video is playing.
            // Keep other planets hidden; only the selected planet should show now.
            try {
              const slug = (curTrack && curTrack.slug) ? curTrack.slug : (tracks[channelIdx]?.slug || null);
              if (slug) {
                playerStore.getState().setMain(slug);
              }
              playerStore.getState().setPlanetDisplayMode('single');
              try { setHomeMode(false); } catch {}
            } catch {}
            // Clear any pending fallback timers now that we'll start playback here
            if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); trackPlayTimerRef.current = undefined; }
            // UI has already been revealed at warp end. Now, only start the song MP3
            // after the join-alien SFX has finished.
            if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); trackPlayTimerRef.current = undefined; }
            
            // Add a final failsafe timer - if song doesn't start within 3 seconds, force it
            const failsafeTimer = setTimeout(() => {
              if (pendingTrackPlay) {
                console.warn('DashboardApp: Failsafe timer triggered - forcing song start');
                setPlaySignal((n) => n + 1);
                setPendingTrackPlay(false);
              }
            }, 3000);
            const startSong = () => { 
              
              clearTimeout(failsafeTimer); // Clear the failsafe timer
              // Small delay to ensure MediaPlayer has set up the audio element properly
              setTimeout(() => {
                
                setPlaySignal((n) => {
                  
                  return n + 1;
                }); 
                setPendingTrackPlay(false); 
                buttonSfxWaitRef.current = null;
                
              }, 100); // 100ms delay to allow MediaPlayer to set up
            };
            // Always wait for join-alien SFX to complete (with a safety cap) before starting
            try {
              const p = joinSfxWaitRef.current;
              if (p && typeof p.then === 'function') {
                Promise.race([
                  p,
                  new Promise(resolve => setTimeout(resolve, 2500)), // cap wait
                ]).then(startSong).catch(() => startSong());
              } else {
                startSong();
              }
            } catch {
              startSong();
            }
          }
        }}
      />


      <div 
        className="fixed inset-0 z-20 pointer-events-none cockpit-bg"
        aria-hidden="true" 
      />
      
      <div 
        className="fixed inset-0 z-[100] pointer-events-none lightbeam-base-bg"
        aria-hidden="true" 
        style={{
          // Always keep the light beam base PNG visible, including on first page
          opacity: 1,
          transition: 'opacity 400ms ease-in-out',
          // Dynamically anchor PNG under the blue button when available; otherwise fallback to CSS
          backgroundPosition: beamBaseBgPos || undefined
        }}
      />
      
      {/* SteeringWheelOverlay inside blur wrapper so wheel gets dimmed */}
      <SteeringWheelOverlay
        POS={POS}
        playing={isPlaying}
        showUI={uiUnlocked && showOverlayUI && !warpActive && !showDimmingOverlay}
        uiUnlocked={uiUnlocked}
        joinAlienOpen={joinAlienOpen}
        blueActive={beamColor === 'blue' && !!(beamEnabled || showHUD)}
        onJoinToggle={setJoinAlienOpen}
        onBeamColorChange={handleBeamToggle}
        closeAllSignal={uiCloseSignal}
        suspendUI={warpActive}
        hideStartButton={false}
        onLaunch={() => {
          // Minimal immediate work for snappy tap
          try { sfx.setEnabled(true); (window).__CHX_UI_UNLOCKED = true; (window).__CHX_SHOW_DIMMING_OVERLAY = false; } catch {}
          try { window.dispatchEvent(new CustomEvent('ambient:prime')); } catch {}
          try { playerStore.getState().setPlanetDisplayMode('all'); playerStore.getState().setPlanetsVisible(true); } catch {}
          try { playerStore.setState({ mainId: null }); } catch {}
          try { setHidePlanetsForSelection(false); } catch {}
          // Defer heavier state churn to next frame to reduce jank
          const kickoff = () => {
            if (!firstStartDone) { welcomeOnStartRef.current = true; setHomeIntroEnabled(true); setWelcomeHasPlayed(false); }
            else { welcomeOnStartRef.current = false; setHomeIntroEnabled(false); try { setIsFirstLoad(false); } catch {} }
            setPendingOverlayReveal(true); setUiUnlocked(true); setShowDimmingOverlay(false); setLandingRevealReady(true);
            setUserSelected(false); setHomeMode(false); startButtonWarpRef.current = true;
            try { const a = document.querySelector('audio[data-audio-player="1"]'); if (a) { a.pause(); try { a.currentTime = 0; } catch {}; try { a.muted = true; } catch {}; try { a.removeAttribute('src'); } catch {}; try { a.load(); } catch {} } } catch {}
            setIsPlaying(false);
            setCurTrack(null); setChannelIdx(0); setPendingTrackPlay(false); setLinks({ spotify: LINKS.spotify, apple: LINKS.apple });
            setShowHUD(false); setShowOverlayUI(false); setBeamEnabled(false); setPendingHomePower(true);
            setAllowWarp(true); setSky(SPACE_SKY); setNextSky(null); setAmbientSuspended(true);
            setFlySignal((n) => n + 1);
          };
          if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) window.requestAnimationFrame(kickoff); else setTimeout(kickoff, 0);
        }}
        onPowerToggle={() => { 
          // Manual power toggle should not start new welcome audio, but don't interrupt if it's already playing
          if (!welcomeOnStartRef.current) {
            // Check if welcome audio is currently playing before disabling
            try {
              const intro = document.querySelector('audio[data-intro="1"]');
              const introIsPlaying = !!(intro && !intro.paused && (intro.currentTime || 0) > 0);
              // Only disable welcome intro if it's not currently playing
              if (!introIsPlaying) {
                setHomeIntroEnabled(false);
              }
            } catch {
              // If we can't check, err on the side of preserving audio
              setHomeIntroEnabled(false);
            }
          }
          // Blue button behavior is now handled entirely by handleBeamToggle('blue')
          // No need to call triggerHudPower since beam system manages everything
        }}
        onLaunch={() => {
          // Ensure SFX are enabled immediately within the user gesture
          try { 
            sfx.setEnabled(true); 
            (window).__CHX_UI_UNLOCKED = true; 
            // Immediately clear dimming so the wheel brightens right away on Start
            (window).__CHX_SHOW_DIMMING_OVERLAY = false;
          } catch {}
          // Prime ambient silently within this user gesture to satisfy autoplay policies
          try { window.dispatchEvent(new CustomEvent('ambient:prime')); } catch {}
          // Do not start ambient here; wait until warp finishes and the HUD/blue display is visible
          // Ignore current playing state: Start always triggers warp to homepage
          // Any currently playing main track will be stopped below before warp
          // Show all planets on homepage after Start
          try { 
            playerStore.getState().setPlanetDisplayMode('all'); 
            playerStore.getState().setPlanetsVisible(true); // CRITICAL: Force planets visible
          } catch {}
          try { playerStore.setState({ mainId: null }); } catch {}
          try { setHidePlanetsForSelection(false); } catch {}
          // Homepage Start flow (warp to home reveal)
          // Only enable welcome VO on FIRST Start button press per session
          if (!firstStartDone) {
            welcomeOnStartRef.current = true;
            setHomeIntroEnabled(true);
            
          } else {
            welcomeOnStartRef.current = false;
            setHomeIntroEnabled(false);
            
            // Ensure first-load flag is off after second Start
            try { setIsFirstLoad(false); } catch {}
          }
          setPendingOverlayReveal(true);
          setUiUnlocked(true);
          setShowDimmingOverlay(false);
          setLandingRevealReady(true);

          // Prepare warp to homepage
          setUserSelected(false);
          setHomeMode(false);
          startButtonWarpRef.current = true;

          // Stop any playing main track audio and clear track state (leave ambient to AmbientSpace logic)
          try {
            const a = document.querySelector('audio[data-audio-player="1"]');
            if (a) { a.pause(); try { a.currentTime = 0; } catch {}; try { a.muted = true; } catch {}; try { a.removeAttribute('src'); } catch {}; try { a.load(); } catch {} }
          } catch {}
          setIsPlaying(false);
          try { playerStore.setState({ mainId: null }); } catch {}
          setShowHUD(false);
          setShowOverlayUI(false);
          setBeamEnabled(false);
          setPendingHomePower(true);
          setAllowWarp(true);
          setSky(SPACE_SKY);
          setNextSky(null);
          setFlySignal((n) => n + 1);
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
              width: 'calc(var(--display-width) + 32px)',
              height: `calc(var(--display-width) * ${hudHeightFactor})`,
              zIndex: 93,
              borderRadius: 'var(--display-border-radius)',
              ['--hud-y']: `${hudYOffset}px`,
              pointerEvents: (uiUnlocked && showOverlayUI && !showDimmingOverlay) ? 'auto' : 'none'
            }}
          >
            <div className="relative h-full w-full p-0" style={{ overflow: 'visible' }} suppressHydrationWarning>
              {/* Safari fix: Use CSS transitions instead of Framer Motion for portal content */}
              <div
                className="absolute inset-0 p-0"
                suppressHydrationWarning
                key={safariRefreshKey} // Force re-render on Safari when needed
                style={(() => {
                  const normalCondition = uiUnlocked && showOverlayUI && showHUD && !warpActive && !showDimmingOverlay;
                  // First page should NOT show the blue display until Start unlocks UI
                  const shouldShow = normalCondition;
                  // Debug visibility conditions (optional)
                  debugLog({
                    homeMode,
                    warpActive,
                    uiUnlocked,
                    showOverlayUI,
                    showHUD,
                    showDimmingOverlay,
                    normalCondition,
                    shouldShow
                  });
                  
                  return {
                    // Allow planets to be visible even when UI is locked (before Start is pressed)
                    opacity: shouldShow ? 1 : 0,
                    pointerEvents: normalCondition ? 'auto' : 'none', 
                    visibility: shouldShow ? 'visible' : 'hidden',
                    transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    willChange: 'opacity',
                    transform: 'translateZ(0)' // Force hardware acceleration on Safari
                  };
                })()}
              >
                {(() => {
                  const currentIdValue = (homeMode && !userSelected && !pendingTrackPlay) ? undefined : curTrack?.slug;
                  const showAllValue = !currentIdValue;
                  // Debug HUD visibility inputs (optional)
                  debugLog({
                    homeMode,
                    userSelected,
                    pendingTrackPlay,
                    currentIdValue,
                    showAllValue,
                    hudSongsLength: hudSongs?.length
                  });
                  return null;
                })()}
                <HUDPanel
                  inConsole
                  songs={hudSongs}
                  onSongChange={onSongChange}
                  track={(homeMode && !userSelected && !pendingTrackPlay) ? undefined : curTrack}
                  currentId={(homeMode && !userSelected && !pendingTrackPlay) ? undefined : curTrack?.slug}
                  playing={(homeMode && !userSelected && !pendingTrackPlay) ? ambientPlaying : isPlaying}
                  showAllPlanets={homeMode}
                  hidePlanetsUntilPlaying={hidePlanetsForSelection}
                  beamOnly={beamOnly}
                  beamEnabled={beamEnabled}
                  joinAlienOpen={joinAlienOpen}
                />
              </div>
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
                    try { playerStore.setState({ mainId: null }); } catch {}
                    // Check if welcome audio is currently playing before disabling
                    try {
                      const intro = document.querySelector('audio[data-intro="1"]');
                      const introIsPlaying = !!(intro && !intro.paused && (intro.currentTime || 0) > 0);
                      // Only disable welcome intro if it's not currently playing
                      if (!introIsPlaying) {
                        setHomeIntroEnabled(false);
                      }
                    } catch {
                      // If we can't check, err on the side of preserving audio
                      setHomeIntroEnabled(false);
                    }
                    setUserSelected(false);
                    setLinks({ spotify: LINKS.spotify, apple: LINKS.apple });
                    triggerHudPower(true);
                  }}
                />
              ) : null}
            </div>
            {/* Hidden MediaPlayer for audio functionality only */}
            <div className="hidden">
              <MediaPlayer
                onSkyChange={(webm, mp4, key) => setNextSky({ webm, mp4, key })}
                onPlayingChange={(p) => { 
                  setIsPlaying(p);
                  // When a mapped track starts playing, arm its YouTube sky
                  try {
                    const slug = (curTrack && curTrack.slug) ? curTrack.slug : (tracks[channelIdx]?.slug || null);
                    if (p && slug && youtubeSkyFor(slug)) {
                      setYtSkyStartedSlug(slug);
                    }
                  } catch {}
                  if (p) {
                    try {
                      const slug = (curTrack && curTrack.slug) ? curTrack.slug : (tracks[channelIdx]?.slug || null);
                      const isHomePlayback = homeMode && !userSelected && !pendingTrackPlay;
                      if (slug) {
                        if (isHomePlayback) {
                          
                          // Home/ambient case: keep all planets
                          try { playerStore.getState().setMain(slug, true); } catch {}
                          try { playerStore.getState().setPlanetDisplayMode('all'); playerStore.getState().setPlanetsVisible(true); } catch {}
                        } else {
                          
                          try { playerStore.getState().setMain(slug); } catch {}
                          try { playerStore.getState().setPlanetDisplayMode('single'); playerStore.getState().setPlanetsVisible(true); } catch {}
                          try { setHomeMode(false); } catch {}
                        }
                      }
                      setHidePlanetsForSelection(false);
                    } catch {}
                    // Track music_started ONLY when not in home overview playback
                    if (!isHomePlayback) {
                      try {
                        const t = curTrack || tracks[channelIdx];
                        if (t && (t.slug || t.title)) {
                          track('music_started', { song_slug: (t.slug || '').toLowerCase(), payload: { song_title: t.title } });
                        }
                      } catch {}
                    }
                  } else {
                    // When playback stops/pauses:
                    // - On homepage: keep all planets visible
                    // - On song view: do not change planet visibility or mode
                    try {
                      if (homeMode) {
                        playerStore.getState().setPlanetDisplayMode('all');
                        playerStore.getState().setPlanetsVisible(true);
                      } else {
                        // No-op on non-home views; preserve current planet visibility/state
                      }
                    } catch {}
                  }
                }}
                onAudioReady={() => {}}
                onTrackChange={(t) => { 

                  setCurTrack(t); 
                  if (userSelected) { setLinks({ spotify: t.spotify || LINKS.spotify, apple: t.apple || LINKS.apple }); } else { setLinks({ spotify: LINKS.spotify, apple: LINKS.apple }); } 
                  // Reset YouTube sky state when switching away from the armed track
                  try {
                    const nextSlug = t?.slug || '';
                    if (ytSkyStartedSlug && nextSlug !== ytSkyStartedSlug) setYtSkyStartedSlug(null);
                  } catch {}
                  // Update planet system focus only when not on homepage flow
                  try {
                    if (userSelected || pendingTrackPlay || !homeMode) {
                      playerStore.getState().setMain(t.slug || '');
                    } else {
                      playerStore.setState({ mainId: null });
                    }
                  } catch {}
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

      {/* Light Beam - keep mounted; hide with display:none until UI unlock to avoid flicker and hook churn */}
      {SHOW_CENTER_BEAM && mounted ? (
        <div 
          className="fixed pointer-events-none z-[95] light-beam"
          style={{ ...lightBeamStyle, display: uiUnlocked ? 'block' : 'none' }}
        >
          {/* Single main beam */}
          <div 
            style={{
              position: 'absolute',
              left: '5%',
              right: '5%',
              bottom: '0px', 
              top: '0%',
              clipPath: 'polygon(48% 100%, 52% 100%, 10% 0, 90% 0)',
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


      {mounted && uiUnlocked && showOverlayUI && showHUD && !showDimmingOverlay && process.env.NEXT_PUBLIC_HOLOHUD === '1' ? (
        <HoloHUD
          track={(homeMode && !userSelected && !pendingTrackPlay) ? undefined : curTrack}
          playing={effectivelyPlaying}
          hidePlayButton={userSelected || !homeMode}
          onToggle={() => {
            try {
              if (homeMode) {
                // Do not toggle ambient on home; remain silent
                try { window.dispatchEvent(new CustomEvent('ambient:userPause')); } catch {}
                return;
              }
            } catch {}
            // Otherwise toggle main player
            setToggleSignal((n) => n + 1);
          }}
          onSelect={(slug) => {
            try { 
              onSongChange(slug);
              // Song will start automatically after warp completes via pendingTrackPlay mechanism
            } catch {}
          }}
        />
      ) : null}


      {/* Simple Dimming Overlay */}
      {mounted && showDimmingOverlay ? (
        <div className="fixed inset-0 z-[89] pointer-events-none">
          <div 
            className="absolute inset-0"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              transition: 'opacity 500ms ease-out',
              pointerEvents: 'none'
            }}
          />
          {/* Circular cutout for start button to allow interaction */}
          {spotlightPos.x !== null && spotlightPos.y !== null && spotlightPos.r !== null ? (
            <div
              className="absolute"
              style={{
                left: spotlightPos.x - spotlightPos.r - 20,
                top: spotlightPos.y - spotlightPos.r - 20,
                width: (spotlightPos.r + 20) * 2,
                height: (spotlightPos.r + 20) * 2,
                borderRadius: '50%',
                pointerEvents: 'auto'
              }}
            />
          ) : null}
        </div>
      ) : null}

      {/* Background preloader: defer until Start unlock to avoid heavy work on load */}
      {mounted && uiUnlocked ? (
        <PreloadMedia maxImage={8} maxAudio={3} maxVideo={2} />
      ) : null}


    </main>
  );
}
