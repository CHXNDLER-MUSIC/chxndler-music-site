"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, Radio, Send } from "lucide-react";

/**
 * Minimal Cockpit MVP (fixed to OCEAN GIRL)
 * Required public files (case-sensitive):
 *   /cockpit/cockpit.png
 *   /tracks/ocean-girl.mp3
 *   /cover/ocean-girl.png  (or .jpg)
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

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [vol, setVol] = useState(0.9);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [tryIndex, setTryIndex] = useState(0);
  const audioRef = useRef(null);

  const coverSrcs = useMemo(() => {
    const s = slug(STATION.title);
    return [`/cover/${s}.png`, `/cover/${s}.jpg`];
  }, []);
  const audioSrcs = useMemo(() => {
    const s = slug(STATION.title);
    return [STATION.file, `/tracks/${s}.mp3`, `/tracks/${s}.m4a`, `/tracks/${s}.wav`];
  }, []);

  // load first audio candidate
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setTryIndex(0);
    a.src = audioSrcs[0] || "";
    a.load();
    a.volume = vol;
  }, [audioSrcs, vol]);

  // if an error occurs, try next source
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
      <SpaceWorld playing={isPlaying} theme={STATION.planet} />

      {/* Static cockpit overlay */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <img
          src={COCKPIT_SRC}
          alt="Cockpit"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* Left: per-track buttons */}
      <div className="fixed left-4 top-1/2 z-30 -translate-y-1/2 flex flex-col gap-2">
        <a
          href={STATION.links.spotify}
          target="_blank"
          className="rounded-full px-3 py-2 text-xs font-semibold"
          style={{
            background: "rgba(255,255,255,0.06)",
            boxShadow:
              "0 0 16px #1DB95466, inset 0 0 10px #1DB95422",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          Spotify
        </a>
        <a
          href={STATION.links.apple}
          target="_blank"
          className="rounded-full px-3 py-2 text-xs font-semibold"
          style={{
            background: "rgba(255,255,255,0.06)",
            boxShadow: "0 0 16px #ffffff66, inset 0 0 10px #ffffff22",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          Apple Music
        </a>
        <a
          href={STATION.links.youtube}
          target="_blank"
          className="rounded-full px-3 py-2 text-xs font-semibold"
          style={{
            background: "rgba(255,255,255,0.06)",
            boxShadow: "0 0 16px #FF000066, inset 0 0 10px #FF000022",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          YouTube MV
        </a>
      </div>

      {/* Right: Join the Aliens */}
      <div className="fixed right-6 top-[38%] z-30 -translate-y-1/2 w-64 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <div className="text-xs uppercase tracking-wider opacity-70 mb-1">
          Join the Aliens
        </div>
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-2">
          <input
            type="email"
            placeholder="you@example.com"
            className="rounded-xl bg-black/40 px-3 py-2 outline-none placeholder:text-white/40"
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

      {/* Player panel */}
      <div className="relative z-20 mx-auto mt-6 w-[95%] max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6 backdrop-blur">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Title & quick links */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="opacity-70" />
              <div className="text-sm uppercase tracking-wider opacity-70">
                Radio
              </div>
            </div>
            <div className="text-lg font-semibold">{STATION.title}</div>
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

      {/* Floating cover hologram */}
      <CoverArtHolo candidates={coverSrcs} title={STATION.title} />

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

/* ---------- background & holo ---------- */

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
  const [i, setI] = useState(0);
  const src = candidates[i];
  if (!src) return null;
  return (
    <motion.div
      className="fixed bottom-28 left-1/2 z-30 -translate-x-1/2"
      animate={{ y: [0, -10, 0] }}
      transition={{ repeat: Infinity, duration: 4 }}
    >
      <div
        className="relative h-40 w-40 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1 backdrop-blur"
        style={{ boxShadow: "0 0 40px rgba(252,84,175,.35)" }}
      >
        <img
          src={src}
          alt={title}
          onError={() => setI((i + 1) % candidates.length)}
          className="h-full w-full rounded-xl object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ boxShadow: "inset 0 0 40px rgba(56,182,255,.25)" }}
        />
      </div>
      <div className="mt-2 text-center text-xs opacity-80">{title}</div>
    </motion.div>
  );
}
