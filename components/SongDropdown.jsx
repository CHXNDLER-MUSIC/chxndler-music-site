"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/sfx";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useCycleList } from "@/lib/useCycleList";
import { track } from "@/lib/analytics";
import { trackSecure } from "@/lib/secureAnalytics";
import { ElementIcon as OptimizedElementIcon } from "@/lib/elementIcons";

function ElementIcon({ name }) {
  const colorFor = (key) => {
    const k = String(key || '').toLowerCase();
    if (k.includes('water')) return '#38B6FF';
  if (k.includes('heart')) return '#FC54AF';
  if (k.includes('lightning') || k.includes('electric')) return '#FFC700';
    if (k.includes('earth')) return '#F2EF1D';
    if (k.includes('air')) return '#8BF9FF';
    if (k.includes('dark')) return '#000000';
    return '#38B6FF';
  };
  const outer = String(name || '').toLowerCase().includes('dark') ? '#19E3FF' : colorFor(name);
  const glowStyle = { filter: `brightness(1.35) saturate(1.6) drop-shadow(0 0 16px ${outer}) drop-shadow(0 0 40px ${outer}) drop-shadow(0 0 70px ${outer})`, transform: 'translateZ(0)' };
  
  // Map names to icon keys
  let iconKey = name;
  if (name === "electric") iconKey = "lightning";
  if (name === "fire") iconKey = "lightning"; // fallback to lightning asset
  if (name === "earth") iconKey = "heart"; // fallback visual
  if (name === "air") iconKey = "water"; // fallback visual
  
  const validIcons = ["heart", "lightning", "darkness", "water"];
  if (!validIcons.includes(iconKey)) return null;
  
  return (
    <span className="holo-icon" style={glowStyle}>
      <OptimizedElementIcon name={iconKey} alt={name} className="w-5 h-5 object-contain" width={20} height={20} />
    </span>
  );
}

export default function SongDropdown({ items = [], initialActiveId, onChange, currentId }) {
  const { activeId, setActiveId, next, prev, handleKeyDown } = useCycleList(items, initialActiveId, onChange);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const optMeasureRef = useRef(null);
  const [maxListHeight, setMaxListHeight] = useState(null);
  const [triggerRect, setTriggerRect] = useState(null);
  const [mounted, setMounted] = useState(false);
  const hoverRef = useRef(null);
  const clickRef = useRef(null);
  const hoverBtnRef = useRef(null);

  const current = useMemo(() => items.find(i => i.id === activeId) || items[0], [items, activeId]);

  // Set mounted state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setHighlight(Math.max(0, items.findIndex(i => i.id === activeId)));
  }, [activeId, items]);

  // Update trigger button position when opening dropdown
  useEffect(() => {
    if (open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      setTriggerRect(rect);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // When opening the menu, measure one option's height and cap list to 6 rows
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      try {
        const h = optMeasureRef.current?.offsetHeight || 0;
        if (h > 0) setMaxListHeight(h * 5);
        else setMaxListHeight(180); // fallback
      } catch {
        setMaxListHeight(180);
      }
    });
    return () => cancelAnimationFrame(raf);
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
      if (id) { 
        setActiveId(id); 
        onChange?.(id); 
        // Track keyboard navigation
        track("song_hovered", {
          song_id: id,
          song_title: items[nh]?.title || 'Unknown',
          hover_method: 'keyboard_down'
        });
      }
      try { setTimeout(() => usePlayerStore.getState().setHover(id || null), 0); } catch {}
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nh = (highlight - 1 + items.length) % items.length;
      setHighlight(nh);
      const id = items[nh]?.id;
      if (id) { 
        setActiveId(id); 
        onChange?.(id); 
        // Track keyboard navigation
        track("song_hovered", {
          song_id: id,
          song_title: items[nh]?.title || 'Unknown',
          hover_method: 'keyboard_up'
        });
      }
      try { setTimeout(() => usePlayerStore.getState().setHover(id || null), 0); } catch {}
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
      const id = items[0]?.id;
      if (id) { setActiveId(id); onChange?.(id); }
      try { setTimeout(() => usePlayerStore.getState().setHover(id || null), 0); } catch {}
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      const nh = items.length - 1;
      setHighlight(nh);
      const id = items[nh]?.id;
      if (id) { setActiveId(id); onChange?.(id); }
      try { setTimeout(() => usePlayerStore.getState().setHover(id || null), 0); } catch {}
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const id = items[highlight]?.id;
      if (id) { setActiveId(id); onChange?.(id); }
      setOpen(false);
      // Playback will start after warp SFX delay via MediaPlayer
      try { usePlayerStore.getState().setHover(null); } catch {}
    }
  }

  if (!items.length) return null;

  return (
    <div ref={rootRef} className="w-full relative z-[99999]" style={{ pointerEvents: 'auto' }}>
      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="song-dropdown-list"
        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {}; try { const a = hoverBtnRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
        onClick={() => { 
          try { sfx.play('join', 0.75); } catch {}; try { const a = clickRef.current; if (a) { a.currentTime = 0; a.volume = 0.75; a.play().catch(()=>{}); } } catch {}; setOpen((v) => { const nv = !v; try { setTimeout(() => usePlayerStore.getState().setHover(nv ? (items[highlight]?.id || null) : null), 0); } catch {}; return nv; }); 
        }}
        onKeyDown={onTriggerKeyDown}
        className="songs-trigger w-full flex items-center justify-between gap-2 px-2 py-3 rounded-[10px] border-2 border-[#19E3FF]/80 bg-cyan-400/10 backdrop-blur-xl shadow-[0_0_18px_rgba(25,227,255,0.35)] focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="songs-icon">
            <OptimizedElementIcon 
              name={!currentId ? "music" : (current?.icon || "music")} 
              alt={!currentId ? "Music" : (current?.title || "Music")} 
              className="w-7 h-7 object-contain" 
              width={28} 
              height={28} 
            />
          </span>
          <span className="songs-label truncate text-[16px] font-semibold tracking-wide">{!currentId ? 'CHXNDLER' : (current?.title || 'SONGS')}</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="opacity-80 text-[#9EEBFF]"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
      </button>

      {/* Dropdown list rendered via portal to escape stacking context */}
      {open && mounted && triggerRect && typeof window !== 'undefined' ? createPortal(
        <div
          id="song-dropdown-list"
          role="listbox"
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          ref={listRef}
          className="fixed z-[100000] max-h-[240px] overflow-y-auto overflow-x-hidden rounded-[8px] border border-[#19E3FF]/60 bg-[rgba(8,26,32,0.6)] backdrop-blur-xl shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
          style={{
            position: 'fixed',
            top: triggerRect.bottom + window.scrollY + 6,
            left: triggerRect.left + window.scrollX,
            width: triggerRect.width,
            maxHeight: maxListHeight ? `${maxListHeight}px` : '240px',
            overflowY: 'auto',
            overflowX: 'hidden',
            pointerEvents: 'auto',
            zIndex: 100000
          }}
        >
          {items.map((s, i) => {
            const isActive = s.id === activeId;
            const isHighlight = i === highlight;
            return (
              <div
                key={s.id}
                role="option"
                aria-selected={isActive}
                className={`opt flex items-center gap-3 px-3 py-3 text-sm cursor-pointer transition-all duration-200 w-full ${
                  isHighlight ? "bg-cyan-400/20 text-cyan-100" : "text-cyan-200/90 hover:bg-cyan-400/10 hover:text-cyan-100"
                }`}
                ref={i === 0 ? optMeasureRef : undefined}
                onMouseEnter={() => { 
                  setHighlight(i); 
                  try { setTimeout(() => usePlayerStore.getState().setHover(s.id), 0); } catch{}; 
                  try { sfx.play('hover', 0.35); } catch {}; 
                  try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {};
                  // Track hover event
                  track("song_hovered", {
                    song_id: s.id,
                    song_title: s.title,
                    hover_method: 'mouse'
                  });
                }}
                onMouseLeave={() => { try { setTimeout(() => usePlayerStore.getState().setHover(null), 0); } catch{} }}
                onPointerDown={(e) => {
                  // Play warp sound
                  try { sfx.play('warp', 0.9); } catch {}
                  try { const c = clickRef.current; if (c) { c.currentTime = 0; c.volume = 0.9; c.play().catch(()=>{}); } } catch {}
                  
                  // Track song selection
                  track("song_selected", {
                    song_id: s.id,
                    song_title: s.title,
                    song_icon: s.icon || 'none'
                  });
                  trackSecure("song_selected", {
                    song_id: s.id,
                    song_title: s.title,
                    song_icon: s.icon || 'none'
                  });
                  
                  setActiveId(s.id); 
                  if (onChange) {
                    onChange(s.id);
                  }
                  setOpen(false);
                  
                  try { 
                    setTimeout(() => {
                      const state = usePlayerStore.getState();
                      if (state) {
                        state.setHover(null);
                      }
                    }, 0); 
                  } catch(error) {
                    if (process.env.NODE_ENV !== 'production') { 
                      console.error('Failed to clear hover state:', error); 
                    }
                  }
                  
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <span className="shrink-0">
                  <ElementIcon name={s.icon} />
                </span>
                <span className={`song-title truncate font-semibold ${isActive ? 'text-[#CFF7FF]' : 'text-[#9EEBFF]'}`}>{s.title}</span>
              </div>
            );
          })}
          <audio ref={hoverRef} preload="auto">
            <source src="/audio/hover.mp3" type="audio/mpeg" />
            <source src="/audio/song-select.mp3" type="audio/mpeg" />
          </audio>
        </div>,
        document.body
      ) : null}
      {/* Click SFX */}
      <audio ref={clickRef} src="/audio/join-alien.mp3" preload="auto" />
      {/* Hover SFX for button */}
      <audio ref={hoverBtnRef} preload="auto">
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
      <style jsx>{`
        /* Glow behavior similar to cover art */
        .songs-trigger{ outline:1px solid rgba(25,227,255,.35); transition: transform .15s ease, box-shadow .2s ease, outline-color .2s ease; }
        .songs-trigger:hover{
          transform: scale(1.04);
          outline-color: rgba(25,227,255,.8);
          box-shadow: 0 0 52px rgba(25,227,255,.7), 0 0 90px rgba(25,227,255,.45);
        }
        /* List options: add subtle rim + glow on hover */
        .opt{ 
          border-radius:12px; 
          background: rgba(8,26,32,0.45); 
          border:1px solid rgba(25,227,255,0.18); 
          margin-bottom: 4px; 
          width: 100%;
          min-height: 44px;
          display: flex;
          align-items: center;
          pointer-events: auto;
        }
        .opt:hover{ 
          border-color: rgba(25,227,255,0.8); 
          background: rgba(25, 227, 255, 0.3);
          box-shadow: 
            0 0 20px rgba(25,227,255,.4), 
            0 0 40px rgba(25,227,255,.2),
            inset 0 0 15px rgba(25,227,255,.2); 
          transform: translateZ(0) scale(1.02);
          color: rgba(255, 255, 255, 1) !important;
        }
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
        .opt:hover .holo-icon{ 
          filter: brightness(1.5) saturate(2) drop-shadow(0 0 12px currentColor); 
          transform: scale(1.1); 
          animation-duration: 1.5s; 
        }
        .opt:hover .song-title{ 
          color: rgba(255, 255, 255, 1) !important; 
          text-shadow: none; 
          filter: none;
        }
      `}</style>
    </div>
  );
}
