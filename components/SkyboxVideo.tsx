"use client";
import React, { useRef, useState } from "react";
import { sfx } from "@/lib/sfx";

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
}) {
  // Default to visible to avoid missing sky if loadeddata doesn't fire
  const [ready, setReady] = useState(true);
  const translateY = typeof offsetY === "number" ? `${offsetY}px` : offsetY;
  const [flying, setFlying] = useState(false);
  const [showLightspeed, setShowLightspeed] = useState(false);
  const baseRef = useRef<HTMLVideoElement|null>(null);
  const lsRef = useRef<HTMLVideoElement|null>(null);
  const basePlayNotified = React.useRef<string | null>(null);
  const lsTimerRef = useRef<number | undefined>(undefined);
  const flyEndCalledRef = useRef(false);
  const firstRunRef = useRef(true);
  
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
      const v = lsRef.current;
      if (v) { v.currentTime = 0; void v.play().catch(()=>{}); }
      try { sfx.play('warp', 0.7); } catch {}
      flyEndCalledRef.current = false;
      if (onFlyStart) try { onFlyStart(); } catch {}
      if (lsTimerRef.current !== undefined) window.clearTimeout(lsTimerRef.current);
      // Keep the lightspeed overlay visible a bit longer on song change
      lsTimerRef.current = window.setTimeout(() => {
        setShowLightspeed(false);
        lsTimerRef.current = undefined;
        if (!flyEndCalledRef.current && onFlyEnd) { try { onFlyEnd(); } catch {} }
        flyEndCalledRef.current = true;
      }, 1800);
    } catch {}

    return () => { clearTimeout(t); if (lsTimerRef.current !== undefined) { window.clearTimeout(lsTimerRef.current); lsTimerRef.current = undefined; } };
  }, [flySignal, allowWarp]);

  // Disable auto warp on initial page open unless allowWarp is true
  React.useEffect(() => {
    if (!allowWarp) { firstRunRef.current = false; return; }
    if (!firstRunRef.current) return;
    firstRunRef.current = false;
    try {
      setShowLightspeed(true);
      const v = lsRef.current;
      if (v) { v.currentTime = 0; void v.play().catch(()=>{}); }
      try { sfx.play('warp', 0.7); } catch {}
      if (lsTimerRef.current !== undefined) window.clearTimeout(lsTimerRef.current);
      lsTimerRef.current = window.setTimeout(() => {
        setShowLightspeed(false);
        lsTimerRef.current = undefined;
      }, 1800);
    } catch {}
    return () => { if (lsTimerRef.current !== undefined) { window.clearTimeout(lsTimerRef.current); lsTimerRef.current = undefined; } };
  }, [allowWarp]);

  // Pause base sky video while lightspeed overlay is active
  React.useEffect(() => {
    try {
      const base = baseRef.current;
      if (!base) return;
      if (showLightspeed) {
        base.pause();
      } else {
        // resume base silently
        void base.play().catch(()=>{});
      }
    } catch {}
  }, [showLightspeed]);

  // Notify when the base sky starts playing (once per videoKey)
  React.useEffect(() => {
    const base = baseRef.current;
    if (!base) return;
    const key = String(videoKey || '');
    const onPlaying = () => {
      if (showLightspeed) return; // ignore while overlay is visible
      if (basePlayNotified.current === key) return;
      basePlayNotified.current = key;
      try { onBasePlaying && onBasePlaying(); } catch {}
    };
    base.addEventListener('playing', onPlaying);
    return () => { base.removeEventListener('playing', onPlaying); };
  }, [videoKey, onBasePlaying, showLightspeed]);

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
          onEnded={(e)=>{ try { const v = e.currentTarget as HTMLVideoElement; v.currentTime = 0; v.play().catch(()=>{}); } catch {} }}
          onLoadedData={() => setReady(true)}
          onCanPlay={() => setReady(true)}
          onCanPlayThrough={() => setReady(true)}
          className="h-full w-full object-cover transition-opacity duration-500"
          style={{
            opacity: (ready && !showLightspeed) ? 1 : 0,
            filter: `brightness(${brightness})${flying ? ' saturate(1.1) blur(1.2px)' : ''}`,
            transform: `translateY(${translateY}) scale(${flying ? 1.12 : 1})`,
            transition: 'opacity 500ms ease, transform 650ms ease, filter 650ms ease',
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
            muted
            playsInline
            preload="auto"
            controls={false}
            controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
            disablePictureInPicture
            // @ts-ignore
            disableRemotePlayback
            tabIndex={-1}
            onEnded={() => { setShowLightspeed(false); if (!flyEndCalledRef.current && onFlyEnd) { try { onFlyEnd(); } catch {} } flyEndCalledRef.current = true; }}
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
