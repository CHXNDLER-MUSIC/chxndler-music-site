"use client";
import React, { useEffect, useRef, useState } from "react";
import { ELEMENT_COLORS, type Element } from "@/lib/planets";
import type { Track } from "@/lib/songs-consolidated";

type Props = {
  currentTrack?: Track;
  isPlaying: boolean;
  mounted: boolean;
};

function getTrackElement(track?: Track): Element {
  if (!track) return "water";
  const slug = (track.slug || "").toLowerCase();
  if (slug.includes("ocean") || slug.includes("tide") || slug.includes("wave") || slug.includes("sea")) return "water";
  if (slug.includes("heart") || slug.includes("love") || slug.includes("friends") || slug.includes("somebody-to-love")) return "heart";
  if (slug.includes("lightning") || slug.includes("lighting") || slug.includes("electric") || slug.includes("neon") || slug.includes("collide") || slug.includes("brain") || slug.includes("kid") || slug.includes("game")) return "lightning";
  if (slug.includes("dark") || slug.includes("black") || slug.includes("alone") || slug.includes("midnight")) return "darkness";
  if (slug.includes("fire") || slug.includes("burn")) return "fire";
  if (slug.includes("home") || slug.includes("earth") || slug.includes("paris") || slug.includes("bee")) return "earth";
  if (slug.includes("air") || slug.includes("sky")) return "air";
  return "water";
}

// Lightweight music-reactive window trim that hugs the cockpit windows using clip-paths.
// Heuristic section detector toggles between verse and chorus patterns.
export default function CockpitWindowRim({ currentTrack, isPlaying, mounted }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  // Rolling energy windows for simple sectioning
  const shortAvgRef = useRef<number[]>([]); // ~4s
  const longAvgRef = useRef<number[]>([]);  // ~30s baseline
  const beatTimesRef = useRef<number[]>([]);
  const sectionRef = useRef<"verse" | "chorus">("verse");
  const flashRef = useRef<number>(0);

  const element = getTrackElement(currentTrack);
  const primary = ELEMENT_COLORS[element];
  const withAlpha = (hex: string, a: number) => {
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16);
    const g = parseInt(h.substring(2,4),16);
    const b = parseInt(h.substring(4,6),16);
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
  };
  const C10 = withAlpha(primary, 0.0625);
  const C1A = withAlpha(primary, 0.10);
  const C22 = withAlpha(primary, 0.13);
  const C33 = withAlpha(primary, 0.20);
  const C55 = withAlpha(primary, 0.33);

  // Polygon editor state (percent units 0..100 relative to left rim box)
  type Pt = { x: number; y: number };
  const defaultPoly: Pt[] = [
    { x: 0,  y: 0 },
    { x: 70, y: 0 },
    { x: 92, y: 22 },
    { x: 86, y: 48 },
    { x: 50, y: 66 },
    { x: 10, y: 72 },
    { x: 0,  y: 64 },
  ];
  const [poly, setPoly] = useState<Pt[]>(defaultPoly);
  const [debug, setDebug] = useState(false);

  // Load/save calibration
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const dbg = sp.has('rim') || localStorage.getItem('rimDebug') === '1';
      setDebug(!!dbg);
      const saved = localStorage.getItem('rimPoly');
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.every(p => typeof p.x === 'number' && typeof p.y === 'number')) setPoly(arr);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName || '';
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as any)?.isContentEditable;
      if (!inField && (e.key === 'r' || e.key === 'R')) {
        setDebug(d => { try { localStorage.setItem('rimDebug', d ? '0' : '1'); } catch {}; return !d; });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const polygonCss = React.useMemo(() => {
    const pts = (poly || defaultPoly).map(p => `${p.x}% ${p.y}%`).join(', ');
    return `polygon(${pts})`;
  }, [poly]);

  const onDragHandle = (idx: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    const el = leftRef.current; if (!el) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      let x = ((ev.clientX - rect.left) / rect.width) * 100;
      let y = ((ev.clientY - rect.top) / rect.height) * 100;
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));
      setPoly(prev => {
        const next = prev.slice();
        next[idx] = { x, y };
        try { localStorage.setItem('rimPoly', JSON.stringify(next)); } catch {}
        return next;
      });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  };

  const copyPoly = () => {
    const s = polygonCss;
    try { navigator.clipboard.writeText(s); } catch {}
    try { if (process.env.NODE_ENV !== 'production') { /* eslint-disable-next-line no-console */ /* debug removed */ } } catch {}
  };

  useEffect(() => {
    if (!mounted) return;
    const host = hostRef.current;
    if (!host) return;

    // Hook into the main audio element
    const audio = document.querySelector<HTMLAudioElement>('audio[data-audio-player="1"]');
    if (!audio) return;

    // Create or reuse audio context
    let ctx = ctxRef.current;
    if (!ctx) {
      try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); }
      catch { ctx = null as any; }
      ctxRef.current = ctx;
    }
    if (!ctx) return;

    // Ensure context is running (Safari/iOS requires gesture)
    if (ctx.state !== 'running') {
      const unlock = () => { try { ctx!.resume().catch(()=>{}); } catch {}; window.removeEventListener('pointerdown', unlock as any); window.removeEventListener('touchstart', unlock as any); window.removeEventListener('keydown', unlock as any); };
      window.addEventListener('pointerdown', unlock, { once: true } as any);
      window.addEventListener('touchstart', unlock, { once: true, passive: true } as any);
      window.addEventListener('keydown', unlock as any, { once: true } as any);
    }

    // Analyser + source
    let analyser = analyserRef.current;
    let source = sourceRef.current;
    if (!analyser) {
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
    }
    if (!source) {
      try { source = ctx.createMediaElementSource(audio); }
      catch { source = null as any; }
      if (source) {
        source.connect(analyser);
        try { source.connect(ctx.destination); } catch {}
        sourceRef.current = source;
      }
    }
    if (!dataRef.current) dataRef.current = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      const a = analyserRef.current, buf = dataRef.current, el = hostRef.current;
      if (!a || !buf || !el) return;
      const audioEl = document.querySelector<HTMLAudioElement>('audio[data-audio-player="1"]');
      a.getByteFrequencyData(buf);
      // Emphasize bands for different window regions
      const len = buf.length;
      const band = (lo: number, hi: number) => {
        const s = Math.floor(len * lo);
        const e = Math.floor(len * hi);
        let ssum = 0; for (let i = s; i < e; i++) ssum += buf[i];
        return ssum / Math.max(1, e - s);
      };
      // Overall low-mid energy for generic level
      const avg = band(0.05, 0.35);
      const level = Math.max(0, Math.min(1, avg / 140));
      el.style.setProperty("--level", level.toFixed(3));
      // Per-region bands
      const bassAvg = band(0.03, 0.15);   // left window
      const midAvg  = band(0.15, 0.40);   // right window
      const highAvg = band(0.40, 0.75);   // top visor
      const leftLevel  = Math.max(0, Math.min(1, bassAvg / 150));
      const rightLevel = Math.max(0, Math.min(1, midAvg  / 140));
      const topLevel   = Math.max(0, Math.min(1, highAvg / 120));
      el.style.setProperty("--left",  leftLevel.toFixed(3));
      el.style.setProperty("--right", rightLevel.toFixed(3));
      el.style.setProperty("--top",   topLevel.toFixed(3));

      // Simple beat tick by spotting transients in kick band
      const kickStart = Math.floor(len * 0.08), kickEnd = Math.floor(len * 0.18);
      let kick = 0; for (let i = kickStart; i < kickEnd; i++) kick += buf[i];
      const kickAvg = kick / Math.max(1, kickEnd - kickStart);
      const now = performance.now();
      const lastBeat = beatTimesRef.current[beatTimesRef.current.length - 1] || 0;
      if (kickAvg > 135 && (now - lastBeat) > 170) beatTimesRef.current.push(now);
      // Trim beats to last 8s
      while (beatTimesRef.current.length && (now - beatTimesRef.current[0]) > 8000) beatTimesRef.current.shift();

      // Rolling windows for sectioning
      shortAvgRef.current.push(level); // ~60fps; 240 samples ~4s
      if (shortAvgRef.current.length > 240) shortAvgRef.current.shift();
      longAvgRef.current.push(level); // 1800 samples ~30s
      if (longAvgRef.current.length > 1800) longAvgRef.current.shift();

      const shortAvg = shortAvgRef.current.reduce((a,b)=>a+b,0) / Math.max(1, shortAvgRef.current.length);
      const longAvg = longAvgRef.current.reduce((a,b)=>a+b,0) / Math.max(1, longAvgRef.current.length);
      const beatRate = beatTimesRef.current.length / 8.0; // beats per second over last 8s

      // Prefer explicit sections when available on the track; fallback to heuristic
      const explicitSections: any[] = (currentTrack as any)?.sections;
      if (audioEl && Array.isArray(explicitSections) && explicitSections.length > 0) {
        const t = audioEl.currentTime || 0;
        let current: any = null;
        for (let i = 0; i < explicitSections.length; i++) {
          const s = explicitSections[i];
          if (s && typeof s.time === 'number' && s.time <= t + 0.05) current = s; else if (s.time > t) break;
        }
        const kind = (current?.kind || '').toLowerCase();
        sectionRef.current = (kind === 'chorus') ? 'chorus' : 'verse';
      } else {
        // Heuristic: chorus when sustained higher energy + denser beats
        const isChorus = shortAvg > Math.max(0.12, longAvg * 1.18) && beatRate > 1.4;
        const prev = sectionRef.current;
        // Add hysteresis to avoid flicker
        if (prev === 'verse' && isChorus) sectionRef.current = 'chorus';
        if (prev === 'chorus' && shortAvg < Math.max(0.10, longAvg * 1.02) && beatRate < 1.0) sectionRef.current = 'verse';
      }

      // Expose section and beat flash for CSS effects
      try {
        (el as any).dataset.section = sectionRef.current;
        const last = beatTimesRef.current[beatTimesRef.current.length - 1] || 0;
        const dt = Math.max(0, performance.now() - last);
        const flash = Math.max(0, 1 - dt / 180); // quick decay pulse after each beat
        flashRef.current = flash;
        el.style.setProperty('--flash', flash.toFixed(3));
      } catch {}

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      try { analyserRef.current?.disconnect(); } catch {}
      try { sourceRef.current?.disconnect(); } catch {}
    };
  }, [mounted, currentTrack]);

  if (!mounted) return null;

  return (
    <div
      ref={hostRef}
      className="window-rim pointer-events-none"
      aria-hidden
      data-playing={isPlaying ? '1' : '0'}
      data-section="verse"
    >
      <style jsx>{`
        .window-rim{
          position: fixed; inset: 0; z-index: 29;
          --level: 0.0; /* 0..1 */
          --flash: 0.0; /* 0..1 */
          /* Convert hex to rgba on the fly via layered gradients */
          mix-blend-mode: screen;
        }

        /* Approximate left and right cockpit window rims using clip-paths.
           Shapes are tuned as percentages so they scale with viewport.
           Tweak if you update cockpit.png framing. */
        .rim{ position: absolute; inset: 0; }

        .rim-left, .rim-right{ position:absolute; top:0; height:54vh; width:42vw; }
        .rim-left{ left:0; }
        .rim-right{ right:0; transform: scaleX(-1); }

        /* Outer glow ring */
        .ring-outer{
          position:absolute; inset:-2vh -2vw -2vh -2vw; pointer-events:none;
          background:
            radial-gradient(120% 80% at 40% 10%, ${C22}, transparent 60%),
            radial-gradient(80% 60% at 5% 5%,  ${C1A}, transparent 60%),
            radial-gradient(80% 60% at 95% 5%, ${C1A}, transparent 60%);
          filter: blur(calc(12px + var(--flash) * 8px));
          opacity: calc(0.30 + var(--level) * 0.35 + var(--flash) * 0.28);
        }

        /* Inner accent ring with animated sweep; stronger during chorus */
        .ring-inner{
          position:absolute; inset:-1vh -1vw -1vh -1vw; pointer-events:none;
          background:
            conic-gradient(from 180deg at 40% 15%,
              transparent 0deg,
              ${C55} 12deg,
              transparent 36deg,
              transparent 180deg,
              ${C55} 192deg,
              transparent 216deg),
            radial-gradient(120% 80% at 40% 10%, ${C33}, transparent 62%);
          filter: blur(calc(4px + var(--level) * 8px + var(--flash) * 4px));
          animation: sweep 4.2s linear infinite;
          animation-play-state: paused;
          opacity: calc(0.38 + var(--level) * 0.48 + var(--flash) * 0.35);
        }

        /* Chorus mode intensifies speed and brightness */
        .window-rim[data-section="chorus"] .ring-inner{
          animation-duration: 2.4s;
          filter: blur(calc(6px + var(--level) * 10px + var(--flash) * 4px)) brightness(calc(1.1 + var(--level) * 0.6 + var(--flash) * 0.6));
        }

        /* Play state toggle via data attribute */
        .window-rim[data-playing="1"] .ring-inner{ animation-play-state: running; }

        /* Subtle moving flow; overridden by chorus */
        @keyframes sweep{
          0%   { transform: translateZ(0) rotate(0deg);   opacity: 0.75; }
          50%  { transform: translateZ(0) rotate(180deg); opacity: 0.95; }
          100% { transform: translateZ(0) rotate(360deg); opacity: 0.75; }
        }

        /* Right window mirrors left by container transform */

        /* Top visor band across windshield for extra highlight */
        .visor{
          position:absolute; left:10vw; right:10vw; top:0; height:14vh; pointer-events:none;
          background:
            linear-gradient(180deg, ${C22}, ${C10} 55%, transparent 90%);
          filter: blur(calc(6px + var(--top, var(--level)) * 8px + var(--flash) * 3px));
          opacity: calc(0.14 + var(--top, var(--level)) * 0.42 + var(--flash) * 0.22);
          -webkit-mask: linear-gradient(180deg, #000, #0000 70%);
                  mask: linear-gradient(180deg, #000, #0000 70%);
        }

        /* Chorus pulsing for the visor */
        .window-rim[data-section="chorus"] .visor{
          animation: visorBeat 600ms ease-in-out infinite;
          animation-play-state: paused;
        }
        .window-rim[data-playing="1"][data-section="chorus"] .visor{ animation-play-state: running; }
        @keyframes visorBeat {
          0%, 100% { opacity: calc(0.22 + var(--level) * 0.45); filter: blur(calc(6px + var(--level) * 8px)); }
          50%      { opacity: calc(0.38 + var(--level) * 0.55); filter: blur(calc(4px + var(--level) * 6px)) brightness(1.15); }
        }

        /* Reduce motion: disable sweeps, keep static glow */
        @media (prefers-reduced-motion: reduce) {
          .ring-inner{ animation: none; }
          .window-rim[data-section="chorus"] .visor{ animation: none; }
        }
      `}</style>

      {/* Inline style token to expose current section as CSS-readable string */}
      <div style={{ display: 'none' }}>{/* no-op for SSR types */}</div>

      <div className="rim">
        {/* Left window */}
        <div className="rim-left" ref={leftRef}>
          <div className="ring-outer" style={{ clipPath: polygonCss, WebkitClipPath: polygonCss, opacity: `calc(0.25 + var(--left, var(--level)) * 0.65)` }} />
          <div className="ring-inner" style={{ clipPath: polygonCss, WebkitClipPath: polygonCss, filter: `blur(calc(4px + var(--left, var(--level)) * 8px))`, opacity: `calc(0.4 + var(--left, var(--level)) * 0.6)` }} />
          {debug && (
            <>
              {/* Debug polygon outline */}
              <svg className="absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
                <polyline points={(poly||defaultPoly).map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke={C33} strokeWidth={1.2} />
                <circle cx={(poly||defaultPoly)[0].x} cy={(poly||defaultPoly)[0].y} r={1.2} fill={C55} />
              </svg>
              {/* Drag handles */}
              {(poly || defaultPoly).map((p, i) => (
                <div
                  key={i}
                  onPointerDown={onDragHandle(i)}
                  className="absolute"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: 9999, background: C55, border: `2px solid ${C22}`, boxShadow: `0 0 8px ${C33}`, cursor: 'grab' }}
                  title={`Point ${i}`}
                />
              ))}
            </>
          )}
        </div>
        {/* Right window (mirrored) */}
        <div className="rim-right">
          <div className="ring-outer" style={{ clipPath: polygonCss, WebkitClipPath: polygonCss, opacity: `calc(0.25 + var(--right, var(--level)) * 0.65)` }} />
          <div className="ring-inner" style={{ clipPath: polygonCss, WebkitClipPath: polygonCss, filter: `blur(calc(4px + var(--right, var(--level)) * 8px))`, opacity: `calc(0.4 + var(--right, var(--level)) * 0.6)` }} />
        </div>
        {/* Top visor highlight across windshield */}
        <div className="visor" />
      </div>
      {debug && (
        <button onClick={copyPoly} style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 50, padding: '6px 10px', borderRadius: 8, background: '#0008', border: `1px solid ${C22}`, color: '#fff', boxShadow: `0 0 10px ${C33}` }}>
          Copy polygon
        </button>
      )}
    </div>
  );
}
