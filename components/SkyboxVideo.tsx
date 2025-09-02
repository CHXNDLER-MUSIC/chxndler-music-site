"use client";
import React, { useState } from "react";

export default function SkyboxVideo({
  brightness = 0.95,
  srcWebm,
  srcMp4 = "/skies/ocean-girl.mp4",
  videoKey,
  offsetY = "2vh",
  flySignal,
}:{
  brightness?: number;
  srcWebm?: string;
  srcMp4?: string;
  videoKey?: string;
  offsetY?: number | string; // shift video vertically, e.g. "-6vh" or -40 (px)
  flySignal?: number; // increment to trigger brief zoom/fly effect
}) {
  // Default to visible to avoid missing sky if loadeddata doesn't fire
  const [ready, setReady] = useState(true);
  const translateY = typeof offsetY === "number" ? `${offsetY}px` : offsetY;
  const [flying, setFlying] = useState(false);
  
  // Brief zoom/blur to simulate flying to another world
  React.useEffect(() => {
    if (typeof flySignal !== 'number') return;
    setFlying(true);
    const t = setTimeout(() => setFlying(false), 700);
    return () => clearTimeout(t);
  }, [flySignal]);

  return (
    /* z-10 so it's above any page bg image; HUD slots are z>=30 */
    <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
      <div className="h-full w-full">
        <video
          key={videoKey}
          autoPlay muted loop playsInline preload="auto"
          onEnded={(e)=>{ try { const v = e.currentTarget as HTMLVideoElement; v.currentTime = 0; v.play().catch(()=>{}); } catch {} }}
          onLoadedData={() => setReady(true)}
          onCanPlay={() => setReady(true)}
          onCanPlayThrough={() => setReady(true)}
          className="h-full w-full object-cover transition-opacity duration-500"
          style={{
            opacity: ready ? 1 : 0,
            filter: `brightness(${brightness})${flying ? ' saturate(1.1) blur(1.2px)' : ''}`,
            transform: `translateY(${translateY}) scale(${flying ? 1.12 : 1})`,
            transition: 'opacity 500ms ease, transform 650ms ease, filter 650ms ease'
          }}
        >
          {/* Prefer MP4 first to avoid 404s if WebM is missing */}
          {srcMp4 ? <source src={srcMp4} type="video/mp4" /> : null}
          {srcWebm ? <source src={srcWebm} type="video/webm" /> : null}
        </video>
      </div>
    </div>
  );
}
