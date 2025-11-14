"use client";
import { sfx } from "@/lib/sfx";

export default function CoverCard({ src = "https://ik.imagekit.io/CHXNDLER/cover/ocean-girl.png?updatedAt=1762361386944", label, size = 100, responsive = false, trackSlug = null }) {
  // If responsive is true, use responsive classes similar to song listing scaling
  const responsiveClasses = responsive 
    ? "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28"
    : "";

  // Get element color based on track slug (matching MediaPlayer logic)
  const getElementColor = (slug) => {
    if (!slug) return "#19E3FF"; // Default cyan
    const s = String(slug).toLowerCase();
    // Specific themes first (matching logic from MediaPlayer)
    if (s.includes("ocean") || s.includes("tide") || s.includes("wave") || s.includes("sea")) return "#38B6FF"; // water
    if (s.includes("heart") || s.includes("love") || s.includes("friends") || s.includes("somebody-to-love")) return "#FC54AF"; // heart/pink
    if (s.includes("lightning") || s.includes("lighting") || s.includes("electric") || s.includes("neon") || s.includes("collide") || s.includes("brain") || s.includes("kid") || s.includes("game")) return "#FFC700"; // lightning/yellow
    if (s.includes("dark") || s.includes("black") || s.includes("alone") || s.includes("midnight")) return "#666666"; // darkness (use gray for visibility)
    if (s.includes("fire") || s.includes("burn")) return "#FF6B35"; // fire/orange
    if (s.includes("home") || s.includes("earth") || s.includes("paris") || s.includes("bee")) return "#F2EF1D"; // earth/yellow
    if (s.includes("air") || s.includes("sky")) return "#8BF9FF"; // air/light cyan
    return "#19E3FF"; // fallback to cyan
  };

  const elementColor = getElementColor(trackSlug || src);

  // Convert hex color to rgba for CSS interpolation
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleClick = () => {
    // Slightly reduce flip volume for a softer click
    sfx.play('flip', 0.5);
  };
    
  return (
    <div className="flex flex-col items-start">
      <div
        className={`cover-art-container group relative rounded-[12px] overflow-hidden cursor-pointer ${responsiveClasses}`}
        style={responsive ? { WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden', WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' } : { width: size - 10, height: size - 10, WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden', WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
        onClick={handleClick}
      >
        <img
          src={src}
          alt={label || "Cover art"}
          className="w-full h-full object-cover"
          onError={(e)=>{ e.currentTarget.src = "/logo/CHXNDLER_Logo.png"; }}
        />
        {/* Blue fill overlay: desktop blur only; mobile has no backdrop blur to avoid flicker */}
        <div className="blue-fill-overlay pointer-events-none absolute inset-0" />
        {/* inner neon rim */}
        <div className="pointer-events-none absolute inset-0 rounded-[12px]" style={{ border: `1px solid ${hexToRgba(elementColor, 0.4)}` }} />
        {/* scanlines */}
        <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen"
             style={{ background: "repeating-linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.12) 1px, transparent 1px, transparent 3px)" }} />
      </div>
      {label ? (
        <span className={`mt-1 tracking-wide text-cyan-100/90 ${responsive ? "text-[9px] sm:text-[10px] md:text-xs" : "text-[10px]"}`}>{label}</span>
      ) : null}
      <style jsx>{`
        .cover-art-container{ 
          outline:1px solid ${hexToRgba(elementColor, 0.4)};
          box-shadow: 0 0 20px ${hexToRgba(elementColor, 0.12)};
          transition: transform .15s ease, box-shadow .2s ease, outline-color .2s ease, filter .2s ease;
        }
        /* Match dropdown snappy feel for inner image + overlay */
        .cover-art-container img{
          transition: filter .15s ease;
        }
        .cover-art-container:hover{
          transform: translateZ(0) scale(1.04);
          outline-color: ${hexToRgba(elementColor, 0.8)};
          box-shadow:
            0 0 36px ${hexToRgba(elementColor, 0.55)},
            0 0 64px ${hexToRgba(elementColor, 0.35)},
            inset 0 0 10px ${hexToRgba(elementColor, 0.18)};
        }
        .cover-art-container:hover img{ 
          filter: brightness(1.25) contrast(1.15) saturate(1.2);
        }
        .cover-art-container:hover .blue-fill-overlay{ 
          background-color: ${hexToRgba(elementColor, 0.18)};
        }
        /* Apply a light blue background to match waveform container styling */
        .blue-fill-overlay{ transition: background-color .15s ease; background-color: rgba(6, 182, 212, 0.08); }
        /* Enable backdrop blur on desktop only to prevent iOS flicker */
        @media (hover: hover) and (pointer: fine) {
          .blue-fill-overlay{ backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
        }
      `}</style>
    </div>
  );
}
