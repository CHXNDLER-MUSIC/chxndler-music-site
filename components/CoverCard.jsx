"use client";

export default function CoverCard({ src = "/cover/ocean-girl.png", label, size = 120 }) {
  return (
    <div className="flex flex-col items-start">
      <div
        className="relative rounded-[12px] overflow-hidden border-2 border-[#19E3FF]/90 shadow-[0_0_26px_rgba(25,227,255,0.45)]"
        style={{ width: size, height: size }}
      >
        <img
          src={src}
          alt={label || "Cover art"}
          className="w-full h-full object-cover"
          onError={(e)=>{ e.currentTarget.src = "/cockpit/cockpit-filled.png?v=20250902"; }}
        />
        {/* inner neon rim */}
        <div className="pointer-events-none absolute inset-0 rounded-[12px] ring-1 ring-[#19E3FF]/40" />
        {/* scanlines */}
        <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen"
             style={{ background: "repeating-linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.12) 1px, transparent 1px, transparent 3px)" }} />
      </div>
      {label ? (
        <span className="mt-1 text-[10px] tracking-wide text-cyan-100/90">{label}</span>
      ) : null}
    </div>
  );
}
