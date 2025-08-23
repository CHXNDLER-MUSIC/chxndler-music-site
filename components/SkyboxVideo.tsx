"use client";
import React, { useState } from "react";

/**
 * Shows a looping sky video, clipped to a windshield-like oval.
 * Looks for assets in /public/skies: ocean-girl.webm (preferred) and ocean-girl.mp4
 */
export default function SkyboxVideo({ brightness = 0.95 }: { brightness?: number }) {
  const [ready, setReady] = useState(false);

  return (
    // z-10 keeps video above any static cockpit background image but under HUD slots
    <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
      {/* Using clip-path fallback (no PNG mask required) */}
      <div style={{ clipPath: "ellipse(65% 45% at 50% 52%)" }} className="h-full w-full">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setReady(true)}
          className="h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: ready ? 1 : 0, filter: `brightness(${brightness})` }}
        >
          {/* Try WEBM first, then MP4 as fallback */}
          <source src="/skies/ocean-girl.webm" type="video/webm" />
          <source src="/skies/ocean-girl.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
