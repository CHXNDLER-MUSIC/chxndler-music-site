"use client";

import React, { useRef, useState } from "react";

export default function TestSky() {
  const vRef = useRef(null);
  const [ready, setReady] = useState(false);

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <div
        className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center"
        style={{ clipPath: "ellipse(65% 45% at 50% 52%)" }}
      >
        <video
          ref={vRef}
          src="/skies/ocean-girl.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setReady(true)}
          onError={(e) => console.error("video error", e)}
          className="h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: ready ? 1 : 0, filter: "brightness(0.95)" }}
        />
      </div>

      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
        <strong>TEST MODE</strong> — open at <code>/test</code>
      </div>
    </main>
  );
}
