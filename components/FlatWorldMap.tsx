'use client';

import React, { useEffect, useRef, useState } from 'react';
import { countryCentroids } from '@/data/countryCentroids';

interface MapLocation {
  country: string;
  count: number;
}

interface MapDot {
  x: number;
  y: number;
  count: number;
  country: string;
}

/** Convert lat/lon to SVG coordinates on a 1000x500 equirectangular viewBox. */
function toSvg(lat: number, lon: number): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * 1000,
    y: ((90 - lat) / 180) * 500,
  };
}

/**
 * Holographic flat world map that matches the cyan/blue HUD aesthetic.
 * Renders an SVG Mercator-style projection with animated scanlines and grid.
 * Shows glowing dots for user locations fetched from the profiles table.
 */
export default function FlatWorldMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tick, setTick] = useState(0);
  const [dots, setDots] = useState<MapDot[]>([]);

  // Subtle animation loop for scanline offset
  useEffect(() => {
    let raf: number;
    let t = 0;
    const loop = () => {
      t += 1;
      setTick(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Fetch user locations on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/map-locations');
        if (!res.ok) return;
        const { locations } = (await res.json()) as { locations: MapLocation[] };
        if (cancelled) return;

        const mapped: MapDot[] = [];
        for (const loc of locations) {
          const centroid = countryCentroids[loc.country];
          if (!centroid) continue;
          const { x, y } = toSvg(centroid.lat, centroid.lon);
          mapped.push({ x, y, count: loc.count, country: loc.country });
        }
        setDots(mapped);
      } catch {
        // Silently ignore — map dots are best-effort
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Scanline y-offset cycles every 240 frames
  const scanY = (tick % 240) / 240;

  // Dot radius: base 4, scaled up by user count (capped)
  const dotRadius = (count: number) => Math.min(4 + Math.log2(count) * 2, 12);

  return (
    <div
      className="w-full h-full relative"
      style={{
        background: 'radial-gradient(ellipse at 50% 50%, rgba(0,40,60,0.85) 0%, rgba(2,12,20,0.95) 100%)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,212,170,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Animated scanline */}
      <div
        className="absolute inset-x-0 pointer-events-none"
        style={{
          top: `${scanY * 100}%`,
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,170,0.35) 30%, rgba(61,245,255,0.5) 50%, rgba(0,212,170,0.35) 70%, transparent 100%)',
          filter: 'blur(1px)',
          opacity: 0.7,
        }}
      />

      {/* SVG World Map */}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 500"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ filter: 'drop-shadow(0 0 8px rgba(61,245,255,0.3))' }}
      >
        <defs>
          {/* Glow filter */}
          <filter id="mapGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient for continents */}
          <linearGradient id="continentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3DF5FF" stopOpacity="0.3" />
          </linearGradient>

          {/* Dot pattern */}
          <pattern id="dotPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="0.6" fill="rgba(61,245,255,0.25)" />
          </pattern>

          {/* User dot glow filter */}
          <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Latitude/Longitude grid lines */}
        {[...Array(9)].map((_, i) => (
          <line
            key={`lat-${i}`}
            x1="0" y1={55 * (i + 1) - 50}
            x2="1000" y2={55 * (i + 1) - 50}
            stroke="rgba(0,212,170,0.12)"
            strokeWidth="0.5"
            strokeDasharray="4 8"
          />
        ))}
        {[...Array(19)].map((_, i) => (
          <line
            key={`lng-${i}`}
            x1={52.5 * (i + 1)}
            y1="0"
            x2={52.5 * (i + 1)}
            y2="500"
            stroke="rgba(0,212,170,0.12)"
            strokeWidth="0.5"
            strokeDasharray="4 8"
          />
        ))}

        {/* Simplified continent outlines — holographic style */}
        <g filter="url(#mapGlow)" fill="url(#continentGrad)" stroke="#3DF5FF" strokeWidth="1" strokeOpacity="0.6">
          {/* North America */}
          <path d="M130,80 L180,65 L220,70 L250,90 L260,110 L270,130 L265,160 L250,180 L230,200 L210,210 L200,230 L190,240 L175,235 L160,220 L145,195 L130,170 L120,145 L110,120 L115,95 Z" />
          {/* Central America */}
          <path d="M190,240 L200,250 L210,265 L205,275 L195,280 L185,275 L180,260 L185,245 Z" />
          {/* South America */}
          <path d="M210,280 L230,275 L260,285 L280,300 L295,330 L300,360 L295,390 L280,410 L260,420 L245,415 L235,395 L225,370 L215,340 L205,310 L200,290 Z" />
          {/* Europe */}
          <path d="M440,70 L460,65 L490,70 L510,80 L520,95 L515,110 L505,125 L490,135 L475,140 L455,140 L440,130 L430,115 L425,95 L430,80 Z" />
          {/* Africa */}
          <path d="M440,160 L470,155 L500,160 L520,175 L535,200 L540,230 L535,265 L525,300 L510,330 L490,350 L470,360 L450,355 L435,335 L425,305 L420,275 L425,240 L430,210 L435,185 Z" />
          {/* Asia */}
          <path d="M520,60 L580,50 L640,45 L700,50 L750,60 L790,75 L810,95 L820,120 L815,145 L800,165 L775,175 L745,180 L710,178 L680,170 L650,165 L620,160 L590,150 L560,140 L540,125 L525,105 L520,80 Z" />
          {/* India / SE Asia */}
          <path d="M640,170 L660,175 L680,190 L685,215 L675,240 L660,250 L645,245 L635,225 L630,200 L635,180 Z" />
          {/* Indonesia / Archipelago */}
          <path d="M700,240 L720,235 L740,240 L750,250 L745,260 L730,265 L710,260 L700,250 Z" />
          <path d="M755,250 L770,248 L785,255 L780,265 L765,265 Z" />
          {/* Australia */}
          <path d="M760,320 L800,310 L840,315 L860,330 L865,355 L855,380 L835,395 L810,400 L785,395 L765,375 L755,350 L755,335 Z" />
          {/* Greenland */}
          <path d="M280,35 L310,30 L340,35 L345,55 L335,70 L310,75 L290,65 L280,50 Z" />
          {/* UK / Ireland */}
          <path d="M420,85 L430,80 L438,85 L435,95 L425,100 L418,95 Z" />
          {/* Japan */}
          <path d="M820,100 L830,95 L838,100 L840,115 L835,125 L825,120 L820,110 Z" />
        </g>

        {/* Dot overlay on continents */}
        <rect x="0" y="0" width="1000" height="500" fill="url(#dotPattern)" opacity="0.5" />

        {/* Equator highlight */}
        <line
          x1="0" y1="250"
          x2="1000" y2="250"
          stroke="#3DF5FF"
          strokeWidth="0.8"
          strokeOpacity="0.25"
          strokeDasharray="8 4"
        />

        {/* User location dots */}
        {dots.map((dot) => {
          const r = dotRadius(dot.count);
          return (
            <g key={dot.country} filter="url(#dotGlow)">
              {/* Pulse ring */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={r}
                fill="none"
                stroke="#3DF5FF"
                strokeWidth="1"
                opacity="0.6"
              >
                <animate
                  attributeName="r"
                  from={String(r)}
                  to={String(r + 8)}
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.6"
                  to="0"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Solid dot */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={r}
                fill="#3DF5FF"
                fillOpacity="0.85"
                stroke="#00d4aa"
                strokeWidth="1"
              />
            </g>
          );
        })}

        {/* Corner markers */}
        {[[10, 10], [990, 10], [10, 490], [990, 490]].map(([cx, cy], i) => (
          <g key={`corner-${i}`}>
            <line x1={cx - 15} y1={cy} x2={cx + 15} y2={cy} stroke="#3DF5FF" strokeWidth="1" strokeOpacity="0.4" />
            <line x1={cx} y1={cy - 15} x2={cx} y2={cy + 15} stroke="#3DF5FF" strokeWidth="1" strokeOpacity="0.4" />
          </g>
        ))}

        {/* "HEARTVERSE" label */}
        <text
          x="500" y="480"
          textAnchor="middle"
          fill="#3DF5FF"
          fontSize="12"
          fontFamily="monospace"
          opacity="0.5"
          letterSpacing="4"
        >
          HEARTVERSE WORLD MAP
        </text>
      </svg>

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)',
        }}
      />
    </div>
  );
}
