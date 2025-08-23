"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * CHXNDLER • Starship Cockpit (single-file, lightweight)
 * Paste this entire file at: /app/page.jsx
 * Uses your existing assets under /public:
 *  - /cockpit/cockpit.png
 *  - /tracks/ocean-girl.mp3, /tracks/ocean-girl-acoustic.mp3, /tracks/ocean-girl-remix.mp3
 *  - /cover/ocean-girl-cover.png, /cover/ocean-girl-acoustic-cover.png, /cover/ocean-girl-remix-cover.png
 *  - /logo/CHXNDLER_Logo.png (temporary icon for buttons)
 */

// ---------- BRAND (for future theming) ----------
const BRAND = { yellow: "#F2EF1D", pink: "#FC54AF", blue: "#38B6FF" };

// ---------- PATHS — match your repo exactly ----------
const PATHS = {
  cockpit: "/cockpit/cockpit.png",
  fallbackBackdrop: "/cockpit/ocean-girl.png", // shown behind the cockpit
  logoFallback: "/logo/CHXNDLER_Logo.png",
};

// ---------- PLAYLIST — match files in /public/tracks & /public/cover ----------
const PLAYLIST = [
  {
    id: "ocean-girl",
    title: "OCEAN GIRL",
    src: "/tracks/ocean-girl.mp3",
    cover: "/cover/ocean-girl-cover.png",
    backdrop: "/cockpit/ocean-girl.png",
  },
  {
    id: "ocean-girl-acoustic",
    title: "OCEAN GIRL — Acoustic",
    src: "/tracks/ocean-girl-acoustic.mp3",
    cover: "/cover/ocean-girl-acoustic-cover.png",
    backdrop: "/cockpit/ocean-girl-acoustic.png",
  },
  {
    id: "ocean-girl-remix",
    title: "OCEAN GIRL — Remix",
    src: "/tracks/ocean-girl-remix.mp3",
    cover: "/cover/ocean-girl-remix-cover.png", // rename if needed
    backdrop: "/cockpit/ocean-girl-remix.png",
  },
];

// ---------- SOCIAL LINKS ----------
const LINKS = {
  instagram: "https://instagram.com/CHXNDLER_MUSIC",
  tiktok: "https://tiktok.com/@CHXNDLER_MUSIC",
  youtube: "https://youtube.com/@CHXNDLER_MUSIC",
  spotify: "https://open.spotify.com/artist/0",
  apple: "https://music.apple.com/artist/0",
};

// ---------- Minimal CSS-glow button (no JS timers) ----------
const GlowButton = React.memo(function GlowButton({ href, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="relative inline-flex items-center rounded-2xl px-4 py-2 text-white/90 select-none"
      style={{
        boxShadow:
          "0 0 .75rem rgba(252,84,175,.45), inset 0 0 .5rem rgba(56,182,255,.3)",
        background:
          "radial-gradient(120% 120% at 50% 0%, rgba(56,182,255,.10), rgba(252,84,175,.06) 60%, transparent)",
        WebkitBackdropFilter: "blur(2px)",
        backdropFilter: "blur(2px)",
      }}
    >
      <span className="relative text-sm font-semibold tracking-wide">
        {label}
      </span>
      <span
        className="absolute inset-0 rounded-2xl animate-pulse"
        style={{ opacity: 0.35 }}
      />
    </a>
  );
});

// ---------- Single-audio player hook (fast + simple) ----------
function useAudio(playlist) {
  const audioRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  // swap source only (keep one <audio>)
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.src = playlist[index].src;
    setReady(false);
  }, [index, playlist]);

  // listeners
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onCanPlay = () => setReady(true);
    const onEnded = () => setIndex((i) => (i + 1) % playlist.length);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("ended", onEnded);
    };
  }, [playlist.length]);

  const play = useCallback(async () => {
    try {
      await audioRef.current?.play();
      setPlaying(true);
    } catch {
      // mobile needs user gesture; guarded by "Enable sound" below
    }
  }, []);
  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, play, pause]);
  const next = useCallback(() => setIndex((i) => (i + 1) % playlist.length), [playlist.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + playlist.length) % playlist.length), [playlist.length]);

  return { audioRef, index, setIndex, track: playlist[index], playing, ready, play, pause, toggle, next, prev };
}

export default function Page() {
  const {
    audioRef,
    track,
    index,
    setIndex,
    playing,
    ready,
    toggle,
    next,
    prev,
  } = useAudio(PLAYLIST);

  // Preload covers/backdrops once
  useEffect(() => {
    PLAYLIST.forEach((t) => {
      [t.cover, t.backdrop].forEach((src) => {
        if (!src) return;
        const im = new Image();
        im.decoding = "async";
        im.l
