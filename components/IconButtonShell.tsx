"use client";
import React from "react";

export default function IconButtonShell({
  title,
  href,
  color = "#38B6FF",
  children,
  onClickFX,
  onHoverFX,
}: {
  title: string;
  href: string;
  color?: string;
  children: React.ReactNode;
  onClickFX?: () => void;
  onHoverFX?: () => void;
}) {
  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={title}
        className="ck-icon-btn"
        style={{ "--btn-color": color } as React.CSSProperties}
        onMouseEnter={() => { if (onHoverFX) onHoverFX(); }}
        onMouseDown={(e)=>{ if(onClickFX) onClickFX(); (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(1px) scale(0.985)"; }}
        onMouseUp={(e)=>{ (e.currentTarget as HTMLAnchorElement).style.transform = "none"; }}
      >
        <span className="logo-glow">{children}</span>
      </a>
      <style jsx>{`
        .ck-icon-btn {
          position:relative; display:grid; place-items:center; width:100%; height:100%;
          border-radius:16px; color:#e8f1ff;
          /* Black, tactile surface (same as Instagram shell) */
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
          /* Slightly larger and brighter glow (Instagram match) */
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

