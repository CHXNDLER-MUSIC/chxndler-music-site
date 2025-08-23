"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/*  CHXNDLER — Cockpit WOW (v3.0)
    - One file, no external CSS required
    - Works with or without Tailwind
    - Neon glass HUD with animated glow & bolts
    - Resilient cover art + single <audio> player
*/

const BUILD_TAG = "Cockpit v3.0 — WOW";

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

/* ---------- Cover image with cache-bust + fallback ---------- */
function CoverImage({ src, alt, cacheKey }) {
  const [okSrc, setOkSrc] = useState(src);
  useEffect(() => {
    const q = cacheKey ? "?v=" + encodeURIComponent(cacheKey) : "";
    setOkSrc(src + q);
  }, [src, cacheKey]);

  return (
    <img
      src={okSrc}
      alt={alt}
      decoding="async"
      loading="eager"
      onError={() => {
        // eslint-disable-next-line no-console
        console.error("Cover failed to load:", okSrc);
        setOkSrc(PATHS.logoFallback);
      }}
      className="ck-cover"
      draggable={false}
    />
  );
}

/* ----------------------------- Audio hook ----------------------------- */
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

  return { audioRef, index, setIndex, track: playlist[index], playing, ready, toggle, next, prev };
}

/* ----------------------------- Buttons ----------------------------- */
function ControlButton({ title, onClick, children }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className="ck-btn"
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "none")}
    >
      {children}
    </button>
  );
}

function LinkPill({ href, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="ck-pill"
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "none")}
    >
      {label}
    </a>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function Page() {
  const { audioRef, track, playing, ready, toggle, next, prev } = useAudio(PLAYLIST);

  // Title marker so you can confirm deployment
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "CHXNDLER — Cockpit (WOW v3.0)";
    return () => (document.title = prevTitle);
  }, []);

  // Preload imagery
  useEffect(() => {
    PLAYLIST.forEach((t) => {
      [t.cover, t.backdrop].forEach((src) => {
        if (!src) return;
        const im = new Image();
        im.decoding = "async";
        im.loading = "eager";
        im.src = src;
      });
    });
  }, []);

  // Parallax on backdrop
  const bgRef = useRef(null);
  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    let rx = 0, ry = 0;
    const onMove = (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      const x = ((e.clientX || w / 2) / w) - 0.5;
      const y = ((e.clientY || h / 2) / h) - 0.5;
      rx = x * 7;
      ry = -y * 5;
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
      {/* Backdrop that changes per track */}
      <img ref={bgRef} src={track.backdrop || PATHS.fallbackBackdrop} alt="" className="ck-bg" draggable={false} />
      {/* Cockpit overlay */}
      <img src={PATHS.cockpit} alt="" className="ck-overlay" draggable={false} />

      {/* Social stack */}
      <div className="ck-socials">
        <LinkPill href={LINKS.instagram} label="Instagram" />
        <LinkPill href={LINKS.tiktok} label="TikTok" />
        <LinkPill href={LINKS.youtube} label="YouTube" />
        <LinkPill href={LINKS.spotify} label="Spotify" />
        <LinkPill href={LINKS.apple} label="Apple Music" />
      </div>

      {/* In-dash HUD player */}
      <div className="ck-hud-wrap">
        <div className="ck-hud">
          {/* bezel bolts */}
          <span className="ck-bolt ck-bolt-left" />
          <span className="ck-bolt ck-bolt-right" />

          <div className="ck-row">
            <CoverImage src={track.cover} alt={track.title} cacheKey={track.id} />

            <div className="ck-flex1">
              <div className="ck-title">{track.title}</div>

              <div className="ck-row ck-gap">
                <ControlButton title="Previous" onClick={prev}>◀</ControlButton>
                <ControlButton title={playing ? "Pause" : "Play"} onClick={toggle}>
                  {playing ? "Pause" : (ready ? "Play" : "Enable sound")}
                </ControlButton>
                <ControlButton title="Next" onClick={next}>▶</ControlButton>

                {/* status lights */}
                <div className="ck-lights">
                  <span className={playing ? "ck-light ck-play" : "ck-light ck-idle"} />
                  <span className="ck-light ck-sync" />
                </div>
              </div>

              {/* progress (decorative) */}
              <div className="ck-progress">
                <div className={playing ? "ck-progress-fill ck-progress-on" : "ck-progress-fill"} />
              </div>
            </div>

            {/* brand puck */}
            <div className="ck-puck" title="CHXNDLER" />
          </div>

          <audio ref={audioRef} preload="metadata" />
        </div>
      </div>

      {/* build badge */}
      <div className="ck-badge">{BUILD_TAG}</div>

      {/* WOW styles (scoped) */}
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
        .ck-bg, .ck-overlay {
          position: absolute; inset: 0;
          width: 100%; height: 100%; object-fit: cover;
        }
        .ck-bg { filter: saturate(1.05) brightness(.9); }
        .ck-overlay { pointer-events: none; }

        .ck-socials {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          display: flex; flex-direction: column; gap: 12px;
        }
        .ck-pill {
          display: inline-flex; align-items: center; justify-content: center;
          height: 38px; width: 140px; padding: 0 14px; text-decoration: none;
          font-weight: 800; font-size: 13px; letter-spacing: .02em; color: #fff;
          background: rgba(28, 34, 48, .5);
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 14px;
          box-shadow: 0 12px 28px rgba(0,0,0,.38), inset 0 0 12px rgba(56,182,255,.14);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          transition: background .18s ease, transform .12s ease, box-shadow .18s ease;
        }
        .ck-pill:hover { background: rgba(255,255,255,.22); box-shadow: 0 14px 38px rgba(0,0,0,.44), 0 0 20px rgba(56,182,255,.18); }

        .ck-hud-wrap {
          position: absolute; left: 50%; top: 56px; transform: translateX(-50%); width: 92vw; max-width: 720px;
          perspective: 1000px;
        }
        .ck-hud {
          position: relative; border-radius: 24px; padding: 14px 16px; transform: rotateX(2deg);
          color: rgba(255,255,255,.95);
          background: linear-gradient(180deg, rgba(20,24,36,.60), rgba(20,24,36,.34));
          border: 1px solid rgba(255,255,255,.10);
          box-shadow:
            0 10px 40px rgba(0,0,0,.48),
            inset 0 0 20px rgba(56,182,255,.16),
            0 0 28px rgba(252,84,175,.18);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          overflow: hidden;
        }
        .ck-bolt {
          position: absolute; top: -6px; width: 10px; height: 10px; border-radius: 999px;
          background: rgba(255,255,255,.35);
          box-shadow: 0 0 10px rgba(255,255,255,.38);
          animation: boltGlow 2.8s ease-in-out infinite;
        }
        .ck-bolt-left { left: 18px; animation-delay: .2s; }
        .ck-bolt-right { right: 18px; animation-delay: .9s; }
        @keyframes boltGlow {
          0%,100% { opacity: .65; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-1px); }
        }

        .ck-row { display: flex; align-items: center; gap: 12px; }
        .ck-gap { margin-top: 8px; gap: 10px; }
        .ck-flex1 { flex: 1; min-width: 0; }
        .ck-title {
          font-size: 16px; font-weight: 800; letter-spacing: .02em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-shadow: 0 2px 14px rgba(0,0,0,.55);
        }

        .ck-btn {
          padding: 8px 12px; min-width: 44px;
          font-size: 13px; font-weight: 800; letter-spacing: .02em; color: #fff; cursor: pointer;
          background: radial-gradient(120% 120% at 50% -10%, rgba(56,182,255,.18), rgba(252,84,175,.18));
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 14px;
          box-shadow: 0 12px 28px rgba(0,0,0,.38), inset 0 0 12px rgba(56,182,255,.16);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          transition: background .18s ease, transform .12s ease, box-shadow .18s ease;
        }
        .ck-btn:hover { background: rgba(255,255,255,.22); box-shadow: 0 14px 38px rgba(0,0,0,.44), 0 0 22px rgba(252,84,175,.22); }

        .ck-cover {
          width: 64px; height: 64px; border-radius: 10px; object-fit: cover;
          box-shadow: 0 2px 12px rgba(0,0,0,.45);
        }

        .ck-lights { display: flex; align-items: center; gap: 8px; margin-left: 8px; }
        .ck-light { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
        .ck-idle { background: rgba(255,255,255,.30); }
        .ck-play { background: #FC54AF; box-shadow: 0 0 14px rgba(252,84,175,.6); }
        .ck-sync { background: #38B6FF; box-shadow: 0 0 12px rgba(56,182,255,.55); }

        .ck-progress { margin-top: 10px; height: 6px; border-radius: 999px; background: rgba(255,255,255,.10); overflow: hidden; }
        .ck-progress-fill {
          height: 100%; width: 0%;
          background: linear-gradient(90deg, rgba(56,182,255,.9), rgba(252,84,175,.9));
          border-radius: 999px; box-shadow: 0 0 16px rgba(56,182,255,.35); transition: width 600ms ease;
        }
        .ck-progress-on { width: 45%; }

        .ck-puck {
          display: none; /* show on md+ if you want */
          width: 40px; height: 40px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: radial-gradient(60% 60% at 50% 35%, rgba(252,84,175,.70), rgba(56,182,255,.60));
          box-shadow: 0 0 16px rgba(252,84,175,.35);
        }

        .ck-badge {
          position: absolute; bottom: 6px; left: 10px; font-size: 11px; font-weight: 800; letter-spacing: .02em;
          color: rgba(255,255,255,.75); text-shadow: 0 2px 10px rgba(0,0,0,.6);
          user-select: none; pointer-events: none;
        }
      `}</style>
    </main>
  );
}
