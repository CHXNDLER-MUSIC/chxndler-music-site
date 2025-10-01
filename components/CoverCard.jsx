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
        className={`cover-art-container group relative rounded-[12px] overflow-hidden cursor-pointer ${responsiveClasses}`}
        style={responsive ? {} : { width: size - 10, height: size - 10 }}
        onClick={handleClick}
      >
        <img
          src={src}
          alt={label || "Cover art"}
          className="w-full h-full object-cover transition-all duration-300"
          onError={(e)=>{ e.currentTarget.src = "/logo/CHXNDLER_Logo.png"; }}
        />
        {/* Blue fill overlay: only on hover like dropdown */}
        <div className="blue-fill-overlay pointer-events-none absolute inset-0 mix-blend-overlay transition-all duration-300" />
        {/* inner neon rim */}
        <div className="pointer-events-none absolute inset-0 rounded-[12px] ring-1 ring-[#19E3FF]/40" />
        {/* scanlines */}
        <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen"
             style={{ background: "repeating-linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.12) 1px, transparent 1px, transparent 3px)" }} />
      </div>
      {label ? (
        <span className={`mt-1 tracking-wide text-cyan-100/90 ${responsive ? "text-[9px] sm:text-[10px] md:text-xs" : "text-[10px]"}`}>{label}</span>
      ) : null}
      <style jsx>{`
        .cover-art-container{ 
          outline:1px solid rgba(25,227,255,.20);
          box-shadow: 0 0 28px rgba(25,227,255,.15);
          transition: transform .15s ease, box-shadow .2s ease, outline-color .2s ease, filter .2s ease;
        }
        .cover-art-container:hover{
          transform: translateZ(0) scale(1.04);
          outline-color: rgba(25,227,255,.8);
          box-shadow:
            0 0 52px rgba(25,227,255,.7),
            0 0 90px rgba(25,227,255,.45),
            inset 0 0 15px rgba(25,227,255,.2);
        }
        .cover-art-container:hover img{ 
          filter: brightness(1.5) contrast(1.25) saturate(1.35);
        }
        .cover-art-container:hover .blue-fill-overlay{ 
          background-color: rgba(25, 227, 255, 0.3);
        }
        /* Apply a subtle blue tint by default to match dropdown styling */
        .blue-fill-overlay{
          background-color: rgba(8, 26, 32, 0.25);
        }
      `}</style>
    </div>
  );
}
