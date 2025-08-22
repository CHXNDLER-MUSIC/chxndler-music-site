// app/page.jsx
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CHXNDLER • Starship POV + Touch + Gyro + Global Audio
 * - Desktop: W/↑ thrust • A/← & D/→ turn • S/↓ brake • E/Enter dock
 * - Mobile: on-screen controls (left: turn, right: thrust/brake/dock)
 * - Gyro steering: optional tilt control
 * - Audio: single global <audio> element plays your MP3s from /public/tracks (no Spotify login)
 * - Now Playing HUD: title, play/pause, progress + seek
 * - “Enable Sound” button arms autoplay after one tap (mobile-friendly)
 */

// ---------- CONFIG ----------
const BRAND = { yellow: "#F2EF1D", pink: "#FC54AF", blue: "#38B6FF" };

// ✅ Replace with your Formspree ID (looks like "abcdwxyz")
const FORMSPREE_ID = "YOUR_FORMSPREE_ID";

// STREAMING + SOCIAL (neon Links Dock)
const LISTEN = [
  { name: "Spotify", href: "https://open.spotify.com/artist/6O2eoUA8ZWY0lwjsa3E3Yo?si=Qfg-xrMVSEu6wTvuJqs9eQ", color: BRAND.blue, icon: IconSpotify },
  { name: "Apple Music", href: "https://music.apple.com/us/artist/chxndler/1660901437", color: BRAND.blue, icon: IconAppleMusic },
];
const FOLLOW = [
  { name: "Instagram", href: "https://www.instagram.com/chxndler_music/", color: BRAND.pink, icon: IconInstagram },
  { name: "TikTok",    href: "https://www.tiktok.com/@chxndler_music",    color: BRAND.pink, icon: IconTikTok },
  { name: "YouTube",   href: "https://www.youtube.com/@chxndler_music",   color: BRAND.pink, icon: IconYouTube },
  { name: "Facebook",  href: "https://www.facebook.com/CHXNDLEROfficial", color: BRAND.pink, icon: IconFacebook },
];

// PLANETS = SONGS
// ✅ Put full MP3s in /public/tracks/ with these filenames:
const PLANETS = [
  P({ title: "GAME BOY HEART (ゲームボーイの心)", id: "5VypE0QkaggJemaNG6sMsF", type: "track", color: BRAND.blue,   x: 450,  y: -900, r: 70, audio: "/tracks/game-boy-heart.mp3" }),
  P({ title: "KID FOREVER (永遠の子供)",          id: "5X27jqHBvMBsDvvFixeZdN", type: "track", color: BRAND.pink,   x: -1100, y: -600, r: 65, audio: "/tracks/kid-forever.mp3" }),
  P({ title: "BRAIN FREEZE",                      id: "5ou8AyA71rLFK6Ysxr2CpT", type: "track", color: BRAND.yellow, x: 1200, y: 200,  r: 75, audio: "/tracks/brain-freeze.mp3" }),
  P({ title: "WE’RE JUST FRIENDS (mickey jas Remix)", id: "28wYsy2LrfVUT5glavy7hJ", type: "track", color: "#c084fc", x: -900, y: 900, r: 70, audio: "/tracks/were-just-friends-mickey-jas-remix.mp3" }),
  P({ title: "BE MY BEE",                         id: "12iLygYksfcZ3nv6NkrnEr", type: "track", color: "#60a5fa", x: 200,  y: 1500, r: 60, audio: "/tracks/be-my-bee.mp3" }),
  P({ title: "WE’RE JUST FRIENDS",                id: "2IffMAupdw2alpsISKFs8y", type: "track", color: "#f59e0b", x: 1900, y: -200, r: 70, audio: "/tracks/were-just-friends.mp3" }),
  P({ title: "PARIS",                             id: "2luPTqZK9w5fJ30T4rLZut", type: "track", color: "#34d399", x: -1900, y: 300,  r: 65, audio: "/tracks/paris.mp3" }),
  P({ title: "POKÉMON",                           id: "7uzO8MyTy8402703kP2Xuk", type: "track", color: "#ef4444", x: 100,  y: -1800, r: 60, audio: "/tracks/pokemon.mp3" }),
  P({ title: "ALIEN (House Party)",               id: "0b5y0gHMf3wLYX69B8S6g4", type: "track", color: "#22d3ee", x: -1700, y: -1400, r: 65, audio: "/tracks/alien-house-party.mp3" }),
  P({ title: "WE’RE JUST FRIENDS (DMVRCO Remix)", id: "1WfJUtDFUiz0rUdlGfLQBA", type: "track", color: "#f472b6", x: 1700, y: 1400, r: 60, audio: "/tracks/were-just-friends-dmvrco-remix.mp3" }),
  P({ title: "BABY",                              id: "3UEVjChARWDbY4ruOIbIl3", type: "track", color: "#a3e635", x: -300, y: 600,  r: 55, audio: "/tracks/baby.mp3" }),
  P({ title: "OCEAN GIRL",                        id: "37niwECG0TJMuYFQdrJE3y", type: "album", color: "#6060ff", x: 0,    y: 0,    r: 82, audio: "/tracks/ocean-girl.mp3" }),
];

// ---------- PAGE ----------
export default function Page() {
  const canvasRef = useRef(null);

  // HUD/UI
  const [hudTint, setHudTint] = useState("#ffffff");
  const [dock, setDock] = useState(null);         // { planet }
  const [showLinks, setShowLinks] = useState(false);
  const [showJoin, setShowJoin]   = useState(false);

  // Audio
  const audioRef = useRef(null);                  // single global player
  const [soundEnabled, setSoundEnabled] = useState(false);
  const autoPlayArmed = useRef(false);
  const [np, setNp] = useState({                  // Now Playing state
    title: "", color: "#ffffff", current: 0, duration: 0, playing: false,
  });

  // Movement
  const keys = useRef({});
  const ship = useRef({
    x: -2200, y: -300, a: 0, vx: 0, vy: 0,
    thrust: 0.13, turn: 0.046, friction: 0.985, maxSpeed: 5.8,
  });

  // Gyro steering
  const [gyroOn, setGyroOn] = useState(false);
  const gyro = useRef({ enabled: false, gamma: 0, filt: 0, handler: null });

  // HD space (parallax stars + nebula)
  const WORLD = 8000;
  const starLayers = useRef({ back: [], mid: [], fore: [], clouds: [] });

  // ----- INPUT: Keyboard
  useEffect(() => {
    const down = (e) => (keys.current[e.key.toLowerCase()] = true);
    const up   = (e) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // ----- INIT stars + nebulae
  useEffect(() => {
    const mkStars = (n, spread) =>
      Array.from({ length: n }, () => ({ x: R(-spread, spread), y: R(-spread, spread), r: R(0.6, 1.8), o: R(0.25, 0.9) }));
    const mkClouds = (n, spread) =>
      Array.from({ length: n }, () => ({
        x: R(-spread, spread), y: R(-spread, spread),
        r: R(280, 840),
        color: pick([ addA(BRAND.blue, R(0.08, 0.18)), addA(BRAND.pink, R(0.08, 0.18)), "rgba(255,255,255,0.06)" ]),
      }));
    starLayers.current = {
      back:   mkStars(600, WORLD * 1.6),
      mid:    mkStars(360, WORLD * 1.2),
      fore:   mkStars(220, WORLD * 0.9),
      clouds: mkClouds(140, WORLD * 1.4),
    };
  }, []);

  // ----- AUDIO: attach listeners to global <audio>
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onLoaded = () => {
      setNp((p) => ({ ...p, duration: el.duration || 0 }));
      if (autoPlayArmed.current && soundEnabled) {
        el.play().catch(() => {});
      }
      autoPlayArmed.current = false;
    };
    const onTime = () => setNp((p) => ({ ...p, current: el.currentTime || 0 }));
    const onPlay = () => setNp((p) => ({ ...p, playing: true }));
    const onPause = () => setNp((p) => ({ ...p, playing: false }));
    const onEnd = () => setNp((p) => ({ ...p, playing: false, current: 0 }));

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnd);
    };
  }, [soundEnabled]);

  // ----- MAIN LOOP
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w=0, h=0, dpr=1, raf;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener("resize", resize);

    const loop = () => {
      const s = ship.current, K = keys.current;
      const forward = K["w"] || K["arrowup"];
      const left    = K["a"] || K["arrowleft"];
      const right   = K["d"] || K["arrowright"];
      const back    = K["s"] || K["arrowdown"];
      const engage  = K["e"] || K["enter"];

      if (!dock) {
        // keys turn
        if (left)  s.a -= s.turn;
        if (right) s.a += s.turn;

        // gyro turn (smoothed)
        if (gyro.current.enabled) {
          const target = clamp(gyro.current.gamma / 45, -1, 1); // -1..1
          gyro.current.filt = gyro.current.filt * 0.85 + target * 0.15;
          s.a += gyro.current.filt * s.turn * 0.9;
        }

        // thrust/brake
        const ax = Math.cos(s.a) * s.thrust, ay = Math.sin(s.a) * s.thrust;
        if (forward) { s.vx += ax; s.vy += ay; }
        if (back)    { s.vx -= ax * 0.6; s.vy -= ay * 0.6; }
        const sp = Math.hypot(s.vx, s.vy);
        if (sp > s.maxSpeed) { s.vx = (s.vx / sp) * s.maxSpeed; s.vy = (s.vy / sp) * s.maxSpeed; }
        s.vx *= s.friction; s.vy *= s.friction; s.x += s.vx; s.y += s.vy;
      }

      // BACKDROP
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#05030c"); g.addColorStop(0.5, "#0b0719"); g.addColorStop(1, "#120a1f");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

      // Nebula clouds
      ctx.globalCompositeOperation = "lighter";
      drawClouds(ctx, starLayers.current.clouds, s, w, h, 0.18);
      ctx.globalCompositeOperation = "source-over";

      // Stars
      drawStars(ctx, starLayers.current.back, s, w, h, 0.22, "rgba(255,255,255,0.45)");
      drawStars(ctx, starLayers.current.mid,  s, w, h, 0.45, "rgba(255,255,255,0.75)");
      drawStars(ctx, starLayers.current.fore, s, w, h, 0.82, "rgba(255,255,255,1.0)");

      // PLANETS
      let nearest=null, minD=Infinity;
      for (const p of PLANETS) {
        const sx = w/2 + (p.x - s.x);
        const sy = h/2 + (p.y - s.y);

        // Glow halo
        const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.r * 2.4);
        halo.addColorStop(0, addA(p.color, 0.9)); halo.addColorStop(1, addA(p.color, 0.04));
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(sx, sy, p.r * 2.4, 0, Math.PI * 2); ctx.fill();

        // Body + rim
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, p.r + 1, 0, Math.PI * 2); ctx.stroke();

        // label
        const d = Math.hypot(p.x - s.x, p.y - s.y);
        const alpha = clamp(1 - d / 1200, 0, 1);
        if (alpha > 0) {
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.font = "14px system-ui, Segoe UI, Inter, Arial"; ctx.textAlign = "center";
          ctx.fillText(p.title, sx, sy - p.r - 10);
        }
        if (d < minD) { minD = d; nearest = p; }
      }

      // Dock logic
      if (nearest) {
        const d = Math.hypot(nearest.x - ship.current.x, nearest.y - ship.current.y);
        setHudTint(nearest.color);
        const canDock = d < nearest.r + 120;
        if (canDock && engage) {
          setDock({ planet: nearest });
          if (nearest.audio) {
            // set global audio source; arm autoplay if sound enabled
            const el = audioRef.current;
            if (el) {
              if (el.src !== originJoin(nearest.audio)) {
                el.src = nearest.audio; el.load();
              }
              setNp((p) => ({ ...p, title: nearest.title, color: nearest.color }));
              autoPlayArmed.current = soundEnabled; // will play on loadedmetadata
            }
          }
        }
      }
      if (dock && engage) setDock(null);

      // Reticle
      drawReticle(ctx, w, h, hudTint, ship.current.a);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [dock, hudTint, soundEnabled]);

  // ----- GYRO TOGGLE
  const toggleGyro = async () => {
    const enable = !gyroOn;
    if (!enable) {
      if (gyro.current.handler) window.removeEventListener("deviceorientation", gyro.current.handler);
      gyro.current.enabled = false; setGyroOn(false);
      return;
    }
    try {
      if (typeof window !== "undefined" && typeof DeviceOrientationEvent !== "undefined") {
        if (typeof DeviceOrientationEvent.requestPermission === "function") {
          const perm = await DeviceOrientationEvent.requestPermission();
          if (perm !== "granted") return;
        }
        gyro.current.handler = (e) => {
          // gamma ~ left-right tilt (-90..90)
          gyro.current.gamma = (e.gamma ?? 0);
        };
        window.addEventListener("deviceorientation", gyro.current.handler, true);
        gyro.current.enabled = true; setGyroOn(true);
      }
    } catch {
      // ignore
    }
  };

  // ----- SOUND ENABLE
  const enableSound = async () => {
    setSoundEnabled(true);
    const el = audioRef.current;
    if (el && el.src) {
      try { await el.play(); } catch { /* user can press play */ }
    }
  };

  const active = dock?.planet ?? null;

  return (
    <div className="fixed inset-0" onContextMenu={(e)=>e.preventDefault()}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* global hidden audio element */}
      <audio ref={audioRef} preload="metadata" className="hidden" />

      {/* HUD */}
      <CockpitHud tint={hudTint} docked={!!active} />

      {/* Top-left: Links + Enable Sound */}
      <div className="absolute left-4 top-4 z-20 flex gap-2">
        <button
          onClick={() => setShowLinks((v) => !v)}
          className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white shadow hover:bg-white/10"
        >
          Links
        </button>
        {!soundEnabled && (
          <button
            onClick={enableSound}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white shadow hover:bg-white/20"
            style={{ boxShadow: `0 10px 28px -14px ${addA(BRAND.yellow,0.8)}` }}
          >
            🔊 Enable Sound
          </button>
        )}
        <button
          onClick={toggleGyro}
          className={`rounded-full border px-4 py-2 text-sm shadow ${gyroOn ? "bg-white/20" : "bg-white/5"} text-white hover:bg-white/10`}
          style={{ borderColor: "rgba(255,255,255,0.2)" }}
        >
          {gyroOn ? "Gyro: ON" : "Gyro: OFF"}
        </button>
      </div>

      {/* Links Dock */}
      {showLinks && <LinksDock onClose={() => setShowLinks(false)} />}

      {/* Join the Aliens */}
      <button
        onClick={() => setShowJoin(true)}
        className="absolute bottom-6 right-6 z-20 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white shadow-lg hover:bg-white/10"
        style={{ boxShadow: `0 12px 30px -12px ${addA(hudTint, 0.7)}` }}
      >
        JOIN THE ALIENS
      </button>
      {showJoin && <JoinAliensModal onClose={() => setShowJoin(false)} formspreeId={FORMSPREE_ID} />}

      {/* Dock Panel (custom controls for the global audio) */}
      {active && <DockPanel planet={active} onClose={() => setDock(null)} audioRef={audioRef} soundEnabled={soundEnabled} />}

      {/* Touch controls */}
      <TouchControls keysRef={keys} />

      {/* Now Playing HUD (sticky, follows during flight) */}
      {np.title && (
        <NowPlaying
          np={np}
          onToggle={() => {
            const el = audioRef.current; if (!el) return;
            if (el.paused) el.play().catch(()=>{}); else el.pause();
          }}
          onSeek={(ratio) => {
            const el = audioRef.current; if (!el || !isFinite(el.duration)) return;
            el.currentTime = clamp(ratio, 0, 1) * el.duration;
          }}
        />
      )}

      {!active && <HelpOverlay />}
    </div>
  );
}

/* ----------------------- UI COMPONENTS ----------------------- */

function LinksDock({ onClose }) {
  return (
    <div className="absolute left-4 top-16 z-20 w-[92vw] max-w-3xl">
      <div className="rounded-2xl border border-white/15 bg-black/50 p-5 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm uppercase tracking-widest text-white/60">Dock • Links</div>
          <button onClick={onClose} className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10">Close</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm uppercase tracking-widest text-white/60">Listen</h3>
            <div className="flex flex-wrap gap-3">
              {LISTEN.map((s) => (
                <NeonButton key={s.name} href={s.href} label={s.name} Icon={s.icon} color={s.color} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm uppercase tracking-widest text-white/60">Follow</h3>
            <div className="flex flex-wrap gap-3">
              {FOLLOW.map((s) => (
                <NeonButton key={s.name} href={s.href} label={s.name} Icon={s.icon} color={s.color} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NeonButton({ href, label, Icon, color }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
      style={{
        border: `1px solid rgba(255,255,255,0.2)`,
        background: "rgba(255,255,255,0.06)",
        boxShadow: `inset 0 0 0 1px ${addA(color, 0.4)}, 0 14px 40px -16px ${addA(color, 0.8)}`,
      }}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center" style={{ color }} aria-hidden="true">
        <Icon/>
      </span>
      <span>{label}</span>
      <span className="ml-1 opacity-70 transition group-hover:opacity-100" style={{ color: BRAND.yellow }} aria-hidden="true">↗</span>
      <span className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-0 blur-xl transition group-hover:opacity-40" style={{ background: BRAND.yellow + "33" }} aria-hidden="true"/>
    </a>
  );
}

function CockpitHud({ tint = "#fff", docked }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute left-0 right-0 top-0 h-20 md:h-24"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(0,0,0,0.0))",
                 boxShadow: `0 20px 60px -30px ${addA(tint, 0.8)}`, borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 h-24 md:h-28"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.0))",
                 boxShadow: `0 -20px 60px -30px ${addA(tint, 0.8)}`, borderTop: "1px solid rgba(255,255,255,0.08)" }}
      />
      <div
        className="absolute right-4 top-4 rounded-full px-3 py-1 text-xs md:text-sm"
        style={{ background: addA(tint, 0.15), border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
      >
        {docked ? "Docked" : "Cruise"}
      </div>
    </div>
  );
}

function DockPanel({ planet, onClose, audioRef, soundEnabled }) {
  const tint = planet.color;

  const play = async () => {
    const el = audioRef.current; if (!el) return;
    if (el.src !== originJoin(planet.audio)) {
      el.src = planet.audio; el.load();
    }
    try { if (soundEnabled) await el.play(); } catch {}
  };

  return (
    <div className="absolute left-1/2 bottom-6 z-20 w-[92vw] max-w-3xl -translate-x-1/2">
      <div
        className="rounded-2xl border p-4 md:p-5 backdrop-blur"
        style={{
          background: "rgba(0,0,0,0.55)",
          borderColor: "rgba(255,255,255,0.15)",
          boxShadow: `0 20px 60px -24px ${addA(tint, 0.8)}, inset 0 0 0 1px ${addA(tint, 0.35)}`,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg md:text-xl font-semibold text-white">{planet.title}</div>
          <button onClick={onClose} className="pointer-events-auto rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10">Undock</button>
</div>

        {planet.audio ? (
          <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="flex items-center gap-3">
              <button
                onClick={play}
                className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
              >
                ▶ Play on site
              </button>
              {!soundEnabled && <span className="text-xs text-white/60">Tap “Enable Sound” (top-left) to autoplay</span>}
            </div>
            <div className="mt-2 text-xs text-white/60">Plays full track via site audio • No login required</div>
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
            {/* Fallback embed if no local MP3 present */}
            <iframe
              title={planet.title}
              src={planet.type === "album"
                ? `https://open.spotify.com/embed/album/${planet.id}`
                : `https://open.spotify.com/embed/track/${planet.id}`
              }
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
              loading="lazy"
              style={{ background: "rgba(0,0,0,0.2)" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TouchControls({ keysRef }) {
  const bind = (key) => ({
    onPointerDown: (e) => { e.preventDefault(); keysRef.current[key] = true; },
    onPointerUp:   (e) => { e.preventDefault(); keysRef.current[key] = false; },
    onPointerLeave:(e) => { keysRef.current[key] = false; },
  });

  return (
    <>
      {/* Left pad: Turn */}
      <div className="fixed bottom-5 left-4 z-20 grid grid-cols-2 gap-2">
        <button
          {...bind("arrowleft")}
          className="select-none rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-white backdrop-blur active:scale-95"
          style={{ boxShadow: `inset 0 0 0 1px ${addA("#FC54AF",0.5)}, 0 10px 28px -14px ${addA("#FC54AF",0.8)}` }}
        >
          ◀ Turn
        </button>
        <button
          {...bind("arrowright")}
          className="select-none rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-white backdrop-blur active:scale-95"
          style={{ boxShadow: `inset 0 0 0 1px ${addA("#FC54AF",0.5)}, 0 10px 28px -14px ${addA("#FC54AF",0.8)}` }}
        >
          Turn ▶
        </button>
      </div>

      {/* Right pad: Thrust / Brake / Dock */}
      <div className="fixed bottom-5 right-4 z-20 grid grid-cols-1 gap-2">
        <button
          {...bind("arrowup")}
          className="select-none rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-white backdrop-blur active:scale-95"
          style={{ boxShadow: `inset 0 0 0 1px ${addA("#38B6FF",0.5)}, 0 10px 28px -14px ${addA("#38B6FF",0.8)}` }}
        >
          ↑ Thrust
        </button>
        <button
          {...bind("arrowdown")}
          className="select-none rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-white backdrop-blur active:scale-95"
          style={{ boxShadow: `inset 0 0 0 1px ${addA("#38B6FF",0.5)}, 0 10px 28px -14px ${addA("#38B6FF",0.8)}` }}
        >
          ↓ Brake
        </button>
        <button
          {...bind("e")}
          className="select-none rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-white backdrop-blur active:scale-95"
          style={{ boxShadow: `inset 0 0 0 1px ${addA("#F2EF1D",0.5)}, 0 10px 28px -14px ${addA("#F2EF1D",0.8)}` }}
        >
          ⛓ Dock / Undock
        </button>
      </div>
    </>
  );
}

function NowPlaying({ np, onToggle, onSeek }) {
  const pct = np.duration > 0 ? (np.current / np.duration) : 0;
  return (
    <div className="absolute left-1/2 bottom-28 z-20 w-[92vw] max-w-xl -translate-x-1/2 select-none">
      <div className="rounded-2xl border border-white/15 bg-black/60 p-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{np.title}</div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-white/60">
              <span>{fmt(np.current)}</span>
              <div
                className="relative h-1 w-full max-w-[320px] cursor-pointer overflow-hidden rounded"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  onSeek(ratio);
                }}
              >
                <div className="absolute inset-0 bg-white/10" />
                <div className="absolute inset-y-0 left-0 bg-white/80" style={{ width: `${pct * 100}%` }} />
              </div>
              <span>{fmt(np.duration)}</span>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            {np.playing ? "Pause" : "Play"}
          </button>
        </div>
      </div>
    </div>
  );
}

function JoinAliensModal({ onClose, formspreeId }) {
  const [status, setStatus] = useState("idle"); // idle | sending | ok | error
  async function submit(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      const data = new FormData(e.currentTarget);
      const res = await fetch(`https://formspree.io/f/${formspreeId}`, { method: "POST", body: data, headers: { Accept: "application/json" } });
      if (res.ok) setStatus("ok"); else setStatus("error");
    } catch { setStatus("error"); }
  }
  const disabled = !formspreeId || formspreeId === "YOUR_FORMSPREE_ID";

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-black/70 p-5 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Join the Aliens</h3>
          <button onClick={onClose} className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">Close</button>
        </div>
        {status === "ok" ? (
          <div className="text-green-300">You’re in! Watch your inbox 📡</div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-white/80">Email *</label>
              <input required name="email" type="email" placeholder="you@example.com"
                className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/40" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/80">Phone (optional)</label>
              <input name="phone" type="tel" placeholder="+1 (555) 123-4567"
                className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/40" />
            </div>
            <input type="hidden" name="tag" value="join-aliens" />
            <button
              type="submit"
              disabled={disabled || status === "sending"}
              className="w-full rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {disabled ? "Add your Formspree ID in code" : status === "sending" ? "Sending..." : "Join"}
            </button>
            {status === "error" && <div className="text-red-300 text-sm">Couldn’t submit. Try again.</div>}
          </form>
        )}
        <div className="mt-3 text-[11px] text-white/50">We’ll only use this to send CHXNDLER transmissions. Opt-out anytime.</div>
      </div>
    </div>
  );
}

function HelpOverlay() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-center text-xs text-white/80 md:text-sm">
      <div>W/↑ = Thrust • A/← & D/→ = Turn • S/↓ = Brake</div>
      <div className="mt-1">Dock: Press <span className="text-white">E</span> or <span className="text-white">Enter</span> (or use on-screen controls)</div>
    </div>
  );
}

/* ----------------------- DRAW HELPERS ----------------------- */

function drawReticle(ctx, w, h, tint, angle) {
  ctx.strokeStyle = addA(tint, 0.85); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(w/2, h/2, 14, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w/2 - 22, h/2); ctx.lineTo(w/2 + 22, h/2);
  ctx.moveTo(w/2, h/2 - 22); ctx.lineTo(w/2, h/2 + 22); ctx.stroke();
  const nose = { x: w/2 + Math.cos(angle) * 32, y: h/2 + Math.sin(angle) * 32 };
  ctx.fillStyle = addA(tint, 0.95); ctx.beginPath(); ctx.arc(nose.x, nose.y, 3, 0, Math.PI*2); ctx.fill();
}

function drawStars(ctx, arr, ship, w, h, parallax, color) {
  ctx.fillStyle = color;
  for (const s of arr) {
    const sx = w/2 + (s.x - ship.x) * parallax;
    const sy = h/2 + (s.y - ship.y) * parallax;
    let x = ((sx % (w + 300)) + (w + 300)) % (w + 300) - 150;
    let y = ((sy % (h + 300)) + (h + 300)) % (h + 300) - 150;
    ctx.globalAlpha = s.o; ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawClouds(ctx, arr, ship, w, h, parallax) {
  for (const c of arr) {
    const sx = w/2 + (c.x - ship.x) * parallax;
    const sy = h/2 + (c.y - ship.y) * parallax;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, c.r);
    g.addColorStop(0, c.color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, c.r, 0, Math.PI*2); ctx.fill();
  }
}

/* ----------------------- UTIL ----------------------- */

function P({ title, id, type, color, x, y, r, audio }) { return { title, id, type, color, x, y, r, audio }; }
function R(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function addA(hex, a = 1) {
  const h = hex.replace("#", ""); const r = parseInt(h.slice(0,2),16); const g = parseInt(h.slice(2,4),16); const b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}
function pick(arr){ return arr[(Math.random()*arr.length)|0]; }
function fmt(s){ if(!isFinite(s)) return "0:00"; const m = Math.floor(s/60); const ss = Math.floor(s%60); return `${m}:${ss<10?"0":""}${ss}`; }
function originJoin(path){ try { return new URL(path, window.location.origin).href; } catch { return path; } }

/* ----------------------- ICONS ----------------------- */

function IconSpotify() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="10" opacity="0.15" />
      <path d="M6 9.5c4-1 8-.8 11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M6.5 12c3.4-.7 6.7-.4 9.5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M7 14.3c2.5-.4 5-.2 7 .8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}
function IconAppleMusic() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M15 4v9.2a3.2 3.2 0 1 1-1.5-2.7V7.5l-5 1.2v6.5a3.2 3.2 0 1 1-1.5-2.7V6.6L15 4z" />
    </svg>
  );
}
function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M14 4v9.2a3.6 3.6 0 1 1-2-3.2V7.2c2 .8 3.8 1.2 6 1.2V11c-2.2 0-4-.5-6-1.3V4z" />
    </svg>
  );
}
function IconYouTube() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <rect x="3" y="7" width="18" height="10" rx="3" opacity="0.2" />
      <path d="M10 9.5v5l5-2.5-5-2.5z" />
    </svg>
  );
}
function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M13 8h2V6h-2c-1.7 0-3 1.3-3 3v2H8v2h2v5h2v-5h2l.5-2H12V9c0-.6.4-1 1-1z" fill="currentColor" stroke="none" />
    </svg>
  );
}
