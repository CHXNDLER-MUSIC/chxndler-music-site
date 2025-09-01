"use client";

import React, { useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useCycleList } from "@/lib/useCycleList";

export default function SongList() {
  const { songs, mainId, hoverId, setHover, setMain } = usePlayerStore();
  const { activeId, setActiveId, handleKeyDown, next, prev } = useCycleList(songs, mainId || undefined, (id) => setMain(id));

  useEffect(() => { if (mainId && mainId !== activeId) setActiveId(mainId); }, [mainId]);
  useEffect(() => { if (activeId) setHover(activeId); }, [activeId]);

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
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Songs"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="h-[54vh] md:h-[58vh] overflow-y-auto pr-1 custom-scroll"
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
            onClick={() => setMain(s.id)}
            onTouchStart={() => {
              setHover(s.id);
              setMain(s.id);
            }}
            className={`w-full text-left px-3 py-2 mb-2 rounded-lg transition
              ring-1 backdrop-blur-sm
              ${isMain ? "bg-cyan-300/15 ring-cyan-300/60" : isHover ? "bg-cyan-300/10 ring-cyan-300/40" : "bg-white/5 ring-white/10"}
              hover:bg-cyan-300/10 hover:ring-cyan-300/40
              focus:outline-none focus:ring-2 focus:ring-cyan-400
              text-sm text-cyan-50`}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  background: s.planet.color || "#3DF5FF",
                  boxShadow: "0 0 12px 2px rgba(61,245,255,0.5)",
                }}
              />
              <span className="font-semibold">{s.title}</span>
            </div>
            <div className="text-cyan-200/70 text-xs">{s.oneLiner}</div>
          </button>
        );
      })}
      {/* Optional: small prev/next controls for accessibility on touch devices */}
      <div className="flex items-center justify-end gap-2 mt-2">
        <button type="button" onClick={prev} className="px-2 py-1 rounded-md text-[11px] text-cyan-200/80 hover:text-cyan-50 hover:bg-cyan-400/10 focus:outline-none focus:ring-2 focus:ring-cyan-400">Prev</button>
        <button type="button" onClick={next} className="px-2 py-1 rounded-md text-[11px] text-cyan-200/80 hover:text-cyan-50 hover:bg-cyan-400/10 focus:outline-none focus:ring-2 focus:ring-cyan-400">Next</button>
      </div>
    </div>
  );
}
