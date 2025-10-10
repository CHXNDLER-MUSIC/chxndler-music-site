"use client";

import React, { useEffect, useRef } from "react";
import { playerStore } from "@/store/usePlayerStore";
import { useCycleList } from "@/lib/useCycleList";

export default function SongList({ onSongChange }: { onSongChange?: (id: string) => void }) {
  const [storeSnap, setStoreSnap] = React.useState(() => playerStore.getState());
  React.useEffect(() => playerStore.subscribe(() => setStoreSnap(playerStore.getState())), []);
  const { songs, mainId, hoverId } = storeSnap as any;
  const setHover = (id: string | null) => playerStore.getState().setHover(id);
  const setMain = (id: string) => playerStore.getState().setMain(id);
  
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
    <>
      <style jsx>{`
        .song-list-scroll::-webkit-scrollbar {
          width: 16px;
          background: rgba(0,0,0,0.3);
        }
        .song-list-scroll::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          box-shadow: inset 0 0 6px rgba(25,227,255,0.1);
        }
        .song-list-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, 
            rgba(25,227,255,0.8) 0%, 
            rgba(25,227,255,0.6) 50%, 
            rgba(25,227,255,0.4) 100%
          );
          border-radius: 10px;
          border: 2px solid rgba(25,227,255,0.35);
          box-shadow: 
            0 0 14px rgba(25,227,255,0.7),
            0 0 28px rgba(25,227,255,0.35),
            inset 0 0 6px rgba(25,227,255,0.45);
          animation: scrollGlow 1.8s ease-in-out infinite alternate;
        }
        .song-list-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, 
            rgba(25,227,255,1) 0%, 
            rgba(25,227,255,0.8) 50%, 
            rgba(25,227,255,0.6) 100%
          );
          box-shadow: 
            0 0 20px rgba(25,227,255,0.9),
            0 0 40px rgba(25,227,255,0.45),
            inset 0 0 10px rgba(25,227,255,0.6);
          animation: none;
        }
        @keyframes scrollGlow {
          0% {
            box-shadow: 
              0 0 10px rgba(25,227,255,0.5),
              inset 0 0 5px rgba(25,227,255,0.3);
          }
          100% {
            box-shadow: 
              0 0 22px rgba(25,227,255,0.9),
              inset 0 0 12px rgba(25,227,255,0.6);
          }
        }
      `}</style>
      <div className="h-full flex flex-col" style={{ pointerEvents: 'auto' }}>
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
        className="flex-1 overflow-y-auto overflow-x-hidden pr-1 song-list-scroll w-full"
        style={{
          scrollbarWidth: 'auto',
          scrollbarColor: 'rgba(25,227,255,0.7) rgba(0,0,0,0.25)',
        }}
      >
      {songs.length === 0 && (
        <div className="text-cyan-300 p-4">No songs available</div>
      )}
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
            // Keep the last hovered planet highlighted; do not clear on leave
            // This makes the hover effect more consistent as users move the mouse
            // between items in the list without flicker
            onMouseLeave={() => { /* keep hover until a new item is hovered */ }}
            onFocus={() => setHover(s.id)}
            onBlur={() => setHover(null)}
            onClick={(e) => {
              // Use the new planetDisplayMode system for clean state management
              setMain(s.id); // This already sets planetDisplayMode to 'hidden' in the store
              
              // Call the onSongChange callback to notify parent (DashboardApp)
              if (onSongChange) {
                onSongChange(s.id);
              }
            }}
            style={{ 
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
            className="w-full text-left px-4 py-4 mb-3 rounded-lg"
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
    </>
  );
}
