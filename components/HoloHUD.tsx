"use client";
import React from "react";
import { createPortal } from "react-dom";
import type { Track } from "@/lib/songs-consolidated";
import { POS } from "@/config/cockpit";
import { useAudio } from "@/app/providers/AudioProvider";
import { sfx } from "@/lib/sfx";

export default function HoloHUD({
  track,
  playing,
  onToggle,
  onSelect,
  hidePlayButton = false,
}: {
  track: Track | null;
  playing: boolean;
  onToggle: () => void;
  onSelect?: (slug: string) => void;
  hidePlayButton?: boolean;
}) {
  // Use unified audio provider for play/pause functionality
  const audioManager = useAudio();
  // If no track (home mode), don't render the HoloHUD
  if (!track) {
    return null;
  }

  const title = track?.title || "";
  const subtitle = (track as any)?.subtitle || "";
  const highlight = (track?.title || "").toLowerCase().includes("ocean girl") || (track?.slug === "ocean-girl");

  return (
    <>
      <div className="holo-hud fixed inset-0 z-50 pointer-events-none select-none" aria-hidden={false}>
        {/* Film grain + subtle bloom */}
        <div className="filmgrain" aria-hidden />
      </div>

      {/* Left of wheel: play/pause button rendered outside pointer-events:none container */}
      {!hidePlayButton && createPortal(
        (
          <button
            type="button"
            data-tour-id="music-power-button"
            className={`play-btn ${audioManager.playing ? "on" : ""}`}
            style={{ pointerEvents: 'auto' }}
            onClick={() => {
              if (process.env.NODE_ENV !== 'production') {
                console.log('[HUD PlayButton] click', { playing: audioManager.playing });
              }
              // Play flip sound when starting playback, pause sound when pausing
              try { 
                if (audioManager.playing) {
                  sfx.play('pause', 0.6);
                } else {
                  sfx.play('flip', 0.6);
                }
              } catch {}
              // Use unified audio provider for play/pause
              try {
                audioManager.togglePlayPause();
              } catch (err) {
                console.error('[HUD PlayButton] togglePlayPause failed:', err);
              }
            }}
            aria-label={audioManager.playing ? "Pause" : "Play"}
          >
            {audioManager.playing ? 
              (<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>)
              :
              (<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden><path d="M6 4l14 8-14 8z"/></svg>)}
          </button>
        ),
        typeof document !== 'undefined' ? document.body : (globalThis as any).document?.body
      )}

      <style jsx>{`
        :global(.holo-hud){
          /* mild atmospheric tint to help neon sit on glass */
          /* unify album size as a CSS var so surrounding layout can flow to it */
          --album-size: 280px;
        }
        .filmgrain{ position:absolute; inset:0; pointer-events:none; opacity:.12; mix-blend-mode:overlay;
          background-image: url('data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\" viewBox=\"0 0 120 120\">
              <filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"2\" stitchTiles=\"stitch\"/></filter>
              <rect width=\"120\" height=\"120\" filter=\"url(#n)\" opacity=\"0.25\"/>
            </svg>
          `)}'); background-size: 240px 240px; }

        /* Play button left of wheel */
        .play-btn{
          position:absolute;
          left: calc(${POS.wheel.logo.leftVw}vw - 6vw);
          top: calc(${POS.wheel.logo.topVh}vh - 0vh);
          width:60px; height:60px; border-radius:9999px; border:1px solid rgba(255,255,255,.22);
          background: radial-gradient(80% 80% at 50% 50%, rgba(0,0,0,.35), rgba(0,0,0,.2));
          color:#fff; display:grid; place-items:center; box-shadow: 0 0 24px rgba(56,182,255,.35);
          pointer-events:auto;
        }
        .play-btn.on{ box-shadow: 0 0 28px rgba(242,239,29,.5), 0 0 60px rgba(252,84,175,.35); }
        .play-btn:hover{ transform: translateZ(0) scale(1.04); }
        .play-btn:active{ transform: scale(.98); }
        .play-btn svg{ fill:#fff; }
      `}</style>
    </>
  );
}
