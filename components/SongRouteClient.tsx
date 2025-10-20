"use client";
import React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useAudio } from "@/app/providers/AudioProvider";
import SongHUD from "@/components/SongHUD";
import { motion, AnimatePresence } from "framer-motion";
import type { Song } from "@/lib/songs-consolidated";
import { trackSongSelected } from "@/lib/analytics";

const BGs: Record<string, any> = {
  space: dynamic(() => import("@/components/bg/SpaceBg"), { ssr: false }),
  ocean: dynamic(() => import("@/components/bg/OceanBg"), { ssr: false }),
  paris: dynamic(() => import("@/components/bg/ParisBg"), { ssr: false }),
};

export default function SongRouteClient({ song, nextSlug }: { song: Song; nextSlug: string }) {
  const { loadTrack, play, pause, playing } = useAudio();

  React.useEffect(() => {
    // Track song selection on route entry for analytics
    try { trackSongSelected(song.slug, song.title); } catch {}
    if (!song?.audioSrc) return;
    loadTrack(song.audioSrc);
  }, [song?.audioSrc, song?.slug, song?.title, loadTrack]);

  // Keyboard: Space/MediaPlayPause toggles play/pause (ignore when typing)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      try {
        const tag = (e.target as HTMLElement | null)?.tagName?.toUpperCase?.() || '';
        const inTextField = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as any)?.isContentEditable === true;
        const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';
        const isMediaToggle = e.code === 'MediaPlayPause' || e.code === 'Pause' || e.key === 'MediaPlayPause';
        if (!inTextField && (isSpace || isMediaToggle)) {
          e.preventDefault();
          if (playing) pause(); else play();
        }
      } catch {}
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, play, pause]);

  const Bg = BGs[song.bg] || BGs.space;
  const prefetchNextBg = React.useRef(false);
  const onHoverPrefetch = () => {
    if (prefetchNextBg.current) return; prefetchNextBg.current = true;
    const NextBg = BGs[song.bg] || BGs.space;
    try { NextBg?.preload?.(); } catch {}
  };

  return (
    <div style={song.theme as React.CSSProperties}>
      <AnimatePresence mode="wait">
        <motion.div key={song.slug} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}>
          <Bg active />
        </motion.div>
      </AnimatePresence>

      <SongHUD title={song.title} coverSrc={song.coverSrc} element={song.element} />

      <div className="fixed left-1/2 top-6 -translate-x-1/2 z-20 flex items-center gap-3">
        <div>
          <div style={{ fontWeight: 800, letterSpacing: '.02em' }}>{song.title}</div>
          <div style={{ fontSize: 12, opacity: .8 }}>Element: {song.element}</div>
        </div>
        <button className="ml-2 px-3 py-1 rounded bg-white/10 border border-white/20" onClick={play}>Play</button>
        <Link prefetch href={`/songs/${nextSlug}`} onMouseEnter={onHoverPrefetch} className="ml-2 underline">
          Next →
        </Link>
      </div>
    </div>
  );
}
