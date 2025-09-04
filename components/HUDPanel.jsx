"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
// 2D fallback hologram
// 2D HUD removed per request; 3D only
// 3D planet system (requires three/r3f/drei installed)
// IMPORTANT: Do NOT import at module scope — older @react-three/fiber versions
// are incompatible with React 19 and can crash on evaluation. We lazy-load it
// only after probing availability, and fall back gracefully.
import { usePlayerStore } from "@/store/usePlayerStore";

// We import the 3D system directly and only render on client via this client component

class ErrorBoundary extends React.Component { 
  constructor(props){ super(props); this.state = { hasError:false }; }
  static getDerivedStateFromError(){ return { hasError:true }; }
  componentDidCatch(err, info){ try { this.props.onError && this.props.onError(err); } catch {} }
  render(){ return this.state.hasError ? this.props.fallback : this.props.children; }
}
// Song list removed in favor of dropdown-only selector
import CoverCard from "@/components/CoverCard";
import { buildPlanetSongs } from "@/lib/planets";
import SongDropdown from "@/components/SongDropdown";
import DevErrorLogger from "@/components/DevErrorLogger";
import { sfx } from "@/lib/sfx";
// HologramPlanets demo removed per request (3D only)

// Use system font stack to avoid network font fetches during build

function ElementIcon({ name, size = 18 }) {
  if (!name) return null;
  const n = String(name).toLowerCase();
  let src = "";
  if (n.includes("chxndler")) src = "/elements/chxndler.png";
  else if (n.includes("heart")) src = "/elements/heart.png";
  else if (n.includes("lightning") || n.includes("electric")) src = "/elements/lighting.png";
  else if (n.includes("dark")) src = "/elements/darkness.png";
  else if (n.includes("water") || n.includes("air")) src = "/elements/water.png";
  else if (n.includes("earth") || n.includes("fire")) src = "/elements/heart.png"; // fallbacks
  else src = "/elements/heart.png";
  // Element colors (match system hues)
  const colorFor = (key) => {
    if (!key) return "#38B6FF";
    const k = String(key).toLowerCase();
    if (k.includes("chxndler")) return "#19E3FF"; // brand cyan
    if (k.includes("water")) return "#38B6FF";      // cyan
    if (k.includes("heart")) return "#FC54AF";      // pink
    if (k.includes("lightning") || k.includes("electric")) return "#F2EF1D"; // yellow
    if (k.includes("earth")) return "#F2EF1D";     // reuse neon yellow
    if (k.includes("air")) return "#8BF9FF";       // light cyan
    if (k.includes("dark")) return "#000000";      // deep black
    return "#38B6FF";
  };
  const clr = colorFor(n);
  // Outer halo uses same color except for darkness which would be invisible — use cyan halo to sell hologram
  const outer = (n.includes("dark")) ? "#19E3FF" : clr;
  const sz = typeof size === 'number' ? `${size}px` : String(size);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent:'center', pointerEvents:'none' }}>
      <img
        src={src}
        alt="Element"
        width={size}
        height={size}
        style={{
          width: sz,
          height: sz,
          objectFit: 'contain',
          display:'block',
          background: 'transparent',
          filter: `saturate(1.2) brightness(1.08) drop-shadow(0 0 6px ${outer}) drop-shadow(0 0 16px ${outer}) drop-shadow(0 0 34px ${outer})`,
        }}
      />
    </span>
  );
}

export default function HUDPanel({
  title = "OCEAN GIRL",
  subtitle = "Love flows back like tide.",
  songs,
  onSongChange,
  inConsole = false,
  track,
  currentId,
  holoPop = false,
  playing = false,
  beamOnly = false,
  beamEnabled = undefined, // optional external control for beam fade (true/false)
}) {
  const hoverCoverRef = useRef(null);
  const clickCoverRef = useRef(null);
  const closeCoverRef = useRef(null);
  const [active, setActive] = useState((songs && songs[0]?.id) || undefined);
  const containerRef = useRef(null);
  const baseW = 820; // design width for console-fit
  const baseH = 340; // design height for console-fit
  const [scale, setScale] = useState(1);
  const [hoverId, setHoverId] = useState(null);
  const [can3D, setCan3D] = useState(false);
  const [PlanetSystemComp, setPlanetSystemComp] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [showCard, setShowCard] = useState(false);
  // Beam fade: allow external control; default to fade-in on mount
  const [beamOpacity, setBeamOpacity] = useState(0);
  useEffect(() => {
    if (typeof beamEnabled === 'boolean') {
      const t = setTimeout(() => setBeamOpacity(beamEnabled ? 1 : 0), 10);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setBeamOpacity(1), 10);
      return () => clearTimeout(t);
    }
  }, [beamEnabled]);
  // Content fade (instead of hard hide when beamOnly)
  const [contentOpacity, setContentOpacity] = useState(beamOnly ? 0 : 1);
  useEffect(() => { setContentOpacity(beamOnly ? 0 : 1); }, [beamOnly]);

  // Runtime probe: lazy import r3f/drei/three and PlanetSystem; if any fail, keep 2D-only
  useEffect(() => {
    let mounted = true;
    // Avoid r3f on React 19 unless known-compatible; skip imports entirely
    try {
      const ver = (React && React.version) ? String(React.version) : "";
      const major = ver ? parseInt(ver.split(".")[0] || "0", 10) : 0;
      if (major >= 19) { setCan3D(false); return () => { mounted = false; }; }
    } catch {}
    (async () => {
      try {
        const r3f = await import("@react-three/fiber");
        const drei = await import("@react-three/drei");
        const three = await import("three");
        const ok = !!r3f && !!drei && !!three;
        if (!ok) { if (mounted) setCan3D(false); return; }
        const mod = await import("@/components/holo/PlanetSystem");
        if (!mounted) return;
        const Comp = mod.default || mod.PlanetSystem;
        if (Comp) {
          setPlanetSystemComp(() => Comp);
          setCan3D(true);
        } else {
          setCan3D(false);
        }
      } catch (e) {
        if (mounted) setCan3D(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  // Bridge to 3D store available if installed

  // Mark mounted for any client-only adjustments; panel is imported with ssr:false
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!showCard) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowCard(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCard]);

  // Measure container and compute a stable scale before first paint to avoid flicker.
  useLayoutEffect(() => {
    if (!inConsole) return;
    const el = containerRef.current;
    if (!el) return;
    let raf = 0, raf2 = 0;
    const measure = () => {
      const w = el.clientWidth || 0;
      const h = el.clientHeight || 0;
      // If layout hasn't stabilized yet (very small box), retry next frame.
      if (w < 100 || h < 60) { raf2 = requestAnimationFrame(measure); return; }
      const s = Math.min(w / baseW, h / baseH);
      setScale(s > 0 ? s : 1);
    };
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    // Run after layout but before paint
    raf = requestAnimationFrame(measure);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); cancelAnimationFrame(raf2); };
  }, [inConsole]);

  // Sync active planet with externally playing song id (when provided)
  useEffect(() => {
    if (!currentId) return;
    const exists = songs.some(s => s.id === currentId);
    if (exists && currentId !== active) setActive(currentId);
  }, [currentId, songs]);

  // Fallback: if songs not provided, build from tracks
  const resolvedSongs = songs && songs.length ? songs : buildPlanetSongs().hudSongs;

  return (
    <motion.section
      className={
        `relative ${inConsole ? 'w-full h-full mx-0 mt-0' : 'mx-auto w-[1180px] mt-[10vh]'} `
      }
      /* Remove entrance animation to prevent flash-disappear on some devices */
      initial={false}
      animate={undefined}
      transition={undefined}
      aria-label="Spaceship HUD"
      ref={inConsole ? containerRef : undefined}
    >
      <DevErrorLogger />
      <div className="w-full h-full flex items-start justify-center">
          <motion.div
            className={`relative rounded-2xl shadow-[0_0_50px_rgba(25,227,255,0.35)] -ml-6 sm:-ml-8 md:-ml-12 lg:-ml-18`}
            // Remove hover glow/scale for the entire HUD display per request
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={inConsole
              ? { width: '100%', height: '100%', transform: 'perspective(1200px) rotateX(6deg)', transformOrigin: 'center', marginTop: 48 }
              : { transform: 'perspective(1200px) rotateX(6deg)', marginTop: 48 }
            }
          >
          {/* Background removed: keep HUD box transparent */}
        {/* Single blue outline wrapping the HUD content (amped glow) */}
        <div className={`relative rounded-2xl border border-[#19E3FF]/90 ring-2 ring-[#19E3FF]/50 shadow-[0_0_70px_rgba(25,227,255,0.6),_0_0_24px_rgba(25,227,255,0.85)] ${inConsole ? 'p-2' : 'p-4'}`}>
          {/* Uniform base fill for cohesive background across entire panel */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ background: 'rgba(8,26,32,0.50)' }}
          />
          {/* Cover art moved into right column above the song list */}
          {/* No beam/scan overlays; keep HUD static */}
          {/* Outer bloom layers for stronger hologram glow */}
          <div className="pointer-events-none absolute -inset-1 rounded-3xl opacity-70 mix-blend-screen"
               style={{
                 boxShadow: '0 0 90px rgba(25,227,255,0.55), 0 0 140px rgba(25,227,255,0.35)'
               }} />
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-70 mix-blend-screen"
               style={{
                 outline: '1px solid rgba(25,227,255,0.75)',
                 boxShadow: 'inset 0 0 22px rgba(25,227,255,0.35)'
               }} />
          {/* Element/logo pinned at the HUD box top-left */}
          <div className="absolute z-40" style={{ left: 12, top: 12, pointerEvents: 'none' }}>
            {(() => {
              try {
                if (!currentId) { return <ElementIcon name="chxndler" size={36} />; }
                const found = resolvedSongs.find(s => s.id === (active || ''));
                const icon = found && found.icon;
                return icon ? <ElementIcon name={icon} size={36} /> : null;
              } catch { return null; }
            })()}
          </div>
          <div
            className={`grid grid-cols-[1.35fr_0.65fr] gap-6 ${inConsole ? 'p-3' : 'p-8'}`}
            style={{ opacity: contentOpacity, transition: 'opacity 240ms ease', pointerEvents: contentOpacity > 0.01 ? 'auto' : 'none' }}
          >
          {/* Left: title + planet */}
          <div className="flex flex-col gap-6">
            {/* Title/subtitle removed per request; song title is shown within the HUD display */}
            <div className="pt-2 w-full mt-auto transform -translate-y-[4vh] sm:-translate-y-[3vh] md:-translate-y-[2vh] lg:-translate-y-[2vh]">
              {/* Hologram panel wrapper to integrate with dashboard styling */}
              <div className="relative">
                {/* Dynamic 3D with safe fallback to 2D if it errors */}
                <div className={`relative w-full overflow-visible rounded-[12px] ${inConsole ? 'h-[200px] sm:h-[220px]' : 'h-[400px] md:h-[480px] lg:h-[560px]'}`}>
                  {/* Keep 3D background clear (no backdrop behind Canvas) */}
                  {/* Title overlay removed from panel; shown under cover art */}
                {can3D && PlanetSystemComp ? (
                  <div className="absolute left-0 right-0 bottom-0" style={{ top: 72 }}>
                    <ErrorBoundary fallback={null} onError={(e)=>{ if (String(e?.name||'').includes('IndexSizeError')) { try { console.warn('Disabling 3D due to IndexSizeError'); } catch {} } setCan3D(false); }}>
                      <PlanetSystemComp showAll={!currentId} />
                    </ErrorBoundary>
                  </div>
                ) : (
                  // Minimal 2D fallback: start below the one-liner
                  <div className="absolute left-0 right-0 bottom-0 grid place-items-center" style={{ top: 72 }}>
                    <div
                      className="rounded-full"
                      style={{ width: '58%', aspectRatio: '1 / 1',
                        background: 'radial-gradient(circle at 40% 40%, rgba(25,227,255,0.65), rgba(25,227,255,0.18) 60%, rgba(25,227,255,0.06) 80%, transparent 100%)',
                        filter: 'blur(0.4px) saturate(1.1)' }}
                    />
                  </div>
                )}
                  {/* Removed debug badge */}
                  {/* Top-left song title (hologram blue, larger font) */}
                  <div
                    className="absolute z-20 rounded-md"
                    style={{
                      color: '#19E3FF',
                      fontFamily: 'OrbitronLocal, InterLocal, sans-serif',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      textShadow: 'none',
                      WebkitTextStroke: '0px transparent',
                      fontSize: 22,
                      lineHeight: '1.12',
                      width: 'clamp(360px, 70vw, 1200px)',
                      minHeight: 44,
                      display: 'block',
                      padding: 0,
                      left: 46,
                      top: -38,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      pointerEvents: 'none',
                    }}
                  >
                    {(!currentId ? 'CHXNDLER' : ((track?.title) || (resolvedSongs.find(s=> s.id === (active || ''))?.title) || ''))}
                  </div>
                  {/* Song tagline directly under the title */}
                  <div
                    className="absolute z-20 rounded-md"
                    style={{
                      color: '#19E3FF',
                      fontFamily: 'InterLocal, OrbitronLocal, system-ui, sans-serif',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textShadow: 'none',
                      WebkitTextStroke: '0px transparent',
                      fontSize: 14,
                      lineHeight: '1.25',
                      width: 'clamp(360px, 75vw, 1200px)',
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      left: 40,
                      top: -14,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      pointerEvents: 'none',
                    }}
                    aria-label="Song tagline"
                  >
                    {(!currentId ? 'A home for ALIENS, where misfits and dreamers live free.' : (track?.subtitle || ''))}
                  </div>

                  {/* Song changer moved to right rail under cover art */}

                  {/* Sheen overlay removed to keep title + one-liner area fully transparent */}
                  {/* Removed internal base glow; beam below panel provides the hologram emission */}
                </div>
              </div>
            </div>
          </div>
          {/* Right rail: cover art + dropdown list */}
          <aside className="relative flex flex-col items-end gap-3 translate-x-0">
            <div className="mt-0 pr-0 self-end mr-1 md:mr-2 lg:mr-3" style={{ width: inConsole ? 200 : 280 }}>
              {true ? (
                <button
                  type="button"
                  aria-label="Open song card"
                  className="cover-link w-full"
                  onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {}; try { const a = hoverCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
                  onClick={() => { try { sfx.play('click', 0.6); } catch {}; try { const a = clickCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {}; setShowCard(true); }}
                >
                  {(() => {
                    const defaultCover = '/cover/chxndler.png';
                    const src = (!currentId ? defaultCover : (track?.cover || defaultCover));
                    return <CoverCard src={src} size={inConsole ? 200 : 280} />;
                  })()}
                </button>
              ) : null}
            </div>
            <div className="mt-1 pr-0 self-end mr-1 md:mr-2 lg:mr-3" style={{ width: inConsole ? 200 : 280 }}>
              <SongDropdown
                items={resolvedSongs}
                initialActiveId={active || resolvedSongs[0]?.id}
                onChange={(id)=>{ setActive(id); onSongChange?.(id); try { if (usePlayerStore?.getState) usePlayerStore.getState().setMain(id); } catch {} }}
              />
            </div>
          </aside>
        </div>

        {/* Hologram base glow + upward beam: positioned below the HUD box with a small gap */}
        <div
          className="pointer-events-none absolute inset-x-0 h-32"
          aria-hidden
          style={{ top: 'calc(100% - 20px)', opacity: beamOpacity, transform: 'translateX(-26px)', transition: 'opacity 180ms ease, transform 200ms ease' }}
        >
          {/* Cyan base pool at console lip (broad soft glow) */}
          <div
            className="absolute inset-x-[-20px] bottom-0 h-28 mix-blend-screen"
            style={{
              background: "radial-gradient(72% 130% at 50% 100%, rgba(25,227,255,.55), rgba(25,227,255,0) 70%)",
              filter: "blur(12px)", opacity: 0.85,
            }}
          />
          {/* Intense core glow at the base to feel like it's emitting from the dashboard */}
          <div
            className="absolute inset-x-24 bottom-1 h-12 mix-blend-screen"
            style={{
              background: "radial-gradient(60% 100% at 50% 100%, rgba(114,255,255,.95), rgba(114,255,255,0) 70%)",
              filter: "blur(10px)",
            }}
          />
          {/* White-hot inner hotspot */}
          <div
            className="absolute inset-x-40 bottom-0 h-6 mix-blend-screen"
            style={{
              background: "radial-gradient(50% 100% at 50% 100%, rgba(255,255,255,.9), rgba(255,255,255,0) 70%)",
              filter: "blur(8px)", opacity: 0.75,
            }}
          />
          {/* Upward flaring beam from console across entire HUD (nudged down slightly) */}
          <div
            className="absolute inset-x-6 top-12 bottom-6 mix-blend-screen"
            style={{
              clipPath: "polygon(48% 100%, 52% 100%, 100% 0, 0 0)",
              background: "linear-gradient(0deg, rgba(25,227,255,.6), rgba(25,227,255,0))",
              filter: "blur(10px)", opacity: 0.55,
            }}
          />
          {/* Subtle magenta secondary bloom for neon richness */}
          <div
            className="absolute inset-x-[-16px] bottom-0 h-16 mix-blend-screen"
            style={{
              background: "radial-gradient(60% 80% at 50% 100%, rgba(252,84,175,.28), rgba(252,84,175,0) 70%)",
              filter: "blur(10px)", opacity: 0.35,
            }}
          />
        </div>

        {/* bottom-corner buttons removed per design request */}
        </div>
        </motion.div>
      <style jsx>{`
        .cover-link{ display:block; border-radius:16px; outline:1px solid rgba(25,227,255,.35);
          box-shadow: 0 0 28px rgba(25,227,255,.25);
          transition: transform .15s ease, box-shadow .2s ease, outline-color .2s ease;
        }
        .cover-link:hover{
          transform: scale(1.04);
          outline-color: rgba(25,227,255,.8);
          box-shadow: 0 0 52px rgba(25,227,255,.7), 0 0 90px rgba(25,227,255,.45);
        }
        .cover-link:active{ transform: scale(.98); }
        /* No HUD animation styles */
      `}</style>
      {showCard ? (
        <div
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-start justify-end"
          style={{ padding: '6vh 5vw' }}
          onClick={() => {
            try { sfx.play('/audio/close.mp3', 0.7); } catch {}
            try { const a = closeCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {}
            setShowCard(false);
          }}
        >
          <div
            className="relative rounded-2xl p-4 card-modal"
            onClick={(e)=> e.stopPropagation()}
          >
            <div className="tilt-wrap">
              <div className="card-frame">
                {(() => {
                  const home = !currentId;
                  const slug = home ? '' : (track?.slug || active || '');
                  const CARD_OVERRIDES = {
                    "were-just-friends": "/card/we're-just-friends.png",
                    "were-just-friends-dmvrco-remix": "/card/we're-just-friends-dmvrco-remix.png",
                    "were-just-friends-mickey-jas-remix": "/card/we're-just-friends-mickey jas-remix.png",
                    "mr-brightside": "/card/mr.brightside.png",
                    "tienes-un-amigo": "/card/tienes-un-amigo-acqi.png",
                  };
                  const defaultCard = '/card/chxndler.png';
                  const fallbackCover = '/cover/chxndler.png';
                  const explicitCard = slug ? (CARD_OVERRIDES[slug] || `/card/${slug}.png`) : '';
                  const cardSrc = home ? defaultCard : (explicitCard || track?.cover || fallbackCover);
                  return (
                    <img
                      src={cardSrc}
                      alt={(track?.title)||'Card'}
                      className="tilt-img"
                      data-fallback="0"
                      onError={(e)=>{
                        try {
                          const el = e.currentTarget;
                          const tried = Number((el.dataset && el.dataset.fallback) || '0');
                          if (home) { el.src = '/card/BUSINESS CARD.png'; if (el.dataset) el.dataset.fallback = '2'; return; }
                          if (tried === 0 && slug) {
                            el.src = `/generated/${slug}-album-card.png`;
                            if (el.dataset) el.dataset.fallback = '1';
                            return;
                          }
                          el.src = track?.cover || '/cover/chxndler.png';
                          if (el.dataset) el.dataset.fallback = '2';
                        } catch {}
                      }}
                    />
                  );
                })()}
                <span className="frame-sheen" aria-hidden />
              </div>
            </div>
            {/* Streaming buttons removed per request */}
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                try { sfx.play('/audio/close.mp3', 0.7); } catch {}
                try { const a = closeCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {}
                setShowCard(false);
              }}
              className="absolute -top-3 -right-3 rounded-full bg-[#19E3FF] text-black font-bold w-8 h-8 shadow-[0_0_20px_rgba(25,227,255,0.8)]"
              title="Close"
            >×</button>
          </div>
        </div>
      ) : null}
      <style jsx>{`
        .card-modal{
          max-width: min(60vw, 360px);
          background: linear-gradient(180deg, rgba(12,24,30,0.6), rgba(12,24,30,0.35));
          box-shadow: 0 0 60px rgba(25,227,255,0.45), inset 0 0 0 1px rgba(25,227,255,0.35);
        }
        .tilt-wrap{ perspective: 1200px; transform-style: preserve-3d; }
        .card-frame{
          position:relative; border-radius: 16px; padding: 8px; background: rgba(0,0,0,.35);
          outline: 1px solid rgba(25,227,255,.4);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), 0 0 36px rgba(25,227,255,.35);
        }
        .tilt-img{
          width: 100%; height: auto; display:block; object-fit: contain;
          transform: rotateX(10deg) rotateY(-10deg) translateZ(0);
          filter: saturate(1.06) contrast(1.06) brightness(1.04)
            drop-shadow(0 0 18px rgba(25,227,255,0.55)) drop-shadow(0 0 36px rgba(25,227,255,0.35));
          animation: tiltPulse 3s ease-in-out infinite;
          border-radius: 14px;
        }
        .frame-sheen{ position:absolute; inset: 6px; border-radius: 12px; pointer-events:none;
          background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,0) 60%);
          mix-blend-mode: screen; opacity:.6;
        }
        .tilt-img:hover{ animation-duration: 2.2s; }
        @keyframes tiltPulse{
          0%,100% { transform: rotateX(9deg) rotateY(-9deg) scale(1); }
          50%      { transform: rotateX(13deg) rotateY(-13deg) scale(1.04); }
        }
        .btn-stream{
          display:inline-block; padding: 8px 12px; border-radius: 12px; color:#001014; font-weight:700;
          border: 1px solid rgba(255,255,255,.25);
          text-shadow: 0 1px 0 rgba(255,255,255,.6);
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease;
        }
        .btn-stream:active{ transform: scale(.98); }
        /* Brand variants */
        .btn-spotify{ background: radial-gradient(100% 100% at 50% 30%, rgba(210,255,225,1), #1DB954); box-shadow: 0 0 24px rgba(29,185,84,.55), inset 0 2px 0 rgba(255,255,255,.55), inset 0 -6px 14px rgba(0,0,0,.25); }
        .btn-spotify:hover{ transform: translateZ(0) scale(1.04); box-shadow: 0 0 32px rgba(29,185,84,.8), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -6px 16px rgba(0,0,0,.3); filter: saturate(1.05) brightness(1.03); }
        .btn-apple{ background: radial-gradient(100% 100% at 50% 30%, rgba(255,210,210,1), #FF3B30); box-shadow: 0 0 24px rgba(255,59,48,.55), inset 0 2px 0 rgba(255,255,255,.55), inset 0 -6px 14px rgba(0,0,0,.25); }
        .btn-apple:hover{ transform: translateZ(0) scale(1.04); box-shadow: 0 0 32px rgba(255,59,48,.8), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -6px 16px rgba(0,0,0,.3); filter: saturate(1.05) brightness(1.03); }
      `}</style>
      <audio ref={hoverCoverRef} preload="auto">
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={clickCoverRef} src="/audio/click.mp3" preload="auto" />
      <audio ref={closeCoverRef} src="/audio/close.mp3" preload="auto" />
      </div>
    </motion.section>
  );
}
