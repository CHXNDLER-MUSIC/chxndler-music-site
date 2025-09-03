"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { tracks as ALL, type Track } from "@/config/tracks";
import { skyFor } from "@/lib/sky";
import { track as gaTrack } from "@/lib/analytics";

type Props = {
  onSkyChange: (webm: string, mp4: string, key: string) => void;
  onPlayingChange: (playing: boolean) => void;
  onTrackChange?: (track: Track) => void;
  wrapChannels?: boolean;
  startSignal?: number;    // increments to force start
  startIndex?: number;     // default 0
  playSignal?: number;     // increments to force play current or nearest with audio
  toggleSignal?: number;   // increments to toggle play/pause (prefers local audio)
  showHUDPlay?: boolean;   // show the HUD play/pause button (default true)
  index?: number;          // controlled index (optional)
  onIndexChange?: (idx:number)=>void; // notify parent on index change
};

export default function MediaDock({ onSkyChange, onPlayingChange, onTrackChange, wrapChannels = true, startSignal = 0, startIndex = 0, playSignal = 0, toggleSignal = 0, showHUDPlay = true, index, onIndexChange }: Props) {
  const [internalIdx, setInternalIdx] = useState(startIndex);
  const idx = (typeof index === 'number') ? index : internalIdx;
  const setIdx = (val: number | ((p:number)=>number)) => {
    const next = typeof val === 'function' ? (val as (p:number)=>number)(idx) : val;
    if (onIndexChange) onIndexChange(next); else setInternalIdx(next);
  };
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement|null>(null);
  const uiClickRef = useRef<HTMLAudioElement|null>(null);
  const detentRef = useRef<HTMLAudioElement|null>(null);
  const dialRef = useRef<HTMLDivElement|null>(null);
  const warpTimerRef = useRef<number|undefined>(undefined);
  const warpPlayTimerRef = useRef<number|undefined>(undefined);
  const [showWarp, setShowWarp] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const tracks = ALL;
  const cur = tracks[idx];

  const STEP = useMemo(() => 360 / Math.max(tracks.length, 1), [tracks.length]);
  const [angle, setAngle] = useState(idx * STEP);

  useEffect(() => { onPlayingChange(playing); }, [playing, onPlayingChange]);

  // external "start" signal: jump to startIndex and play
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    setIdx(startIndex);
    setTimeout(() => {
      a.load();
      if (cur.src) {
        a.play().then(() => { setPlaying(true); gaTrack("play", { slug: cur.slug }); })
                 .catch(() => setPlaying(false));
      }
    }, 0);
  }, [startSignal]); // eslint-disable-line

  // load on index change; update sky; delay music start until warp SFX finishes
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    // Clear any pending delayed plays from prior index changes
    if (warpPlayTimerRef.current !== undefined) { clearTimeout(warpPlayTimerRef.current); warpPlayTimerRef.current = undefined; }
    a.load();
    if (cur.src) {
      // Begin playback muted immediately (allowed by autoplay policies), then unmute after warp
      try { a.muted = true; a.volume = 0.0; } catch {}
      a.play().catch(()=>{});
      setPlaying(false);
    } else {
      setPlaying(false);
    }
    const s = skyFor(cur.slug);
    onSkyChange(s.webm, s.mp4, s.key);
    if (onTrackChange) onTrackChange(cur);
    setAngle(normalize(idx * STEP));
    gaTrack("track_change", { title: cur.title, slug: cur.slug, idx });
    detent(); // detent SFX
    // Trigger warp flash overlay briefly when locking into a station
    try { setShowWarp(true); } catch {}
    if (warpTimerRef.current !== undefined) clearTimeout(warpTimerRef.current);
    warpTimerRef.current = window.setTimeout(() => { setShowWarp(false); warpTimerRef.current = undefined; }, 820);

    // Delay music start to allow warp SFX to play; align with lightspeed overlay (≈1800ms)
    if (cur.src) {
      const WARP_MS = 1800;
      warpPlayTimerRef.current = window.setTimeout(() => {
        const a2 = audioRef.current; if (!a2) return;
        try { a2.muted = false; a2.volume = 1.0; } catch {}
        // Already playing muted; just mark playing and ensure it continues
        a2.play().catch(()=>{});
        setPlaying(true);
        warpPlayTimerRef.current = undefined;
      }, WARP_MS);
    }
  }, [idx]); // eslint-disable-line

  // Cleanup any pending warp timers on unmount
  useEffect(() => () => {
    if (warpTimerRef.current !== undefined) { clearTimeout(warpTimerRef.current); }
    if (warpPlayTimerRef.current !== undefined) { clearTimeout(warpPlayTimerRef.current); }
  }, []);

  // External play signal: play current track if it has audio; otherwise jump to first with local audio
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    if (cur?.src) {
      a.load();
      try { a.muted = false; a.volume = 1.0; } catch {}
      a.play()
        .then(() => { setPlaying(true); onPlayingChange(true); gaTrack("play", { slug: cur.slug }); })
        .catch(() => setPlaying(false));
      return;
    }
    // Fallback: find first track that has a local audio src
    const withAudio = tracks.findIndex(t => !!t.src);
    if (withAudio >= 0) {
      setIdx(withAudio);
      setTimeout(() => {
        const a2 = audioRef.current; if (!a2) return;
        a2.load(); try { a2.muted = false; a2.volume = 1.0; } catch {}
        a2.play().then(() => { setPlaying(true); onPlayingChange(true); gaTrack("play", { slug: tracks[withAudio].slug }); }).catch(()=>setPlaying(false));
      }, 0);
    }
  }, [playSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // External toggle signal from steering wheel: if paused, play current (or first with audio); if playing, pause
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) {
      // Start playing muted immediately, then unmute after warp SFX/overlay
      if (warpPlayTimerRef.current !== undefined) { clearTimeout(warpPlayTimerRef.current); warpPlayTimerRef.current = undefined; }
      const WARP_MS = 1800;
      if (cur?.src) {
        a.load();
        try { a.muted = true; a.volume = 0.0; } catch {}
        a.play().catch(()=>{});
        warpPlayTimerRef.current = window.setTimeout(() => {
          const ax = audioRef.current; if (!ax) return;
          try { ax.muted = false; ax.volume = 1.0; } catch {}
          ax.play().catch(()=>{});
          setPlaying(true); onPlayingChange(true); gaTrack("play", { slug: cur.slug });
          warpPlayTimerRef.current = undefined;
        }, WARP_MS);
      } else {
        // Fallback to first with audio
        const withAudio = tracks.findIndex(t => !!t.src);
        if (withAudio >= 0) {
          setIdx(withAudio);
          // Begin muted immediately, then unmute after warp
          warpPlayTimerRef.current = window.setTimeout(() => {
            const a2 = audioRef.current; if (!a2) return;
            try { a2.muted = false; a2.volume = 1.0; } catch {}
            a2.play().catch(()=>{});
            setPlaying(true); onPlayingChange(true); gaTrack("play", { slug: tracks[withAudio].slug });
            warpPlayTimerRef.current = undefined;
          }, WARP_MS);
        }
      }
    } else {
      a.pause(); setPlaying(false); onPlayingChange(false); gaTrack("pause", { slug: cur.slug });
    }
  }, [toggleSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  function uiClick() { const a = uiClickRef.current; if (!a) return; a.currentTime = 0; a.volume = 0.5; a.play().catch(()=>{}); }
  function detent()  { const d = detentRef.current; if (!d) return; d.currentTime = 0; d.volume = 0.6; d.play().catch(()=>{}); }

  function prev() { uiClick(); setIdx((p) => wrapChannels ? (p - 1 + tracks.length) % tracks.length : Math.max(0, p - 1)); }
  function next() { uiClick(); setIdx((p) => wrapChannels ? (p + 1) % tracks.length : Math.min(tracks.length - 1, p + 1)); }
  function toggle() {
    uiClick();
    const a = audioRef.current; if (!a) return;
    if (!cur.src) {
      // No local audio: jump to the first track with local audio and play
      const withAudio = tracks.findIndex(t => !!t.src);
      if (withAudio >= 0) {
        setIdx(withAudio);
        setTimeout(() => {
          const a2 = audioRef.current; if (!a2) return;
          a2.load();
          a2.play().then(()=>{ setPlaying(true); gaTrack("play", { slug: tracks[withAudio].slug }); }).catch(()=>setPlaying(false));
        }, 0);
      }
      return;
    }
    if (a.paused) { try { a.muted = false; a.volume = 1.0; } catch {}; a.play().then(()=>{ setPlaying(true); gaTrack("play", { slug: cur.slug }); }).catch(()=>setPlaying(false)); }
    else { a.pause(); setPlaying(false); gaTrack("pause", { slug: cur.slug }); }
  }

  useEffect(() => {
    // Keep local playing state in sync with the audio element's real state
    const a = audioRef.current; if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnded);
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnded);
    };
  }, [audioRef.current]);

  useEffect(() => {
    // Prime audio on first real user pointer/touch interaction to satisfy autoplay
    const unlock = () => {
      const a = audioRef.current; if (!a) return;
      try { a.load(); } catch {}
      a.play().catch(() => {
        try {
          a.muted = true;
          a.play().then(() => { setTimeout(() => { try { a.muted = false; } catch {} }, 60); }).catch(()=>{});
        } catch {}
      });
    };
    window.addEventListener('pointerdown', unlock, { once: true } as any);
    window.addEventListener('touchstart', unlock, { once: true } as any);
    return () => {
      window.removeEventListener('pointerdown', unlock as any);
      window.removeEventListener('touchstart', unlock as any);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore global hotkeys when typing in an input/textarea/contenteditable
      try {
        const ae = (document.activeElement as HTMLElement | null);
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || (ae as any).isContentEditable)) return;
      } catch {}
      // Prime audio on first interaction to satisfy autoplay policies
      try {
        const a = audioRef.current;
        if (a && a.paused) {
          // Ensure element is loaded and attempt to start playback; fallback to muted start then unmute
          try { a.load(); } catch {}
          a.play().catch(() => {
            try {
              a.muted = true;
              a.play().then(() => { setTimeout(() => { try { a.muted = false; } catch {} }, 50); }).catch(() => {});
            } catch {}
          });
        }
      } catch {}
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); prev(); }
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); next(); }
      else if (e.code === "Space" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); toggle(); }
      else if (/^[1-9]$/.test(e.key)) {
        const n = Number(e.key) - 1; if (n < tracks.length) { uiClick(); setIdx(n); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, wrapChannels, tracks.length]);

  // Dial interactions moved to StationDialOverlay; keep keyboard + prev/next here
  function onWheel(_e: React.WheelEvent) {}
  function onPointerDown(_e: React.PointerEvent) {}
  function onPointerMove(_e: React.PointerEvent) {}
  function onPointerUp(_e: React.PointerEvent) {}

  // mobile swipe
  const touchStart = useRef<{x:number;y:number}|null>(null);
  function onTouchStart(e: React.TouchEvent) { const t = e.touches[0]; touchStart.current = { x: t.clientX, y: t.clientY }; }
  function onTouchEnd(e: React.TouchEvent) {
    const s = touchStart.current; if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x, dy = t.clientY - s.y;
    touchStart.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) next(); else prev();
  }

  // ALBUM ART PLACEHOLDER (auto, no file needed)
  const placeholder = useMemo(() => {
    const title = encodeURIComponent(cur.title);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop stop-color='#0b0f1a' offset='0'/>
          <stop stop-color='#1a2240' offset='1'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <circle cx='50%' cy='50%' r='180' fill='none' stroke='rgba(255,255,255,.25)' stroke-width='6'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
            fill='white' font-size='28' font-family='OrbitronLocal, Orbitron, sans-serif'>${title}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${svg}`;
  }, [cur.title]);

  return (
    <div className="hud-card console-hud h-full w-full" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} aria-label="Media dock">
      {showWarp ? createPortal(<div className="warp-flash" style={{ zIndex: 120 }} aria-hidden />, document.body) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="text-left">
            <div className="text-sm md:text-base opacity-90 leading-tight truncate">{cur.title}</div>
            <div className="text-xs md:text-sm opacity-60 leading-tight line-clamp-2">{cur.subtitle}</div>
          </div>
        </div>
        <div className="proj" title={cur.title}>
          <div className="beam" aria-hidden />
          <div className="plate">
            <img
              src={cur.cover}
              alt={cur.title}
              className="plate-img"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = placeholder; }}
            />
            <span className="plate-sheen" aria-hidden />
          </div>
          <div className="emitter" aria-hidden />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button onClick={prev}  className="hud-chip" aria-label="Previous">◀</button>
        {showHUDPlay ? (
          <button onClick={toggle} className="hud-chip" aria-label="Play/Pause">{playing ? "Pause" : "Play"}</button>
        ) : null}
        <button onClick={next}  className="hud-chip" aria-label="Next">▶</button>
        <button onClick={() => setPickerOpen((o)=>!o)} className="hud-chip" aria-haspopup="listbox" aria-expanded={pickerOpen} aria-label="Select song">Select</button>
      </div>

      {pickerOpen ? (
        <div className="picker hud-card mt-3" role="dialog" aria-label="Select a song">
          <div className="text-xs opacity-70 mb-2">Choose a track</div>
          <div className="picker-list" role="listbox">
            {tracks.map((t, i) => (
              <button
                key={t.slug}
                role="option"
                aria-selected={i === idx}
                className={`picker-item ${i===idx ? 'active' : ''}`}
                onClick={()=>{ setIdx(i); setPickerOpen(false); }}
                title={t.title}
              >
                <span className="truncate">{t.title}</span>
                {i===idx ? <span className="ml-2 opacity-70">•</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {typeof document !== 'undefined' ? createPortal(
        <audio
          ref={audioRef}
          src={cur.src}
          controls={false}
          className="media-dock-audio"
          data-audio-player="1"
          loop
          preload="auto"
          playsInline
          onError={() => {
            const a = audioRef.current; if (!a) return;
            a.removeAttribute("src"); a.load(); setPlaying(false);
          }}
          style={{ position:'fixed', width:0, height:0, opacity:0, pointerEvents:'none', left:0, top:0 }}
        />,
        document.body
      ) : null}

      {/* SFX: reuse an existing asset to avoid 404; you can provide distinct files in /public/ui */}
      <audio ref={uiClickRef}  src="/audio/click.mp3" preload="auto" />
      <audio ref={detentRef}   src="/audio/change-channel.mp3" preload="auto" />

      <style jsx>{`
        /* Upward hologram projection rig */
        .proj{
          position:relative;
          /* Scale with container to stay clear of the console-hud clip edges */
          width: clamp(120px, 34%, 170px);
          height: clamp(160px, 42%, 230px);
          display:flex; align-items:flex-end; justify-content:center;
          perspective:1100px;
        }
        .emitter{
          position:absolute; bottom:0; width:70%; height:14px; border-radius:9999px;
          background: radial-gradient(closest-side, rgba(0,255,170,.8), rgba(0,255,170,.15) 60%, rgba(0,255,170,0) 70%);
          box-shadow: 0 0 24px rgba(0,255,170,.45), 0 0 46px rgba(0,255,170,.25);
          filter: saturate(1.1);
        }
        .beam{
          position:absolute; left:10%; right:10%; bottom:10px; top:22%; z-index:0;
          clip-path: polygon(12% 100%, 88% 100%, 98% 0, 2% 0);
          background: linear-gradient(180deg, rgba(0,255,200,.08), rgba(0,255,200,.16) 40%, rgba(0,255,200,.0) 100%);
          filter: blur(6px);
          mix-blend-mode: screen; opacity:.9;
        }
        .plate{
          position:absolute; bottom:38%; width:82%; aspect-ratio:1/1; border-radius:14px;
          box-shadow:
            0 10px 26px rgba(0,0,0,.45),
            0 0 26px rgba(0,255,220,.22),
            inset 0 1px 0 rgba(255,255,255,.25),
            inset 0 -8px 18px rgba(0,0,0,.35);
          transform: rotateX(14deg);
          overflow:hidden;
          animation: float 3.6s ease-in-out infinite;
          z-index:1;
        }
        /* Nudge art smaller on wider screens to avoid right-edge clipping */
        @media (min-width: 1024px) {
          .proj{ width: clamp(120px, 32%, 170px); }
          .plate{ width: 78%; }
        }
        @media (max-width: 640px) {
          .proj{ width: clamp(110px, 38%, 160px); }
          .plate{ width: 80%; }
        }
        .plate-img{ width:100%; height:100%; object-fit:cover; filter:saturate(1.1) contrast(1.05) brightness(1.03); }
        .plate:after{ /* scanlines */
          content:""; position:absolute; inset:0; pointer-events:none;
          background: repeating-linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.05) 1px, transparent 1px, transparent 3px);
          mix-blend-mode: screen; opacity:.22;
        }
        .plate-sheen{
          position:absolute; top:-30%; left:-60%; width:60%; height:160%;
          background: linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.28) 50%, rgba(255,255,255,0) 100%);
          transform: rotate(12deg);
          filter: blur(1px); opacity:.65; pointer-events:none;
          animation: sheenMove 4.4s ease-in-out infinite;
        }
        @keyframes sheenMove { 0% { transform: translateX(0) rotate(12deg);} 100% { transform: translateX(340%) rotate(12deg);} }
        @keyframes float { 0%,100% { transform: rotateX(14deg) translateY(0);} 50% { transform: rotateX(14deg) translateY(-6px);} }

        .picker{
          max-height: 40vh;
          overflow: auto;
        }
        .picker-list{ display:flex; flex-direction:column; gap:6px; }
        .picker-item{
          display:flex; align-items:center; justify-content:space-between;
          width:100%; text-align:left; padding:8px 10px; border-radius:10px;
          background: rgba(255,255,255,.06);
        }
        .picker-item.active{ outline:1px solid rgba(255,255,255,.25); }
      `}</style>
    </div>
  );
}

/* utils */
function normalize(a: number) { a = a % 360; if (a < 0) a += 360; return a; }
function degreesFromCenter(x:number, y:number, cx:number, cy:number) {
  const rad = Math.atan2(y - cy, x - cx);
  const degFromRightCCW = (rad * 180) / Math.PI;
  const degFromUpCW = (450 - degFromRightCCW) % 360;
  return normalize(degFromUpCW);
}
