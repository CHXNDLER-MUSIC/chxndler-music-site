"use client";

export default function AvatarCard({ src = "/artist/avatar.webp", label = "CHANDLER" }) {
  return (
    <div className="flex flex-col items-start">
      <div className="relative w-[120px] h-[120px] rounded-[12px] overflow-hidden border border-[#19E3FF]/90 shadow-[0_0_24px_rgba(25,227,255,0.45)]">
        <img
          src={src}
          alt={label}
          className="w-full h-full object-cover"
          onError={(e)=>{ e.currentTarget.src = "/cockpit/cockpit.png"; }}
        />
        {/* inner glow */}
        <div className="pointer-events-none absolute inset-0 rounded-[12px] ring-1 ring-[#19E3FF]/40" />
        {/* scanlines */}
        <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen"
             style={{ background: "repeating-linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.12) 1px, transparent 1px, transparent 3px)" }} />
      </div>
      <span className="mt-1 text-[11px] tracking-wide text-[#F2EF1D]">{label}</span>
    </div>
  );
}
