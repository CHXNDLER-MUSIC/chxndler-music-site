"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/sfx";
import { useAudio } from "@/app/providers/AudioProvider";
import { trackKeyFromSlug } from "@/utils/trackKeyFromSlug";
import { playerStore } from "@/store/usePlayerStore";
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
      <OptimizedElementIcon name={iconKey} alt={name} className="w-6 h-6 object-contain" width={24} height={24} />
    </span>
  );
}

export default function SongDropdown({ items = [], initialActiveId, onChange, currentId }) {
  const audioManager = useAudio();
  const { activeId, setActiveId, next, prev, handleKeyDown } = useCycleList(items, initialActiveId, onChange);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const lastScrollAtRef = useRef(0);
  const optMeasureRef = useRef(null);
  const [maxListHeight, setMaxListHeight] = useState(null);
  const [triggerRect, setTriggerRect] = useState(null);
  const [mounted, setMounted] = useState(false);
  const hoverRef = useRef(null);
  const clickRef = useRef(null);
  const hoverBtnRef = useRef(null);
  const [activeElement, setActiveElement] = useState(null);

  const normalizeSlug = (slug) => (slug ? String(slug).toLowerCase().replace(/'/g, '') : '');
  const current = useMemo(() => {
    const a = normalizeSlug(activeId);
    return items.find(i => normalizeSlug(i.id) === a) || items[0];
  }, [items, activeId]);

  // Set mounted state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filtered/visible list based on selected element
  const displayItems = useMemo(() => {
    if (!activeElement) return items;
    return items.filter((i) => {
      const itemIcon = String(i.icon || '').toLowerCase();
      return itemIcon === activeElement;
    });
  }, [items, activeElement]);

  // Keep highlight in sync with the visible list
  useEffect(() => {
    const a = normalizeSlug(activeId);
    const idx = displayItems.findIndex(i => normalizeSlug(i.id) === a);
    setHighlight(Math.max(0, idx === -1 ? 0 : idx));
  }, [activeId, displayItems]);

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
      // Check if click is within the trigger button
      if (rootRef.current && rootRef.current.contains(e.target)) return;
      // Check if click is within the dropdown list (portal)
      if (listRef.current && listRef.current.contains(e.target)) return;
      // If neither, close the dropdown
      setOpen(false);
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

  // Play subtle scroll SFX while scrolling the dropdown (rate-limited)
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const last = lastScrollAtRef.current || 0;
      if (now - last > 220) {
        lastScrollAtRef.current = now;
        try { sfx.play('scroll', 0.22); } catch {}
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { try { el.removeEventListener('scroll', onScroll); } catch {} };
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
    if (!displayItems.length) { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); } return; }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nh = (highlight + 1) % displayItems.length;
      setHighlight(nh);
      const id = displayItems[nh]?.id;
      if (id) { 
        setActiveId(id); 
        // Do not trigger selection while navigating; only track hover
        track("song_hovered", {
          song_id: id,
          song_title: displayItems[nh]?.title || 'Unknown',
          hover_method: 'keyboard_down'
        });
      }
      try { setTimeout(() => playerStore.getState().setHover(id || null), 0); } catch {}
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nh = (highlight - 1 + displayItems.length) % displayItems.length;
      setHighlight(nh);
      const id = displayItems[nh]?.id;
      if (id) { 
        setActiveId(id); 
        // Do not trigger selection while navigating; only track hover
        track("song_hovered", {
          song_id: id,
          song_title: displayItems[nh]?.title || 'Unknown',
          hover_method: 'keyboard_up'
        });
      }
      try { setTimeout(() => playerStore.getState().setHover(id || null), 0); } catch {}
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
      const id = displayItems[0]?.id;
      if (id) { setActiveId(id); }
      try { setTimeout(() => playerStore.getState().setHover(id || null), 0); } catch {}
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      const nh = displayItems.length - 1;
      setHighlight(nh);
      const id = displayItems[nh]?.id;
      if (id) { setActiveId(id); }
      try { setTimeout(() => playerStore.getState().setHover(id || null), 0); } catch {}
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const id = displayItems[highlight]?.id;
      if (id) { 
        setActiveId(id);
        setOpen(false);
        // Audio is handled by parent component via onChange callback
        if (onChange) onChange(id);
      }
      // Clear hover state
      try { playerStore.getState().setHover(null); } catch {}
    }
  }

  if (!items.length) return null;

  return (
    <div ref={rootRef} className="w-full relative z-[99999] mt-3" style={{ pointerEvents: 'auto' }}>
      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="song-dropdown-list"
        data-tour-id="music-dropdown"
        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {}; try { const a = hoverBtnRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
        onClick={() => { 
      try { sfx.play('join', 0.75); } catch {}; try { const a = clickRef.current; if (a) { a.currentTime = 0; a.volume = 0.75; a.play().catch(()=>{}); } } catch {}; setOpen((v) => { const nv = !v; try { setTimeout(() => playerStore.getState().setHover(nv ? (displayItems[highlight]?.id || null) : null), 0); } catch {}; return nv; }); 
        }}
        onKeyDown={onTriggerKeyDown}
        className="songs-trigger w-full flex items-center justify-between gap-2 px-1.5 py-1.5 rounded-[10px] border-2 border-[#19E3FF]/80 bg-cyan-400/10 backdrop-blur-xl shadow-[0_0_18px_rgba(25,227,255,0.35)] focus:outline-none focus:ring-2 focus:ring-cyan-400 min-w-[240px]"
      >
        <span className="flex items-center gap-2 min-w-0">
          {(() => {
            const headerIconName = !currentId ? 'music' : (current?.icon || 'music');
            const dataIcon = headerIconName === 'music' ? 'music' : 'element';
            return (
              <span
                className="songs-icon"
                data-icon={dataIcon}
              >
                <OptimizedElementIcon 
                  name={headerIconName} 
                  alt={!currentId ? "Music" : (current?.title || "Music")} 
                  className="w-7 h-7 object-contain" 
                  width={28} 
                  height={28} 
                  priority
                />
              </span>
            );
          })()}
          <span
            className="songs-label truncate text-[16px] font-semibold tracking-wide"
            style={!currentId ? {
              color: '#ffffff',
              // Tight, close white glow around the letters (no halo)
              textShadow: '0 0 2px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.65)'
            } : undefined}
          >
            {!currentId ? 'MUSIC' : (current?.title || 'SONGS')}
          </span>
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
          className="fixed z-[100000] max-h-[240px] overflow-y-auto overflow-x-hidden rounded-[8px] border border-[#19E3FF]/60 bg-[rgba(8,26,32,0.6)] backdrop-blur-xl shadow-[0_6px_18px_rgba(0,0,0,0.45)] holo-scrollbar"
          style={{
            position: 'fixed',
            top: triggerRect.bottom + window.scrollY + 2,
            left: triggerRect.left + window.scrollX,
            width: triggerRect.width,
            maxHeight: maxListHeight ? `${maxListHeight}px` : '240px',
            overflowY: 'auto',
            overflowX: 'hidden',
            pointerEvents: 'auto',
            zIndex: 100000
          }}
        >
          {/* Element filter row */}
          <div className="px-1.5 pt-2 pb-1">
            <div className="flex items-center gap-0.5 flex-wrap">
              {/* ALL filter */}
              <button
                type="button"
                onMouseEnter={() => {
                  console.log('ALL filter hovered - attempting to play sound');
                  try { 
                    const a = hoverRef.current; 
                    console.log('hoverRef.current:', a);
                    if (a) { 
                      a.currentTime = 0; 
                      a.volume = 0.3; 
                      a.play().catch((err) => {
                        console.error('Failed to play hover sound:', err);
                      }); 
                    } else {
                      console.log('hoverRef.current is null');
                    }
                  } catch (e) {
                    console.error('Error in hover sound:', e);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveElement(null);
                  setHighlight(0);
                  try { sfx.play('change', 0.35); } catch {}
                  track('element_filter_selected', { element: 'ALL', active: true });
                }}
                className={`filter-pill inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-semibold tracking-wide transition-all duration-200 ${
                  !activeElement
                    ? 'bg-[#19E3FF] text-white border-[#19E3FF]' 
                    : 'border-[#19E3FF]/40 text-[#CFF7FF] hover:bg-cyan-400/10'
                }`}
                style={!activeElement ? {
                  boxShadow: 'inset 0 0 20px rgba(25, 227, 255, 0.4), inset 0 0 40px rgba(25, 227, 255, 0.2)',
                  textShadow: '0 0 3px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.7), 0 0 16px rgba(255,255,255,0.5)'
                } : {}}
                aria-pressed={!activeElement}
              >
                <span style={!activeElement ? {
                  textShadow: '0 0 3px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.7), 0 0 16px rgba(255,255,255,0.5)'
                } : {}}>ALL</span>
              </button>
              
              {['heart','water','lightning','darkness'].map((el) => {
                const active = activeElement === el;
                const getElementBgColor = (element, isActive) => {
                  if (!isActive) return '';
                  switch(element) {
                    case 'heart': return 'bg-[#FC54AF]';
                    case 'water': return 'bg-[#38B6FF]';
                    case 'lightning': return 'bg-[#F2EF1D]';
                    case 'darkness': return 'bg-white';
                    default: return '';
                  }
                };
                const getElementTextColor = (element, isActive) => {
                  if (!isActive) return 'text-white';
                  return element === 'darkness' ? 'text-black' : 'text-white';
                };
                const getElementGlowColor = (element) => {
                  switch(element) {
                    case 'heart': return 'rgba(252, 84, 175, 0.4)';
                    case 'water': return 'rgba(56, 182, 255, 0.4)';
                    case 'lightning': return 'rgba(242, 239, 29, 0.4)';
                    case 'darkness': return 'rgba(255, 255, 255, 0.4)';
                    default: return 'rgba(25, 227, 255, 0.4)';
                  }
                };
                return (
                  <button
                    key={el}
                    type="button"
                    data-element={el}
                    onMouseEnter={() => {
                      try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {}
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Toggle: if clicking the active element, deselect it, otherwise select it
                      const newActiveElement = active ? null : el;
                      setActiveElement(newActiveElement);
                      setHighlight(0);
                      try { sfx.play('change', 0.35); } catch {}
                      track('element_filter_selected', { element: (el || '').toUpperCase(), active: !active });
                    }}
                    className={`filter-pill inline-flex items-center justify-center p-1 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 ${
                      active 
                        ? '' 
                        : 'hover:bg-cyan-400/10'
                    }`}
                    aria-pressed={active}
                  >
                    <OptimizedElementIcon name={el} alt={el} className="w-10 h-10 object-contain" width={40} height={40} />
                  </button>
                );
              })}
            </div>
          </div>
          {/* Songs list */}
          {displayItems.map((s, i) => {
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
                  try { setTimeout(() => playerStore.getState().setHover(s.id), 0); } catch{}; 
                  try { sfx.play('change', 0.35); } catch {}; 
                  try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {};
                  // Track hover event
                  track("song_hovered", {
                    song_id: s.id,
                    song_title: s.title,
                    hover_method: 'mouse'
                  });
                }}
                // Keep last hover active to avoid rapid hide/show flicker while moving
                onMouseLeave={() => { /* intentionally noop; clear on close */ }}
                onPointerDown={(e) => {
                  // Track song selection (normalized: include slug + details)
                  track("song_selected", {
                    song_slug: (s.slug || s.id || '').toLowerCase?.() || (s.id || ''),
                    payload: {
                      song_title: s.title,
                      song_icon: s.icon || 'none',
                    }
                  });
                  trackSecure("song_selected", {
                    song_slug: (s.slug || s.id || '').toLowerCase?.() || (s.id || ''),
                    song_title: s.title,
                    song_icon: s.icon || 'none'
                  });
                  
                  // Set active id for UI state
                  setActiveId(s.id);
                  setOpen(false);
                  
                  // Audio is handled by parent component via onChange callback
                  if (onChange) onChange(s.id);
                  
                  try { 
                    setTimeout(() => {
                      const state = playerStore.getState();
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
            <source src="/audio/change-channel.mp3" type="audio/mpeg" />
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
          /* Remove scale to prevent visual size change */
          transform: none;
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
          /* Remove scale to prevent option height jitter */
          transform: none;
          color: rgba(255, 255, 255, 1) !important;
        }
        .holo-icon{ display:inline-flex; will-change: transform; }
        @keyframes holoPulse { 0%,100%{ transform: scale(1);} 50%{ transform: scale(1.06);} }
        .songs-icon{ display:inline-flex; align-items:center; 
          filter: brightness(1.25) saturate(1.6)
            drop-shadow(0 0 16px #19E3FF)
            drop-shadow(0 0 36px #19E3FF)
            drop-shadow(0 0 64px #19E3FF);
          /* Disable blend-mode to avoid compositing flicker over WebGL/canvas */
          mix-blend-mode: normal; 
          will-change: transform; 
          /* Avoid GPU re-composition flicker */
          backface-visibility: hidden; -webkit-backface-visibility: hidden;
          transform: translateZ(0);
        }
        /* Force neon-white glow when the music icon is shown in header */
        .songs-icon[data-icon="music"]{
          filter: brightness(2.0) contrast(1.12)
            drop-shadow(0 0 14px rgba(255,255,255,1))
            drop-shadow(0 0 36px rgba(255,255,255,0.95))
            drop-shadow(0 0 80px rgba(255,255,255,0.85));
          -webkit-filter: brightness(2.0) contrast(1.12)
            drop-shadow(0 0 14px rgba(255,255,255,1))
            drop-shadow(0 0 36px rgba(255,255,255,0.95))
            drop-shadow(0 0 80px rgba(255,255,255,0.85));
          mix-blend-mode: normal;
          /* no pulsing to avoid perceived flashing */
          animation: none;
        }
        .songs-icon[data-icon="music"] img{
          display: block;
          filter: brightness(2.0) contrast(1.15)
            drop-shadow(0 0 12px rgba(255,255,255,1))
            drop-shadow(0 0 28px rgba(255,255,255,0.95))
            drop-shadow(0 0 60px rgba(255,255,255,0.9));
          -webkit-filter: brightness(2.0) contrast(1.15)
            drop-shadow(0 0 12px rgba(255,255,255,1))
            drop-shadow(0 0 28px rgba(255,255,255,0.95))
            drop-shadow(0 0 60px rgba(255,255,255,0.9));
          backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: translateZ(0);
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
        /* Holographic scrollbar styling */
        .holo-scrollbar::-webkit-scrollbar {
          width: 16px;
          background: rgba(8, 26, 32, 0.8);
          border-radius: 8px;
        }
        .holo-scrollbar::-webkit-scrollbar-track {
          background: rgba(8, 26, 32, 0.4);
          border-radius: 8px;
          border: 1px solid rgba(25, 227, 255, 0.2);
          box-shadow: inset 0 0 8px rgba(25, 227, 255, 0.1);
        }
        .holo-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, 
            rgba(25, 227, 255, 0.8) 0%, 
            rgba(25, 227, 255, 0.6) 50%, 
            rgba(25, 227, 255, 0.4) 100%);
          border-radius: 8px;
          border: 2px solid rgba(25, 227, 255, 0.3);
          box-shadow: 
            0 0 12px rgba(25, 227, 255, 0.6),
            0 0 24px rgba(25, 227, 255, 0.3),
            inset 0 0 8px rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        .holo-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, 
            rgba(25, 227, 255, 1) 0%, 
            rgba(25, 227, 255, 0.8) 50%, 
            rgba(25, 227, 255, 0.6) 100%);
          box-shadow: 
            0 0 20px rgba(25, 227, 255, 0.8),
            0 0 40px rgba(25, 227, 255, 0.5),
            inset 0 0 12px rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }
        .holo-scrollbar::-webkit-scrollbar-corner {
          background: rgba(8, 26, 32, 0.8);
        }
        .filter-pill { 
          transition: all .2s ease;
        }
        .filter-pill:hover {
          outline: none;
        }
        /* Element-specific neon glows for circular buttons - inset glow */
        .filter-pill[data-element="heart"]:hover,
        .filter-pill[data-element="heart"][aria-pressed="true"] {
          box-shadow: inset 0 0 3px rgba(252, 84, 175, 1), inset 0 0 6px rgba(252, 84, 175, 0.7), inset 0 0 10px rgba(252, 84, 175, 0.4);
        }
        .filter-pill[data-element="water"]:hover,
        .filter-pill[data-element="water"][aria-pressed="true"] {
          box-shadow: inset 0 0 3px rgba(56, 182, 255, 1), inset 0 0 6px rgba(56, 182, 255, 0.7), inset 0 0 10px rgba(56, 182, 255, 0.4);
        }
        .filter-pill[data-element="lightning"]:hover,
        .filter-pill[data-element="lightning"][aria-pressed="true"] {
          box-shadow: inset 0 0 3px rgba(255, 199, 0, 1), inset 0 0 6px rgba(255, 199, 0, 0.7), inset 0 0 10px rgba(255, 199, 0, 0.4);
        }
        .filter-pill[data-element="darkness"]:hover,
        .filter-pill[data-element="darkness"][aria-pressed="true"] {
          box-shadow: inset 0 0 3px rgba(255, 255, 255, 1), inset 0 0 6px rgba(255, 255, 255, 0.7), inset 0 0 10px rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
}
