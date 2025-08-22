"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, Radio, Send } from "lucide-react";

/**
 * CHXNDLER — Interactive Cockpit (dashboard-integrated player)
 *
 * Files you should have:
 *   /cockpit/cockpit.png
 *   /tracks/ocean-girl.mp3
 *   /cover/ocean-girl.png  (jpg fallback OK)
 * Optional:
 *   /tracks/baby.mp3
 *   /cover/baby.png
 */

// -------- assets & stations ----------
const COCKPIT_SRC = "/cockpit/cockpit.png";

const STATIONS = [
  {
    id: "ocean-girl",
    title: "OCEAN GIRL",
    file: "/tracks/ocean-girl.mp3",
    cover: ["/cover/ocean-girl.png", "/cover/ocean-girl.jpg"],
    links: {
      spotify:
        "https://open.spotify.com/album/37niwECG0TJMuYFQdrJE3y?si=S_Btj1hMRU-RsnsVL2PBmQ",
      apple:
        "https://music.apple.com/us/album/ocean-girl/1829503198?i=1829503199",
      youtube: "https://youtu.be/GKfczFiNLn0",
    },
    theme: { base: "#79c7ff", glow: "#bde6ff", fx: "waves" },
  },
  // Add more when you upload their files
  {
    id: "baby",
    title: "BABY",
    file: "/tracks/baby.mp3",
    cover: ["/cover/baby.png", "/cover/baby.jpg"],
    links: {
      spotify: "https://open.spotify.com/track/3UEVjChARWDbY4ruOIbIl3",
      apple: "https://music.apple.com/us/album/baby/1823220422?i=1823220423",
      youtube: "https://youtu.be/RqBs_MYhM6c",
    },
    theme: { base: "#ff7ab6", glow: "#ffe66d", fx: "waves" },
  },
];

/**
 * Responsive overlay layout (percentages tuned for your cockpit.png)
 * These define where we place interactive zones INSIDE the cockpit art.
 */
const REGIONS = {
  // The center dashboard screen above the wheel (player lives here)
  DASHBOARD: { left: "18%", top: "20%", width: "64%", height: "17%" },
  // Right screen (Join the Aliens)
  RIGHT_PANEL: { right: "8.5%", top: "35%", width: "24%", minWidth: 280 },
  // Left vertical social buttons on the plastic column
  SOCIAL_IG: { left: "6.8%", top: "37.6%", width: "6.8%", height: "12.2%" },
  SOCIAL_TT: { left: "7.2%", top: "53.6%", width: "6.3%", height: "12.0%" },
  SOCIAL_YT: { left: "7.0%", top: "69.8%", width: "6.6%", height: "12.4%" },
  // Floating cover hologram area (small tile just above wheel)
  COVER_HOLO: { left: "50%", top: "47.5%" },
};

// --------------------------------------

export default function Cockpit() {
  // pick first station that exists; we’ll still render if only Ocean Girl works
  const [index, setIndex] = useState(0);
  const station = STATIONS[index];

  // audio
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [vol, setVol] = useState(0.9);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [tryIdx, setTryIdx] = useState(0);

  const audioSrcs = useMemo(() => {
    // try declared file first, then common fallbacks
    const s = station?.file || "";
    const baseGuess = s || `/tracks/${station?.id}.mp3`;
    const guesses = [baseGuess];
    if (!s.endsWith(".mp3")) guesses.push(baseGuess.replace(/\.[^.]+$/, ".mp3"));
    guesses.push(
      baseGuess.replace(/\.[^.]+$/, ".m4a"),
      baseGuess.replace(/\.[^.]+$/, ".wav")
    );
    // dedupe
    return Array.from(new Set(guesses));
  }, [station]);

  // load source when station changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setTryIdx(0);
    a.src = audioSrcs[0] || "";
    a.load();
    a.volume = vol;
    setProgress(0);
    if (isPlaying) a.play().catch(() => {});
  }, [index, audioSrcs]);

  // on error, try next candidate
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audioSrcs[tryIdx]) return;
    a.src = audioSrcs[tryIdx];
    a.load();
    if (isPlaying) a.play().catch(() => {});
  }, [tryIdx]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = vol;
  }, [vol]);

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
  const fmt = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${ss}`;
  };

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-hidden relative">
      <SpaceWorld theme={station.theme} playing={isPlaying} />

      {/* Cockpit art (does NOT block clicks) */}
      <img
        src={COCKPIT_SRC}
        alt="Cockpit"
        className="absolute inset-0 z-10 h-full w-full object-cover select-none"
        draggable={false}
        style={{ pointerEvents: "none" }} // allow our overlay UIs to receive clicks
      />

      {/* SOCIAL HOTSPOTS over the left column — glowing + clickable */}
      <SocialHotspots />

      {/* DASHBOARD PLAYER integrated inside the center screen */}
      <DashboardPlayer
        rect={REGIONS.DASHBOARD}
        station={station}
        index={index}
        setIndex={setIndex}
        isPlaying={isPlaying}
        togglePlay={togglePlay}
        progress={progress}
        duration={duration}
        seek={seek}
        vol={vol}
        setVol={setVol}
      />

      {/* JOIN THE ALIENS embedded on right panel (posts to /api/join) */}
      <JoinAliensEmbedded rect={REGIONS.RIGHT_PANEL} />

      {/* Floating cover hologram tile */}
      <CoverArtHolo rect={REGIONS.COVER_HOLO} candidates={station.cover} title={station.title} />

      {/* Audio element */}
      <audio
        ref={audioRef}
        hidden
        onTimeUpdate={onTime}
        onLoadedMetadata={onTime}
        onError={() => setTryIdx((i) => (i + 1) % Math.max(audioSrcs.length, 1))}
      />
    </div>
  );
}

/* ================== UI Blocks ================== */

function SocialHotspots() {
  const socials = {
    instagram: "https://instagram.com/chxndler_music",
    tiktok: "https://tiktok.com/@chxndler_music",
    youtube: "https://youtube.com/@CHXNDLER_MUSIC",
  };

  // common glow style
  const glow = (c) => ({
    boxShadow: `0 0 16px ${c}99, inset 0 0 10px ${c}44`,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(0,0,0,0.25)",
  });

  return (
    <div className="absolute inset-0 z-30">
      <a
        href={socials.instagram}
        target="_blank"
        aria-label="Instagram"
        className="absolute rounded-xl"
        style={{ ...REGIONS.SOCIAL_IG, ...glow("#FC54AF") }}
      />
      <a
        href={socials.tiktok}
        target="_blank"
        aria-label="TikTok"
        className="absolute rounded-xl"
        style={{ ...REGIONS.SOCIAL_TT, ...glow("#FFFFFF") }}
      />
      <a
        href={socials.youtube}
        target="_blank"
        aria-label="YouTube"
        className="absolute rounded-xl"
        style={{ ...REGIONS.SOCIAL_YT, ...glow("#FF0000") }}
      />
    </div>
  );
}

function DashboardPlayer({
  rect,
  station,
  index,
  setIndex,
  isPlaying,
  togglePlay,
  progress,
  duration,
  seek,
  vol,
  setVol,
}) {
  const pills = [
    station.links?.spotify && { label: "Spotify", href: station.links.spotify, glow: "#1DB954" },
    station.links?.apple && { label: "Apple Music", href: station.links.apple, glow: "#ffffff" },
    station.links?.youtube && { label: "YouTube (MV)", href: station.links.youtube, glow: "#FF0000" },
  ].filter(Boolean);

  return (
    <div
      className="absolute z-20"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    >
      <div
        className="h-full w-full rounded-2xl border backdrop-blur-md px-4 py-3 flex flex-col justify-between"
        style={{
          borderColor: "rgba(255,255,255,0.15)",
          background: "rgba(8,12,18,0.45)",
          boxShadow:
            "0 0 40px rgba(56,182,255,.20), inset 0 0 40px rgba(255,255,255,.04)",
        }}
      >
        {/* Row 1: Title + play */}
        <div className="flex items-center gap-3">
          <Radio className="opacity-80" />
          <div className="text-base md:text-lg font-semibold tracking-wide"
               style={{ textShadow: "0 0 8px rgba(189,230,255,.55)" }}>
            {station.title}
          </div>
          <button
            onClick={togglePlay}
            className="ml-auto rounded-full border border-white/30 p-2 hover:bg-white/10"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>
        </div>

        {/* Row 2: progress */}
        <div className="flex items-center gap-2 text-[11px] opacity-80">
          <span className="tabular-nums w-10 text-right">{fmt(progress)}</span>
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

        {/* Row 3: volume + tuner + pills */}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {/* volume */}
          <div className="flex items-center gap-2">
            <Volume2 className="opacity-70" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={vol}
              onChange={(e) => setVol(parseFloat(e.target.value))}
              className="w-32 accent-blue-500"
            />
          </div>

          {/* simple tuner (just two stations for now) */}
          <div className="ml-2 flex items-center gap-2 text-xs">
            {STATIONS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIndex(i)}
                className={`rounded-full px-2.5 py-1 ${
                  i === index ? "bg-white/20" : "bg-white/10 hover:bg-white/15"
                } border border-white/20`}
                title={s.title}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* music links */}
          <div className="ml-auto flex flex-wrap gap-2 text-xs">
            {pills.map((p) => (
              <a
                key={p.label}
                href={p.href}
                target="_blank"
                className="rounded-full px-3 py-1.5 border border-white/15 bg-white/10 hover:bg-white/20"
                style={{ boxShadow: `0 0 14px ${p.glow}66, inset 0 0 12px ${p.glow}22` }}
              >
                {p.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function JoinAliensEmbedded({ rect }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setMsg("Enter a valid email.");
      return;
    }
    setStatus("sending");
    try {
      const r = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const j = await r.json();
      if (!r.ok || j?.ok === false) throw new Error(j?.error || "Failed");
      setStatus("ok");
      setMsg("Thanks! You’re on the list. 👽");
      setEmail("");
      setPhone("");
    } catch (err) {
      setStatus("err");
      setMsg(String(err?.message || err || "Something went wrong"));
    }
  }

  return (
    <div
      className="absolute z-20"
      style={{
        right: rect.right,
        top: rect.top,
        width: rect.width,
        minWidth: rect.minWidth,
      }}
    >
      <div
        className="rounded-2xl border p-4 backdrop-blur-md"
        style={{
          borderColor: "rgba(255,255,255,0.15)",
          background: "rgba(8,12,18,0.45)",
          boxShadow:
            "0 0 40px rgba(252,84,175,.25), inset 0 0 40px rgba(56,182,255,.18)",
        }}
      >
        <div className="text-xs uppercase tracking-wider opacity-70 mb-1">
          Join the Aliens
        </div>
        <form onSubmit={submit} className="flex flex-col gap-2">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl bg-black/40 px-3 py-2 outline-none placeholder:text-white/40"
            required
          />
          <input
            type="tel"
            placeholder="phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-xl bg-black/40 px-3 py-2 outline-none placeholder:text-white/40"
          />
          <button
            disabled={status === "sending"}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-black hover:bg-white disabled:opacity-70"
            type="submit"
          >
            {status === "sending" ? "Sending…" : <> <Send size={14}/> Join </>}
          </button>
          {msg && (
            <div
              className={`text-xs mt-1 ${
                status === "err" ? "text-red-300" : "text-green-300"
              }`}
            >
              {msg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function CoverArtHolo({ rect, candidates, title }) {
  const [i, setI] = useState(0);
  const src = candidates?.[i];
  if (!src) return null;

  return (
    <motion.div
      className="absolute z-20"
      style={{
        left: rect.left,
        top: rect.top,
        transform: "translate(-50%, -50%)",
      }}
      animate={{ y: [0, -6, 0] }}
      transition={{ repeat: Infinity, duration: 4 }}
    >
      <div
        className="relative h-32 w-32 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1 backdrop-blur"
        style={{ boxShadow: "0 0 34px rgba(252,84,175,.35)" }}
      >
        <img
          src={src}
          alt={title}
          onError={() => setI((i + 1) % (candidates?.length || 1))}
          className="h-full w-full rounded-xl object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ boxShadow: "inset 0 0 36px rgba(56,182,255,.25)" }}
        />
      </div>
    </motion.div>
  );
}

/* --------------- background --------------- */
function SpaceWorld({ theme, playing }) {
  const speed = playing ? 1.2 : 0.5;
  return (
    <div className="absolute inset-0 -z-10">
      <StarLayer blur={0} speed={speed} tint={`${theme.glow}88`} />
      <StarLayer blur={0.3} speed={speed * 1.6} tint={`${theme.base}66`} />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 70% 30%, ${theme.glow}11, transparent 40%),
                       radial-gradient(circle at 20% 70%, ${theme.base}11, transparent 40%)`,
        }}
      />
      {theme.fx === "waves" && <OceanFX color={theme.glow} />}
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
function OceanFX({ color }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <style>{`@keyframes waveMove{0%{transform:translateX(-20%)}100%{transform:translateX(20%)}}`}</style>
      <div
        style={{
          position: "absolute",
          bottom: "11%",
          left: 0,
          right: 0,
          height: "14%",
          background:
            "repeating-linear-gradient(to right, rgba(255,255,255,0.08), rgba(255,255,255,0.08) 10px, transparent 10px, transparent 20px)",
          opacity: 0.5,
          filter: "blur(1px)",
          animation: "waveMove 6s linear infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "6%",
          left: 0,
          right: 0,
          height: "10%",
          background:
            "repeating-linear-gradient(to right, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 12px, transparent 12px, transparent 24px)",
          opacity: 0.4,
          filter: "blur(1px)",
          animation: "waveMove 8s linear infinite reverse",
        }}
      />
    </div>
  );
}

/* helpers */
function fmt(s) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${ss}`;
}
