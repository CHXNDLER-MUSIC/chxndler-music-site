"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { DEBUG_MEDIA, dlog, dwarn, dumpAudio } from "@/lib/debug";
// import SocialIcons from "@/components/SocialIcons";
// import StreamingButtons from "@/components/StreamingButtons";
// import NeonCockpitRim from "@/components/NeonCockpitRim";
import CockpitWindowRim from "@/components/CockpitWindowRim";
import { LINKS, POS } from "@/config/cockpit";
import { tracks } from "@/config/tracks";
import { buildPlanetSongs } from "@/lib/planets";
import { usePlayerStore } from "@/store/usePlayerStore";
// import JoinAliensBox from "@/components/JoinAliensBox";
import PrewarmThree from "@/components/PrewarmThree";
import { track } from "@/lib/analytics";
// import CockpitAmbientLights from "@/components/CockpitAmbientLights";
import PreloadMedia from "@/components/PreloadMedia";

export default function DashboardApp() {
  const [channelIdx, setChannelIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sky, setSky] = useState(introSky);
  const [links, setLinks] = useState({ spotify: LINKS.spotify, apple: LINKS.apple });
  const [userSelected, setUserSelected] = useState(false);
  const [curTrack, setCurTrack] = useState(tracks.find(t => t.title === "WE'RE JUST FRIENDS") || tracks[0]);
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
  const [audioReady, setAudioReady] = useState(false);
  const [skyReady, setSkyReady] = useState(false);
  const trackPlayTimerRef = React.useRef(undefined);
  const [ambientSuspended, setAmbientSuspended] = useState(false);
  const [firstStartDone, setFirstStartDone] = useState(false);
  const [welcomeHasPlayed, setWelcomeHasPlayed] = useState(false); // tracks if welcome has ever been played
  const welcomeOnStartRef = React.useRef(false); // signals that welcome VO should play now
  const [cardModalOpen, setCardModalOpen] = useState(false); // track card modal state for beam dimming
  const [joinAlienOpen, setJoinAlienOpen] = useState(false); // track join alien button state for pink beam
  const [beamColor, setBeamColor] = useState('blue'); // track active beam color
  const [showDimmingOverlay, setShowDimmingOverlay] = useState(true); // show dimming overlay on initial load
  const [beamTransitioning, setBeamTransitioning] = useState(false); // prevent rapid beam changes
  const SPACE_SKY = { webm: "/skies/space.webm", mp4: "/skies/space.mp4", key: "space" };
  

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
      
      // FADE OUT: Hide HUD, comms, power, and join alien elements before warp
      setShowHUD(false);
      setShowOverlayUI(false);
      setBeamEnabled(false);
      
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
      if (DEBUG_MEDIA) dlog('onSongChange: set channelIdx to', idx, 'for track', tracks[idx]?.title);
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
      setAudioReady(false);
      setSkyReady(false);
      // Trigger lightspeed overlay + warp SFX and switch sky.
      const newSky = skyFor(tracks[idx].slug);
      if (DEBUG_MEDIA) dlog('onSongChange: setting nextSky to', newSky);
      setAllowWarp(true);
      setNextSky(newSky);
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
    if (!curTrack || homeMode) return;
    const slug = (curTrack.slug || "").toLowerCase();
    if (slug) {
      try { usePlayerStore.getState().setMain(slug); } catch {}
    }
  }, [curTrack?.slug, homeMode]);

  // Only update sky when track changes; do not auto-warp
  React.useEffect(() => {
    if (!mounted) return;
    if (curTrack) setNextSky(skyFor(curTrack.slug));
  }, [mounted, curTrack?.slug]);

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

  // Handle beam color control with strict mutual exclusion between displays
  const handleBeamToggle = React.useCallback((color) => {
    if (beamTransitioning) return; // Prevent rapid changes during transitions
    
    // Always close ALL displays first, then open the target display
    const closeAllDisplays = () => {
      setShowHUD(false);
      setJoinAlienOpen(false);
      setBeamEnabled(false);
    };
    
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

  // Spacebar and Pause key toggle for music play/pause
  React.useEffect(() => {
    const handleKeyDown = (e) => {
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
  }, []);

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
    // Compute height in pixels on client to avoid over-constrained top/bottom issues
    const heightPx = (() => {
      if (typeof window === 'undefined') return '84px'; // Increased default height
      const vh = window.innerHeight || 800;
      const hudBottomFromTop = 0.03 * vh + Math.min(0.9 * vh, 600) + 10; // 3vh + min(90%, 600px) + 10px
      const bottom = 0.35 * vh; // 35vh
      const h = Math.max(80, Math.round(vh - hudBottomFromTop - bottom + 60)); // Reduced height for shorter beam
      return `${h}px`;
    })();
    return {
      left: '50%',
      bottom: '38vh', // Shifted down further from steering wheel area
      height: heightPx,
      width: '400px', // Wider beam for better visual impact
      transform: 'translate3d(-50%,0,0)',
      opacity: (beamEnabled || showHUD) ? (cardModalOpen ? 0.3 : 1) : 0,
      transition: 'opacity 400ms ease-in-out'
    };
  }, [beamEnabled, showHUD, cardModalOpen]);

  if (!mounted) return null;
  const SHOW_CENTER_BEAM = true; // Enable center light beam
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white max-w-screen overflow-x-hidden">
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
        holdLightspeed={false}
        readyToReveal={true}
        minDurationMs={3000}
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
          if (DEBUG_MEDIA) dlog('onFlyEnd: called with nextSky=', nextSky, 'pendingTrackPlay=', pendingTrackPlay);
          setWarpActive(false);
          setAllowWarp(false);
          if (nextSky) { 
            if (DEBUG_MEDIA) dlog('onFlyEnd: switching from sky', sky.key, 'to', nextSky.key); 
            setSky(nextSky); setNextSky(null);
            // Reset skyReady since we're switching to a new sky
            setSkyReady(false);
          } else {
            if (DEBUG_MEDIA) dlog('onFlyEnd: no nextSky to switch to, staying on', sky.key);
          }
          // If this warp was due to Start (not track selection), prepare to land on home
          if (!pendingTrackPlay) setPendingHomePower(true);
          else {
            // Warp overlay just finished for a song change: fade UI back in with join-alien.mp3
            try { sfx.play('join', 0.8); } catch {}
            
            // Clear pending track play state
            setPendingTrackPlay(false);
            
            // Fade in HUD and overlay UI together with audio
            setShowHUD(true);
            setBeamEnabled(true);
            setBeamOnly(false);
            setShowOverlayUI(true);
            
            // Start playback immediately - the track index should already be set from onSongChange
            if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); trackPlayTimerRef.current = undefined; }
            setTimeout(() => {
              if (DEBUG_MEDIA) dlog('onFlyEnd: triggering playSignal after warp, channelIdx=', channelIdx);
              setPlaySignal((n) => n + 1);
            }, 100); // Reduced delay to ensure faster playback start
          }
        }}
        onBasePlaying={() => {
          if (DEBUG_MEDIA) dlog('Sky base video playing, pendingTrackPlay:', pendingTrackPlay, 'pendingHomePower:', pendingHomePower);
          setSkyReady(true);
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
            // Begin HUD power sequence with optimized timing for faster response
            // Minimal delay for immediate UI feedback after warp completes
            setTimeout(() => {
              try { 
                // Play button SFX and immediately start UI fade-in for faster response
                try { sfx.play('button', 0.9); } catch {}
                
                // Fade in all elements immediately with SFX for snappy response
                setShowOverlayUI(true);
                setBeamEnabled(true);
                setShowHUD(true);
                setBeamOnly(false);
                setPowerBusy(false);
                
                // Start space-music.mp3 and welcome audio shortly after UI elements start fading in
                setTimeout(() => {
                  setAmbientSuspended(false); // This will start space-music.mp3 and welcome-to-the-heartverse.mp3
                }, 100); // Reduced delay for faster audio start
                
              } catch {} 
            }, 50); // Reduced from 200ms to 50ms for much faster response
          }
          if (pendingTrackPlay) {
            // Clear any pending fallback timers; onFlyEnd will trigger play immediately.
            if (trackPlayTimerRef.current !== undefined) { clearTimeout(trackPlayTimerRef.current); trackPlayTimerRef.current = undefined; }
          }
        }}
      />

      <div 
        className="fixed inset-0 z-20 pointer-events-none cockpit-bg"
        aria-hidden="true" 
      />
      {/* Neon rim disabled: only show window trim lights */}
      {/* <NeonCockpitRim /> */}
      {/* Music-reactive trim around cockpit windows */}
      {/* <CockpitWindowRim currentTrack={curTrack} isPlaying={isPlaying} mounted={mounted} /> */}

      {/* Social + Streaming buttons removed per request */}
      <SteeringWheelOverlay
        POS={POS}
        playing={isPlaying}
        showUI={showOverlayUI}
        onJoinToggle={setJoinAlienOpen}
        onBeamColorChange={handleBeamToggle}
        onPowerToggle={() => { 
          // Manual power toggle should not start new welcome audio, but don't interrupt if it's already playing
          if (!welcomeOnStartRef.current) {
            // Only disable welcome intro if it's not currently playing
            setHomeIntroEnabled(false);
          }
          // Hide join alien display if it's showing (mutual exclusion)
          if (joinAlienOpen) {
            setJoinAlienOpen(false);
          }
          triggerHudPower(undefined); 
        }}
        onLaunch={() => {
          // Hide dimming overlay when start is clicked
          setShowDimmingOverlay(false);
          
          // ALWAYS trigger warp sequence when start button is pressed
          // Reset any track selection state to ensure we go to homepage
          setUserSelected(false);
          setHomeMode(false); // Will be set to true after warp completes
          
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
          setNextSky(SPACE_SKY); // Always go to space sky for homepage
          setFlySignal((n) => n + 1);
          
          // Reset to homepage defaults
          setLinks({ spotify: LINKS.spotify, apple: LINKS.apple });
        }}
      />
      {/* Removed Join the Aliens dashboard panel per request */}
      </div> {/* Close blur wrapper */}

      {/* Fixed positioning for blue display - positioned directly above light beam */}
      <div 
        className="slot-container fixed z-30"
        style={{
          bottom: `calc(100vh - (3vh + min(90%, 600px)))`, // Position bottom of display at top of light beam
          left: '50%', // Centered on screen
          transform: 'translateX(-50%)', 
          width: 'min(90%, 600px)', // Responsive width with 600px max
          height: 'min(90%, 600px)', // Dynamic height with 600px max
        }}
      >
        <div className="relative h-full w-full p-0" style={{ overflow: 'visible' }} suppressHydrationWarning>
          <AnimatePresence mode="wait">
            {showHUD && (
              <motion.div 
                key="hud-panel"
                className="absolute inset-0 p-0" 
                suppressHydrationWarning
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  type: 'spring',
                  damping: 25,
                  stiffness: 200,
                  duration: 0.3
                }}
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
            )}
          </AnimatePresence>
            {/* Click-to-activate overlay on opening screen: turn HUD on when area is tapped */}
            {!showHUD ? (
              <button
                type="button"
                className="absolute inset-0 pointer-events-auto"
                aria-label="Activate HUD"
                title="Activate HUD"
                style={{ background:'transparent', zIndex: 30, cursor:'pointer' }}
                onClick={() => { setHomeMode(true); try { usePlayerStore.setState({ mainId: null }); } catch {} setHomeIntroEnabled(false); setUserSelected(false); setLinks({ spotify: LINKS.spotify, apple: LINKS.apple }); triggerHudPower(true); }}
              />
            ) : null}
        </div>
        <div className="hidden">
        <MediaPlayer
          onSkyChange={(webm, mp4, key) => setNextSky({ webm, mp4, key })}
          onPlayingChange={(p) => { setIsPlaying(p); if (p) setAmbientSuspended(false); }}
          onAudioReady={() => setAudioReady(true)}
          onTrackChange={(t) => { 
            if (DEBUG_MEDIA) dlog('MediaPlayer onTrackChange:', t?.title, 'slug:', t?.slug); 
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
          
          {/* Add CSS transitions for smooth color changes */}
          <style jsx>{`
            .light-beam {
              transition: opacity 300ms ease-out;
              will-change: opacity;
            }
            .light-beam * {
              transition: filter 300ms ease-out;
            }
            @keyframes beamFlow {
              0% { background-position: 0% 0%, 0% 0px; }
              100% { background-position: 0% 0%, 0% -160px; }
            }
          `}</style>
        </div>
      ) : null}


      {mounted && showHUD && process.env.NEXT_PUBLIC_HOLOHUD === '1' ? (
        <HoloHUD
          track={curTrack}
          playing={effectivelyPlaying}
          onToggle={() => setToggleSignal((n) => n + 1)}
        />
      ) : null}

      {/* Ambient wash disabled: only window trim lights */}
      {false && (
        <CockpitAmbientLights 
          currentTrack={curTrack}
          isPlaying={isPlaying}
          mounted={mounted}
        />
      )}

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

          // Calculate exact button center position (matching SteeringWheelOverlay positioning)
          const buttonCenterX = `calc(${pp.leftVw}vw - ${(pp.sizePx * 0.95)/2}px + 10px + ${(pp.sizePx * 0.95)/2}px)`;
          // SteeringWheelOverlay positions the button using bottom: calc(${100 - pp.topVh}vh - ${(pp.sizePx * 0.95)/2}px - 4vh)
          // Convert to top-based center: 100vh - bottom_offset - half_button_height + adjustment
          const buttonCenterY = `calc(100vh - (${100 - pp.topVh}vh - ${(pp.sizePx * 0.95)/2}px - 4vh) - ${(pp.sizePx * 0.95)/2}px + 3vh)`;
          
          return (
            <div className="fixed inset-0 z-[100] pointer-events-none">
              {/* Base dimming layer with clean spotlight cutout */}
              <div 
                className="absolute inset-0"
                style={{
                  background: `
                    radial-gradient(
                      circle at ${buttonCenterX} ${buttonCenterY},
                      transparent ${pp.sizePx * 0.35}px,
                      rgba(0, 0, 0, 0.85) ${pp.sizePx * 0.55}px,
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
