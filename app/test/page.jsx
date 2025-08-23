"use client";

import React, { useRef, useState } from "react";

export default function TestSky() {
  const vRef = useRef(null);
  const [ready, setReady] = useState(false);

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* SKY VIDEO (hard-coded asset). z-10 so it's above any page bg */}
      <div
        className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center"
        // inline clipPath so we don't rely on globals.css
        style={{ clipPath: "ellipse(65% 45% at 50% 52%)" }}
      >
        <video
          ref={vRef}
          src="/skies/ocean-girl.mp4"   // <-- your file must exist here
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setReady(true)}
          className="h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: ready ? 1 : 0, filter: "brightness(0.95)" }}
        />
      </div>

      {/* HEADS-UP so you know you're on the test route */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
        <strong>TEST MODE</strong> — video should move inside the oval. URL: <code>/test</code>
      </div>

      {/* HUD sample blocks to prove layering (z-40) */}
      <div className="fixed left-4 top-24 z-40 flex flex-col gap-3">
        <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur" />
        <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur" />
        <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur" />
      </div>

      <div className="fixed right-8 top-28 z-40 w-[22vw] h-[26vh] rounded-2xl bg-white/10 backdrop-blur p-4">
        <div className="text-sm opacity-80">Join the Aliens (sample box)</div>
      </div>

      {/* optional background image to mimic cockpit (but below video) */}
      <div
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage: "url('/cockpit/cockpit.jpg')", // if you have one; otherwise this does nothing
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    </main>
  );
}
