"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/*
  CHXNDLER Cockpit - single file v1.5 (safe build)
  - ASCII only
  - No template strings inside JSX
  - No arbitrary [] Tailwind classes
  - Uses <img> for backgrounds instead of backgroundImage strings
*/

const COCKPIT_BUILD = "Cockpit v1.5 - page.jsx active";
if (typeof window !== "undefined") {
  console.log("[COCKPIT]", COCKPIT_BUILD);
  window.COCKPIT_BUILD = COCKPIT_BUILD;
  window.addEventListener("keydown", (e) => {
    const key = (e.key || "").toLowerCase();
    if (key === "v") {
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
    title: "OCEAN GIRL - Acoustic",
    src: "/tracks/ocean-girl-acoustic.mp3",
    cover: "/cover/ocean-girl-acoustic-cover.png",
    backdrop: "/cockpit/ocean-girl-acoustic.png",
  },
  {
    id: "ocean-girl-remix",
    title: "OCEAN GIRL - Remix",
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

con
