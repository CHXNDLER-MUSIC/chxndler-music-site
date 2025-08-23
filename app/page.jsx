"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/*  CHXNDLER — Cockpit WOW (v3.1)
    - Smaller, bezel-mounted cover art inside HUD
    - Social icons (left rail) as glowing buttons
    - Spotify & Apple glowing buttons in the HUD next to the song
    - One-file, no Tailwind required
*/

const BUILD_TAG = "Cockpit v3.1 — WOW";

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
    title: "OCEAN GIRL — Acoustic",
    src: "/tracks/ocean-girl-acoustic.mp3",
    cover: "/cover/ocean-girl-acoustic-cover.png",
    backdrop: "/cockpit/ocean-girl-acoustic.png",
  },
  {
    id: "ocean-girl-remix",
    title: "OCEAN GIRL — Remix",
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

/* ---------------- SVG ICONS (inline, no libs) ---------------- */
const Icon = {
  Instagram: (props) => (
    <svg viewBox="0 0 24 24" width={props.size} height={props.size} fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  ),
  TikTok: (props) => (
    <svg viewBox="0 0 24 24" width={props.size} height={props.size} fill="currentColor">
      <path d="M21 8.5c-2 0-4-1-5.3-2.7V17a5 5 0 11-3-4.6V5h3a6.7 6.7 0 005.3 2.5V8.5z" />
    </svg>
  ),
  YouTube: (props) => (
    <svg viewBox="0 0 24 24" width={props.size} height={props.size} fill="currentColor">
      <path d="M23 12s0-3.2-.4-4.7a3.1 3.1 0 00-2.2-2.2C18.9 4.5 12 4.5 12 4.5s-6.9 0-8.4.6A3.1 3.1 0 001.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a3.1 3.1 0 002.2 2.2c1.5.6 8.4.6 8.4.6s6.9 0 8.4-.6a3.1 3.1 0 002.2-2.2c.4-1.5.4-4.7.4-4.7zM10 15.5v-7l6 3.5-6 3.5z" />
    </svg>
  ),
  Spotify: (props) => (
    <svg viewBox="0 0 24 24" width={props.size} height={props.size} fill="currentColor">
      <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm4.5 14.3a.9.9 0 01-1.2.3A12.8 12.8 0 008.9 16a.9.9 0 11-.5-1.7 14.5 14.5 0 016.9.7.9.9 0 01.7 1.3zm1.6-3.2a1 1 0 01-1.3.5 15.9 15.9 0 00-8-1 .9.9 0 11-.3-1.8 17.7 17.7 0 019 .9 1 1 0 01.6 1.4zm.2-3.4a1 1 0 01-1.3.5 19.4 19.4 0 00-9.9-1.2 1 1 0 11-.4-1.9 21.2 21.2 0 0110.8 1.3 1 1 0 01.8 1.3z" />
    </svg>
  ),
  Apple: (props) => (
    <svg viewBox="0 0 24 24" width={props.size} height={props.size} fill="currentColor">
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

  const play = useCallback(async () => {
    try {
      await audioRef.current?.play();
      setPlaying(true);
    } catch {}
  }, []);
  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);
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

function IconButton({ title, href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      className="ck-icon-btn"
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
    document.title = "CHXNDLER — Cockpit (WOW v3.1)";
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
      rx = x * 6.5;
      ry = -y * 4.5;
    };
    const loop = () => {
      el.style.transform = "perspective(800px) rotateY(" + rx + "deg) rotateX(" + ry + "deg)";
      requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", onMove);
    requestAnimationFrame(loop);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <main className="ck-root">
      <img ref={bgRef} src={track.backdrop || PATHS.fallbackBackdrop} alt="" className="ck-bg" />
      <img src={PATHS.cockpit} alt="" className="ck-overlay" />

      {/* Glowing icon rail (left) */}
      <div className="ck-rail">
        <IconButton title="Instagram" href={LINKS.instagram}>
          <Icon.Instagram size={18} />
        </IconButton>
        <IconButton title="TikTok" href={LINKS.tiktok}>
          <Icon.TikTok size={18} />
        </IconButton>
        <IconButton title="YouTube" href={LINKS.youtube}>
          <Icon.YouTube size={18} />
        </IconButton>
      </div>

      {/* HUD with mounted cover + controls + spotify/apple buttons */}
      <div className="ck-hud-wrap">
        <div className="ck-hud">
          <span className="ck-bolt ck-bolt-left" />
          <span className="ck-bolt ck-bolt-right" />

          <div className="ck-row">
            <CoverImage src={track.cover} alt={track.title} cacheKey={track.id} />

            <div className="ck-flex1">
              <div className="ck-title-row">
                <div className="ck-title">{track.title}</div>
                <div className="ck-title-buttons">
                  <IconButton title="Spotify" href={LINKS.spotify}>
                    <Icon.Spotify size={16} />
                  </IconButton>
                  <IconButton title="Apple Music" href={LINKS.apple}>
                    <Icon.Apple size={16} />
                  </IconButton>
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

              <div className="ck-progress">
                <div className={playing ? "ck-progress-fill ck-progress-on" : "ck-progress-fill"} />
              </div>
            </div>
          </div>

          <audio ref={audioRef} preload="metadata" />
        </div>
      </div>

      <div className="ck-badge">{BUILD_TAG}</div>

      <style jsx>{`
        .ck-root {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: radial-gradient(120% 120% at 50% -10%, #0b1020 0%, #06080f 55%, #04050a 100%);
          color: #fff;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        }
        .ck-bg, .ck-overlay { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .ck-overlay { pointer-events: none; }

        /* Left icon rail */
        .ck-rail {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          display: flex; flex-direction: column; gap: 14px;
        }
        .ck-icon-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 44px; height: 44px; border-radius: 12px;
          background: rgba(28,34,48,.5);
          border: 1px solid rgba(255,255,255,.16);
          color: #e8f1ff;
          box-shadow: 0 12px 28px rgba(0,0,0,.38), inset 0 0 14px rgba(56,182,255,.16);
          backdrop-filter: blur(6px);
          transition: box-shadow .18s ease, background .18s ease, transform .12s ease;
        }
        .ck-icon-btn:hover {
          background: rgba(255,255,255,.22);
          box-shadow: 0 14px 38px rgba(0,0,0,.44), 0 0 18px rgba(56,182,255,.22);
        }

        /* HUD container */
        .ck-hud-wrap { position: absolute; left: 50%; top: 56px; transform: translateX(-50%); width: 88vw; max-width: 640px; perspective: 1000px; }
        .ck-hud {
          position: relative; border-radius: 22px; padding: 12px 14px; transform: rotateX(2deg);
          background: linear-gradient(180deg, rgba(20,24,36,.60), rgba(20,24,36,.34));
          border: 1px solid rgba(255,255,255,.10);
          box-shadow: 0 10px 40px rgba(0,0,0,.48), inset 0 0 20px rgba(56,182,255,.16), 0 0 28px rgba(252,84,175,.18);
          backdrop-filter: blur(8px); overflow: hidden;
        }
        .ck-bolt { position: absolute; top: -6px; width: 10px; height: 10px; border-radius: 999px; background: rgba(255,255,255,.35); box-shadow: 0 0 10px rgba(255,255,255,.38); animation: boltGlow 2.8s infinite; }
        .ck-bolt-left { left: 16px; } .ck-bolt-right { right: 16px; animation-delay: .9s; }
        @keyframes boltGlow { 0%,100% { opacity: .65 } 50% { opacity: 1 } }

        .ck-row { display: flex; align-items: center; gap: 12px; }
        .ck-gap { margin-top: 8px; gap: 10px; }
        .ck-flex1 { flex: 1; min-width: 0; }

        /* Mounted cover (smaller) */
        .ck-cover-frame {
          position: relative; width: 84px; height: 84px; border-radius: 12px;
          background: rgba(12,14,22,.7);
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: inset 0 0 14px rgba(56,182,255,.18), 0 10px 26px rgba(0,0,0,.45);
          overflow: hidden;
        }
        .ck-cover {
          width: 100%; height: 100%; object-fit: cover; filter: saturate(1.02) contrast(1.02);
        }
        .ck-cover-reflection {
          position: absolute; top: 0; left: 0; right: 0; height: 28%;
          background: linear-gradient(to bottom, rgba(255,255,255,.22), rgba(255,255,255,0));
          pointer-events: none;
        }

        .ck-title-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .ck-title { font-size: 15px; font-weight: 800; letter-spacing: .02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ck-title-buttons { display: flex; align-items: center; gap: 8px; }

        .ck-btn {
          padding: 8px 12px; min-width: 44px; font-size: 13px; font-weight: 800; letter-spacing: .02em; color: #fff; cursor: pointer;
          background: radial-gradient(120% 120% at 50% -10%, rgba(56,182,255,.18), rgba(252,84,175,.18));
          border: 1px solid rgba(255,255,255,.16); border-radius: 14px;
          box-shadow: 0 12px 28px rgba(0,0,0,.38), inset 0 0 12px rgba(56,182,255,.16);
          backdrop-filter: blur(6px); transition: background .18s, box-shadow .18s, transform .12s;
        }
        .ck-btn:hover { background: rgba(255,255,255,.22); box-shadow: 0 14px 38px rgba(0,0,0,.44), 0 0 22px rgba(252,84,175,.22); }

        .ck-lights { display: flex; align-items: center; gap: 8px; margin-left: 8px; }
        .ck-light { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
        .ck-idle { background: rgba(255,255,255,.30); }
        .ck-play { background: #FC54AF; box-shadow: 0 0 14px rgba(252,84,175,.6); }
        .ck-sync { background: #38B6FF; box-shadow: 0 0 12px rgba(56,182,255,.55); }

        .ck-progress { margin-top: 8px; height: 6px; border-radius: 999px; background: rgba(255,255,255,.10); overflow: hidden; }
        .ck-progress-fill {
          height: 100%; width: 0%;
          background: linear-gradient(90deg, rgba(56,182,255,.9), rgba(252,84,175,.9));
          border-radius: 999px; box-shadow: 0 0 16px rgba(56,182,255,.35); transition: width 600ms ease;
        }
        .ck-progress-on { width: 42%; }

        .ck-badge {
          position: absolute; bottom: 6px; left: 10px; font-size: 11px; font-weight: 800;
          color: rgba(255,255,255,.75); text-shadow: 0 2px 10px rgba(0,0,0,.6);
          user-select: none; pointer-events: none;
        }
      `}</style>
    </main>
  );
}
