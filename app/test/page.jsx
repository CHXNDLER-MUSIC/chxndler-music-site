"use client";

import React, { useEffect, useRef, useState } from "react";

export default function TestSky() {
  const vRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [origin, setOrigin] = useState("");
  const [head, setHead] = useState({ webm: null, mp4: null });

  // asset paths under /public
  const webmPath = "/skies/ocean-girl.webm";
  const mp4Path  = "/skies/ocean-girl.mp4";

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);

    async function checkAssets() {
      try {
        const [w, m] = await Promise.all([
          fetch(webmPath, { method: "HEAD" }),
          fetch(mp4Path,  { method: "HEAD" }),
        ]);
        setHead({ webm: w.status, mp4: m.status });
      } catch {
        setHead({ webm: 0, mp4: 0 });
      }
    }
    checkAssets();
  }, []);

  const fullWebm = origin ? new URL(webmPath, origin).href : webmPath;
  const fullMp4  = origin ? new URL(mp4Path, origin).href : mp4Path;

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Video layer clipped to a windshield-like oval */}
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
          className="h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: ready ? 1 : 0, filter: "brightness(0.95)" }}
        >
          {/* Try WEBM first, then MP4 */}
          <source src={webmPath} type="video/webm" />
          <source src={mp4Path} type="video/mp4" />
        </video>
      </div>

      {/* Status/debug panel showing YOUR real domain + asset links */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-white/10 backdrop-blur px-4 py-3 rounded-xl text-sm">
        <div><strong>TEST MODE</strong> • Domain:&nbsp;<code>{origin || "…"}</code></div>

        <div className="mt-2 flex items-center gap-3">
          <a className="underline" href={fullWebm} target="_blank" rel="noreferrer">
            open {fullWebm}
          </a>
          <span>• HEAD: {head.webm ?? "…"}</span>
        </div>

        <div className="mt-1 flex items-center gap-3">
          <a className="underline" href={fullMp4} target="_blank" rel="noreferrer">
            open {fullMp4}
          </a>
          <span>• HEAD: {head.mp4 ?? "…"}</span>
        </div>

        <div className="mt-2">Video element: {ready ? "✓ ready" : "loading…"} (clipped oval)</div>
      </div>
    </main>
  );
}
