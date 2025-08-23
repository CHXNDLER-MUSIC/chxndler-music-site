"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/*
  CHXNDLER Cockpit - single file v1.4 (ASCII safe)
  - No template literals in JSX
  - No curly-comment blocks inside JSX
  - Simple inline styles using plain strings
*/

const COCKPIT_BUILD = "Cockpit v1.4 - page.jsx active";
if (typeof window !== "undefined") {
  console.log("[COCKPIT]", COCKPIT_BUILD);
  window.COCKPIT_BUILD = COCKPIT_BUILD;
  window.addEventListener("keydown", (e) => {
    if ((e.key || "").toLowerCase() === "v") {
      const el = document.createElement("div");
      el.textContent = COCKPIT_BUILD;
      el.style.position = "fixed";
      el.style.top = "10px";
      el.style.right = "10px";
      el.style.zIndex = "99999";
      el.style.padding = "10px 14px";
      el.style.background = "#111827";
      el.style.color = "#fff";
      el.style.border = "1px solid #ffffff22";
      el.style.borderRadius = "10px";
      el.style.boxShadow = "0 6px 20px rgba(0,0,0,.5)";
      el.style.font = "600 12px/1.2 system-ui";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1600);
    }
  });
}

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

const GlowButton = React.memo(function GlowButton(props) {
  const { href, label } = props;
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

function CoverImage(props) {
  const { src, alt, cacheKey } = props;
  const [okSrc, setOkSrc] = useState(src);
  useEffect(() => {
    const q = cacheKey ? "?v=" + encodeURIComponent(cacheKey) : "";
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
    el.addEve
