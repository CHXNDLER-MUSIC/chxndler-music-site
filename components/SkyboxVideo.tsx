"use client";
import React, { useState } from "react";

export default function SkyboxVideo({ brightness = 0.95 }:{ brightness?: number }) {
  const [ready, setReady] = useState(false);

  return (
    /* z-10 so it's above any page bg image; HUD slots are z>=30 */
    <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
      <div className="windshield-mask h-full w-full">
        <video
          autoPlay muted loop playsInline preload="auto"
          onLoadedData={() => setReady(true)}
          className="h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: ready ? 1 : 0, filter: `brightness(${brightness})` }}
        >
          <source src="/skies/ocean-girl.webm" type="video/webm" />
          <source src="/skies/ocean-girl.mp4"  type="video/mp4"  />
        </video>
      </div>
    </div>
  );
}
