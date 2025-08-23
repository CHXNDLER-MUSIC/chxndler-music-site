"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/* CHXNDLER — Cockpit WOW (v3.2, integrated)
   - HUD sits on the center dashboard screen (tweak POS.hud)
   - Social icon buttons pinned over the physical left-console buttons (tweak POS.console)
   - Small bezel cover (56x56) inside HUD
   - Deploy-safe (no Tailwind), one file
*/

const BUILD_TAG = "Cockpit v3.2 — integrated";

const PATHS = {
  cockpit: "/cockpit/cockpit.png",
  fallbackBackdrop: "/cockpit/ocean-girl.png",
  logoFallback: "/logo/CHXNDLER_Logo.png",
};

const PLAYLIST = [
  { id: "ocean-girl", title: "OCEAN GIRL", src: "/tracks/ocean-girl.mp3", cover: "/cover/ocean-girl-cover.png", backdrop: "/cockpit/ocean-girl.png" },
  { id: "ocean-girl-acoustic", title: "OCEAN GIRL — Acoustic", src: "/tracks/ocean-girl-acoustic.mp3", cover: "/cover/ocean-girl-acoustic-cover.png", backdrop: "/cockpit/ocean-girl-acoustic.png" },
  { id: "ocean-girl-remix", title: "OCEAN GIRL — Remix", src: "/tracks/ocean-girl-remix.mp3", cover: "/cover/ocean-girl-remix-cover.png", backdrop: "/cockpit/ocean-girl-remix.png" },
];

/* ---------- Quick positioning knobs (percentages are of viewport) ---------- */
const POS = {
  hud: {
    topVh: 28,        // move HUD up/down to sit on the dashboard screen
    widthVw: 46,      // HUD width (vw). 42–48 usually looks embedded
    maxPx: 740,       // clamp on wide screens
  },
  console: {
    xVw: 8.2,         // X of the left console button column
    igYVh: 37.0,      // Instagram button center Y
    ttYVh: 52.0,      // TikTok button center Y
    ytYVh: 68.0,      // YouTube button center Y
    sizePx: 54        // diameter of glow icon button
  }
};

const LINKS = {
  instagram: "https://instagram.com/CHXNDLER_MUSIC",
  tiktok: "https://tiktok.com/@CHXNDLER_MUSIC",
  youtube: "https://youtube.com/@CHXNDLER_MUSIC",
  spotify: "https://open.spotify.com/artist/0",
  apple: "https://music.apple.com/artist/0",
};

/* ---------------- SVG ICONS (inline, no libs) ---------------- */
const Icon = {
  Instagram: ({ size=18 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  ),
  TikTok: ({ size=18 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M21 8.5c-2 0-4-1-5.3-2.7V17a5 5 0 11-3-4.6V5h3a6.7 6.7 0 005.3 2.5V8.5z" />
    </svg>
  ),
  YouTube: ({ size=18 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M23 12s0-3.2-.4-4.7a3.1 3.1 0 00-2.2-2.2C18.9 4.5 12 4.5 12 4.5s-6.9 0-8.4.6A3.1 3.1 0 001.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a3.1 3.1 0 002.2 2.2c1.5.6 8.4.6 8.4.6s6.9 0 8.4-.6a3.1 3.1 0 002.2-2.2c.4-1.5.4-4.7.4-4.7zM10 15.5v-7l6 3.5-6 3.5z" />
    </svg>
  ),
  Spotify: ({ size=16 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm4.5 14.3a.9.9 0 01-1.2.3A12.8 12.8 0 008.9 16a.9.9 0 11-.5-1.7 14.5 14.5 0 016.9.7.9.9 0 01.7 1.3zm1.6-3.2a1 1 0 01-1.3.5 15.9 15.9 0 00-8-1 .9.9 0 11-.3-1.8 17.7 17.7 0 019 .9 1 1 0 01.6 1.4zm.2-3.4a1 1 0 01-1.3.5 19.4 19.4 0 00-9.9-1.2 1 1 0 11-.4-1.9 21.2 21.2 0 0110.8 1.3 1 1 0 01.8 1.3z" />
    </svg>
  ),
  Apple: ({ size=16 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M16.5 13.5c0-2.4 2-3.2 2-3.2a5.2 5.2 0 00-4.1-2.2c-1.8-.2-3.2 1-4 1s-2-.9-3.4-.9A5.5 5.5 0 003 12.2c0 3.3 2.2 7.6 4.9 7.6 1.1 0 1.9-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.4-.9 3.3-2a8.6 8.6 0 001.4-2.7s-2.1-.9-2.1-3.6zM14.9 5.2A2.7 2.7 0 0015.7 3 3.1 3.1 0 0013.4 4a3 3 0 00.7 2.2 2.7 2.7 0 000-1z" />
    </svg>
  ),
};

/* ---------------- Cover image with fallback ---------------- */
function CoverImage({ src, alt, cacheKey }) {
  const [okSrc, setOkSrc] = useState(src);
  useEffect(() => {
    const q = cacheKey ? "?v=" + encodeURIComponent(cacheKey) : "";
    setOkSrc(src + q);
  }, [src, cacheKey]);

  return (
    <div className="ck-cover-frame" title={alt}>
      <img
        src={okSrc}
        alt={alt}
        decoding="async"
        loading="eager"
        onError={() => setOkSrc(PATHS.logoFallback)}
        className="ck-cover"
        draggable={false}
      />
      <span className="ck-cover-reflection" />
    </div>
  );
}

/* ---------------------- Audio hook ---------------------- */
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
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("ended", onEnded);
    };
  }, [playlist.length]);

  const play = useCallback(async () => { try { await audioRef.current?.play(); setPlaying(true); } catch {} }, []);
  const pause = useCallback(() => { audioRef.current?.pause(); setPlaying(false); }, []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, play, pause]);
  const next = useCallback(() => setIndex((i) => (i + 1) % playlist.length), [playlist.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + playlist.length) % playlist.length), [playlist.length]);

  return { audioRef, track: playlist[index], playing, ready, toggle, next, prev };
}

/* ---------------------- Buttons ---------------------- */
function ControlButton({ title, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="ck-btn"
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "none")}
    >
      {children}
    </button>
  );
}

function IconButton({ title, href, children, style }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      className="ck-icon-btn"
      style={style}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "none")}
    >
      {children}
    </a>
  );
}

/* ---------------------- Main Page ---------------------- */
export default function Page() {
  const { audioRef, track, playing, ready, toggle, next, prev } = useAudio(PLAYLIST);

  // title marker
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "CHXNDLER — Cockpit (v3.2)";
    return () => (document.title = prevTitle);
  }, []);

  // gentle parallax on background
  const bgRef = useRef(null);
  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    let rx = 0, ry = 0;
    const onMove = (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      const x = ((e.clientX || w / 2) / w) - 0.5;
      const y = ((e.clientY || h / 2) / h) - 0.5;
      rx = x * 6;
      ry = -y * 4.5;
    };
    const loop = () => { el.style.transform = `perspective(800px) rotateY(${rx}deg) rotateX(${ry}deg)`; requestAnimationFrame(loop); };
    window.addEventListener("mousemove", onMove);
    requestAnimationFrame(loop);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // computed positions
  const hudStyle = {
    width: `min(${POS.hud.widthVw}vw, ${POS.hud.maxPx}px)`,
    top: `${POS.hud.topVh}vh`,
  };
  const iconSize = POS.console.sizePx;
  const railX = `calc(${POS.console.xVw}vw - ${iconSize / 2}px)`;

  return (
    <main className="ck-root">
      <img ref={bgRef} src={track.backdrop || PATHS.fallbackBackdrop} alt="" className="ck-bg" />
      <img src={PATHS.cockpit} alt="" className="ck-overlay" />

      {/* Icon buttons pinned over the physical console */}
      <IconButton title="Instagram" href={LINKS.instagram}
        style={{ left: railX, top: `calc(${POS.console.igYVh}vh - ${iconSize / 2}px)`, width: iconSize, height: iconSize }}>
        <Icon.Instagram size={22} />
      </IconButton>
      <IconButton title="TikTok" href={LINKS.tiktok}
        style={{ left: railX, top: `calc(${POS.console.ttYVh}vh - ${iconSize / 2}px)`, width: iconSize, height: iconSize }}>
        <Icon.TikTok size={22} />
      </IconButton>
      <IconButton title="YouTube" href={LINKS.youtube}
        style={{ left: railX, top: `calc(${POS.console.ytYVh}vh - ${iconSize / 2}px)`, width: iconSize, height: iconSize }}>
        <Icon.YouTube size={22} />
      </IconButton>

      {/* HUD mounted over the center dashboard screen */}
      <div className="ck-hud-wrap" style={hudStyle}>
        <div className="ck-hud">
          <span className="ck-bolt ck-bolt-left" />
          <span className="ck-bolt ck-bolt-right" />

          <div className="ck-row">
            <CoverImage src={track.cover} alt={track.title} cacheKey={track.id} />

            <div className="ck-flex1">
              <div className="ck-title-row">
                <div className="ck-title">{track.title}</div>
                <div className="ck-title-buttons">
                  <IconButton title="Spotify" href={LINKS.spotify}><Icon.Spotify /></IconButton>
                  <IconButton title="Apple Music" href={LINKS.apple}><Icon.Apple /></IconButton>
                </div>
              </div>

              <div className="ck-row ck-gap">
                <ControlButton title="Previous" onClick={prev}>◀</ControlButton>
                <ControlButton title={playing ? "Pause" : "Play"} onClick={toggle}>
                  {playing ? "Pause" : ready ? "Play" : "Enable sound"}
                </ControlButton>
                <ControlButton title="Next" onClick={next}>▶</ControlButton>

                <div className="ck-lights">
                  <span className={playing ? "ck-light ck-play" : "ck-light ck-idle"} />
                  <span className="ck-light ck-sync" />
                </div>
              </div>

              <div className="ck-progress"><div className={playing ? "ck-progress-fill ck-progress-on" : "ck-progress-fill"} /></div>
            </div>
          </div>

          <audio ref={audioRef} preload="metadata" />
        </div>
      </div>

      <div className="ck-badge">{BUILD_TAG}</div>

      <style jsx>{`
        .ck-root { position:relative; width:100vw; height:100vh; overflow:hidden;
          background:radial-gradient(120% 120% at 50% -10%, #0b1020 0%, #06080f 55%, #04050a 100%);
          color:#fff; font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; }
        .ck-bg,.ck-overlay { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .ck-overlay { pointer-events:none; }

        /* Console icon buttons are absolutely placed over the photo */
        .ck-icon-btn {
          position:absolute; z-index:6; display:inline-flex; align-items:center; justify-content:center;
          border-radius:14px; color:#e8f1ff;
          background:rgba(28,34,48,.55);
          border:1px solid rgba(255,255,255,.16);
          box-shadow:0 12px 28px rgba(0,0,0,.40), inset 0 0 14px rgba(56,182,255,.16), 0 0 18px rgba(252,84,175,.12);
          backdrop-filter:blur(6px); transition:box-shadow .18s, background .18s, transform .12s;
        }
        .ck-icon-btn:hover { background:rgba(255,255,255,.22); box-shadow:0 14px 38px rgba(0,0,0,.46), 0 0 22px rgba(56,182,255,.24); }

        /* HUD placement over center screen */
        .ck-hud-wrap { position:absolute; left:50%; transform:translateX(-50%); perspective:1000px; z-index:5; }
        .ck-hud {
          position:relative; border-radius:18px; padding:10px 12px; transform:rotateX(1.8deg);
          background:linear-gradient(180deg, rgba(18,22,32,.62), rgba(18,22,32,.36));
          border:1px solid rgba(255,255,255,.10);
          box-shadow:0 8px 30px rgba(0,0,0,.5), inset 0 0 18px rgba(56,182,255,.16), 0 0 22px rgba(252,84,175,.16);
          backdrop-filter:blur(8px); overflow:hidden;
        }
        .ck-bolt { position:absolute; top:-5px; width:9px; height:9px; border-radius:999px; background:rgba(255,255,255,.35);
          box-shadow:0 0 10px rgba(255,255,255,.38); animation:boltGlow 2.8s infinite; }
        .ck-bolt-left{ left:14px; } .ck-bolt-right{ right:14px; animation-delay:.9s; }
        @keyframes boltGlow {0%,100%{opacity:.65}50%{opacity:1}}

        .ck-row{display:flex;align-items:center;gap:10px}
        .ck-gap{margin-top:6px;gap:8px}
        .ck-flex1{flex:1;min-width:0}

        /* Small mounted cover */
        .ck-cover-frame { position:relative; width:56px; height:56px; border-radius:10px;
          background:rgba(10,12,18,.7); border:1px solid rgba(255,255,255,.12);
          box-shadow:inset 0 0 12px rgba(56,182,255,.18), 0 8px 20px rgba(0,0,0,.45); overflow:hidden; }
        .ck-cover { width:100%; height:100%; object-fit:cover; filter:saturate(1.02) contrast(1.02); }
        .ck-cover-reflection { position:absolute; top:0; left:0; right:0; height:28%;
          background:linear-gradient(to bottom, rgba(255,255,255,.22), rgba(255,255,255,0)); pointer-events:none; }

        .ck-title-row{display:flex; align-items:center; justify-content:space-between; gap:8px}
        .ck-title{font-size:14px; font-weight:800; letter-spacing:.02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
        .ck-title-buttons{display:flex; align-items:center; gap:6px}
        .ck-btn{
          padding:7px 10px; min-width:40px; font-size:12px; font-weight:800; color:#fff; cursor:pointer;
          background:radial-gradient(120% 120% at 50% -10%, rgba(56,182,255,.18), rgba(252,84,175,.18));
          border:1px solid rgba(255,255,255,.16); border-radius:12px;
          box-shadow:0 10px 24px rgba(0,0,0,.36), inset 0 0 10px rgba(56,182,255,.16);
          backdrop-filter:blur(6px); transition:background .18s, box-shadow .18s, transform .12s;
        }
        .ck-btn:hover{ background:rgba(255,255,255,.22); box-shadow:0 12px 30px rgba(0,0,0,.44), 0 0 20px rgba(252,84,175,.20) }

        .ck-lights{display:flex; align-items:center; gap:6px; margin-left:6px}
        .ck-light{width:7px; height:7px; border-radius:999px; display:inline-block}
        .ck-idle{background:rgba(255,255,255,.30)}
        .ck-play{background:#FC54AF; box-shadow:0 0 12px rgba(252,84,175,.6)}
        .ck-sync{background:#38B6FF; box-shadow:0 0 10px rgba(56,182,255,.55)}

        .ck-progress{margin-top:6px; height:5px; border-radius:999px; background:rgba(255,255,255,.10); overflow:hidden}
        .ck-progress-fill{height:100%; width:0%; border-radius:999px;
          background:linear-gradient(90deg, rgba(56,182,255,.9), rgba(252,84,175,.9));
          box-shadow:0 0 12px rgba(56,182,255,.35); transition:width 600ms ease}
        .ck-progress-on{width:38%}

        .ck-badge{position:absolute; bottom:6px; left:10px; font-size:11px; font-weight:800; color:rgba(255,255,255,.75); text-shadow:0 2px 10px rgba(0,0,0,.6)}
      `}</style>
    </main>
  );
}
