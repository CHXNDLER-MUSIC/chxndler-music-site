"use client";

import React from "react";

export type HoloSong = { id: string; title: string; color?: string };

type Props = {
  songs: HoloSong[];
  activeId: string | undefined;
  onChange: (id: string) => void;
  className?: string;
};

// Utility: split an array into n nearly-equal chunks
function splitEven<T>(arr: T[], n: number): T[][] {
  const out: T[][] = Array.from({ length: n }, () => []);
  arr.forEach((item, i) => out[i % n].push(item));
  return out;
}

export default function HologramPlanets({ songs, activeId, onChange, className = "" }: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState({ w: 800, h: 480 });

  // Measure container for responsive sizing
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { mainSize, satSize, rings, ringRadii } = React.useMemo(() => {
    const h = size.h;
    const main = Math.min(320, Math.max(240, h * 0.4));
    const sat = Math.min(96, Math.max(48, h * 0.12));
    // Choose ring count based on satellite count
    const satCount = Math.max(0, (songs?.length || 0) - 1);
    const ringCount = satCount > 12 ? 3 : satCount > 5 ? 2 : 1;
    const base = Math.min(440, Math.max(220, h * 0.55));
    const gap = Math.min(120, Math.max(80, h * 0.16));
    const radii = Array.from({ length: ringCount }, (_, i) => base - i * gap);
    return { mainSize: main, satSize: sat, rings: ringCount, ringRadii: radii };
  }, [size.h, songs?.length]);

  const active = songs.find((s) => s.id === activeId) || songs[0];
  const satellites = songs.filter((s) => s.id !== active?.id);
  const ringBuckets = splitEven(satellites, rings);

  // Pick a single accent pink planet if none provided
  const ACCENT = "#FC54AF";

  return (
    <div
      ref={ref}
      className={`relative w-full h-full ${className}`}
      role="group"
      aria-label="Hologram planets"
      style={{
        // Subtle perspective for ring ellipse
        perspective: 900,
      }}
    >
      {/* SVG scene scales with container */}
      <svg className="absolute inset-0" width="100%" height="100%" viewBox={`0 0 ${size.w} ${size.h}`}>
        <defs>
          {/* Main planet gradient (teal/cyan), used as fallback when no color */}
          <radialGradient id="gradMain" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#36E0FF" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#0EA8D0" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#007A9E" stopOpacity="0.88" />
          </radialGradient>
          {/* Satellite gradient (dimmer) */}
          <radialGradient id="gradSat" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#36E0FF" stopOpacity="0.75" />
            <stop offset="60%" stopColor="#0EA8D0" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#007A9E" stopOpacity="0.6" />
          </radialGradient>
          {/* Star speckles overlay via turbulence */}
          <filter id="speckle" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="7" result="t" />
            <feColorMatrix in="t" type="matrix"
              values="0 0 0 0 0  0 0 0 0 0.8  0 0 0 0 1  0 0 0 0.12 0" />
          </filter>
          {/* Aqua outer glow */}
          <filter id="outerGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="20" result="b" />
            <feMerge>
              <feMergeNode in="b" />
            </feMerge>
          </filter>
        </defs>

        {/* Rings group with perspective tilt */}
        <g transform={`translate(${size.w / 2}, ${size.h / 2 + 8}) rotateX(62)`}>
          {ringRadii.map((r, ri) => (
            <g key={ri}>
              <ellipse cx={0} cy={0} rx={r} ry={r * 0.35}
                fill="none" stroke="#36E0FF" strokeWidth={1.4}
                opacity={ri === 0 ? 0.6 : 0.45}
                filter="url(#outerGlow)"
              />
            </g>
          ))}
        </g>

        {/* Main planet at center */}
        {active ? (
          <g transform={`translate(${size.w / 2}, ${size.h / 2})`}>
            <g>
              {/* Outer aqua glow */}
              <circle r={mainSize * 0.58} fill="#36E0FF" opacity={0.22} filter="url(#outerGlow)" />
              {/* Core gradient fill - use element color if provided */}
              <defs>
                <radialGradient id="gradActive" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor={active.color || "#36E0FF"} stopOpacity="0.95" />
                  <stop offset="60%" stopColor={active.color || "#0EA8D0"} stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#007A9E" stopOpacity="0.88" />
                </radialGradient>
              </defs>
              <circle r={mainSize * 0.5} fill={active.color ? "url(#gradActive)" : "url(#gradMain)"} />
              {/* Speckle overlay */}
              <circle r={mainSize * 0.5} filter="url(#speckle)" opacity={0.25} />
              {/* Slight bottom-left shading */}
              <ellipse cx={-mainSize * 0.12} cy={mainSize * 0.12} rx={mainSize * 0.48} ry={mainSize * 0.35} fill="#000" opacity={0.12} />
            </g>
          </g>
        ) : null}

        {/* Satellites distributed across rings */}
        {ringBuckets.map((bucket, ri) => {
          const R = ringRadii[ri];
          const ry = R * 0.35;
          const count = bucket.length;
          return (
            <g key={`ring-${ri}`} transform={`translate(${size.w / 2}, ${size.h / 2 + 8}) rotateX(62)`}>
              {bucket.map((s, i) => {
                const theta = (i / Math.max(1, count)) * Math.PI * 2;
                const x = Math.cos(theta) * R;
                const y = Math.sin(theta) * ry;
                const isAccent = s.color?.toLowerCase() === ACCENT.toLowerCase();
                const color = s.color || (i === 0 && ri === ringBuckets.length - 1 ? ACCENT : undefined);
                const label = s.title;
                return (
                  <g key={s.id} transform={`translate(${x}, ${y})`}>
                    {/* focus ring target is a button overlay (below) */}
                    <g className="transition-transform duration-200 ease-out">
                      {/* Planet glow */}
                      <circle r={satSize * 0.32} fill="#36E0FF" opacity={0.18} filter="url(#outerGlow)" />
                      {/* Body */}
                      <defs>
                        <radialGradient id={`sat-${ri}-${i}`} cx="50%" cy="50%" r="60%">
                          <stop offset="0%" stopColor={color || "#36E0FF"} stopOpacity="0.75" />
                          <stop offset="60%" stopColor={color || "#0EA8D0"} stopOpacity="0.65" />
                          <stop offset="100%" stopColor="#007A9E" stopOpacity="0.6" />
                        </radialGradient>
                      </defs>
                      <circle r={satSize * 0.28} fill={`url(#sat-${ri}-${i})`} />
                      {/* Speckle */}
                      <circle r={satSize * 0.28} filter="url(#speckle)" opacity={0.2} />
                    </g>
                    {/* Click/hover target: accessible button */}
                    <foreignObject x={-satSize * 0.35} y={-satSize * 0.35} width={satSize * 0.7} height={satSize * 0.7}>
                      <button
                        aria-label={`Select ${label}`}
                        title={label}
                        onClick={() => onChange(s.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(s.id); } }}
                        className="block w-full h-full rounded-full outline-none focus:ring-2 focus:ring-cyan-400"
                        style={{
                          background: "transparent",
                          transformOrigin: "50% 50%",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget.parentElement?.previousSibling as any)?.setAttribute?.('filter', 'url(#outerGlow)'); }}
                      />
                    </foreignObject>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

