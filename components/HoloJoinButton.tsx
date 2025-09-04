"use client";
import React, { useRef } from "react";
import { sfx } from "@/lib/sfx";

export default function HoloJoinButton({
  onClick,
  href,
  hubColor = "#FC54AF",
  size = 72,
  label = "Join",
  iconSrc = "/elements/join.png",
}: {
  onClick?: () => void;
  href?: string;
  hubColor?: string;
  size?: number;
  label?: string;
  iconSrc?: string;
}) {
  const sfxRef = useRef<HTMLAudioElement | null>(null);

  function handleActivate(e: React.MouseEvent | React.KeyboardEvent) {
    try { const a = sfxRef.current; if (a) { a.currentTime = 0; a.volume = 0.95; a.play().catch(()=>{}); } } catch {}
    if (typeof onClick === "function") { try { onClick(); } catch {} }
    else if (href) {
      try { window.open(href, "_blank", "noopener,noreferrer"); } catch {}
    }
  }

  return (
    <div className="join-wrap" style={{ width: size, height: size }}>
      <div className="beam" aria-hidden />
      <button
        type="button"
        className="hub"
        aria-label={label}
        onClick={handleActivate as any}
        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(e); } }}
        style={{ width: size, height: size }}
      >
        <span className="hub-glyph" aria-hidden>
          <img
            src={iconSrc}
            alt=""
            className="hub-icon"
            onError={(e)=>{ const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = "/elements/chxndler.png"; }}
          />
        </span>
        <span className="sr-only">{label}</span>
      </button>
      <style jsx>{`
        .join-wrap{ position: relative; }
        .beam{ position:absolute; left:-${Math.round(size*0.5)}px; top:${Math.round(size*0.26)}px; width:${Math.round(size*2)}px; height:${Math.round(size*0.5)}px; pointer-events:none; mix-blend-mode:screen;
          background: radial-gradient(closest-side, ${hubColor}66, transparent 70%);
          filter: blur(8px);
        }
        .hub{
          position:relative; display:grid; place-items:center; border-radius:9999px;
          /* Instagram-style black glass shell with neon */
          border:1px solid rgba(255,255,255,.18);
          background:
            radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.08), rgba(255,255,255,0) 42%),
            linear-gradient(180deg, #0b0b0b, #000 64%);
          box-shadow:
            0 18px 36px rgba(0,0,0,.65),
            0 0 34px ${hubColor}66,
            0 0 70px ${hubColor}33,
            inset 0 2px 0 rgba(255,255,255,.25),
            inset 0 -6px 14px rgba(0,0,0,.7);
          transition: transform 120ms ease, box-shadow 180ms ease, filter 180ms ease;
        }
        .hub::before{ content:""; position:absolute; inset:-2px; border-radius:9999px; pointer-events:none; box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset, 0 0 0 1px rgba(0,255,255,.06); }
        .hub::after{ content:""; position:absolute; left:16%; right:16%; top:10%; height:26%; border-radius:9999px; pointer-events:none; background:linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,0)); filter: blur(1px); opacity:.85; }
        .hub:active{ transform: scale(.96); }
        .hub:hover{
          transform: scale(1.05);
          box-shadow:
            0 22px 44px rgba(0,0,0,.7),
            0 0 40px ${hubColor},
            0 0 90px ${hubColor},
            inset 0 2px 0 rgba(255,255,255,.3),
            inset 0 -8px 18px rgba(0,0,0,.7);
          filter: brightness(1.06) saturate(1.12);
        }
        .hub-icon{ width:${Math.round(size*0.62)}px; height:${Math.round(size*0.62)}px; object-fit: contain; filter: saturate(1.2) brightness(1.06) drop-shadow(0 0 8px ${hubColor}) drop-shadow(0 0 18px ${hubColor}); transition: filter 180ms ease, transform 180ms ease; }
        .hub:hover .hub-icon{ transform: scale(1.06); filter: saturate(1.28) brightness(1.08) drop-shadow(0 0 12px ${hubColor}) drop-shadow(0 0 28px ${hubColor}) drop-shadow(0 0 52px ${hubColor}); }
      `}</style>
      <audio ref={sfxRef} src="/audio/join-alien.mp3" preload="auto" playsInline />
    </div>
  );
}
