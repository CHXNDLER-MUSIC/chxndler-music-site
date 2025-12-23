"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import SkyboxVideo from "@/components/SkyboxVideo";
import LumaKeyVideo from "@/components/LumaKeyVideo";
import AmbientSpace from "@/components/AmbientSpace";
import SteeringWheelOverlay from "@/components/SteeringWheelOverlay";
import StationDialOverlay from "@/components/StationDialOverlay";
import { Slot } from "@/components/Slot";
import { DASHBOARD } from "@/config/dashboard";
import { ENABLE_HEARTVERSE_3D } from "@/config/features";
import dynamic from "next/dynamic";
const HUDPanel = dynamic(() => import("@/components/HUDPanel"), { ssr: false });
// ⚠️ 3D SYSTEM COMPLETELY DISABLED - HeartverseSystemWrapper import removed
// const HeartverseSystemWrapper = ENABLE_HEARTVERSE_3D ? dynamic(() => import("@/components/holo/HeartverseSystemWrapper"), { ssr: false }) : null;
const HoloHUD = dynamic(() => import("@/components/HoloHUD"), { ssr: false });
import { skyFor, introSky } from "@/lib/sky";
import { youtubeSkyFor, HOME_YOUTUBE_SKY } from "@/lib/sky-youtube";
// MediaPlayer disabled - using unified audio system instead
// const MediaPlayer = dynamic(() => import("@/components/MediaPlayer"), { ssr: false });
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
import { audioHeartverse } from "@/lib/audio-heartverse";
import WelcomeHomeModal from "@/components/WelcomeHomeModal";
import { useAudio } from "@/app/providers/AudioProvider";
import ProfileBarWrapper from "@/components/ProfileBarWrapper";
import HoloStarsButton from "@/components/HoloStarsButton";
import SoulStareModal from "@/components/SoulStareModal";
import HeartCoinModal from "@/components/HeartCoinModal";
import { useUIStore } from "@/store/useUIStore";
import { useProfile } from "@/contexts/ProfileContext";
import { useUIState } from "@/lib/use-ui-state";
import { supabaseClient } from "@/lib/supabaseClient";
import GlowingHamburgerMenuWrapper from "@/components/GlowingHamburgerMenuWrapper";
import { useSongs } from "@/hooks/useSongs";

export default function DashboardApp({ initialSlug, todaysPrompt } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Unified audio provider for single source of truth
  const audioManager = useAudio();
  
  // UI store for profile refresh trigger and name modal (must be before useEffect)
  const { profileRefreshTrigger, openNamePrompt, openNamePromptFromAuth } = useUIStore();
  
  // Authentication error handling
  const [authError, setAuthError] = useState(null);
  
  useEffect(() => {
    // Check for authentication errors in URL parameters
    const error = searchParams.get('error');
    const magicLinkExpired = searchParams.get('magic_link_expired');
    
    if (error) {
      let errorMessage = '';
      switch (error) {
        case 'timeout':
          errorMessage = 'Authentication timed out. Please try signing in again.';
          break;
        case 'no_session':
          errorMessage = 'Authentication failed. Please try signing in again.';
          break;
        case 'auth_failed':
          const details = searchParams.get('details');
          errorMessage = `Authentication failed${details ? `: ${details}` : '. Please try again.'}`;
          break;
        case 'unexpected':
          errorMessage = 'An unexpected error occurred during sign in. Please try again.';
          break;
        case 'wrong_browser':
          errorMessage = 'Please open the magic link in the same browser where you requested it.';
          break;
        case 'link_expired':
          errorMessage = 'This link has expired or already been used. Please request a new magic link.';
          break;
        case 'code_exchange':
          const codeDetails = searchParams.get('details');
          errorMessage = `Sign in failed${codeDetails ? `: ${codeDetails}` : '. Please try again.'}`;
          break;
        default:
          errorMessage = 'Authentication error. Please try signing in again.';
      }
      setAuthError(errorMessage);
      
      // Clean up URL parameters
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('error');
      newParams.delete('details');
      router.replace(`/?${newParams.toString()}`);
    }
    
    if (magicLinkExpired === '1') {
      setAuthError('Your magic link has expired or is invalid. Please request a new one.');
      
      // Clean up URL parameters
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('magic_link_expired');
      router.replace(`/?${newParams.toString()}`);
    }
    
    // Check if we should show the name prompt (from auth callback)
    const shouldShowNamePrompt = searchParams.get('showNamePrompt');
    if (shouldShowNamePrompt === '1') {
      // Open name prompt modal from auth callback
      openNamePromptFromAuth();
      
      // Clean up URL parameter
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('showNamePrompt');
      const newUrl = newParams.toString() ? `/?${newParams.toString()}` : '/';
      router.replace(newUrl);
    }
  }, [searchParams, router, openNamePrompt]);
  
  // Profile context for user and profile data
  const { profile } = useProfile();
  
  // Global UI state for profile bar visibility
  const { setHasEnteredHeartverse, enterHeartverse, setWarpFullyComplete, warpFullyComplete, userClickedStart, setUserClickedStart } = useUIState();
  
  // Global wheel render mode (LUMA vs PLAIN). Must be top-level to obey Hooks rules.
  // Use false initially to match SSR, then sync with localStorage after hydration
  const [wheelPlain, setWheelPlain] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hard guard: ensure main player is fully silent on first load
  // Prevents any accidental playback (e.g., previously primed states) on opening page
  React.useEffect(() => {
    try {
      const a = document.querySelector('audio[data-audio-player="1"]');
      if (a) {
        try { a.pause(); } catch {}
        try { a.currentTime = 0; } catch {}
        try { a.muted = true; } catch {}
        try { a.removeAttribute('src'); } catch {}
        try { a.load(); } catch {}
      }
    } catch {}
  }, []);

  // Sync with localStorage after hydration to prevent hydration mismatch
  useEffect(() => {
    try {
      if (window.localStorage.getItem('WHEEL_FORCE_LUMA') === '1') {
        setWheelPlain(false);
      } else {
        const ls = window.localStorage.getItem('PLAIN_WHEEL');
        if (ls === '1') {
          setWheelPlain(true);
        } else if (ls === '0') {
          setWheelPlain(false);
        } else {
          window.localStorage.setItem('PLAIN_WHEEL', '0');
          setWheelPlain(false); // default to LUMA (keyed) for transparent background
        }
      }
    } catch {
      setWheelPlain(false);
    }
    setIsHydrated(true);
  }, []);

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

  // Ambient audio will only start when user explicitly interacts
  // (removed auto-start for silent page opening)

  const [channelIdx, setChannelIdx] = useState(-1); // Set to invalid index to prevent any auto track loading
  // Wrapper for setChannelIdx with logging for song selection debugging
  const setChannelIdxWithLog = (newIdx) => {
    if (process.env.NODE_ENV === "development") {
      console.log('🎵 Playing track:', tracks[newIdx]?.title);
    }
    setChannelIdx(newIdx);
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const [sky, setSkyInternal] = useState(introSky);
  
  // Wrapper to prevent unnecessary sky updates
  const setSky = useCallback((newSky) => {
    if (!newSky || (sky && newSky.key === sky.key)) return;
    setSkyInternal(newSky);
  }, [sky]);
  const [links, setLinks] = useState({ spotify: LINKS.spotify, apple: LINKS.apple });
  const [userSelected, setUserSelected] = useState(false);
  const [curTrack, setCurTrack] = useState(null); // No default track - user must explicitly select
  const [playSignal, setPlaySignal] = useState(0);
  const [toggleSignal, setToggleSignal] = useState(0);
  const [flySignal, setFlySignal] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [showHUD, setShowHUD] = useState(false);
  const [showStarsModal, setShowStarsModal] = useState(false);
  const [showWelcomeHomeModal, setShowWelcomeHomeModal] = useState(false);
  const [showHeartCoinModal, setShowHeartCoinModal] = useState(false);
  const [heartCoinModalTab, setHeartCoinModalTab] = useState('earn');
  // Track if user actually clicked START button (now using global UI state)
  // Legacy state variables will be defined after UI phase variables below
  // Guard to prevent rapid double-trigger of Start flow before state updates
  const startInFlightRef = React.useRef(false);
  const [nextSky, setNextSky] = useState(null);
  const [beamOnly, setBeamOnly] = useState(true);
  const [beamEnabled, setBeamEnabled] = useState(false);
  const [powerBusy, setPowerBusy] = useState(false);
  const [uiCloseSignal, setUiCloseSignal] = useState(0); // increment to force-close buttons/menus during warp
  // Gate overlay + HUD power-up until Start is pressed (or deep link)
  // NOTE: Do NOT auto-run warp on homepage; only enable after START click or deep link
  // Deep links will explicitly set allowWarp(true) in the route effect below
  const [allowWarp, setAllowWarp] = useState(false);
  const [landingMode, setLandingMode] = useState(true); // initial screen state
  const [landingRevealReady, setLandingRevealReady] = useState(false); // when true, allow initial overlay to hide
  const [homeMode, setHomeMode] = useState(!initialSlug); // true when on homepage (no initial slug)
  const [homeIntroEnabled, setHomeIntroEnabled] = useState(false);
  const [pendingHomePower, setPendingHomePower] = useState(false);
  const [pendingTrackPlay, setPendingTrackPlay] = useState(false);
  // Track which YouTube sky has been armed by playback (keep looping even if audio pauses)
  const [ytSkyStartedSlug, setYtSkyStartedSlug] = useState(null);
  // YouTube URL for element planet warps (WATER, CENTER, HEART, DARKNESS, LIGHTNING)
  const [elementWarpYoutubeUrl, setElementWarpYoutubeUrl] = useState(null);
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
  const [shouldShowWelcomeModal, setShouldShowWelcomeModal] = useState(false); // tracks if welcome modal should show after warp
  // Ensure song MP3 starts only after join-alien SFX finishes (played at warp end)
  const buttonSfxWaitRef = React.useRef(null);
  // Join-alien SFX promise used to gate song start after warp
  const joinSfxWaitRef = React.useRef(null);
  // Track index to set after warp and join-alien SFX complete
  const pendingTrackIndexRef = React.useRef(null);
  // Guard to prevent button.mp3 from playing multiple times per warp
  const buttonRevealTriggeredRef = React.useRef(false);
  const [cardModalOpen, setCardModalOpen] = useState(false); // track card modal state for beam dimming
  const [joinAlienOpen, setJoinAlienOpen] = useState(false); // track join alien button state for pink beam
  const [beamColor, setBeamColor] = useState('blue'); // track active beam color
  const [beamTransitioning, setBeamTransitioning] = useState(false); // prevent rapid beam changes
  const [explicitClose, setExplicitClose] = useState(false); // track when explicitly closing without opening another display
  const [shouldOpenJournal, setShouldOpenJournal] = useState(false); // track when journal should be opened
  const [safariRefreshKey, setSafariRefreshKey] = useState(0); // Safari refresh mechanism
  // Lock to prevent beam/HUD reveal until button.mp3 finishes
  const [uiRevealLocked, setUiRevealLocked] = useState(false);
  
  // DEBUG LOGGING HELPER
  const DEBUG = false; // Set to true for detailed logs
  const debugLog = (message, data) => {
    if (DEBUG) console.log(message, data);
  };

  // UI PHASE STATE MACHINE - replaces complex boolean logic (plain JavaScript)
  // Phases: "intro" | "warping" | "landed"
  const [uiPhase, setUiPhase] = useState("intro");
  
  // DERIVED STATES from uiPhase - much cleaner than individual booleans
  const isIntro = uiPhase === "intro";
  const isWarping = uiPhase === "warping"; 
  const isLanded = uiPhase === "landed";
  
  // Add state for menu timing
  const [showMenus, setShowMenus] = useState(false);
  
  // Derive display states from UI phase
  const showDimmingOverlay = uiPhase === "intro" && !userClickedStart; // dim only during intro phase, clear when START is clicked
  const showProfileBar = uiPhase === "landed"; // show immediately when landed (no delay)
  const cockpitVisible = uiPhase === "landed" || userClickedStart; // cockpit visible when START is clicked or landed
  const uiUnlocked = uiPhase === "landed"; // UI unlocked when landed
  const showOverlayUI = uiPhase === "landed"; // overlay UI when landed

  // Legacy compatibility: Dummy setters for old code that might still reference them
  // These don't actually change state since values are now derived from uiPhase
  const setShowOverlayUI = () => { /* no-op: derived from uiPhase */ };
  const setUiUnlocked = () => { /* no-op: derived from uiPhase */ };
  
  // Track when the warp VISUAL overlay is active (lightspeed effect)
  // This is separate from uiPhase because the overlay might still be visible
  // even after phase changes to "landed"
  const [warpOverlayActive, setWarpOverlayActive] = useState(false);

  // warpActive = true when either in warping phase OR the overlay is still visible
  // This ensures beam/display don't appear until lightspeed effect actually finishes
  const warpActive = isWarping || warpOverlayActive;
  const setWarpActive = (val) => setWarpOverlayActive(val); // now functional
  
  // Debug: Log UI phase changes (only when DEBUG is true)
  useEffect(() => {
    debugLog("🎭 UI PHASE CHANGED:", { 
      uiPhase,
      isIntro,
      isWarping, 
      isLanded,
      showDimmingOverlay,
      showProfileBar,
      showMenus,
      profileName: profile?.name,
      "ProfileBar should show": isLanded,
      "Menus should show": showMenus,
      userAgent: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'
    });
  }, [uiPhase, isIntro, isWarping, isLanded, showDimmingOverlay, showProfileBar, showMenus, profile?.name]);

  // Effect to show menus when landed (immediate, no delay needed since profile bar now shows immediately)
  useEffect(() => {
    debugLog("🍔 MENU EFFECT:", { isLanded, showMenus });
    
    if (isLanded && !showMenus) {
      debugLog("🍔 Landing complete - showing menus immediately");
      setShowMenus(true);
    } else if (!isLanded && showMenus) {
      debugLog("🍔 Not landed - hiding menus");
      setShowMenus(false);
    }
  }, [isLanded, showMenus]);

  // Saved profile name from HUD signup flow
  const [savedProfileName, setSavedProfileName] = useState('');
  // Saved profile element from HUD signup flow
  const [savedProfileElement, setSavedProfileElement] = useState('');
  // Unified timing constants for display/beam sequencing
  // Keep conservative defaults for overlapping transitions, but tighten a bit for snappier feel
  const BEAM_SWITCH_DELAY_MS = 300; // was 450ms; faster when switching between colors
  const BLUE_OPEN_AFTER_BEAM_MS = 90; // was 140ms; snappier blue HUD reveal after beam

  // Live refs for visibility guards (avoid stale closures in timeouts)
  const showHUDRef = React.useRef(showHUD);
  React.useEffect(() => { showHUDRef.current = showHUD; }, [showHUD]);
  const beamEnabledRef = React.useRef(beamEnabled);
  React.useEffect(() => { beamEnabledRef.current = beamEnabled; }, [beamEnabled]);

  // Connect audio manager context to sky/background changes
  React.useEffect(() => {
    // Skip context sky updates during Start button warp to avoid interference
    if (startButtonWarpRef.current || isWarping || startInFlightRef.current) {
      return;
    }
    
    if (audioManager.currentTrack && audioManager.currentTrack.id) {
      // Update sky when context track changes (maintains warp effect without breaking state)
      try {
        const newSky = skyFor(audioManager.currentTrack.id);
        if (newSky && (newSky.key !== sky.key)) {
          if (process.env.NODE_ENV === "development") {
            console.log('🎨 Context overriding sky!', {
              from: sky.key,
              to: newSky.key,
              trackInfo: audioManager.currentTrack.id
            });
          }
          setSky(newSky);
        }
      } catch (error) {
        console.warn('Failed to update sky for track:', audioManager.currentTrack.id, error);
      }
      
      // Update curTrack to match the context (maintain compatibility with existing logic)
      const matchingTrack = tracks.find(t => t.slug === audioManager.currentTrack.id);
      if (matchingTrack && (!curTrack || curTrack.slug !== matchingTrack.slug)) {
        setCurTrack(matchingTrack);
      }
    }
  }, [audioManager.currentTrack, curTrack, isWarping]);

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
  const SPACE_SKY = { webm: "", mp4: "", key: "space", youtubeUrl: "https://youtu.be/gHDxkhQ4FbY" };

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
    // Do not allow revealing HUD/beam during warp or while reveal is locked
    if ((uiPhase === 'warping') || uiRevealLocked) return;
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
  }, [powerBusy, beamEnabled, showHUD, uiUnlocked, uiPhase, uiRevealLocked]);


  function onSongChange(id, options){
    // [WARP] Entry point for all song changes
    console.log('[WARP] start - onSongChange entry point', { id, options, tracksCount: tracks?.length || 0 });

    // In-app song change without spotlight/beam/route reloads
    // The id parameter is already the track slug from buildPlanetSongs()
    const slug = String(id || '').toLowerCase();
    // Guard against empty/invalid ids to avoid matching the first track
    if (!slug || slug.trim() === '') {
      console.error('[WARP] start - early return: empty id');
      console.warn('DashboardApp: onSongChange called with empty id; ignoring selection');
      return;
    }
    console.log('[WARP] start - resolved slug:', slug);
    // Notify planetarium to focus camera on destination immediately
    try {
      if (typeof window !== 'undefined' && slug) {
        window.dispatchEvent(new CustomEvent('planet:warp-to-song', { detail: { id: slug, source: 'dropdown' } }));
      }
    } catch {}
    
    // IMMEDIATELY hide blue display and light beam when song is selected
    // Unless explicitly asked to preserve the blue display (e.g., HUD planet clicks)
    if (!options || !options.preserveBlueDisplay) {
      setShowHUD(false);
      setBeamEnabled(false);
    }
    
    // First try exact slug match
    let idx = tracks.findIndex(t => (t.slug || '').toLowerCase() === slug);
    // If not found, try exact title slugification match
    if (idx < 0) {
      idx = tracks.findIndex(t => slugify(t.title || '').toLowerCase() === slug);
    }
    // If still not found, try partial title match as last resort
    // Only do this when the slug has meaningful length to avoid matching everything
    if (idx < 0 && slug.length >= 2) {
      idx = tracks.findIndex(t => (t.title || '').toLowerCase().includes(slug.replace(/-/g, ' ')));
    }
    
    if (idx < 0) {
      console.error('[WARP] start - early return: track not found', { id, slug });
      console.warn('DashboardApp: onSongChange - track not found for id:', id, 'slug:', slug);
      if (process.env.NODE_ENV === "development") {
        console.log('[WARP] Available tracks:', tracks.map(t => ({title: t.title, slug: t.slug})));
      }
      return;
    }
    const selectedTrack = tracks[idx];
    if (process.env.NODE_ENV === "development") {
      console.log('🎵 Song selected:', selectedTrack.title);
      console.log('🎵 Current state before update:', { userSelected, homeMode, pendingTrackPlay, curTrack: curTrack?.slug });
    }
    // Unblock main player audio now that a song is explicitly selected
    try { if (typeof window !== 'undefined') { window.__BLOCK_MAIN_AUDIO = false; } } catch (e) {}
    

    // Planet focusing will be handled after warp sequence completes

    // STEP 2: Stop all music immediately when song is selected
    
    // Stop all audio via unified AudioProvider before warp effect
    try {
      audioManager.stopAllAudio();
      console.log('🎵 AudioProvider: Stopped all audio immediately on song selection');
    } catch (e) {
      console.warn('DashboardApp: Error stopping unified audio:', e);
    }
    
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
    setLinks({ spotify: t.spotify || LINKS.spotify, apple: t.apple || LINKS.apple });
    
    // Update player store so HoloAudioBridge plays the correct song
    try { playerStore.getState().setMain(selectedTrack.slug || ''); } catch {}
    
    // Set the selected track as pending for post-warp playback
    try { audioManager.setPendingTrack(selectedTrack.slug); } catch {}
    
    // Set flags for selection sequencing: keep planets visible during warp on homepage
    setPendingTrackPlay(true);
    setHidePlanetsForSelection(false);
    // Store the track index to set after warp completes
    pendingTrackIndexRef.current = idx;
    // Set the current track directly for immediate UI updates
    setCurTrack(selectedTrack);
    if (process.env.NODE_ENV === "development") {
      console.log('🎵 State updated - new curTrack:', selectedTrack.slug, 'userSelected: true, pendingTrackPlay: true');
    }
    
    // Always switch the base sky immediately so it can load under the overlay.
    // Do not start a new warp if one is already in progress; just update the pending track.
    try {
      setSky(skyFor(t.slug));
      setNextSky(null);
    } catch {}

    // If a warp is already active (or being initiated by Start), avoid stacking warps.
    // Keep the current warp running and let the latest pending selection take effect when it finishes.
    if (!warpActive && !isWarping) {
      console.log('[WARP] triggering warp sequence for:', selectedTrack.title);
      // Mark warp overlay as active immediately before triggering
      setWarpActive(true);
      // Reset button reveal guard for this new warp
      buttonRevealTriggeredRef.current = false;
      // Add a brief delay before triggering warp sequence, allowing for anticipation
      setTimeout(() => {
        // Trigger warp sequence
        console.log('[WARP] flySignal incremented - warp effect starting');
        setAllowWarp(true);
        setFlySignal((n) => n + 1);
        
        // BACKUP TIMER: Ensure warp completes even if audio callback fails (Chrome compatibility)
        setTimeout(() => {
          if (!warpFullyComplete) {
            if (process.env.NODE_ENV === "development") {
        console.log("🔧 BACKUP: Setting warpFullyComplete to true (song selection warp)");
      }
            setWarpFullyComplete(true);
          }
          // Always reset warp state to allow subsequent warps (fixes blocked warps when onFlyEnd fails)
          setWarpActive(false);
          setAllowWarp(false);
        }, WARP_DURATION_MS + 500);
      }, 300);
    } else {
      console.log('[WARP] warp blocked - already active', { warpActive, isWarping });
    }

    // Audio channel change is now handled by the unified audio system
    // Track switching is handled after warp completion
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
      
      // BACKUP TIMER: Ensure warp completes even if audio callback fails (Chrome compatibility)
      setTimeout(() => {
        if (!warpFullyComplete) {
          if (process.env.NODE_ENV === "development") {
          console.log("🔧 BACKUP: Setting warpFullyComplete to true (auto warp)");
        }
          setWarpFullyComplete(true);
        }
        // Always reset warp state to allow subsequent warps
        setWarpActive(false);
        setAllowWarp(false);
      }, WARP_DURATION_MS + 500);
    }
    prevIdxRef.current = channelIdx;
  }, [channelIdx, mounted, userSelected, warpActive, uiUnlocked]);
  const { hudSongs: staticHudSongs, holoSongs } = React.useMemo(() => buildPlanetSongs(), []);

  // Fetch database songs to get ALL songs including unreleased
  const { songs: dbSongs } = useSongs();

  // Element colors for planet display
  const ELEMENT_COLORS = {
    heart: "#FC54AF",
    water: "#38B6FF",
    lightning: "#F2EF1D",
    darkness: "#8B5A8B"
  };

  // Build hudSongs from database (includes ALL songs, released and unreleased)
  // Use static data to supplement with spotify/apple/youtube links where available
  const hudSongs = React.useMemo(() => {
    // If no database songs yet, fallback to static
    if (!dbSongs || dbSongs.length === 0) return staticHudSongs;

    // Create a map of slug -> static song data for enrichment
    const staticMap = new Map();
    staticHudSongs.forEach(song => {
      staticMap.set(song.id, song);
    });

    // Build from database songs (includes ALL songs)
    return dbSongs.map(song => {
      const staticData = staticMap.get(song.slug) || {};
      const element = (song.element || 'heart').toLowerCase();
      return {
        id: song.slug,
        title: song.title,
        icon: element,
        color: ELEMENT_COLORS[element] || ELEMENT_COLORS.heart,
        is_released: song.is_released,
        // Enrich with static data if available
        spotify: staticData.spotify,
        apple: staticData.apple,
        youtube: staticData.youtube,
        hasLyrics: staticData.hasLyrics
      };
    });
  }, [staticHudSongs, dbSongs]);

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

  // Disable legacy auto-welcome VO on first homepage open to ensure silence until Start
  useEffect(() => {
    // Intentionally no-op: centralized AudioManager handles Start flow
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
    
    // Set the selected track as pending for post-warp playback
    try { audioManager.setPendingTrack(t.slug); } catch {}
    
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
    // Channel index setting disabled - no auto track selection
    // const idx = tracks.findIndex((x) => (x.slug || '').toLowerCase() === (t.slug || '').toLowerCase());
    // if (idx >= 0) setChannelIdxWithLog(idx);
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
    // Reset button reveal guard for this new warp
    buttonRevealTriggeredRef.current = false;
    // Trigger warp overlay and switch sky to this song
    setAllowWarp(true);
    setNextSky(skyFor(t.slug));
    setFlySignal((n) => n + 1);
    
    // BACKUP TIMER: Ensure warp completes even if audio callback fails (Chrome compatibility)
    setTimeout(() => {
      if (!warpFullyComplete) {
        if (process.env.NODE_ENV === "development") {
        console.log("🔧 BACKUP: Setting warpFullyComplete to true (initial slug warp)");
      }
        setWarpFullyComplete(true);
      }
    }, WARP_DURATION_MS + 500);
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

  // Handle welcome home modal close - trigger warp effect and proceed to home
  const handleWelcomeHomeClose = React.useCallback(() => {
    setShowWelcomeHomeModal(false);
    setShouldShowWelcomeModal(false); // Ensure flag is reset when modal is closed
    
    // Enable UI and prepare for blue display (no warp effect)
    setUiUnlocked(true);
    setLandingRevealReady(true);
    setWarpActive(false); // Ensure warp is not active
    
    // Stop any playing main track audio
    try {
      const a = document.querySelector('audio[data-audio-player="1"]');
      if (a) { a.pause(); try { a.currentTime = 0; } catch {}; try { a.muted = true; } catch {}; try { a.removeAttribute('src'); } catch {}; try { a.load(); } catch {} }
    } catch {}
    setIsPlaying(false);
    try { playerStore.setState({ mainId: null }); } catch {}
    
    // Open blue display directly instead of triggering warp
    setShowOverlayUI(true);
    setBeamEnabled(true);
    setBeamColor('blue');
    
    // Small delay to let beam appear before showing HUD
    setTimeout(() => {
      setShowHUD(true);
    }, 150);
  }, []);
  
  // Handle beam color control with strict mutual exclusion between displays
  const handleBeamToggle = React.useCallback((color) => {
    // Block any beam/display changes during warp or while reveal is locked
    if ((uiPhase === 'warping') || uiRevealLocked) return;
    // Allow immediate OFF even during transitions; otherwise guard
    if (beamTransitioning && color !== 'off') return;
    
    // Always close ALL displays first, then open the target display
    const closeAllDisplays = (skipYellowClose = false, keepBlueDisplay = false) => {
      if (!keepBlueDisplay) {
        setShowHUD(false);
      }
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
      // Delay beam color reset until after fade completes to avoid color flash during fade
      setTimeout(() => {
        setBeamColor('blue'); // reset baseline without opening HUD
      }, 400);
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
        // Switch to pink - close everything first, but do NOT enable the light beam
        setBeamTransitioning(true);
        closeAllDisplays();
        // Wait until blue HUD + beam are fully hidden, then open pink panel without beam
        waitUntilBlueHidden(() => {
          setBeamColor('pink');
          // Enable beam for pink signal display
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
        // Switch to yellow - close blue display first, then open yellow display
        setBeamTransitioning(true);
        closeAllDisplays(); // Close all displays including blue display
        setTimeout(() => {
          setBeamColor('yellow');
          setBeamEnabled(true);
          setBeamTransitioning(false);
          // Yellow menu will open itself via HoloHubMenu onToggle
        }, BEAM_SWITCH_DELAY_MS);
      }
    } else if (color === 'blue') {
      // Treat "blue active" as the blue HUD actually being open, not just the beam lit
      const blueActiveNow = (beamColor === 'blue') && (showHUD);
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
    } else if (color === 'white') {
      if (beamColor === 'white') {
        // Already showing white - toggle off without opening blue display
        setBeamTransitioning(true);
        setExplicitClose(true);
        closeAllDisplays();
        setTimeout(() => {
          setBeamColor('blue'); // Reset to blue but keep displays closed
          setBeamTransitioning(false);
          setExplicitClose(false);
        }, 150);
      } else {
        // Switch to white - close other displays and show white beam
        setBeamTransitioning(true);
        closeAllDisplays();
        setTimeout(() => {
          setBeamColor('white');
          setBeamEnabled(true);
          setBeamTransitioning(false);
          // White beam doesn't open any specific display, just shows the beam
        }, BEAM_SWITCH_DELAY_MS);
      }
    } else if (color === 'magenta') {
      if (beamColor === 'magenta') {
        // Already showing magenta - toggle off without opening blue display
        setBeamTransitioning(true);
        setExplicitClose(true);
        closeAllDisplays();
        setTimeout(() => {
          setBeamColor('blue'); // Reset to blue but keep displays closed
          setBeamTransitioning(false);
          setExplicitClose(false);
        }, 150);
      } else {
        // Switch to magenta - close other displays and show magenta beam
        setBeamTransitioning(true);
        closeAllDisplays();
        setTimeout(() => {
          setBeamColor('magenta');
          setBeamEnabled(true);
          setBeamTransitioning(false);
          // Magenta beam doesn't open any specific display, just shows the beam
        }, BEAM_SWITCH_DELAY_MS);
      }
    } else if (color === 'cyan') {
      if (beamColor === 'cyan') {
        // Already showing cyan - toggle off without opening blue display
        setBeamTransitioning(true);
        setExplicitClose(true);
        closeAllDisplays();
        setTimeout(() => {
          setBeamColor('blue'); // Reset to blue but keep displays closed
          setBeamTransitioning(false);
          setExplicitClose(false);
        }, 150);
      } else {
        // Switch to cyan - close other displays and show cyan beam
        setBeamTransitioning(true);
        closeAllDisplays();
        setTimeout(() => {
          setBeamColor('cyan');
          setBeamEnabled(true);
          setBeamTransitioning(false);
          // Cyan beam doesn't open any specific display, just shows the beam
        }, BEAM_SWITCH_DELAY_MS);
      }
    } else if (color === 'pink-modal') {
      // Pink beam for modals (binder, etc) - does NOT open livestream/JoinAlien
      // Just changes beam color without opening any display panel
      setBeamTransitioning(true);
      closeAllDisplays();
      setTimeout(() => {
        setBeamColor('pink');
        setBeamEnabled(true);
        setBeamTransitioning(false);
      }, BEAM_SWITCH_DELAY_MS);
    }
  }, [beamColor, showHUD, joinAlienOpen, beamTransitioning, explicitClose, uiPhase, uiRevealLocked]);

  // Function to open HeartCoin modal with a specific tab
  const openHeartCoinModal = React.useCallback((tab = 'earn') => {
    setHeartCoinModalTab(tab);
    setShowHeartCoinModal(true);
  }, []);


  // START BUTTON HANDLER - TRIGGERS WARP SEQUENCE
  // CLEAN START BUTTON HANDLER - UI Phase State Machine
  const WARP_DURATION_MS = 3000; // Match the minDurationMs from SkyboxVideo
  
  const handleStartClick = React.useCallback(() => {
    console.log("🚀 START CLICKED");

    if (startInFlightRef.current) return;
    startInFlightRef.current = true;

    // Mark that user actually clicked START
    setUserClickedStart(true);

    // Show Welcome Home modal immediately for logged-out users on first START click
    if (!profile?.id && !showWelcomeHomeModal) {
      setShowWelcomeHomeModal(true);
    }

    // Set flag to identify this as a start button warp
    startButtonWarpRef.current = true;
    // Reset button reveal guard for this new warp
    buttonRevealTriggeredRef.current = false;

    // Enable SFX immediately so warp sound can play
    try { sfx.setEnabled(true); } catch {}

    // Play warp.mp3 IMMEDIATELY on Start button click (don't wait for SkyboxVideo)
    try {
      sfx.play('warp', 0.7);
      // Set global flag so SkyboxVideo doesn't play warp again
      if (typeof window !== 'undefined') {
        (window).__WARP_SOUND_PLAYED = true;
      }
    } catch {}

    // Enter warp phase immediately
    setUiPhase("warping");
    // Prevent any UI reveals until button.mp3 completes
    setUiRevealLocked(true);
    
    // Hide HUD immediately when warp starts so power button turns off
    setShowHUD(false);
    setBeamEnabled(false);
    setBeamColor('off');
    // Mark warp overlay as active immediately (onFlyStart will also set this)
    setWarpActive(true);

    // Trigger existing warp visual/audio systems
    setAllowWarp(true);
    setSky(SPACE_SKY);
    setFlySignal(n => n + 1);
    setHomeMode(true);
    setUserSelected(false);
    setLinks({ spotify: LINKS.spotify, apple: LINKS.apple });
    
    // SkyboxVideo component handles warp sound to prevent double triggering
    
    // BACKUP TIMER: Ensure warp completes even if audio callback fails (Chrome compatibility)
    setTimeout(() => {
      if (!warpFullyComplete) {
        if (process.env.NODE_ENV === "development") {
          console.log("🔧 BACKUP: Setting warpFullyComplete to true (audio callback may have failed)");
        }
        setWarpFullyComplete(true);
      }
    }, WARP_DURATION_MS + 500); // Add 500ms buffer beyond the expected warp duration
    
    // Stop any existing audio using the unified audio system
    try {
      audioManager.stopAllAudio();
      setIsPlaying(false);
      playerStore.setState({ mainId: null });
    } catch (e) {
      console.error("Error stopping audio (non-critical):", e);
    }

    // NOTE: Audio sequence is handled by SkyboxVideo (warp.mp3) and onWarpSfxEnd (button.mp3)
    // Do NOT call audioManager.playStartSequence here as it would duplicate the sounds

    // When warp finishes, move to landed phase
    // NOTE: The beam and HUD are now enabled in onWarpSfxEnd AFTER button.mp3 plays
    // to ensure proper sequence: warp.mp3 -> button.mp3 -> beam opens -> HUD opens
    setTimeout(() => {
      if (process.env.NODE_ENV === "development") {
        console.log("🛬 LANDING COMPLETE - Phase updated (beam/HUD handled by onWarpSfxEnd)");
      }
      // Only set phase to landed if not already set by onWarpSfxEnd
      // and only if UI reveal is no longer locked (button.mp3 finished)
      if (!uiRevealLocked && uiPhase !== "landed") {
        setUiPhase("landed");
      }
      startInFlightRef.current = false;

      // CRITICAL: Mark user has entered Heartverse to show profile bar
      try {
        enterHeartverse();
        if (process.env.NODE_ENV === "development") {
          console.log("✅ User entered Heartverse - profile bar will show immediately");
        }
      } catch {
        setHasEnteredHeartverse(true);
        if (process.env.NODE_ENV === "development") {
          console.log("✅ Fallback: set hasEnteredHeartverse to true");
        }
      }

      // Do NOT enable beam/HUD here - this is now handled in onWarpSfxEnd
      // after button.mp3 plays to ensure proper sequence
      setBeamOnly(false);
      setPowerBusy(false);
      setLandingRevealReady(true);

    }, WARP_DURATION_MS);
    
  }, [audioManager]);

  // Handle opening journal: opens journal view in Soul Sky popover
  const handleOpenJournal = React.useCallback(() => {
    setShouldOpenJournal(true);
  }, []);

  // Handle journal completion: triggers refresh of profile data
  const handleJournalCompleted = React.useCallback(() => {
    // Trigger profile refresh to update HeartCoin balance
    setProfileRefreshTrigger(prev => prev + 1);
  }, []);

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

  // Defensive: On initial page open, ensure no main/holo track audio exists or is playing
  React.useEffect(() => {
    try {
      // Block main player globally until a song is explicitly selected
      if (typeof window !== 'undefined') { window.__BLOCK_MAIN_AUDIO = true; }
      const stopAndClear = (a) => {
        try { a.pause(); } catch {}
        try { a.currentTime = 0; } catch {}
        try { a.removeAttribute('src'); } catch {}
        try { a.load(); } catch {}
      };
      const nodes = document.querySelectorAll('audio[data-audio-player="1"], audio[data-holo-audio="1"]');
      nodes.forEach((a) => stopAndClear(a));
    } catch {}
  }, []); // Run on every mount

  // Temporary watchdog: for the first 5s, forcibly stop any stray track audio
  React.useEffect(() => {
    let active = true;
    const deadline = Date.now() + 5000;
    const tick = () => {
      if (!active) return;
      try {
        const audios = document.querySelectorAll('audio');
        audios.forEach((a) => {
          const el = a;
          const src = (el.currentSrc || el.src || '').toLowerCase();
          const isMainOrUnknown = !el.getAttribute('data-ambient') && !el.getAttribute('data-intro');
          const isTrack = src.includes('/tracks/');
          if (isTrack && isMainOrUnknown) {
            try { el.pause(); } catch {}
            try { el.currentTime = 0; } catch {}
            try { el.removeAttribute('src'); } catch {}
            try { el.load(); } catch {}
          }
        });
      } catch {}
      if (Date.now() < deadline) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { active = false; };
  }, []); // Run on every mount

  // Listen for tour skip event to trigger warp effect
  React.useEffect(() => {
    const handleTourSkipped = () => {
        // Use setIsWarping with function form to get current state
      setIsWarping(currentWarping => {
          if (!currentWarping) {
            setHomeIntroEnabled(true);
          setPendingOverlayReveal(true);
          setUiUnlocked(true);
          // Reset button reveal guard for this new warp
          buttonRevealTriggeredRef.current = false;
          setAllowWarp(true);
          setSky(SPACE_SKY);
          setNextSky(null);
          setLandingRevealReady(true);
          setWarpActive(true);
          
          // Store warp context for post-warp handling
          // Only set to null if not already set by Start button
          if (window.postWarpUser === undefined) {
            window.postWarpUser = null;
            window.postWarpProfileComplete = false;
          }
            return true; // Set to warping
        } else {
            return currentWarping; // Keep current state
        }
      });
    };

    window.addEventListener('tour:skipped', handleTourSkipped);
    return () => {
      window.removeEventListener('tour:skipped', handleTourSkipped);
    };
  }, []);

  // Listen for planet:warp event to trigger warp visual effect for element planets
  React.useEffect(() => {
    const handlePlanetWarp = (e) => {
      const { element, isDailyElement, isCenterPlanet, audioPath } = e.detail || {};
      if (process.env.NODE_ENV === "development") {
        console.log('🌍 planet:warp event received:', { element, isDailyElement, isCenterPlanet, audioPath });
      }

      // Set YouTube sky for element planets (WATER, CENTER, HEART, DARKNESS, LIGHTNING)
      // User can update this URL later
      const elementPlanets = ['water', 'center', 'heart', 'darkness', 'lightning'];
      if (element && elementPlanets.includes(String(element).toLowerCase())) {
        setElementWarpYoutubeUrl('https://youtu.be/xS-a7rWzYYw');
      }

      // Mark user as having selected something to suppress welcome home modal
      // This prevents the welcome home popup from appearing after element planet warps
      setUserSelected(true);
      setHomeMode(false);

      // Set curTrack to a pseudo-track representing the element
      // This makes the dropdown display the element name (e.g., "LIGHTNING") instead of previous selection
      if (element) {
        const elementName = String(element).toUpperCase();
        setCurTrack({
          slug: String(element).toLowerCase(),
          title: elementName,
          icon: String(element).toLowerCase(),
          isElement: true
        });
      }

      // Hide blue display/HUD when warping to element planet (like song selection)
      setShowHUD(false);
      setBeamEnabled(false);

      // Play element audio through AudioProvider so play/pause button works
      // Element tracks are registered in AudioProvider: HEART, WATER, LIGHTNING, DARKNESS, CENTER
      if (element) {
        const elementId = String(element).toLowerCase();
        console.log('🎵 Playing element audio via AudioProvider:', elementId);
        try {
          // Use selectTrack which stops current audio, plays warp SFX, then loads and auto-plays
          audioManager.selectTrack(elementId);
        } catch (err) {
          console.warn('[WARP] Element audio playback failed:', err);
        }
      }

      // Trigger warp visual effect (lightspeed overlay)
      setWarpActive(true);
      buttonRevealTriggeredRef.current = false;

      setTimeout(() => {
        setAllowWarp(true);
        setFlySignal((n) => n + 1);

        // Backup timer to reset warp state
        setTimeout(() => {
          setWarpActive(false);
          setAllowWarp(false);
        }, WARP_DURATION_MS + 500);
      }, 100); // Small delay for visual smoothness
    };

    window.addEventListener('planet:warp', handlePlanetWarp);
    return () => {
      window.removeEventListener('planet:warp', handlePlanetWarp);
    };
  }, [audioManager]);

  // Enable SFX globally only after Start unlocks the UI
  React.useEffect(() => {
    try { sfx.setEnabled(!!uiUnlocked); } catch {}
    try { (window).__CHX_UI_UNLOCKED = !!uiUnlocked; } catch {}
    try { (window).__CHX_SHOW_DIMMING_OVERLAY = !!showDimmingOverlay; } catch {}
  }, [uiUnlocked, showDimmingOverlay]);

  // GLOBAL CLICK LOGGER FOR DEBUGGING (temporary)
  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      if (process.env.NODE_ENV === "development" && false) { // Disabled very verbose log
        console.log("🖱 Global click:", {
        tag: target?.tagName,
        id: target?.id,
        className: target?.className,
        dataNoTrack: target?.getAttribute("data-no-track"),
        ariaLabel: target?.getAttribute("aria-label"),
        title: target?.getAttribute("title"),
        isStartButton: target?.getAttribute("aria-label") === "Start",
        isWheelPlay: target?.classList?.contains("wheel-play") || false,
        });
      }
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

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
        // setAmbientSuspended(false); // DISABLED - no ambient auto-play
        
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.debugWelcomeVO;
        delete window.forceWelcomeVO;
      }
    };
  }, [homeMode, homeIntroEnabled, welcomeHasPlayed, firstStartDone, isLanded, pendingOverlayReveal, ambientSuspended, warpActive]);

  // Helper function to get beam gradient based on active beam color
  const getBeamGradient = useMemo(() => {
    const gradients = {
      blue: `linear-gradient(180deg, 
        rgba(0,255,255, 0.0) 0%, 
        rgba(0,255,255, 0.15) 15%, 
        rgba(0,255,255, 0.35) 40%, 
        rgba(0,255,255, 0.55) 65%, 
        rgba(0,255,255, 0.35) 85%, 
        rgba(0,255,255, 0.0) 100%),
      repeating-linear-gradient(180deg,
        transparent 0px,
        rgba(0,255,255, 0.1) 20px,
        rgba(0,255,255, 0.2) 40px,
        rgba(0,255,255, 0.1) 60px,
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
        transparent 80px)`,
      white: `linear-gradient(180deg, 
        rgba(255,255,255, 0.0) 0%, 
        rgba(255,255,255, 0.15) 15%, 
        rgba(255,255,255, 0.35) 40%, 
        rgba(255,255,255, 0.55) 65%, 
        rgba(255,255,255, 0.35) 85%, 
        rgba(255,255,255, 0.0) 100%),
      repeating-linear-gradient(180deg,
        transparent 0px,
        rgba(255,255,255, 0.1) 20px,
        rgba(255,255,255, 0.2) 40px,
        rgba(255,255,255, 0.1) 60px,
        transparent 80px)`,
      magenta: `linear-gradient(180deg, 
        rgba(220,20,180, 0.0) 0%, 
        rgba(220,20,180, 0.15) 15%, 
        rgba(220,20,180, 0.35) 40%, 
        rgba(220,20,180, 0.55) 65%, 
        rgba(220,20,180, 0.35) 85%, 
        rgba(220,20,180, 0.0) 100%),
      repeating-linear-gradient(180deg,
        transparent 0px,
        rgba(220,20,180, 0.1) 20px,
        rgba(220,20,180, 0.2) 40px,
        rgba(220,20,180, 0.1) 60px,
        transparent 80px)`,
      cyan: `linear-gradient(180deg, 
        rgba(0,255,255, 0.0) 0%, 
        rgba(0,255,255, 0.15) 15%, 
        rgba(0,255,255, 0.35) 40%, 
        rgba(0,255,255, 0.55) 65%, 
        rgba(0,255,255, 0.35) 85%, 
        rgba(0,255,255, 0.0) 100%),
      repeating-linear-gradient(180deg,
        transparent 0px,
        rgba(0,255,255, 0.1) 20px,
        rgba(0,255,255, 0.2) 40px,
        rgba(0,255,255, 0.1) 60px,
        transparent 80px)`
    };
    return gradients[beamColor] || gradients.blue;
  }, [beamColor]);

  // Memoize expensive style calculations  
  const blurWrapperStyle = useMemo(() => ({
    filter: cardModalOpen && !warpActive ? 'blur(2px)' : 'none', // No blur during warp
    transition: 'filter 300ms ease',
    opacity: 1 // Always full opacity, never dim the content
  }), [cardModalOpen, warpActive]);

  const lightBeamStyle = useMemo(() => {
    // Position the light beam at the fixed UI boundary
    // The --light-beam-boundary variable is the source of truth for this position
    return {
      left: '50%',
      bottom: 'var(--light-beam-boundary)',
      height: 'var(--beam-height)',
      width: 'var(--display-width)',
      transform: 'translate3d(-50%,0,0)',
      // Tie beam visibility to overlay UI being shown and Start having been pressed, and hide during warp
      opacity: (cockpitVisible && (beamEnabled || showHUD) && !warpActive) ? (cardModalOpen ? 0.3 : 1) : 0,
      transition: 'opacity 400ms ease-in-out'
    };
  }, [beamEnabled, showHUD, cardModalOpen, cockpitVisible, warpActive]);

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

  // Position the blue display at its original location but extend upward to profile bar
  // Keep original bottom positioning
  const hudBottom = useMemo(() => 'calc(var(--display-touch-top) + 60px)', []);

  // Provide CSS variables globally (avoids any runtime style factory edge cases)

  if (!mounted) {
    // Return a black screen with proper dimensions while loading
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-white max-w-screen overflow-x-hidden" style={{ minWidth: '100vw', minHeight: '100vh' }}>
        {/* Profile Bar - only show when landed */}
        {showProfileBar && <ProfileBarWrapper 
          onCodeClick={() => {}}
          onDigitalBinderClick={() => {}}
          onBadgesClick={() => {}}
          onCloseBlueDisplay={() => { setShowHUD(false); setBeamEnabled(false); }}
          onOpenBlueDisplay={() => {
            // Force open blue display without toggle logic
          if (uiPhase === 'warping' || uiRevealLocked) { return; }
          if (!showHUD && beamColor === 'blue') {
            setBeamEnabled(true);
            setShowHUD(true);
          } else if (beamColor !== 'blue') {
            handleBeamToggle('blue');
          }
        }}
          onOpenJournal={handleOpenJournal}
          onJournalCompleted={handleJournalCompleted}
          onBeamColorChange={handleBeamToggle}
          profileRefreshTrigger={profileRefreshTrigger}
          todaysPrompt={todaysPrompt}
        />}
        
        {/* Dimming overlay - controlled by UI phase state machine */}
        {showDimmingOverlay && (
          <div className="pointer-events-none absolute inset-0 bg-black/60 backdrop-blur-sm z-[40]" />
        )}
        {/* Ensure cockpit frame preloads immediately alongside lightbeam base */}
        <div 
          className="fixed z-20 pointer-events-none cockpit-bg"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          aria-hidden="true" 
        />
        {/* Render the steering wheel video immediately on opening screen */}
        <div
          style={{
            position: 'fixed',
            // Slight upward nudge to align with cockpit wheel area
            bottom: '0vh',
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
          {(() => {
            const isSafariUA = (() => {
              try {
                const ua = navigator.userAgent;
                return /safari/i.test(ua) && !/chrome|crios|android/i.test(ua);
              } catch { return false; }
            })();
            const canPlayHvc = (() => {
              try {
                const v = document.createElement('video');
                const c1 = v.canPlayType('video/mp4; codecs="hvc1"');
                const c2 = v.canPlayType('video/mp4; codecs="hev1"');
                const c3 = v.canPlayType('video/quicktime');
                return !!(c1 || c2 || c3);
              } catch { return false; }
            })();
            const wheelSrc = (isSafariUA && canPlayHvc)
              ? "/cockpit/wheel_transparent.mov"
              : "/cockpit/wheel_less_transparent.webm";
            if (wheelPlain) {
              return (
            <video
              src={wheelSrc}
              autoPlay
              muted
              loop
              playsInline
              aria-label="wheel-video-plain"
              style={{ width: '100%', height: '100%', objectFit: 'cover', background: 'transparent' }}
            />
            );
            }
            return (
            <LumaKeyVideo
              srcMp4={wheelSrc}
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
            );
          })()}
        </div>
      </main>
    );
  }
  const SHOW_CENTER_BEAM = true; // Enable center light beam
  // HUD vertical sizing + offset mapping so inner items shift down as height shrinks
  const hudHeightFactor = 0.01; // tiny height to force top edge down
  const hudBaseFactor = 0.46;   // increased to move the blue display further down
  const hudYOffset = Math.max(0, Math.round(100 * (hudBaseFactor - hudHeightFactor)));
  const handleCodeClick = () => {
    // Change beam color to white when Code button is clicked
    handleBeamToggle('white');
  };

  const handleDigitalBinderClick = () => {
    // TODO: Implement Digital Binder modal/route
  };

  const handleBadgesClick = () => {
    // TODO: Implement Badges modal/route
  };


  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white max-w-screen overflow-x-hidden" style={{ minWidth: '100vw', minHeight: '100vh' }}>
      {/* Profile Bar - only show when landed */}
      {showProfileBar && <ProfileBarWrapper 
        onCodeClick={handleCodeClick}
        onDigitalBinderClick={handleDigitalBinderClick}
        onBadgesClick={handleBadgesClick}
        onCloseBlueDisplay={() => { setShowHUD(false); setBeamEnabled(false); }}
          onOpenBlueDisplay={() => {
            // Force open blue display without toggle logic
          if (uiPhase === 'warping' || uiRevealLocked) { return; }
          if (!showHUD && beamColor === 'blue') {
            setBeamEnabled(true);
            setShowHUD(true);
          } else if (beamColor !== 'blue') {
            handleBeamToggle('blue');
          }
        }}
        onOpenJournal={handleOpenJournal}
        onOpenHeartCoin={() => openHeartCoinModal('use')}
        onJournalCompleted={handleJournalCompleted}
        onBeamColorChange={handleBeamToggle}
        savedAlienName={savedProfileName}
        savedAlienElement={savedProfileElement}
        profileRefreshTrigger={profileRefreshTrigger}
        todaysPrompt={todaysPrompt}
      />}
      
      <div 
        className="absolute inset-0"
        style={{ ...blurWrapperStyle, top: 0 }}
      >
        <PrewarmThree />
        <AmbientSpace 
          ambientSrc={!profile ? "/tracks/space-music.opus" : "/tracks/welcome-back.opus"} 
          introSrc={homeMode && homeIntroEnabled && !welcomeHasPlayed ? (!profile ? "/tracks/welcome-to-the-heartverse.opus" : "/tracks/welcome-back.opus") : undefined} 
          playingMusic={isPlaying} 
          suspend={ambientSuspended} 
          userSelectedSong={userSelected} 
        />
        
        {/* 3D Planet System - COMPLETELY DISABLED */}
        {/* {ENABLE_HEARTVERSE_3D && HeartverseSystemWrapper && <HeartverseSystemWrapper 
          showAll={homeMode}
          onSongClick={(songId) => {
            try {
              const track = tracks.find(t => t.slug === songId);
              if (track) {
                handleTrackSelection(track);
              }
            } catch (error) {
              console.error("Failed to handle planet song click:", error);
            }
          }}
        />} */}
        
      <SkyboxVideo
        brightness={0.95}
        srcWebm={sky.webm}
        srcMp4={sky.mp4}
        videoKey={sky.key}
        flySignal={flySignal}
        allowWarp={allowWarp}
        // Keep the lightspeed overlay visible until overlay UI appears
        holdLightspeed={true}
        readyToReveal={isLanded}
        minDurationMs={3000}
        offsetY="-1vh"
        // Use the current track's YouTube sky as soon as a selection is in progress
        // or playback has started; keep looping even if audio pauses.
        youtubeUrl={(() => {
          // Prioritize element warp YouTube URL when warping to element planets
          if (elementWarpYoutubeUrl) return elementWarpYoutubeUrl;

          const slug = curTrack?.slug;
          const mapped = slug ? youtubeSkyFor(slug) : undefined;
          // On the homepage:
          // - During intro (before START), show the lightspeed sky
          // - After landing, switch to the calm space sky
          if (homeMode) return isLanded ? HOME_YOUTUBE_SKY : 'https://youtu.be/KFssNa5WvKc';
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
          // Simple cleanup - core UI transitions handled by phase state machine
          console.log("🎵 Warp SFX ended");
          // Notify unified audio system that warp completed so pending tracks auto-play
          try { audioManager?.markWarpCompleted(); } catch {}
          
          // FALLBACK: Ensure supporting systems are ready if Start button warp
          // NOTE: Beam/HUD enabling is handled by playButtonAndRevealUI below
          // to ensure proper sequence: warp.mp3 -> button.mp3 -> beam -> HUD
          if (startButtonWarpRef.current && uiPhase !== "landed") {
            console.log("🛬 FALLBACK: Start button warp SFX ended, preparing systems");
            startInFlightRef.current = false;

            // Mark warp as completed for unified audio system
            try { audioManager?.markWarpCompleted(); } catch {}
            // Auto-play ambient space music via unified audio when landing on home
            try {
              if (!pendingTrackPlay && !userSelected) {
                audioManager?.playTrack('space-music');
              }
            } catch {}

            // Ensure user entered Heartverse state
            try {
              enterHeartverse();
            } catch {
              setHasEnteredHeartverse(true);
            }

            // Set supporting state but do NOT enable beam/HUD here
            // The playButtonAndRevealUI function will handle beam/HUD after button.mp3 plays
            setBeamOnly(false);
            setPowerBusy(false);
            setLandingRevealReady(true);

            // Enable ambient space music after START button warp completes
            setAmbientSuspended(false);
            // Auto-trigger ambient space music after start button warp
            try {
              window.dispatchEvent(new CustomEvent('ambient:play'));
            } catch {}

            // Auto-trigger play button to start space music and sync button state
            setTimeout(() => {
              try {
                const ambient = document.querySelector('audio[data-ambient="1"]');
                if (ambient && ambient.paused) {
                  ambient.play().catch(() => {});
                  // Trigger ambient state update for play button sync
                  window.dispatchEvent(new CustomEvent('ambient:userPlay'));
                }
              } catch {}
            }, 500); // Small delay to ensure audio is ready
          }
          
          // Keep main player audio blocked on home warp (until a song is selected)
          try { 
            if (!pendingTrackPlay && !userSelected && typeof window !== 'undefined') { 
              window.__BLOCK_MAIN_AUDIO = true; 
            } 
          } catch (e) {}
          
          // Mark that warp effect is fully complete (including sound effects)
          setWarpFullyComplete(true);
          // Ensure unified audio system can auto-play now if a pending track exists
          try { audioManager?.markWarpCompleted(); } catch {}
          // If landing on home (no song pending), start ambient space music via unified audio
          try {
            if (!pendingTrackPlay && !userSelected) {
              audioManager?.playTrack('space-music');
            }
          } catch {}
          
          // Disable warp to prevent additional warp sounds
          setAllowWarp(false);

          // SEQUENCE: warp.mp3 -> button.mp3 -> beam/HUD -> trigger play
          // Simple and clean audio sequence
          const playButtonAndRevealUI = () => {
            // Guard: prevent multiple button.mp3 plays per warp
            if (buttonRevealTriggeredRef.current) {
              console.log("⏭️ Skipping button.mp3 - already triggered for this warp");
              return;
            }
            buttonRevealTriggeredRef.current = true;

            // Helper to reveal UI and optionally trigger play
            const revealUIAndPlay = () => {
              setUiRevealLocked(false);
              setBeamEnabled(true);
              setBeamColor('blue');
              setWarpActive(false);

              // Open HUD after beam starts
              setTimeout(() => {
                setShowHUD(true);
                setUiPhase("landed");
                console.log("✅ UI revealed: beam -> HUD");

                // If a track is pending, trigger play after HUD opens
                if (pendingTrackPlay) {
                  const trackIndex = pendingTrackIndexRef.current;
                  if (trackIndex !== null && trackIndex >= 0) {
                    setChannelIdxWithLog(trackIndex);
                    pendingTrackIndexRef.current = null;
                  }
                  // Trigger play/pause button
                  setTimeout(() => {
                    console.log("▶️ Triggering play");
                    setPlaySignal((n) => n + 1);
                  }, 100);
                }
              }, 150);
            };

            console.log("🔊 Playing button.mp3");
            try {
              // Play button sound and reveal UI simultaneously (don't wait for sound to finish)
              sfx.play('button', 0.9);
              revealUIAndPlay();
            } catch {
              console.warn("⚠️ SFX system failed, revealing UI directly");
              revealUIAndPlay();
            }
          };

          // Trigger the button sound + UI reveal sequence
          playButtonAndRevealUI();

          // Welcome modal will be shown after UI reveal below
          
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
            // Extra safety: ensure main track audio stays stopped on home warp end
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
          }
          // Song start is now triggered AFTER button.mp3 finishes and UI reveals
          // If we're landing on home via Start, set up home mode state
          // NOTE: Button.mp3 and beam/HUD reveal are handled by playButtonAndRevealUI() above
          // to ensure proper sequence: warp.mp3 -> button.mp3 -> beam -> HUD
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

            // Reset ambient to beginning (will be triggered after UI reveals)
            try {
              const ambientEl = document.querySelector('audio[data-ambient="1"]');
              if (ambientEl) {
                ambientEl.currentTime = 0;
              }
            } catch {}

            // Set supporting state - beam/HUD are handled by playButtonAndRevealUI()
            // DO NOT enable beam/HUD here - let the button.mp3 sequence handle it
            try {
              setUiUnlocked(true);
              setShowOverlayUI(true);
              setBeamOnly(false);
              setPowerBusy(false);
              setLandingRevealReady(true);
              // NOTE: Do NOT set setBeamEnabled or setShowHUD here
              // They will be set by playButtonAndRevealUI after button.mp3 finishes

              // Enable ambient space music after homepage reveal
              setAmbientSuspended(false);
              // Auto-trigger ambient space music after homepage warp
              try {
                window.dispatchEvent(new CustomEvent('ambient:play'));
              } catch {}

              // Auto-trigger play button to start space music and sync button state
              setTimeout(() => {
                try {
                  const ambient = document.querySelector('audio[data-ambient="1"]');
                  if (ambient && ambient.paused) {
                    ambient.play().catch(() => {});
                    // Trigger ambient state update for play button sync
                    window.dispatchEvent(new CustomEvent('ambient:userPlay'));
                  }
                } catch {}
              }, 500); // Small delay to ensure audio is ready
              // Welcome modal is now shown immediately on START click (not after warp)
            } catch {}
            // Ensure homepage shows all planets after warp
            
            try { 
              playerStore.getState().setPlanetDisplayMode('all');
              playerStore.getState().setPlanetsVisible(true); 
            } catch {}
            // Clear one-time flag to avoid repeats on later Starts
            try { welcomeOnStartRef.current = false; } catch {}
            
            // Check if we should open signal pop-out instead of blue display (stream mode)
            if (typeof window !== 'undefined' && window.__CHX_PENDING_SIGNAL_OPEN) {
              // Open signal pop-out (pink beam/display) after a short delay
              setTimeout(() => {
                handleBeamToggle('pink');
              }, 500);
              // Clear the flag
              delete window.__CHX_PENDING_SIGNAL_OPEN;
            }
            
            setPendingOverlayReveal(false);
          }
          
          // Note: Cockpit reveal is now handled by the phase state machine above
        }}
        onFlyStart={() => {
          setWarpActive(true);
          // Song selection: hide ALL planets immediately before warp
          if (pendingTrackPlay || userSelected) {
            try { playerStore.getState().setPlanetDisplayMode('hidden'); } catch {}
            try { playerStore.getState().setPlanetsVisible(false); } catch {}
            try { setHomeMode(false); } catch {}
          }
          // Unified audio system will handle its own pause/resume logic for song changes
          // Don't interfere with audio here - let the unified system manage it
        }}
        onFlyEnd={() => {
          // Clear Start in-flight lock once warp fully ends
          try { startInFlightRef.current = false; } catch {}
          setWarpActive(false);
          setAllowWarp(false);
          // Backup: also notify unified audio that warp ended (in case SFX callback was missed)
          try { audioManager?.markWarpCompleted(); } catch {}
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
          // If a track play is pending, prepare for UI reveal after button.mp3 plays
          // NOTE: Beam/HUD are now enabled by playButtonAndRevealUI() in onWarpSfxEnd
          // to ensure proper sequence: warp.mp3 -> button.mp3 -> beam -> HUD -> song
          if (pendingTrackPlay) {
            try {
              // Cancel any fallback that might race with our sequencing
              if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); trackPlayTimerRef.current = undefined; }
            } catch {}
            // Set supporting state but do NOT enable beam/HUD here
            // They will be enabled by playButtonAndRevealUI() after button.mp3 finishes
            setBeamOnly(false);
            setShowOverlayUI(true);
            // Safety: if base video readiness callback is delayed, start music after a grace period
            try {
              if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); }
              trackPlayTimerRef.current = window.setTimeout(() => {
                const proceed = () => {
                  if (pendingTrackPlay) {
                    console.log('🎵 PLAY SIGNAL TRIGGERED - proceed()');
                    try {
                      if (!(typeof window !== 'undefined' && (window).__AUDIO_MANAGER_ACTIVE)) {
                        setPlaySignal((n) => n + 1);
                      }
                    } catch {
                      setPlaySignal((n) => n + 1);
                    }
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
          
          // Mark that the user has entered the Heartverse after warp completes
          try { enterHeartverse(); } catch { setHasEnteredHeartverse(true); }
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
          // Post-warp music auto-play disabled - user must manually start playback
          if (false && pendingTrackPlay && userSelected && uiUnlocked && !warpActive) {
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
                try {
                  if (!(typeof window !== 'undefined' && (window).__AUDIO_MANAGER_ACTIVE)) {
                    setPlaySignal((n) => n + 1);
                  }
                } catch {
                  setPlaySignal((n) => n + 1);
                }
                setPendingTrackPlay(false);
              }
            }, 3000);
            const startSong = () => { 
              
              clearTimeout(failsafeTimer); // Clear the failsafe timer
              // Small delay to ensure unified audio system has set up the audio element properly
              setTimeout(() => {
                console.log('🎵 PLAY SIGNAL TRIGGERED - initialSlug autoplay');
                try {
                  if (!(typeof window !== 'undefined' && (window).__AUDIO_MANAGER_ACTIVE)) {
                    setPlaySignal((n) => n + 1);
                  }
                } catch {
                  setPlaySignal((n) => n + 1);
                }
                setPendingTrackPlay(false); 
                buttonSfxWaitRef.current = null;
                
              }, 100); // 100ms delay to allow unified audio system to set up
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
          
          // Clear pending state after warp since auto-play is disabled
          if (pendingTrackPlay) {
            setPendingTrackPlay(false);
          }
        }}
      />


      <div 
        className="fixed z-20 pointer-events-none cockpit-bg"
        style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        aria-hidden="true" 
      />
      
      <div 
        className="fixed z-[100] pointer-events-none lightbeam-base-bg"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          // Always keep the light beam base PNG visible, including on first page
          opacity: 1,
          transition: 'opacity 400ms ease-in-out',
          // Dynamically anchor PNG under the blue button when available; otherwise fallback to CSS
          backgroundPosition: beamBaseBgPos || undefined
        }}
        aria-hidden="true" 
      />
      
      {/* SteeringWheelOverlay inside blur wrapper so wheel gets dimmed */}
      <SteeringWheelOverlay
        POS={POS}
        playing={isPlaying}
        showUI={cockpitVisible}
        uiUnlocked={isLanded}
        joinAlienOpen={joinAlienOpen}
        // Only show power as active when the blue display (HUD) is open
        blueActive={beamColor === 'blue' && !!(showHUD)}
        onJoinToggle={setJoinAlienOpen}
        onBeamColorChange={handleBeamToggle}
        closeAllSignal={uiCloseSignal}
        suspendUI={isWarping}
        hideStartButton={false}
        isElementPlanet={!!curTrack?.isElement}
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
        onLaunch={handleStartClick}
      />
      </div> {/* Close blur wrapper */}


      {/* Blue display rendered as overlay sibling via portal */}
      {typeof window !== 'undefined' ? createPortal(
        (
          <div 
            className="slot-container"
            style={{
              position: 'fixed',
              top: '62px', // Slight overlap to sit flush against the profile bar bottom line
              bottom: 'calc(var(--display-touch-top) + 60px)', // Keep original bottom position
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(var(--display-width) + 32px)',
              paddingTop: '0px',
              zIndex: 93,
              ['--hud-y']: `${hudYOffset}px`,
              pointerEvents: cockpitVisible ? 'auto' : 'none'
            }}
          >
            <div className="relative h-full w-full p-0" style={{ overflow: 'visible' }} suppressHydrationWarning>
              {/* Safari fix: Use CSS transitions instead of Framer Motion for portal content */}
              <div
                className="absolute top-0 left-0 right-0 bottom-0 p-0"
                suppressHydrationWarning
                key={safariRefreshKey} // Force re-render on Safari when needed
                style={(() => {
                  const normalCondition = cockpitVisible && showHUD;
                  // Blue display shows when cockpit is fully visible but hidden during warp
                  const shouldShow = normalCondition && !isWarping;
                  // Debug visibility conditions (optional)
                  debugLog({
                    homeMode,
                    warpActive,
                    isWarping,
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
                    pointerEvents: (normalCondition && !isWarping) ? 'auto' : 'none', 
                    visibility: shouldShow ? 'visible' : 'hidden',
                    transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    willChange: 'opacity',
                    transform: 'translateZ(0)', // Force hardware acceleration on Safari
                    // Height is handled by the container above
                    height: '100%'
                  };
                })()}
              >
                {(() => {
                  const currentIdValue = (homeMode && !userSelected && !pendingTrackPlay) ? undefined : curTrack?.slug;
                  const showAllValue = !currentIdValue;
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
                {HUDPanel && <HUDPanel
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
                  onNameSaved={setSavedProfileName}
                  onElementSaved={setSavedProfileElement}
                  onCloseBlueDisplay={() => { setShowHUD(false); setBeamEnabled(false); }}
                  onOpenBlueDisplay={() => handleBeamToggle('blue')}
                  showHUD={showHUD}
                  beamColor={beamColor}
                  shouldOpenJournal={shouldOpenJournal}
                  onJournalOpened={() => setShouldOpenJournal(false)}
                  onJournalCompleted={handleJournalCompleted}
                  onBeamColorChange={handleBeamToggle}
                  todaysPrompt={todaysPrompt}
                />}
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
                    if (uiPhase === 'warping' || uiRevealLocked) return; // block early reveals during warp/button
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
          </div>
        ),
        document.body
      ) : null}

      {/* Light Beam - keep mounted; hide with display:none until UI unlock to avoid flicker and hook churn */}
      {SHOW_CENTER_BEAM && mounted ? (
        <div 
          className="fixed pointer-events-none z-[95] light-beam"
          style={{ ...lightBeamStyle, display: cockpitVisible ? 'block' : 'none' }}
        >
          {/* Single main beam */}
          <div 
            style={{
              position: 'absolute',
              left: '-5%',
              right: '-5%',
              bottom: '0px', 
              top: '0%',
              clipPath: 'polygon(48% 100%, 52% 100%, 0% 0, 100% 0)',
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


      {/* Blue HUD Panel with integrated planetarium */}
      {mounted && showHUD && (
        <HUDPanel 
          showHUD={showHUD}
          beamEnabled={beamEnabled}
          joinAlienOpen={joinAlienOpen}
          onNameSaved={setSavedProfileName}
          onElementSaved={setSavedProfileElement}
          onCloseBlueDisplay={() => { setShowHUD(false); setBeamEnabled(false); }}
          onOpenBlueDisplay={() => handleBeamToggle('blue')}
          beamColor={beamColor}
          shouldOpenJournal={shouldOpenJournal}
          onJournalOpened={() => setShouldOpenJournal(false)}
          onJournalCompleted={handleJournalCompleted}
          onBeamColorChange={handleBeamToggle}
          todaysPrompt={todaysPrompt}
          profileRefreshTrigger={profileRefreshTrigger}
        />
      )}


      {/* Simple Dimming Overlay - ONLY controlled by cockpitVisible */}
      {mounted && !cockpitVisible ? (
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


      {/* Stars Modal triggered by journal button */}
      {showStarsModal && (
        <SoulStareModal 
          isOpen={showStarsModal}
          onClose={() => setShowStarsModal(false)}
          onComplete={handleJournalCompleted}
          onOpenBlueDisplay={() => {
            // Force open blue display without toggle logic
            if (!showHUD && beamColor === 'blue') {
              setBeamEnabled(true);
              setShowHUD(true);
            } else if (beamColor !== 'blue') {
              handleBeamToggle('blue');
            }
          }}
        />
      )}
      
      {/* Welcome Home Modal triggered on first start */}
      <WelcomeHomeModal 
        open={showWelcomeHomeModal} 
        onClose={handleWelcomeHomeClose} 
      />

      {/* Heart Coin Modal */}
      <HeartCoinModal 
        open={showHeartCoinModal} 
        onClose={() => setShowHeartCoinModal(false)}
        onOpenJournal={handleOpenJournal}
        onOpenWelcomeHome={() => setShowWelcomeHomeModal(true)}
        initialTab={heartCoinModalTab}
      />

      {/* Authentication Error Notification */}
      <AnimatePresence>
        {authError && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md mx-auto"
          >
            <div className="bg-red-900/90 border border-red-500/50 rounded-lg p-4 text-center backdrop-blur-sm">
              <div className="text-red-200 text-sm font-medium mb-3">
                {authError}
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded text-red-200 text-xs transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hamburger Menu for CODE access - Only show after warp effect is fully complete */}
      <GlowingHamburgerMenuWrapper hidden={!showMenus} onBeamColorChange={handleBeamToggle} />

    </main>
  );
}
