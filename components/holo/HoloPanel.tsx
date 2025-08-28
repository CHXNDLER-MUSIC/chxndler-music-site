"use client";

import React from "react";
import PlanetSystem from "@/components/holo/PlanetSystem.tsx";
import SongList from "@/components/holo/SongList";
import { usePlayerStore } from "@/store/usePlayerStore";

export default function HoloPanel() {
  const { mainId, songs } = usePlayerStore((s) => ({ mainId: s.mainId, songs: s.songs }));
  const main = songs.find((s) => s.id === mainId);

  return (
    <section
      className="relative mx-auto mt-6 w-[min(1150px,95vw)] rounded-2xl holo-panel"
      aria-label="Holographic cockpit dashboard"
    >
      <div className="scanlines pointer-events-none" aria-hidden />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6">
        <div className="relative h-[320px] md:h-[360px] lg:h-[420px] rounded-xl bg-black/30 backdrop-blur-md ring-1 ring-cyan-400/20 p-2">
          <PlanetSystem />
        </div>
        <div className="rounded-xl bg-black/30 backdrop-blur-md ring-1 ring-cyan-400/20 p-2">
          <header className="mb-3 px-1">
            <h1 className="text-cyan-300 text-2xl md:text-3xl font-extrabold drop-shadow-cyan">
              {main?.title ?? "—"}
            </h1>
            <p className="text-cyan-100/80 text-sm md:text-base">{main?.oneLiner ?? ""}</p>
          </header>
          <SongList />
        </div>
      </div>
      {/* Full-width cyan underglow to sell the hologram panel */}
      <div
        className="pointer-events-none absolute inset-x-[-20px] -bottom-5 h-24 mix-blend-screen opacity-80"
        style={{
          background:
            "radial-gradient(70% 120% at 50% 100%, rgba(61,245,255,.42), rgba(61,245,255,0) 70%)",
          filter: "blur(12px)",
        }}
        aria-hidden
      />
    </section>
  );
}
