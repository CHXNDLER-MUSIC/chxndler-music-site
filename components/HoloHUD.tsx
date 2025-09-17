"use client";
import React from "react";
import type { Track } from "@/lib/songs-consolidated";
import { POS } from "@/config/cockpit";

export default function HoloHUD({
  track,
  playing,
  onToggle,
}: {
  track: Track | null;
  playing: boolean;
  onToggle: () => void;
}) {
  const title = track?.title || "";
  const subtitle = (track as any)?.subtitle || "";
  const cover = track?.cover || "/cover/ocean-girl.png";
  const highlight = (track?.title || "").toLowerCase().includes("ocean girl") || (track?.slug === "ocean-girl");

  return (
    <div className="holo-hud fixed inset-0 z-40 pointer-events-none select-none" aria-hidden={false}>
      {/* Film grain + subtle bloom */}
      <div className="filmgrain" aria-hidden />

      {/* Top-left: Title + one-liner */}
      <div className="title-wrap">
        <div className="title">{title}</div>
        {subtitle ? <div className="subtitle">{subtitle}</div> : null}
      </div>

      {/* Top-right: tilted album hologram with cyan border & scanlines */}
      <button
        type="button"
        className="album-card"
        onClick={() => {
          // Dispatch event to trigger HUDPanel card modal
          const event = new CustomEvent('showCoverCard', { 
            detail: { track, cover } 
          });
          window.dispatchEvent(event);
        }}
        aria-label="Open song card"
      >
        <div className="card-glow" />
        <img src={cover} alt={title} className="card-img" />
        <div className="scanlines" />
      </button>

      {/* Center: Orrery above steering wheel */}
      <div className="orrery" aria-label="Song worlds orrery">
        {/* Main planet removed to avoid single planet focus */}
        <div className="orbit o1"><div className="planet p1" /></div>
        <div className="orbit o2"><div className="planet p2" /></div>
        <div className="orbit o3"><div className="planet p3" /></div>
      </div>

      {/* Right-side: song list panel */}
      <div className="song-panel">
        {[
          { k: "alone", label: "Alone" },
          { k: "baby", label: "Baby" },
          { k: "be-my-bee", label: "Be My Bee" },
          { k: "ocean-girl", label: "Ocean Girl" },
        ].map((s) => (
          <div key={s.k} className={`song ${s.k === "ocean-girl" && highlight ? "active" : ""}`}>
            <span className="dot" />
            <span className="name">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Left of wheel: play/pause button */}
      <button
        type="button"
        className={`play-btn ${playing ? "on" : ""}`}
        onClick={() => {
          // Delegate playback control to the main controller
          // This ensures music only starts after the sky MP4 is playing
          try { onToggle(); } catch {}
        }}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? 
          (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>)
          :
          (<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M6 4l14 8-14 8z"/></svg>)}
      </button>

      <style jsx>{`
        :global(.holo-hud){
          /* mild atmospheric tint to help neon sit on glass */
        }
        .filmgrain{ position:absolute; inset:0; pointer-events:none; opacity:.12; mix-blend-mode:overlay;
          background-image: url('data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\" viewBox=\"0 0 120 120\">
              <filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"2\" stitchTiles=\"stitch\"/></filter>
              <rect width=\"120\" height=\"120\" filter=\"url(#n)\" opacity=\"0.25\"/>
            </svg>
          `)}'); background-size: 240px 240px; }

        /* Title block */
        .title-wrap{ position:absolute; top:8vh; left:8vw; max-width: 32vw; text-shadow: 0 2px 14px rgba(0,0,0,.45); }
        .title{
          font-size: clamp(28px, 4.4vw, 72px);
          font-weight: 700; letter-spacing:.02em; line-height: 1.02;
          color: #fff;
          text-shadow:
            0 0 28px rgba(56,182,255,.25),
            0 2px 18px rgba(0,0,0,.55);
          filter: drop-shadow(0 0 6px rgba(56,182,255,.20));
        }
        .subtitle{
          margin-top: 8px; font-size: clamp(12px, 1.2vw, 18px);
          color: rgba(255,255,255,.85);
          text-shadow: 0 1px 10px rgba(0,0,0,.4);
        }

        /* Album card (centered top) */
        .album-card{
          position:absolute; top:8vh; left:50%; transform: translateX(-50%) perspective(1200px) rotateX(10deg) rotateY(-10deg);
          width: clamp(160px, 18vw, 280px); aspect-ratio:1/1;
          border-radius: 16px; overflow:hidden;
          box-shadow: 0 0 50px rgba(56,182,255,.20), 0 10px 60px rgba(0,0,0,.6);
          outline: 1px solid rgba(56,182,255,.30);
          animation: albumCardPulse 2.6s ease-in-out infinite;
        }
        .card-glow{ position:absolute; inset:-8%; border-radius:20px; pointer-events:none;
          box-shadow: 0 0 80px rgba(56,182,255,.20);
        }
        .card-img{ width:100%; height:100%; object-fit:cover; filter: saturate(1.05) contrast(1.05) brightness(1.03); }
        .scanlines{ position:absolute; inset:0; pointer-events:none; mix-blend-mode:screen; opacity:.22;
          background: repeating-linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.08) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px);
        }

        /* Orrery positioned between one-liner and blue display */
        .orrery{
          position:absolute;
          left: 50%;
          transform: translateX(-50%);
          top: 16vh; /* Positioned after one-liner space */
          width: clamp(200px, 24vw, 420px);
          height: clamp(100px, 12vw, 200px); /* Compact to fit in available space */
          display:grid; place-items:center;
          filter: drop-shadow(0 0 18px rgba(252,84,175,.35)) drop-shadow(0 0 18px rgba(56,182,255,.25));
        }
        .planet{ position:absolute; border-radius:9999px; background: radial-gradient(50% 60% at 40% 35%, rgba(255,255,255,.8), rgba(252,84,175,.45) 35%, rgba(10,10,30,.0) 65%);
          box-shadow: inset 0 -10px 24px rgba(0,0,0,.5), 0 0 22px rgba(252,84,175,.4);
          animation: planetGlow 2.6s ease-in-out infinite;
        }
        .planet.main{ width: 88px; height: 88px; }
        .planet.p1{ width: 20px; height: 20px; background: radial-gradient(60% 60% at 40% 35%, rgba(255,255,255,.9), rgba(56,182,255,.55) 45%, rgba(10,10,30,.0) 70%); }
        .planet.p2{ width: 26px; height: 26px; background: radial-gradient(60% 60% at 40% 35%, rgba(255,255,255,.9), rgba(242,239,29,.55) 45%, rgba(10,10,30,.0) 70%); }
        .planet.p3{ width: 16px; height: 16px; background: radial-gradient(60% 60% at 40% 35%, rgba(255,255,255,.9), rgba(252,84,175,.55) 45%, rgba(10,10,30,.0) 70%); }
        .ring{ position:absolute; inset:-6px; border-radius:9999px; border:1px solid rgba(56,182,255,.45); filter: blur(.2px); opacity:.9; }
        .orbit{ position:absolute; inset:0; border-radius:9999px; border:1px dashed rgba(255,255,255,.18); animation: spin linear infinite; }
        .o1{ animation-duration: 10s; }
        .o2{ animation-duration: 16s; }
        .o3{ animation-duration: 22s; }
        .o1 .planet{ position:absolute; top:8%; left:72%; }
        .o2 .planet{ position:absolute; top:64%; left:14%; }
        .o3 .planet{ position:absolute; top:48%; left:84%; }
        @keyframes spin { from{ transform: rotate(0deg);} to{ transform: rotate(360deg);} }

        /* Centered song panel (blue display) */
        .song-panel{ 
          position:absolute; 
          left:50%; 
          transform: translateX(-50%); 
          /* Align above the shared button baseline; CSS vars set by SteeringWheelOverlay */
          bottom: calc(var(--buttons-bottom, 31%) + var(--panel-gap-px, 72px)); 
          width: clamp(80px, 18vw, 120px);
          max-width: 100px;
          height: clamp(160px, 16vh, 220px);
          padding: 10px 0; 
          margin: 0;
          border-radius: 16px; 
          backdrop-filter: blur(12px);
          /* Unified HUD tint to match dashboard */
          background: rgba(25,227,255,0.25);
          border: 1px solid rgba(25,227,255,.15);
          box-shadow: 0 10px 40px rgba(0,0,0,.45), inset 0 0 0 1px rgba(25,227,255,.10);
          pointer-events:auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: bluePanelPulse 2.6s ease-in-out infinite;
        }
        .song{ 
          display:flex; 
          align-items:center; 
          justify-content:center;
          gap:10px; 
          padding:8px 0; 
          margin:6px 0; 
          border-radius:12px; 
          color:#fff;
          background: transparent; 
          transition: color .12s ease; 
          width: 100%;
        }
        .song:hover{ outline: none; box-shadow: none; }
        .song .dot{ width:10px; height:10px; border-radius:9999px; background: #38B6FF; box-shadow: 0 0 10px #38B6FFAA; }
        .song .name{ flex:1; font-size: 14px; letter-spacing:.02em; opacity:.9; transition: color .12s ease, text-shadow .15s ease; }
        .song:hover .name{ color:#EFFFFF; text-shadow: 0 0 10px rgba(25,227,255,0.8), 0 0 24px rgba(25,227,255,0.45); }
        .song.active{ outline: 1px solid rgba(252,84,175,.65); box-shadow: 0 0 24px rgba(252,84,175,.45); }

        /* Play button left of wheel */
        .play-btn{
          position:absolute;
          left: calc(${POS.wheel.logo.leftVw}vw - 6vw);
          top: calc(${POS.wheel.logo.topVh}vh - 0vh);
          width:56px; height:56px; border-radius:9999px; border:1px solid rgba(255,255,255,.22);
          background: radial-gradient(80% 80% at 50% 50%, rgba(0,0,0,.35), rgba(0,0,0,.2));
          color:#fff; display:grid; place-items:center; box-shadow: 0 0 24px rgba(56,182,255,.35);
          pointer-events:auto;
        }
        .play-btn.on{ box-shadow: 0 0 28px rgba(242,239,29,.5), 0 0 60px rgba(252,84,175,.35); }
        .play-btn:hover{ transform: translateZ(0) scale(1.04); }
        .play-btn:active{ transform: scale(.98); }
        .play-btn svg{ fill:#fff; }
        
        /* Synchronized blue panel pulsing */
        @keyframes bluePanelPulse {
          0%, 100% { 
            filter: brightness(1) saturate(1);
            box-shadow: 
              0 10px 40px rgba(0,0,0,.45), 
              inset 0 0 0 1px rgba(25,227,255,.10);
          }
          50% { 
            filter: brightness(1.06) saturate(1.1);
            box-shadow: 
              0 10px 40px rgba(0,0,0,.45), 
              0 0 30px rgba(25,227,255,.25),
              inset 0 0 0 1px rgba(25,227,255,.15);
          }
        }
        
        /* Synchronized planet and orrery glow */
        @keyframes planetGlow {
          0%, 100% { 
            filter: brightness(1) saturate(1);
          }
          50% { 
            filter: brightness(1.08) saturate(1.15);
          }
        }
        
        /* Synchronized album card pulsing */
        @keyframes albumCardPulse {
          0%, 100% { 
            box-shadow: 
              0 0 50px rgba(56,182,255,.20), 
              0 10px 60px rgba(0,0,0,.6);
            outline: 1px solid rgba(56,182,255,.30);
          }
          50% { 
            box-shadow: 
              0 0 65px rgba(56,182,255,.30), 
              0 10px 60px rgba(0,0,0,.6);
            outline: 1px solid rgba(56,182,255,.40);
          }
        }
      `}</style>
    </div>
  );
}
