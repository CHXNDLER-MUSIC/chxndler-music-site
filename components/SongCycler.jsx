"use client";

import { useEffect } from "react";
import { useCycleList } from "@/lib/useCycleList";

function ElementIcon({ name }) {
  const cn = "w-4 h-4 object-contain";
  if (name === "heart") return <img src="/elements/heart.png" alt="Heart" className={cn} />;
  if (name === "lightning" || name === "electric") return <img src="/elements/lighting.png" alt="Lightning" className={cn} />;
  if (name === "darkness") return <img src="/elements/darkness.png" alt="Darkness" className={cn} />;
  if (name === "water") return <img src="/elements/water.png" alt="Water" className={cn} />;
  return null;
}

export default function SongCycler({ items = [], initialActiveId, onChange }) {
  const { activeId, next, prev, handleKeyDown } = useCycleList(items, initialActiveId, onChange);

  useEffect(() => {
    // Focus keyboard cycling when mounted in view
    const el = document.getElementById("song-cycler-focus");
    if (el) el.focus();
  }, []);

  if (!items.length) return null;
  const current = items.find((i) => i.id === activeId) || items[0];

  return (
    <div
      id="song-cycler-focus"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="w-full rounded-[12px] border-2 border-[#19E3FF]/80 bg-white/6 backdrop-blur-xl shadow-[0_0_28px_rgba(25,227,255,0.45)] p-2 flex items-center gap-2"
      aria-label="Song cycler"
      role="group"
    >
      <button
        type="button"
        onClick={prev}
        className="px-2 py-1 rounded-md text-[12px] text-[#9EEBFF] hover:text-[#CFF7FF] hover:bg-cyan-400/10 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        aria-label="Previous song"
      >
        ◀
      </button>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="shrink-0" style={{ color: current.color }}>
          <ElementIcon name={current.icon} color={current.color} />
        </span>
        <div className="truncate text-sm text-[#CFF7FF]">{current.title}</div>
      </div>
      <button
        type="button"
        onClick={next}
        className="px-2 py-1 rounded-md text-[12px] text-[#9EEBFF] hover:text-[#CFF7FF] hover:bg-cyan-400/10 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        aria-label="Next song"
      >
        ▶
      </button>
    </div>
  );
}
