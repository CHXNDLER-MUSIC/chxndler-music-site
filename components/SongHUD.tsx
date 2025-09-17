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
        <Image src={coverSrc} alt={title} width={48} height={48} priority className="rounded" />
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

