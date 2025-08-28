"use client";
import React from "react";
import JoinAliens from "@/components/JoinAliens";

export default function JoinAliensBox() {
  return (
    <div
      className="h-full w-full pointer-events-auto"
      style={{
        // Slightly stronger backward tilt
        transform: "perspective(1100px) translateY(6px) rotateX(18deg) rotateY(12deg) rotateZ(-2deg)",
        transformOrigin: "right top",
      }}
    >
      <div className="relative h-full w-full rounded-2xl bg-black/35 backdrop-blur-md p-3 glow cockpit-glow border-2 border-[#19E3FF]/70 shadow-[0_0_20px_rgba(25,227,255,0.35)]">
        {/* subtle inner rim + scanlines to match cockpit HUD styling */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-[#19E3FF]/30" />
        <div
          className="pointer-events-none absolute inset-0 opacity-15 mix-blend-screen rounded-2xl"
          style={{ background: "repeating-linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.10) 1px, transparent 1px, transparent 3px)" }}
        />
        <JoinAliens />
      </div>
    </div>
  );
}
