"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { BUILD_TAG, PATHS, LINKS, PLAYLIST, POS } from "../config/cockpit";
import SocialIcons from "../components/SocialIcons";
import CockpitHUD from "../components/CockpitHUD";
import MediaDock from "../components/MediaDock";   // ← NEW

// …keep the same useAudio hook…

export default function Page() {
  const { audioRef, track, playing, ready, toggle, next, prev } = useAudio(PLAYLIST);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "CHXNDLER — Cockpit (FAST)";
    return () => (document.title = prevTitle);
  }, []);

  const bgRef = useRef(null);
  useEffect(() => {
    const el = bgRef.current; if (!el) return;
    let rx = 0, ry = 0;
    const onMove = (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      const x = ((e.clientX || w / 2) / w) - 0.5;
      const y = ((e.clientY || h / 2) / h) - 0.5;
      rx = x * 6; ry = -y * 4.5;
    };
    const loop = () => { el.style.transform = `perspective(800px) rotateY(${rx}deg) rotateX(${ry}deg)`; requestAnimationFrame(loop); };
    window.addEventListener("mousemove", onMove);
    requestAnimationFrame(loop);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <main className="ck-root">
      <img ref={bgRef} src={track.backdrop || PATHS.fallbackBackdrop} alt="" className="ck-bg" />
      <img src={PATHS.cockpit} alt="" className="ck-overlay" />

      {/* Left console social buttons */}
      <SocialIcons LINKS={LINKS} POS={POS} />

      {/* Media dock on center console (Spotify / Apple / YouTube) */}
      <MediaDock POS={POS} LINKS={LINKS} />

      {/* Integrated HUD on the dashboard screen */}
      <CockpitHUD
        PATHS={PATHS}
        LINKS={LINKS}
        POS={POS}
        BUILD_TAG={BUILD_TAG}
        track={track}
        playing={playing}
        ready={ready}
        onPrev={prev}
        onToggle={toggle}
        onNext={next}
        audioRef={audioRef}
      />

      <style jsx>{`
        .ck-root { position:relative; width:100vw; height:100vh; overflow:hidden;
          background:radial-gradient(120% 120% at 50% -10%, #0b1020 0%, #06080f 55%, #04050a 100%);
          color:#fff; font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; }
        .ck-bg,.ck-overlay { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .ck-overlay { pointer-events:none; }
      `}</style>
    </main>
  );
}
