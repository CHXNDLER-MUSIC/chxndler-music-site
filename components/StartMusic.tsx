"use client";
import React, { useRef } from "react";
import { track } from "@/lib/analytics";

/** Center overlay “Start Music / LAUNCH” button.
 *  Plays /ui/launch.mp3, fires onStart(), then hides (parent controls show/hide).
 */
export default function StartMusic({ show, onStart }: { show: boolean; onStart: () => void }) {
  const sfxRef = useRef<HTMLAudioElement|null>(null);
  if (!show) return null;

  async function handle() {
    try {
      const a = sfxRef.current;
      if (a) { a.currentTime = 0; a.volume = 0.9; await a.play().catch(()=>{}); }
    } catch {}
    track("start_music");
    onStart();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto rounded-2xl px-6 py-4 bg-black/40 backdrop-blur-md glow">
          <button
            onClick={handle}
            className="hud-btn text-xl px-6 py-3 cockpit-glow"
            aria-label="Start Music"
            title="Start Music"
          >
            LAUNCH
          </button>
        </div>
      </div>
      {/* Using existing asset to avoid 404; place your own at /public/ui/launch.mp3 if desired */}
      <audio ref={sfxRef} src="/tracks/launch.MP3" preload="auto" />
    </>
  );
}
