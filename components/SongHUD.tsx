"use client";
import React from "react";
import Image from "next/image";
import { useAudio } from "@/app/providers/AudioProvider";

export default function SongHUD({ title, coverSrc, element }: { title: string; coverSrc: string; element: string; }) {
  const { currentTime, duration, playing, play, pause, seek } = useAudio();
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  return (
    <div className="fixed left-1/2 bottom-10 -translate-x-1/2 z-20 pointer-events-auto"
         style={{
           background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.2)',
           borderRadius: 16, backdropFilter: 'blur(10px)', padding: 12,
           boxShadow: '0 10px 24px rgba(0,0,0,.4)'
         }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, minWidth: 320 }}>
        <span className="hud-cover relative overflow-hidden" style={{ display: 'inline-block', borderRadius: 10, width: 52, height: 52 }}>
          <Image src={coverSrc} alt={title} width={52} height={52} priority className="rounded object-cover w-full h-full" />
          {/* Subtle blue interior to match waveform styling */}
          <span className="hud-blue-fill-overlay pointer-events-none absolute inset-0 mix-blend-overlay" />
          {/* Inner neon rim */}
          <span className="pointer-events-none absolute inset-0 rounded-[10px] ring-1 ring-[#19E3FF]/40" />
          {/* Scanlines for texture */}
          <span className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen"
                style={{ background: 'repeating-linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.12) 1px, transparent 1px, transparent 3px)' }} />
        </span>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 800, letterSpacing: '.02em' }}>{title}</div>
          <div style={{ fontSize: 12, opacity: .8 }}>Element: {element}</div>
        </div>
        <button onClick={playing ? pause : play} className="ml-3 px-3 py-1 rounded bg-white/10 border border-white/20">
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
      <div onClick={(e:any)=>{
            const rect = e.currentTarget.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width; seek((duration||0) * nx);
          }}
          className="mt-3 h-2 w-full rounded bg-white/10 cursor-pointer"
          title="Seek">
        <div className="h-2 rounded" style={{ width: `${pct}%`, background: 'var(--color-primary, #19E3FF)' }} />
      </div>
    </div>
  );
}
<style jsx>{`
  .hud-cover{
    outline:1px solid rgba(25,227,255,.20);
    box-shadow: 0 0 18px rgba(25,227,255,.12);
    transition: transform .15s ease, box-shadow .2s ease, outline-color .2s ease;
  }
  .hud-cover:hover{
    transform: translateZ(0) scale(1.04);
    outline-color: rgba(25,227,255,.8);
    box-shadow: 0 0 42px rgba(25,227,255,.6), 0 0 70px rgba(25,227,255,.35);
  }
  /* Subtle blue tint by default, stronger on hover */
  .hud-blue-fill-overlay{ background-color: rgba(25, 227, 255, 0.12); transition: background-color .2s ease; }
  .hud-cover:hover .hud-blue-fill-overlay{ background-color: rgba(25, 227, 255, 0.30); }
`}</style>
