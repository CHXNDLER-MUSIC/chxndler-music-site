"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * CHXNDLER — Cockpit (single file, v1.3)
 * Paste as /app/page.jsx
 */

const COCKPIT_BUILD = "Cockpit v1.3 — page.jsx active";
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
    cover: "/cover/ocean-girl-cover
