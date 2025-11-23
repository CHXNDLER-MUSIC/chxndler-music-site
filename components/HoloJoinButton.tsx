"use client";
import React, { useRef } from "react";
import { BEAM_TOP_RATIO, BEAM_WIDTH_RATIO, BEAM_HEIGHT_RATIO, BEAM_LEFT_OFFSET_RATIO } from "@/lib/joinBeam";
import { sfx } from "@/lib/sfx";

export default function HoloJoinButton({
  onClick,
  href,
  hubColor = "#FC54AF",
  size = 72,
  label = "Signal",
  iconSrc = "/elements/antennas.png",
  isActive = false,
}: {
  onClick?: () => void;
  href?: string;
  hubColor?: string;
  size?: number;
  label?: string;
  iconSrc?: string;
  isActive?: boolean;
}) {
  const sfxRef = useRef<HTMLAudioElement | null>(null);

  function handleActivate() {
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
        className={`hub ${isActive ? "hub-active" : ""}`}
        aria-label={label}
        onClick={handleActivate as any}
        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(); } }}
        style={{ width: size, height: size }}
      >
        <span className="hub-glyph" aria-hidden>
          <img
            src={iconSrc}
            alt=""
            className="hub-icon"
            style={{ width: Math.round(size*0.88), height: Math.round(size*0.88) }}
            draggable={false}
          />
        </span>
        <span className="sr-only">{label}</span>
      </button>
      <style jsx>{`
        .join-wrap{ position: relative; }
        .beam{ position:absolute; left:-${Math.round(size*BEAM_LEFT_OFFSET_RATIO)}px; top:${Math.round(size*BEAM_TOP_RATIO)}px; width:${Math.round(size*BEAM_WIDTH_RATIO)}px; height:${Math.round(size*BEAM_HEIGHT_RATIO)}px; pointer-events:none; mix-blend-mode:screen;
          clip-path: polygon(50% 100%, 90% 0, 10% 0);
          background: linear-gradient(180deg, ${hubColor}12, ${hubColor}22 30%, ${hubColor}08 70%, ${hubColor}00 100%);
          filter: blur(6px);
        }
        .hub{
          position:relative; display:grid; place-items:center; border-radius:9999px;
          /* Instagram-style black glass shell with neon */
          border:1px solid rgba(255,255,255,.18);
          background:
            radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.08), rgba(255,255,255,0) 42%),
            linear-gradient(180deg, #0b0b0b, #000 64%);
          box-shadow:
            0 16px 30px rgba(0,0,0,.6),
            0 0 30px ${hubColor}88,
            0 0 60px ${hubColor}55,
            0 0 100px ${hubColor}33,
            inset 0 2px 0 rgba(255,255,255,.25),
            inset 0 -6px 14px rgba(0,0,0,.7);
          transition: transform 120ms ease, box-shadow 180ms ease, filter 180ms ease;
          animation: joinBasePulse 2.6s ease-in-out infinite;
        }
        .hub::before{ content:""; position:absolute; inset:-2px; border-radius:9999px; pointer-events:none; box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset, 0 0 0 1px rgba(0,255,255,.06); }
        .hub::after{ content:""; position:absolute; left:16%; right:16%; top:10%; height:26%; border-radius:9999px; pointer-events:none; background:linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,0)); filter: blur(1px); opacity:.85; }
        .hub:active{ transform: scale(.96); }
        .hub:hover{
          transform: scale(1.05);
          box-shadow:
            0 20px 38px rgba(0,0,0,.65),
            0 0 40px ${hubColor}FF,
            0 0 80px ${hubColor}BB,
            0 0 120px ${hubColor}77,
            inset 0 2px 0 rgba(255,255,255,.3),
            inset 0 -8px 18px rgba(0,0,0,.7);
          filter: brightness(1.04) saturate(1.08);
        }
        .hub-icon{ width:${Math.round(size*0.62)}px; height:${Math.round(size*0.62)}px; object-fit: contain; filter: saturate(1.1) brightness(1.04) drop-shadow(0 0 6px ${hubColor}) drop-shadow(0 0 14px ${hubColor}); transition: filter 180ms ease, transform 180ms ease; }
        .hub:hover .hub-icon{ transform: scale(1.06); filter: saturate(1.18) brightness(1.06) drop-shadow(0 0 10px ${hubColor}) drop-shadow(0 0 22px ${hubColor}) drop-shadow(0 0 36px ${hubColor}); }
        .hub-active .hub-icon{ filter: saturate(1.5) brightness(1.25) drop-shadow(0 0 16px ${hubColor}) drop-shadow(0 0 32px ${hubColor}) drop-shadow(0 0 48px ${hubColor}); }
        .hub-active {
          /* Selected state: stronger glow, enhanced pulsing */
          animation: joinActivePulse 2.0s ease-in-out infinite;
          box-shadow:
            0 18px 36px rgba(0,0,0,.8),
            0 0 40px ${hubColor}FF,
            0 0 80px ${hubColor}CC,
            0 0 120px ${hubColor}88,
            0 0 160px ${hubColor}44,
            inset 0 2px 0 rgba(255,255,255,.35),
            inset 0 -6px 14px rgba(0,0,0,.7);
          filter: brightness(1.3) saturate(1.4);
        }
        
        /* Synchronized base pulse matching other holographic components */
        @keyframes joinBasePulse {
          0%, 100% { 
            filter: brightness(1) saturate(1);
          }
          50% { 
            filter: brightness(1.08) saturate(1.1);
          }
        }
        
        /* Enhanced pulsing for active state with stronger glow */
        @keyframes joinActivePulse {
          0%, 100% { 
            filter: brightness(1.3) saturate(1.4);
            box-shadow:
              0 18px 36px rgba(0,0,0,.8),
              0 0 40px ${hubColor}FF,
              0 0 80px ${hubColor}CC,
              0 0 120px ${hubColor}88,
              0 0 160px ${hubColor}44,
              inset 0 2px 0 rgba(255,255,255,.35),
              inset 0 -6px 14px rgba(0,0,0,.7);
          }
          50% { 
            filter: brightness(1.45) saturate(1.6);
            box-shadow:
              0 20px 40px rgba(0,0,0,.9),
              0 0 50px ${hubColor}FF,
              0 0 100px ${hubColor}EE,
              0 0 150px ${hubColor}AA,
              0 0 200px ${hubColor}66,
              inset 0 2px 0 rgba(255,255,255,.4),
              inset 0 -6px 14px rgba(0,0,0,.7);
          }
        }
      `}</style>
      <audio ref={sfxRef} src="/audio/join-alien.mp3" preload="auto" playsInline />
    </div>
  );
}
