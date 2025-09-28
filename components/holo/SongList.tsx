"use client";

import React, { useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useCycleList } from "@/lib/useCycleList";

export default function SongList({ onSongChange }: { onSongChange?: (id: string) => void }) {
  const { songs, mainId, hoverId, setHover, setMain } = usePlayerStore();
  const main = songs.find((s) => s.id === mainId);
  const { activeId, setActiveId, handleKeyDown, next, prev } = useCycleList(songs, mainId || undefined, (id) => setMain(id));

  useEffect(() => { 
    if (mainId && mainId !== activeId) {
      setActiveId(mainId); 
    }
  }, [mainId, activeId, setActiveId]);
  
  // Avoid redundant hover updates to prevent churn in consumers that react to hover changes
  useEffect(() => {
    if (!activeId) return;
    if (hoverId !== activeId) setHover(activeId);
  }, [activeId, hoverId, setHover]);

  // Scroll-driven hover highlight: choose the item closest to the list's vertical center
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const setItemRef = (id: string) => (el: HTMLButtonElement | null) => {
    if (!el) { itemRefs.current.delete(id); return; }
    itemRefs.current.set(id, el);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf: number | null = null;
    const pick = () => {
      raf = null;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height * 0.5;
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const [id, node] of itemRefs.current) {
        const r = node.getBoundingClientRect();
        const cy = r.top + r.height * 0.5;
        const d = Math.abs(cy - mid);
        if (d < bestDist) { bestDist = d; bestId = id; }
      }
      if (bestId && bestId !== hoverId) setHover(bestId);
    };
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(pick); };
    el.addEventListener('scroll', onScroll, { passive: true });
    pick();
    const onResize = () => { if (raf == null) raf = requestAnimationFrame(pick); };
    window.addEventListener('resize', onResize);
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); if (raf) cancelAnimationFrame(raf); };
  }, [hoverId, songs.length, setHover]);

  return (
    <div className="h-full flex flex-col">
      <header className="mb-4 px-1 flex-shrink-0">
        <h1 className="text-cyan-300 text-3xl md:text-4xl font-extrabold drop-shadow-cyan">
          {main?.title ?? '—'}
        </h1>
        <p className="text-cyan-100/80 text-base md:text-lg">
          {main?.oneLiner ?? ''}
        </p>
      </header>
      <div
        ref={containerRef}
        role="listbox"
        aria-label="Songs"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex-1 overflow-y-auto overflow-x-hidden pr-1 custom-scroll w-full"
      >
      {songs.map((s) => {
        const isMain = s.id === mainId;
        const isHover = s.id === hoverId;
        return (
          <button
            key={s.id}
            role="option"
            aria-selected={isMain}
            data-id={s.id}
            ref={setItemRef(s.id)}
            onMouseEnter={() => setHover(s.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(s.id)}
            onBlur={() => setHover(null)}
            onClick={() => {
              setHover(s.id);
              setMain(s.id);
              onSongChange?.(s.id);
            }}
            onTouchStart={(e) => {
              // Prevent both touch and click events from firing
              e.preventDefault();
              setHover(s.id);
              setMain(s.id);
              onSongChange?.(s.id);
            }}
            className={`w-full text-left px-4 py-4 mb-3 rounded-lg transition-all duration-200
              ring-1 backdrop-blur-sm
              ${isMain ? "bg-cyan-300/15 ring-cyan-300/60 shadow-[0_0_20px_rgba(61,245,255,0.4)]" : isHover ? "bg-cyan-300/12 ring-cyan-300/50 shadow-[0_0_15px_rgba(61,245,255,0.3)]" : "bg-white/5 ring-white/10"}
              hover:bg-cyan-300/12 hover:ring-cyan-300/50 hover:shadow-[0_0_25px_rgba(61,245,255,0.5)] hover:scale-[1.02]
              focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:shadow-[0_0_20px_rgba(61,245,255,0.4)]
              text-base text-cyan-50`}
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{
                  background: s.planet.color || "#3DF5FF",
                  boxShadow: "0 0 15px 3px rgba(61,245,255,0.6)",
                }}
              />
              <span className="font-semibold break-words text-lg">{s.title}</span>
            </div>
            <div className="text-cyan-200/80 text-sm break-words mt-1">{s.oneLiner}</div>
          </button>
        );
      })}
        {/* Optional: small prev/next controls for accessibility on touch devices */}
        <div className="flex items-center justify-end gap-3 mt-3">
          <button type="button" onClick={prev} className="px-3 py-2 rounded-md text-sm text-cyan-200/80 hover:text-cyan-50 hover:bg-cyan-400/10 hover:shadow-[0_0_10px_rgba(61,245,255,0.3)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400">Prev</button>
          <button type="button" onClick={next} className="px-3 py-2 rounded-md text-sm text-cyan-200/80 hover:text-cyan-50 hover:bg-cyan-400/10 hover:shadow-[0_0_10px_rgba(61,245,255,0.3)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400">Next</button>
        </div>
      </div>
    </div>
  );
}
