// components/CoverHologram.tsx
"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { cockpit } from "@/config/ui";

export default function CoverHologram({ src, title }: { src: string; title: string }) {
  const w = cockpit.cover.width;
  return (
    <motion.div
      className={`absolute left-1/2 z-30 -translate-x-1/2 ${cockpit.cover.glass} ${"rounded-2xl"}`}
      style={{ width: w, top: "calc(50% + 90px)", transform: "translateX(-50%)" }}
      initial={{ opacity: 0, y: 20, rotateX: -8 }}
      animate={{ opacity: cockpit.cover.hologramOpacity, y: 0, rotateX: -cockpit.cover.tilt }}
      transition={{ type: "spring", stiffness: 100, damping: 18 }}
    >
      <div className="p-2">
        <Image
          src={src}
          alt={`${title} cover`}
          width={w - 12}
          height={w - 12}
          className="rounded-xl object-cover select-none pointer-events-none"
          priority
        />
      </div>
      <div className="px-3 pb-3 text-center text-xs text-white/70">{title}</div>
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl"
        style={{
          boxShadow: "inset 0 0 40px rgba(255,255,255,0.08), 0 0 28px rgba(125,200,255,0.22)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      />
    </motion.div>
  );
}
