"use client";
import { useState, useEffect } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useCycleList } from "@/lib/useCycleList";

function Icon({ name }) {
  const cn = "w-4 h-4 opacity-90 object-contain";
  switch (name) {
    case "heart":
      return <img src="/elements/heart.png" alt="Heart" className={cn} />;
    case "lightning":
    case "electric": // backward-compat
      return <img src="/elements/lighting.png" alt="Lightning" className={cn} />;
    case "darkness":
      return <img src="/elements/darkness.png" alt="Darkness" className={cn} />;
    case "water":
      return <img src="/elements/water.png" alt="Water" className={cn} />;
    case "fire": // flame
      return (
        <svg viewBox="0 0 24 24" className={cn} aria-hidden>
          <path fill="currentColor" d="M13 3s1 3-2 6-2 5 0 7 6 1 7-3-2-6-5-10z"/>
        </svg>
      );
    case "earth": // leaf/rock
      return (
        <svg viewBox="0 0 24 24" className={cn} aria-hidden>
          <path fill="currentColor" d="M12 3C7 3 4 7 4 11s3 8 8 8 8-4 8-8-3-8-8-8Zm-1 5c3 0 5 2 5 5-3 0-5-2-5-5Z"/>
        </svg>
      );
    case "air": // wind swirl
      return (
        <svg viewBox="0 0 24 24" className={cn} aria-hidden>
          <path fill="currentColor" d="M3 10h12a3 3 0 1 0-3-3h2a1 1 0 1 1 1-1 1 1 0 0 1-1 1H3v3Zm0 6h14a3 3 0 1 0-3-3h2a1 1 0 1 1 1-1 1 1 0 0 1-1 1H3v3Z"/>
        </svg>
      );
    // Backward-compat fallbacks
    case "signal":
      return (<svg viewBox="0 0 24 24" className={cn} aria-hidden><path fill="currentColor" d="M3 18h2v-2H3v2zm4 0h2v-4H7v4zm4 0h2v-6h-2v6zm4 0h2v-8h-2v8zm4 0h2v-10h-2v10z"/></svg>);
    case "shell":
      return (<svg viewBox="0 0 24 24" className={cn} aria-hidden><path fill="currentColor" d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9Zm0 4a5 5 0 1 1 0 10A5 5 0 0 1 12 7Z"/></svg>);
    case "bee":
      return (<svg viewBox="0 0 24 24" className={cn} aria-hidden><path fill="currentColor" d="M12 7c2.8 0 5 2.2 5 5s-2.2 5-5 5-5-2.2-5-5 2.2-5 5-5Zm7 3h2v4h-2v-4ZM3 10h2v4H3v-4Z"/></svg>);
    case "wave":
    default:
      return (<svg viewBox="0 0 24 24" className={cn} aria-hidden><path fill="currentColor" d="M3 15c3 0 3-3 6-3s3 3 6 3 3-3 6-3v3c-3 0-3 3-6 3s-3-3-6-3-3 3-6 3v-3Z"/></svg>);
  }
}

export default function SongList({ items = [], initialActiveId, onChange, onHover }) {
  const setHoverStore = usePlayerStore((s) => s.setHover);
  const { activeId, next, prev, handleKeyDown } = useCycleList(items, initialActiveId, onChange);
  const [active, setActive] = useState(activeId || items[0]?.id);
  useEffect(() => { if (activeId) { setActive(activeId); onHover?.(activeId); setHoverStore?.(activeId); } }, [activeId]);

  return (
    <div
      className="w-full rounded-[12px] border-2 border-[#19E3FF]/90 bg-white/6 backdrop-blur-xl shadow-[0_0_28px_rgba(25,227,255,0.55)] p-2"
      role="listbox"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Songs"
    >
      {/* Controls: cycle previous/next */}
      <div className="flex items-center justify-end gap-2 px-1 pb-2">
        <button
          type="button"
          onClick={prev}
          className="px-2 py-1 rounded-md text-[11px] text-[#9EEBFF] hover:text-[#CFF7FF] hover:bg-cyan-400/10 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={next}
          className="px-2 py-1 rounded-md text-[11px] text-[#9EEBFF] hover:text-[#CFF7FF] hover:bg-cyan-400/10 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          Next
        </button>
      </div>
      {items.map((s) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            onMouseEnter={() => { onHover?.(s.id); setHoverStore?.(s.id); }}
            onMouseLeave={() => { onHover?.(null); setHoverStore?.(null); }}
            onFocus={() => { onHover?.(s.id); setHoverStore?.(s.id); }}
            onBlur={() => { onHover?.(null); setHoverStore?.(null); }}
            onClick={() => { setActive(s.id); onChange?.(s.id); }}
            className={`group w-full flex items-center gap-2 px-2 py-2 rounded-[10px] text-left focus:outline-none focus:ring-2 focus:ring-cyan-400 transition text-[#19E3FF] mb-1
              ${isActive ? 'bg-cyan-400/10 border border-[#19E3FF]/70 shadow-[0_0_16px_rgba(25,227,255,0.45)]' : 'hover:border hover:border-[#19E3FF]/60'}`}
            aria-pressed={isActive}
            >
            <span className="text-[#19E3FF]" style={{ color: s.color }}><Icon name={s.icon} /></span>
            <span className={`flex-1 text-sm tracking-wide ${isActive ? 'text-[#CFF7FF]' : 'text-[#9EEBFF] group-hover:text-[#CFF7FF]'}`}>{s.title}</span>
          </button>
        );
      })}
    </div>
  );
}
