"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import HoloHubMenu from "@/components/HoloHubMenu";
import LumaKeyVideo from "@/components/LumaKeyVideo";
import HoloJoinButton from "@/components/HoloJoinButton";
import JoinAliens from "@/components/JoinAliens";
import { LINKS } from "@/config/cockpit";

export default function SteeringWheelOverlay({
  onLaunch,
  POS,
  playing,
  showUI = true,
  onPowerToggle,
  onJoinToggle,
  onBeamColorChange,
  closeAllSignal = 0,
  suspendUI = false,
}: {
  onLaunch: () => void;
  POS: any;
  playing?: boolean;
  showUI?: boolean;
  onPowerToggle?: () => void;
  onJoinToggle?: (showJoin: boolean) => void;
  onBeamColorChange?: (color: 'blue' | 'yellow' | 'pink' | 'off') => void;
  // When incremented, force-close any open displays/menus (e.g., during warp)
  closeAllSignal?: number;
  // Temporarily hide/fade overlay panels (e.g., during warp)
  suspendUI?: boolean;
}) {
  const pauseRef = useRef<HTMLAudioElement|null>(null);
  const hoverRef = useRef<HTMLAudioElement|null>(null);
  const buttonRef = useRef<HTMLAudioElement|null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [activeBeamColor, setActiveBeamColor] = useState<'blue' | 'yellow' | 'pink'>('blue');
  const [mounted, setMounted] = useState(false);

  // Set mounted after component mounts to prevent immediate hover sounds
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Notify parent when showJoin changes
  useEffect(() => {
    onJoinToggle?.(showJoin);
  }, [showJoin, onJoinToggle]);

  // Notify parent when beam color changes without coupling to callback identity
  const onBeamColorChangeRef = useRef<typeof onBeamColorChange>();
  useEffect(() => { onBeamColorChangeRef.current = onBeamColorChange; }, [onBeamColorChange]);
  const prevBeamColorRef = useRef<typeof activeBeamColor | null>(null);
  const didMountRef = useRef(false);
  useEffect(() => {
    // Skip notifying parent on initial mount to avoid auto-enabling the blue display/beam
    if (!didMountRef.current) {
      didMountRef.current = true;
      prevBeamColorRef.current = activeBeamColor;
      return;
    }
    if (prevBeamColorRef.current === activeBeamColor) return;
    prevBeamColorRef.current = activeBeamColor;
    try { onBeamColorChangeRef.current?.(activeBeamColor); } catch {}
  }, [activeBeamColor]);
  const joinFormRef = useRef<HTMLDivElement|null>(null);

  // Display management handled inline by button handlers

  // Close join form when clicking outside (but not on the join alien button itself)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showJoin && joinFormRef.current && !joinFormRef.current.contains(event.target as Node)) {
        // Check if the click was on a join alien button - if so, let the button handle it
        const target = event.target as Element;
        const isJoinButton = target?.closest('[aria-label="Join Alien Display"]') || 
                            target?.closest('.join-wrap') ||
                            target?.getAttribute('aria-label') === 'Join Alien Display';
        
        if (!isJoinButton) {
          setShowJoin(false);
        }
      }
    }
    
    if (showJoin) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showJoin]);

  // On external close signal (warp start), close pink join panel and reset local beam tint
  useEffect(() => {
    setShowJoin(false);
    setActiveBeamColor('blue');
  }, [closeAllSignal]);

  function handleLaunch() {
    const willPause = !!playing;
    // Trigger toggle action first so downstream can open streaming links within a user gesture
    try { onLaunch(); } catch {}
    // Then play context-appropriate SFX without blocking the gesture
    // Remove launch sound on start press; keep pause sound only when pausing
    try {
      if (willPause) {
        const a = pauseRef.current;
        if (a) { a.currentTime = 0; a.volume = 0.95; a.play().catch(()=>{}); }
      }
    } catch {}
    // Do not toggle main track audio on Start. Playback is controlled via song selection.
  }

  const handleJoinAlienToggle = useCallback(() => {
    if (!showUI) return;
    
    // Play button sound
    try {
      const a = buttonRef.current;
      if (a) { a.currentTime = 0; a.volume = 0.95; a.play().catch(()=>{}); }
    } catch {}
    
    // Simple toggle: only control pink display and beam
    if (showJoin) {
      // Close pink display without auto-opening blue display
      setShowJoin(false);
      setActiveBeamColor('blue'); // local state back to blue tint
      onBeamColorChange?.('off'); // tell parent to turn displays off, not open blue
    } else {
      // Open pink display
      setShowJoin(true);
      setActiveBeamColor('pink');
      onBeamColorChange?.('pink');
    }
  }, [showJoin, onBeamColorChange, showUI]);

  // Helper function to get responsive values
  const getResponsiveValue = (config: any) => {
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
  // Get responsive play button configuration
  const ppConfig = getResponsiveValue(wheel.play) || { topVh: lp.topVh, leftVw: lp.leftVw, sizePx: Math.round(lp.sizePx * 0.9) };
  const pp = ppConfig;
  // Get responsive wheel video configuration
  const vconf = getResponsiveValue(wheel.video) || { scale: 1.0, offsetVh: 0, offsetVw: 0, centerHoriz: true, debug: false };
  // Viewport-aware scaling for wheel video, start button, and hub buttons
  const [vmin, setVmin] = useState<number>(() => {
    if (typeof window === 'undefined') return 800;
    return Math.min(window.innerWidth, window.innerHeight);
  });
  useEffect(() => {
    const onResize = () => setVmin(Math.min(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  // Scale targets tuned for typical desktop/tablet/phone ranges
  // Larger defaults to match the original wheel visual size
  const startSize = Math.round(clamp(vmin * 0.14, 64, 180)); // START button diameter
  // Make wheel responsive on small screens: lower min and slightly reduce scale factor
  const vs = Math.round(clamp(vmin * 0.70, 280, 980));       // wheel.mp4 square size
  const yellowHubSize = Math.round(clamp(vmin * 0.085, 56, 112));
  const yellowItemSize = Math.round(clamp(vmin * 0.095, 58, 120));
  // Unified responsive offsets so all three buttons (blue/yellow/pink)
  // stay aligned and symmetric across screen sizes
  const buttonOffsetPx = Math.round(clamp(vmin * 0.12, 72, 140));
  const buttonsBottomPercent = (() => {
    if (typeof window === 'undefined') return 31;
    const w = window.innerWidth;
    if (w <= 420) return 28; // slightly lower on small phones
    if (w <= 768) return 29; // tablets/large phones
    return 31;               // desktop
  })();

  // START button variant flag (legacy "boost" fully removed)
  const isStart = Boolean(
    (POS?.wheel && ((POS.wheel as any).start || (POS.wheel as any).startButton)) ||
    process.env.NEXT_PUBLIC_START_BUTTON === '1' ||
    process.env.NEXT_PUBLIC_PLAY_BUTTON_STYLE === 'start'
  );

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden
      suppressHydrationWarning
      style={{
        position: 'absolute', inset: 0, zIndex: 80, pointerEvents: 'none',
        // Shared CSS vars so other components can align to the button baseline responsively
        ['--buttons-bottom' as any]: `${buttonsBottomPercent}%`,
        ['--button-offset-px' as any]: `${buttonOffsetPx}px`,
        ['--panel-gap-px' as any]: `${Math.round(yellowHubSize * 0.7)}px`,
        ['--hud-offset-px' as any]: `10px`,
      }}
    >
      {/* Wheel video projection aligned to cockpit wheel area */}
      <div
        style={{
          position: "absolute",
          // Move wheel slightly down from bottom of screen
          bottom: "-5vh",
          left: vconf.centerHoriz
            ? `calc(50vw - ${vs/2}px)`
            : `calc(${(pp.leftVw + (vconf.offsetVw || 0))}vw - ${vs/2}px)`,
          width: vs,
          height: vs,
          transform: "none",
          // Do not mask/clamp — allow hands to extend beyond the wheel
          borderRadius: undefined,
          overflow: "visible",
          zIndex: 60,
          outline: vconf.debug ? "1px dashed rgba(25,227,255,0.6)" : undefined,
          background: vconf.debug ? "rgba(25,227,255,0.08)" : "transparent",
          // Allow hiding via config if needed, default to visible
          display: (vconf as any)?.hidden ? 'none' as const : undefined,
        }}
      >
        {/* Wheel video with luma key: remove black background; no circle crop, allow hands to extend. */}
        <LumaKeyVideo
          srcMp4="/cockpit/wheel.mp4"
          srcAlt="/wheel.mp4"
          threshold={(vconf as any)?.threshold ?? 0.03}
          softness={(vconf as any)?.softness ?? 0.015}
          saturation={(vconf as any)?.saturation ?? 1.0}
          contrast={(vconf as any)?.contrast ?? 1.1}
          offsetYRatio={0}
          className="block"
          style={{
            display: 'block',
            width: vs,
            height: vs,
            pointerEvents: 'none',
            background: 'transparent',
            // Render at 1:1 scale to preserve intended size
            transform: 'scale(1.0)',
            transformOrigin: 'bottom center',
          }}
        />
      </div>
      {/* Power Button - centered */}
      <div
        style={{
          position: "absolute",
          bottom: `${buttonsBottomPercent}%`, // Unified vertical baseline
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 92,
          pointerEvents: showUI ? 'auto' : 'none',
          opacity: showUI ? 1 : 0,
          // Match beam (400ms) and HUD (300ms) fade timing
          transition: 'opacity 350ms ease',
        }}
      >
        {(() => {
          const powerCfg: any = getResponsiveValue((POS?.wheel as any)?.power) || {};
          const powerSize: number = typeof powerCfg.sizePx === 'number' ? powerCfg.sizePx : 60;
          return (
            <div style={{ pointerEvents: 'auto' }}>
              {onPowerToggle ? (
                <button
                  type="button"
                  className={`power-btn ${activeBeamColor === 'blue' && showUI ? 'power-btn-active' : ''}`}
                  onMouseEnter={() => { if (!showUI || !mounted) return; try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
                  onClick={() => {
                    if (!showUI) return;
                    // Play button sound
                    try {
                      const a = buttonRef.current;
                      if (a) { a.currentTime = 0; a.volume = 0.95; a.play().catch(()=>{}); }
                    } catch {}
                    
                    // Always ensure beam turns blue when blue button is clicked
                    setActiveBeamColor('blue');
                    onBeamColorChange?.('blue');
                    
                    // Toggle the blue display
                    onPowerToggle?.();
                  }}
                  aria-label="Power"
                  title="Power"
                  style={{
                    width: powerSize, 
                    height: powerSize, 
                    borderRadius: 9999,
                    opacity: 1,
                    transition: 'opacity 300ms ease, transform 150ms ease, box-shadow 200ms ease, filter 180ms ease',
                    pointerEvents: 'auto',
                  }}
                >
                  <span className="sr-only">Power Button</span>
                  <span className="power-glyph" aria-hidden>
                    <img src="/elements/power.png" alt="" className="power-icon" onError={(e)=>{ try { const img = e.currentTarget; img.onerror = null; img.src = '/elements/lightning.png'; } catch {} }} />
                  </span>
                </button>
              ) : null}
            </div>
          );
        })()}
      </div>

      {/* Comms Button - yellow hub positioned slightly to the right of center */}
      <div
        style={{
          position: "absolute",
          bottom: `${buttonsBottomPercent}%`, // Same vertical level as blue button
          left: `calc(50% - ${buttonOffsetPx}px)`, // Full offset to the left of center
          transform: 'translateX(-50%)',
          zIndex: 92,
          pointerEvents: showUI ? 'auto' : 'none',
          opacity: showUI ? 1 : 0,
          // Match beam (400ms) and HUD (300ms) fade timing
          transition: 'opacity 350ms ease',
        }}
      >
        {(() => {
          return (
            <div style={{ pointerEvents: 'auto' }}>
              <HoloHubMenu
                items={[
                LINKS.instagram ? { id: 'ig', label: 'Instagram', href: LINKS.instagram, icon: '/elements/instagram.png', color: '#E1306C' } : null,
                LINKS.tiktok ? { id: 'tt', label: 'TikTok', href: LINKS.tiktok, icon: '/elements/tiktok.png', color: '#69C9D0' } : null,
                LINKS.youtube ? { id: 'yt', label: 'YouTube', href: LINKS.youtube, icon: '/elements/youtube.png', color: '#FF0000' } : null,
                LINKS.spotify ? { id: 'sp', label: 'Spotify', href: LINKS.spotify, icon: '/elements/spotify.png', color: '#1DB954' } : null,
                LINKS.apple ? { id: 'am', label: 'Apple Music', href: LINKS.apple, icon: '/elements/apple.png', color: '#FA2D48' } : null,
              ].filter(Boolean) as any}
                radius={Math.round(clamp(vmin * 0.09, 48, 120))}
                hubColor={activeBeamColor === 'yellow' ? "#F2EF1D" : "#F2EF1D"}
                isActive={activeBeamColor === 'yellow'}
                itemSize={yellowItemSize}
                hubSize={yellowHubSize}
                angles={{ sp: -36, am: -18, ig: 0, tt: 18, yt: 36 }}
                anchorBottomPercent={buttonsBottomPercent}
                anchorOffsetPx={buttonOffsetPx}
                closeSignal={closeAllSignal}
                suspend={suspendUI}
                onToggle={(isOpen) => {
                  if (!showUI) return;
                  if (isOpen) {
                    // Play button sound
                    try {
                      const a = buttonRef.current;
                      if (a) { a.currentTime = 0; a.volume = 0.95; a.play().catch(()=>{}); }
                    } catch {}
                    // Close other displays first (especially blue display)
                    if (showUI) {
                      onPowerToggle?.(); // This will close the blue display
                    }
                    // Set yellow beam
                    setActiveBeamColor('yellow');
                    onBeamColorChange?.('yellow');
                  } else {
                    // Menu is closing: turn displays off without auto-opening blue
                    if (activeBeamColor === 'yellow') {
                      setActiveBeamColor('blue');
                      onBeamColorChange?.('off');
                    }
                  }
                }}
              />
            </div>
          );
        })()}
      </div>

      {/* Join Alien Button - positioned to the right of power button */}
      <div
        style={{
          position: "absolute",
          bottom: `${buttonsBottomPercent}%`, // Same level as power button
          left: `calc(50% + ${buttonOffsetPx}px)`, // Symmetric horizontal offset to the right
          transform: 'translateX(-50%)',
          zIndex: 92,
          pointerEvents: showUI ? 'auto' : 'none',
          opacity: showUI ? 1 : 0,
          // Match beam (400ms) and HUD (300ms) fade timing
          transition: 'opacity 350ms ease',
        }}
      >
        {(() => {
          const joinSize: number = Math.round(clamp(vmin * 0.085, 56, 112));
          return (
            <div style={{ pointerEvents: 'auto' }}>
              <HoloJoinButton 
                size={joinSize} 
                label="Join Alien Display" 
                iconSrc="/elements/join.png" 
                hubColor={activeBeamColor === 'pink' ? "#FC54AF" : "#FC54AF"}
                isActive={activeBeamColor === 'pink'} 
                onClick={handleJoinAlienToggle}
              />
            </div>
          );
        })()}
      </div>

      {/* Separate Join Aliens Form - bottom should touch the light beam top */}
      {(() => {
        // Position pink display using unified touch point system
        const beamBottomCss = 'var(--display-touch-top)';
        return (
          <div
            ref={joinFormRef}
            style={{
              position: "fixed",
              // Bottom directly at beam top
              bottom: beamBottomCss,
              // Center horizontally in the viewport (always centered)
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 93,
              pointerEvents: showJoin && !suspendUI ? 'auto' : 'none',
              opacity: showJoin && !suspendUI ? 1 : 0,
              // Match surrounding UI fade for consistency
              transition: 'opacity 350ms ease',
            }}
          >
            {/* Join form panel */}
            <div
              style={{
                width: 'var(--display-width)', // Responsive width using breakpoint variables
                borderRadius: 'var(--display-border-radius)',
                padding: '12px',
                color: '#fff',
                background: `
                  linear-gradient(180deg, #FC54AF44, #FC54AF26),
                  radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%),
                  linear-gradient(180deg, rgba(0,0,0,.65), rgba(0,0,0,.55))
                `,
                border: '1px solid #FC54AF66',
                boxShadow: `
                  0 18px 36px rgba(0,0,0,.5), 
                  0 0 42px #FC54AFAA, 
                  0 0 100px #FC54AF55, 
                  inset 0 2px 0 rgba(255,255,255,.2), 
                  inset 0 -6px 14px rgba(0,0,0,.6)
                `,
                backdropFilter: 'blur(10px)',
                animation: 'pinkPanelPulse 2.6s ease-in-out infinite',
              }}
            >
              <JoinAliens />
            </div>
          </div>
        );
      })()}





      {/* Start button positioned directly on top of the wheel */}
      <button
        onClick={handleLaunch}
        className={`pointer-events-auto wheel-play${isStart ? ' chx' : ''}`}
        style={{
          position: "absolute",
          // Position directly on top of the wheel surface
          // Move the START button slightly lower for better alignment
          bottom: `calc(-5vh + ${vs * 0.3}px - 32px)`,
          left: '50%',
          // Slightly larger start button for better prominence
          width: startSize * 1.02,
          height: startSize * 1.02,
          borderRadius: 9999,
          transform: `translate(-50%, 0)`,
          zIndex: 90,
        }}
        onMouseEnter={() => { if (!mounted) return; try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
        aria-label={isStart ? "Start" : (playing ? "Pause" : "Play")}
        title={isStart ? "Start" : (playing ? "Pause" : "Play")}
      >
        {/* No outer ring for START icon variant */}
        {/* Ring removed for START variant and standard play/pause */}
        <span className="glyph" aria-hidden>
          {isStart ? (
            <img
              src="/elements/start.png?v=20250915c"
              alt="Start"
              className="chx-icon"
              onError={(e) => { try { const img = e.currentTarget; img.onerror = null; img.src = '/elements/start.png'; } catch {} }}
            />
          ) : (
            playing ? (
              <svg viewBox="0 0 24 24" width="52" height="52" fill="currentColor">
                <rect x="6.5" y="5.5" width="4.2" height="13" rx="1.2" />
                <rect x="13.3" y="5.5" width="4.2" height="13" rx="1.2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="52" height="52" fill="currentColor">
                <path d="M7 5l12 7-12 7z" />
              </svg>
            )
          )}
        </span>
      </button>

      <style jsx>{`
        .wheel-play {
          position: relative;
          display:grid; place-items:center; font-size:22px; font-weight:700; color:#00ffd0;
          /* Transparent face: remove dark circle behind the wheel */
          background: transparent;
          border:1px solid rgba(255,255,255,.18);
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease;
          overflow: visible;
        }
        /* CHXNDLER element variant: icon-only, transparent background */
        .wheel-play.chx{
          background: transparent !important;
          border: none !important;
          position: relative;
          cursor: pointer;
          transform: translateZ(0);
          will-change: transform, box-shadow;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        /* No halo/glow behind the START icon */
        .wheel-play.chx::before{ display:none; content:none; }
        .wheel-play.chx::after{ display:none; content:none; }
        .chx-icon{ width: 92%; height: 92%; object-fit: contain; display:block; will-change: transform, filter;
          filter: 
            drop-shadow(0 2px 4px rgba(0,0,0,0.3))
            drop-shadow(0 4px 8px rgba(0,0,0,0.2))
            drop-shadow(0 0 12px rgba(25,227,255,0.4));
          animation: none;
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .wheel-play.chx:hover .chx-icon{ 
          animation: none; 
          transform: scale(1.06) translateY(-2px); 
          filter: 
            drop-shadow(0 4px 8px rgba(0,0,0,0.4))
            drop-shadow(0 8px 16px rgba(0,0,0,0.3))
            drop-shadow(0 0 20px rgba(25,227,255,0.6))
            drop-shadow(0 0 40px rgba(25,227,255,0.4));
        }
        .wheel-play.chx:hover::after{ display:none; }
        @keyframes startPulse {
          0%, 100% { transform: scale(1); filter: saturate(1.25) brightness(1.1) drop-shadow(0 0 8px #19E3FF) drop-shadow(0 0 22px #19E3FF) drop-shadow(0 0 42px #19E3FF); }
          50% { transform: scale(1.08); filter: saturate(1.5) brightness(1.22) drop-shadow(0 0 16px #19E3FF) drop-shadow(0 0 40px #19E3FF) drop-shadow(0 0 84px #19E3FF); }
        }
        @keyframes startHalo {
          0%, 100% { box-shadow: 0 0 36px rgba(25,227,255,.65), 0 0 80px rgba(25,227,255,.45); }
          50% { box-shadow: 0 0 56px rgba(25,227,255,.85), 0 0 120px rgba(25,227,255,.65); }
        }
        /* START variant: warm red/orange glow and plume */
        .wheel-play.start{
          color:#fff;
          background: transparent;
          box-shadow:
            0 0 36px rgba(255,59,48,.95),
            0 0 120px rgba(255,59,48,.55),
            inset 0 2px 0 rgba(255,255,255,.45),
            inset 0 0 40px rgba(255,92,72,.38);
          animation: breathe 1.8s ease-in-out infinite;
        }
        @keyframes breathe { 0%{ filter: brightness(1) } 50%{ filter: brightness(1.08) } 100%{ filter: brightness(1) } }
        /* Outer glow ring */
        .wheel-play .ring{ position:absolute; inset:-16%; border-radius:9999px; pointer-events:none;
          box-shadow: 0 0 0 2px rgba(255,59,48,.28), 0 0 34px rgba(255,59,48,.55), 0 0 90px rgba(255,59,48,.45);
          animation: ringPulse 1.6s ease-in-out infinite;
        }
        @keyframes ringPulse { 0%{ transform: scale(.96); opacity:.85 } 50%{ transform: scale(1); opacity:1 } 100%{ transform: scale(.96); opacity:.85 } }
        /* Nozzle inner rim */
        .wheel-play::before{
          content:""; position:absolute; inset:8%; border-radius:9999px; pointer-events:none;
          box-shadow: inset 0 0 0 2px rgba(0,255,180,.25), inset 0 0 30px rgba(0,255,180,.25), inset 0 -8px 18px rgba(0,0,0,.5);
          background: radial-gradient(70% 70% at 50% 40%, rgba(114,255,220,.12), rgba(0,0,0,0) 70%);
        }
        .wheel-play.start::before{
          box-shadow: inset 0 0 0 2px rgba(255,59,48,.35), inset 0 0 36px rgba(255,120,100,.35), inset 0 -10px 18px rgba(0,0,0,.5);
          background: radial-gradient(70% 70% at 50% 40%, rgba(255,140,120,.16), rgba(0,0,0,0) 70%);
        }
        /* Exhaust plume shooting rightwards */
        .wheel-play::after{
          content:""; position:absolute; left:48%; top:30%; width:160%; height:40%; border-radius:9999px; pointer-events:none;
          background:
            radial-gradient(80% 70% at 0% 50%, rgba(255,255,255,1), rgba(255,255,255,0) 60%),
            radial-gradient(90% 80% at 0% 50%, rgba(114,255,255,.95), rgba(114,255,255,0) 70%),
            radial-gradient(100% 90% at 0% 50%, rgba(25,227,255,.75), rgba(25,227,255,0) 75%);
          filter: blur(9px) saturate(1.25) brightness(1.1);
          mix-blend-mode: screen;
          transform-origin: 0% 50%;
          animation: plume 1.1s ease-in-out infinite alternate;
        }
        .wheel-play.start::after{
          background:
            radial-gradient(80% 70% at 0% 50%, rgba(255,255,255,1), rgba(255,255,255,0) 60%),
            radial-gradient(90% 80% at 0% 50%, rgba(255,180,120,.95), rgba(255,180,120,0) 70%),
            radial-gradient(100% 90% at 0% 50%, rgba(255,59,48,.85), rgba(255,59,48,0) 75%);
        }
        @keyframes plume {
          0% { transform: scaleX(0.9) translateX(0); opacity: .75; filter: blur(10px) saturate(1.2); }
          100%{ transform: scaleX(1.15) translateX(4px); opacity: 1; filter: blur(8px) saturate(1.35); }
        }
        /* inner icon glow, like the logo-glow on other buttons */
        .glyph{ display:inline-flex; align-items:center; justify-content:center; transform: translateY(1px); }
        .start-label{ font-family: OrbitronLocal, InterLocal, system-ui, sans-serif; font-weight: 900; font-size: 18px; letter-spacing: 0.14em; color:#fff; text-transform: uppercase;
          text-shadow: 0 0 10px rgba(255,59,48,1), 0 0 34px rgba(255,59,48,.8), 0 0 64px rgba(255,59,48,.55);
        }
        .wheel-play:hover {
          transform: scale(1.04);
          box-shadow: 0 14px 36px rgba(0,0,0,.6), 0 0 44px rgba(0,255,200,.95), 0 0 110px rgba(0,255,200,.65), inset 0 2px 0 rgba(255,255,255,.5), inset 0 -8px 20px rgba(0,0,0,.45);
          filter: brightness(1.06) saturate(1.15);
        }
        .wheel-play.start:hover{
          box-shadow: 0 14px 36px rgba(0,0,0,.6), 0 0 60px rgba(255,59,48,.98), 0 0 150px rgba(255,59,48,.7), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -8px 20px rgba(0,0,0,.45);
        }
        .wheel-play:active { transform: scale(0.96); }
        /* CHXNDLER start button hover: enhanced depth with lifted effect */
        .wheel-play.chx:hover{ 
          box-shadow: 
            0 12px 24px rgba(0,0,0,0.5),
            0 6px 12px rgba(0,0,0,0.4),
            0 0 30px rgba(25,227,255,0.5),
            0 0 60px rgba(25,227,255,0.3);
          transform: translateY(-3px) translateZ(0);
          filter: brightness(1.1) saturate(1.2);
        }
        .wheel-play.chx:active{ 
          transform: translateY(-1px) scale(0.98) translateZ(0);
          box-shadow: 
            0 4px 8px rgba(0,0,0,0.4),
            0 2px 4px rgba(0,0,0,0.3),
            0 0 15px rgba(25,227,255,0.4);
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .wheel-play.chx .chx-icon{ transition: transform .12s ease, filter .15s ease; }
        .wheel-play.chx:hover .chx-icon{
          transform: scale(1.04);
          filter:
            saturate(1.25) brightness(1.12)
            drop-shadow(0 0 0 #19E3FF)
            drop-shadow(0 0 10px #19E3FF)
            drop-shadow(0 0 26px #19E3FF)
            drop-shadow(0 0 54px #19E3FF);
        }
        
        /* Power button styles */
        .power-btn{ 
          position: relative;
          display:grid; place-items:center;
          border-radius:9999px;
          /* Match comms/join hologram style, tinted blue */
          background:
            radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%),
            rgba(25,227,255,0.45);
          border:1px solid rgba(255,255,255,.14);
          box-shadow:
            0 14px 24px rgba(0,0,0,.55),
            0 0 12px #19E3FF66,
            0 0 22px #19E3FF44,
            inset 0 1px 0 rgba(255,255,255,.22),
            inset 0 -6px 14px rgba(0,0,0,.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: transform .15s ease, box-shadow .2s ease, filter .18s ease;
          animation: powerPulse 2.6s ease-in-out infinite;
        }
        /* When blue is selected/active: tone down glow and stop pulsing */
        .power-btn.power-btn-active{
          animation: none;
          box-shadow:
            0 10px 22px rgba(0,0,0,.5),
            0 0 10px #19E3FF55,
            0 0 18px #19E3FF44,
            inset 0 1px 0 rgba(255,255,255,.22),
            inset 0 -6px 14px rgba(0,0,0,.6);
          filter: brightness(1.0) saturate(1.02);
        }
        .power-btn::before{ /* outer halo to match hubs (subtle) */
          content:""; position:absolute; inset:-1%; border-radius:9999px; pointer-events:none;
          box-shadow: 0 0 14px #19E3FF88, 0 0 24px #19E3FF55;
        }
        .power-btn::after{ /* sheen + scanlines */
          content:""; position:absolute; inset:0; border-radius:9999px; pointer-events:none; mix-blend-mode:screen; opacity:.6;
          background:
            linear-gradient(120deg, rgba(255,255,255,.18), rgba(255,255,255,0) 60%),
            repeating-linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.08) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px);
          transform: translateX(-130%);
          animation: powerSheen 3s ease-in-out infinite;
        }
        .power-glyph{ position:relative; display:inline-flex; align-items:center; justify-content:center; color:#fff;
          /* Blue glow coming through the icon */
          mix-blend-mode: screen;
          filter: brightness(1.06) saturate(1.1)
            drop-shadow(0 0 10px #19E3FF)
            drop-shadow(0 0 22px #19E3FF);
        }
        .power-icon{ width: 86%; height: 86%; object-fit: contain; display:block; filter:
          saturate(1.05) brightness(1.03)
          drop-shadow(0 0 8px #19E3FF)
          drop-shadow(0 0 18px #19E3FF);
        }
        /* Inner cyan glow masked to the power symbol shape */
        .power-glyph::before{
          content:""; position:absolute; inset:14%; pointer-events:none; mix-blend-mode:screen;
          background: radial-gradient(closest-side, #19E3FFCC, #19E3FF55 60%, transparent 78%);
          filter: blur(5px) saturate(1.05) brightness(1.02);
        }
        .power-btn:hover{
          transform: scale(1.07);
          box-shadow:
            0 18px 30px rgba(0,0,0,.6),
            0 0 18px #19E3FFAA,
            0 0 40px #19E3FF77,
          inset 0 1px 0 rgba(255,255,255,.28),
          inset 0 -8px 18px rgba(0,0,0,.65);
          filter: brightness(1.04) saturate(1.08);
        }
        .power-btn:active{ transform: scale(.96); }
        @keyframes powerPulse{ 0%,100%{ filter: brightness(1) } 50%{ filter: brightness(1.08) } }
        @keyframes powerSheen { 0% { transform: translateX(-130%);} 55% { transform: translateX(130%);} 100% { transform: translateX(130%);} }
        
        /* Synchronized panel pulsing effects */
        @keyframes pinkPanelPulse {
          0%, 100% { 
            filter: brightness(1) saturate(1);
            box-shadow: 
              0 18px 36px rgba(0,0,0,.5), 
              0 0 42px #FC54AFAA, 
              0 0 100px #FC54AF55, 
              inset 0 2px 0 rgba(255,255,255,.2), 
              inset 0 -6px 14px rgba(0,0,0,.6);
          }
          50% { 
            filter: brightness(1.06) saturate(1.1);
            box-shadow: 
              0 18px 36px rgba(0,0,0,.5), 
              0 0 52px #FC54AFCC, 
              0 0 120px #FC54AF77, 
              inset 0 2px 0 rgba(255,255,255,.25), 
              inset 0 -6px 14px rgba(0,0,0,.6);
          }
        }
        
        /* Enhanced glow effects when beam is active */
        .power-btn-active {
          animation: powerActiveGlow 2s ease-in-out infinite, powerPulse 2.6s ease-in-out infinite;
          box-shadow:
            0 14px 28px rgba(0,0,0,.6),
            0 0 25px #19E3FF,
            0 0 50px #19E3FFCC,
            0 0 80px #19E3FF88,
            inset 0 1px 0 rgba(255,255,255,.22),
            inset 0 -6px 14px rgba(0,0,0,.6);
        }
        .power-btn-active::before {
          box-shadow: 0 0 30px #19E3FFFF, 0 0 60px #19E3FFAA, 0 0 100px #19E3FF66;
        }
        @keyframes powerActiveGlow {
          0%, 100% { 
            filter: brightness(1.2) saturate(1.3);
            transform: scale(1);
          }
          50% { 
            filter: brightness(1.4) saturate(1.5);
            transform: scale(1.02);
          }
        }

        /* Beam flow animation for light beam */
        @keyframes beamFlow {
          0% { background-position: 0% 0%, 0% 0px; }
          100% { background-position: 0% 0%, 0% 160px; }
        }
        
        /* 3D Planet System Animations */
        @keyframes centralPulse {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1); 
            box-shadow: 0 0 40px #19E3FF66, inset -10px -10px 20px rgba(0,0,0,0.3); 
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.1); 
            box-shadow: 0 0 60px #19E3FFAA, inset -10px -10px 20px rgba(0,0,0,0.3); 
          }
        }
        @keyframes ringRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes orbit {
          from { 
            transform: translate(-50%, -50%) rotate(0deg); 
            filter: brightness(1);
          }
          50% { 
            filter: brightness(1.2);
          }
          to { 
            transform: translate(-50%, -50%) rotate(360deg); 
            filter: brightness(1);
          }
        }
      `}</style>


      <audio ref={pauseRef} src="/audio/pause.mp3" preload="auto" />
      <audio ref={hoverRef} preload="auto">
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={buttonRef} src="/audio/button.mp3" preload="auto" />
    </div>
  );
}
