"use client";
import React, { useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string;
  brightness?: number; // 0..1
};

export default function SkyboxVideo({ src, poster, brightness = 0.95 }: Props) {
  const vRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  return (
    // NOTE: z-10 so it's ABOVE any background image but BELOW HUD (which uses z>=30)
    <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
      {/* Using clip-path fallback since you don't have a windshield PNG mask yet */}
      <div className="windshield-clip h-full w-full">
        <video
          ref={vRef}
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setReady(true)}
          className="h-full w-full object-cover transition-opacity duration-500"
          style={{
            filter: `brightness(${brightness})`,
            opacity: ready ? 1 : 0, // prevent “black flash” before first frame
          }}
        />
      </div>
    </div>
  );
}
