"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
};

export default function MediaDock({ onSkyChange, onPlayingChange, onTrackChange, wrapChannels = true, startSignal = 0, startIndex = 0, playSignal = 0, toggleSignal = 0, showHUDPlay = true }: Props) {
  const [idx, setIdx] = useState(startIndex);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement|null>(null);
  const uiClickRef = useRef<HTMLAudioElement|null>(null);
  const detentRef = useRef<HTMLAudioElement|null>(null);
  const dialRef = useRef<HTMLDivElement|null>(null);

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

  // load on index change; update sky; attempt autoplay if the track has local audio
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    a.load();
    if (cur.src) {
      a.play().then(()=>{ setPlaying(true); }).catch(()=> setPlaying(false));
    } else {
      setPlaying(false);
    }
    const s = skyFor(cur.slug);
    onSkyChange(s.webm, s.mp4, s.key);
    if (onTrackChange) onTrackChange(cur);
    setAngle(normalize(idx * STEP));
    gaTrack("track_change", { title: cur.title, slug: cur.slug, idx });
    detent(); // detent SFX
  }, [idx]); // eslint-disable-line

  // External play signal: play current track if it has audio; otherwise jump to first with audio
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    if (cur?.src) {
      a.load();
      a.play()
        .then(() => { setPlaying(true); onPlayingChange(true); gaTrack("play", { slug: cur.slug }); })
        .catch(() => setPlaying(false));
      return;
    }
    // find first track that has a local audio src
    const withAudio = tracks.findIndex(t => !!t.src);
    if (withAudio >= 0) {
      setIdx(withAudio);
      setTimeout(() => {
        const a2 = audioRef.current; if (!a2) return;
        a2.load();
        a2.play().then(() => { setPlaying(true); onPlayingChange(true); gaTrack("play", { slug: tracks[withAudio].slug }); }).catch(()=>setPlaying(false));
      }, 0);
    }
  }, [playSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // External toggle signal from steering wheel: if paused, play current (or first with audio); if playing, pause
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) {
      if (cur?.src) {
        a.load();
        a.play().then(() => { setPlaying(true); onPlayingChange(true); gaTrack("play", { slug: cur.slug }); }).catch(()=>setPlaying(false));
      } else {
        const withAudio = tracks.findIndex(t => !!t.src);
        if (withAudio >= 0) {
          setIdx(withAudio);
          setTimeout(() => {
            const a2 = audioRef.current; if (!a2) return;
            a2.load();
            a2.play().then(() => { setPlaying(true); onPlayingChange(true); gaTrack("play", { slug: tracks[withAudio].slug }); }).catch(()=>setPlaying(false));
          }, 0);
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
      // No local audio: open streaming link instead
      const url = cur.spotify || cur.apple;
      if (url) {
        try { window.open(url, "_blank", "noopener,noreferrer"); } catch {}
      }
      // Inform ambient system to pause by signaling 'playing'
      try { onPlayingChange(true); } catch {}
      setPlaying(false);
      return;
    }
    if (a.paused) a.play().then(()=>{ setPlaying(true); gaTrack("play", { slug: cur.slug }); }).catch(()=>setPlaying(false));
    else { a.pause(); setPlaying(false); gaTrack("pause", { slug: cur.slug }); }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in a field so numbers don't change channel
      try {
        const ae = (document.activeElement as HTMLElement | null);
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || (ae as any).isContentEditable)) return;
      } catch {}
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === " ") { e.preventDefault(); toggle(); }
      else if (/^[1-9]$/.test(e.key)) {
        const n = Number(e.key) - 1; if (n < tracks.length) { uiClick(); setIdx(n); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tracks.length]);

  function onWheel(e: React.WheelEvent) {
    if (e.deltaY > 0) next(); else prev();
    setAngle((v) => normalize(v + (e.deltaY > 0 ? STEP : -STEP)));
  }
  function onPointerDown(e: React.PointerEvent) { (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); }
  function onPointerMove(e: React.PointerEvent) {
    if (!(e.buttons & 1)) return;
    const el = dialRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const deg = degreesFromCenter(e.clientX, e.clientY, cx, cy);
    const snappedIndex = Math.round(deg / STEP) % tracks.length;
    const snappedAngle = normalize(snappedIndex * STEP);
    if (snappedIndex !== idx) setIdx(snappedIndex);
    setAngle(snappedAngle);
  }
  function onPointerUp(e: React.PointerEvent) { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); setAngle(normalize(idx * STEP)); }

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
      <div className="flex items-center gap-3">
        <img
          src={cur.cover}
          alt={cur.title}
          className="h-16 w-16 rounded-xl object-cover border border-white/15"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = placeholder; }}
        />
        <div className="flex-1">
          <div className="text-sm opacity-90">{cur.title}</div>
          <div className="text-xs opacity-60">{cur.subtitle}</div>
        </div>

        <div
          ref={dialRef}
          className="dial select-none"
          title="Channel changer (drag, scroll, swipe, ←/→, 1-9)"
          onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        >
          <div className="dial-pointer" style={{ transform: `translateX(-50%) rotate(${angle}deg)` }} />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button onClick={prev}  className="hud-chip" aria-label="Previous">◀</button>
        {showHUDPlay ? (
          <button onClick={toggle} className="hud-chip" aria-label="Play/Pause">{playing ? "Pause" : "Play"}</button>
        ) : null}
        <button onClick={next}  className="hud-chip" aria-label="Next">▶</button>
      </div>

      <audio
        ref={audioRef}
        src={cur.src}
        controls={!!cur.src}
        controlsList="noplaybackrate nodownload nofullscreen noremoteplayback"
        className="w-full mt-2"
        preload="metadata"
        onError={() => {
          const a = audioRef.current; if (!a) return;
          a.removeAttribute("src"); a.load(); setPlaying(false);
        }}
      />

      {/* SFX: reuse an existing asset to avoid 404; you can provide distinct files in /public/ui */}
      <audio ref={uiClickRef}  src="/audio/click.mp3" preload="auto" />
      <audio ref={detentRef}   src="/audio/change-channel.mp3" preload="auto" />
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
