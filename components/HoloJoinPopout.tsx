"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sfx";
import JoinAliens from "@/components/JoinAliens";

export default function HoloJoinPopout({
  size = 84,
  hubColor = "#FC54AF",
  label = "Join",
  iconSrc = "/elements/join.png",
  panelWidth = 380,
  panelSide = "left", // left or above relative to the button
}: {
  size?: number;
  hubColor?: string;
  label?: string;
  iconSrc?: string;
  panelWidth?: number;
  panelSide?: "left" | "above";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hubRef = useRef<HTMLButtonElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const clickRef = useRef<HTMLAudioElement | null>(null);

  // Outside click closes
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      const r = rootRef.current; if (!r) return;
      if (!r.contains(e.target as Node)) {
        setOpen(false);
        setTimeout(() => hubRef.current?.focus(), 0);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        setTimeout(() => hubRef.current?.focus(), 0);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const onToggle = useCallback(() => {
    try { sfx.play('hover', 0.35); } catch {}
    try { const a = clickRef.current; if (a) { a.currentTime = 0; a.volume = 0.95; a.play().catch(()=>{}); } } catch {}
    setOpen((o) => !o);
    if (!open) setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [open]);

  return (
    <div ref={rootRef} className="join-pop-wrap" style={{ width: size, height: size }}>
      {/* Beam under hub */}
      <div className="beam" aria-hidden />

      {/* Hub */}
      <button
        ref={hubRef}
        type="button"
        className={`hub ${open ? 'on' : ''}`}
        aria-label={open ? "Close Join" : label}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
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

      {/* Popout panel */}
      <div
        className={`panel ${open ? 'open' : ''} ${panelSide}`}
        role="dialog"
        aria-hidden={!open}
        onClick={(e)=> e.stopPropagation()}
        style={{ width: panelWidth }}
      >
        <div className="panel-inner">
          {/* Focusable anchor for first input */}
          <div className="sr-only" aria-hidden tabIndex={-1} />
          {/* Mount form; pass ref to email input */}
          <JoinAliensInputProxy inputRef={firstInputRef} />
        </div>
      </div>

      <style jsx>{`
        .join-pop-wrap{ position:relative; pointer-events:auto; }
        .beam{ position:absolute; left:-${Math.round(size*0.5)}px; top:${Math.round(size*0.26)}px; width:${Math.round(size*2)}px; height:${Math.round(size*0.5)}px; pointer-events:none; mix-blend-mode:screen;
          background: radial-gradient(closest-side, ${hubColor}66, transparent 70%);
          filter: blur(8px);
        }
        .hub{
          position:relative; display:grid; place-items:center; border-radius:9999px; cursor:pointer;
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
        .hub:hover{ transform: scale(1.05); box-shadow: 0 22px 44px rgba(0,0,0,.7), 0 0 40px ${hubColor}, 0 0 90px ${hubColor}, inset 0 2px 0 rgba(255,255,255,.3), inset 0 -8px 18px rgba(0,0,0,.7); filter: brightness(1.06) saturate(1.12); }
        .hub:active{ transform: scale(.96); }
        .hub-icon{ width:${Math.round(size*0.62)}px; height:${Math.round(size*0.62)}px; object-fit: contain; filter: saturate(1.2) brightness(1.06) drop-shadow(0 0 8px ${hubColor}) drop-shadow(0 0 18px ${hubColor}); transition: filter 180ms ease, transform 180ms ease; }
        .hub:hover .hub-icon{ transform: scale(1.06); filter: saturate(1.28) brightness(1.08) drop-shadow(0 0 12px ${hubColor}) drop-shadow(0 0 28px ${hubColor}) drop-shadow(0 0 52px ${hubColor}); }

        .panel{ position:absolute; pointer-events:${open ? 'auto' : 'none'}; opacity:0; transition: opacity 200ms ease, transform 220ms cubic-bezier(0.2,0.8,0.2,1); }
        .panel.left{ right: calc(100% + 10px); top: 50%; transform-origin: right center; transform: translateY(6px) scale(0.98); }
        .panel.above{ bottom: calc(100% + 10px); left: 50%; transform-origin: center bottom; transform: translate(-50%, 6px) scale(0.98); }
        .panel.open.left{ opacity:1; transform: translateY(0) scale(1); }
        .panel.open.above{ opacity:1; transform: translate(-50%, 0) scale(1); }
        .panel-inner{ border-radius: 16px; padding: 12px; color:#fff; background:
            radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%),
            linear-gradient(180deg, rgba(0,0,0,.65), rgba(0,0,0,.55));
          border:1px solid rgba(255,255,255,.2);
          box-shadow: 0 18px 36px rgba(0,0,0,.5), 0 0 34px ${hubColor}55, 0 0 70px ${hubColor}33, inset 0 2px 0 rgba(255,255,255,.2), inset 0 -6px 14px rgba(0,0,0,.6);
          backdrop-filter: blur(10px);
        }
      `}</style>
      <audio ref={clickRef} src="/audio/join-alien.mp3" preload="auto" playsInline />
    </div>
  );
}

// Lightweight proxy that focuses the first input of JoinAliens when mounted
function JoinAliensInputProxy({ inputRef }: { inputRef: React.RefObject<HTMLInputElement> }) {
  const localRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    try {
      const host = localRef.current; if (!host) return;
      // Find the email input from the rendered JoinAliens component
      const email = host.querySelector<HTMLInputElement>("#join-email");
      if (email && inputRef && (inputRef as any).current === null) {
        (inputRef as any).current = email;
      }
      setTimeout(() => email?.focus(), 50);
    } catch {}
  }, [inputRef]);
  return (
    <div ref={localRef}>
      <JoinAliens />
    </div>
  );
}
