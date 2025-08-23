// components/NowPlayingHUD.tsx
"use client";
import { motion } from "framer-motion";
import { glow } from "@/config/ui";

export default function NowPlayingHUD({
  title,
  progress,   // 0..1
  onToggle,
  isPlaying,
}: {
  title: string;
  progress: number;
  onToggle: () => void;
  isPlaying: boolean;
}) {
  return (
    <motion.div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,680px)] ${glow.ring} bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 p-3`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "⏸" : "▶️"}
        </button>
        <div className="flex-1">
          <div className="text-white/90 text-sm truncate">{title}</div>
          <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%`, background: "linear-gradient(90deg, #FC54AF, #F2EF1D)" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
