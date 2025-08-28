"use client";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/src/store";

export default function NowPlaying() {
  const { songs, previewId, selectedId } = useStore();
  const active = useMemo(() => songs.find(s => (selectedId ?? previewId) === s.id) || songs[0], [songs, previewId, selectedId]);

  return (
    <div className="w-full rounded-xl border-2 border-cyan-300/70 bg-white/6 backdrop-blur-xl p-3 shadow-[0_0_28px_rgba(25,227,255,0.45)]">
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-cyan-300/60">
          <AnimatePresence mode="wait">
            <motion.img
              key={active?.id}
              src={active?.artUrl}
              alt={active?.title}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          </AnimatePresence>
        </div>
        <div className="min-w-0">
          <div className="text-[#19E3FF] font-extrabold text-lg tracking-tight truncate">{active?.title}</div>
          <div className="text-cyan-100/80 text-xs truncate">{active?.tagline}</div>
        </div>
      </div>
    </div>
  );
}

