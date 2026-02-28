"use client";
import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useAudio } from "@/app/providers/AudioProvider";

export default function SongHUD({ title, coverSrc, element }: { title: string; coverSrc: string; element: string; }) {
  const { currentTime, duration, playing, play, pause, seek } = useAudio();
  const [isDragging, setIsDragging] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekAt = useCallback((clientX: number) => {
    const el = barRef.current;
    if (!el || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = rect.width > 0 ? x / rect.width : 0;
    seek(ratio * duration);
  }, [duration, seek]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    setIsDragging(true);
    try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
    e.preventDefault();
    handleSeekAt(e.clientX);
    const onMove = (ev: PointerEvent) => handleSeekAt(ev.clientX);
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }, [duration, handleSeekAt]);
  return (
    <div className="fixed left-1/2 bottom-10 -translate-x-1/2 z-20 pointer-events-auto"
         style={{
           background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.2)',
           borderRadius: 16, backdropFilter: 'blur(10px)', padding: 12,
           boxShadow: '0 10px 24px rgba(0,0,0,.4)'
         }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, minWidth: 320 }}>
        <span className="hud-cover relative overflow-hidden" style={{ display: 'inline-block', borderRadius: 10, width: 52, height: 52, WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden', WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}>
          <Image src={coverSrc} alt={title} width={52} height={52} priority className="rounded object-cover w-full h-full" />
          {/* Subtle blue interior to match waveform styling; avoid blend modes to prevent flicker */}
          <span className="hud-blue-fill-overlay pointer-events-none absolute inset-0" />
          {/* Inner neon rim */}
          <span className="pointer-events-none absolute inset-0 rounded-[10px] ring-1 ring-[#19E3FF]/40" />
          {/* Scanlines for texture */}
          <span className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen"
                style={{ background: 'repeating-linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.12) 1px, transparent 1px, transparent 3px)' }} />
        </span>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 12, opacity: .8 }}>Element: {element}</div>
        </div>
        <button
          onClick={() => {
            try {
              const mainToggle = (window as any)?.mainPlayerToggle;
              const main = document.querySelector<HTMLAudioElement>('audio[data-audio-player="1"]');
              if (typeof mainToggle === 'function' && main) { mainToggle(); return; }
            } catch {}
            // Fallback to provider controls
            if (playing) { try { pause(); } catch {} } else { try { play(); } catch {} }
          }}
          className="ml-3 px-3 py-1 rounded bg-white/10 border border-white/20"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
      <div
          ref={barRef}
          onClick={(e:any)=>{
            const rect = e.currentTarget.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width; seek((duration||0) * nx);
          }}
          onPointerDown={onPointerDown}
          className="mt-3 h-2 w-full rounded bg-white/10 cursor-pointer"
          title="Click or drag to seek"
          style={{ touchAction: 'none' }}>
        <div className="h-2 rounded" style={{ width: `${pct}%`, background: 'var(--color-primary, #19E3FF)' }} />
      </div>
    </div>
  );
}
