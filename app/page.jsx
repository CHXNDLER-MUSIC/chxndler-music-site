"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/*
  CHXNDLER Cockpit — page.jsx (v2.0 minimal)
  - No Tailwind classes (pure inline styles)
  - No template literals in JSX
  - No special units or bracket syntax
  - Single <audio>, resilient cover image fallback
*/

const BUILD_TAG = "Cockpit v2.0 - minimal";

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
    title: "OCEAN GIRL - Acoustic",
    src: "/tracks/ocean-girl-acoustic.mp3",
    cover: "/cover/ocean-girl-acoustic-cover.png",
    backdrop: "/cockpit/ocean-girl-acoustic.png",
  },
  {
    id: "ocean-girl-remix",
    title: "OCEAN GIRL - Remix",
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

function CoverImage(props) {
  const { src, alt, cacheKey } = props;
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
        // helpful log + graceful fallback
        // eslint-disable-next-line no-console
        console.error("Cover failed to load:", okSrc);
        setOkSrc(PATHS.logoFallback);
      }}
      style={{
        width: 64,
        height: 64,
        borderRadius: 10,
        objectFit: "cover",
        boxShadow: "0 2px 12px rgba(0,0,0,0.45)",
      }}
      draggable={false}
    />
  );
}

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
    const onCanPlay = function () {
      setReady(true);
    };
    const onEnded = function () {
      setIndex(function (i) {
        return (i + 1) % playlist.length;
      });
    };
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("ended", onEnded);
    return function () {
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("ended", onEnded);
    };
  }, [playlist.length]);

  const play = useCallback(async function () {
    try {
      await (audioRef.current && audioRef.current.play());
      setPlaying(true);
    } catch {
      // user gesture required on mobile; ignore
    }
  }, []);
  const pause = useCallback(function () {
    if (audioRef.current) audioRef.current.pause();
    setPlaying(false);
  }, []);
  const toggle = useCallback(
    function () {
      if (playing) pause();
      else play();
    },
    [playing, play, pause]
  );
  const next = useCallback(function () {
    setIndex(function (i) {
      return (i + 1) % playlist.length;
    });
  }, [playlist.length]);
  const prev = useCallback(function () {
    setIndex(function (i) {
      return (i - 1 + playlist.length) % playlist.length;
    });
  }, [playlist.length]);

  return { audioRef, index, setIndex, track: playlist[index], playing, ready, toggle, next, prev };
}

function Button(props) {
  return (
    <button
      onClick={props.onClick}
      aria-label={props.title}
      title={props.title}
      style={{
        padding: "6px 10px",
        fontSize: 13,
        fontWeight: 600,
        color: "white",
        background: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.20)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
    >
      {props.children}
    </button>
  );
}

function LinkPill(props) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "8px 14px",
        borderRadius: 16,
        color: "white",
        textDecoration: "none",
        background: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
        fontSize: 13,
        fontWeight: 600,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.20)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
    >
      {props.label}
    </a>
  );
}

export default function Page() {
  const { audioRef, track, playing, ready, toggle, next, prev } = useAudio(PLAYLIST);

  // page title marker
  useEffect(() => {
    const prev = document.title;
    document.title = "CHXNDLER - Cockpit (v2.0)";
    return function () {
      document.title = prev;
    };
  }, []);

  // preload
  useEffect(() => {
    PLAYLIST.forEach(function (t) {
      [t.cover, t.backdrop].forEach(function (src) {
        if (!src) return;
        const im = new Image();
        im.decoding = "async";
        im.loading = "eager";
        im.src = src;
      });
    });
  }, []);

  // very light parallax
  const bgRef = useRef(null);
  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    let rx = 0;
    let ry = 0;
    const onMove = function (e) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const x = ((e.clientX || w / 2) / w) - 0.5;
      const y = ((e.clientY || h / 2) / h) - 0.5;
      rx = x * 8;
      ry = -y * 6;
    };
    const loop = function () {
      el.style.transform = "perspective(800px) rotateY(" + rx + "deg) rotateX(" + ry + "deg)";
      requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", onMove);
    requestAnimationFrame(loop);
    return function () {
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  // styles
  const root = {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    background: "black",
    color: "white",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  };

  const imgFull = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  const socialsCol = {
    position: "absolute",
    left: 16,
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const hudWrap = {
    position: "absolute",
    left: "50%",
    top: 56, // px; safe for all CSS parsers
    transform: "translateX(-50%)",
    width: "92vw",
    maxWidth: 720,
    perspective: "1000px",
  };

  const hudCard = {
    position: "relative",
    borderRadius: 24,
    padding: "14px 16px",
    color: "rgba(255,255,255,0.95)",
    background: "rgba(30,34,46,0.55)",
    boxShadow: "0 8px 30px rgba(0,0,0,0.45), inset 0 0 18px rgba(56,182,255,0.12)",
    border: "1px solid rgba(255,255,255,0.10)",
    transform: "rotateX(2deg)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
  };

  const row = {
    display: "flex",
    alignItems: "center",
    gap: 12,
  };

  const title = {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const lightsRow = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  };

  const lightIdle = {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(255,255,255,0.30)",
  };

  const lightPlay = {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#FC54AF",
  };

  const lightSynced = {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#38B6FF",
  };

  const progressBg = {
    marginTop: 10,
    height: 6,
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  };

  const progressFill = {
    height: "100%",
    width: playing ? "45%" : "0%",
    borderRadius: 999,
    transition: "width 600ms ease",
    background: "linear-gradient(90deg, rgba(56,182,255,0.9), rgba(252,84,175,0.9))",
    boxShadow: "0 0 12px rgba(56,182,255,0.35)",
  };

  // build badge (bottom-left)
  const badge = {
    position: "absolute",
    bottom: 6,
    left: 10,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.02em",
    color: "rgba(255,255,255,0.75)",
    textShadow: "0 2px 10px rgba(0,0,0,0.6)",
    userSelect: "none",
    pointerEvents: "none",
  };

  return (
    <main style={root}>
      {/* backdrop */}
      <img
        ref={bgRef}
        src={track.backdrop || PATHS.fallbackBackdrop}
        alt=""
        style={imgFull}
        draggable={false}
      />

      {/* cockpit overlay */}
      <img src={PATHS.cockpit} alt="" style={imgFull} draggable={false} />

      {/* socials */}
      <div style={socialsCol}>
        <LinkPill href={LINKS.instagram} label="Instagram" />
        <LinkPill href={LINKS.tiktok} label="TikTok" />
        <LinkPill href={LINKS.youtube} label="YouTube" />
        <LinkPill href={LINKS.spotify} label="Spotify" />
        <LinkPill href={LINKS.apple} label="Apple Music" />
      </div>

      {/* player HUD */}
      <div style={hudWrap}>
        <div style={hudCard}>
          <div style={row}>
            <CoverImage src={track.cover} alt={track.title} cacheKey={track.id} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={title}>{track.title}</div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <Button onClick={prev} title="Previous">◀</Button>
                <Button onClick={toggle} title={playing ? "Pause" : "Play"}>
                  {playing ? "Pause" : ready ? "Play" : "Enable sound"}
                </Button>
                <Button onClick={next} title="Next">▶</Button>

                <div style={lightsRow}>
                  <span style={playing ? lightPlay : lightIdle} />
                  <span style={lightSynced} />
                </div>
              </div>

              <div style={progressBg}>
                <div style={progressFill} />
              </div>
            </div>

            {/* brand puck */}
            <div
              title="CHXNDLER"
              style={{
                display: "none",
                width: 40,
                height: 40,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.10)",
              }}
            />
          </div>

          <audio ref={audioRef} preload="metadata" />
        </div>
      </div>

      {/* build badge */}
      <div style={badge}>{BUILD_TAG}</div>
    </main>
  );
}
