"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, Radio, Send } from "lucide-react";

/**
 * CHXNDLER — Cockpit v4 (fixed-ratio frame, interactive hotspots, in-dash player)
 *
 * Required files (case-sensitive):
 *   /cockpit/cockpit.png          (16:9 preferred)
 *   /tracks/ocean-girl.mp3
 *   /cover/ocean-girl.png         (jpg fallback ok)
 * Optional second example:
 *   /tracks/baby.mp3
 *   /cover/baby.png
 */

const COCKPIT_SRC = "/cockpit/cockpit.png";

/** Your stations */
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
 * Hotspot map inside a 16:9 frame (so it never drifts).
 * Numbers are % of the frame (not the viewport).
 */
const MAP = {
  DASHBOARD: { left: "19%", top: "17%", width: "62%", height: "19%" }, // center screen
  RIGHT_PANEL: { right: "8.5%", top: "33.5%", width: "24%", minWidth: 280 }, // join form
  IG: { left: "14.2%", top: "41.4%", width: "5.6%", height: "10.6%" },
  TT: { left: "14.2%", top: "56.9%", width: "5.4%", height: "10.4%" },
  YT: { left: "14.0%", top: "72.4%", width: "6.0%", height: "11.2%" },
};

export default function Cockpit() {
  const [index, setIndex] = useState(0);
  const station = STATIONS[index];

  /** ---------- audio ---------- */
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [vol, setVol] = useState(0.9);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [tryIdx, setTryIdx] = useState(0);

  const audioSrcs = useMemo(() => {
    const s = station?.file || "";
    const base = s || `/tracks/${station?.id}.mp3`;
    const g = [base];
    if (!s.endsWith(".mp3")) g.push(base.replace(/\.[^.]+$/, ".mp3"));
    g.push(base.replace(/\.[^.]+$/, ".m4a"), base.replace(/\.[^.]+$/, ".wav"));
    return Array.from(new Set(g));
  }, [station]);

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
  const nextStation = () => setIndex((i) => (i + 1) % STATIONS.length);
  const prevStation = () =>
    setIndex((i) => (i - 1 + STATIONS.length) % STATIONS.length);

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-hidden relative">
      <SpaceWorld theme={station.theme} playing={isPlaying} />

      {/* ===== Fixed-ratio 16:9 frame that contains the cockpit and all hotspots ===== */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        {/* Frame keeps 16:9; we letterbox if needed so mapping stays perfect */}
        <div
          className="relative"
          style={{
            width: "min(100vw, 177.78vh)", // 16/9 * 100vh
            height: "calc(min(100vw, 177.78vh) * 9 / 16)",
          }}
        >
          {/* Cockpit image (does NOT steal clicks) */}
          <img
            src={COCKPIT_SRC}
            alt="Cockpit"
            className="absolute inset-0 h-full w-full object-cover select-none"
            style={{ pointerEvents: "none" }}
            draggable={false}
          />

          {/* Social hotspots (glowing + clickable) */}
          <SocialHotspots />

          {/* Dashboard HUD (title, cover art, player, tuner knob, music pills) */}
          <DashboardHUD
            rect={MAP.DASHBOARD}
            station={station}
            index={index}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            progress={progress}
            duration={duration}
            seek={seek}
            vol={vol}
            setVol={setVol}
            nextStation={nextStation}
            prevStation={prevStation}
          />

          {/* Join form in right panel */}
          <JoinAliens rect={MAP.RIGHT_PANEL} />

          {/* <audio> lives at root but is logical here */}
        </div>
      </div>

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

/* ================== HUD / Panels ================== */

function DashboardHUD({
  rect,
  station,
  index,
  isPlaying,
  togglePlay,
  progress,
  duration,
  seek,
  vol,
  setVol,
  nextStation,
  prevStation,
}) {
  // pills for music links
  const pills = [
    station.links?.spotify && {
      label: "Spotify",
      href: station.links.spotify,
      glow: "#1DB954",
    },
    station.links?.apple && {
      label: "Apple Music",
      href: station.links.apple,
      glow: "#FFFFFF",
    },
    station.links?.youtube && {
      label: "YouTube (MV)",
      href: station.links.youtube,
      glow: "#FF0000",
    },
  ].filter(Boolean);

  // tuner knob angle per station
  const angle =  -40 + index * 65; // simple mapping; tweak as you add songs

  return (
    <div
      className="absolute"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    >
      <div
        className="h-full w-full rounded-2xl border px-3 py-2 md:px-4 md:py-3 grid"
        style={{
          borderColor: "rgba(255,255,255,0.15)",
          background: "rgba(10,15,20,0.45)",
          backdropFilter: "blur(10px)",
          boxShadow:
            "0 0 40px rgba(56,182,255,.18), inset 0 0 36px rgba(255,255,255,.04)",
          gridTemplateColumns: "auto 1fr auto",
          columnGap: "10px",
          alignItems: "center",
        }}
      >
        {/* Cover art (left, inside the dashboard) */}
        <CoverArtInDash candidates={station.cover} title={station.title} />

        {/* Center: title, progress, volume, link pills */}
        <div className="min-w-0 overflow-hidden">
          <div
            className="text-[15px] md:text-[18px] font-semibold truncate"
            style={{ textShadow: "0 0 10px rgba(189,230,255,.6)" }}
            title={station.title}
          >
            {station.title}
          </div>

          {/* progress */}
          <ProgressRow progress={progress} duration={duration} seek={seek} />

          {/* volume + pills */}
          <div className="mt-1 flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
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

            <div className="ml-auto flex flex-wrap gap-2 text-[11px]">
              {pills.map((p) => (
                <a
                  key={p.label}
                  href={p.href}
                  target="_blank"
                  className="rounded-full px-3 py-1 border border-white/15 bg-white/10 hover:bg-white/20"
                  style={{
                    boxShadow: `0 0 14px ${p.glow}66, inset 0 0 12px ${p.glow}22`,
                  }}
                >
                  {p.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Play + tuner knob */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="rounded-full border border-white/30 p-2 hover:bg-white/10"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>

          {/* Fun tuner knob */}
          <div className="relative h-12 w-12">
            <div
              className="absolute inset-0 rounded-full border"
              style={{
                borderColor: "rgba(255,255,255,0.25)",
                background:
                  "radial-gradient(circle at 30% 30%, rgba(255,255,255,.1), rgba(0,0,0,.15))",
                boxShadow:
                  "inset 0 0 10px rgba(0,0,0,.5), 0 0 18px rgba(56,182,255,.25)",
              }}
            />
            <motion.div
              className="absolute left-1/2 top-1/2 h-4 w-1 rounded"
              style={{ background: "rgba(255,255,255,.8)", originY: "100%" }}
              animate={{ rotate: angle }}
              transition={{ type: "spring", stiffness: 140, damping: 12 }}
            />
            {/* hit targets */}
            <button
              aria-label="Prev"
              onClick={prevStation}
              className="absolute left-0 top-0 h-full w-1/2"
              style={{ background: "transparent" }}
            />
            <button
              aria-label="Next"
              onClick={nextStation}
              className="absolute right-0 top-0 h-full w-1/2"
              style={{ background: "transparent" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ progress, duration, seek }) {
  const fmt = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${ss}`;
  };
  return (
    <div className="mt-1 flex items-center gap-2 text-[11px] opacity-85">
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
  );
}

function CoverArtInDash({ candidates, title }) {
  const [i, setI] = useState(0);
  const src = candidates?.[i];
  if (!src) return null;
  return (
    <div
      className="relative mr-2 h-14 w-14 overflow-hidden rounded-lg border"
      style={{
        borderColor: "rgba(255,255,255,0.2)",
        background: "rgba(255,255,255,0.06)",
        boxShadow: "inset 0 0 18px rgba(56,182,255,.25), 0 0 18px rgba(252,84,175,.2)",
      }}
      title={title}
    >
      <img
        src={src}
        alt={title}
        onError={() => setI((i + 1) % (candidates?.length || 1))}
        className="h-full w-full object-cover"
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-lg"
        style={{ boxShadow: "inset 0 0 24px rgba(255,255,255,.12)" }}
      />
    </div>
  );
}

function SocialHotspots() {
  const socials = {
    instagram: "https://instagram.com/chxndler_music",
    tiktok: "https://tiktok.com/@chxndler_music",
    youtube: "https://youtube.com/@CHXNDLER_MUSIC",
  };

  const glow = (c) => ({
    boxShadow: `0 0 16px ${c}99, inset 0 0 10px ${c}44`,
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(0,0,0,0.25)",
  });

  return (
    <>
      <a
        href={socials.instagram}
        target="_blank"
        aria-label="Instagram"
        className="absolute rounded-xl"
        style={{ ...MAP.IG, ...glow("#FC54AF") }}
      />
      <a
        href={socials.tiktok}
        target="_blank"
        aria-label="TikTok"
        className="absolute rounded-xl"
        style={{ ...MAP.TT, ...glow("#FFFFFF") }}
      />
      <a
        href={socials.youtube}
        target="_blank"
        aria-label="YouTube"
        className="absolute rounded-xl"
        style={{ ...MAP.YT, ...glow("#FF0000") }}
      />
    </>
  );
}

function JoinAliens({ rect }) {
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
      className="absolute"
      style={{
        right: rect.right,
        top: rect.top,
        width: rect.width,
        minWidth: rect.minWidth,
      }}
    >
      <div
        className="rounded-2xl border p-3 md:p-4"
        style={{
          borderColor: "rgba(255,255,255,0.15)",
          background: "rgba(10,15,20,0.45)",
          backdropFilter: "blur(10px)",
          boxShadow:
            "0 0 40px rgba(252,84,175,.25), inset 0 0 36px rgba(56,182,255,.18)",
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

/* ================== background ================== */
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
      {theme.fx === "waves" && <OceanFX />}
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
function OceanFX() {
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
