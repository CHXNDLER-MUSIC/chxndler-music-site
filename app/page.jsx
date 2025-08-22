// app/page.jsx
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CHXNDLER • Starship POV
 * - Arrow keys or WASD to fly (Up/W = thrust, Left/Right = turn, Down/S = brake)
 * - E (or Enter) to Dock/Undock when near a planet
 * - Each planet = a song; docking opens Spotify embed + tints the UI
 *
 * No external libs. Pure Canvas + DOM overlay.
 */

export default function Page() {
  // Brand
  const BRAND = { yellow: "#F2EF1D", pink: "#FC54AF", blue: "#38B6FF" };

  // Song planets (fixed coords in a 6000×6000 world)
  const PLANETS = [
    P({ title: "GAME BOY HEART (ゲームボーイの心)", id: "5VypE0QkaggJemaNG6sMsF", type: "track", color: BRAND.blue,   x: 450,  y: -900, r: 70 }),
    P({ title: "KID FOREVER (永遠の子供)",          id: "5X27jqHBvMBsDvvFixeZdN", type: "track", color: BRAND.pink,   x: -1100, y: -600, r: 65 }),
    P({ title: "BRAIN FREEZE",                      id: "5ou8AyA71rLFK6Ysxr2CpT", type: "track", color: BRAND.yellow, x: 1200, y: 200,  r: 75 }),
    P({ title: "WE’RE JUST FRIENDS (mickey jas Remix)", id: "28wYsy2LrfVUT5glavy7hJ", type: "track", color: "#c084fc", x: -900, y: 900, r: 70 }),
    P({ title: "BE MY BEE",                         id: "12iLygYksfcZ3nv6NkrnEr", type: "track", color: "#60a5fa", x: 200,  y: 1500, r: 60 }),
    P({ title: "WE’RE JUST FRIENDS",                id: "2IffMAupdw2alpsISKFs8y", type: "track", color: "#f59e0b", x: 1900, y: -200, r: 70 }),
    P({ title: "PARIS",                             id: "2luPTqZK9w5fJ30T4rLZut", type: "track", color: "#34d399", x: -1900, y: 300,  r: 65 }),
    P({ title: "POKÉMON",                           id: "7uzO8MyTy8402703kP2Xuk", type: "track", color: "#ef4444", x: 100,  y: -1800, r: 60 }),
    P({ title: "ALIEN (House Party)",               id: "0b5y0gHMf3wLYX69B8S6g4", type: "track", color: "#22d3ee", x: -1700, y: -1400, r: 65 }),
    P({ title: "WE’RE JUST FRIENDS (DMVRCO Remix)", id: "1WfJUtDFUiz0rUdlGfLQBA", type: "track", color: "#f472b6", x: 1700, y: 1400, r: 60 }),
    P({ title: "BABY",                              id: "3UEVjChARWDbY4ruOIbIl3", type: "track", color: "#a3e635", x: -300, y: 600,  r: 55 }),
    P({ title: "OCEAN GIRL",                        id: "37niwECG0TJMuYFQdrJE3y", type: "album", color: "#60f",     x: 0,    y: 0,    r: 80 }),
  ];

  // Canvas + sim state
  const canvasRef = useRef(null);
  const [hudTint, setHudTint] = useState("#ffffff");
  const [dock, setDock] = useState(null); // { planet }
  const keys = useRef({});
  const ship = useRef({
    x: -2200, y: -300, // start far away so you fly to planets
    a: 0,              // angle (radians)
    vx: 0, vy: 0,
    thrust: 0.12,
    turn: 0.045,
    friction: 0.985,
    maxSpeed: 5.5,
  });

  // Parallax star layers
  const starsRef = useRef({ back: [], mid: [], fore: [] });
  const WORLD = 6000;

  // Keyboard input
  useEffect(() => {
    const down = (e) => (keys.current[e.key.toLowerCase()] = true);
    const up =   (e) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Init stars once
  useEffect(() => {
    const mk = (n, spread = WORLD) => Array.from({ length: n }, () => ({
      x: rand(-spread, spread),
      y: rand(-spread, spread),
      r: rand(0.6, 1.8),
      o: rand(0.25, 0.9)
    }));
    starsRef.current = {
      back: mk(400, WORLD * 1.6),
      mid:  mk(260, WORLD * 1.2),
      fore: mk(160, WORLD * 0.9),
    };
  }, []);

  // Main draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, raf;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      // Physics
      const s = ship.current;
      const K = keys.current;
      const forward = K["w"] || K["arrowup"];
      const left    = K["a"] || K["arrowleft"];
      const right   = K["d"] || K["arrowright"];
      const back    = K["s"] || K["arrowdown"];
      const engage  = K["e"] || K["enter"];

      if (!dock) {
        if (left)  s.a -= s.turn;
        if (right) s.a += s.turn;

        const ax = Math.cos(s.a) * s.thrust;
        const ay = Math.sin(s.a) * s.thrust;
        if (forward) { s.vx += ax; s.vy += ay; }
        if (back)    { s.vx -= ax * 0.6; s.vy -= ay * 0.6; }

        // clamp speed
        const sp = Math.hypot(s.vx, s.vy);
        if (sp > s.maxSpeed) {
          s.vx = (s.vx / sp) * s.maxSpeed;
          s.vy = (s.vy / sp) * s.maxSpeed;
        }

        s.vx *= s.friction;
        s.vy *= s.friction;
        s.x  += s.vx;
        s.y  += s.vy;
      }

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Space gradient backdrop (subtle)
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#0b0719");
      grad.addColorStop(0.5, "#2b0f3a");
      grad.addColorStop(1, "#120a1f");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Parallax stars
      drawStarsLayer(ctx, starsRef.current.back, s, w, h, 0.2, "rgba(255,255,255,0.45)");
      drawStarsLayer(ctx, starsRef.current.mid,  s, w, h, 0.45, "rgba(255,255,255,0.75)");
      drawStarsLayer(ctx, starsRef.current.fore, s, w, h, 0.8,  "rgba(255,255,255,1.0)");

      // Planets
      let nearest = null;
      let minDist = Infinity;
      for (const p of PLANETS) {
        const sx = w / 2 + (p.x - s.x);
        const sy = h / 2 + (p.y - s.y);

        // Glow
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.r * 2.2);
        g.addColorStop(0, addAlpha(p.color, 0.85));
        g.addColorStop(1, addAlpha(p.color, 0.05));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, p.r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
        ctx.fill();

        // Rim
        ctx.strokeStyle = addAlpha("#ffffff", 0.25);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, p.r + 1, 0, Math.PI * 2);
        ctx.stroke();

        // Name (fade with distance)
        const d = Math.hypot(p.x - s.x, p.y - s.y);
        const alpha = clamp(1 - d / 1200, 0, 1);
        if (alpha > 0) {
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial";
          ctx.textAlign = "center";
          ctx.fillText(p.title, sx, sy - p.r - 10);
        }

        if (d < minDist) { minDist = d; nearest = p; }
      }

      // HUD: nearest planet & docking
      let canDock = false;
      if (nearest) {
        const d = Math.hypot(nearest.x - s.x, nearest.y - s.y);
        canDock = d < nearest.r + 120;
        // tint HUD toward nearest planet color
        setHudTint(nearest.color);
        if (canDock && engage) {
          // toggle dock
          if (!dock) setDock({ planet: nearest });
        }
      }

      // If docked and user hits E/Enter, undock
      if (dock && engage) {
        setDock(null);
      }

      // Cockpit reticle (center)
      ctx.strokeStyle = addAlpha(hudTint, 0.8);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w / 2 - 22, h / 2); ctx.lineTo(w / 2 + 22, h / 2);
      ctx.moveTo(w / 2, h / 2 - 22); ctx.lineTo(w / 2, h / 2 + 22);
      ctx.stroke();

      // Heading indicator
      const nose = {
        x: w / 2 + Math.cos(s.a) * 32,
        y: h / 2 + Math.sin(s.a) * 32,
      };
      ctx.fillStyle = addAlpha(hudTint, 0.9);
      ctx.beginPath();
      ctx.arc(nose.x, nose.y, 3, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [dock]); // redraw loop continues; dock in deps to capture toggle

  // Dock panel (Spotify embed) + HUD overlay
  const active = dock?.planet ?? null;
  return (
    <div className="fixed inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* HUD overlays */}
      <CockpitHud tint={hudTint} docked={!!active} />

      {/* Dock panel */}
      {active && (
        <DockPanel planet={active} onClose={() => setDock(null)} />
      )}

      {/* Minimal help text */}
      {!active && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-white/80 text-xs md:text-sm">
          <div>W/↑ = Thrust • A/← & D/→ = Turn • S/↓ = Brake</div>
          <div className="mt-1">Press <span className="text-white">E</span> or <span className="text-white">Enter</span> to Dock when close</div>
        </div>
      )}
    </div>
  );
}

/* ----------------------- Components ----------------------- */

function CockpitHud({ tint = "#ffffff", docked }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Top instrument bar */}
      <div
        className="absolute left-0 right-0 top-0 h-20 md:h-24"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(0,0,0,0.0))",
          boxShadow: `0 20px 60px -30px ${addAlpha(tint, 0.8)}`,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      />
      {/* Bottom instrument bar */}
      <div
        className="absolute left-0 right-0 bottom-0 h-24 md:h-28"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.0))",
          boxShadow: `0 -20px 60px -30px ${addAlpha(tint, 0.8)}`,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      />

      {/* Status light */}
      <div
        className="absolute right-4 top-4 text-xs md:text-sm rounded-full px-3 py-1"
        style={{
          background: addAlpha(tint, 0.15),
          border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff",
        }}
      >
        {docked ? "Docked" : "Cruise"}
      </div>
    </div>
  );
}

function DockPanel({ planet, onClose }) {
  const tint = planet.color;
  // Spotify embed URL
  const embed =
    planet.type === "album"
      ? `https://open.spotify.com/embed/album/${planet.id}`
      : `https://open.spotify.com/embed/track/${planet.id}`;

  return (
    <div className="absolute left-1/2 bottom-6 w-[92vw] max-w-3xl -translate-x-1/2">
      <div
        className="rounded-2xl border p-4 md:p-5 backdrop-blur"
        style={{
          background: "rgba(0,0,0,0.55)",
          borderColor: "rgba(255,255,255,0.15)",
          boxShadow: `0 20px 60px -24px ${addAlpha(tint, 0.8)}, inset 0 0 0 1px ${addAlpha(
            tint,
            0.35
          )}`,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg md:text-xl font-semibold text-white">
            {planet.title}
          </div>
          <button
            onClick={onClose}
            className="pointer-events-auto rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
          >
            Undock
          </button>
        </div>

        <div className="mt-3 rounded-lg overflow-hidden border border-white/10">
          <iframe
            title={planet.title}
            src={embed}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            loading="lazy"
            style={{ background: "rgba(0,0,0,0.2)" }}
          />
        </div>

        <div className="mt-3 text-xs md:text-sm text-white/70">
          Tip: If autoplay is blocked, press play in the Spotify panel.
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Helpers ----------------------- */

function P({ title, id, type, color, x, y, r }) {
  return { title, id, type, color, x, y, r };
}
function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function addAlpha(hex, a = 1) {
  // hex like #rrggbb
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function drawStarsLayer(ctx, arr, ship, w, h, parallax, color) {
  ctx.fillStyle = color;
  for (const s of arr) {
    const sx = w / 2 + (s.x - ship.x) * parallax;
    const sy = h / 2 + (s.y - ship.y) * parallax;
    // wrap stars to avoid gaps as we travel
    let x = ((sx % (w + 200)) + (w + 200)) % (w + 200) - 100;
    let y = ((sy % (h + 200)) + (h + 200)) % (h + 200) - 100;
    ctx.globalAlpha = s.o;
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
