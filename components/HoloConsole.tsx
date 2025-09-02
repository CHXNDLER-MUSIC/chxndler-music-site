"use client";
import React, { useRef } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import type { Track } from "@/config/tracks";

export default function HoloConsole({
  track,
  tracks,
  index,
  onSelect,
  playing,
  onToggle,
}: {
  track: Track | null;
  tracks: Track[];
  index: number;
  onSelect: (i:number) => void;
  playing: boolean;
  onToggle: () => void;
}) {
  const hoverRef = useRef<HTMLAudioElement|null>(null);
  const title = track?.title || "";
  const subtitle = track?.subtitle || "";
  const cover = track?.cover || "/cover/ocean-girl.png";
  const genCard = track?.slug ? `/generated/${track.slug}-album-card.png` : undefined;

  return (
    <div className="holo-console relative h-full w-full">
      {/* Title + subtitle (top-left inside console) */}
      <div className="c-title">
        <div className="t1">{title}</div>
        {subtitle ? <div className="t2">{subtitle}</div> : null}
      </div>

      {/* Album card (top-right within console) */}
      <div className="album">
        <img
          className="img"
          src={genCard || cover}
          alt={title}
          onError={(e)=>{ if (genCard && (e.currentTarget as HTMLImageElement).src.includes(genCard)) { (e.currentTarget as HTMLImageElement).src = cover; } }}
        />
        <div className="scan" />
      </div>

      {/* Mini orrery near lower center */}
      <div className="orr">
        <div className="p main"><div className="ring" /></div>
        <div className="o o1"><div className="p p1" /></div>
        <div className="o o2"><div className="p p2" /></div>
      </div>

      {/* Right-side song list (compact, interactive) */}
      <div className="list" role="listbox" aria-label="Songs">
        {[
          { slug: "alone", label: "Alone" },
          { slug: "baby", label: "Baby" },
          { slug: "be-my-bee", label: "Be My Bee" },
          { slug: "ocean-girl", label: "Ocean Girl" },
        ].map((s) => {
          const i = tracks.findIndex((t) => (t.slug || "").startsWith(s.slug));
          const available = i >= 0;
          const active = available && i === index;
          return (
            <button
              key={s.slug}
              type="button"
              role="option"
              aria-selected={active}
              disabled={!available}
              className={`row ${active ? "act" : ""} ${!available ? "dis" : ""}`}
              onClick={() => available && onSelect(i)}
              onMouseEnter={() => { try { const id = tracks[i]?.slug || null; usePlayerStore.getState().setHover(id); } catch {} try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
              onMouseLeave={() => { try { usePlayerStore.getState().setHover(null); } catch {} }}
            >
              <span className="dot" />
              <span className="nm">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Play button (left side) */}
      <button type="button" className={`pp ${playing ? "on" : ""}`} onClick={onToggle} aria-label={playing ? "Pause" : "Play"}>
        {playing ? (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M6 4l14 8-14 8z"/></svg>
        )}
      </button>

      <style jsx>{`
        .holo-console{ color:#fff; }
        .c-title{ position:absolute; left:3%; top:6%; right:45%; text-shadow: 0 2px 14px rgba(0,0,0,.5); }
        .t1{ font-size: clamp(16px, 2.2vw, 28px); font-weight:700; letter-spacing:.02em; line-height:1.02;
          text-shadow: 0 0 22px rgba(56,182,255,.4), 0 2px 14px rgba(0,0,0,.55);
        }
        .t2{ margin-top:4px; font-size: clamp(10px, 1.1vw, 14px); opacity:.9; }

        .album{ position:absolute; right:4%; top:5%; width: 34%; aspect-ratio:1/1; border-radius:12px; overflow:hidden;
          transform: perspective(1000px) rotateX(10deg) rotateY(-10deg);
          outline: 1px solid rgba(56,182,255,.55);
          box-shadow: 0 0 32px rgba(56,182,255,.35), 0 8px 30px rgba(0,0,0,.55);
        }
        .album .img{ width:100%; height:100%; object-fit:cover; filter:saturate(1.05) contrast(1.05) brightness(1.03); }
        .album .scan{ position:absolute; inset:0; background: repeating-linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.08) 1px, transparent 1px, transparent 3px); opacity:.22; mix-blend-mode:screen; pointer-events:none; }

        .orr{ position:absolute; left:50%; transform:translateX(-50%); bottom:18%; width: 44%; height: 36%; display:grid; place-items:center;
          filter: drop-shadow(0 0 14px rgba(252,84,175,.35)) drop-shadow(0 0 14px rgba(56,182,255,.25));
        }
        .p{ position:absolute; border-radius:9999px; background: radial-gradient(50% 60% at 40% 35%, rgba(255,255,255,.8), rgba(252,84,175,.45) 35%, rgba(10,10,30,.0) 65%);
          box-shadow: inset 0 -8px 18px rgba(0,0,0,.5), 0 0 18px rgba(252,84,175,.4);
        }
        .p.main{ width: 60px; height:60px; }
        .p.p1{ width: 14px; height:14px; background: radial-gradient(60% 60% at 40% 35%, rgba(255,255,255,.9), rgba(56,182,255,.55) 45%, rgba(10,10,30,.0) 70%); }
        .p.p2{ width: 18px; height:18px; background: radial-gradient(60% 60% at 40% 35%, rgba(255,255,255,.9), rgba(242,239,29,.55) 45%, rgba(10,10,30,.0) 70%); }
        .ring{ position:absolute; inset:-4px; border-radius:9999px; border:1px solid rgba(56,182,255,.45); filter: blur(.2px); opacity:.9; }
        .o{ position:absolute; inset:0; border-radius:9999px; border:1px dashed rgba(255,255,255,.16); animation:spin linear infinite; }
        .o1{ animation-duration: 10s; }
        .o2{ animation-duration: 16s; }
        .o1 .p{ position:absolute; top:10%; left:72%; }
        .o2 .p{ position:absolute; top:64%; left:16%; }
        @keyframes spin{ from{ transform:rotate(0);} to{ transform:rotate(360deg);} }

        .list{ position:absolute; right:3%; top:40%; width: 36%; transform: translateY(-40%); padding:6px; border-radius:12px;
          background: rgba(255,255,255,.06); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.16);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
        }
        .row{ display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:10px; margin:4px 0; width:100%; text-align:left; color:#fff; transition: box-shadow .18s ease, color .12s ease; }
        .row:hover{ box-shadow: none; }
        .row .dot{ width:8px; height:8px; border-radius:9999px; background:#38B6FF; box-shadow: 0 0 10px #38B6FFAA; }
        .row .nm{ font-size: 12px; letter-spacing:.02em; opacity:.9; transition: color .12s ease, text-shadow .15s ease; }
        .row:hover .nm{ color:#EFFFFF; text-shadow: 0 0 10px rgba(25,227,255,0.8), 0 0 24px rgba(25,227,255,0.45); }
        .row.act{ outline: 1px solid rgba(252,84,175,.6); box-shadow: 0 0 18px rgba(252,84,175,.4); }
        .row.dis{ opacity:.55; cursor:not-allowed; }

        .pp{ position:absolute; left:3%; bottom:14%; width:44px; height:44px; border-radius:9999px; border:1px solid rgba(255,255,255,.22);
          background: radial-gradient(80% 80% at 50% 50%, rgba(0,0,0,.35), rgba(0,0,0,.2)); color:#fff; display:grid; place-items:center; box-shadow: 0 0 18px rgba(56,182,255,.35);
        }
        .pp.on{ box-shadow: 0 0 24px rgba(242,239,29,.5), 0 0 40px rgba(252,84,175,.35); }
        .pp:hover{ transform: scale(1.05); }
        .pp:active{ transform: scale(.98); }
        .pp svg{ fill:#fff; }
      `}</style>
      <audio ref={hoverRef} preload="auto">
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
    </div>
  );
}
