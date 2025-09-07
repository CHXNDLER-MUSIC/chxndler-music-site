"use client";
import { motion } from "framer-motion";

export default function PlanetHologram({ items = [], activeId, hoverId, onSelect }) {
  const activeItem = items.find((i)=> i.id === activeId) || items.find((i)=> i.active) || null;
  const activeColor = activeItem?.color || "#19E3FF";
  return (
    <motion.div
      className="relative grid place-items-center"
      initial={{ y: 0 }}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      aria-label="Holographic planet"
    >
      {/* Beam and base halo removed; beam now positioned outside HUD */}

      {/* Planet + rings (clean cyan neon look, no red moon) */}
      <svg
        width="260"
        height="260"
        viewBox="0 0 260 260"
        fill="none"
        className="relative"
      >
        <defs>
          {/* Planet core gradient with atmospheric falloff */}
          <radialGradient id="pg-core" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(120 120) rotate(45) scale(90)">
            <stop stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#19E3FF" stopOpacity="0.85" />
            <stop offset="1" stopColor="#19E3FF" stopOpacity="0.05" />
          </radialGradient>
          {/* Enhanced realistic surface texture */}
          <filter id="f-noise" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="4" stitchTiles="stitch" result="n1" />
            <feTurbulence type="turbulence" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" result="n2" />
            <feComposite operator="multiply" in="n1" in2="n2" result="combined" />
            <feColorMatrix in="combined" type="matrix" values="0 0 0 0 0  0 0 0 0 0.8  0 0 0 0 1  0 0 0 0.2 0"/>
          </filter>
          {/* Continental patterns */}
          <filter id="f-continents" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="2" stitchTiles="stitch" result="continents" />
            <feColorMatrix in="continents" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.9  0 0 0 0 1  0 0 0 0.12 0"/>
          </filter>
          {/* Specular sweep for reflections */}
          <linearGradient id="g-sheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.35" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          {/* Clip for planet circle */}
          <clipPath id="clip-planet">
            <circle cx="130" cy="130" r="62" />
          </clipPath>
          {/* Mask to show front-ring only where it crosses the planet */}
          <mask id="mask-planet-only">
            <rect x="0" y="0" width="260" height="260" fill="black" />
            <circle cx="130" cy="130" r="62" fill="white" />
          </mask>
          {/* Outer atmosphere glow */}
          <filter id="f-atmo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          {/* Neon ring glow */}
          <filter id="f-ring" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          {/* Stronger halo for dashboard-2 style beam */}
          <filter id="f-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Atmosphere aura */}
        <circle cx="130" cy="130" r="76" fill="#19E3FF" opacity="0.2" filter="url(#f-atmo)" />

        {/* Planet core with gradient */}
        <circle cx="130" cy="130" r="62" fill="url(#pg-core)" />
        {/* Tint core by active song color for a dynamic main planet */}
        <circle cx="130" cy="130" r="62" fill={activeColor} opacity="0.28" />
        {/* Main planet decorative rings (only the center/main gets these) */}
        <motion.circle
          cx="130" cy="130" r="72"
          fill="none" stroke="#19E3FF" strokeOpacity="0.6" strokeWidth="1.6"
          filter="url(#f-strong)"
          animate={{ r: [72, 74, 72] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="130" cy="130" r="82"
          fill="none" stroke="#19E3FF" strokeOpacity="0.35" strokeWidth="1.2"
          filter="url(#f-strong)"
          animate={{ r: [82, 83.5, 82] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
        />

        {/* Enhanced surface features inside the planet */}
        <g clipPath="url(#clip-planet)" opacity="0.3">
          {/* Polar ice caps */}
          <ellipse cx="130" cy="90" rx="20" ry="12" fill="#FFFFFF" opacity="0.4" />
          <ellipse cx="130" cy="170" rx="18" ry="10" fill="#FFFFFF" opacity="0.4" />
          
          {/* Continental patterns */}
          <rect x="-10" y="-10" width="280" height="280" filter="url(#f-continents)" />
          
          {/* Surface texture */}
          <rect x="-10" y="-10" width="280" height="280" filter="url(#f-noise)" />
          
          {/* Specular highlight */}
          <rect x="40" y="30" width="140" height="100" fill="url(#g-sheen)" />
          
          {/* Atmospheric terminator (day/night line) */}
          <ellipse cx="130" cy="130" rx="62" ry="62" fill="none" stroke="#000000" strokeWidth="1" strokeOpacity="0.15" />
          <path d="M 68 130 Q 130 100 192 130 Q 130 160 68 130" fill="#000000" fillOpacity="0.08" />
        </g>

        {/* Rings (behind + front) with stronger glow */}
        <g opacity="0.95">
          {/* Behind ring */}
          <ellipse cx="130" cy="130" rx="112" ry="46" stroke="#19E3FF" strokeOpacity="0.55" strokeWidth="2.2" />
          <ellipse cx="130" cy="130" rx="112" ry="46" stroke="#19E3FF" strokeOpacity="0.55" strokeWidth="2.2" filter="url(#f-ring)" />
          <ellipse cx="130" cy="130" rx="112" ry="46" stroke="#19E3FF" strokeOpacity="0.25" strokeWidth="4" filter="url(#f-strong)" />
        </g>

        {/* Front-ring: only where it passes in front of the planet (masked by planet) */}
        <g mask="url(#mask-planet-only)" opacity="0.98">
          <ellipse cx="130" cy="130" rx="112" ry="46" stroke="#19E3FF" strokeOpacity="0.95" strokeWidth="2.2" />
          <ellipse cx="130" cy="130" rx="112" ry="46" stroke="#19E3FF" strokeOpacity="0.95" strokeWidth="2.2" filter="url(#f-ring)" />
          <ellipse cx="130" cy="130" rx="112" ry="46" stroke="#19E3FF" strokeOpacity="0.35" strokeWidth="5" filter="url(#f-strong)" />
        </g>

        {/* Per-song planets arranged around the ring */}
        {items && items.length > 0 ? (
          <g>
            {items.map((it, idx) => {
              const total = Math.max(items.length, 1);
              const theta = (idx / total) * Math.PI * 2; // 0..2π
              const rx = 100; // slightly inside the ring radius
              const ry = 40;
              const isHover = hoverId === it.id;
              const nudge = isHover ? 14 : 0;
              const cx = 130 + (rx + nudge) * Math.cos(theta);
              const cy = 130 + (ry + nudge * 0.4) * Math.sin(theta);
              const isActive = activeId === it.id || it.active;
              const r = isActive ? 12 : isHover ? 11 : 7.5;
              const color = it.color || "#19E3FF";
              return (
                <g key={it.id || idx} style={{ cursor: onSelect ? 'pointer' : 'default' }} onClick={() => onSelect && onSelect(it.id)}>
                  {/* glow */}
                  <circle cx={cx} cy={cy} r={r + 10} fill={color} opacity={isActive ? 0.35 : isHover ? 0.3 : 0.14} filter="url(#f-strong)" />
                  {isHover ? (
                    <circle cx={cx} cy={cy} r={r + 18} fill={color} opacity={0.18} filter="url(#f-strong)" />
                  ) : null}
                  {/* body */}
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={color}
                    opacity={isHover ? 1 : 0.92}
                    animate={isHover ? { r: [r, r * 1.08, r] } : { r }}
                    transition={isHover ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                  />
                  {/* No extra rings on orbiting (non-main) planets */}
                  <circle cx={cx - r * 0.4} cy={cy - r * 0.45} r={r * 0.5} fill="#FFFFFF" opacity={isHover ? 0.55 : 0.38} />
                </g>
              );
            })}
          </g>
        ) : null}
      </svg>
    </motion.div>
  );
}
