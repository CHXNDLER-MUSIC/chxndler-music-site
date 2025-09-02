"use client";
import React from "react";
import type { Track } from "@/config/tracks";
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
      <div className="album-card">
        <div className="card-glow" />
        <img src={cover} alt={title} className="card-img" />
        <div className="scanlines" />
      </div>

      {/* Center: Orrery above steering wheel */}
      <div className="orrery" aria-label="Song worlds orrery">
        <div className="planet main">
          <div className="ring" />
        </div>
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
          try { onToggle(); } catch {}
          try {
            const a = document.querySelector<HTMLAudioElement>('audio[data-audio-player="1"]');
            if (a) {
              try { a.muted = false; if (a.volume === 0) a.volume = 1.0; } catch {}
              if (playing) a.pause(); else void a.play();
            }
          } catch {}
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
        .title-wrap{ position:absolute; top:8vh; left:10vw; max-width: 36vw; text-shadow: 0 2px 14px rgba(0,0,0,.45); }
        .title{
          font-size: clamp(28px, 4.4vw, 72px);
          font-weight: 700; letter-spacing:.02em; line-height: 1.02;
          color: #fff;
          text-shadow:
            0 0 28px rgba(56,182,255,.45),
            0 2px 18px rgba(0,0,0,.55);
          filter: drop-shadow(0 0 6px rgba(56,182,255,.35));
        }
        .subtitle{
          margin-top: 8px; font-size: clamp(12px, 1.2vw, 18px);
          color: rgba(255,255,255,.85);
          text-shadow: 0 1px 10px rgba(0,0,0,.4);
        }

        /* Album card (top-right) */
        .album-card{
          position:absolute; top:8vh; right:10vw;
          width: clamp(180px, 22vw, 340px); aspect-ratio:1/1;
          border-radius: 16px; overflow:hidden; transform: perspective(1200px) rotateX(10deg) rotateY(-10deg);
          box-shadow: 0 0 50px rgba(56,182,255,.35), 0 10px 60px rgba(0,0,0,.6);
          outline: 1px solid rgba(56,182,255,.55);
        }
        .card-glow{ position:absolute; inset:-8%; border-radius:20px; pointer-events:none;
          box-shadow: 0 0 80px rgba(56,182,255,.35);
        }
        .card-img{ width:100%; height:100%; object-fit:cover; filter: saturate(1.05) contrast(1.05) brightness(1.03); }
        .scanlines{ position:absolute; inset:0; pointer-events:none; mix-blend-mode:screen; opacity:.22;
          background: repeating-linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.08) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px);
        }

        /* Orrery centered above wheel */
        .orrery{
          position:absolute;
          left: calc(${POS.wheel.logo.leftVw}vw - 2vw);
          top: calc(${POS.wheel.logo.topVh}vh - 10vh);
          width: clamp(200px, 24vw, 420px);
          height: clamp(120px, 16vw, 280px);
          display:grid; place-items:center;
          filter: drop-shadow(0 0 18px rgba(252,84,175,.35)) drop-shadow(0 0 18px rgba(56,182,255,.25));
        }
        .planet{ position:absolute; border-radius:9999px; background: radial-gradient(50% 60% at 40% 35%, rgba(255,255,255,.8), rgba(252,84,175,.45) 35%, rgba(10,10,30,.0) 65%);
          box-shadow: inset 0 -10px 24px rgba(0,0,0,.5), 0 0 22px rgba(252,84,175,.4);
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

        /* Right-side song panel */
        .song-panel{ position:absolute; right:6vw; top: 30vh; width: clamp(180px, 18vw, 260px);
          padding: 10px; border-radius: 16px; backdrop-filter: blur(12px);
          background: linear-gradient(180deg, rgba(0,0,0,.32), rgba(0,0,0,.18));
          border: 1px solid rgba(255,255,255,.16);
          box-shadow: 0 10px 40px rgba(0,0,0,.4), inset 0 0 0 1px rgba(255,255,255,.06);
          pointer-events:auto;
        }
        .song{ display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:12px; color:#fff;
          background: transparent; margin:6px 0; transition: color .12s ease; }
        .song:hover{ outline: none; box-shadow: none; }
        .song .dot{ width:10px; height:10px; border-radius:9999px; background: #38B6FF; box-shadow: 0 0 10px #38B6FFAA; }
        .song .name{ flex:1; font-size: 14px; letter-spacing:.02em; opacity:.9; transition: color .12s ease, text-shadow .15s ease; }
        .song:hover .name{ color:#EFFFFF; text-shadow: 0 0 10px rgba(25,227,255,0.8), 0 0 24px rgba(25,227,255,0.45); }
        .song.active{ outline: 1px solid rgba(252,84,175,.65); box-shadow: 0 0 24px rgba(252,84,175,.45); }

        /* Play button left of wheel */
        .play-btn{
          position:absolute;
          left: calc(${POS.wheel.logo.leftVw}vw - 10vw);
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
      `}</style>
    </div>
  );
}
