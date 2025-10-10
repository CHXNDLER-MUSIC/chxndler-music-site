/* @refresh skip */
"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
// 2D fallback hologram
// 2D HUD removed per request; 3D only
// 3D planet system (requires three/r3f/drei installed)
// IMPORTANT: Do NOT import at module scope — older @react-three/fiber versions
// are incompatible with React 19 and can crash on evaluation. We lazy-load it
// only after probing availability, and fall back gracefully.
import { playerStore } from "@/store/usePlayerStore";
import { track as trackAnalytics } from "@/lib/analytics";

// We import the 3D system directly and only render on client via this client component

class ErrorBoundary extends React.Component { 
  constructor(props){ super(props); this.state = { hasError:false }; }
  static getDerivedStateFromError(){ return { hasError:true }; }
  componentDidCatch(err, info){ try { this.props.onError && this.props.onError(err); } catch {} }
  render(){ return this.state.hasError ? this.props.fallback : this.props.children; }
}
// Song list removed in favor of dropdown-only selector
import CoverCard from "@/components/CoverCard";
import CoverHologram from "@/components/CoverHologram";
import { buildPlanetSongs } from "@/lib/planets";
import SongDropdown from "@/components/SongDropdown";
import DevErrorLogger from "@/components/DevErrorLogger";
// Lazy-load 3D systems on client only to avoid early evaluation issues
// Prefer R3F-based system when compatible; otherwise fall back to raw Three.js
const PlanetSystem = dynamic(() => import("@/components/holo/PlanetSystem"), { ssr: false });
const PlanetSystemRaw = dynamic(() => import("@/components/holo/PlanetSystemRaw"), { ssr: false });
import { sfx } from "@/lib/sfx";
import { DEBUG_MEDIA, dlog, dwarn } from "@/lib/debug";
import { ElementIcon as OptimizedElementIcon } from "@/lib/elementIcons";

// Use system font stack to avoid network font fetches during build

// Constants to prevent recreating URLs on every render
const DEFAULT_COVER = '/cover/chxndler.png';
const DEFAULT_CARD = '/card/chxndler.png';
const FALLBACK_COVER = '/cover/chxndler.png';

function ElementIcon({ name, size = 18, glow = true }) {
  if (!name) return null;
  const n = String(name).toLowerCase();
  
  // Map names to icon keys
  let iconKey = null;
  if (n.includes("chxndler")) iconKey = "chxndler";
  else if (n.includes("heart")) iconKey = "heart";
  else if (n.includes("lightning") || n.includes("electric")) iconKey = "lightning";
  else if (n.includes("dark")) iconKey = "darkness";
  else if (n.includes("water") || n.includes("air")) iconKey = "water";
  else if (n.includes("earth") || n.includes("fire")) iconKey = "heart"; // fallbacks
  else iconKey = "heart"; // default fallback

  // Element colors (match system hues)
  const colorFor = (key) => {
    if (!key) return "#38B6FF";
    const k = String(key).toLowerCase();
    if (k.includes("chxndler")) return "#19E3FF"; // brand cyan
    if (k.includes("water")) return "#38B6FF";      // cyan
    if (k.includes("heart")) return "#FC54AF";      // bright pink
    if (k.includes("lightning") || k.includes("electric")) return "#FFC700"; // deeper yellow
    if (k.includes("earth")) return "#F2EF1D";     // reuse neon yellow
    if (k.includes("air")) return "#8BF9FF";       // light cyan
    if (k.includes("dark")) return "#000000";      // deep black
    return "#38B6FF";
  };
  const clr = colorFor(n);
  // Outer halo uses same color except for darkness which would be invisible — use cyan halo to sell hologram
  const outer = (n.includes("dark")) ? "#19E3FF" : clr;
  const glowFilter = glow ? `saturate(1.2) brightness(1.08) drop-shadow(0 0 6px ${outer}) drop-shadow(0 0 16px ${outer}) drop-shadow(0 0 34px ${outer})` : 'none';
  
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent:'center', pointerEvents:'none' }}>
      <OptimizedElementIcon 
        name={iconKey} 
        alt="Element" 
        width={size} 
        height={size}
        style={{
          objectFit: 'contain',
          display:'block',
          background: 'transparent',
          filter: glowFilter,
        }}
      />
    </span>
  );
}

export default function HUDPanel({
  title = "OCEAN GIRL",
  subtitle = "Love flows back like tide.",
  songs,
  onSongChange,
  inConsole = false,
  track,
  currentId,
  holoPop = false,
  playing = false,
  showAllPlanets = false,
  hidePlanetsUntilPlaying = false,
  beamOnly = false,
  beamEnabled = undefined, // optional external control for beam fade (true/false)
  joinAlienOpen = false, // disable cover art interaction when pink display is open
}) {
  console.log('🌍 HUDPanel: Component rendering with props:', { 
    currentId, 
    showAll: !currentId, 
    songsLength: songs?.length, 
    trackTitle: track?.title 
  });
  
  const hoverCoverRef = useRef(null);
  const clickCoverRef = useRef(null);
  const closeCoverRef = useRef(null);
  const [active, setActive] = useState((songs && songs[0]?.id) || undefined);
  const containerRef = useRef(null);
  const baseW = 320; // design width for console-fit (reduced from 380)
  const baseH = 340; // design height for console-fit
  const [scale, setScale] = useState(1);
  const [hoverId, setHoverId] = useState(null);
  const [can3D, setCan3D] = useState(false);
  const [preferRaw3D, setPreferRaw3D] = useState(false);
  // Remove problematic component state that causes React CurrentOwner issues
  const [threeFailed, setThreeFailed] = useState(null);
  const [mounted, setMounted] = useState(false);
  // Beam fade: allow external control; default to fade-in on mount
  const [beamOpacity, setBeamOpacity] = useState(0);
  // Refs for dynamic planet placement above player
  const innerRef = useRef(null);
  const planetRef = useRef(null);
  const playerRef = useRef(null);
  const [planetBottom, setPlanetBottom] = useState(88);
  // Dynamic spacing for song selector so it doesn't overlap the cover
  const coverRef = useRef(null);
  const [oneLinerRight, setOneLinerRight] = useState(inConsole ? 108 : 140);
  // Audio progress tracking
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const lastNonZeroVolumeRef = useRef(1.0);
  const VOLUME_STORAGE_KEY = 'mediaPlayer:volume';
  const [animationTime, setAnimationTime] = useState(0);
  // Volume popover (HUD waveform controls)
  const [showHudVolumePopover, setShowHudVolumePopover] = useState(false);
  const hudVolRef = useRef(null);
  const hudVolBtnRef = useRef(null);
  const [hudPopoverPos, setHudPopoverPos] = useState(null);
  // Direct ref to the currently tracked audio element for live reads during render
  const liveAudioRef = useRef(null);
  useEffect(() => {
    if (typeof beamEnabled === 'boolean') {
      const t = setTimeout(() => setBeamOpacity(beamEnabled ? 1 : 0), 10);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setBeamOpacity(1), 10);
      return () => clearTimeout(t);
    }
  }, [beamEnabled]);
  // Content fade (instead of hard hide when beamOnly)
  // Always show song selection dropdown even when beamOnly is true
  const [contentOpacity, setContentOpacity] = useState(beamOnly ? 0 : 1);
  useEffect(() => { setContentOpacity(beamOnly ? 0 : 1); }, [beamOnly]);
  

  // Runtime probe: ensure WebGL exists and that React internals needed by R3F are present
  useEffect(() => {
    let mounted = true;
    // Add more defensive error handling for React Three Fiber compatibility
    try {
      const c = document.createElement('canvas');
      const gl = c && (c.getContext('webgl') || c.getContext('experimental-webgl'));
      if (!gl) {
        setCan3D(false);
        setThreeFailed('WebGL unavailable');
        return () => { mounted = false; };
      }
      // Probe for React internals used by dev JSX runtime that some R3F versions rely on
      const hasReactInternals = !!(React && (React).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED);
      if (!hasReactInternals) {
        // Fall back to raw Three.js renderer to avoid ReactCurrentOwner crashes
        setPreferRaw3D(true);
      }
      // Enable 3D with additional safety
      setTimeout(() => {
        if (mounted) {
          setCan3D(true);
          setThreeFailed(null);
        }
      }, 100);
    } catch (err) {
      setCan3D(false);
      setThreeFailed(`WebGL/React error: ${err.message}`);
    }
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const updatePos = () => {
      if (showHudVolumePopover && hudVolBtnRef.current) {
        const r = hudVolBtnRef.current.getBoundingClientRect();
        setHudPopoverPos({ left: r.left + r.width/2, top: r.bottom + 8 });
      }
    };
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [showHudVolumePopover]);
  // Bridge to 3D store available if installed

  // Mark mounted for any client-only adjustments; panel is imported with ssr:false
  useEffect(() => { setMounted(true); }, []);


  // Measure cover width and reserve that space for the song selector
  useEffect(() => {
    const el = coverRef.current;
    if (!el) return;

    const computeRight = () => {
      try {
        const rect = el.getBoundingClientRect();
        const width = rect?.width || el.offsetWidth || 0;
        // Account for the negative right offset so we only reserve the area overlapping the panel
        const overflow = Math.abs(inConsole ? -8 : -16);
        const gap = 12; // small gap so text never touches the cover
        const right = Math.max(0, Math.round((width - overflow) + gap));
        setOneLinerRight(right || (inConsole ? 108 : 140));
      } catch {
        // Fallback to previous/static value on any measurement issue
        setOneLinerRight((r) => r || (inConsole ? 108 : 140));
      }
    };

    // Initial compute and observe changes
    computeRight();
    let ro;
    try {
      ro = new ResizeObserver(() => computeRight());
      ro.observe(el);
    } catch {}
    window.addEventListener('resize', computeRight);
    return () => {
      try { ro && ro.disconnect(); } catch {}
      window.removeEventListener('resize', computeRight);
    };
  }, [inConsole]);

  // Audio progress tracking - track ambient audio on homepage, main player when song selected
  useEffect(() => {
    const findAndConnectAudio = () => {
      // On homepage (no currentId), track ambient audio for space-music.mp3
      // When a song is selected (currentId exists), track main player
      const audioSelector = !currentId ? 'audio[data-ambient="1"]' : 'audio[data-audio-player="1"]';
      const a = document.querySelector(audioSelector);
      
      if (DEBUG_MEDIA) dlog('HUDPanel: finding audio element', { selector: audioSelector, element: a, currentId });
      if (!a) {
        // Try again in a moment if audio element not found
        setTimeout(findAndConnectAudio, 100);
        return;
      }
      if (DEBUG_MEDIA) dlog('HUDPanel: found audio element, connecting listeners');

      // Store ref for live cursor position calculations
      liveAudioRef.current = a;
      
      // Load saved volume and apply to audio element
      try {
        const saved = (typeof window !== 'undefined') ? localStorage.getItem(VOLUME_STORAGE_KEY) : null;
        if (saved != null) {
          const v = parseFloat(saved);
          if (!isNaN(v) && v >= 0 && v <= 1) {
            a.volume = v;
            setVolume(v);
            if (v > 0) lastNonZeroVolumeRef.current = v;
          }
        }
      } catch {}
      
      const onTimeUpdate = () => { 
        if (DEBUG_MEDIA) dlog('HUDPanel: timeupdate', a.currentTime);
        setProgress(a.currentTime); 
      };
      const onDurationChange = () => { 
        if (DEBUG_MEDIA) dlog('HUDPanel: durationchange', a.duration);
        setDuration(a.duration || 0); 
      };
      const onVolumeChange = () => { 
        const v = Math.max(0, Math.min(1, a.volume));
        setVolume(v); 
        if (v > 0) lastNonZeroVolumeRef.current = v;
      };
      // Update progress immediately on seek events (works even when paused)
      const onSeek = () => { 
        try { setProgress(isFinite(a.currentTime) ? a.currentTime : 0); } catch {}
      };
      
      // Track play/pause state for button display
      const onPlay = () => {
        if (DEBUG_MEDIA) dlog('HUDPanel: audio playing');
        // Update playing state to reflect the actual audio state
        if (!currentId) {
          // For ambient audio, we need to update the parent playing state
          // This will make the button show "pause" when space-music.mp3 is playing
          // Note: This is handled by the parent component's playing prop
        }
      };
      const onPause = () => {
        if (DEBUG_MEDIA) dlog('HUDPanel: audio paused');
        // Update playing state to reflect the actual audio state
        if (!currentId) {
          // For ambient audio, we need to update the parent playing state
          // This will make the button show "play" when space-music.mp3 is paused
          // Note: This is handled by the parent component's playing prop
        }
      };
      
      // Set initial values
      if (a.duration) setDuration(a.duration);
      if (!isNaN(a.currentTime)) setProgress(a.currentTime);
      
      a.addEventListener('timeupdate', onTimeUpdate);
      a.addEventListener('durationchange', onDurationChange);
      a.addEventListener('volumechange', onVolumeChange);
      a.addEventListener('loadedmetadata', onDurationChange);
      a.addEventListener('seeking', onSeek);
      a.addEventListener('seeked', onSeek);
      a.addEventListener('play', onPlay);
      a.addEventListener('pause', onPause);
      
      return () => {
        // Clear live ref when disconnecting
        if (liveAudioRef.current === a) liveAudioRef.current = null;
        a.removeEventListener('timeupdate', onTimeUpdate);
        a.removeEventListener('durationchange', onDurationChange);
        a.removeEventListener('volumechange', onVolumeChange);
        a.removeEventListener('loadedmetadata', onDurationChange);
        a.removeEventListener('seeking', onSeek);
        a.removeEventListener('seeked', onSeek);
        a.removeEventListener('play', onPlay);
        a.removeEventListener('pause', onPause);
      };
    };
    
    if (mounted) {
      return findAndConnectAudio();
    }
  }, [mounted, currentId]); // Re-run when currentId changes to switch between ambient and main player

  // Persist volume to localStorage when it changes
  useEffect(() => {
    try { if (typeof window !== 'undefined') localStorage.setItem(VOLUME_STORAGE_KEY, String(Math.max(0, Math.min(1, volume)))); } catch {}
  }, [volume]);

  // Close HUD volume popover on outside click / Escape
  useEffect(() => {
    const onDocDown = (e) => {
      const t = e.target;
      if (hudVolRef.current && t && !hudVolRef.current.contains(t)) {
        setShowHudVolumePopover(false);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setShowHudVolumePopover(false); };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Animation loop for smooth cursor movement when playing
  useEffect(() => {
    let animationId;
    let frameCount = 0;
    
    const animate = () => {
      setAnimationTime(Date.now());
      
      // Update progress more frequently when playing for smoother cursor movement
      // Track ambient audio on homepage, main player when song selected
      const audioSelector = !currentId ? 'audio[data-ambient="1"]' : 'audio[data-audio-player="1"]';
      const a = document.querySelector(audioSelector);
      
      if (a && !a.paused) {
        const newTime = a.currentTime;
        
        // Only update if time has actually changed to avoid unnecessary re-renders
        setProgress(prevTime => {
          if (Math.abs(newTime - prevTime) > 0.01) { // Update if difference > 10ms
            return newTime;
          }
          return prevTime;
        });
        
        // Debug logging every 60 frames (1 second at 60fps) when playing
        frameCount++;
        if (frameCount % 60 === 0 && DEBUG_MEDIA) {
          dlog('HUDPanel Animation Loop (Playing):', {
            audioType: !currentId ? 'ambient' : 'main',
            selector: audioSelector,
            currentTime: newTime.toFixed(2),
            duration: a.duration?.toFixed(2) || 'unknown',
            progress: a.duration > 0 ? ((newTime / a.duration) * 100).toFixed(1) : 0,
            cursor: a.duration > 0 ? `${((newTime / a.duration) * 100).toFixed(1)}%` : '0%',
            readyState: a.readyState
          });
        }
      }
      
      // Continue animation loop
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [playing, currentId]); // React to playing state changes and currentId changes

  // Progress bar click handler
  const handleProgressClick = (e) => {
    // Track ambient audio on homepage, main player when song selected
    const audioSelector = !currentId ? 'audio[data-ambient="1"]' : 'audio[data-audio-player="1"]';
    const a = document.querySelector(audioSelector);
    if (DEBUG_MEDIA) dlog('HUDPanel: progress click', { selector: audioSelector, hasAudio: !!a, duration, currentId });
    if (!a || !duration) {
      if (DEBUG_MEDIA) dlog('HUDPanel: cannot seek — missing audio or duration');
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * duration;
    if (DEBUG_MEDIA) dlog('HUDPanel: seeking', { seekTime, percent: percentage * 100, audioType: !currentId ? 'ambient' : 'main' });
    a.currentTime = seekTime;
    try { sfx.play('click', 0.3); } catch {}
  };

  // Toggle play/pause
  const handlePlayPause = () => {
    try { sfx.play('click', 0.6); } catch {}
    
    // Track ambient audio on homepage, main player when song selected
    const audioSelector = !currentId ? 'audio[data-ambient="1"]' : 'audio[data-audio-player="1"]';
    const a = document.querySelector(audioSelector);
    
    if (!a) {
      if (DEBUG_MEDIA) dlog('HUDPanel: no audio element found for play/pause', { selector: audioSelector, currentId });
      return;
    }
    
    if (!currentId) {
      // Do not play ambient audio on homepage
      try { window.dispatchEvent(new CustomEvent('ambient:userPause')); } catch {}
      return;
    } else {
      // When a song is selected, control the main player
      if (a.paused) {
        a.play().catch(() => {});
      } else {
        a.pause();
      }
    }
  };

  // Measure container and compute a stable scale before first paint to avoid flicker.
  useLayoutEffect(() => {
    if (!inConsole) return;
    const el = containerRef.current;
    if (!el) return;
    let raf = 0, raf2 = 0;
    const measure = () => {
      const w = el.clientWidth || 0;
      const h = el.clientHeight || 0;
      // If layout hasn't stabilized yet (very small box), retry next frame.
      if (w < 100 || h < 60) { raf2 = requestAnimationFrame(measure); return; }
      const s = Math.min(w / baseW, h / baseH);
      setScale(s > 0 ? s : 1);
    };
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    // Run after layout but before paint
    raf = requestAnimationFrame(measure);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); cancelAnimationFrame(raf2); };
  }, [inConsole]);

  // Sync active planet with externally playing song id (when provided)
  useEffect(() => {
    if (!currentId) return;
    const exists = songs.some(s => s.id === currentId);
    if (exists && currentId !== active) setActive(currentId);
  }, [currentId, songs]);

  // Fallback: if songs not provided, build from tracks
  const resolvedSongs = songs && songs.length ? songs : buildPlanetSongs().hudSongs;
  
  // Initialize player store with holoSongs for 3D planet system
  useEffect(() => {
    const planetData = buildPlanetSongs();
    if (planetData.holoSongs && planetData.holoSongs.length > 0) {
      playerStore.getState().initSongs(planetData.holoSongs);
    }
  }, []);

  // Planet visibility is orchestrated by DashboardApp:
  // - It enables planets on home after Start/landing.
  // - It hides planets during song selection until playback begins.
  // Avoid forcing planetsVisible=true here based solely on !currentId,
  // which could re-show planets briefly during selection transitions.

  // Dynamically place planet container directly above the media player
  useLayoutEffect(() => {
    let measureTimeout;
    const measure = () => {
      // Throttle measurements to prevent excessive updates
      clearTimeout(measureTimeout);
      measureTimeout = setTimeout(() => {
        try {
          const inner = innerRef.current;
          const player = playerRef.current;
          if (!inner || !player) return;
          const ir = inner.getBoundingClientRect();
          const pr = player.getBoundingClientRect();
          // Reduce the gap so the 3D display extends to the media player
          const gap = 0; // px space between planet and player
          const b = Math.max(0, ir.bottom - pr.top + gap);
          // Only update if there's a significant change to prevent micro-adjustments
          setPlanetBottom(prev => Math.abs(prev - b) > 2 ? b : prev);
        } catch {}
      }, 100); // 100ms throttle
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    if (innerRef.current) ro.observe(innerRef.current);
    if (playerRef.current) ro.observe(playerRef.current);
    window.addEventListener('resize', measure);
    return () => { 
      clearTimeout(measureTimeout);
      try { ro.disconnect(); } catch {}; 
      window.removeEventListener('resize', measure); 
    };
  }, [inConsole]);

  return (
    <motion.section
      className={
        `relative ${inConsole ? 'w-full h-full mx-0 mt-0' : 'mx-auto w-[400px] mt-[10vh]'} `
      }
      /* Remove entrance animation to prevent flash-disappear on some devices */
      initial={false}
      animate={undefined}
      transition={undefined}
      aria-label="Spaceship HUD"
      ref={inConsole ? containerRef : undefined}
    >
      <DevErrorLogger />
      <div className="w-full h-full flex items-end justify-center">
          <motion.div
            className={`relative rounded-2xl`}
            // Remove hover glow/scale for the entire HUD display per request
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={inConsole
              ? { width: '100%', transform: 'perspective(1200px) rotateX(6deg)', transformOrigin: 'center', marginTop: 0 }
              : { transform: 'perspective(1200px) rotateX(6deg)', marginTop: 0 }
            }
          >
          {/* Background removed: keep HUD box transparent */}
        {/* Single blue outline wrapping the HUD content (amped glow) */}
        <div className={`relative rounded-2xl ${inConsole ? 'p-2' : 'p-4'}`} style={{
          background: 'transparent',
          boxShadow: 'none'
        }}>
          {/* Overlay frame to visually lower the blue panel top to match song listing */}
          <div
            className="absolute inset-x-0 rounded-2xl pointer-events-none"
            style={{
              bottom: 0,
              top: `calc(var(--hud-y, 0px) + ${inConsole ? 140 : 160}px)`,
              background: 'rgba(25,227,255,0.25)',
              boxShadow: '0 0 50px rgba(25,227,255,0.20), 0 0 70px rgba(25,227,255,0.35), 0 0 24px rgba(25,227,255,0.50)',
              border: '1px solid rgba(25,227,255,0.60)'
            }}
            aria-hidden
          />
          {/* 3D planets — align to full blue display width (outside inner padding) */}
          <div
            ref={planetRef}
            className="absolute inset-x-0"
            // Position 3D display higher within blue HUD area; allow only top bleed on homepage
            style={{ 
              top: `calc(${inConsole ? 60 : 80}px + var(--hud-y, 0px)${!currentId ? ' - 18px' : ''})`, 
              bottom: planetBottom,
              pointerEvents: 'none' // Allow clicks to pass through to elements below
            }}
          >
            <div className="w-full h-full" style={{ pointerEvents: 'none' }}>
                <ErrorBoundary 
                  key={preferRaw3D ? 'raw' : 'r3f'}
                  fallback={null} 
                  onError={(e)=>{ 
                    const emsg = String((e && (e.message||e.name)) || '');
                    if (String(e?.name||'').includes('IndexSizeError')) { 
                      try { if (DEBUG_MEDIA) dwarn('Disabling 3D due to IndexSizeError'); } catch {} 
                    }
                    if (emsg.includes('ReactCurrentOwner')) {
                      // Switch to raw 3D fallback; keep 3D enabled
                      setPreferRaw3D(true);
                    }
                    setThreeFailed(emsg || 'Render error'); 
                    // Do not disable can3D here; fallback may still work
                  }}
                >
                  {/* Show all planets on homepage (no currentId), and focus when a song is selected */}
                  {preferRaw3D ? (
                    <PlanetSystemRaw showAll={showAllPlanets || !currentId} hideUntilPlaying={!!hidePlanetsUntilPlaying} onSongChange={onSongChange} />
                  ) : (
                    <PlanetSystem showAll={showAllPlanets || !currentId} hideUntilPlaying={!!hidePlanetsUntilPlaying} onSongChange={onSongChange} />
                  )}
                </ErrorBoundary>
              </div>
          </div>
          {/* Background removed for transparent HUD */}
          {/* Cover art moved into right column above the song list */}
          {/* Holographic beam overlays removed */}
          {/* Bloom layers removed */}
          <div
              className={`relative ${inConsole ? 'p-2' : 'p-4'}`}
              style={{ 
                opacity: contentOpacity, 
                transition: 'opacity 240ms ease', 
                pointerEvents: contentOpacity > 0.01 ? 'auto' : 'none', 
                minHeight: inConsole ? 380 : 480,
                width: '100%',
                height: '100%'
              }}
              ref={innerRef}
            >


          
          {/* Cover section at bottom right corner - using CoverHologram for pop-out functionality */}
          <div ref={coverRef} className="absolute" style={{ 
            bottom: inConsole ? -8 : -16, 
            right: inConsole ? -8 : -16, 
            width: 'auto', 
            display: 'flex', 
            justifyContent: 'flex-end' 
          }}>
            {(() => {
              const src = (!currentId ? DEFAULT_COVER : (track?.cover || DEFAULT_COVER));
              const title = (!currentId ? 'CHXNDLER' : (track?.title || 'Unknown'));
              const trackingSong = (!currentId ? 'chxndler_home' : (track?.slug || active || 'unknown'));
              const trackingTitle = (!currentId ? 'CHXNDLER Home' : (track?.title || 'Unknown'));
              
              
              return (
                <div
                  onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {}; try { const a = hoverCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
                  style={{
                    pointerEvents: joinAlienOpen ? 'none' : 'auto'
                  }}
                >
                  <CoverHologram 
                    src={src} 
                    title={title} 
                    slug={trackingSong}
                    inline={true} 
                    size={110}
                  />
                </div>
              );
            })()}
          </div>

          {/* Waveform Media Player - positioned below dropdown with proper spacing */}
          <div ref={playerRef} className="absolute" style={{ 
            left: inConsole ? 0 : 2, // Shift very slightly more to the left
            right: oneLinerRight, // Extend further to the right
            height: '55px',
            bottom: inConsole ? -10 : -12 // Move down to avoid cutting into dropdown
          }}>
            <div className="hud-waveform-player" style={{ margin: 0, borderRadius: '10px' }}>
              <div className="flex items-center gap-3 p-2">
                <button 
                  onClick={handlePlayPause}
                  className="hud-play-btn-enhanced"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1"/>
                      <rect x="14" y="4" width="4" height="16" rx="1"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 4v16l12-8z"/>
                    </svg>
                  )}
                </button>
                
                {/* Spotify button positioned directly next to play/pause */}
                {(() => {
                  const currentSong = resolvedSongs.find(s => s.id === active);
                  const spotifyUrl = currentSong?.spotify;
                  
                  // Only show clickable Spotify button when a song is selected (currentId exists)
                  // On homepage (!currentId), always show disabled button
                  if (currentId && spotifyUrl) {
                    return (
                      <a
                        href={spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="spotify-btn-waveform-hud"
                        title="Open on Spotify"
                        aria-label={`Open ${currentSong?.title || 'current track'} on Spotify`}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                      </a>
                    );
                  } else {
                    // Show disabled button on homepage or when no Spotify link available
                    const isHomepage = !currentId;
                    const titleText = isHomepage 
                      ? 'Spotify not available on homepage' 
                      : `No Spotify link available for ${currentSong?.title || 'current track'}`;
                    
                    return (
                      <div 
                        className="spotify-btn-unavailable-hud"
                        title={titleText}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" opacity="0.5">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                      </div>
                    );
                  }
                })()}

                {/* Apple Music button positioned directly next to Spotify */}
                {(() => {
                  const currentSong = resolvedSongs.find(s => s.id === active);
                  const appleUrl = currentSong?.apple;

                  // Only show clickable Apple button when a song is selected (currentId exists)
                  // On homepage (!currentId), always show disabled button
                  if (currentId && appleUrl) {
                    return (
                      <a
                        href={appleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="apple-btn-waveform-hud"
                        title="Open on Apple Music"
                        aria-label={`Open ${currentSong?.title || 'current track'} on Apple Music`}
                      >
                        <img src="/elements/apple.png" width="16" height="16" alt="Apple" style={{ display:'block' }} />
                      </a>
                    );
                  } else {
                    // Show disabled button on homepage or when no Apple link available
                    const isHomepage = !currentId;
                    const titleText = isHomepage 
                      ? 'Apple Music not available on homepage' 
                      : `No Apple Music link available for ${currentSong?.title || 'current track'}`;

                    return (
                      <div 
                        className="apple-btn-unavailable-hud"
                        title={titleText}
                      >
                        <img src="/elements/apple.png" width="16" height="16" alt="Apple" style={{ display:'block', opacity: 0.5 }} />
                      </div>
                    );
                  }
                })()}

                {/* Volume control next to Spotify icon */}
                <div 
                  className="hud-volume"
                  role="group" 
                  aria-label="Volume"
                  ref={hudVolRef}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}
                >
                  <button
                    className="hud-volume-btn"
                    onClick={() => {
                      try { sfx.play('click', 0.4); } catch {}
                      // Only open/close dropdown; do not change volume on click
                      setShowHudVolumePopover(v => {
                        const next = !v;
                        if (next && hudVolBtnRef.current) {
                          const r = hudVolBtnRef.current.getBoundingClientRect();
                          setHudPopoverPos({ left: r.left + r.width/2, top: r.bottom + 8 });
                        }
                        return next;
                      });
                    }}
                    aria-label="Volume"
                    title="Volume"
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      border: '3px solid rgba(255,255,255,0.4)',
                      background: 'radial-gradient(circle at 30% 30%, #19E3FF, #0EA8D0)', color: 'white',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', boxShadow: '0 4px 16px rgba(25,227,255,0.6)'
                    }}
                    ref={hudVolBtnRef}
                  >
                    {volume === 0 ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        {/* Speaker base */}
                        <polygon points="4,10 8,10 13,6 13,18 8,14 4,14" fill="currentColor" />
                        {/* Mute X overlay */}
                        <line x1="15" y1="9" x2="21" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="21" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    ) : volume < 0.5 ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                        <path d="M3 9v6h4l5 5V4L7 9H3zm10.5 3c0-1.77-.77-3.29-2-4.3v8.6c1.23-1.01 2-2.53 2-4.3z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                        <path d="M3 9v6h4l5 5V4L7 9H3zm10.5 3c0-1.77-.77-3.29-2-4.3v8.6c1.23-1.01 2-2.53 2-4.3zM19 12c0-3.04-1.72-5.64-4.25-6.92l-.75 1.86C16 8.2 17.5 9.96 17.5 12s-1.5 3.8-3.5 4.06l.75 1.86C17.28 17.64 19 15.04 19 12z"/>
                      </svg>
                    )}
                  </button>
                  {null}
                </div>

                {typeof document !== 'undefined' && showHudVolumePopover && hudPopoverPos ? require('react-dom').createPortal(
                  <div
                    role="dialog"
                    aria-label="Adjust volume"
                    style={{
                      position: 'fixed', left: hudPopoverPos.left, top: hudPopoverPos.top, transform: 'translateX(-50%)',
                      padding: '10px 10px', borderRadius: 12,
                      background: 'rgba(3,10,20,0.86)',
                      border: '1px solid rgba(25,227,255,0.5)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 0 22px rgba(25,227,255,0.55)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 2147483647
                    }}
                  >
                    <div
                      role="slider"
                      aria-orientation="vertical"
                      aria-label="Volume"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(volume * 100)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') { e.preventDefault(); const a = liveAudioRef.current; if (!a) return; a.volume = Math.max(0, Math.min(1, volume + 0.05)); }
                        else if (e.key === 'ArrowDown') { e.preventDefault(); const a = liveAudioRef.current; if (!a) return; a.volume = Math.max(0, Math.min(1, volume - 0.05)); }
                      }}
                      onPointerDown={(e) => {
                        const a = liveAudioRef.current; if (!a) return;
                        const el = e.currentTarget;
                        const applyFromClientY = (clientY) => {
                          const rect = el.getBoundingClientRect();
                          const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
                          const pct = rect.height > 0 ? (1 - (y / rect.height)) : 0;
                          const newVol = Math.max(0, Math.min(1, pct));
                          a.volume = newVol; setVolume(newVol);
                          if (newVol > 0) lastNonZeroVolumeRef.current = newVol;
                        };
                        try { el.setPointerCapture?.(e.pointerId); } catch {}
                        e.preventDefault(); try { sfx.play('click', 0.3); } catch {}
                        applyFromClientY(e.clientY);
                        const onMove = (ev) => applyFromClientY(ev.clientY);
                        const onUp = () => {
                          window.removeEventListener('pointermove', onMove);
                          window.removeEventListener('pointerup', onUp);
                        };
                        window.addEventListener('pointermove', onMove);
                        window.addEventListener('pointerup', onUp, { once: true });
                      }}
                      style={{ position: 'relative', width: 10, height: 120, cursor: 'pointer', touchAction: 'none' }}
                    >
                      <div style={{ position: 'absolute', left: 4, right: 4, top: 0, bottom: 0, borderRadius: 6, background: 'rgba(255,255,255,0.15)', boxShadow: 'inset 0 0 8px rgba(25,227,255,0.25)' }} />
                      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.round(volume*100)}%`, background: '#19E3FF', borderRadius: '0 0 6px 6px', boxShadow: '0 0 12px rgba(25,227,255,0.65), 0 0 18px rgba(25,227,255,0.45)' }} />
                      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#19E3FF', border: '2px solid #19E3FF', boxShadow: '0 0 14px rgba(25,227,255,0.9)', bottom: `calc(${Math.round(volume*100)}% - 7px)`, pointerEvents: 'none' }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#19E3FF', textShadow: '0 0 10px rgba(25,227,255,0.7)' }}>{Math.round(volume * 100)}%</div>
                  </div>,
                  document.body
                ) : null}
                {/* Waveform visualization */}
                <div className="flex-1">
                  <div 
                    className="waveform-container"
                    onClick={handleProgressClick}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const hoverX = e.clientX - rect.left;
                      const hoverPercentage = (hoverX / rect.width) * 100;
                      e.currentTarget.style.setProperty('--hover-position', `${hoverPercentage}%`);
                    }}
                    style={{
                      // Get current song's element color for border styling
                      border: `1px solid ${(() => {
                        const currentSong = resolvedSongs.find(s => s.id === active);
                        const elementColor = currentSong?.color || '#19E3FF';
                        const r = parseInt(elementColor.slice(1, 3), 16);
                        const g = parseInt(elementColor.slice(3, 5), 16);
                        const b = parseInt(elementColor.slice(5, 7), 16);
                        return `rgba(${r}, ${g}, ${b}, 0.2)`;
                      })()}`,
                    }}
                    onMouseEnter={(e) => {
                      const currentSong = resolvedSongs.find(s => s.id === active);
                      const elementColor = currentSong?.color || '#19E3FF';
                      const r = parseInt(elementColor.slice(1, 3), 16);
                      const g = parseInt(elementColor.slice(3, 5), 16);
                      const b = parseInt(elementColor.slice(5, 7), 16);
                      e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
                      e.currentTarget.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
                      e.currentTarget.style.boxShadow = `0 0 12px rgba(${r}, ${g}, ${b}, 0.2)`;
                    }}
                    onMouseLeave={(e) => {
                      const currentSong = resolvedSongs.find(s => s.id === active);
                      const elementColor = currentSong?.color || '#19E3FF';
                      const r = parseInt(elementColor.slice(1, 3), 16);
                      const g = parseInt(elementColor.slice(3, 5), 16);
                      const b = parseInt(elementColor.slice(5, 7), 16);
                      e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                      e.currentTarget.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* SVG Waveform using smooth curves */}
                    <svg 
                      className="w-full h-full" 
                      viewBox="0 0 400 32" 
                      preserveAspectRatio="none"
                      style={{ background: 'transparent' }}
                    >
                      {/* Background grid for audio visualization */}
                      <defs>
                        {(() => {
                          // Get current song's element color
                          const currentSong = resolvedSongs.find(s => s.id === active);
                          const elementColor = currentSong?.color || '#19E3FF'; // fallback to default cyan
                          
                          // Convert hex to rgba for gradients
                          const hexToRgba = (hex, alpha) => {
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                          };
                          
                          return (
                            <>
                              <pattern id="audio-grid" width="10" height="5" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 5" fill="none" stroke={hexToRgba(elementColor, 0.08)} strokeWidth="0.3"/>
                              </pattern>
                              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={hexToRgba(elementColor, 0.8)}/>
                                <stop offset="50%" stopColor={hexToRgba(elementColor, 1)}/>
                                <stop offset="100%" stopColor={hexToRgba(elementColor, 0.8)}/>
                              </linearGradient>
                              <linearGradient id="unplayedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={hexToRgba(elementColor, 0.25)}/>
                                <stop offset="50%" stopColor={hexToRgba(elementColor, 0.35)}/>
                                <stop offset="100%" stopColor={hexToRgba(elementColor, 0.25)}/>
                              </linearGradient>
                            </>
                          );
                        })()}
                      </defs>
                      <rect width="100%" height="100%" fill="url(#audio-grid)" />
                      
                      {/* Generate realistic sound wave data */}
                      {(() => {
                        // Create consistent waveform based on current song
                        const seed = (active || 'default').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                        const waveformData = Array.from({ length: 200 }, (_, i) => {
                          // Create realistic audio frequency components
                          const bassLine = Math.sin((i + seed) * 0.02) * 0.4;           // Bass frequencies
                          const melody = Math.sin((i + seed) * 0.08 + 2) * 0.3;         // Mid frequencies  
                          const percussion = Math.sin((i + seed) * 0.2 + 4) * 0.25;     // High frequencies
                          const vocals = Math.sin((i + seed) * 0.12 + 1) * 0.35;        // Vocal range
                          const harmonics = Math.sin((i + seed) * 0.4 + 5) * 0.15;      // Harmonics
                          
                          // Create natural audio envelope (songs typically start/end quieter)
                          const fadeIn = Math.min(1, i / 15);
                          const fadeOut = Math.min(1, (200 - i) / 25);
                          const envelope = Math.min(fadeIn, fadeOut);
                          
                          // Add musical dynamics
                          const dynamics = Math.sin((i / 200) * Math.PI * 2.5) * 0.4 + 0.6;
                          
                          // Combine all elements for realistic audio appearance
                          const amplitude = Math.abs(bassLine + melody + percussion + vocals + harmonics) * envelope * dynamics;
                          
                          return Math.max(0.05, Math.min(0.9, amplitude));
                        });
                        
                        // Use live audio values for perfect sync with cursor overlay
                        const a = liveAudioRef.current;
                        const liveDur = (a && isFinite(a.duration) && a.duration > 0) ? a.duration : (isFinite(duration) && duration > 0 ? duration : 0);
                        const liveTime = (a && isFinite(a.currentTime) && a.currentTime >= 0) ? a.currentTime : (isFinite(progress) && progress >= 0 ? progress : 0);
                        const progressRatio = liveDur > 0 ? (liveTime / liveDur) : 0;
                        const progressX = progressRatio * 400;
                        
                        return (
                          <>
                            {/* Unplayed waveform */}
                            <path
                              d={`M 0 16 ${waveformData.map((amp, i) => {
                                const x = (i / (waveformData.length - 1)) * 400;
                                const y1 = 16 - (amp * 12); // Top of wave
                                const y2 = 16 + (amp * 12); // Bottom of wave
                                return `L ${x} ${y1} L ${x} ${y2}`;
                              }).join(' ')} L 400 16`}
                              fill="none"
                              stroke="url(#unplayedGradient)"
                              strokeWidth="1.5"
                              opacity="0.7"
                            />
                            
                            {/* Played portion of waveform with enhanced glow */}
                            <clipPath id="playedClip">
                              <rect x="0" y="0" width={progressX} height="32" />
                            </clipPath>
                            <path
                              d={`M 0 16 ${waveformData.map((amp, i) => {
                                const x = (i / (waveformData.length - 1)) * 400;
                                const y1 = 16 - (amp * 12);
                                const y2 = 16 + (amp * 12);
                                return `L ${x} ${y1} L ${x} ${y2}`;
                              }).join(' ')} L 400 16`}
                              fill="none"
                              stroke="url(#waveGradient)"
                              strokeWidth="2"
                              opacity="1"
                              clipPath="url(#playedClip)"
                              style={{
                                filter: 'drop-shadow(0 0 4px rgba(25,227,255,0.6))',
                              }}
                            />
                            
                            {/* Current position indicator */}
                            {progressRatio > 0 && (() => {
                              // Get current song's element color for progress indicator
                              const currentSong = resolvedSongs.find(s => s.id === active);
                              const elementColor = currentSong?.color || '#19E3FF';
                              
                              // Convert hex to rgba
                              const hexToRgba = (hex, alpha) => {
                                const r = parseInt(hex.slice(1, 3), 16);
                                const g = parseInt(hex.slice(3, 5), 16);
                                const b = parseInt(hex.slice(5, 7), 16);
                                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                              };
                              
                              return (
                                <g>
                                  {/* Progress dot and pulse removed: element icon now serves as the playhead */}
                                </g>
                              );
                            })()}
                          </>
                        );
                      })()}
                    </svg>
                    
                    {/* Element icon cursor positioned above progress */}
                    <div
                      className="absolute top-0 h-full flex flex-col items-center justify-center pointer-events-none z-10 hud-cursor-transition"
                      style={{
                        left: `${(() => {
                          // Prefer live audio element values; fall back to local state
                          const a = liveAudioRef.current;
                          const liveDur = (a && isFinite(a.duration) && a.duration > 0) ? a.duration : (isFinite(duration) && duration > 0 ? duration : 0);
                          const liveTime = (a && isFinite(a.currentTime) && a.currentTime >= 0) ? a.currentTime : (isFinite(progress) && progress >= 0 ? progress : 0);
                          const progressPercent = liveDur > 0 ? (liveTime / liveDur) * 100 : 0;
                          const leftPos = Math.max(0, Math.min(100, progressPercent));

                          // Debug logging for cursor movement
                          if (playing && liveTime > 0 && DEBUG_MEDIA) {
                            dlog('🎯 HUDPanel Cursor Position:', {
                              usingLive: !!a,
                              progress: liveTime.toFixed(3),
                              duration: liveDur.toFixed(3),
                              progressPercent: progressPercent.toFixed(3),
                              leftPos: leftPos.toFixed(3),
                              playing
                            });
                          }

                          return leftPos;
                        })()}%`,
                        transform: 'translateX(-50%)',
                        width: '32px',
                        transition: playing ? 'left 0.1s linear' : 'left 0.3s ease',
                      }}
                    >
                      {/* Element icon at cursor position */}
                      {(() => {
                        // Use CHXNDLER element when in home mode (no specific song selected)
                        if (!currentId) {
                          const elementIcon = 'chxndler';
                          const elementColor = '#19E3FF';
                          
                          // Convert hex to rgba
                          const hexToRgba = (hex, alpha) => {
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                          };
                          
                          return (
                            <img
                              src={`/elements/${elementIcon}.png`}
                              alt="CHXNDLER element"
                              className="w-8 h-8 brightness-150 saturate-125"
                              style={{
                                filter: `drop-shadow(0 0 14px ${hexToRgba(elementColor, 1)}) drop-shadow(0 0 32px ${hexToRgba(elementColor, 0.8)}) drop-shadow(0 0 64px ${hexToRgba(elementColor, 0.35)})`,
                              }}
                              onError={(e) => {
                                e.target.src = '/elements/music.png';
                              }}
                            />
                          );
                        }
                        
                        const currentSong = resolvedSongs.find(s => s.id === active);
                        const elementIcon = currentSong?.icon;
                        const elementColor = currentSong?.color || '#19E3FF';
                        if (!elementIcon) return null;
                        
                        // Convert hex to rgba
                        const hexToRgba = (hex, alpha) => {
                          const r = parseInt(hex.slice(1, 3), 16);
                          const g = parseInt(hex.slice(3, 5), 16);
                          const b = parseInt(hex.slice(5, 7), 16);
                          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                        };
                        
                        return (
                          <img
                            src={`/elements/${elementIcon}.png`}
                            alt={`${currentSong?.title || 'Current song'} element`}
                            className="w-8 h-8 brightness-150 saturate-125"
                            style={{
                              filter: `drop-shadow(0 0 14px ${hexToRgba(elementColor, 1)}) drop-shadow(0 0 32px ${hexToRgba(elementColor, 0.8)}) drop-shadow(0 0 64px ${hexToRgba(elementColor, 0.35)})`,
                            }}
                            onError={(e) => {
                              e.target.src = '/elements/music.png';
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                </div>
                
                {/* Time display */}
              </div>
            </div>
          </div>
        </div>

        {/* Song selector positioned outside content opacity container to avoid beamOnly blocking */}
        <div className="absolute" style={{ 
          left: inConsole ? 6 : 8, 
          bottom: 'calc(80px - 24px)', // Position above media player (80px height - 24px overlap)
          // Reserve dynamic space to the right so the dropdown never overlaps the cover
          right: oneLinerRight + 4,
          maxWidth: 'none',
          zIndex: 99999,  // Highest z-index to ensure it's above everything
          pointerEvents: 'auto', // Explicitly enable pointer events
          position: 'absolute' // Explicit positioning to avoid any layout conflicts
        }}>
            <SongDropdown
              items={resolvedSongs}
              initialActiveId={active || resolvedSongs[0]?.id}
              currentId={currentId}
              onChange={(id) => {
                setActive(id);
                
                // Hide all planets immediately when a song is selected from dropdown
                try {
                  playerStore.getState().setPlanetsVisible(false);
                } catch (error) {
                  console.error('Failed to hide planets:', error);
                }
                
                // Set as main planet in player store so it becomes focused in dashboard
                try {
                  playerStore.getState().setMain(id);
                  console.log('🎵 HUDPanel: Set main planet to', id);
                } catch (error) {
                  console.error('Failed to set main planet:', error);
                }
                
                // Do not re-enable planets here; next route controls when to show the focused planet
                
                // Stop ambient space music when switching songs
                try {
                  const ambient = document.querySelector('audio[data-ambient="1"]');
                  if (ambient) {
                    ambient.pause();
                    ambient.currentTime = 0;
                  }
                } catch (error) {
                  if (DEBUG_MEDIA) dwarn('HUDPanel: failed to stop ambient audio', error);
                }
                // Also stop welcome VO immediately if present
                try {
                  const intro = document.querySelector('audio[data-intro="1"]');
                  if (intro) {
                    intro.pause();
                    intro.currentTime = 0;
                  }
                } catch (error) {
                  if (DEBUG_MEDIA) dwarn('HUDPanel: failed to stop intro VO', error);
                }
                
                onSongChange?.(id);
                try {
                  if (usePlayerStore?.getState) {
                  playerStore.getState().setMain(id);
                  }
                } catch (error) {
                  if (DEBUG_MEDIA) dwarn('HUDPanel: failed to update player store', error);
                }
                // Stay in place; DashboardApp.onSongChange handles switch without spotlight/route
              }}
            />
          </div>

      {/* styles moved to app/globals.css to avoid styled-jsx in this module */}
      {/* brand button styles moved to app/globals.css */}
      <audio ref={hoverCoverRef} preload="auto">
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={clickCoverRef} src="/audio/click.mp3" preload="auto" />
      <audio ref={closeCoverRef} src="/audio/close.mp3" preload="auto" />
        </div>
      </motion.div>
      </div>

    </motion.section>
  );
}
