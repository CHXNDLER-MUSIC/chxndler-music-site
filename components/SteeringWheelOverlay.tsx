"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import HoloHubMenu from "@/components/HoloHubMenu";
import LumaKeyVideo from "@/components/LumaKeyVideo";
import HoloJoinPopout from "@/components/HoloJoinPopout";
import HoloJoinButton from "@/components/HoloJoinButton";
import JoinAliens from "@/components/JoinAliens";
import { LINKS } from "@/config/cockpit";

export default function SteeringWheelOverlay({
  logoSrc = "/logo/CHXNDLER_Logo.png",
  onLaunch,
  POS,
  playing,
  showUI = true,
  onPowerToggle,
  onJoinToggle,
  onBeamColorChange,
}: {
  logoSrc?: string;
  onLaunch: () => void;
  POS: any;
  playing?: boolean;
  showUI?: boolean;
  onPowerToggle?: () => void;
  onJoinToggle?: (showJoin: boolean) => void;
  onBeamColorChange?: (color: 'blue' | 'yellow' | 'pink') => void;
}) {
  const sfxRef = useRef<HTMLAudioElement|null>(null);
  const pauseRef = useRef<HTMLAudioElement|null>(null);
  const hoverRef = useRef<HTMLAudioElement|null>(null);
  const buttonRef = useRef<HTMLAudioElement|null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [activeBeamColor, setActiveBeamColor] = useState<'blue' | 'yellow' | 'pink'>('blue');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Notify parent when showJoin changes
  useEffect(() => {
    onJoinToggle?.(showJoin);
  }, [showJoin, onJoinToggle]);

  // Notify parent when beam color changes
  useEffect(() => {
    onBeamColorChange?.(activeBeamColor);
  }, [activeBeamColor, onBeamColorChange]);
  const joinFormRef = useRef<HTMLDivElement|null>(null);

  // Display management function for mutual exclusivity
  const switchToDisplay = useCallback((targetDisplay: 'blue' | 'yellow' | 'pink') => {
    if (isTransitioning) return; // Prevent rapid switching
    
    setIsTransitioning(true);
    
    // First close all other displays
    const closeOtherDisplays = () => {
      if (targetDisplay !== 'pink' && showJoin) {
        setShowJoin(false);
      }
      if (targetDisplay !== 'blue' && showUI) {
        onPowerToggle?.();
      }
      // Yellow display (HoloHubMenu) closes itself when onToggle(false) is called
    };
    
    // Close other displays immediately
    closeOtherDisplays();
    
    // Wait for close animations to complete, then open target display
    setTimeout(() => {
      setActiveBeamColor(targetDisplay);
      
      if (targetDisplay === 'pink' && !showJoin) {
        setShowJoin(true);
      } else if (targetDisplay === 'blue' && !showUI) {
        onPowerToggle?.();
      }
      // Yellow display opening is handled by HoloHubMenu component
      
      setIsTransitioning(false);
    }, 150); // Wait for close animation (75ms opacity + buffer)
    
  }, [isTransitioning, showJoin, showUI, onPowerToggle]);

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
    console.log('handleJoinAlienToggle called, current showJoin:', showJoin);
    
    // Play button sound
    try {
      const a = buttonRef.current;
      if (a) { a.currentTime = 0; a.volume = 0.95; a.play().catch(()=>{}); }
    } catch {}
    
    // If pink display is already open, close it and fade out beam
    if (showJoin) {
      setShowJoin(false);
      setActiveBeamColor('blue'); // Default back to blue
      // Notify parent to fade out beam
      onBeamColorChange?.('blue');
    } else {
      // Open pink display and fade in pink beam
      switchToDisplay('pink');
      // Notify parent to show pink beam
      onBeamColorChange?.('pink');
    }
  }, [showJoin, switchToDisplay, onBeamColorChange]);

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
  const basePx = Math.max(lp.sizePx || 72, pp.sizePx || 64);
  const vs = Math.round(basePx * (vconf.scale || 4.0));

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
      style={{ position: 'absolute', inset: 0, zIndex: 80, pointerEvents: 'none' }}
    >
      {/* Wheel video projection aligned to cockpit wheel area */}
      <div
        style={{
          position: "absolute",
          // Move wheel slightly down from bottom of screen
          bottom: "-3vh",
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
          threshold={(vconf as any)?.threshold ?? 0.01}
          softness={(vconf as any)?.softness ?? 0.0}
          saturation={(vconf as any)?.saturation ?? 1.8}
          contrast={(vconf as any)?.contrast ?? 2.0}
          offsetYRatio={0}
          className="block"
          style={{
            display: 'block',
            width: vs,
            height: vs,
            pointerEvents: 'none',
            background: 'transparent',
            transform: 'scale(0.9)',
            transformOrigin: 'bottom center',
          }}
        />
      </div>
      {/* Power Button - centered */}
      <div
        style={{
          position: "absolute",
          bottom: '35%', // Moved down, above steering wheel
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 92,
          pointerEvents: showUI ? 'auto' : 'none',
          opacity: showUI ? 1 : 0,
          transition: 'opacity 75ms ease',
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
                  className="power-btn"
                  onMouseEnter={() => { try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
                  onClick={() => {
                    // Play button sound
                    try {
                      const a = buttonRef.current;
                      if (a) { a.currentTime = 0; a.volume = 0.95; a.play().catch(()=>{}); }
                    } catch {}
                    
                    // Use display management for proper sequencing
                    if (showUI) {
                      // If blue display is open, close it
                      onPowerToggle?.();
                      setActiveBeamColor('blue'); 
                    } else {
                      // Open blue display (will close others first)
                      switchToDisplay('blue');
                    }
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

      {/* Comms Button - positioned to the left of pink button on same level */}
      <div
        style={{
          position: "absolute",
          bottom: '35%', // Same vertical level as blue button
          left: 'calc(50% - 10vh)', // To the left, mirroring pink button position
          transform: 'translateX(-50%)',
          zIndex: 92,
          pointerEvents: showUI ? 'auto' : 'none',
          opacity: showUI ? 1 : 0,
          transition: 'opacity 75ms ease',
        }}
      >
        {(() => {
          const iconSize = 30;
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
                radius={60}
                hubColor="#F2EF1D"
                itemSize={68}
                hubSize={84}
                angles={{ sp: -36, am: -18, ig: 0, tt: 18, yt: 36 }}
                onToggle={(isOpen) => {
                  if (isOpen) {
                    // Play button sound
                    try {
                      const a = buttonRef.current;
                      if (a) { a.currentTime = 0; a.volume = 0.95; a.play().catch(()=>{}); }
                    } catch {}
                    
                    console.log('Comms menu opening, hiding other displays');
                    // Use display management for proper sequencing
                    switchToDisplay('yellow');
                    // Notify parent to show yellow beam
                    onBeamColorChange?.('yellow');
                  } else {
                    // Menu is closing, fade out beam if it's yellow
                    if (activeBeamColor === 'yellow') {
                      onBeamColorChange?.('blue');
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
          bottom: '35%', // Same level as power button
          left: 'calc(50% + 10vh)', // Positioned to the right of center
          transform: 'translateX(-50%)',
          zIndex: 92,
          pointerEvents: showUI ? 'auto' : 'none',
          opacity: showUI ? 1 : 0,
          transition: 'opacity 75ms ease',
        }}
      >
        {(() => {
          const joinCfg: any = getResponsiveValue((POS?.wheel as any)?.join) || {};
          const joinSize: number = typeof joinCfg.sizePx === 'number' ? joinCfg.sizePx : 84;
          return (
            <div style={{ pointerEvents: 'auto' }}>
              <HoloJoinButton 
                size={joinSize} 
                label="Join Alien Display" 
                iconSrc="/elements/join.png" 
                hubColor="#FC54AF" 
                onClick={handleJoinAlienToggle}
              />
            </div>
          );
        })()}
      </div>

      {/* Separate Join Aliens Form - dynamically positioned to align with blue display */}
      {(() => {
        return (
          <div
            ref={joinFormRef}
            style={{
              position: "absolute",
              // Position above blue button area
              bottom: `calc(35% + 14vh)`,
              // Center horizontally on screen
              left: '50%',
              transform: 'translateX(-50%)', // Center the 244px wide panel
              zIndex: 93,
              pointerEvents: showJoin ? 'auto' : 'none',
              opacity: showJoin ? 1 : 0,
              transition: 'opacity 75ms ease',
            }}
          >
            {/* Join form panel */}
            <div
              style={{
                width: 'min(244px, calc(100vw - 32px))', // Responsive width with 16px margin on each side
                maxWidth: '244px', // Maintain original size on larger screens
                minWidth: '200px', // Ensure minimum usable width
                borderRadius: '16px',
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
              }}
            >
              <JoinAliens />
            </div>
          </div>
        );
      })()}





      {/* Start button anchored on the wheel */}
      <button
        onClick={handleLaunch}
        className={`pointer-events-auto wheel-play${isStart ? ' chx' : ''}`}
        style={{
          position: "absolute",
          bottom: `calc(${100 - pp.topVh}vh - ${(pp.sizePx * 0.95)/2}px + 12px)`, // Bottom-aligned responsive positioning
          left: `calc(${pp.leftVw}vw - ${(pp.sizePx * 0.95)/2}px + 10px)`,
          width: pp.sizePx * 0.95,
          height: pp.sizePx * 0.95,
          borderRadius: 9999,
          transform: "none",
          zIndex: 90,
        }}
        onMouseEnter={() => { try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
        aria-label={isStart ? "Start" : (playing ? "Pause" : "Play")}
        title={isStart ? "Start" : (playing ? "Pause" : "Play")}
      >
        {/* No outer ring for START icon variant */}
        {/* Ring removed for START variant and standard play/pause */}
        <span className="glyph" aria-hidden>
          {isStart ? (
            <img src="/elements/start.png" alt="Start" className="chx-icon" />
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
          box-shadow:
            0 0 32px rgba(0,255,180,.75),
            0 0 88px rgba(0,255,180,.55),
            inset 0 2px 0 rgba(255,255,255,.35),
            inset 0 0 24px rgba(0,255,200,.22);
          border:1px solid rgba(255,255,255,.18);
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease;
          overflow: visible;
        }
        /* CHXNDLER element variant: icon-only, transparent background */
        .wheel-play.chx{
          background: transparent;
          border: none;
          box-shadow: none;
          position: relative;
          cursor: pointer;
        }
        /* No halo/glow behind the START icon */
        .wheel-play.chx::before{ display:none; content:none; }
        .wheel-play.chx::after{ display:none; content:none; }
        .chx-icon{ width: 92%; height: 92%; object-fit: contain; display:block; will-change: transform, filter;
          filter: none;
          animation: none;
        }
        .wheel-play.chx:hover .chx-icon{ animation: none; transform: scale(1.04); filter: none; }
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
        /* CHXNDLER start button hover: outline the icon itself, no circular glow */
        .wheel-play.chx:hover{ box-shadow: none; transform: none; filter:none; }
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
            0 14px 28px rgba(0,0,0,.6),
            0 0 15px #19E3FF88,
            0 0 30px #19E3FF55,
            inset 0 1px 0 rgba(255,255,255,.22),
            inset 0 -6px 14px rgba(0,0,0,.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: transform .15s ease, box-shadow .2s ease, filter .18s ease;
          animation: powerPulse 2.6s ease-in-out infinite;
        }
        .power-btn::before{ /* outer halo to match hubs */
          content:""; position:absolute; inset:-1%; border-radius:9999px; pointer-events:none;
          box-shadow: 0 0 20px #19E3FFCC, 0 0 35px #19E3FF88;
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
          filter: brightness(1.1) saturate(1.2)
            drop-shadow(0 0 18px #19E3FF)
            drop-shadow(0 0 42px #19E3FF);
        }
        .power-icon{ width: 86%; height: 86%; object-fit: contain; display:block; filter:
          saturate(1.1) brightness(1.05)
          drop-shadow(0 0 16px #19E3FF)
          drop-shadow(0 0 36px #19E3FF);
        }
        /* Inner cyan glow masked to the power symbol shape */
        .power-glyph::before{
          content:""; position:absolute; inset:14%; pointer-events:none; mix-blend-mode:screen;
          background: radial-gradient(closest-side, #19E3FFCC, #19E3FF55 60%, transparent 78%);
          filter: blur(6px) saturate(1.15) brightness(1.05);
        }
        .power-btn:hover{
          transform: scale(1.07);
          box-shadow:
            0 18px 34px rgba(0,0,0,.68),
            0 0 25px #19E3FF,
            0 0 60px #19E3FFAA,
            inset 0 1px 0 rgba(255,255,255,.28),
            inset 0 -8px 18px rgba(0,0,0,.65);
          filter: brightness(1.08) saturate(1.15);
        }
        .power-btn:active{ transform: scale(.96); }
        @keyframes powerPulse{ 0%,100%{ filter: brightness(1) } 50%{ filter: brightness(1.08) } }
        @keyframes powerSheen { 0% { transform: translateX(-130%);} 55% { transform: translateX(130%);} 100% { transform: translateX(130%);} }
        
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


      <audio ref={sfxRef} src="/audio/launch.mp3" preload="auto" />
      <audio ref={pauseRef} src="/audio/pause.mp3" preload="auto" />
      <audio ref={hoverRef} preload="auto">
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={buttonRef} src="/audio/button.mp3" preload="auto" />
    </div>
  );
}
