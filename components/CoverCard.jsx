"use client";

export default function CoverCard({ src = "/cover/ocean-girl.png", label, size = 100, responsive = false }) {
  // If responsive is true, use responsive classes similar to song listing scaling
  const responsiveClasses = responsive 
    ? "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28"
    : "";
    
  return (
    <div className="flex flex-col items-start">
      <div
        className={`relative rounded-[12px] overflow-hidden border-2 border-[#19E3FF]/90 shadow-[0_0_28px_rgba(25,227,255,0.45)] ${responsiveClasses}`}
        style={responsive ? {} : { width: size - 10, height: size - 10 }}
      >
        <img
          src={src}
          alt={label || "Cover art"}
          className="w-full h-full object-cover"
          onError={(e)=>{ e.currentTarget.src = "/logo/CHXNDLER_Logo.png"; }}
        />
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
