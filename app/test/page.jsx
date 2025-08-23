"use client";

import React, { useRef, useState } from "react";

export default function TestSky() {
  const vRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Clip to an oval so motion is obvious */}
      <div
        className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center"
        style={{ clipPath: "ellipse(65% 45% at 50% 52%)" }}
      >
        <video
          ref={vRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setReady(true)}
          onError={(e) => setErr("Video error: source not found or unsupported codec")}
          className="h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: ready ? 1 : 0, filter: "brightness(0.95)" }}
        >
          {/* Try WEBM first (Chrome/Android), then MP4 (Safari/iOS/desktop) */}
          <source src="/skies/ocean-girl.webm" type="video/webm" />
          <source src="/skies/ocean-girl.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Status pill */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
        <strong>TEST MODE</strong> — open at <code>/test</code> • {ready ? "✓ video ready" : "loading…"}
      </div>

      {/* Error (if any) */}
      {err && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-red-500/20 border border-red-400/50 px-4 py-2 rounded-xl text-sm">
          {err} • Check <code>/skies/ocean-girl.(webm|mp4)</code> exist.
        </div>
      )}
    </main>
  );
}
