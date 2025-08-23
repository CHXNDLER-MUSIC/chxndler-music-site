"use client";
import React from "react";

export default function SkyboxVideo({
  src,
  poster,
  brightness = 0.95,
  useClipFallback = false,
}: {
  src: string;
  poster?: string;
  brightness?: number;
  useClipFallback?: boolean;
}) {
  return (
    <div className="fixed inset-0 -z-10 flex items-center justify-center pointer-events-none">
      <div className={`${useClipFallback ? "windshield-clip" : "windshield-mask"} h-full w-full`}>
        <video
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
          style={{ filter: `brightness(${brightness})` }}
        />
      </div>
    </div>
  );
}
