"use client";
import React from "react";
import JoinAliens from "@/components/JoinAliens";

export default function JoinAliensBox() {
  return (
    <div
      className="h-full w-full pointer-events-auto"
      style={{
        // Slightly stronger backward tilt
        transform: "perspective(1100px) translateY(12px) rotateX(18deg) rotateY(12deg) rotateZ(-2deg) translateX(-40px)",
        transformOrigin: "right top",
      }}
    >
      <div className="relative h-full w-full rounded-2xl backdrop-blur-md p-3 glow cockpit-glow border-2 border-[#FC54AF]/70 shadow-[0_0_26px_rgba(252,84,175,0.55),_0_0_80px_rgba(252,84,175,0.35)]"
        style={{
          background:
            "linear-gradient(180deg, rgba(252,84,175,0.28), rgba(252,84,175,0.18)), " +
            "radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%), " +
            "linear-gradient(180deg, rgba(0,0,0,.65), rgba(0,0,0,.55))",
        }}
      >
        {/* subtle inner rim + scanlines to match cockpit HUD styling */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-[#FC54AF]/35" />
        <div
          className="pointer-events-none absolute inset-0 opacity-15 mix-blend-screen rounded-2xl"
          style={{ background: "repeating-linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.10) 1px, transparent 1px, transparent 3px)" }}
        />
        <JoinAliens />
      </div>
    </div>
  );
}
