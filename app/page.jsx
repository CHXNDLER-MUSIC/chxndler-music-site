"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, ChevronLeft, ChevronRight, Send } from "lucide-react";

/* =========================
   CHXNDLER Cockpit v5
   - 16:9 frame (hotspots never drift)
   - 3D-transformed “left console” with glowing social icons
   - 3D-transformed “center screen” HUD with hologram carousel (3 songs)
   - Embedded player (play/pause, progress, volume)
   - Join-the-Aliens in the right panel (posts to /api/join)
   ========================= */

const COCKPIT_SRC = "/cockpit/cockpit.png";

const STATIONS = [
  {
    id: "ocean-girl",
    title: "OCEAN GIRL",
    file: "/tracks/ocean-girl.mp3",
    cover: ["/cover/ocean-girl.png", "/cover/ocean-girl.jpg"],
    links: {
      spotify: "https://open.spotify.com/album/37niwECG0TJMuYFQdrJE3y?si=S_Btj1hMRU-RsnsVL2PBmQ",
      apple: "https://music.apple.com/us/album/ocean-girl/1829503198?i=1829503199",
      youtube: "https://youtu.be/GKfczFiNLn0",
    },
    theme: { base: "#79c7ff", glow: "#bde6ff", fx: "waves" },
  },
  {
    id: "ocean-girl-acoustic",
    title: "OCEAN GIRL (ACOUSTIC)",
    file: "/tracks/ocean-girl-acoustic.mp3",
    cover: ["/cover/ocean-girl-acoustic.png", "/cover/ocean-girl-acoustic.jpg"],
    links: {
      spotify: "https://open.spotify.com/track/62KREyqgAQxmq3zqCT7oMh?si=506cf1906fac4275",
      apple: "https://music.apple.com/us/album/ocean-girl-acoustic/1830685266?i=1830685267",
      youtube: "https://youtu.be/NsL3WC6L3fw",
    },
    theme: { base: "#9ad6ff", glow: "#e6fbff", fx: "waves" },
  },
  {
    id: "ocean-girl-remix",
    title: "OCEAN GIRL (REMIX)",
    file: "/tracks/ocean-girl-remix.mp3",
    cover: ["/cover/ocean-girl-remix.png", "/cover/ocean-girl-remix.jpg"],
    links: {
      spotify: "https://open.spotify.com/track/1wbgLONY1GsBZC5XW4MUzu?si=ff27a874552948c4",
      apple: "https://music.apple.com/us/album/ocean-girl-remix-single/1830764323",
      youtube: "https://youtu.be/oGiRQCARek4",
    },
    theme: { base: "#3b2f5a", glow: "#b47cff", fx: "lightning" },
  },
];

// 16:9 frame mapping. We don’t use raw pixels; everything is percentages so it scales perfectly.
const MAP = {
  FRAME: { w: "min(100vw, 177.78vh)", h: "calc(min(100vw, 177.78vh) * 9 / 16)" },

  // ----- LEFT CONSOLE PANEL (angled) -----
  LEFT_PANEL: {
    // approximate region covering the vertical social stack on your art
    left: "10.5%", top: "34%", width: "12.5%", height: "44%",
    // 3D tilt to match plastic bezel
    transform: "perspective(900px) rotateY(-18deg) rotateX(2deg) skewY(-2deg)",
  },

  // ----- CENTER SCREEN (main HUD) -----
  CENTER_HUD: {
    left: "25%", top: "18%", width: "50%", height: "20%",
    transform: "perspective(900px) rotateX(2deg)",
  },

  // ----- RIGHT PANEL (Join form) -----
  RIGHT_PANEL: {
    right: "9%", top: "32%", width: "23%", minWidth: 280,
    transform: "perspective(900px) rotateY(9deg) rotateX(1deg)",
  },
};

export default function Page() {
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
    const a = audioRef.current; if (!a) return;
    a.currentTime = t; setProgress(t);
  };
  const togglePlay = async () => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) { try { await a.play(); setIsPlaying(true); } catch {} }
    else { a.pause(); setIsPlaying(false); }
  };

  const next = () => setIndex((i) => (i + 1) % STATIONS.length);
  const prev = () => setIndex((i) => (i - 1 + STATIONS.length) % STATIONS.length);

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-hidden relative">
      <SpaceWorld theme={station.theme} playing={isPlaying} />

      {/* ===== 16:9 FRAME ===== */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="relative" style={{ width: MAP.FRAME.w, height: MAP.FRAME.h }}>
          {/* Cockpit art (non-interactive) */}
          <img
            src={COCKPIT_SRC}
            alt="Cockpit"
            className="absolute inset-0 h-full w-full object-cover select-none"
            style={{ pointerEvents: "none" }}
            draggable={false}
          />

          {/* LEFT CONSOLE: 3D panel with glowing social buttons */}
          <LeftConsole3D rect={MAP.LEFT_PANEL} />

          {/* CENTER HUD: hologram carousel + player fully embedded */}
          <CenterHUD3D
            rect={MAP.CENTER_HUD}
            station={station}
            index={index}
            next={next}
            prev={prev}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            progress={progress}
            duration={duration}
            seek={seek}
            vol={vol}
            setVol={setVol}
          />

          {/* RIGHT PANEL: signup form */}
          <JoinAliens3D rect={MAP.RIGHT_PANEL} />
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

/* =============== LEFT CONSOLE (3D) =============== */

function LeftConsole3D({ rect }) {
  const socials = {
    instagram: "https://instagram.com/chxndler_music",
    tiktok: "https://tiktok.com/@chxndler_music",
    youtube: "https://youtube.com/@CHXNDLER_MUSIC",
  };

  const Btn = ({ href, svg, glow, topPct }) => (
    <a
      href={href}
      target="_blank"
      className="absolute left-1/2 -translate-x-1/2 rounded-xl flex items-center justify-center"
      style={{
        top: topPct,
        width: "42%",
        height: "22%",
        boxShadow: `0 0 22px ${glow}99, inset 0 0 16px ${glow}44`,
        border: "1px solid rgba(255,255,255,0.18)",
        background:
          "radial-gradient(circle at 35% 30%, rgba(255,255,255,.08), rgba(0,0,0,.25))",
        backdropFilter: "blur(3px)",
      }}
      aria-label="social"
    >
      {svg}
    </a>
  );

  return (
    <div
      className="absolute"
      style={{
        left: rect.left, top: rect.top, width: rect.width, height: rect.height,
        transform: rect.transform, transformOrigin: "50% 50%",
      }}
    >
      <div className="relative h-full w-full">
        <Btn
          href={socials.instagram}
          topPct="8%"
          glow="#FC54AF"
          svg={<SVGInstagram />}
        />
        <Btn
          href={socials.tiktok}
          topPct="39%"
          glow="#FFFFFF"
          svg={<SVGTikTok />}
        />
        <Btn
          href={socials.youtube}
          topPct="70%"
          glow="#FF0000"
          svg={<SVGYouTube />}
        />
      </div>
    </div>
  );
}

/* =============== CENTER HUD (3D) =============== */

function CenterHUD3D({
  rect,
  station,
  index,
  next,
  prev,
  isPlaying,
  togglePlay,
  progress,
  duration,
  seek,
  vol,
  setVol,
}) {
  return (
    <div
      className="absolute"
      style={{
        left: rect.left, top: rect.top, width: rect.width, height: rect.height,
        transform: rect.transform, transformOrigin: "50% 50%",
      }}
    >
      <div
        className="h-full w-full rounded-2xl border grid"
        style={{
          borderColor: "rgba(255,255,255,0.16)",
          background: "rgba(10,15,20,0.50)",
          boxShadow:
            "0 0 44px rgba(56,182,255,.20), inset 0 0 36px rgba(255,255,255,.05)",
          backdropFilter: "blur(10px)",
          gridTemplateColumns: "auto 1fr auto",
          columnGap: "10px",
          alignItems: "center",
          padding: "10px",
        }}
      >
        {/* Hologram cover carousel (left) */}
        <HoloCarousel index={index} station={station} onPrev={prev} onNext={next} />

        {/* Middle column: title + progress + volume + music icons */}
        <div className="min-w-0 overflow-hidden">
          <div
            className="text-[16px] md:text-[18px] font-semibold truncate"
            style={{ textShadow: "0 0 10px rgba(189,230,255,.6)" }}
            title={station.title}
          >
            {station.title}
          </div>

          <ProgressRow progress={progress} duration={duration} seek={seek} />

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

            <div className="ml-auto flex items-center gap-2">
              <IconPill href={station.links?.spotify} glow="#1DB954">
                <SVGSpotify />
              </IconPill>
              <IconPill href={station.links?.apple} glow="#FFFFFF">
                <SVGAudioApple />
              </IconPill>
              <IconPill href={station.links?.youtube} glow="#FF0000">
                <SVGYouTube />
              </IconPill>
            </div>
          </div>
        </div>

        {/* Right column: play/pause */}
        <button
          onClick={togglePlay}
          className="rounded-full border border-white/30 p-2 hover:bg-white/10"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause /> : <Play />}
        </button>
      </div>
    </div>
  );
}

function HoloCarousel({ index, station, onPrev, onNext }) {
  // Visual only; actual audio switching happens via the page’s index state
  return (
    <div className="relative mr-2 h-16 w-16 md:h-20 md:w-20">
      <div
        className="absolute inset-0 rounded-xl border overflow-hidden"
        style={{
          borderColor: "rgba(255,255,255,0.25)",
          background: "rgba(255,255,255,0.06)",
          boxShadow:
            "inset 0 0 18px rgba(56,182,255,.25), 0 0 18px rgba(252,84,175,.25)",
          transform: "perspective(700px) rotateX(6deg)",
          transformOrigin: "50% 100%",
        }}
      >
        <HoloCover candidates={station.cover} title={station.title} />
      </div>

      {/* prev / next arrows floating as hologram controls */}
      <button
        onClick={onPrev}
        className="absolute -left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 border border-white/30 p-1 hover:bg-white/20"
        title="Previous"
      >
        <ChevronLeft />
      </button>
      <button
        onClick={onNext}
        className="absolute -right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 border border-white/30 p-1 hover:bg-white/20"
        title="Next"
      >
        <ChevronRight />
      </button>
    </div>
  );
}

function HoloCover({ candidates, title }) {
  const [i, setI] = useState(0);
  const src = candidates?.[i];
  if (!src) return null;
  return (
    <AnimatePresence mode="wait">
      <motion.img
        key={src}
        src={src}
        alt={title}
        className="h-full w-full object-cover"
        initial={{ opacity: 0, filter: "blur(6px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, filter: "blur(6px)" }}
        onError={() => setI((i + 1) % (candidates?.length || 1))}
        transition={{ duration: 0.35 }}
      />
    </AnimatePresence>
  );
}

function IconPill({ href, glow, children }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      className="rounded-full border px-2 py-1 flex items-center justify-center"
      style={{
        borderColor: "rgba(255,255,255,0.18)",
        background: "rgba(255,255,255,0.08)",
        boxShadow: `0 0 18px ${glow}88, inset 0 0 14px ${glow}33`,
      }}
      aria-label="music-link"
    >
      <div className="h-4 w-4">{children}</div>
    </a>
  );
}

function ProgressRow({ progress, duration, seek }) {
  const fmt = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
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

/* =============== RIGHT PANEL (3D) =============== */

function JoinAliens3D({ rect }) {
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
      setEmail(""); setPhone("");
    } catch (err) {
      setStatus("err"); setMsg(String(err?.message || err || "Something went wrong"));
    }
  }

  return (
    <div
      className="absolute"
      style={{
        right: rect.right, top: rect.top, width: rect.width, minWidth: rect.minWidth,
        transform: rect.transform, transformOrigin: "50% 50%",
      }}
    >
      <div
        className="rounded-2xl border p-3 md:p-4"
        style={{
          borderColor: "rgba(255,255,255,0.15)",
          background: "rgba(10,15,20,0.45)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 40px rgba(252,84,175,.25), inset 0 0 36px rgba(56,182,255,.18)",
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
            <div className={`text-xs mt-1 ${status === "err" ? "text-red-300" : "text-green-300"}`}>
              {msg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

/* =============== Background space =============== */

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
      {theme.fx === "lightning" && <LightningFX color={theme.glow} />}
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
          bottom: "11%", left: 0, right: 0, height: "14%",
          background:
            "repeating-linear-gradient(to right, rgba(255,255,255,0.08), rgba(255,255,255,0.08) 10px, transparent 10px, transparent 20px)",
          opacity: 0.5, filter: "blur(1px)", animation: "waveMove 6s linear infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "6%", left: 0, right: 0, height: "10%",
          background:
            "repeating-linear-gradient(to right, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 12px, transparent 12px, transparent 24px)",
          opacity: 0.4, filter: "blur(1px)", animation: "waveMove 8s linear infinite reverse",
        }}
      />
    </div>
  );
}
function LightningFX({ color }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <style>{`@keyframes flash{0%,97%,100%{opacity:0} 98%{opacity:.6} 99%{opacity:.2}}`}</style>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 40% 30%, ${color}33, transparent 40%)`, animation: "flash 4s infinite" }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 70% 60%, ${color}22, transparent 45%)`, animation: "flash 7s 1.5s infinite" }} />
    </div>
  );
}

/* =============== Inline SVG icons (no external assets) =============== */

function SVGInstagram() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" opacity=".9" />
      <circle cx="12" cy="12" r="4.5" stroke="white" opacity=".9" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
    </svg>
  );
}
function SVGTikTok() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
      <path d="M14 3v6.2a4.8 4.8 0 1 1-3.9-1.9V9a2.9 2.9 0 1 0 2.9 2.9V3h1z" />
      <path d="M15 3.5c.8 2.1 2.4 3.6 4.5 4v2c-1.9-.2-3.5-1-4.5-2.1V3.5z" />
    </svg>
  );
}
function SVGYouTube() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
      <path d="M23 12s0-3.4-.4-4.9c-.2-.8-.8-1.5-1.6-1.7C19 5 12 5 12 5s-7 0-9 .4c-.8.2-1.4.9-1.6 1.7C1 8.6 1 12 1 12s0 3.4.4 4.9c.2.8.8 1.5 1.6 1.7C5 19 12 19 12 19s7 0 9-.4c.8-.2 1.4-.9 1.6-1.7.4-1.5.4-4.9.4-4.9z" />
      <path d="M10 15l5-3-5-3v6z" fill="black" />
    </svg>
  );
}
function SVGSpotify() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="#1DB954">
      <path d="M12 1.7a10.3 10.3 0 1 0 0 20.6 10.3 10.3 0 0 0 0-20.6zm4.7 14.9a.8.8 0 0 1-1.1.3c-3-1.8-6.7-2.2-11-1.3-.5.1-.9-.2-1-.7s.2-.9.7-1c4.6-1 8.7-.6 12.1 1.5.4.2.5.7.3 1.2zm1.5-3.1a.9.9 0 0 1-1.2.3c-3.5-2-8.8-2.6-12.9-1.5-.5.1-1-.2-1.1-.7s.2-1 .7-1.1c4.6-1.2 10.4-.5 14.4 1.8.4.2.6.8.3 1.2zm.1-3.2c-4-2.3-10.6-2.5-14.4-1.4a.9.9 0 1 1-.5-1.8c4.3-1.3 11.6-1 16.2 1.7.4.3.6.9.3 1.4-.2.3-.9.4-1.6 0z"/>
    </svg>
  );
}
function SVGAudioApple() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
      <path d="M16.4 13.3c0-2.3 1.8-3.4 1.8-3.4-1-.1-2 .6-2.7.6-.7 0-1.7-.6-2.8-.6-1.4 0-2.7.8-3.4 2-.6 1-1 2.6-.4 4.2.6 1.7 2 3.6 3.7 3.6 1.5 0 2-.9 3.1-.9 1 0 1.5.9 3.1.9 1.3 0 2.1-1.7 2.6-2.6-2.4-1.1-2.9-3.1-2.9-3.8z" />
      <path d="M14.9 6.1c.6-.8 1-1.9.9-3.1-1 .1-2.1.6-2.7 1.4-.6.7-1 1.8-.9 3 1.1.1 2.1-.5 2.7-1.3z" />
    </svg>
  );
}
