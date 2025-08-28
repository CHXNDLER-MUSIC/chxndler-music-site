"use client";
import React, { useState } from "react";

export default function SkyboxVideo({
  brightness = 0.95,
  srcWebm,
  srcMp4 = "/skies/ocean-girl.mp4",
  videoKey,
  offsetY = 0,
}:{
  brightness?: number;
  srcWebm?: string;
  srcMp4?: string;
  videoKey?: string;
  offsetY?: number | string; // shift video vertically, e.g. "-6vh" or -40 (px)
}) {
  // Default to visible to avoid missing sky if loadeddata doesn't fire
  const [ready, setReady] = useState(true);
  const translateY = typeof offsetY === "number" ? `${offsetY}px` : offsetY;

  return (
    /* z-10 so it's above any page bg image; HUD slots are z>=30 */
    <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
      <div className="windshield-mask h-full w-full">
        <video
          key={videoKey}
          autoPlay muted loop playsInline preload="auto"
          onEnded={(e)=>{ try { const v = e.currentTarget as HTMLVideoElement; v.currentTime = 0; v.play().catch(()=>{}); } catch {} }}
          onLoadedData={() => setReady(true)}
          onCanPlay={() => setReady(true)}
          onCanPlayThrough={() => setReady(true)}
          className="h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: ready ? 1 : 0, filter: `brightness(${brightness})`, transform: `translateY(${translateY})` }}
        >
          {/* Prefer MP4 first to avoid 404s if WebM is missing */}
          {srcMp4 ? <source src={srcMp4} type="video/mp4" /> : null}
          {srcWebm ? <source src={srcWebm} type="video/webm" /> : null}
        </video>
      </div>
    </div>
  );
}
