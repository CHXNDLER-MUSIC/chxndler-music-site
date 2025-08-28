"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useCycleList } from "@/lib/useCycleList";

function ElementIcon({ name }) {
  const cn = "w-4 h-4 object-contain";
  const colorFor = (key) => {
    const k = String(key || '').toLowerCase();
    if (k.includes('water')) return '#38B6FF';
    if (k.includes('heart')) return '#FC54AF';
    if (k.includes('lightning') || k.includes('electric')) return '#F2EF1D';
    if (k.includes('earth')) return '#F2EF1D';
    if (k.includes('air')) return '#8BF9FF';
    if (k.includes('dark')) return '#000000';
    return '#38B6FF';
  };
  const outer = String(name || '').toLowerCase().includes('dark') ? '#19E3FF' : colorFor(name);
  const glowStyle = { filter: `brightness(1.35) saturate(1.6) drop-shadow(0 0 16px ${outer}) drop-shadow(0 0 40px ${outer}) drop-shadow(0 0 70px ${outer})`, transform: 'translateZ(0)' };
  if (name === "heart") return <span className="holo-icon" style={glowStyle}><img src="/elements/heart.png" alt="Heart" className={cn} /></span>;
  if (name === "lightning" || name === "electric") return <span className="holo-icon" style={glowStyle}><img src="/elements/lighting.png" alt="Lightning" className={cn} /></span>;
  if (name === "darkness") return <span className="holo-icon" style={glowStyle}><img src="/elements/darkness.png" alt="Darkness" className={cn} /></span>;
  if (name === "water") return <span className="holo-icon" style={glowStyle}><img src="/elements/water.png" alt="Water" className={cn} /></span>;
  if (name === "fire") return <span className="holo-icon" style={glowStyle}><img src="/elements/lighting.png" alt="Lightning" className={cn} /></span>; // fallback to lightning asset
  if (name === "earth") return <span className="holo-icon" style={glowStyle}><img src="/elements/heart.png" alt="Heart" className={cn} /></span>; // fallback visual
  if (name === "air") return <span className="holo-icon" style={glowStyle}><img src="/elements/water.png" alt="Water" className={cn} /></span>; // fallback visual
  return null;
}

export default function SongDropdown({ items = [], initialActiveId, onChange }) {
  const { activeId, setActiveId, next, prev, handleKeyDown } = useCycleList(items, initialActiveId, onChange);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);
  const hoverRef = useRef(null);
  const clickRef = useRef(null);
  const hoverBtnRef = useRef(null);

  const current = useMemo(() => items.find(i => i.id === activeId) || items[0], [items, activeId]);

  useEffect(() => {
    setHighlight(Math.max(0, items.findIndex(i => i.id === activeId)));
  }, [activeId, items]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Keyboard for the closed combobox cycles songs directly
  function onTriggerKeyDown(e) {
    if (open) return; // when open, the list handles keys below
    if (e.key === "ArrowDown") { e.preventDefault(); next(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); prev(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); }
    else handleKeyDown(e);
  }

  function onListKeyDown(e) {
    if (!open) return;
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nh = (highlight + 1) % items.length;
      setHighlight(nh);
      const id = items[nh]?.id;
      if (id) { setActiveId(id); onChange?.(id); }
      try { usePlayerStore.getState().setHover(id || null); } catch {}
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nh = (highlight - 1 + items.length) % items.length;
      setHighlight(nh);
      const id = items[nh]?.id;
      if (id) { setActiveId(id); onChange?.(id); }
      try { usePlayerStore.getState().setHover(id || null); } catch {}
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
      const id = items[0]?.id;
      if (id) { setActiveId(id); onChange?.(id); }
      try { usePlayerStore.getState().setHover(id || null); } catch {}
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      const nh = items.length - 1;
      setHighlight(nh);
      const id = items[nh]?.id;
      if (id) { setActiveId(id); onChange?.(id); }
      try { usePlayerStore.getState().setHover(id || null); } catch {}
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const id = items[highlight]?.id;
      if (id) { setActiveId(id); onChange?.(id); }
      setOpen(false);
      try { usePlayerStore.getState().setHover(null); } catch {}
    }
  }

  if (!items.length) return null;

  return (
    <div ref={rootRef} className="w-full relative">
      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="song-dropdown-list"
        onMouseEnter={() => { try { const a = hoverBtnRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
        onClick={() => { try { const a = clickRef.current; if (a) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {}; setOpen((v) => { const nv = !v; try { usePlayerStore.getState().setHover(nv ? (items[highlight]?.id || null) : null); } catch {}; return nv; }); }}
        onKeyDown={onTriggerKeyDown}
        className="w-full flex items-center justify-between gap-2 px-2 py-3 rounded-[10px] border-2 border-[#19E3FF]/80 bg-cyan-400/10 backdrop-blur-xl shadow-[0_0_18px_rgba(25,227,255,0.35)] focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="songs-icon">
            <img src="/elements/music.png" alt="Music" className="w-7 h-7 object-contain" />
          </span>
          <span className="songs-label truncate text-[16px] font-semibold tracking-wide">SONGS</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="opacity-80 text-[#9EEBFF]"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
      </button>

      {/* Dropdown list */}
      {open ? (
        <div
          id="song-dropdown-list"
          role="listbox"
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          className="absolute z-[200] mt-1.5 w-full max-h-64 overflow-y-auto rounded-[8px] border border-[#19E3FF]/60 bg-[rgba(8,26,32,0.6)] backdrop-blur-xl shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
        >
          {items.map((s, i) => {
            const isActive = s.id === activeId;
            const isHighlight = i === highlight;
            return (
              <div
                key={s.id}
                role="option"
                aria-selected={isActive}
                className={"opt flex items-center gap-1.5 px-1.5 py-1 text-[9px] cursor-pointer transition"}
                onMouseEnter={() => { setHighlight(i); try { usePlayerStore.getState().setHover(s.id); } catch{}; try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
                onMouseLeave={() => { try { usePlayerStore.getState().setHover(null); } catch{} }}
                onClick={() => { try { const c = clickRef.current; if (c) { c.currentTime = 0; c.volume = 0.65; c.play().catch(()=>{}); } } catch {}; setActiveId(s.id); onChange?.(s.id); setOpen(false); try { usePlayerStore.getState().setHover(null); } catch{} }}
              >
                <span className="shrink-0">
                  <ElementIcon name={s.icon} />
                </span>
                <span className={`song-title truncate ${isActive ? 'text-[#CFF7FF]' : 'text-[#9EEBFF]'}`}>{s.title}</span>
              </div>
            );
          })}
          <audio ref={hoverRef} preload="auto">
            <source src="/audio/hover.mp3" type="audio/mpeg" />
            <source src="/audio/song-select.mp3" type="audio/mpeg" />
          </audio>
        </div>
      ) : null}
      {/* Click SFX */}
      <audio ref={clickRef} src="/audio/click.mp3" preload="auto" />
      {/* Hover SFX for button */}
      <audio ref={hoverBtnRef} preload="auto">
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
      <style jsx>{`
        .holo-icon{ display:inline-flex; will-change: transform; animation: holoPulse 2.6s ease-in-out infinite; }
        @keyframes holoPulse { 0%,100%{ transform: scale(1);} 50%{ transform: scale(1.06);} }
        .songs-icon{ display:inline-flex; align-items:center; 
          filter: brightness(1.25) saturate(1.6)
            drop-shadow(0 0 16px #19E3FF)
            drop-shadow(0 0 36px #19E3FF)
            drop-shadow(0 0 64px #19E3FF);
          mix-blend-mode: screen; will-change: transform; animation: holoPulse 2.2s ease-in-out infinite; transform: translateZ(0);
        }
        .songs-label{ color:#EFFFFF; text-shadow: none; }
        .opt:hover .holo-icon{ filter: none; transform: none; animation-duration: 2.6s; }
        .opt:hover .song-title{ color: inherit !important; text-shadow: none; }
      `}</style>
    </div>
  );
}
