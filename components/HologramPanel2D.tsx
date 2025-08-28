"use client";
import React from "react";

export default function HologramPanel2D() {
  return (
    <div className="relative w-full aspect-[16/9] max-h-[520px] mx-auto select-none">
      {/* HUD frame */}
      <div className="absolute inset-0 rounded-2xl border border-cyan-300/70 shadow-[0_0_28px_rgba(34,211,238,0.35)]" />
      <div className="absolute inset-[8px] rounded-xl border border-cyan-300/30" />
      {/* Scanlines */}
      <div
        className="absolute inset-0 rounded-2xl opacity-[.12] mix-blend-screen"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,255,255,0.14) 0px, rgba(0,255,255,0.14) 1px, transparent 2px, transparent 4px)",
        }}
      />
      {/* Holo wash */}
      <div className="absolute inset-0 rounded-2xl bg-cyan-300/5" />

      {/* === SVG scene (matches reference) === */}
      <svg viewBox="0 0 1600 900" className="relative block w-full h-full" aria-hidden>
        <defs>
          {/* Planet gradients */}
          <radialGradient id="planetCore" cx="52%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#baf7ff"/>
            <stop offset="38%" stopColor="#46e0ff"/>
            <stop offset="70%" stopColor="#0c8db2"/>
            <stop offset="100%" stopColor="#052c34"/>
          </radialGradient>
          <radialGradient id="rimGlow" cx="50%" cy="50%" r="62%">
            <stop offset="70%" stopColor="rgba(0,255,255,0)" />
            <stop offset="100%" stopColor="rgba(114,255,255,0.65)" />
          </radialGradient>

          {/* Moon gradient */}
          <radialGradient id="moonCore" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#ffd1df"/>
            <stop offset="55%" stopColor="#ff668b"/>
            <stop offset="100%" stopColor="#6e1a36"/>
          </radialGradient>

          {/* Noise/texture */}
          <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="12" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="cloudNoise" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="t"/>
            <feColorMatrix type="saturate" values="0.6"/>
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0 .12 .22 0"/>
            </feComponentTransfer>
            <feGaussianBlur stdDeviation="1.2"/>
          </filter>
          <filter id="ringBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2"/>
          </filter>

          {/* Occlusion helpers */}
          <clipPath id="planetClip">
            <circle cx="800" cy="450" r="270" />
          </clipPath>
          <mask id="planetMask">
            <rect width="1600" height="900" fill="black"/>
            <circle cx="800" cy="450" r="270" fill="white"/>
          </mask>
        </defs>

        {/* Background (very faint) */}
        <rect width="1600" height="900" fill="#04161e"/>
        <rect width="1600" height="900" filter="url(#cloudNoise)" opacity=".06"/>

        {/* Projection base */}
        <g transform="translate(800,700)" filter="url(#softGlow)">
          <ellipse rx="260" ry="36" fill="#6ff3ff" opacity=".25"/>
          <ellipse rx="330" ry="14" fill="#6ff3ff" opacity=".18" />
        </g>

        {/* Rear ring (behind planet) */}
        <g transform="translate(800,450)" filter="url(#ringBlur)" opacity=".9" clipPath="url(#planetClip)">
          {/* Nothing here; clipPath only used for front ring. */}
        </g>
        <g transform="translate(800,450)" filter="url(#ringBlur)" opacity=".55" mask="url(#planetMask)">
          <ellipse rx="410" ry="120" fill="none" stroke="#7ff6ff" strokeWidth="2"/>
          <ellipse rx="520" ry="148" fill="none" stroke="#7ff6ff" strokeWidth="1" opacity=".5"/>
        </g>

        {/* Planet (centered) */}
        <g className="animate-planet">
          <circle cx="800" cy="450" r="270" fill="url(#planetCore)" filter="url(#softGlow)"/>
          <circle cx="800" cy="450" r="300" fill="url(#rimGlow)" opacity=".85"/>
          {/* Inner cloud texture */}
          <g transform="translate(800,450)">
            <ellipse rx="270" ry="270" fill="white" filter="url(#cloudNoise)" opacity=".35"/>
          </g>
          {/* Soft lat lines */}
          <g opacity=".12" stroke="#c6fbff" strokeWidth="1">
            <ellipse cx="800" cy="450" rx="260" ry="60" fill="none"/>
            <ellipse cx="800" cy="450" rx="260" ry="90" fill="none"/>
            <ellipse cx="800" cy="450" rx="260" ry="120" fill="none"/>
            <ellipse cx="800" cy="450" rx="260" ry="150" fill="none"/>
          </g>
        </g>

        {/* Front ring (on top of planet) */}
        <g transform="translate(800,450)" filter="url(#ringBlur)" opacity=".9">
          <ellipse rx="460" ry="135" fill="none" stroke="#99fbff" strokeWidth="1.6"/>
        </g>

        {/* Moon (left) */}
        <g transform="translate(420,530)" className="animate-moon" opacity=".95">
          <circle r="85" fill="url(#moonCore)" filter="url(#softGlow)"/>
          <circle r="98" fill="url(#rimGlow)" opacity=".5"/>
        </g>
      </svg>

      {/* Motion */}
      <style jsx>{`
        .animate-planet {
          animation: spin 28s linear infinite;
          transform-origin: 800px 450px;
        }
        .animate-moon {
          animation: bob 6s ease-in-out infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bob {
          0%,100% { transform: translate(420px, 530px); }
          50%     { transform: translate(420px, 522px); }
        }
      `}</style>
    </div>
  );
}

