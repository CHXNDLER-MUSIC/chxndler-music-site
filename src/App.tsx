"use client";
import { useEffect } from "react";
import { PlanetCanvas } from "@/src/components/Planet";
import SongList from "@/src/components/SongList";
import NowPlaying from "@/src/components/NowPlaying";
import { useStore, type Song } from "@/src/store";
import { motion } from "framer-motion";

export default function App({ initialSongs, compact = false }: { initialSongs: Song[]; compact?: boolean }) {
  const setSongs = useStore((s) => s.setSongs);
  useEffect(() => { setSongs(initialSongs); }, [initialSongs, setSongs]);

  return (
    <div className={`relative w-full ${compact ? 'h-full px-2 py-2' : 'max-w-6xl mx-auto px-4 py-6'}`}>
      <div className="grid grid-cols-12 gap-4 md:gap-6 h-full">
        {/* Left: hologram planet */}
        <div className="col-span-12 md:col-span-6 h-full">
          <div className={`relative rounded-[14px] border-2 border-[#19E3FF]/80 bg-white/6 backdrop-blur-xl p-2 shadow-[0_0_36px_rgba(25,227,255,0.5)] ${compact ? 'h-full' : ''}`}>
            <div className="absolute inset-x-8 bottom-2 h-8 rounded-full" style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(25,227,255,.25), rgba(25,227,255,0) 70%)", filter: "blur(6px)" }} />
            <div className={`relative ${compact ? 'h-full' : 'h-[320px]'}`}>
              <PlanetCanvas compact={compact} />
            </div>
          </div>
        </div>

        {/* Right: album art + title */}
        <div className={`col-span-12 md:col-span-6 flex flex-col gap-3 ${compact ? 'h-full' : ''}`}>
          <NowPlaying />
          <div className={`${compact ? 'flex-1 min-h-0' : ''}`}>
            <SongList height={compact ? 240 : 420} />
          </div>
        </div>
      </div>
    </div>
  );
}
