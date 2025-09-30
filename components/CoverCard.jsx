"use client";
import { sfx } from "@/lib/sfx";

export default function CoverCard({ src = "/cover/ocean-girl.png", label, size = 100, responsive = false }) {
  // If responsive is true, use responsive classes similar to song listing scaling
  const responsiveClasses = responsive 
    ? "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28"
    : "";

  const handleClick = () => {
    sfx.play('flip', 0.7);
  };
    
  return (
    <div className="flex flex-col items-start">
      <div
        className={`cover-art-container group relative rounded-[12px] overflow-hidden border-2 border-[#19E3FF]/90 shadow-[0_0_28px_rgba(25,227,255,0.45)] transition-all duration-300 cursor-pointer hover:scale-105 hover:border-[#19E3FF] hover:shadow-[0_0_40px_rgba(25,227,255,0.8),0_0_60px_rgba(25,227,255,0.6),0_0_80px_rgba(25,227,255,0.4)] cover-pulse ${responsiveClasses}`}
        style={responsive ? {} : { width: size - 10, height: size - 10 }}
        onClick={handleClick}
      >
        <img
          src={src}
          alt={label || "Cover art"}
          className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-110 group-hover:contrast-110 group-hover:saturate-120"
          onError={(e)=>{ e.currentTarget.src = "/logo/CHXNDLER_Logo.png"; }}
        />
        {/* Blue fill overlay */}
        <div className="blue-fill-overlay pointer-events-none absolute inset-0 bg-[#19E3FF]/0 transition-all duration-300 group-hover:bg-[#19E3FF]/15 group-hover:mix-blend-overlay" />
        {/* inner neon rim */}
        <div className="pointer-events-none absolute inset-0 rounded-[12px] ring-1 ring-[#19E3FF]/40" />
        {/* scanlines */}
        <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen"
             style={{ background: "repeating-linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.12) 1px, transparent 1px, transparent 3px)" }} />
      </div>
      {label ? (
        <span className={`mt-1 tracking-wide text-cyan-100/90 ${responsive ? "text-[9px] sm:text-[10px] md:text-xs" : "text-[10px]"}`}>{label}</span>
      ) : null}
    </div>
  );
}
