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
  size?: number; // optional per-item diameter (px)
};

export default function HoloHubMenu({
  items = [],
  radius = 110,
  hubColor = "#FC54AF",
  className,
  itemSize = 60,
  hubSize = 72,
  angles,
}: {
  items?: HubItem[];
  radius?: number;
  hubColor?: string;
  className?: string;
  itemSize?: number;
  hubSize?: number;
  // Optional explicit angle mapping per item id (degrees; -90 = 12 o'clock, 0 = 3 o'clock)
  angles?: Record<string, number>;
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
    return entries.map((it, i) => {
      // If explicit angle provided for this item id, use it; else even spacing
      const explicit = (angles && it?.id ? angles[it.id] : undefined);
      const angleDeg = (typeof explicit === 'number') ? explicit : (-90 + (360 / n) * i);
      const a = (angleDeg * Math.PI) / 180;
      // Allow subtle per-item placement tweaks without new props
      const rMul = it.id === 'yt' ? 0.86 : 1.0; // bring YouTube closer to hub
      let x = Math.cos(a) * (effRadius * rMul);
      let y = Math.sin(a) * (effRadius * rMul);
      if (it.id === 'yt') x += 8; // nudge slightly to the right
      return { x, y, angleDeg };
    });
  }, [entries, effRadius, angles]);

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
          {/* Comms hologram icon (fill tighter in ring) */}
          <img
            src="/elements/comms.png"
            alt=""
            className="hub-icon"
            style={{ width: Math.round(hubSize*0.88), height: Math.round(hubSize*0.88) }}
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
          const size = Math.max(40, (it as any)?.size ?? itemSize);
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
              data-id={it.id}
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
        .hub-glyph{ position: relative; display:inline-flex; }
        /* Inner glow masked to the comms icon shape so color shines "through" */
        .hub-glyph::before{
          content:""; position:absolute; inset:10%; pointer-events:none; mix-blend-mode:screen;
          background: radial-gradient(closest-side, ${hubColor}CC, ${hubColor}55 60%, transparent 75%);
          filter: blur(6px) saturate(1.1) brightness(1.05);
          -webkit-mask-image: url('/elements/comms.png');
          mask-image: url('/elements/comms.png');
          -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
          -webkit-mask-position: center; mask-position: center;
          -webkit-mask-size: contain; mask-size: contain;
        }
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
        .hub::before{ content:""; position:absolute; inset:-1%; border-radius:9999px; pointer-events:none;
          /* tighter halo with brighter core to reduce outside space */
          box-shadow: 0 0 46px ${hubColor}CC, 0 0 86px ${hubColor}88;
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
        .hub-icon{ object-fit: contain; display:block; transition: filter 180ms ease, transform 180ms ease; mix-blend-mode: screen;
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
        .item::before{ /* tighter rim, no gap */
          content:""; position:absolute; inset:0; border-radius:9999px; pointer-events:none;
          box-shadow: 0 0 0 2px rgba(255,255,255,.18) inset, 0 0 16px var(--tint, #38B6FF)30 inset;
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
        /* Simplify brand buttons: plain circle with logo only (same format/size) */
        .item[data-id="ig"], .item[data-id="tt"], .item[data-id="yt"], .item[data-id="sp"], .item[data-id="am"]{
          background: transparent;
          border: none;
          box-shadow: none;
        }
        .item[data-id="ig"]::before, .item[data-id="tt"]::before, .item[data-id="yt"]::before, .item[data-id="sp"]::before, .item[data-id="am"]::before{ display: none; }
        .item[data-id="ig"]::after,  .item[data-id="tt"]::after,  .item[data-id="yt"]::after,  .item[data-id="sp"]::after,  .item[data-id="am"]::after{ display: none; }
        .item[data-id="ig"] .icon, .item[data-id="tt"] .icon, .item[data-id="yt"] .icon, .item[data-id="sp"] .icon, .item[data-id="am"] .icon{
          position: relative; width: 86%; height: 86%; color: var(--tint, #38B6FF);
          filter: none;
          mix-blend-mode: normal;
        }
        /* Ensure SVG glyphs are transparent fills with brand-colored strokes so glow shines through */
        .item[data-id="ig"] .icon > svg, .item[data-id="tt"] .icon > svg, .item[data-id="yt"] .icon > svg, .item[data-id="sp"] .icon > svg, .item[data-id="am"] .icon > svg{
          width: 100%; height: 100%; display:block; fill: currentColor; stroke: none;
        }
        .item[data-id="ig"] .icon > svg *, .item[data-id="tt"] .icon > svg *, .item[data-id="yt"] .icon > svg *, .item[data-id="sp"] .icon > svg *, .item[data-id="am"] .icon > svg *{
          fill: currentColor !important; stroke: none !important;
        }
        /* Apple Music uses filled note now; no stroke override */
        .item[data-id="ig"] .icon svg, .item[data-id="tt"] .icon svg, .item[data-id="yt"] .icon svg, .item[data-id="sp"] .icon svg, .item[data-id="am"] .icon svg{ display:block; width:100%; height:100%; }
        /* Remove hologram glows for a clean reset */
        .item[data-id="ig"] .icon::before,
        .item[data-id="tt"] .icon::before,
        .item[data-id="yt"] .icon::before,
        .item[data-id="sp"] .icon::before,
        .item[data-id="am"] .icon::before,
        .item[data-id="ig"] .icon::after,
        .item[data-id="tt"] .icon::after,
        .item[data-id="yt"] .icon::after,
        .item[data-id="sp"] .icon::after,
        .item[data-id="am"] .icon::after{ display:none; }
        /* Tinted inner ring at the button level for a "through the button" glow */
        .item[data-id="ig"]::before, .item[data-id="tt"]::before, .item[data-id="yt"]::before, .item[data-id="sp"]::before, .item[data-id="am"]::before,
        .item[data-id="ig"]::after, .item[data-id="tt"]::after, .item[data-id="yt"]::after, .item[data-id="sp"]::after, .item[data-id="am"]::after{ display:none; }
        /* Remove any IG-specific halo; keep all brand items visually consistent */
        .item[data-id="ig"]:hover .icon, .item[data-id="tt"]:hover .icon, .item[data-id="yt"]:hover .icon, .item[data-id="sp"]:hover .icon, .item[data-id="am"]:hover .icon{ transform: scale(1.04); filter: none; }
        @keyframes holoCore {}
        .item:active{ transform: translate(var(--tx,0), var(--ty,0)) scale(0.98); }
        /* Focus ring should follow the item's own tint, not the hub color */
        .item:focus{ outline: 2px solid var(--tint, #38B6FF); outline-offset: 2px; }
        .item .icon{ display:flex; align-items:center; justify-content:center; color: inherit;
          width: 86%; height: 86%;
          filter: none;
          transition: transform 180ms ease;
        }
        .item .icon > img, .item .icon > svg{ width: 100% !important; height: 100% !important; }
        .item:hover .icon{ transform: scale(1.06); }
        @keyframes holoSheen { 0% { transform: translateX(-130%); } 55% { transform: translateX(130%);} 100% { transform: translateX(130%);} }
        .item .dot{ width: 10px; height:10px; border-radius:9999px; background:#9EEBFF; }

        @media (max-width: 480px) { .hub{ left:-32px; top:-32px; width:64px; height:64px; } .hub-icon{ width: 38px; height: 38px; } }
      `}</style>
      {/* Comms click SFX */}
      <audio ref={joinRef} src="/audio/join-alien.mp3" preload="auto" playsInline />
    </div>
  );
}
