"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
// 2D fallback hologram
// 2D HUD removed per request; 3D only
// 3D planet system (requires three/r3f/drei installed)
// IMPORTANT: Do NOT import at module scope — older @react-three/fiber versions
// are incompatible with React 19 and can crash on evaluation. We lazy-load it
// only after probing availability, and fall back gracefully.
import { usePlayerStore } from "@/store/usePlayerStore";
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
import { buildPlanetSongs } from "@/lib/planets";
import SongDropdown from "@/components/SongDropdown";
import DevErrorLogger from "@/components/DevErrorLogger";
import PlanetSystemRaw from "@/components/holo/PlanetSystemRaw";
import { sfx } from "@/lib/sfx";
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
    if (k.includes("heart")) return "#FC54AF";      // pink
    if (k.includes("lightning") || k.includes("electric")) return "#F2EF1D"; // yellow
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
  beamOnly = false,
  beamEnabled = undefined, // optional external control for beam fade (true/false)
}) {
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
  const [PlanetSystemComp, setPlanetSystemComp] = useState(() => PlanetSystemRaw);
  const [threeFailed, setThreeFailed] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  // Beam fade: allow external control; default to fade-in on mount
  const [beamOpacity, setBeamOpacity] = useState(0);
  // Audio progress tracking
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
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
  const [contentOpacity, setContentOpacity] = useState(beamOnly ? 0 : 1);
  useEffect(() => { setContentOpacity(beamOnly ? 0 : 1); }, [beamOnly]);

  // Runtime probe: ensure WebGL exists; use raw Three-based system to avoid React internals issues
  useEffect(() => {
    let mounted = true;
    // Quick capability probe: require a WebGL context
    try {
      const c = document.createElement('canvas');
      const gl = c && (c.getContext('webgl') || c.getContext('experimental-webgl'));
      if (!gl) {
        setCan3D(false);
        setThreeFailed('WebGL unavailable');
        return () => { mounted = false; };
      }
    } catch {
      setCan3D(false);
      setThreeFailed('WebGL blocked');
      return () => { mounted = false; };
    }
    // Raw Three-based system requires only WebGL
    setCan3D(true);
    setThreeFailed(null);
    return () => { mounted = false; };
  }, []);
  // Bridge to 3D store available if installed

  // Mark mounted for any client-only adjustments; panel is imported with ssr:false
  useEffect(() => { setMounted(true); }, []);

  // Audio progress tracking
  useEffect(() => {
    const findAndConnectAudio = () => {
      const a = document.querySelector('audio[data-audio-player="1"]');
      console.log('Looking for audio element:', a);
      if (!a) {
        // Try again in a moment if audio element not found
        setTimeout(findAndConnectAudio, 100);
        return;
      }
      
      console.log('Found audio element, connecting listeners');
      
      const onTimeUpdate = () => { 
        console.log('Time update:', a.currentTime);
        setProgress(a.currentTime); 
      };
      const onDurationChange = () => { 
        console.log('Duration changed:', a.duration);
        setDuration(a.duration || 0); 
      };
      const onVolumeChange = () => { setVolume(a.volume); };
      
      // Set initial values
      if (a.duration) setDuration(a.duration);
      if (!isNaN(a.currentTime)) setProgress(a.currentTime);
      
      a.addEventListener('timeupdate', onTimeUpdate);
      a.addEventListener('durationchange', onDurationChange);
      a.addEventListener('volumechange', onVolumeChange);
      a.addEventListener('loadedmetadata', onDurationChange);
      
      return () => {
        a.removeEventListener('timeupdate', onTimeUpdate);
        a.removeEventListener('durationchange', onDurationChange);
        a.removeEventListener('volumechange', onVolumeChange);
        a.removeEventListener('loadedmetadata', onDurationChange);
      };
    };
    
    if (mounted) {
      return findAndConnectAudio();
    }
  }, [mounted]);

  // Progress bar click handler
  const handleProgressClick = (e) => {
    const a = document.querySelector('audio[data-audio-player="1"]');
    console.log('Progress click - audio element:', a, 'duration:', duration);
    if (!a || !duration) {
      console.log('Cannot seek - no audio element or duration');
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * duration;
    console.log('Seeking to:', seekTime, 'seconds (', percentage * 100, '%)');
    a.currentTime = seekTime;
    try { sfx.play('click', 0.3); } catch {}
  };

  // Toggle play/pause
  const handlePlayPause = () => {
    const a = document.querySelector('audio[data-audio-player="1"]');
    if (!a) return;
    try { sfx.play('click', 0.6); } catch {}
    if (a.paused) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  };
  useEffect(() => {
    if (!showCard) return;
    const onKey = (e) => { 
      if (e.key === 'Escape') {
        setShowCard(false);
        // Dispatch event to notify DashboardApp that card modal closed
        const event = new CustomEvent('hideCoverCard');
        window.dispatchEvent(event);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCard]);

  // Listen for cover card events from HoloHUD
  useEffect(() => {
    const handleShowCoverCard = (event) => {
      setShowCard(true);
    };
    window.addEventListener('showCoverCard', handleShowCoverCard);
    return () => window.removeEventListener('showCoverCard', handleShowCoverCard);
  }, []);

  // Reset flip state when modal closes
  useEffect(() => {
    if (!showCard) {
      setCardFlipped(false);
    }
  }, [showCard]);

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
      <div className="w-full h-full flex items-start justify-center">
          <motion.div
            className={`relative rounded-2xl`}
            // Remove hover glow/scale for the entire HUD display per request
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={inConsole
              ? { width: '100%', height: '100%', transform: 'perspective(1200px) rotateX(6deg)', transformOrigin: 'center', marginTop: 48 }
              : { transform: 'perspective(1200px) rotateX(6deg)', marginTop: 48 }
            }
          >
          {/* Background removed: keep HUD box transparent */}
        {/* Single blue outline wrapping the HUD content (amped glow) */}
        <div className={`relative rounded-2xl border border-[#19E3FF]/60 ring-2 ring-[#19E3FF]/30 ${inConsole ? 'p-2' : 'p-4'}`} style={{
          background: 'rgba(25,227,255,0.25)',
          boxShadow: '0 0 50px rgba(25,227,255,0.20), 0 0 70px rgba(25,227,255,0.35), 0 0 24px rgba(25,227,255,0.50)'
        }}>
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
              minHeight: inConsole ? 300 : 400,
              width: '100%',
              height: '100%'
            }}
          >
          {/* Element icon at top left */}
          <div className="absolute z-40" style={{ left: 8, top: 8, pointerEvents: 'none' }}>
            {(() => {
              try {
                // Make the default CHXNDLER logo larger in the top-left
                if (!currentId) { return <ElementIcon name="chxndler" size={32} />; }
                const found = resolvedSongs.find(s => s.id === (active || ''));
                const icon = found && found.icon;
                // Disable glow for song-specific element icons to avoid any rectangular glow box
                return icon ? <ElementIcon name={icon} size={28} glow={false} /> : null;
              } catch { return null; }
            })()}
          </div>
          {/* Title directly next to element icon */}
          <div
            className="absolute z-20 rounded-md"
            style={{
              color: '#19E3FF',
              fontFamily: 'OrbitronLocal, InterLocal, sans-serif',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textShadow: 'none',
              WebkitTextStroke: '0px transparent',
              fontSize: inConsole ? 14 : 18,
              lineHeight: '1.12',
              display: 'flex',
              alignItems: 'center',
              left: inConsole ? 48 : 64,
              top: inConsole ? 8 : 12,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              pointerEvents: 'none',
            }}
          >
            {(!currentId ? 'CHXNDLER' : ((track?.title) || (resolvedSongs.find(s=> s.id === (active || ''))?.title) || ''))}
          </div>

          {/* One-liner directly below title */}
          <div
            className="absolute z-20 rounded-md"
            style={{
              color: '#19E3FF',
              fontFamily: 'InterLocal, OrbitronLocal, system-ui, sans-serif',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textShadow: 'none',
              WebkitTextStroke: '0px transparent',
              fontSize: inConsole ? 10 : 12,
              lineHeight: '1.25',
              left: inConsole ? 48 : 64,
              top: inConsole ? 28 : 38,
              right: '50%',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal',
              pointerEvents: 'none',
            }}
            aria-label="Song tagline"
          >
            {(!currentId ? 'Welcome to the HEARTVERSE - a home for ALIENS, where misfits and dreamers live free.' : (track?.subtitle || ''))}
          </div>

          {/* 3D planets extending from left to media player */}
          <div className="absolute bottom-2 left-2" style={{ width: '65%', height: '60%' }}>
            {can3D && PlanetSystemComp ? (
              <div className="relative w-full h-full">
                <ErrorBoundary fallback={null} onError={(e)=>{ if (String(e?.name||'').includes('IndexSizeError')) { try { console.warn('Disabling 3D due to IndexSizeError'); } catch {} } setThreeFailed((e && (e.message||e.name)) || 'Render error'); setCan3D(false); }}>
                  <PlanetSystemComp showAll={!currentId} />
                </ErrorBoundary>
              </div>
            ) : (
              <div className="w-full h-full grid place-items-center">
                {threeFailed ? (
                  <div
                    style={{
                      fontSize: 8, letterSpacing: '0.04em', fontWeight: 700,
                      color: '#EFFFFF', textShadow: '0 0 10px rgba(25,227,255,0.8), 0 0 24px rgba(25,227,255,0.45)',
                      background: 'linear-gradient(180deg, rgba(0,0,0,.38), rgba(0,0,0,.22))',
                      border: '1px solid rgba(25,227,255,.35)', borderRadius: 4, padding: '4px 6px',
                      boxShadow: '0 10px 24px rgba(0,0,0,.35), 0 0 22px rgba(25,227,255,.35)'
                    }}
                    aria-live="polite"
                  >
                    3D disabled: {threeFailed}
                  </div>
                ) : null}
              </div>
            )}
          </div>
          {/* Cover section at top right */}
          <div className="absolute top-2 right-2" style={{ width: '35%', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              aria-label="Open song card"
              className="cover-link"
              onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {}; try { const a = hoverCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
              onClick={() => { 
                try { sfx.play('click', 0.6); } catch {};
                try { const a = clickCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {};
                // Track cover art click
                const trackingSong = (!currentId ? 'chxndler_home' : (track?.slug || active || 'unknown'));
                const trackingTitle = (!currentId ? 'CHXNDLER Home' : (track?.title || 'Unknown'));
                trackAnalytics("cover_art_clicked", {
                  song_id: trackingSong,
                  song_title: trackingTitle,
                  cover_src: (!currentId ? DEFAULT_COVER : (track?.cover || DEFAULT_COVER))
                });
                setShowCard(true); 
              }}
            >
              {(() => {
                const src = (!currentId ? DEFAULT_COVER : (track?.cover || DEFAULT_COVER));
                const coverSize = inConsole ? 140 : 180;
                return <CoverCard src={src} size={coverSize} />;
              })()}
            </button>
          </div>

          {/* Waveform Media Player - positioned outside padded container to be flush with bottom */}
          <div className="absolute -bottom-2 left-2 right-2" style={{ height: '80px' }}>
            <div className="hud-waveform-player" style={{ margin: 0, borderRadius: '0 0 8px 8px' }}>
              <div className="flex items-center gap-4 p-3">
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
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>
                
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
                  >
                    {/* Generate waveform bars */}
                    {Array.from({ length: 100 }, (_, i) => {
                      const height = Math.sin(i * 0.3) * 0.5 + Math.random() * 0.5 + 0.3;
                      const isPlayed = duration > 0 ? (progress / duration * 100) > i : false;
                      return (
                        <div
                          key={i}
                          className={`waveform-bar ${isPlayed ? 'played' : 'unplayed'}`}
                          style={{ height: `${height * 100}%` }}
                        />
                      );
                    })}
                    
                    {/* Progress indicator */}
                    <div 
                      className="waveform-progress"
                      style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                
                {/* Time display */}
                {duration > 0 && (
                  <div className="hud-time-enhanced">
                    <span className="current-time">
                      {Math.floor(progress / 60)}:{(Math.floor(progress % 60)).toString().padStart(2, '0')}
                    </span>
                    <span className="time-separator">/</span>
                    <span className="total-time">
                      {Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Song selector positioned at middle right of HUD display */}
        <div className="absolute right-2" style={{ top: inConsole ? '160px' : '200px', width: '35%' }}>
            <SongDropdown
              items={resolvedSongs}
              initialActiveId={active || resolvedSongs[0]?.id}
              onChange={(id)=>{ setActive(id); onSongChange?.(id); try { if (usePlayerStore?.getState) usePlayerStore.getState().setMain(id); } catch {} }}
            />
          </div>
        </div>


        {/* bottom-corner buttons removed per design request */}
        </motion.div>
      <style jsx>{`
        .cover-link{ display:block; border-radius:16px; outline:1px solid rgba(25,227,255,.20);
          box-shadow: 0 0 28px rgba(25,227,255,.15);
          transition: transform .15s ease, box-shadow .2s ease, outline-color .2s ease;
        }
        .cover-link:hover{
          transform: scale(1.04);
          outline-color: rgba(25,227,255,.50);
          box-shadow: 0 0 52px rgba(25,227,255,.40), 0 0 90px rgba(25,227,255,.25);
        }
        .cover-link:active{ transform: scale(.98); }
        
        /* Enhanced Media Player Styles */
        .hud-media-player {
          padding: 8px;
          background: rgba(0,0,0,.3);
          border: 1px solid rgba(25,227,255,.2);
          border-radius: 8px;
          backdrop-filter: blur(4px);
        }
        
        .hud-waveform-player{
          position: relative;
          background: rgba(25,227,255,0.25);
          border: none;
          border-top: 1px solid rgba(25,227,255,0.3);
          border-radius: 8px;
          backdrop-filter: blur(8px);
          box-shadow: 0 0 16px rgba(25,227,255,0.15);
        }
        
        .waveform-container{
          position: relative;
          height: 40px;
          display: flex;
          align-items: end;
          gap: 1px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          background: rgba(0,0,0,0.2);
        }
        
        .waveform-bar{
          flex: 1;
          min-height: 2px;
          border-radius: 1px;
          transition: all 0.1s ease;
        }
        
        .waveform-bar.played{
          background: linear-gradient(180deg, 
            rgba(25,227,255,1) 0%,
            rgba(25,227,255,0.8) 50%,
            rgba(25,227,255,1) 100%);
          box-shadow: 0 0 4px rgba(25,227,255,0.6);
        }
        
        .waveform-bar.unplayed{
          background: linear-gradient(180deg, 
            rgba(25,227,255,0.3) 0%,
            rgba(25,227,255,0.2) 50%,
            rgba(25,227,255,0.3) 100%);
        }
        
        .waveform-container:hover .waveform-bar.unplayed{
          background: linear-gradient(180deg, 
            rgba(25,227,255,0.5) 0%,
            rgba(25,227,255,0.3) 50%,
            rgba(25,227,255,0.5) 100%);
        }
        
        .waveform-progress{
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, 
            rgba(25,227,255,0.1) 0%,
            rgba(25,227,255,0.05) 100%);
          border-radius: 4px;
          pointer-events: none;
        }
        
        .hud-play-btn-enhanced{
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(25,227,255,.8);
          border: 1px solid rgba(255,255,255,.4);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 0 12px rgba(25,227,255,.4);
          flex-shrink: 0;
        }
        .hud-play-btn-enhanced:hover{
          background: rgba(25,227,255,1);
          transform: scale(1.08);
          box-shadow: 0 0 18px rgba(25,227,255,.6);
          border-color: rgba(255,255,255,.6);
        }
        .hud-play-btn-enhanced:active{
          transform: scale(0.95);
        }
        
        .hud-time-enhanced{
          font-size: 10px;
          color: rgba(25,227,255,.9);
          font-family: 'OrbitronLocal', monospace;
          text-shadow: 0 0 6px rgba(25,227,255,.5);
          letter-spacing: 0.03em;
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .current-time {
          color: rgba(25,227,255,1);
        }
        .time-separator {
          color: rgba(25,227,255,.6);
          margin: 0 2px;
        }
        .total-time {
          color: rgba(25,227,255,.7);
        }
        
        .hud-progress-bar-enhanced{
          position: relative;
          width: 100%;
          height: 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          --hover-position: 0%;
        }
        
        .progress-track {
          position: absolute;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,.5);
          border: 1px solid rgba(25,227,255,.3);
          border-radius: 6px;
          overflow: hidden;
        }
        
        .hud-progress-fill-enhanced{
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: linear-gradient(90deg, rgba(25,227,255,.9), rgba(25,227,255,.7));
          border-radius: 6px;
          transition: width 0.1s ease;
          box-shadow: 0 0 8px rgba(25,227,255,.5);
          z-index: 2;
        }
        
        .progress-hover-indicator {
          position: absolute;
          left: var(--hover-position);
          top: 0;
          width: 2px;
          height: 100%;
          background: rgba(255,255,255,.8);
          opacity: 0;
          transition: opacity 0.15s ease;
          z-index: 3;
          transform: translateX(-50%);
        }
        
        .hud-progress-bar-enhanced:hover .progress-hover-indicator {
          opacity: 1;
        }
        
        .progress-handle {
          position: absolute;
          top: 50%;
          width: 16px;
          height: 16px;
          background: rgba(25,227,255,1);
          border: 2px solid rgba(255,255,255,.8);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 10px rgba(25,227,255,.6);
          z-index: 4;
          transition: left 0.1s ease, transform 0.15s ease;
        }
        
        .hud-progress-bar-enhanced:hover .progress-handle {
          transform: translate(-50%, -50%) scale(1.2);
        }
        
        /* Beam animations removed */
      `}</style>
      {showCard ? (
        <div
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center"
          style={{ padding: '6vh 5vw' }}
          onClick={() => {
            try { sfx.play('/audio/close.mp3', 0.7); } catch {}
            try { const a = closeCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {}
            setShowCard(false);
            // Dispatch event to notify DashboardApp that card modal closed
            const event = new CustomEvent('hideCoverCard');
            window.dispatchEvent(event);
          }}
        >
          <div
            className="relative rounded-2xl p-4 card-modal"
            onClick={(e)=> e.stopPropagation()}
          >
            {(() => {
              try {
                const home = !currentId;
                const slug = home ? '' : (track?.slug || active || '');
                // Map track slugs to purchase links
                const BUY_LINKS = {
                  'alone': 'https://buy.stripe.com/dRmfZiclr5l3e3Ddll4gg0i',
                  'always-on-my-mind': 'https://buy.stripe.com/9B6cN61GN28R0cN5ST4gg04',
                  'baby': 'https://buy.stripe.com/aFacN64SZ4gZcZz8114gg0a',
                  'be-my-bee-acoustic': 'https://buy.stripe.com/aFacN64SZ4gZcZz8114gg0a',
                  'brain-freeze': 'https://buy.stripe.com/8x2aEYfxD00JcZza994gg0h',
                  'collide': 'https://buy.stripe.com/7sY3cw5X3fZH0cN0yz4gg05',
                  'colors-of-our-home': 'https://buy.stripe.com/5kQ00k2KRfZH9Nn1CD4gg0j',
                  'i-might-fall-in-love-with-you': 'https://buy.stripe.com/aFa8wQdpv7tb1gR1CD4gg0c',
                  'kid-forever': 'https://buy.stripe.com/00wfZibhnfZH4t3dll4gg0g',
                  'letting-go': 'https://buy.stripe.com/3cI9AU85b00J9Nna994gg0d',
                  'mr-brightside': 'https://buy.stripe.com/8x25kEetz8xf0cN8114gg02',
                  'mr-brightside-killers-cover': 'https://buy.stripe.com/8x25kEetz8xf0cN8114gg02',
                  'ocean-girl': 'https://buy.stripe.com/dRmbJ24SZ00J6Bb9554gg00',
                  'ocean-girl-acoustic': 'https://buy.stripe.com/aFaeVeclr28R3oZftt4gg09',
                  'ocean-girl-remix': 'https://buy.stripe.com/dRmeVeetz8xf0cNchh4gg08',
                  'somebody-to-love': 'https://buy.stripe.com/4gM00kgBH4gZaRr1CD4gg0e',
                  'tienes-un-amigo': 'https://buy.stripe.com/cNibJ2gBH3cV8Jjgxx4gg0f',
                  'were-just-friends': 'https://buy.stripe.com/14A14o99fbJrbVv8114gg0b',
                  'were-just-friends-mickey-jas-remix': 'https://buy.stripe.com/aFa5kE3OV14N3oZchh4gg06',
                  'were-just-friends-dmvrco-remix': 'https://buy.stripe.com/28EdRa0CJ5l38Jj9554gg03',
                };
                const url = slug ? BUY_LINKS[slug] : (home ? 'https://buy.stripe.com/cNi14oetz6p76Bbgxx4gg0k' : undefined);
                if (url) {
                  return (
                    <div className="mb-3 flex justify-center">
                      <div className="ocean-cta-wrap relative">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ocean"
                          title="Collect this card"
                          onClick={(e) => {
                            try { e.preventDefault(); } catch {}
                            try { sfx.play('click', 0.6); } catch {}
                            try {
                              const el = e.currentTarget;
                              el.classList.remove('is-rippling');
                              // force reflow to restart animation
                              // @ts-ignore
                              void el.offsetWidth;
                              el.classList.add('is-rippling');
                              setTimeout(() => { window.open(el.href, '_blank', 'noopener,noreferrer'); }, 520);
                            } catch { window.open((e.currentTarget || {}).href, '_blank', 'noopener,noreferrer'); }
                          }}
                        >
                          <span className="btn-label">COLLECT CARD</span>
                          <span className="btn-ripple" aria-hidden />
                        </a>
                      </div>
                    </div>
                  );
                }
              } catch {}
              return null;
            })()}
            <div className="tilt-wrap">
              <div className="card-frame">
                <div 
                  className="card-flip-container"
                  style={{
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={() => { 
                    try { sfx.play('flip', 0.3); } catch {} 
                    setCardFlipped(!cardFlipped); 
                  }}
                >
                  <div 
                    className="card-flip-inner"
                    style={{
                      transition: 'transform 0.7s ease-in-out',
                      transformStyle: 'preserve-3d',
                      transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* Front side */}
                    <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}>
                      {(() => {
                        const home = !currentId;
                        const slug = home ? '' : (track?.slug || active || '');
                        const CARD_OVERRIDES = {
                          "were-just-friends": "/card/we're-just-friends.png",
                          "were-just-friends-dmvrco-remix": "/card/we're-just-friends-dmvrco-remix.png",
                          "were-just-friends-mickey-jas-remix": "/card/we're-just-friends-mickey jas-remix.png",
                          "mr-brightside": "/card/mr.brightside.png",
                          "tienes-un-amigo": "/card/tienes-un-amigo-acqi.png",
                        };
                        const explicitCard = slug ? (CARD_OVERRIDES[slug] || `/card/${slug}.png`) : '';
                        const cardSrc = home ? DEFAULT_CARD : (explicitCard || track?.cover || FALLBACK_COVER);
                        return (
                          <img
                            src={cardSrc}
                            alt={(track?.title)||'Card'}
                            className="tilt-img"
                            data-fallback="0"
                            onError={(e)=>{
                              try {
                                const el = e.currentTarget;
                                const tried = Number((el.dataset && el.dataset.fallback) || '0');
                                if (home) { el.src = '/card/BUSINESS CARD.png'; if (el.dataset) el.dataset.fallback = '2'; return; }
                                if (tried === 0 && slug) {
                                  el.src = `/generated/${slug}-album-card.png`;
                                  if (el.dataset) el.dataset.fallback = '1';
                                  return;
                                }
                                el.src = track?.cover || DEFAULT_COVER;
                                if (el.dataset) el.dataset.fallback = '2';
                              } catch {}
                            }}
                          />
                        );
                      })()} 
                    </div>
                    {/* Back side */}
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                    >
                      <img
                        src="/card/back.png"
                        alt="Card back"
                        className="tilt-img"
                      />
                    </div>
                  </div>
                </div>
                <span className="frame-sheen" aria-hidden />
              </div>
            </div>
            {/* Streaming buttons removed per request */}
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                try { sfx.play('/audio/close.mp3', 0.7); } catch {}
                try { const a = closeCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {}
                setShowCard(false);
                // Dispatch event to notify DashboardApp that card modal closed
                const event = new CustomEvent('hideCoverCard');
                window.dispatchEvent(event);
              }}
              className="absolute -top-3 -right-3 rounded-full bg-[#19E3FF] text-black font-bold w-8 h-8 shadow-[0_0_20px_rgba(25,227,255,0.8)]"
              title="Close"
            >×</button>
          </div>
        </div>
      ) : null}
      <style jsx>{`
        .card-modal{
          max-width: min(60vw, 360px);
          background: rgba(25,227,255,0.25);
          box-shadow: 0 0 60px rgba(25,227,255,0.25), inset 0 0 0 1px rgba(25,227,255,0.20);
        }
        .tilt-wrap{ perspective: 1200px; transform-style: preserve-3d; }
        .card-frame{
          position:relative; border-radius: 16px; padding: 8px; background: rgba(0,0,0,.35);
          outline: 1px solid rgba(25,227,255,.4);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), 0 0 36px rgba(25,227,255,.35);
        }
        .tilt-img{
          width: 100%; height: auto; display:block; object-fit: contain;
          transform: rotateX(10deg) rotateY(-10deg) translateZ(0);
          filter: saturate(1.06) contrast(1.06) brightness(1.04)
            drop-shadow(0 0 18px rgba(25,227,255,0.55)) drop-shadow(0 0 36px rgba(25,227,255,0.35));
          animation: tiltPulse 3s ease-in-out infinite;
          border-radius: 14px;
        }
        .frame-sheen{ position:absolute; inset: 6px; border-radius: 12px; pointer-events:none;
          background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,0) 60%);
          mix-blend-mode: screen; opacity:.6;
        }
        .tilt-img:hover{ animation-duration: 2.2s; }
        @keyframes tiltPulse{
          0%,100% { transform: rotateX(9deg) rotateY(-9deg) scale(1); }
          50%      { transform: rotateX(13deg) rotateY(-13deg) scale(1.04); }
        }
        .btn-stream{
          display:inline-block; padding: 8px 12px; border-radius: 12px; color:#001014; font-weight:700;
          border: 1px solid rgba(255,255,255,.25);
          text-shadow: 0 1px 0 rgba(255,255,255,.6);
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease;
        }
        .btn-stream:active{ transform: scale(.98); }
        /* Brand variants */
        .btn-spotify{ background: radial-gradient(100% 100% at 50% 30%, rgba(210,255,225,1), #1DB954); box-shadow: 0 0 24px rgba(29,185,84,.55), inset 0 2px 0 rgba(255,255,255,.55), inset 0 -6px 14px rgba(0,0,0,.25); }
        .btn-spotify:hover{ transform: translateZ(0) scale(1.04); box-shadow: 0 0 32px rgba(29,185,84,.8), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -6px 16px rgba(0,0,0,.3); filter: saturate(1.05) brightness(1.03); }
        .btn-apple{ background: radial-gradient(100% 100% at 50% 30%, rgba(255,210,210,1), #FF3B30); box-shadow: 0 0 24px rgba(255,59,48,.55), inset 0 2px 0 rgba(255,255,255,.55), inset 0 -6px 14px rgba(0,0,0,.25); }
        .btn-apple:hover{ transform: translateZ(0) scale(1.04); box-shadow: 0 0 32px rgba(255,59,48,.8), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -6px 16px rgba(0,0,0,.3); filter: saturate(1.05) brightness(1.03); }
        /* Ocean Girl purchase button */
        .ocean-cta-wrap{ position:relative; }
        .btn-ocean{
          position:relative; display:inline-grid; place-items:center;
          padding: 8px 12px; border-radius: 10px; font-weight:800; letter-spacing:.06em; font-size: 12px;
          color:#001014; text-transform:uppercase; font-family: InterLocal, system-ui, sans-serif;
          background: radial-gradient(100% 100% at 50% 20%, rgba(210,255,255,0.95), #19E3FF);
          border: 1px solid rgba(255,255,255,.24);
          box-shadow: 0 0 20px rgba(25,227,255,.55), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -8px 16px rgba(0,0,0,.22);
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease;
          overflow:hidden;
        }
        .btn-ocean:hover{
          transform: translateZ(0) scale(1.05);
          box-shadow:
            0 0 36px rgba(25,227,255,.95),
            0 0 80px rgba(25,227,255,.55),
            inset 0 2px 0 rgba(255,255,255,.7),
            inset 0 -10px 18px rgba(0,0,0,.28);
          filter: saturate(1.08) brightness(1.07);
          animation: oceanGlow 1.8s ease-in-out infinite;
        }
        .btn-ocean:active{ transform: scale(.98); }
        @keyframes oceanGlow {
          0%, 100% { box-shadow: 0 0 36px rgba(25,227,255,.95), 0 0 80px rgba(25,227,255,.55), inset 0 2px 0 rgba(255,255,255,.7), inset 0 -10px 18px rgba(0,0,0,.28); }
          50% { box-shadow: 0 0 52px rgba(25,227,255,1), 0 0 110px rgba(25,227,255,.7), inset 0 2px 0 rgba(255,255,255,.75), inset 0 -12px 20px rgba(0,0,0,.3); }
        }
        /* Ripple light pass on click */
        .btn-ripple{ position:absolute; inset:-10%; border-radius:inherit; pointer-events:none; opacity:0;
          background: radial-gradient(closest-side, rgba(255,255,255,.85), rgba(25,227,255,.45) 40%, rgba(25,227,255,0) 60%);
          filter: blur(1px);
        }
        .btn-ocean.is-rippling .btn-ripple{ animation: og-ripple 520ms ease-out 1; }
        @keyframes og-ripple{
          0% { opacity:.7; transform: scale(.5); }
          60% { opacity:.25; transform: scale(1.6); }
          100% { opacity:0; transform: scale(2.2); }
        }
        /* (flicker effect removed) */
      `}</style>
      <audio ref={hoverCoverRef} preload="auto">
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={clickCoverRef} src="/audio/click.mp3" preload="auto" />
      <audio ref={closeCoverRef} src="/audio/close.mp3" preload="auto" />
      </div>
    </motion.section>
  );
}
