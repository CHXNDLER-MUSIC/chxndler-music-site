"use client";
import React from "react";

export default function SkyboxVideo({
  src,
  poster,
  brightness = 0.95,
}: {
  src: string;
  poster?: string;
  brightness?: number;
}) {
  return (
    <div className="fixed inset-0 -z-10 flex items-center justify-center pointer-events-none">
      {/* Using clip-path fallback because no windshield-mask.png exists yet */}
      <div className="windshield-clip h-full w-full">
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
