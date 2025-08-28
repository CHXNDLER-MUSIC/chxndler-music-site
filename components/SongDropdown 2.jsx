"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCycleList } from "@/lib/useCycleList";

function ElementIcon({ name }) {
  const cn = "w-4 h-4 object-contain";
  if (name === "heart") return <img src="/elements/heart.png" alt="Heart" className={cn} />;
  if (name === "lightning" || name === "electric") return <img src="/elements/lighting.png" alt="Lightning" className={cn} />;
  if (name === "darkness") return <img src="/elements/darkness.png" alt="Darkness" className={cn} />;
  if (name === "water") return <img src="/elements/water.png" alt="Water" className={cn} />;
  if (name === "fire") return <img src="/elements/lighting.png" alt="Lightning" className={cn} />; // fallback to lightning asset
  if (name === "earth") return <img src="/elements/heart.png" alt="Heart" className={cn} />; // fallback visual
  if (name === "air") return <img src="/elements/water.png" alt="Water" className={cn} />; // fallback visual
  return null;
}

export default function SongDropdown({ items = [], initialActiveId, onChange }) {
  const { activeId, setActiveId, next, prev, handleKeyDown } = useCycleList(items, initialActiveId, onChange);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);

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
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => (h + 1) % items.length); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => (h - 1 + items.length) % items.length); return; }
    if (e.key === "Home") { e.preventDefault(); setHighlight(0); return; }
    if (e.key === "End") { e.preventDefault(); setHighlight(items.length - 1); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const id = items[highlight]?.id;
      if (id) { setActiveId(id); onChange?.(id); }
      setOpen(false);
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
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[10px] border-2 border-[#19E3FF]/80 bg-white/5 backdrop-blur-xl shadow-[0_0_18px_rgba(25,227,255,0.35)] focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">
            <ElementIcon name={current?.icon} />
          </span>
          <span className="truncate text-sm text-[#CFF7FF]">{current?.title}</span>
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
          className="absolute z-30 mt-2 w-full max-h-64 overflow-y-auto rounded-[10px] border border-[#19E3FF]/60 bg-black/70 backdrop-blur-xl shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
        >
          {items.map((s, i) => {
            const isActive = s.id === activeId;
            const isHighlight = i === highlight;
            return (
              <div
                key={s.id}
                role="option"
                aria-selected={isActive}
                className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${isHighlight ? 'bg-cyan-400/15' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => { setActiveId(s.id); onChange?.(s.id); setOpen(false); }}
              >
                <span className="shrink-0">
                  <ElementIcon name={s.icon} />
                </span>
                <span className={`truncate ${isActive ? 'text-[#CFF7FF]' : 'text-[#9EEBFF]'}`}>{s.title}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
