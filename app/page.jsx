"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, Radio, Send } from "lucide-react";

/**
 * CHXNDLER — Cockpit MVP (fixed to OCEAN GIRL)
 * Required public files (case-sensitive):
 *   /cockpit/cockpit.png
 *   /tracks/ocean-girl.mp3
 *   /cover/ocean-girl.png   (jpg fallback tried automatically)
 */

const COCKPIT_SRC = "/cockpit/cockpit.png";

const STATION = {
  id: "ocean-girl",
  title: "OCEAN GIRL",
  file: "/tracks/ocean-girl.mp3",
  planet: { base: "#79c7ff", glow: "#bde6ff", fx: "waves" },
  links: {
    spotify:
      "https://open.spotify.com/album/37niwECG0TJMuYFQdrJE3y?si=S_Btj1hMRU-RsnsVL2PBmQ",
    apple:
      "https://music.apple.com/us/album/ocean-girl/1829503198?i=1829503199",
    youtube: "https://youtu.be/GKfczFiNLn0",
  },
};

// ===== page =====
export default function Home() {
  // --- audio state ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [vol, setVol] = useState(0.9);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [tryIndex, setTryIndex] = useState(0);
  const audioRef = useRef(null);

  // explicit cover (reliable) with jpg fallback
  const coverSrcs = useMemo(
    () => ["/cover/ocean-girl.png", "/cover/ocean-girl.jpg"],
    []
  );

  const audioSrcs = useMemo(
    () => [STATION.file, "/tracks/ocean-girl.mp3", "/tracks/ocean-girl.m4a"],
    []
  );

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setTryIndex(0);
    a.src = audioSrcs[0] || "";
    a.load();
    a.volume = vol;
  }, [audioSrcs, vol]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audioSrcs[tryIndex]) return;
    a.src = audioSrcs[tryIndex];
    a.load();
    if (isPlaying) a.play().catch(() => {});
  }, [tryIndex, isPlaying, audioSrcs]);

  const onTime = () => {
    const a = audioRef.current;
    if (!a) return;
    setProgress(a.currentTime || 0);
    setDuration(a.duration || 0);
  };
  const seek = (t) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = t;
    setProgress(t);
  };
  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      try {
        await a.play();
        setIsPlaying(true);
      } catch {}
    } else {
      a.pause();
      setIsPlaying(false);
    }
  };
  const fmt = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${ss}`;
  };

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-hidden">
      {/* moving starfield + subtle ocean vibe */}
      <SpaceWorld playing={isPlaying} theme={STATION.planet} />

      {/* Static cockpit overlay */}
      <img
        src={COCKPIT_SRC}
        alt="Cockpit"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full object-cover"
      />

      {/* CLICKABLE HOTSPOTS MAPPED ON COCKPIT IMAGE */}
      <CockpitHotspots />

      {/* Embedded Join form INSIDE the right display */}
      <JoinAliensEmbedded />

      {/* Player panel */}
      <div className="relative z-20 mx-auto mt-4 w-[95%] max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6 backdrop-blur">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Title + quick links (music) */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="opacity-70" />
              <div className="text-sm uppercase tracking-wider opacity-70">
                Radio
              </div>
            </div>
            <div className="text-lg font-semibold">{STATION.title}</div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <a
                target="_blank"
                href={STATION.links.spotify}
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 hover:bg-white/20"
              >
                Spotify
              </a>
              <a
                target="_blank"
                href={STATION.links.apple}
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 hover:bg-white/20"
              >
                Apple Music
              </a>
              <a
                target="_blank"
                href={STATION.links.youtube}
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 hover:bg-white/20"
              >
                YouTube (MV)
              </a>
            </div>
          </div>

          {/* Transport */}
          <div className="col-span-1 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="pointer-events-auto rounded-full border border-white/20 p-3 hover:bg-white/10"
              >
                {isPlaying ? <Pause /> : <Play />}
              </button>
            </div>
            <div className="w-full flex items-center gap-2 text-xs opacity-80">
              <span className="tabular-nums w-10 text-right">
                {fmt(progress)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.01}
                value={progress}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="flex-1 accent-yellow-400"
              />
              <span className="tabular-nums w-10">{fmt(duration)}</span>
            </div>
            <div className="w-full text-[10px] opacity-60 break-all">
              src: {audioSrcs[tryIndex] || "(no source)"}
            </div>
          </div>

          {/* Volume */}
          <div className="col-span-1 flex justify-end">
            <div className="flex items-center gap-2">
              <Volume2 className="opacity-70" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={vol}
                onChange={(e) => setVol(parseFloat(e.target.value))}
                className="w-40 accent-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cover art hologram (reliable explicit path + auto-hide on error) */}
      <CoverArtHolo candidates={coverSrcs} title={STATION.title} />

      {/* Audio */}
      <audio
        ref={audioRef}
        hidden
        onTimeUpdate={onTime}
        onLoadedMetadata={onTime}
        onError={() =>
          setTryIndex((i) => (i + 1) % Math.max(audioSrcs.length, 1))
        }
      />
    </div>
  );
}

/* ---------- cockpit hotspots (instagram / tiktok / youtube) ---------- */
/* These are clickable, positioned zones that sit above the cockpit art. */
/* Percentages are tuned for the image you provided and scale responsively. */
function CockpitHotspots() {
  // social destinations
  const socials = {
    instagram: "https://instagram.com/chxndler_music",
    tiktok: "https://tiktok.com/@chxndler_music",
    youtube: "https://youtube.com/@CHXNDLER_MUSIC",
  };
  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      {/* Instagram button (left column top) */}
      <a
        href={socials.instagram}
        target="_blank"
        className="absolute pointer-events-auto"
        style={{
          left: "6.8%",
          top: "37.5%",
          width: "6.8%",
          height: "12.2%",
          borderRadius: "12px",
        }}
        aria-label="Instagram"
      />
      {/* TikTok button (left column middle) */}
      <a
        href={socials.tiktok}
        target="_blank"
        className="absolute pointer-events-auto"
        style={{
          left: "7.2%",
          top: "53.6%",
          width: "6.2%",
          height: "12.0%",
          borderRadius: "12px",
        }}
        aria-label="TikTok"
      />
      {/* YouTube button (left column bottom) */}
      <a
        href={socials.youtube}
        target="_blank"
        className="absolute pointer-events-auto"
        style={{
          left: "7.0%",
          top: "69.7%",
          width: "6.5%",
          height: "12.5%",
          borderRadius: "12px",
        }}
        aria-label="YouTube"
      />
    </div>
  );
}

/* ---------- embedded “Join the Aliens” inside the right display ---------- */
function JoinAliensEmbedded() {
  // This positions the form over the right dashboard screen area.
  return (
    <div
      className="absolute z-20"
      style={{
        // tuned for the cockpit.png proportions; scales with viewport
        right: "9.2%",
        top: "34.5%",
        width: "22.5%",
        minWidth: 260,
      }}
    >
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
        <div className="text-xs uppercase tracking-wider opacity-70 mb-1">
          Join the Aliens
        </div>
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-2">
          <input
            type="email"
            placeholder="you@example.com"
            className="rounded-xl bg-black/40 px-3 py-2 outline-none placeholder:text-white/40"
            required
          />
          <input
            type="tel"
            placeholder="phone (optional)"
            className="rounded-xl bg-black/40 px-3 py-2 outline-none placeholder:text-white/40"
          />
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-black hover:bg-white"
            type="submit"
          >
            <Send size={14} /> Join
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------- background & cover hologram ---------- */
function SpaceWorld({ theme, playing }) {
  const speed = playing ? 1.2 : 0.5;
  return (
    <div className="absolute inset-0 -z-10">
      <StarLayer blur={0} speed={speed} tint={`${theme.glow}88`} />
      <StarLayer blur={0.3} speed={speed * 1.6} tint={`${theme.base}66`} />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 70% 30%, ${theme.glow}11, transparent 40%), radial-gradient(circle at 20% 70%, ${theme.base}11, transparent 40%)`,
        }}
      />
      <EnvFX type={theme.fx} color={theme.glow} />
    </div>
  );
}
function StarLayer({ blur = 0, speed = 1, tint = "#fff8" }) {
  const style = {
    position: "absolute",
    inset: 0,
    backgroundRepeat: "repeat",
    pointerEvents: "none",
    backgroundImage: `radial-gradient(${tint} 1px, transparent 1px)`,
    backgroundSize: "3px 3px",
    filter: `blur(${blur}px)`,
    animation: `starMove ${20 / Math.max(speed, 0.1)}s linear infinite`,
  };
  return (
    <div style={style}>
      <style>{`@keyframes starMove{from{transform:translateY(0)}to{transform:translateY(30%)}}`}</style>
    </div>
  );
}
function EnvFX({ type, color }) {
  if (type === "waves")
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <style>{`@keyframes waveMove{0%{transform:translateX(-20%)}100%{transform:translateX(20%)}}`}</style>
        <div style={{ position: "absolute", bottom: "10%", left: 0, right: 0, height: "14%", background: "repeating-linear-gradient(to right, rgba(255,255,255,0.08), rgba(255,255,255,0.08) 10px, transparent 10px, transparent 20px)", opacity: 0.5, filter: "blur(1px)", animation: "waveMove 6s linear infinite" }} />
        <div style={{ position: "absolute", bottom: "6%", left: 0, right: 0, height: "10%", background: "repeating-linear-gradient(to right, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 12px, transparent 12px, transparent 24px)", opacity: 0.4, filter: "blur(1px)", animation: "waveMove 8s linear infinite reverse" }} />
      </div>
    );
  return null;
}
function CoverArtHolo({ candidates, title }) {
  const [idx, setIdx] = useState(0);
  const src = candidates[idx];
  if (!src) return null;

  return (
    <motion.div
      className="fixed z-30"
      style={{
        left: "50%",
        top: "38%", // sits just below the “OCEAN GIRL” dashboard title
        transform: "translateX(-50%)",
      }}
      animate={{ y: [0, -8, 0] }}
      transition={{ repeat: Infinity, duration: 4 }}
    >
      <div
        className="relative h-36 w-36 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1 backdrop-blur"
        style={{ boxShadow: "0 0 40px rgba(252,84,175,.35)" }}
      >
        <img
          src={src}
          alt={title}
          onError={() => setIdx((idx + 1) % candidates.length)}
          className="h-full w-full rounded-xl object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ boxShadow: "inset 0 0 40px rgba(56,182,255,.25)" }}
        />
      </div>
    </motion.div>
  );
}
