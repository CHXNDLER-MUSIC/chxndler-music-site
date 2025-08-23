"use client";

import { useEffect, useRef, useState } from "react";

// 1) Paste constants here
const BRAND = { yellow: "#F2EF1D", pink: "#FC54AF", blue: "#38B6FF" };
const PATHS = { cockpit: "/cockpit/cockpit.png" /* … etc … */ };
const PLAYLIST = [ /* … your songs … */ ];
const LINKS = { instagram: "https://instagram.com/CHXNDLER_MUSIC" /* … */ };
const FORMSCRIPT_URL = "https://script.google.com/macros/s/REPLACE/exec";

// 2) Paste GlowButton + useAudio hook here
// (copy from my previous message)


// 3) Your main cockpit page
export default function Page() {
  const { audioRef, track, play, pause, next, prev, playing } = useAudio(PLAYLIST);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Cockpit background */}
      <img src={PATHS.cockpit} className="absolute inset-0 w-full h-full object-cover" />

      {/* Social buttons */}
      <div className="absolute bottom-4 left-4 flex gap-3">
        <GlowButton href={LINKS.instagram} label="Instagram" />
        <GlowButton href={LINKS.tiktok} label="TikTok" />
        <GlowButton href={LINKS.youtube} label="YouTube" />
        <GlowButton href={LINKS.spotify} label="Spotify" />
        <GlowButton href={LINKS.apple} label="Apple Music" />
      </div>

      {/* Audio player */}
      <div className="absolute bottom-4 right-4 text-white">
        <p>{track.title}</p>
        <button onClick={playing ? pause : play}>
          {playing ? "Pause" : "Play"}
        </button>
        <button onClick={prev}>Prev</button>
        <button onClick={next}>Next</button>
        <audio ref={audioRef} />
      </div>
    </main>
  );
}
