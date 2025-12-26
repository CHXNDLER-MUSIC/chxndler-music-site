"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import HoloHubMenu from "@/components/HoloHubMenu";
import LumaKeyVideo from "@/components/LumaKeyVideo";
import HoloJoinButton from "@/components/HoloJoinButton";
import JoinAliens from "@/components/JoinAliens";
import { LINKS } from "@/config/cockpit";
import { useAudio } from "@/app/providers/AudioProvider";
import { useProfile } from "@/hooks/useProfile";
import { sfx } from "@/lib/sfx";
import { triggerHeartCoinCelebration } from "@/utils/heartcoinCelebration";
import { triggerCardCelebration } from "@/utils/cardCelebration";
import { triggerBadgeCelebration } from "@/utils/badgeCelebration";

// Helper to detect Safari browser
const isSafariUA =
  typeof navigator !== "undefined" &&
  /safari/i.test(navigator.userAgent) &&
  !/chrome|android/i.test(navigator.userAgent);

const SteeringWheelOverlay = React.memo(function SteeringWheelOverlay({
  onLaunch,
  POS,
  playing,
  showUI = true,
  uiUnlocked = false,
  joinAlienOpen = false,
  blueActive = false,
  onPowerToggle,
  onJoinToggle,
  onBeamColorChange,
  closeAllSignal = 0,
  suspendUI = false,
  hideStartButton = false,
  isLightningPlanet = false,
}: {
  onLaunch: () => void;
  POS: any;
  playing?: boolean;
  showUI?: boolean;
  uiUnlocked?: boolean;
  joinAlienOpen?: boolean;
  // True when the blue HUD or beam is currently active/visible
  blueActive?: boolean;
  onPowerToggle?: () => void;
  onJoinToggle?: (showJoin: boolean) => void;
  onBeamColorChange?: (color: 'blue' | 'yellow' | 'pink' | 'off') => void;
  // When incremented, force-close any open displays/menus (e.g., during warp)
  closeAllSignal?: number;
  // Temporarily hide/fade overlay panels (e.g., during warp)
  suspendUI?: boolean;
  // Hide the start button (when rendering it externally)
  hideStartButton?: boolean;
  // True when viewing LIGHTNING planet - disables Spotify button
  isLightningPlanet?: boolean;
}) {
  const pauseRef = useRef<HTMLAudioElement|null>(null);
  const hoverRef = useRef<HTMLAudioElement|null>(null);
  const buttonRef = useRef<HTMLAudioElement|null>(null);
  // Use joinAlienOpen prop instead of local state
  const [activeBeamColor, setActiveBeamColor] = useState<'blue' | 'yellow' | 'pink'>('blue');
  const [mounted, setMounted] = useState(false);
  const [startSpotlight, setStartSpotlight] = useState(false);
  const startTrackedRef = useRef(false);
  // Start button pulsing: enabled by default, turns off after first click
  const [startPulseOn, setStartPulseOn] = useState(true);
  // When transitioning from pink → yellow, temporarily suspend yellow panel until sequencing finishes
  const [suspendYellowPanel, setSuspendYellowPanel] = useState(false);
  const yellowFromPinkTimeoutA = useRef<number | null>(null);
  const yellowFromPinkTimeoutB = useRef<number | null>(null);
  // Feature flag to show/hide test celebration buttons (default hidden)
  const showTestCelebrations = process.env.NEXT_PUBLIC_SHOW_TEST_CELEBRATIONS === 'true';

  // Track if wheel video failed to load (hide wheel gracefully if video assets missing)
  const [wheelVideoFailed, setWheelVideoFailed] = useState(false);

  // Use the uiUnlocked prop passed from DashboardApp instead of reading from window
  const isUIUnlocked = uiUnlocked;
  
  // Get user and profile data to determine welcome text
  const { user, profile, needsOnboarding } = useProfile();
  const audioManager = useAudio();
  
  // Determine welcome text based on user status
  const getWelcomeText = () => {
    if (!user) {
      return "ENTER THE HEARTVERSE";
    }
    return "ENTER THE HEARTVERSE";
  };
  

  // Set mounted after component mounts to prevent immediate hover sounds
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Parent manages joinAlienOpen state directly

  // Notify parent when beam color changes without coupling to callback identity
  const onBeamColorChangeRef = useRef<typeof onBeamColorChange>();
  useEffect(() => { onBeamColorChangeRef.current = onBeamColorChange; }, [onBeamColorChange]);
  const prevBeamColorRef = useRef<typeof activeBeamColor | null>(null);
  const didMountRef = useRef(false);
  // When set, skip notifying parent on the next local color change
  const suppressNextBeamNotifyRef = useRef(false);
  useEffect(() => {
    // Skip notifying parent on initial mount to avoid auto-enabling the blue display/beam
    if (!didMountRef.current) {
      didMountRef.current = true;
      prevBeamColorRef.current = activeBeamColor;
      return;
    }
    if (prevBeamColorRef.current === activeBeamColor) return;
    prevBeamColorRef.current = activeBeamColor;
    if (suppressNextBeamNotifyRef.current) {
      suppressNextBeamNotifyRef.current = false;
      return; // do not inform parent for this one transition
    }
    try { onBeamColorChangeRef.current?.(activeBeamColor); } catch {}
  }, [activeBeamColor]);
  const joinFormRef = useRef<HTMLDivElement|null>(null);

  // Display management handled inline by button handlers

  // Pink display stays open until pink button is clicked - no click-outside behavior

  // On external close signal (warp start), reset local beam tint and clear timers
  useEffect(() => {
    setActiveBeamColor('blue');
    // Clear any pending yellow transition timers
    if (yellowFromPinkTimeoutA.current) { window.clearTimeout(yellowFromPinkTimeoutA.current); yellowFromPinkTimeoutA.current = null; }
    if (yellowFromPinkTimeoutB.current) { window.clearTimeout(yellowFromPinkTimeoutB.current); yellowFromPinkTimeoutB.current = null; }
    setSuspendYellowPanel(false);
  }, [closeAllSignal]);

  function handleLaunch() {
    // Track Start press using new trackEvent function
    try {
      // Import trackEvent dynamically to avoid SSR issues
      import('@/lib/analytics').then(({ trackEvent }) => {
        if (!startTrackedRef.current) {
          trackEvent('start_opening', { source: 'wheel' });
          startTrackedRef.current = true;
        }
        // Track canonical start button click
        trackEvent('start_click', { source: 'wheel' });
      }).catch(() => {});
      
      // Keep old tracking for compatibility during transition
      if (!startTrackedRef.current) {
        track('start_button_opening_page');
        startTrackedRef.current = true;
      }
      track('start_button_clicked');
    } catch {}
    // Trigger toggle action first so downstream can open streaming links within a user gesture
    try { onLaunch(); } catch {}

    // Removed: Start button audio sequence that auto-plays space music
    // try { audioManager?.playStartSequence(!!user); } catch {}
    // After first click, stop pulsing the Start button until refresh
    if (startPulseOn) setStartPulseOn(false);
    // After first click, permanently disable the start spotlight
    if (startSpotlight) setStartSpotlight(false);
    // Do not play pause sound on Start; Start always triggers launch/warp.
    // Do not toggle main track audio on Start. Playback is controlled via song selection.
  }

  const handleSignalToggle = useCallback(() => {
    if (!showUI || !isUIUnlocked) return;
    
    // Play click sound
    try {
      const a = buttonRef.current;
      if (a) { a.currentTime = 0; a.volume = 0.95; a.play().catch(()=>{}); }
    } catch {}
    
    // Toggle pink display instead of opening new window
    if (joinAlienOpen || activeBeamColor === 'pink') {
      // If pink display is open, close it
      onJoinToggle?.(false);
      onBeamColorChange?.('off');
      // Reset local state after beam fully fades out to avoid blue flash during fade
      setTimeout(() => {
        suppressNextBeamNotifyRef.current = true;
        setActiveBeamColor('blue');
      }, 400);
    } else {
      // Close any open modals before opening live signal display
      try { window.dispatchEvent(new CustomEvent('closeAllModals')); } catch {}
      // Open pink display with Twitch embed
      setActiveBeamColor('pink');
      onBeamColorChange?.('pink');
      onJoinToggle?.(true);
    }
    
    // Explicit analytics event for Signal button
    try { track('signal_click', { payload: { button_type: 'twitch_embed' } }); } catch {}
    try { track('twitch_embed_clicked', { location: 'signal_button' }); } catch {}
    
    // Track with new events_v2 system
    try {
      import('@/lib/analytics').then(({ trackEvent }) => {
        trackEvent('signal_click', { source: 'wheel' });
      }).catch(() => {});
    } catch {}
  }, [showUI, isUIUnlocked, joinAlienOpen, activeBeamColor, onJoinToggle, onBeamColorChange]);

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
  // Viewport-aware scaling for wheel video and hub buttons (Start position will be fixed)
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
  // Current viewport width helper
  const vw = (typeof window !== 'undefined') ? window.innerWidth : 1200;
  // Check if dimming overlay is active to disable button interactions
  const isDimmingOverlayActive = (typeof window !== 'undefined') ? !!(window as any).__CHX_SHOW_DIMMING_OVERLAY : false;
  // Scale targets tuned for typical desktop/tablet/phone ranges
  // Ensure Start button isn't too small on phones
  const startBase = vmin * (vw <= 480 ? 0.19 : vw <= 768 ? 0.17 : 0.16);
  const startSize = Math.round(clamp(startBase, vw <= 480 ? 112 : 92, 210)); // increased minimums for better tap targets
  // Fixed size for START variant so it does not adjust on small screens
  const startFixedSizePx = 140;
  // Fixed vertical offset for START relative to buttons baseline so it doesn't drift by screen size
  const startBottomOffsetPx = 130; // place START below the baseline consistently
  // Make wheel responsive with better minimum size scaling for small screens
  // Increase scale on narrower viewports so the wheel doesn't shrink as much
  const scaleFactor = (() => {
    // Keep scale ≤ 1; shrink less across the board
    if (vw <= 480) return 1.00;   // phones: lock to vmin (no shrink)
    if (vw <= 768) return 0.98;   // large phones / small tablets
    if (vw <= 1024) return 0.95;  // tablets
    return 0.90;                  // desktop default
  })();
  // Increase minimum floors so the wheel stays larger on small screens
  const vsMin = (
    vw <= 480 ? 680 :
    vw <= 768 ? 620 :
    460
  );
  // Base wheel size before global scale
  const vsBase = Math.round(clamp(vmin * (scaleFactor * 0.97), vsMin, 980));
  // Apply global 80% size reduction to the wheel
  const vs = Math.round(vsBase * 0.8); // wheel square size at 80%
  const yellowHubSize = 72; // Fixed size - yellow hub should never change size
  const yellowItemSize = 68; // Fixed size - social media buttons should never change size
  // Resolve power (blue) button size responsively so beam can be positioned relative to it
  const powerCfgGlobal: any = getResponsiveValue((POS?.wheel as any)?.power) || {};
  const powerSizePx: number = typeof powerCfgGlobal.sizePx === 'number' ? powerCfgGlobal.sizePx : 72;
  // Fixed button positions to prevent movement on mobile
  const buttonOffsetPx = 100; // Fixed horizontal offset
  const buttonsBottomPercent = 31; // Fixed vertical position

  // Mobile-specific fine tuning: align yellow hub perfectly with blue/pink on phones
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => {
      try { setIsMobile(window.innerWidth <= 640); } catch {}
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Plain wheel state for debugging (moved from render function)
  const [plainWheel, setPlainWheel] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      const force = window.localStorage.getItem('WHEEL_FORCE_LUMA') === '1';
      if (force) return false;
      const ls = window.localStorage.getItem('PLAIN_WHEEL');
      if (ls === '1') return true;
      if (ls === '0') return false;
      return false;
    } catch {
      return false;
    }
  });
  
  // Set up plain wheel toggle effects (moved from render function)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Set default LUMA mode if not set
    try {
      const ls = window.localStorage.getItem('PLAIN_WHEEL');
      if (ls === null) {
        window.localStorage.setItem('PLAIN_WHEEL', '0');
      }
    } catch {}
    
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'W' || e.key === 'w') && (e.metaKey || e.ctrlKey || e.shiftKey)) {
        e.preventDefault();
        setPlainWheel(prev => {
          const next = !prev;
          try { window.localStorage.setItem('PLAIN_WHEEL', next ? '1' : '0'); } catch {}
          try { console.log(`Wheel video mode: ${next ? 'PLAIN' : 'LUMA'}`); } catch {}
          return next;
        });
      }
    };
    
    window.addEventListener('keydown', onKey);
    
    // expose manual toggle for convenience
    (window as any).__toggleWheelVideo = () => setPlainWheel(prev => {
      const next = !prev;
      try { window.localStorage.setItem('PLAIN_WHEEL', next ? '1' : '0'); } catch {}
      try { console.log(`Wheel video mode: ${next ? 'PLAIN' : 'LUMA'}`); } catch {}
      return next;
    });
    
    return () => {
      window.removeEventListener('keydown', onKey);
      try { delete (window as any).__toggleWheelVideo; } catch {}
    };
  }, []);

  // Sync key CSS variables to :root so portal-rendered elements can align to the blue button
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    try {
      root.style.setProperty('--buttons-bottom', `${buttonsBottomPercent}%`);
      root.style.setProperty('--panel-gap-px', `${Math.round(yellowHubSize * 0.7)}px`);
      // Position the beam relative to the actual blue button size
      // Ensure the entire beam (height ≈72px) sits fully above the blue button
      // Gap = power button size + beam height + small safety margin (accounts for translateY(8px))
      const BEAM_HEIGHT = 68; // keep in sync with :root --beam-height
      const SAFETY_MARGIN = -90; // slightly lowered more
      const beamGap = Math.round(powerSizePx + BEAM_HEIGHT + SAFETY_MARGIN);
      root.style.setProperty('--power-size-px', `${powerSizePx}px`);
      root.style.setProperty('--beam-gap-px', `${beamGap}px`);
      // Optional: keep display width/border radius in sync if needed by other overlays
      // These are already defined responsively in CSS; no need to override here unless desired.
    } catch {}
  }, [buttonsBottomPercent, yellowHubSize, powerSizePx]);

  // START button variant flag (legacy "boost" fully removed)
  // Always show START icon when configured as start button, regardless of UI unlock status
  const isStart = Boolean(
    (POS?.wheel && ((POS.wheel as any).start || (POS.wheel as any).startButton)) ||
    process.env.NEXT_PUBLIC_START_BUTTON === '1' ||
    process.env.NEXT_PUBLIC_PLAY_BUTTON_STYLE === 'start'
  );
  // Use fixed size for START only; keep responsive size for Play/Pause
  const startButtonSizePx = isStart ? startFixedSizePx : startSize;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      // Wrapper contains interactive controls; do NOT hide from assistive tech
      // Decorative sub-elements are marked aria-hidden individually instead
      suppressHydrationWarning
      style={{
        position: 'absolute', inset: 0, zIndex: 100, pointerEvents: 'none',
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
          // Nudge wheel slightly higher
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
          // Wheel should be above cockpit but below UI elements (lightbeam base is z-[100])
          zIndex: 95,
          outline: vconf.debug ? "1px dashed rgba(25,227,255,0.6)" : (typeof window !== 'undefined' && window.localStorage.getItem('WHEEL_DEBUG') === '1' ? '2px dashed rgba(255,0,0,0.5)' : undefined),
          background: vconf.debug ? "rgba(25,227,255,0.08)" : "transparent",
          // Allow hiding via config if needed, default to visible
          display: (vconf as any)?.hidden ? 'none' as const : undefined,
          // Paint containment to keep canvas work localized
          contain: 'layout paint',
          willChange: 'opacity, transform',
          // Prevent browser from scrolling/overscrolling when interacting in this region
          overscrollBehavior: 'none',
        }}
      >
        {/* Prevent page scrolling when the pointer is over the wheel area */}
        <div
          aria-hidden
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'transparent', zIndex: 96, touchAction: 'none' as any }}
          onWheelCapture={(e) => { try { e.preventDefault(); e.stopPropagation(); } catch {} }}
          onWheel={(e) => { try { e.preventDefault(); e.stopPropagation(); } catch {} }}
          onTouchMoveCapture={(e) => { try { e.preventDefault(); e.stopPropagation(); } catch {} }}
          onTouchMove={(e) => { try { e.preventDefault(); e.stopPropagation(); } catch {} }}
        />
        {/* Wheel video with luma key: remove black background; no circle crop, allow hands to extend. */}
        {(() => {
          // Kill-switch controlled via localStorage to diagnose performance issues
          let disable = false;
          try {
            if (typeof window !== 'undefined') {
              const v = window.localStorage.getItem('DISABLE_WHEEL_VIDEO');
              const force = window.localStorage.getItem('WHEEL_FORCE_LUMA') === '1';
              const safariPlain = window.localStorage.getItem('SAFARI_PLAIN_WHEEL') === '1';
              // Force plain video for Safari by default to avoid black background issues
              if (isSafariUA) disable = true;
              // Respect force-luma override to ensure we don't render the plain black-box video
              disable = !force && (disable || v === '1' || v === 'true');
            }
          } catch {}
          // Safari detection already defined at top of file
          // Prefer MOV with alpha only if the browser claims support for HEVC/H.265
          const canPlayHvc = (() => {
            try {
              const v = document.createElement('video');
              const c1 = v.canPlayType('video/mp4; codecs="hvc1"');
              const c2 = v.canPlayType('video/mp4; codecs="hev1"');
              const c3 = v.canPlayType('video/quicktime');
              const mp4 = v.canPlayType('video/mp4; codecs="avc1.42E01E"');
              return !!(c1 || c2 || c3 || mp4);
            } catch { return false; }
          })();
          // Choose best source per browser - prefer transparent files
          const wheelSrc = (function() {
            if (isSafariUA) {
              // For Safari, use the transparent MP4 to ensure compatibility with transparency
              return "/cockpit/wheel_transparent.mp4";
            }
            // Other browsers: use transparent WebM
            return "/cockpit/wheel_transparent.webm";
          })();

          // Hide wheel gracefully if video assets failed to load
          if (wheelVideoFailed) return null;

          if (disable) {
            // If explicitly disabled, still render a plain <video> so the wheel is visible
            return (
              <video
                autoPlay
                muted
                loop
                playsInline
                aria-label="wheel-video-plain"
                style={{
                  display: 'block',
                  width: vs,
                  height: vs,
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  background: 'transparent',
                  transform: 'scale(1.0)',
                  transformOrigin: 'bottom center',
                  // Preserve wheel appearance for Safari
                  ...(isSafariUA ? {
                    background: 'transparent'
                  } : {})
                }}
                onError={() => {
                  // All video sources failed - hide wheel gracefully
                  setWheelVideoFailed(true);
                }}
              >
                <source src={wheelSrc} type="video/mp4" />
                <source src="/cockpit/wheel_transparent.mp4" type="video/mp4" />
                <source src="/cockpit/wheel_transparent.webm" type="video/webm" />
              </video>
            );
          }
          // Keep the wheel rendering under all conditions (always playing)
          // Ignore suspend/warp to ensure continuous playback
          const paused = false;
          // Allow quick fallback to plain video for visibility debugging
          if (plainWheel) {
            // Hide wheel if video failed to load
            if (wheelVideoFailed) return null;
            return (
              <video
                autoPlay
                muted
                loop
                playsInline
                aria-label="wheel-video-plain"
                style={{
                  display: 'block',
                  width: vs,
                  height: vs,
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  background: 'transparent',
                  transform: 'scale(1.0)',
                  transformOrigin: 'bottom center',
                  filter: isDimmingOverlayActive ? 'brightness(0.65) saturate(1.0)' : (isSafariUA ? 'brightness(1.3) contrast(1.4) saturate(1.2)' : undefined),
                  opacity: isDimmingOverlayActive ? 0.95 : 1,
                  transition: isDimmingOverlayActive ? 'filter 250ms ease, opacity 250ms ease' : 'none',
                  // Preserve wheel appearance for Safari
                  ...(isSafariUA ? {
                    background: 'transparent'
                  } : {})
                }}
                onError={() => {
                  // All video sources failed - hide wheel gracefully
                  setWheelVideoFailed(true);
                }}
              >
                <source src={wheelSrc} type="video/mp4" />
                <source src="/cockpit/wheel_transparent.mp4" type="video/mp4" />
                <source src="/cockpit/wheel_transparent.webm" type="video/webm" />
              </video>
            );
          }

          return (
            <LumaKeyVideo
              srcMp4={wheelSrc}
              // Target pure black background for removal
              keyColor={(vconf as any)?.keyColor ?? [0, 0, 0]}
              // Aggressive but precise black removal - higher tolerance for Safari
              keyTolerance={(vconf as any)?.keyTolerance ?? (isSafariUA ? 0.85 : 0.12)}
              keySoftness={(vconf as any)?.keySoftness ?? (isSafariUA ? 0.3 : 0.07)}
              keyMode={'chroma'}
              // Enable screen blending to eliminate dark pixels
              blendScreen={isSafariUA}
              fallbackEnabled={true}
              minCoverageRatio={isSafariUA ? 0.001 : 0.0008}
              // Disable circle protection to allow full background removal
              protectCircle={false}
              protectCenterXRatio={0.5}
              protectCenterYRatio={0.58}
              protectRadiusRatio={0}
              protectFeatherRatio={0}
              // Conservative color correction to preserve wheel appearance
              saturation={(vconf as any)?.saturation ?? 1.0}
              contrast={(vconf as any)?.contrast ?? 1.0}
              brightness={1.0}
              offsetYRatio={0}
              paused={paused}
              forceEnabled
              highQuality
              className="block"
              style={{
                display: 'block',
                width: vs,
                height: vs,
                pointerEvents: 'none',
                background: 'transparent',
                transform: 'scale(1.0)',
                transformOrigin: 'bottom center',
                filter: isDimmingOverlayActive ? 'brightness(0.65) saturate(1.0)' : (isSafariUA ? 'brightness(1.1) contrast(1.1)' : undefined),
                opacity: isDimmingOverlayActive ? 0.95 : 1,
                transition: isDimmingOverlayActive ? 'filter 250ms ease, opacity 250ms ease' : 'none',
                // Minimal Safari styling to preserve wheel appearance
                ...(isSafariUA ? {
                  background: 'transparent',
                  // Remove all filters to preserve wheel's natural look
                  filter: 'none',
                  WebkitFilter: 'none',
                  backdropFilter: 'none'
                } : {})
              }}
            />
          );
        })()}
      </div>
      {/* Power Button - centered */}
      <div
        style={{
          position: "absolute",
          bottom: `${buttonsBottomPercent}%`, // Unified vertical baseline
          left: '50%',
          transform: 'translate(-50%, 8px)',
          zIndex: 92,
          pointerEvents: showUI && !isDimmingOverlayActive && isUIUnlocked ? 'auto' : 'none',
          opacity: showUI ? 1 : 0,
          // Match beam (400ms) and HUD (300ms) fade timing
          transition: 'opacity 350ms ease',
        }}
      >
        {(() => {
          const powerSize: number = powerSizePx;
          return (
            <div style={{ pointerEvents: 'auto' }}>
              {onPowerToggle ? (
                <button
                  type="button"
                  className={`power-btn ${(blueActive && showUI) ? 'power-btn-active' : ''}`}
                  data-analytics={`⚡ Power Toggle: ${blueActive ? 'off' : 'on'}`}
                  data-id="power"
                  onMouseEnter={() => { if (!showUI || !mounted) return; try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
                  onClick={() => {
                    if (!showUI || !isUIUnlocked) return;
                    // Play button sound using SFX system
                    try {
                      sfx.play('button', 0.95);
                    } catch {}

                    // Track explicit power button click so analytics reflect blue button usage
                    try {
                      track('click', {
                        payload: {
                          element_tag: 'button',
                          element_class: 'power-btn',
                          element_text: 'Power',
                          element_label: '⚡ Power Button',
                          data_id: 'power',
                        }
                      });
                      // Also expose a dedicated event for possible server aggregation
                      track('power_button_clicked');
                      
                      // Track with new events_v2 system
                      import('@/lib/analytics').then(({ trackEvent }) => {
                        trackEvent('power_click', { source: 'wheel' });
                      }).catch(() => {});
                    } catch {}

                    // Toggle behavior: if blue is active, turn OFF; otherwise turn ON blue
                    if (blueActive) {
                      onBeamColorChange?.('off');
                    } else {
                      onBeamColorChange?.('blue');
                    }
                  }}
                  aria-label="Power"
                  title="Power"
                  style={{
                    width: 72, 
                    height: 72, 
                    borderRadius: 9999,
                    opacity: 1,
                    transition: 'opacity 300ms ease, transform 150ms ease, box-shadow 200ms ease, filter 180ms ease',
                    pointerEvents: 'auto',
                  }}
                >
                  <span className="sr-only">Power Button</span>
                  <span className="power-glyph" aria-hidden>
                    <img src="/elements/power.webp" alt="" className="power-icon" onError={(e)=>{ try { const img = e.currentTarget; img.onerror = null; img.src = '/elements/lightning.webp'; } catch {} }} />
                  </span>
                </button>
              ) : null}
            </div>
          );
        })()}
      </div>

      {/* Comms Button - yellow hub positioned slightly to the left of center (mobile nudge) */}
      <div
        style={{
          position: "absolute",
          bottom: `${buttonsBottomPercent}%`, // Same vertical level as blue button
          // Position to the left of center
          left: `calc(50% - ${buttonOffsetPx}px - 4px)`,
          transform: 'translate(-50%, 8px)',
          zIndex: 92,
          pointerEvents: showUI && !isDimmingOverlayActive && isUIUnlocked ? 'auto' : 'none',
          opacity: showUI ? 1 : 0,
          // Match beam (400ms) and HUD (300ms) fade timing
          transition: 'opacity 350ms ease',
        }}
      >
        {(() => {
          return (
            <HoloHubMenu
                items={[
                LINKS.instagram ? { id: 'ig', label: 'Instagram', href: LINKS.instagram, icon: '/elements/instagram.webp', color: '#E1306C' } : null,
                LINKS.tiktok ? { id: 'tt', label: 'TikTok', href: LINKS.tiktok, icon: '/elements/tiktok.webp', color: '#69C9D0' } : null,
                LINKS.youtube ? { id: 'yt', label: 'YouTube', href: LINKS.youtube, icon: '/elements/youtube.webp', color: '#FF0000' } : null,
                LINKS.spotify ? { id: 'sp', label: 'Spotify', href: LINKS.spotify, icon: '/elements/spotify.webp', color: '#1DB954' } : null,
                LINKS.apple ? { id: 'am', label: 'Apple Music', href: LINKS.apple, icon: '/elements/apple.webp', color: '#FC54AF' } : null,
              ].filter(Boolean) as any}
                isLightningPlanet={isLightningPlanet}
                radius={90}
                hubColor={activeBeamColor === 'yellow' ? "#F2EF1D" : "#F2EF1D"}
                isActive={activeBeamColor === 'yellow'}
                itemSize={yellowItemSize}
                hubSize={yellowHubSize}
                angles={{ sp: -36, am: -18, ig: 0, tt: 18, yt: 36 }}
                anchorBottomPercent={buttonsBottomPercent}
                anchorOffsetPx={buttonOffsetPx}
                closeSignal={closeAllSignal}
                suspend={suspendUI || suspendYellowPanel || !isUIUnlocked}
                onToggle={(isOpen) => {
                  if (!showUI || !isUIUnlocked) return;
                  if (isOpen) {
                    // Play button sound
                    try {
                      const a = buttonRef.current;
                      if (a) { a.currentTime = 0; a.volume = 0.95; a.play().catch(()=>{}); }
                    } catch {}
                    // If pink display is open, sequence: fade out pink → switch beam → fade in yellow panel
                    if (joinAlienOpen || activeBeamColor === 'pink') {
                      // Prevent yellow panel from showing while pink fades out and beam flips
                      setSuspendYellowPanel(true);
                      // Start pink fade-out (parent will handle setJoinAlienOpen)
                      onBeamColorChange?.('off');
                      // After pink fade completes (~350ms), flip beam to yellow and show panel together
                      yellowFromPinkTimeoutA.current = window.setTimeout(() => {
                        setActiveBeamColor('yellow');
                        onBeamColorChange?.('yellow');
                        // Show panel immediately with beam
                        setSuspendYellowPanel(false);
                      }, 360);
                    } else {
                      // Comms ON: beam and yellow panel should appear together
                      setActiveBeamColor('yellow');
                      onBeamColorChange?.('yellow');
                      // Show panel immediately with beam
                      setSuspendYellowPanel(false);
                    }
                  } else {
                    // Comms OFF: beam should disappear completely
                    // Play button sound when closing
                    try {
                      const a = buttonRef.current;
                      if (a) { a.currentTime = 0; a.volume = 0.95; a.play().catch(()=>{}); }
                    } catch {}
                    // Always turn off the beam when comms is closed
                    onBeamColorChange?.('off'); // tell parent to turn ALL displays off
                    // Reset local state after beam fully fades out to avoid blue flash during fade
                    setTimeout(() => {
                      suppressNextBeamNotifyRef.current = true;
                      setActiveBeamColor('blue');
                    }, 400);
                    // Cancel any pending transition timers
                    if (yellowFromPinkTimeoutA.current) { window.clearTimeout(yellowFromPinkTimeoutA.current); yellowFromPinkTimeoutA.current = null; }
                    if (yellowFromPinkTimeoutB.current) { window.clearTimeout(yellowFromPinkTimeoutB.current); yellowFromPinkTimeoutB.current = null; }
                    setSuspendYellowPanel(false);
                  }
                }}
              />
          );
        })()}
      </div>

      {/* Signal Button - positioned to the right of power button */}
      <div
        style={{
          position: "absolute",
          bottom: `${buttonsBottomPercent}%`, // Same vertical level as blue and yellow buttons
          left: `calc(50% + ${buttonOffsetPx}px + 10px)`, // Nudge slightly further right
          transform: 'translate(-50%, 8px)',
          zIndex: 92,
          pointerEvents: showUI && !isDimmingOverlayActive && isUIUnlocked ? 'auto' : 'none',
          opacity: showUI ? 1 : 0,
          // Match beam (400ms) and HUD (300ms) fade timing
          transition: 'opacity 350ms ease',
        }}
      >
        {(() => {
          const joinSize: number = 72; // Fixed size to match yellow and blue buttons
          return (
            <div style={{ pointerEvents: showUI && !isDimmingOverlayActive && isUIUnlocked ? 'auto' : 'none' }}>
              {/* Signal button for Twitch stream */}
              <HoloJoinButton size={joinSize} hubColor="#FC54AF" onClick={handleSignalToggle} label="Live Stream" iconSrc="/elements/antennas.webp" isActive={joinAlienOpen} dataTourId="signal-button" />
            </div>
          );
        })()}
      </div>

      {/* Separate Join Aliens Form - bottom should touch the light beam top border */}
      {(() => {
        // Position pink display using unified touch point system
        const beamBottomCss = 'var(--display-touch-top)';
        return (
          <div
            ref={joinFormRef}
            style={{
              position: "fixed",
              // Position from top instead to ensure it touches profile bar
              top: '64px',
              // Bottom aligns with the TOP of the light beam (border line)
              bottom: 'calc(var(--light-beam-boundary) + var(--beam-height))',
              // Center horizontally in the viewport (always centered)
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 125,
              pointerEvents: joinAlienOpen && !suspendUI ? 'auto' : 'none',
              opacity: joinAlienOpen && !suspendUI ? 1 : 0,
              // Match surrounding UI fade for consistency
              transition: 'opacity 350ms ease',
            }}
          >
            {/* Join form panel */}
            <div
              style={{
                // Match the blue display width (same formula as DashboardApp)
                width: 'calc(var(--display-width) + 32px)',
                height: '100%',
                borderRadius: 'var(--display-border-radius)',
                padding: '0px 4px 8px 4px',
                color: '#fff',
                background: `
                  linear-gradient(180deg, #FC54AF44, #FC54AF26),
                  radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%)
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
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <JoinAliens visible={joinAlienOpen && !suspendUI} />
            </div>
          </div>
        );
      })()}





      {/* "Enter the Heartverse" text above start button - show on initial screen, hide when START clicked/warp starts */}
      {!hideStartButton && !isUIUnlocked && !suspendUI && (
        <div
          style={{
            position: "absolute",
            // Anchor to the same baseline used by other cockpit buttons for stability
            bottom: `calc(${buttonsBottomPercent}% + 40px)`,
            left: '50%',
            transform: 'translate(-50%, 0)',
            zIndex: 9998, // Just below the start button (9999)
            pointerEvents: 'none',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              fontFamily: 'OrbitronLocal, InterLocal, system-ui, sans-serif',
              fontWeight: 900,
              fontSize: 'clamp(18px, 4vw, 28px)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#fff',
              textShadow: `
                0 0 10px #19E3FF,
                0 0 20px #19E3FF,
                0 0 30px #19E3FF,
                0 0 40px #19E3FF,
                2px 2px 4px rgba(0,0,0,0.8)
              `,
              filter: 'brightness(1.1) saturate(1.2)',
              animation: 'heartverseGlow 2.5s ease-in-out infinite',
              whiteSpace: 'nowrap'
            }}
          >
            {getWelcomeText()}
          </div>
        </div>
      )}

      {/* Start button positioned with fixed baseline (no responsive drift) */}
      {!hideStartButton && <button
        onClick={handleLaunch}
        data-no-track
        className={`pointer-events-auto wheel-play${isStart ? ' chx' : ''} no-spotlight${isStart && startPulseOn ? ' start-pulse' : ''}`}
        style={{
          position: "absolute",
          // Anchor to cockpit buttons baseline with a fixed offset so position doesn't change across breakpoints
          bottom: `calc(${buttonsBottomPercent}% - ${startBottomOffsetPx}px)`,
          left: '50%',
          // Slightly larger start button for better prominence
          width: startButtonSizePx * 1.02,
          height: startButtonSizePx * 1.02,
          borderRadius: 9999,
          transform: `translate(-50%, 0)`,
          zIndex: 9999, // HIGHEST z-index to ensure always clickable
          // ALWAYS allow pointer events for Start button
          pointerEvents: 'auto',
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
              src="/elements/start.webp?v=20250915c"
              alt="Start"
              className="chx-icon"
              onError={(e) => { try { const img = e.currentTarget; img.onerror = null; img.src = '/elements/start.webp'; } catch {} }}
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
      </button>}

      {/* Temporary HeartCoin Celebration Test Button (hidden by default) */}
      {showTestCelebrations && <button
        onClick={() => triggerHeartCoinCelebration(1)}
        data-no-track
        className="pointer-events-auto"
        style={{
          position: "absolute",
          bottom: `calc(-2vh + ${vs * 0.35}px - 150px)`, // Position above START button
          left: '50%',
          width: 60,
          height: 60,
          borderRadius: 9999,
          transform: `translate(-50%, 0)`,
          zIndex: 9998,
          pointerEvents: 'auto',
          background: 'rgba(255, 20, 147, 0.8)',
          border: '2px solid #ff1493',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translate(-50%, 0) scale(1.1)';
          e.currentTarget.style.background = 'rgba(255, 20, 147, 1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translate(-50%, 0) scale(1)';
          e.currentTarget.style.background = 'rgba(255, 20, 147, 0.8)';
        }}
        aria-label="Test HeartCoin Celebration"
        title="Test HeartCoin Celebration (+1)"
      >
        ❤️
      </button>}

      {/* Card Purchase Celebration Test Button (hidden by default) */}
      {showTestCelebrations && <button
        onClick={() => triggerCardCelebration('/cards/CHXNDLER.webp', 'CHXNDLER')}
        data-no-track
        className="pointer-events-auto"
        style={{
          position: "absolute",
          bottom: `calc(-2vh + ${vs * 0.35}px - 150px)`, // Position at same level as HeartCoin button
          left: 'calc(50% - 80px)', // Position to the left of HeartCoin button
          width: 60,
          height: 60,
          borderRadius: 9999,
          transform: `translate(-50%, 0)`,
          zIndex: 9998,
          pointerEvents: 'auto',
          background: 'rgba(147, 51, 234, 0.8)',
          border: '2px solid #9333ea',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translate(-50%, 0) scale(1.1)';
          e.currentTarget.style.background = 'rgba(147, 51, 234, 1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translate(-50%, 0) scale(1)';
          e.currentTarget.style.background = 'rgba(147, 51, 234, 0.8)';
        }}
        aria-label="Test Card Purchase Celebration"
        title="Test Card Purchase Celebration"
      >
        🃏
      </button>}

      {/* Badge Celebration Test Button (hidden by default) */}
      {showTestCelebrations && <button
        onClick={() => triggerBadgeCelebration('/badges/ocean surge.webp', 'Ocean Surge')}
        data-no-track
        className="pointer-events-auto"
        style={{
          position: "absolute",
          bottom: `calc(-2vh + ${vs * 0.35}px - 150px)`, // Same level as others
          left: 'calc(50% + 80px)', // Position to the right of HeartCoin button
          width: 60,
          height: 60,
          borderRadius: 9999,
          transform: `translate(-50%, 0)`,
          zIndex: 9998,
          pointerEvents: 'auto',
          background: 'rgba(59, 130, 246, 0.8)',
          border: '2px solid #3b82f6',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translate(-50%, 0) scale(1.1)';
          e.currentTarget.style.background = 'rgba(59, 130, 246, 1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translate(-50%, 0) scale(1)';
          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.8)';
        }}
        aria-label="Test Badge Celebration"
        title="Test Badge Celebration"
      >
        🏅
      </button>}

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
          box-shadow: none !important;
          outline: none !important;
          position: relative;
          cursor: pointer;
          transform: translateZ(0);
          will-change: transform, box-shadow;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        /* Hide all pseudo-elements for CHX variant - no ring/halo effects */
        .wheel-play.chx::before,
        .wheel-play.chx::after{
          display: none !important;
          content: none !important;
        }
        .chx-icon{ width: 100%; height: 100%; object-fit: contain; display:block; will-change: transform, filter;
          filter:
            drop-shadow(0 2px 4px rgba(0,0,0,0.3))
            drop-shadow(0 4px 8px rgba(0,0,0,0.2))
            drop-shadow(0 0 12px rgba(25,227,255,0.4));
          animation: none;
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        /* Start button pulsing (default). Turns off after first click */
        .wheel-play.chx.start-pulse .chx-icon{
          animation: startPulse 1.9s ease-in-out infinite;
        }
        .wheel-play.chx:hover .chx-icon{
          animation: none;
          transform: scale(1.06) translateY(-2px);
          filter:
            drop-shadow(0 4px 8px rgba(0,0,0,0.4))
            drop-shadow(0 8px 16px rgba(0,0,0,0.3));
        }
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
        /* CHXNDLER start button hover: grow slightly with inner glow */
        .wheel-play.chx:hover{
          outline: none;
          transform: scale(1.06) translateZ(0);
          filter: brightness(1.12) saturate(1.2);
        }
        .wheel-play.chx:hover .chx-icon{
          filter:
            brightness(1.15)
            saturate(1.3)
            drop-shadow(0 0 8px rgba(25, 227, 255, 0.8))
            drop-shadow(0 0 16px rgba(25, 227, 255, 0.5));
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
          filter: saturate(1.25) brightness(1.12);
        }
        
        /* Power button styles */
        .power-btn{ 
          position: relative;
          display:grid; place-items:center;
          border-radius:9999px;
          /* Match Live Stream button: black glass shell */
          background:
            radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.08), rgba(255,255,255,0) 42%),
            linear-gradient(180deg, #0b0b0b, #000 64%);
          border:1px solid rgba(255,255,255,.18);
          box-shadow:
            0 14px 24px rgba(0,0,0,.55),
            inset 0 1px 0 rgba(255,255,255,.22),
            inset 0 -6px 14px rgba(0,0,0,.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: transform .15s ease, box-shadow .2s ease, filter .18s ease;
        }
        /* Remove outer halo by default; only show when active via .power-btn-active::before */
        .power-btn::after{ /* sheen + scanlines */
          content:""; position:absolute; inset:0; border-radius:9999px; pointer-events:none; mix-blend-mode:screen; opacity:.6;
          background:
            linear-gradient(120deg, rgba(255,255,255,.18), rgba(255,255,255,0) 60%),
            repeating-linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.08) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px);
        }
        .power-glyph{ position:relative; display:inline-flex; align-items:center; justify-content:center; color:#fff;
          /* Neutral by default; blue glow only when active */
          mix-blend-mode: screen;
          filter: brightness(1.02) saturate(1.02);
        }
        .power-icon{ width: 86%; height: 86%; object-fit: contain; display:block; filter: none; }
        /* Inner cyan glow masked to the power symbol shape appears only when active */
        .power-btn-active .power-glyph::before{
          content:""; position:absolute; inset:14%; pointer-events:none; mix-blend-mode:screen;
          background: radial-gradient(closest-side, #19E3FFCC, #19E3FF55 60%, transparent 78%);
          filter: blur(5px) saturate(1.05) brightness(1.02);
        }
        .power-btn:hover{
          transform: scale(1.07);
          box-shadow:
            0 18px 30px rgba(0,0,0,.6),
            inset 0 1px 0 rgba(255,255,255,.28),
            inset 0 -8px 18px rgba(0,0,0,.65);
          filter: brightness(1.04) saturate(1.06);
        }
        .power-btn:active{ transform: scale(.96); }
        @keyframes powerPulse{ 0%,100%{ filter: brightness(1) } 50%{ filter: brightness(1.08) } }
        
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
        
        /* Enhanced glow effects when blue display is active */
        .power-btn-active {
          /* Keep dark shell, add cyan tint overlay when active */
          background:
            radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.08), rgba(255,255,255,0) 42%),
            rgba(25,227,255,0.35),
            linear-gradient(180deg, #0b0b0b, #000 64%);
          animation: powerActiveGlow 2s ease-in-out infinite, powerPulse 2.6s ease-in-out infinite;
          box-shadow:
            0 14px 28px rgba(0,0,0,.6),
            0 0 40px #19E3FF,
            0 0 80px #19E3FFFF,
            0 0 120px #19E3FFCC,
            0 0 160px #19E3FF88,
            inset 0 1px 0 rgba(255,255,255,.22),
            inset 0 -6px 14px rgba(0,0,0,.6);
        }
        .power-btn-active::before { /* outer halo when active */
          content:""; position:absolute; inset:-1%; border-radius:9999px; pointer-events:none;
          box-shadow: 0 0 50px #19E3FFFF, 0 0 100px #19E3FFCC, 0 0 150px #19E3FF88;
        }
        .power-btn-active .power-glyph{
          filter: brightness(1.06) saturate(1.1)
            drop-shadow(0 0 10px #19E3FF)
            drop-shadow(0 0 22px #19E3FF);
        }
        .power-btn-active .power-icon{
          filter: saturate(1.05) brightness(1.03)
            drop-shadow(0 0 8px #19E3FF)
            drop-shadow(0 0 18px #19E3FF);
        }
        @keyframes powerActiveGlow {
          0%, 100% { 
            filter: brightness(1.3) saturate(1.4);
            transform: scale(1);
          }
          50% { 
            filter: brightness(1.6) saturate(1.7);
            transform: scale(1.02);
          }
        }

        /* Beam flow animation for light beam */
        @keyframes beamFlow {
          0% { background-position: 0% 0%, 0% 0px; }
          100% { background-position: 0% 0%, 0% 160px; }
        }

        /* Enter the Heartverse text glow animation */
        @keyframes heartverseGlow {
          0%, 100% {
            textShadow: 
              0 0 10px #19E3FF,
              0 0 20px #19E3FF,
              0 0 30px #19E3FF,
              0 0 40px #19E3FF,
              2px 2px 4px rgba(0,0,0,0.8);
            filter: brightness(1.1) saturate(1.2);
          }
          50% {
            textShadow: 
              0 0 15px #19E3FF,
              0 0 30px #19E3FF,
              0 0 45px #19E3FF,
              0 0 60px #19E3FF,
              2px 2px 6px rgba(0,0,0,0.9);
            filter: brightness(1.3) saturate(1.4);
          }
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
      <audio ref={buttonRef} src="/audio/click.mp3" preload="auto" />
    </div>
  );
});

export default SteeringWheelOverlay;
