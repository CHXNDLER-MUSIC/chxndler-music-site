"use client";
import React, { useRef, useCallback, useEffect } from "react";
import { sfx } from "@/lib/sfx";

const Icon = {
  Instagram: ({ size=18 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  ),
  TikTok: ({ size=18 }) => (
    <svg viewBox="0 0 256 256" width={size} height={size} aria-hidden>
      {/* Cyan back layer (offset) */}
      <g transform="translate(8,-6)">
        <path fill="#69C9D0" d="M120 32h40c2 26 21 47 46 52v32c-18-.4-36-5.9-52-15.7V184c0 35.3-28.7 64-64 64s-64-28.7-64-64c0-34.2 26.7-62.1 60.6-63.9 5.6-.3 11.2.2 16.7 1.4v32c-5.2-1.9-10.7-2.7-16.2-2.3-16.7 1.1-30.2 14.9-30.8 31.6-.7 18.5 14.1 33.6 32.6 33.6s32-14.3 32-32.8V32Z"/>
      </g>
      {/* Pink back layer (offset) */}
      <g transform="translate(-8,8)">
        <path fill="#EE1D52" d="M120 32h40c2 26 21 47 46 52v32c-18-.4-36-5.9-52-15.7V184c0 35.3-28.7 64-64 64s-64-28.7-64-64c0-34.2 26.7-62.1 60.6-63.9 5.6-.3 11.2.2 16.7 1.4v32c-5.2-1.9-10.7-2.7-16.2-2.3-16.7 1.1-30.2 14.9-30.8 31.6-.7 18.5 14.1 33.6 32.6 33.6s32-14.3 32-32.8V32Z"/>
      </g>
      {/* White front layer */}
      <path fill="#FFFFFF" d="M120 32h40c2 26 21 47 46 52v32c-18-.4-36-5.9-52-15.7V184c0 35.3-28.7 64-64 64s-64-28.7-64-64c0-34.2 26.7-62.1 60.6-63.9 5.6-.3 11.2.2 16.7 1.4v32c-5.2-1.9-10.7-2.7-16.2-2.3-16.7 1.1-30.2 14.9-30.8 31.6-.7 18.5 14.1 33.6 32.6 33.6s32-14.3 32-32.8V32Z"/>
    </svg>
  ),
  YouTube: ({ size=18 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M23 12s0-3.2-.4-4.7a3.1 3.1 0 00-2.2-2.2C18.9 4.5 12 4.5 12 4.5s-6.9 0-8.4.6A3.1 3.1 0 001.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a3.1 3.1 0 002.2 2.2c1.5.6 8.4.6 8.4.6s6.9 0 8.4-.6a3.1 3.1 0 002.2-2.2c.4-1.5.4-4.7.4-4.7zM10 15.5v-7l6 3.5-6 3.5z" />
    </svg>
  ),
};

function IconButton({ title, href, children, color = "#38B6FF", onClickFX, onHoverFX }) {
  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={title}
        className="ck-icon-btn"
        style={{ "--btn-color": color }}
        onMouseEnter={() => { if (onHoverFX) onHoverFX(); }}
        onMouseDown={(e)=>{ if(onClickFX) onClickFX(); e.currentTarget.style.transform = "translateY(1px) scale(0.985)"; }}
        onMouseUp={(e)=>{ e.currentTarget.style.transform = "none"; }}
      >
        <span className="logo-glow">{children}</span>
      </a>
      <style jsx>{`
        .ck-icon-btn {
          position:relative; display:grid; place-items:center; width:100%; height:100%;
          border-radius:16px; color:#e8f1ff;
          /* Black, tactile surface */
          background:
            radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.08), rgba(255,255,255,0) 42%),
            linear-gradient(180deg, #0b0b0b, #000 64%);
          /* Neutral bevel + rim */
          border:1px solid rgba(255,255,255,.18);
          box-shadow:
            0 18px 36px rgba(0,0,0,.65),          /* drop */
            inset 0 2px 0 rgba(255,255,255,.22),  /* top bevel */
            inset 0 -6px 14px rgba(0,0,0,.8);     /* bottom shade */
          backdrop-filter:blur(8px);
          -webkit-backdrop-filter:blur(8px);
          transition: box-shadow .2s ease, background .2s ease, transform .12s ease, filter .18s ease;
          cursor:pointer;
        }
        .ck-icon-btn:hover{
          /* Slightly larger like Join the Aliens button and brighter glow */
          transform: scale(1.05);
          box-shadow:
            0 22px 44px rgba(0,0,0,.7),
            0 0 40px rgba(25,227,255,.55),
            0 0 90px rgba(25,227,255,.35),
            inset 0 2px 0 rgba(255,255,255,.35),
            inset 0 -8px 18px rgba(0,0,0,.65);
          filter: brightness(1.06) saturate(1.12);
        }
        .ck-icon-btn:before{ /* outer rim glow very subtle to fuse with console */
          content:""; position:absolute; inset:-2px; border-radius:20px;
          box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset, 0 10px 30px rgba(0,0,0,.65), 0 0 0 1px rgba(0,255,255,.06);
          pointer-events:none;
        }
        .ck-icon-btn:after{ /* glossy top highlight */
          content:""; position:absolute; left:10%; right:10%; top:6%; height:26%; border-radius:9999px;
          background:linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,0));
          filter: blur(1px); opacity:.85; pointer-events:none;
        }
        .logo-glow{
          display:inline-flex; align-items:center; justify-content:center;
          color: var(--btn-color);
          filter:
            drop-shadow(0 0 12px var(--btn-color))
            drop-shadow(0 0 28px var(--btn-color));
          transition: filter .2s ease, transform .25s ease;
          will-change: filter, transform;
          animation: pulseGlow 2.8s ease-in-out infinite;
        }
        .ck-icon-btn:hover .logo-glow{
          filter:
            drop-shadow(0 0 16px var(--btn-color))
            drop-shadow(0 0 36px var(--btn-color))
            drop-shadow(0 0 64px var(--btn-color));
          transform: scale(1.06);
        }
        @keyframes pulseGlow {
          0%, 100% { filter: brightness(1.1) saturate(1.2) drop-shadow(0 0 12px var(--btn-color)) drop-shadow(0 0 28px var(--btn-color)); transform: scale(1); }
          50% { filter: brightness(1.3) saturate(1.4) drop-shadow(0 0 16px var(--btn-color)) drop-shadow(0 0 36px var(--btn-color)); transform: scale(1.03); }
        }
      `}</style>
    </>
  );
}

export default function SocialIcons({ LINKS, POS, trackLinks }) {
  const s = POS.console;
  const size = s.sizePx;
  // single column alignment: all share the same X
  const left = `calc(${s.xVw}vw - ${size/2}px)`;
  // We'll build a dynamic column, stacking items using base/spacing if available
  const hasStack = typeof s.baseYVh === 'number' && typeof s.spacingVh === 'number';
  const BASE = s.tilt || "perspective(1100px) rotateX(32deg) rotateY(-8deg)";
  const iconSize = Math.round(size * 0.56); // baseline logo size
  const tiktokSize = Math.max(12, Math.round(iconSize * 0.8)); // make TikTok slightly smaller to fit box
  const clickRef = useRef(null);
  const hoverRef = useRef(null);
  // Prime SFX on first user interaction to remove initial latency
  useEffect(() => {
    const prime = () => {
      try {
        const h = hoverRef.current; const c = clickRef.current;
        [h, c].forEach((a) => {
          if (!a) return;
          a.muted = true; a.volume = 0; a.play().catch(()=>{});
          setTimeout(() => { try { a.pause(); a.currentTime = 0; a.muted = false; a.volume = 0.3; } catch {} }, 30);
        });
      } catch {}
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('touchstart', prime);
    };
    window.addEventListener('pointerdown', prime, { once: true });
    window.addEventListener('touchstart', prime, { once: true });
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('touchstart', prime);
    };
  }, []);
  const playClick = useCallback(() => { try { sfx.play('click', 0.6); } catch {} }, []);
  const playHover = useCallback(() => { try { sfx.play('hover', 0.35); } catch {} }, []);
  // per-brand glow color
  const colorFor = (name) => {
    const n = String(name).toLowerCase();
    if (n.includes("insta")) return "#FC54AF"; // pink
    if (n.includes("tiktok")) return "#38B6FF"; // cyan
    if (n.includes("tube") || n.includes("youtube")) return "#FF3B30"; // red
    if (n.includes("spotify")) return "#1DB954"; // spotify green
    if (n.includes("apple")) return "#FF3B30"; // apple red
    return "#8BC6FF";
  };

  const items = [
    { key: 'instagram', title: 'Instagram', href: LINKS.instagram, color: colorFor('instagram'), icon: <Icon.Instagram size={iconSize} /> },
    { key: 'tiktok',    title: 'TikTok',    href: LINKS.tiktok,    color: colorFor('tiktok'),    icon: <Icon.TikTok size={tiktokSize} /> },
    { key: 'youtube',   title: 'YouTube',   href: LINKS.youtube,   color: colorFor('youtube'),   icon: <Icon.YouTube size={iconSize} /> },
  ];

  return (
    <>
      {items.map((it, i) => {
        const yAdjPxMap = { instagram: 0, tiktok: -10, youtube: -18 };
        const yAdj = (yAdjPxMap[it.key] !== undefined ? yAdjPxMap[it.key] : 0);
        const top = hasStack
          ? `calc(${s.baseYVh + s.spacingVh * i}vh - ${size/2}px + ${yAdj}px)`
          : `calc(${[s.igYVh, s.ttYVh, s.ytYVh, s.appleYVh, s.spotifyYVh][i]}vh - ${size/2}px + ${yAdj}px)`;
        const xAdjPxMap = { instagram: -12, tiktok: 8, youtube: 16 };
        const offsetPx = (xAdjPxMap[it.key] !== undefined ? xAdjPxMap[it.key] : 0); // +left, -right
        const leftCSS = `calc(${s.xVw}vw - ${size/2 + offsetPx}px)`;
        return (
          <div key={it.key} className="ck-icon-wrap" style={{ left: leftCSS, top, width:size, height:size, transform: BASE }}>
            <span className="deck" aria-hidden />
            <span className="socket" aria-hidden />
            <IconButton title={it.title} href={it.href} color={it.color} onClickFX={playClick} onHoverFX={playHover}>
              {it.icon}
            </IconButton>
          </div>
        );
      })}

      <style jsx>{`
        .ck-icon-wrap{ position:absolute; z-index:32; pointer-events:auto; transform-origin:center; }
        .ck-icon-wrap .deck{ position:absolute; left:-12px; right:-12px; bottom:-10px; height:24px; border-radius:9999px; pointer-events:none;
          background: radial-gradient(60% 60% at 50% 40%, rgba(25,227,255,.22), rgba(25,227,255,0) 70%);
          filter: blur(8px); opacity:.85; mix-blend-mode:screen;
        }
        /* Remove recessed inlay/socket behind icons per request */
        .ck-icon-wrap .socket{ display:none; }
      `}</style>
      {/* Play hover/click sounds */}
      <audio ref={clickRef} src="/audio/join-alien.mp3" preload="auto" playsInline />
      <audio ref={hoverRef} preload="auto" playsInline>
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
    </>
  );
}
