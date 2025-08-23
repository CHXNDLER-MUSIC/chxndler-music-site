"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * CHXNDLER — Cockpit (single file)
 * Paste this entire file into /app/page.jsx
 * Uses your existing files from /public:
 *   /cockpit/cockpit.png
 *   /cockpit/ocean-girl.png
 *   /cockpit/ocean-girl-acoustic.png
 *   /cockpit/ocean-girl-remix.png
 *   /cover/ocean-girl-cover.png
 *   /cover/ocean-girl-acoustic-cover.png
 *   /cover/ocean-girl-remix-cover.png
 *   /tracks/ocean-girl.mp3
 *   /tracks/ocean-girl-acoustic.mp3
 *   /tracks/ocean-girl-remix.mp3
 *   /logo/CHXNDLER_Logo.png
 */

/* ===================== VERIFICATION KIT ===================== */
const COCKPIT_BUILD = "Cockpit v1.2 — page.jsx active";
if (typeof window !== "undefined") {
  console.log(
    "%c" + COCKPIT_BUILD,
    "padding:4px 8px;background:#1f2937;color:#fff;border-radius:6px"
  );
  window.COCKPIT_BUILD = COCKPIT_BUILD;
  window.addEventListener("keydown", (e) => {
    if (e.key?.toLowerCase() === "v") {
      const el = document.createElement("div");
      el.textContent = COCKPIT_BUILD;
      el.style.cssText =
        "position:fixed;top:10px;right:10px;z-index:99999;padding:10px 14px;background:#111827;color:#fff;border:1px solid #ffffff22;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.5);font:600 12px/1.2 system-ui";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1600);
    }
  });
}
/* ============================================================ */

/* ====================== CONSTANTS / PATHS =================== */
const BRAND = { yellow: "#F2EF1D", pink: "#FC54AF", blue: "#38B6FF" };

const PATHS = {
  cockpit: "/cockpit/cockpit.png",
  fallbackBackdrop: "/cockpit/ocean-girl.png",
  logoFallback: "/logo/CHXNDLER_Logo.png",
};

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
    cover: "/cover/ocean-girl-remix-cover.png",
    backdrop: "/cockpit/ocean-girl-remix.png",
  },
];

const LINKS = {
  instagram: "https://instagram.com/CHXNDLER_MUSIC",
  tiktok: "https://tiktok.com/@CHXNDLER_MUSIC",
  youtube: "https://youtube.com/@CHXNDLER_MUSIC",
  spotify: "https://open.spotify.com/artist/0",
  apple: "https://music.apple.com/artist/0",
};
/* ============================================================ */

/* ====================== UI COMPONENTS ======================= */
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

function CoverImage({ src, alt, cacheKey }) {
  const [okSrc, setOkSrc] = useState(src);
  useEffect(() => {
    const q = cacheKey ? `?v=${encodeURIComponent(cacheKey)}` : "";
    setOkSrc(src + q);
  }, [src, cacheKey]);

  return (
    <img
      src={okSrc}
      alt={alt}
      decoding="async"
      loading="eager"
      onError={() => {
        console.error("Cover failed to load:", okSrc);
        setOkSrc(PATHS.logoFallback);
      }}
      className="h-14 w-14 md:h-16 md:w-16 rounded-lg object-cover shadow-[0_0_12px_rgba(0,0,0,.45)]"
      draggable={false}
    />
  );
}
/* ============================================================ */

/* ====================== AUDIO HOOK ========================== */
function useAudio(playlist) {
  const audioRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.src = playlist[index].src;
    setReady(false);
  }, [index, playlist]);

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
    } catch {}
  }, []);
  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, play, pause]);
  const next = useCallback(() => setIndex((i) => (i + 1) % playlist.length), [playlist.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + playlist.length) % playlist.length), [playlist.length]);

  return { audioRef, index, setIndex, track: playlist[index], playing, ready, toggle, next, prev };
}
/* ============================================================ */

/* ====================== PAGE ================================ */
export default function Page() {
  const { audioRef, track, playing, ready, toggle, next, prev } = useAudio(PLAYLIST);

  // Page title marker so you can see it changed
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "CHXNDLER — Cockpit (v1.2)";
    return () => (document.title = prevTitle);
  }, []);

  // Preload covers/backdrops (once)
  useEffect(() => {
    PLAYLIST.forEach((t) => {
      [t.cover, t.backdrop].forEach((src) => {
        if (!src) return;
        const im = new Image();
        im.decoding = "async";
        im.loading = "eager";
        im.src = src;
      });
    });
  }, []);

  // Lightweight parallax (no React state per frame)
  const bgRef = useRef(null);
  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    let rx = 0,
      ry = 0;
    const onMove = (e) => {
      const { innerWidth: w, innerHeight: h } = window;
      const x = (e.clientX ?? w / 2) / w - 0.5;
      const y = (e.clientY ?? h / 2) / h - 0.5;
      rx = x * 8;
      ry = -y * 6;
    };
    const loop = () => {
      el.style.transform = `perspective(800px) rotateY(${rx}deg) rotateX(${ry}deg) translateZ(0)`;
      requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", onMove);
    requestAnimationFrame(loop);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black text-white">
      {/* Backdrop (changes by track) */}
      <div
        ref={bgRef}
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${track.backdrop || PATHS.fallbackBackdrop})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "saturate(1.05) brightness(.9)",
          transition: "background-image 400ms ease",
        }}
      />

      {/* Cockpit overlay */}
      <img
        src={PATHS.cockpit}
        alt=""
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* Social buttons (left console) */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3">
        <GlowButton href={LINKS.instagram} label="Instagram" />
        <GlowButton href={LINKS.tiktok} label="TikTok" />
        <GlowButton href={LINKS.youtube} label="YouTube" />
        <GlowButton href={LINKS.spotify} label="Spotify" />
        <GlowButton href={LINKS.apple} label="Apple Music" />
      </div>

      {/* In-dash player HUD (top-center) */}
      <div
        className="absolute left-1/2 top-[7svh] -translate-x-1/2 w-[min(92vw,720px)]"
        style={{ perspective: "1000px" }}
      >
        <div
          className="relative mx-auto rounded-3xl px-4 py-3 md:px-5 md:py-4 text-white/95"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,24,36,.55), rgba(20,24,36,.35))",
            boxShadow:
              "0 8px 30px rgba(0,0,0,.45), inset 0 0 18px rgba(56,182,255,.12), 0 0 20px rgba(252,84,175,.15)",
            WebkitBackdropFilter: "blur(6px)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,.08)",
            transform: "rotateX(2deg) translateZ(0)",
          }}
        >
          {/* tiny bezel bolts */}
          <div className="pointer-events-none absolute -top-1.5 left-5 h-2 w-2 rounded-full bg-white/30 shadow-[0_0_8px_rgba(255,255,255,.35_]()
