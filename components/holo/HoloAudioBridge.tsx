"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { tracks } from "@/config/tracks";
import { usePlayerStore } from "@/store/usePlayerStore";

export default function HoloAudioBridge() {
  const { songs, mainId } = usePlayerStore((s) => ({ songs: s.songs, mainId: s.mainId }));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [idx, setIdx] = useState(0);
  const order = useMemo(() => tracks, []);

  // Map store mainId (slug) to tracks[] index
  useEffect(() => {
    if (!mainId) return;
    const i = order.findIndex((t) => (t.slug || "").toLowerCase() === mainId.toLowerCase() || (t.slug || "").toLowerCase().startsWith(mainId.toLowerCase()));
    if (i >= 0) setIdx(i);
  }, [mainId, order]);

  // Load+play on index change (when source exists)
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const cur = order[idx]; if (!cur) return;
    a.src = cur.src || "";
    a.load();
    if (cur.src) {
      a.play().catch(()=>{});
    }
  }, [idx, order]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when focusing inputs
      try {
        const ae = document.activeElement as HTMLElement | null;
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || (ae as any).isContentEditable)) return;
      } catch {}
      const a = audioRef.current; if (!a) return;
      if (e.key === ' ') { e.preventDefault(); if (a.paused) a.play().catch(()=>{}); else a.pause(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (a.paused) a.play().catch(()=>{}); else a.pause(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setIdx((p)=> (p - 1 + order.length) % order.length); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setIdx((p)=> (p + 1) % order.length); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order.length]);

  return (
    <audio ref={audioRef} data-audio-player="1" preload="auto" />
  );
}

