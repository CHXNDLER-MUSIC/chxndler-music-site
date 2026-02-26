"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/sfx";
import { useAudio } from "@/app/providers/AudioProvider";
import { trackKeyFromSlug } from "@/utils/trackKeyFromSlug";
import { playerStore } from "@/store/usePlayerStore";
import { useCycleList } from "@/lib/useCycleList";
import { ElementIcon as OptimizedElementIcon } from "@/lib/elementIcons";
import { useNextDrop } from "@/hooks/useNextDrop";

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
  const elementFilterHoverRef = useRef(null);
  const [activeElement, setActiveElement] = useState(null);

  // Supabase-backed next drop config
  const { nextDrop } = useNextDrop();

  // Next-drop countdown (ticks only while dropdown is open and nextDrop exists)
  const [dropCountdown, setDropCountdown] = useState(0);
  useEffect(() => {
    if (!open || !nextDrop?.target) return;
    const target = new Date(nextDrop.target).getTime();
    const tick = () => setDropCountdown(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [open, nextDrop]);

  const normalizeSlug = (slug) => (slug ? String(slug).toLowerCase().replace(/'/g, '') : '');
  const current = useMemo(() => {
    const a = normalizeSlug(activeId);
    return items.find(i => normalizeSlug(i.id) === a) || items[0];
  }, [items, activeId]);

  // Check if currentId is an element planet (not in items list) - used for display
  const isElementWarp = useMemo(() => {
    if (!currentId) return false;
    const normalizedCurrentId = normalizeSlug(currentId);
    const elementPlanets = ['heart', 'water', 'lightning', 'darkness', 'center'];
    return elementPlanets.includes(normalizedCurrentId) && !items.some(i => normalizeSlug(i.id) === normalizedCurrentId);
  }, [currentId, items]);

  // Get element display name (uppercase) for element warps
  const elementDisplayName = useMemo(() => {
    if (!isElementWarp) return null;
    const id = String(currentId).toUpperCase();
    // Display "Heartverse" instead of "CENTER" for the center planet
    if (id === 'CENTER') return 'Heartverse';
    return id;
  }, [isElementWarp, currentId]);

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

  // When opening the menu, measure one option's height and cap list to avoid overlapping cover art
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      try {
        const h = optMeasureRef.current?.offsetHeight || 0;
        const baseMax = h > 0 ? h * 10 : 380;

        // Calculate available space: from trigger bottom to safe zone above cover art
        // Cover art is at bottom: 60px with ~110px height, so reserve ~180px from viewport bottom
        const viewportHeight = window.innerHeight;
        const triggerBottom = rootRef.current?.getBoundingClientRect()?.bottom || 0;
        const coverArtReserve = 100; // Reserve space for cover art container at bottom-right
        const availableSpace = viewportHeight - triggerBottom - coverArtReserve;

        // Use the smaller of calculated space or base max, with minimum of 120px for usability
        const finalMax = Math.max(120, Math.min(baseMax, availableSpace));
        setMaxListHeight(finalMax);
      } catch {
        setMaxListHeight(160); // Smaller fallback to be safe
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
      const item = displayItems[highlight];
      const id = item?.id;
      if (id && !item?.locked) {
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
    <div ref={rootRef} className="w-full relative z-[99999] mt-7" style={{ pointerEvents: 'auto' }}>
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
            // When element warp, use the element name as icon; otherwise use song icon or music
            const headerIconName = !currentId ? 'music' : (isElementWarp ? String(currentId).toLowerCase() : (current?.icon || 'music'));
            const dataIcon = headerIconName === 'music' ? 'music' : 'element';
            return (
              <span
                className="songs-icon"
                data-icon={dataIcon}
              >
                <OptimizedElementIcon
                  name={headerIconName}
                  alt={!currentId ? "Music" : (isElementWarp ? elementDisplayName : (current?.title || "Music"))}
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
            {!currentId ? 'MUSIC' : (isElementWarp ? elementDisplayName : (current?.title || 'SONGS'))}
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
          className="fixed z-[100000] overflow-y-auto overflow-x-hidden rounded-[8px] border border-[#19E3FF]/60 bg-[rgba(8,26,32,0.6)] backdrop-blur-xl shadow-[0_6px_18px_rgba(0,0,0,0.45)] holo-scrollbar"
          style={{
            position: 'fixed',
            top: triggerRect.bottom + window.scrollY + 2,
            left: triggerRect.left + window.scrollX,
            width: triggerRect.width,
            maxHeight: maxListHeight ? `${maxListHeight}px` : '200px',
            overflowY: 'auto',
            overflowX: 'hidden',
            pointerEvents: 'auto',
            zIndex: 100000
          }}
        >
          {/* ── NEXT DROP / OUT NOW song row ─────────── */}
          {nextDrop && (() => {
            // Match by slug first, then fall back to title match
            const nextDropItem = items.find(i => normalizeSlug(i.id) === normalizeSlug(nextDrop.slug))
              || items.find(i => i.title?.toUpperCase() === nextDrop.title?.toUpperCase());
            // Use the matched item's actual id so warp/onChange receives the correct slug
            const nextDropId = nextDropItem?.id || nextDrop.slug;
            // Default to locked if item cannot be matched to ensure safe gating for logged-out/WANDERER
            const isNextDropLocked = nextDropItem?.locked ?? true;
            const nextDropIcon = nextDropItem?.icon || 'darkness';

            // Build countdown string for locked display
            let countdownStr = null;
            if (dropCountdown > 0) {
              const ts = Math.floor(dropCountdown / 1000);
              const dd = Math.floor(ts / 86400);
              const hh = Math.floor((ts % 86400) / 3600);
              const mm = Math.floor((ts % 3600) / 60);
              const ss = ts % 60;
              const pad = (n) => String(n).padStart(2, '0');
              countdownStr = dd > 0 ? `${dd}d ${pad(hh)}h` : `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
            }

            return (
              <div
                role="option"
                aria-disabled={isNextDropLocked}
                className={`opt next-drop-row flex items-center gap-3 px-3 py-3 text-sm transition-all duration-200 w-full ${
                  isNextDropLocked
                    ? "cursor-not-allowed"
                    : "cursor-pointer text-cyan-200/90 hover:bg-cyan-400/10 hover:text-cyan-100"
                }`}
                style={{
                  // Stronger constant glow, even when locked/logged-out
                  boxShadow: '0 0 28px rgba(25,227,255,0.35), 0 0 64px rgba(25,227,255,0.25), inset 0 0 24px rgba(25,227,255,0.25)',
                  background: 'linear-gradient(135deg, rgba(25, 227, 255, 0.12) 0%, rgba(25, 227, 255, 0.06) 100%)',
                  borderBottom: '1px solid rgba(25, 227, 255, 0.35)',
                }}
                onMouseEnter={() => {
                  if (!isNextDropLocked) {
                    try { setTimeout(() => playerStore.getState().setHover(nextDropId), 0); } catch {};
                  }
                  try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {};
                }}
                onMouseLeave={() => { /* intentionally noop; clear on close */ }}
                onPointerDown={(e) => {
                  if (isNextDropLocked) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  setActiveId(nextDropId);
                  setOpen(false);
                  if (onChange) onChange(nextDropId);
                  try {
                    setTimeout(() => {
                      const state = playerStore.getState();
                      if (state) state.setHover(null);
                    }, 0);
                  } catch {}
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {/* Left: element icon (match song rows) */}
                <span className="shrink-0">
                  <ElementIcon name={nextDropIcon} />
                </span>
                {/* Middle: top row with title + right countdown/lock, below hint */}
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={`song-title truncate font-semibold text-[#9EEBFF] flex-1 min-w-0`}>
                      {nextDrop.title}
                    </span>
                    {countdownStr ? (
                      <span className="shrink-0 flex items-center gap-2" style={{ transform: 'translateY(-1px)' }}>
                        <span style={{
                          fontSize: '11px',
                          fontFamily: "'SF Mono', 'Fira Code', monospace",
                          color: '#FFFFFF',
                          letterSpacing: '0.05em',
                        }}>
                          {countdownStr}
                        </span>
                        {isNextDropLocked && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a 5 5 0 0 1 10 0v4" />
                          </svg>
                        )}
                      </span>
                    ) : null}
                  </span>
                  <span style={{
                    marginTop: '2px',
                    fontSize: '9px',
                    lineHeight: 1.2,
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}>
                    {dropCountdown > 0 ? (
                      <>
                        <span style={{ color: '#FFFFFF' }}>Signal unlocked for </span>
                        <span style={{ color: '#F2EF1D' }}>DREAMERS</span>
                        <span style={{ color: '#FFFFFF' }}> & </span>
                        <span style={{ color: '#FC54AF' }}>LOVERS</span>
                      </>
                    ) : (
                      <span style={{ color: '#00FFFF', textShadow: '0 0 6px rgba(0,255,255,0.5)' }}>[ OUT NOW ]</span>
                    )}
                  </span>
                </span>
                {/* Right column no longer needed; countdown/lock are inline with title */}
              </div>
            );
          })()}

          {/* Element filter rows */}
          <div className="px-1.5 pt-2 pb-1 flex flex-col gap-1">
            {/* ALL filter - full width top row */}
            <button
              type="button"
              onMouseEnter={() => {
                try {
                  const a = elementFilterHoverRef.current;
                  if (a) {
                    a.currentTime = 0;
                    a.volume = 0.3;
                    a.play().catch(() => {});
                  }
                } catch {}
              }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveElement(null);
                setHighlight(0);
                try { sfx.play('change', 0.35); } catch {}
              }}
              className={`filter-pill w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-sm font-semibold tracking-wide transition-all duration-200 ${
                !activeElement
                  ? 'bg-[#19E3FF]/30 text-[#CFF7FF] border-[#19E3FF]/60'
                  : 'border-[#19E3FF]/40 text-[#CFF7FF] hover:bg-cyan-400/10'
              }`}
              style={!activeElement ? {
                boxShadow: 'inset 0 0 8px rgba(25, 227, 255, 0.15), inset 0 0 16px rgba(25, 227, 255, 0.08)',
                textShadow: '0 0 4px rgba(25, 227, 255, 0.5), 0 0 8px rgba(25, 227, 255, 0.3)'
              } : {}}
              aria-pressed={!activeElement}
            >
              <span style={!activeElement ? {
                textShadow: '0 0 4px rgba(25, 227, 255, 0.5), 0 0 8px rgba(25, 227, 255, 0.3)'
              } : {}}>ALL</span>
            </button>

            {/* Element icons - always on same line */}
            <div className="flex items-center justify-between w-full shrink-0">
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
                      try { const a = elementFilterHoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {}
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Toggle: if clicking the active element, deselect it, otherwise select it
                      const newActiveElement = active ? null : el;
                      setActiveElement(newActiveElement);
                      setHighlight(0);
                      try { sfx.play('change', 0.35); } catch {}
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
            const isLocked = !!s.locked;

            // Build countdown string for locked tracks
            let lockCountdown = null;
            if (isLocked && s.unlockDate) {
              const diff = Math.max(0, new Date(s.unlockDate).getTime() - Date.now());
              const ts = Math.floor(diff / 1000);
              const dd = Math.floor(ts / 86400);
              const hh = Math.floor((ts % 86400) / 3600);
              const mm = Math.floor((ts % 3600) / 60);
              const pad = (n) => String(n).padStart(2, '0');
              lockCountdown = dd > 0 ? `${dd}d ${pad(hh)}h` : `${pad(hh)}:${pad(mm)}`;
            }

            return (
              <div
                key={s.id}
                role="option"
                aria-selected={isActive}
                aria-disabled={isLocked}
                className={`opt flex items-center gap-3 px-3 py-3 text-sm transition-all duration-200 w-full ${
                  isLocked
                    ? "cursor-not-allowed opacity-50"
                    : `cursor-pointer ${isHighlight ? "bg-cyan-400/20 text-cyan-100" : "text-cyan-200/90 hover:bg-cyan-400/10 hover:text-cyan-100"}`
                }`}
                ref={i === 0 ? optMeasureRef : undefined}
                onMouseEnter={() => {
                  setHighlight(i);
                  if (!isLocked) {
                    try { setTimeout(() => playerStore.getState().setHover(s.id), 0); } catch{};
                  }
                  try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {};
                }}
                // Keep last hover active to avoid rapid hide/show flicker while moving
                onMouseLeave={() => { /* intentionally noop; clear on close */ }}
                onPointerDown={(e) => {
                  if (isLocked) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
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
                <span className={`song-title truncate font-semibold ${isLocked ? 'text-[#5a7a88]' : isActive ? 'text-[#CFF7FF]' : 'text-[#9EEBFF]'}`}>{s.title}</span>
                {isLocked && (
                  <span className="ml-auto flex items-center gap-1.5 shrink-0">
                    {lockCountdown && (
                      <span style={{
                        fontSize: '10px',
                        fontFamily: "'SF Mono', 'Fira Code', monospace",
                        color: 'rgba(252, 84, 175, 0.7)',
                        letterSpacing: '0.05em',
                      }}>
                        {lockCountdown}
                      </span>
                    )}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(252, 84, 175, 0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                )}
              </div>
            );
          })}
          <audio ref={hoverRef} src="/audio/change-channel.mp3" preload="auto" />
          <audio ref={elementFilterHoverRef} src="/audio/change-channel.mp3" preload="auto" />
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
          transform: scale(1.02);
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
        /* Boost glow specifically for the Next Drop row */
        .next-drop-row{
          border-color: rgba(25,227,255,0.45) !important;
          outline-color: rgba(25,227,255,0.8) !important;
          box-shadow: 0 0 28px rgba(25,227,255,0.35), 0 0 64px rgba(25,227,255,0.25), inset 0 0 24px rgba(25,227,255,0.25) !important;
          background: linear-gradient(135deg, rgba(25, 227, 255, 0.12) 0%, rgba(25, 227, 255, 0.06) 100%) !important;
        }
        .next-drop-row:hover{
          box-shadow: 0 0 52px rgba(25,227,255,0.7), 0 0 90px rgba(25,227,255,0.45), inset 0 0 28px rgba(25,227,255,0.35) !important;
          border-color: rgba(25,227,255,0.85) !important;
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
