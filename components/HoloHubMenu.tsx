"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sfx } from "@/lib/sfx";

type HubItem = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode | string; // string treated as img src
  color?: string; // optional tint
};

export default function HoloHubMenu({
  items = [],
  radius = 110,
  hubColor = "#FC54AF",
  className,
  itemSize = 60,
  hubSize = 72,
}: {
  items?: HubItem[];
  radius?: number;
  hubColor?: string;
  className?: string;
  itemSize?: number;
  hubSize?: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hubRef = useRef<HTMLButtonElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);
  const lastItemRef = useRef<HTMLButtonElement | null>(null);
  const joinRef = useRef<HTMLAudioElement | null>(null);

  // Cap at 6 items, evenly spaced 60deg, start at -90deg (top)
  const entries = useMemo(() => items.slice(0, 6), [items]);

  // Responsive radius: keep on-screen on narrow displays
  const [effRadius, setEffRadius] = useState(radius);
  useEffect(() => {
    function recompute() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const dim = Math.min(vw, vh);
      // Reserve ~140px for hub/button area; never below 60
      const maxR = Math.max(60, Math.floor(dim / 2) - 140);
      setEffRadius(Math.min(radius, maxR));
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [radius]);

  // Outside click closes the menu
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      const r = rootRef.current; if (!r) return;
      if (!r.contains(e.target as Node)) {
        setOpen(false);
        // Return focus to hub when closing via outside click
        setTimeout(() => hubRef.current?.focus(), 0);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // ESC closes the menu and returns focus to hub
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        setTimeout(() => hubRef.current?.focus(), 0);
      }
      // Simple wrap focus when open using Tab
      if (open && e.key === "Tab") {
        const fwd = !e.shiftKey;
        const first = firstItemRef.current;
        const last = lastItemRef.current;
        if (!first || !last) return;
        const active = document.activeElement as HTMLElement | null;
        if (fwd && active === last) { e.preventDefault(); first.focus(); }
        else if (!fwd && active === first) { e.preventDefault(); last.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const onHubClick = useCallback(() => {
    // Play join-alien SFX on hub click
    try { const a = joinRef.current; if (a) { a.currentTime = 0; a.volume = 0.95; void a.play(); } } catch {}
    setOpen((o) => !o);
    // After opening, focus first item
    if (!open) setTimeout(() => firstItemRef.current?.focus(), 0);
  }, [open]);

  const runItem = useCallback((it: HubItem) => {
    try { if (typeof it.onClick === "function") it.onClick(); else if (it.href) window.open(it.href, "_blank", "noopener,noreferrer"); } catch {}
    setOpen(false);
    // Return focus to hub after action
    setTimeout(() => hubRef.current?.focus(), 0);
  }, []);

  // Compute positions; when closed, items sit on hub (0,0)
  const positions = useMemo(() => {
    const n = entries.length || 1;
    return entries.map((_, i) => {
      const angleDeg = -90 + (360 / n) * i; // start at top
      const a = (angleDeg * Math.PI) / 180;
      const x = Math.cos(a) * effRadius;
      const y = Math.sin(a) * effRadius;
      return { x, y, angleDeg };
    });
  }, [entries, effRadius]);

  return (
    <div
      ref={rootRef}
      className={`holo-hub-wrap ${className || ""}`}
      onMouseDown={(e) => { e.stopPropagation(); }}
      onClick={(e) => { e.stopPropagation(); }}
    >
      {/* Beam ring under hub */}
      <div className="beam" aria-hidden />
      <button
        ref={hubRef}
        type="button"
        className={`hub ${open ? "on" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close Comms" : "Open Comms"}
        onClick={(e) => { e.stopPropagation(); onHubClick(); }}
        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
        onMouseDown={(e) => { e.stopPropagation(); }}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !open) { e.preventDefault(); onHubClick(); } }}
        style={{ width: hubSize, height: hubSize, left: -Math.round(hubSize/2), top: -Math.round(hubSize/2) } as React.CSSProperties}
      >
        <span className="hub-glyph" aria-hidden>
          {/* Comms hologram icon */}
          <img
            src="/elements/comms.png"
            alt=""
            className="hub-icon"
            style={{ width: Math.round(hubSize*0.72), height: Math.round(hubSize*0.72) }}
            onError={(e)=>{ const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = "/elements/chxndler.png"; }}
          />
        </span>
        <span className="sr-only">{open ? "Close communications menu" : "Open communications menu"}</span>
      </button>

      {/* Radial items */}
      <div className="items" role="menu" aria-hidden={!open}>
        {entries.map((it, i) => {
          const pos = positions[i];
          const atRest = open;
          const tint = it.color || "#38B6FF";
          const isFirst = i === 0;
          const isLast = i === entries.length - 1;
          const size = Math.max(40, itemSize);
          const half = Math.round(size / 2);
          const iconPx = Math.round(size * 0.5);
          return (
            <button
              key={it.id}
              ref={isFirst ? firstItemRef : isLast ? lastItemRef : undefined}
              type="button"
              className="item"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              style={{
                transform: `translate(${atRest ? pos.x : 0}px, ${atRest ? pos.y : 0}px) scale(${open ? 1 : 0.85})`,
                opacity: open ? 1 : 0,
                // use CSS var for tint so hover styles can reference it
                ['--tint' as any]: tint,
                borderColor: `${tint}AA`,
                width: `${size}px`,
                height: `${size}px`,
                left: `-${half}px`,
                top: `-${half}px`,
              }}
              onClick={(e) => { e.stopPropagation(); try { sfx.play('join', 0.9); } catch {}; runItem(it); }}
              onMouseDown={(e) => { e.stopPropagation(); }}
              onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
              title={it.label}
            >
              <span className="icon" aria-hidden>
                {typeof it.icon === "string" ? (
                  <img src={it.icon} alt="" style={{ width: iconPx, height: iconPx }} />
                ) : (
                  it.icon || <span className="dot" />
                )}
              </span>
              <span className="sr-only">{it.label}</span>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .holo-hub-wrap{ position: relative; width: 0; height: 0; /* anchored at center via parent */ }
        .beam{ position:absolute; left:-70px; top:-18px; width:140px; height:36px; pointer-events:none; mix-blend-mode:screen;
          background: radial-gradient(closest-side, ${hubColor}66, transparent 70%);
          filter: blur(8px);
        }
        /* Hologram hub button */
        .hub{
          position:absolute; border-radius:9999px; cursor:pointer;
          display:grid; place-items:center;
          background:
            radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%),
            linear-gradient(180deg, rgba(8,16,26,.45), rgba(0,0,0,.38));
          border:1px solid rgba(255,255,255,.14);
          box-shadow:
            0 14px 28px rgba(0,0,0,.6),
            0 0 30px ${hubColor}88,
            0 0 80px ${hubColor}55,
            inset 0 1px 0 rgba(255,255,255,.22),
            inset 0 -6px 14px rgba(0,0,0,.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: holoPulse 2.6s ease-in-out infinite;
          transition: transform 150ms ease, box-shadow 200ms ease, filter 180ms ease;
        }
        .hub::before{ content:""; position:absolute; inset:-4%; border-radius:9999px; pointer-events:none;
          box-shadow: 0 0 38px ${hubColor}88, 0 0 110px ${hubColor}55;
        }
        .hub::after{ content:""; position:absolute; inset:0; border-radius:9999px; pointer-events:none; mix-blend-mode:screen; opacity:.6;
          background:
            linear-gradient(120deg, rgba(255,255,255,.18), rgba(255,255,255,0) 60%),
            repeating-linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.08) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px);
          transform: translateX(-130%);
          animation: holoSheen 3s ease-in-out infinite;
        }
        .hub:hover{ transform: scale(1.07); box-shadow:
            0 18px 34px rgba(0,0,0,.68),
            0 0 56px ${hubColor},
            0 0 140px ${hubColor}AA,
            inset 0 1px 0 rgba(255,255,255,.28), inset 0 -8px 18px rgba(0,0,0,.65);
          filter: brightness(1.08) saturate(1.15);
        }
        .hub:active{ transform: scale(.96); }
        .hub-icon{ object-fit: contain; display:block; transition: filter 180ms ease, transform 180ms ease;
          filter: saturate(1.2) brightness(1.06)
            drop-shadow(0 0 18px ${hubColor})
            drop-shadow(0 0 42px ${hubColor});
        }
        .hub:hover .hub-icon{ transform: scale(1.06); filter: saturate(1.32) brightness(1.12)
            drop-shadow(0 0 24px ${hubColor})
            drop-shadow(0 0 64px ${hubColor}); }
        @keyframes holoPulse { 0%,100%{ filter: brightness(1) } 50%{ filter: brightness(1.08) } }

        .items{ position:absolute; left:0; top:0; width:0; height:0; pointer-events:${open ? "auto" : "none"}; }
        /* Radial items: circular hologram chrome around each icon */
        .item{
          position:absolute; border-radius:9999px; left: -22px; top: -22px; width: 44px; height: 44px;
          display:grid; place-items:center; color:#fff; cursor:pointer;
          /* Lighter, glassy base with subtle tint */
          background:
            radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%),
            linear-gradient(180deg, rgba(8,16,26,.45), rgba(0,0,0,.38));
          border: 1px solid rgba(255,255,255,.14);
          box-shadow:
            0 12px 26px rgba(0,0,0,.55),
            0 0 16px var(--tint, #38B6FF)66,
            0 0 30px var(--tint, #38B6FF)33,
            inset 0 1px 0 rgba(255,255,255,.22),
            inset 0 -6px 14px rgba(0,0,0,.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease, box-shadow 160ms ease, filter 160ms ease;
        }
        .item::before{ /* outer rim + inner neon */
          content:""; position:absolute; inset:-2px; border-radius:9999px; pointer-events:none;
          box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset, 0 0 0 1px rgba(0,255,255,.06), 0 0 18px var(--tint, #38B6FF)33 inset;
        }
        .item::after{ /* sheen + scanline shimmer */
          content:""; position:absolute; inset:0; border-radius:9999px; pointer-events:none; mix-blend-mode:screen; opacity:.6;
          background:
            linear-gradient(120deg, rgba(255,255,255,.18), rgba(255,255,255,0) 60%),
            repeating-linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.08) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px);
          transform: translateX(-130%);
          animation: holoSheen 2.8s ease-in-out infinite;
        }
        .item:hover{ transform: translate(var(--tx,0), var(--ty,0)) scale(1.08); box-shadow:
            0 18px 34px rgba(0,0,0,.68),
            0 0 42px var(--tint, #38B6FF),
            0 0 96px var(--tint, #38B6FF),
            inset 0 1px 0 rgba(255,255,255,.28), inset 0 -8px 18px rgba(0,0,0,.65);
          filter: brightness(1.08) saturate(1.16);
        }
        .item:active{ transform: translate(var(--tx,0), var(--ty,0)) scale(0.98); }
        /* Focus ring should follow the item's own tint, not the hub color */
        .item:focus{ outline: 2px solid var(--tint, #38B6FF); outline-offset: 2px; }
        .item .icon{ display:inline-flex; align-items:center; justify-content:center; color: var(--tint, #9EEBFF);
          filter: drop-shadow(0 0 16px var(--tint, #38B6FF)) drop-shadow(0 0 36px var(--tint, #38B6FF));
          transition: filter 180ms ease, transform 180ms ease;
        }
        .item:hover .icon{ transform: scale(1.06); filter: drop-shadow(0 0 22px var(--tint, #38B6FF)) drop-shadow(0 0 64px var(--tint, #38B6FF)); }
        @keyframes holoSheen { 0% { transform: translateX(-130%); } 55% { transform: translateX(130%);} 100% { transform: translateX(130%);} }
        .item .dot{ width: 10px; height:10px; border-radius:9999px; background:#9EEBFF; }

        @media (max-width: 480px) { .hub{ left:-32px; top:-32px; width:64px; height:64px; } .hub-icon{ width: 38px; height: 38px; } }
      `}</style>
      {/* Comms click SFX */}
      <audio ref={joinRef} src="/audio/join-alien.mp3" preload="auto" playsInline />
    </div>
  );
}
