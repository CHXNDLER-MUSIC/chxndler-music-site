"use client";
import React, { useRef, useState } from "react";
import { sfx } from "@/lib/sfx";
import { DEBUG_MEDIA, dlog } from "@/lib/debug";

export default function SkyboxVideo({
  brightness = 0.95,
  srcWebm,
  srcMp4 = "/skies/ocean-girl.mp4",
  videoKey,
  offsetY = "2vh",
  flySignal,
  onFlyStart,
  onFlyEnd,
  allowWarp = false,
  onBasePlaying,
  holdLightspeed = false,
  readyToReveal = false,
  minDurationMs = 1200,
}:{
  brightness?: number;
  srcWebm?: string;
  srcMp4?: string;
  videoKey?: string;
  offsetY?: number | string; // shift video vertically, e.g. "-6vh" or -40 (px)
  flySignal?: number; // increment to trigger brief zoom/fly effect
  onFlyStart?: () => void;
  onFlyEnd?: () => void;
  allowWarp?: boolean; // if false, disables warp sfx/overlay even when flySignal changes
  onBasePlaying?: () => void; // fires when base sky video is playing (useful after warp)
  holdLightspeed?: boolean; // if true, keep lightspeed overlay visible until readyToReveal becomes true
  readyToReveal?: boolean;  // when holdLightspeed, hide overlay when this becomes true
  minDurationMs?: number;   // minimum duration the lightspeed overlay should remain visible
}) {
  // Default to visible to avoid missing sky if loadeddata doesn't fire
  const [ready, setReady] = useState(true);
  const [hasStartedLoading, setHasStartedLoading] = useState(false);
  const translateY = typeof offsetY === "number" ? `${offsetY}px` : offsetY;
  const [flying, setFlying] = useState(false);
  const [showLightspeed, setShowLightspeed] = useState(false);
  const baseRef = useRef<HTMLVideoElement|null>(null);
  const lsRef = useRef<HTMLVideoElement|null>(null);
  const basePlayNotified = React.useRef<string | null>(null);
  const lsTimerRef = useRef<number | undefined>(undefined);
  const lsStartRef = useRef<number | null>(null);
  const flyEndCalledRef = useRef(false);
  const firstRunRef = useRef(true);
  // Stable refs for callback props to avoid effect thrash on each render
  const onFlyEndRef = useRef(onFlyEnd);
  const onBasePlayingRef = useRef(onBasePlaying);
  React.useEffect(() => { onFlyEndRef.current = onFlyEnd; }, [onFlyEnd]);
  React.useEffect(() => { onBasePlayingRef.current = onBasePlaying; }, [onBasePlaying]);
  
  // Brief zoom/blur to simulate flying to another world
  React.useEffect(() => {
    if (!allowWarp) return;
    if (typeof flySignal !== 'number') return;
    // Brief camera zoom/blur
    setFlying(true);
    const t = setTimeout(() => setFlying(false), 700);

    // Trigger lightspeed overlay clip
    try {
      setShowLightspeed(true);
      lsStartRef.current = Date.now();
      const v = lsRef.current;
      if (v) { v.currentTime = 0; void v.play().catch(()=>{}); }
      try { sfx.play('warp', 0.7); } catch {}
      flyEndCalledRef.current = false;
      if (onFlyStart) try { onFlyStart(); } catch {}
      if (!holdLightspeed) {
        if (lsTimerRef.current !== undefined) window.clearTimeout(lsTimerRef.current);
        // Timed lightspeed overlay when not holding for readiness
        lsTimerRef.current = window.setTimeout(() => {
          setShowLightspeed(false);
          lsTimerRef.current = undefined;
          if (!flyEndCalledRef.current && onFlyEndRef.current) { try { onFlyEndRef.current(); } catch {} }
          flyEndCalledRef.current = true;
        }, Math.max(0, minDurationMs));
      } else {
        // When holding for readiness, ensure overlay remains until readyToReveal becomes true
        if (lsTimerRef.current !== undefined) { window.clearTimeout(lsTimerRef.current); lsTimerRef.current = undefined; }
      }
    } catch {}

    return () => { clearTimeout(t); if (lsTimerRef.current !== undefined) { window.clearTimeout(lsTimerRef.current); lsTimerRef.current = undefined; } };
  }, [flySignal, allowWarp, holdLightspeed, minDurationMs]);

  // Disable auto warp on initial page open unless allowWarp is true
  React.useEffect(() => {
    if (!allowWarp) { firstRunRef.current = false; return; }
    if (!firstRunRef.current) return;
    firstRunRef.current = false;
    try {
      setShowLightspeed(true);
      lsStartRef.current = Date.now();
      const v = lsRef.current;
      if (v) { v.currentTime = 0; void v.play().catch(()=>{}); }
      try { sfx.play('warp', 0.7); } catch {}
      if (!holdLightspeed) {
        if (lsTimerRef.current !== undefined) window.clearTimeout(lsTimerRef.current);
        lsTimerRef.current = window.setTimeout(() => {
          setShowLightspeed(false);
          lsTimerRef.current = undefined;
        }, Math.max(0, minDurationMs));
      } else {
        if (lsTimerRef.current !== undefined) { window.clearTimeout(lsTimerRef.current); lsTimerRef.current = undefined; }
      }
    } catch {}
    return () => { if (lsTimerRef.current !== undefined) { window.clearTimeout(lsTimerRef.current); lsTimerRef.current = undefined; } };
  }, [allowWarp, holdLightspeed, minDurationMs]);

  // When holding overlay, hide it as soon as readyToReveal is true
  React.useEffect(() => {
    if (!holdLightspeed) return;
    if (!showLightspeed) return;
    if (!readyToReveal) return;
    const startedAt = lsStartRef.current || Date.now();
    const elapsed = Date.now() - startedAt;
    const remain = Math.max(0, minDurationMs - elapsed);
    if (lsTimerRef.current !== undefined) { window.clearTimeout(lsTimerRef.current); lsTimerRef.current = undefined; }
    lsTimerRef.current = window.setTimeout(() => {
      setShowLightspeed(false);
      lsTimerRef.current = undefined;
      if (!flyEndCalledRef.current && onFlyEndRef.current) { try { onFlyEndRef.current(); } catch {} }
      flyEndCalledRef.current = true;
    }, remain);
  }, [holdLightspeed, readyToReveal, showLightspeed, minDurationMs]);

  // Pause base sky video while lightspeed overlay is active
  React.useEffect(() => {
    try {
      const base = baseRef.current;
      if (!base) return;
      if (showLightspeed) {
        base.pause();
      } else {
        // resume base silently and start loading if not already
        if (!hasStartedLoading) {
          setHasStartedLoading(true);
        }
        void base.play().catch(()=>{});
      }
    } catch {}
  }, [showLightspeed, hasStartedLoading]);

  // Start loading video as soon as videoKey changes (preload)
  React.useEffect(() => {
    const base = baseRef.current;
    if (!base || !videoKey) return;
    
    // Start loading the new video immediately
    try {
      base.load(); // Force reload with new source
      setHasStartedLoading(true);
      // Start preloading
      base.preload = 'auto';
    } catch {}
  }, [videoKey]);

  // Notify when the base sky starts playing (once per videoKey)
  React.useEffect(() => {
    const base = baseRef.current;
    if (!base) return;
    const key = String(videoKey || '');
    const onPlaying = () => {
      if (showLightspeed) return; // ignore while overlay is visible
      if (basePlayNotified.current === key) return;
      basePlayNotified.current = key;
      try { if (DEBUG_MEDIA) dlog('Skybox base video onplaying', { key, srcMp4 }); onBasePlayingRef.current && onBasePlayingRef.current(); } catch {}
    };
    base.addEventListener('playing', onPlaying);
    return () => { base.removeEventListener('playing', onPlaying); };
  }, [videoKey, showLightspeed, srcMp4]);

  return (
    /* z-10 so it's above any page bg image; HUD slots are z>=30 */
    <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
      <div className="h-full w-full">
        {/* Sky video (base) */}
        <video
          ref={baseRef}
          key={videoKey}
          autoPlay muted loop playsInline preload="auto" controls={false}
          // Prevent any default interactions that could open the video URL
          // on some mobile browsers when tapping during/after warp
          controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
          disablePictureInPicture
          // @ts-ignore: Safari-specific remote playback disable
          disableRemotePlayback
          tabIndex={-1}
          // Removed manual loop handling - let native loop attribute handle seamless looping
          onLoadStart={() => setHasStartedLoading(true)}
          onLoadedData={() => setReady(true)}
          onCanPlay={() => setReady(true)}
          onCanPlayThrough={() => setReady(true)}
          onPlaying={() => setReady(true)} // Ensure video stays visible during playback
          className="h-full w-full object-cover"
          style={{
            opacity: (ready && !showLightspeed) ? 1 : 0,
            transition: showLightspeed ? 'opacity 300ms ease, transform 650ms ease, filter 650ms ease' : 'transform 650ms ease, filter 650ms ease', // Only transition opacity during warp
            filter: `brightness(${brightness})${flying ? ' saturate(1.1) blur(1.2px)' : ''}`,
            transform: `translateY(${translateY}) scale(${flying ? 1.12 : 1})`,
            pointerEvents: 'none'
          }}
        >
          {/* Prefer MP4 first to avoid 404s if WebM is missing */}
          {srcMp4 ? <source src={srcMp4} type="video/mp4" /> : null}
          {srcWebm ? <source src={srcWebm} type="video/webm" /> : null}
        </video>

        {/* Lightspeed transition overlay (plays once on song change) */}
        {showLightspeed ? (
          <video
            ref={lsRef}
            autoPlay
            loop={holdLightspeed && !readyToReveal}
            muted
            playsInline
            preload="auto"
            controls={false}
            controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
            disablePictureInPicture
            // @ts-ignore
            disableRemotePlayback
            tabIndex={-1}
            onEnded={() => { setShowLightspeed(false); if (!flyEndCalledRef.current && onFlyEndRef.current) { try { onFlyEndRef.current(); } catch {} } flyEndCalledRef.current = true; }}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: `brightness(${Math.max(0.9, brightness)})`, mixBlendMode: 'screen' as any }}
          >
            <source src="/skies/lightspeed.mp4" type="video/mp4" />
          </video>
        ) : null}
      </div>
    </div>
  );
}
