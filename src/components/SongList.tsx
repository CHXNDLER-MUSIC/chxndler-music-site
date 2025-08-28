"use client";
import * as React from "react";
import { useStore, type Song } from "@/src/store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";

export default function SongList({ height = 420, rowHeight = 64 }: { height?: number; rowHeight?: number }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const { songs, previewId, selectedId, setPreview, setSelected } = useStore();

  const rowVirtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    overscan: 6,
  });

  const onScroll = () => {
    const el = containerRef.current; if (!el) return;
    const mid = el.scrollTop + el.clientHeight / 2;
    const idx = Math.round(mid / rowHeight - 0.5);
    const clamped = Math.max(0, Math.min(songs.length - 1, idx));
    const id = songs[clamped]?.id ?? null;
    setPreview(id);
  };

  React.useEffect(() => {
    const el = containerRef.current; if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [songs.length]);

  function centerOn(index: number) {
    const el = containerRef.current; if (!el) return;
    const target = index * rowHeight + rowHeight / 2 - el.clientHeight / 2;
    el.scrollTo({ top: target, behavior: "smooth" });
  }

  function onKey(e: React.KeyboardEvent) {
    if (!songs.length) return;
    const idx = songs.findIndex(s => s.id === (previewId ?? selectedId ?? songs[0].id));
    if (e.key === "ArrowDown") {
      const next = Math.min(songs.length - 1, idx + 1);
      setPreview(songs[next].id); centerOn(next);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      const prev = Math.max(0, idx - 1);
      setPreview(songs[prev].id); centerOn(prev);
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (idx >= 0) { setSelected(songs[idx].id); centerOn(idx); }
      e.preventDefault();
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-y-auto rounded-xl border border-cyan-300/60 bg-white/5 backdrop-blur-xl focus:outline-none"
      style={{ height, scrollSnapType: "y mandatory" as any }}
      role="listbox"
      tabIndex={0}
      onKeyDown={onKey}
      aria-label="Songs"
    >
      <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
        {rowVirtualizer.getVirtualItems().map((vi) => {
          const song = songs[vi.index];
          const isSelected = song.id === selectedId;
          const isPreview = song.id === previewId;
          const proximity = isPreview ? 1 : Math.max(0, 1 - Math.abs(vi.start + rowHeight / 2 - (containerRef.current?.scrollTop || 0) - (containerRef.current?.clientHeight || height) / 2) / (height / 2));
          return (
            <motion.button
              key={song.id}
              className={`absolute left-0 right-0 mx-2 my-2 flex items-center gap-3 rounded-lg px-3 py-3 text-left border \
                ${isSelected ? 'border-cyan-300/70 bg-cyan-400/10' : isPreview ? 'border-cyan-300/50 bg-cyan-300/5' : 'border-cyan-300/20 bg-white/0'} \
                focus:outline-none focus:ring-2 focus:ring-cyan-400`}
              style={{ top: vi.start, height: rowHeight, scrollSnapAlign: "center" as any }}
              role="option"
              aria-selected={isSelected}
              onClick={() => { setSelected(song.id); centerOn(vi.index); }}
              whileHover={{ scale: 1.01 }}
            >
              <img src={song.artUrl} alt="" className="w-10 h-10 rounded-md object-cover" />
              <div className="min-w-0">
                <div className="text-cyan-50/90 text-sm font-medium truncate">{song.title}</div>
                <div className="text-cyan-100/70 text-xs truncate">{song.tagline}</div>
              </div>
              <div className="ml-auto text-cyan-300/80 text-xs">{isSelected ? 'Now Playing' : isPreview ? 'Preview' : ''}</div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

