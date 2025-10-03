"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track, storeClickData, generateClickId } from "@/lib/analytics";
import { createPortal } from "react-dom";
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
  radius: _radius = 110,
  hubColor = "#FC54AF",
  className,
  itemSize = 68,
  hubSize = 72,
  onToggle,
  isActive = false,
  anchorBottomPercent,
  anchorOffsetPx,
  closeSignal = 0,
  suspend = false,
}: {
  items?: HubItem[];
  radius?: number;
  hubColor?: string;
  className?: string;
  itemSize?: number;
  hubSize?: number;
  // Optional explicit angle mapping per item id (degrees; -90 = 12 o'clock, 0 = 3 o'clock)
  onToggle?: (isOpen: boolean) => void;
  isActive?: boolean;
  // Anchor the yellow panel relative to the yellow hub button
  anchorBottomPercent?: number; // baseline (same as buttons)
  anchorOffsetPx?: number;      // horizontal offset from center (same as buttons)
  // Increment to force-close the yellow panel (e.g., during warp)
  closeSignal?: number;
  // Temporarily hide panel contents without changing open state
  suspend?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hubRef = useRef<HTMLButtonElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);
  const lastItemRef = useRef<HTMLButtonElement | null>(null);
  const joinRef = useRef<HTMLAudioElement | null>(null);

  // Position yellow panel using unified touch point system
  // Bottom of display matches blue display position (30px lower)
  const beamBottomCss = 'calc(var(--display-touch-top) - 30px)';
  // Panel height fixed - yellow display should never change height
  const panelHeight = 104; // Fixed height (80px itemSize + 24px padding)

  // Cap at 6 items, evenly spaced 60deg, start at -90deg (top)
  const entries = useMemo(() => items.slice(0, 6), [items]);

  // Responsive radius logic was unused; removed effRadius state

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

  // Close the menu when an external close signal is sent (e.g., warp start)
  useEffect(() => {
    if (open) {
      setOpen(false);
      try { onToggle?.(false); } catch {}
    }
  }, [closeSignal]);

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
    const newOpen = !open;
    setOpen(newOpen);
    // Notify parent of state change
    onToggle?.(newOpen);
    // After opening, focus first item
    if (!open) setTimeout(() => firstItemRef.current?.focus(), 0);
  }, [open, onToggle]);

  const runItem = useCallback((it: HubItem, ev?: MouseEvent) => {
    // Explicitly track social/music platform clicks with a canonical label
    try {
      const labelMap: Record<string, string> = {
        ig: '📱 Instagram',
        tt: '📱 TikTok',
        yt: '📱 YouTube',
        sp: '🎵 Spotify',
        am: '🎵 Apple Music',
      };
      const element_label = labelMap[(it.id || '').toLowerCase()] || it.label || '📡 Comms Hub';
      track('click', {
        payload: {
          element_tag: 'button',
          element_class: 'item',
          element_text: it.label,
          element_label,
        }
      });

      // Also store locally so analytics UI can show counts without server
      try {
        const id = generateClickId();
        const ts = Date.now();
        storeClickData({
          id,
          timestamp: ts,
          element: {
            tagName: 'button',
            className: 'item holo-hub',
            id: '',
            textContent: it.label,
            role: 'button',
            dataId: it.id,
          },
          position: {
            x: (ev as any)?.clientX ?? 0,
            y: (ev as any)?.clientY ?? 0,
            screenX: (ev as any)?.screenX ?? 0,
            screenY: (ev as any)?.screenY ?? 0,
          },
          viewport: { width: window.innerWidth, height: window.innerHeight },
          page: { url: window.location.href, title: document.title },
          userAgent: navigator.userAgent,
          enhancedLabel: element_label,
        });
      } catch {}
    } catch {}
    // Then perform the actual action
    try { if (typeof it.onClick === "function") it.onClick(); else if (it.href) window.open(it.href, "_blank", "noopener,noreferrer"); } catch {}
    // Keep the yellow panel open after clicking social links.
    // Do not call setOpen(false) here so the display stays visible.
    // Also avoid notifying onToggle to prevent unintended beam/color changes.
    // Optionally, we could return focus to the clicked button, but leaving focus as-is is fine.
  }, [onToggle]);

  // Compute positions; when closed, items sit on hub (0,0)
  // For open state, arrange items in a single horizontal line within the yellow panel
  const positions = useMemo(() => {
    const n = entries.length || 1;
    return entries.map((_, i) => {
      if (!open) {
        return { x: 0, y: 0, angleDeg: 0 };
      }
      
      // Arrange all buttons in a single horizontal line within the panel width (fixed)
      const panelWidth = 400; // Fixed width - yellow display should never change size
      const buttonSizes = entries.map(entry => itemSize);
      const currentButtonSize = buttonSizes[i];
      const totalButtonWidth = buttonSizes.reduce((sum, size) => sum + size, 0);
      const maxAvailableWidth = panelWidth - 40; // Leave 20px margin on each side
      
      // Calculate spacing between buttons - ensure we don't exceed panel width
      let spacing = 0;
      if (n > 1) {
        const maxSpacing = (maxAvailableWidth - totalButtonWidth) / (n - 1);
        // Slightly tighten default spacing between buttons
        spacing = Math.max(4, Math.min(itemSize * 0.2, maxSpacing)); // Min 4px, max 20% of itemSize
      }
      
      // Calculate total width and ensure it fits
      let totalWidth = totalButtonWidth + (spacing * (n - 1));
      if (totalWidth > maxAvailableWidth) {
        // If still too wide, reduce spacing to minimum
        spacing = Math.max(2, (maxAvailableWidth - totalButtonWidth) / (n - 1));
        totalWidth = totalButtonWidth + (spacing * (n - 1));
      }
      
      // Center the entire group within the panel
      const startX = -totalWidth / 2;
      let currentX = startX;
      
      // Calculate position for current button
      for (let j = 0; j < i; j++) {
        currentX += buttonSizes[j] + spacing;
      }
      const x = currentX + currentButtonSize / 2;
      const y = 0; // All buttons on same vertical plane
      
      return { x, y, angleDeg: 0 };
    });
  }, [entries, open, itemSize]);

  return (
    <div
      ref={rootRef}
      className={`holo-hub-wrap ${typeof className === 'string' ? className : ""}`}
      onMouseDown={(e) => { e.stopPropagation(); }}
      onClick={(e) => { e.stopPropagation(); }}
    >
      {/* Beam ring under hub */}
      <div className="beam" aria-hidden />
      <button
        ref={hubRef}
        type="button"
        className={`hub ${open ? "on" : ""} ${isActive ? "hub-active" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close Comms" : "Open Comms"}
        onClick={(e) => { e.stopPropagation(); onHubClick(); }}
        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
        onMouseDown={(e) => { e.stopPropagation(); }}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !open) { e.preventDefault(); onHubClick(); } }}
        style={{ width: hubSize, height: hubSize, position: 'relative' } as React.CSSProperties}
      >
        <span className="hub-glyph mask-element-comms" aria-hidden>
          {/* Comms hologram icon (fill tighter in ring) */}
          <img
            src="/elements/comms.png"
            alt=""
            className="hub-icon"
            style={{ width: Math.round(hubSize*0.88), height: Math.round(hubSize*0.88) }}
            draggable={false}
          />
        </span>
        <span className="sr-only">{open ? "Close Comms Display" : "Comms"}</span>
      </button>

      {/* Centered yellow panel + items container */}
      <div
        className="panel-wrap"
        aria-hidden={!open || suspend}
        style={{
          // Bottom of yellow display should sit exactly on top of the light beam
          position: 'fixed',
          bottom: beamBottomCss,
          // Center the yellow display perfectly on screen
          left: '50%',
          transform: 'translateX(-50%)',
          // Slightly wider than blue/pink displays (grow evenly on both sides)
          width: `calc(var(--display-width) + 32px)`,
          // Height based on item size so the glass edge consistently meets the beam tip
          height: panelHeight,
          pointerEvents: open && !suspend ? 'auto' : 'none',
          // Render above the light beam (beam is z-95)
          zIndex: 98,
          borderRadius: `var(--display-border-radius)`,
          overflow: 'hidden',
          opacity: open && !suspend ? 1 : 0,
          transition: 'opacity 200ms ease, transform 220ms cubic-bezier(0.2,0.8,0.2,1)',
          // Hide inline instance; we will render via portal as a sibling overlay
          display: 'none'
        } as React.CSSProperties}
      >
        {/* Yellow hologram background panel */}
        <div className="background-panel" aria-hidden />

        {/* Horizontal line items */}
        <div className="items" role="menu" aria-hidden={!open}>
        {entries.map((it, i) => {
          const pos = positions[i];
          const atRest = open;
          const tint = it.color || "#38B6FF";
          const isFirst = i === 0;
          const isLast = i === entries.length - 1;
          const size = itemSize;
          return (
            <button
              key={it.id}
              ref={isFirst ? firstItemRef : isLast ? lastItemRef : undefined}
              type="button"
              className="item"
              role="menuitem"
              data-no-track
              tabIndex={open ? 0 : -1}
              data-id={it.id}
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(${atRest ? pos.x : 0}px, ${atRest ? pos.y : 0}px) translate(-50%, -50%) scale(${open ? 1 : 0.85})`,
                opacity: open ? 1 : 0,
                // use CSS var for tint so hover styles can reference it
                ['--tint' as any]: tint,
                // Set proper translation values for hover states
                ['--tx' as any]: `${atRest ? pos.x : 0}px`,
                ['--ty' as any]: `${atRest ? pos.y : 0}px`,
                borderColor: `${tint}AA`,
                width: `${size}px`,
                height: `${size}px`,
              }}
              onClick={(e) => { e.stopPropagation(); try { sfx.play('join', 0.9); } catch {}; runItem(it, e as unknown as MouseEvent); }}
              onMouseDown={(e) => { e.stopPropagation(); }}
              onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
              title={it.label}
            >
              <span className="icon" aria-hidden>
                {typeof it.icon === "string" ? (
                  <img src={it.icon} alt="" />
                ) : (
                  it.icon || <span className="dot" />
                )}
              </span>
              <span className="sr-only">{it.label}</span>
            </button>
          );
        })}
        </div>
      </div>

      {/* Portal-rendered yellow panel so it is not nested under the hub button */}
      {typeof window !== 'undefined' ? createPortal(
        (
          <div
            className="panel-wrap"
            aria-hidden={!open || suspend}
            style={{
              position: 'fixed',
              bottom: beamBottomCss,
              left: '50%',
              transform: 'translateX(-50%)',
          width: `calc(var(--display-width) + 32px)`,
              height: panelHeight,
              pointerEvents: open && !suspend ? 'auto' : 'none',
              zIndex: 98,
              borderRadius: `var(--display-border-radius)`,
              overflow: 'hidden',
              opacity: open && !suspend ? 1 : 0,
              transition: 'opacity 200ms ease, transform 220ms cubic-bezier(0.2,0.8,0.2,1)'
            } as React.CSSProperties}
          >
            <div className="background-panel" aria-hidden />
            <div className="items" role="menu" aria-hidden={!open}>
              {entries.map((it, i) => {
                const pos = positions[i];
                const atRest = open;
                const tint = it.color || "#38B6FF";
                const isFirst = i === 0;
                const isLast = i === entries.length - 1;
                const size = itemSize;
                return (
                  <button
                    key={it.id}
                    ref={isFirst ? firstItemRef : isLast ? lastItemRef : undefined}
                    type="button"
                    className="item"
                    role="menuitem"
                    data-no-track
                    tabIndex={open ? 0 : -1}
                    data-id={it.id}
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `translate(${atRest ? pos.x : 0}px, ${atRest ? pos.y : 0}px) translate(-50%, -50%) scale(${open ? 1 : 0.85})`,
                      opacity: open ? 1 : 0,
                      ['--tint' as any]: tint,
                      ['--tx' as any]: `${atRest ? pos.x : 0}px`,
                      ['--ty' as any]: `${atRest ? pos.y : 0}px`,
                      borderColor: `${tint}AA`,
                      width: `${size}px`,
                      height: `${size}px`,
                    }}
                    onClick={(e) => { e.stopPropagation(); try { sfx.play('join', 0.9); } catch {}; runItem(it, e as unknown as MouseEvent); }}
                    onMouseDown={(e) => { e.stopPropagation(); }}
                    onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                    title={it.label}
                  >
                    <span className="icon" aria-hidden>
                      {typeof it.icon === 'string' ? (
                        <img src={String(it.icon)} alt="" />
                      ) : (
                        it.icon || <span className="dot" />
                      )}
                    </span>
                    <span className="sr-only">{it.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ),
        document.body
      ) : null}

      <style jsx>{`
        .holo-hub-wrap{ position: relative; }
        .beam{ position:absolute; left:-70px; top:-18px; width:140px; height:36px; pointer-events:none; mix-blend-mode:screen;
          background: radial-gradient(closest-side, ${hubColor}66, transparent 70%);
          filter: blur(8px);
        }
        
        /* panel-wrap positioning now handled via inline style for responsiveness */
        /* Yellow hologram background panel */
        .background-panel{ 
          position: absolute; 
          inset: 0;
          border-radius: 16px; 
          pointer-events: none;
          overflow: hidden; /* Ensure buttons stay within panel */
          background:
            linear-gradient(180deg, #F2EF1D44, #F2EF1D33),
            radial-gradient(120% 100% at 50% -10%, rgba(242,239,29,.15), rgba(242,239,29,.05) 42%),
            linear-gradient(180deg, #F2EF1D33, #F2EF1D22);
          border: 1px solid #F2EF1D66;
          box-shadow: 
            0 18px 36px rgba(0,0,0,.5), 
            0 0 42px #F2EF1DDD, 
            0 0 100px #F2EF1DAA, 
            inset 0 2px 0 rgba(255,255,255,.3), 
            inset 0 -6px 14px rgba(242,239,29,.2);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          animation: ${open ? 'yellowPanelPulse 2.6s ease-in-out infinite' : 'none'};
        }
        
        /* Items fill panel; we will center via each item's left/top 50% + translate */
        .items{ position:absolute; inset:0; pointer-events:${open ? "auto" : "none"}; z-index: 11; }
        /* Hologram hub button */
        .hub-glyph{ position: relative; display:inline-flex; }
        /* Inner glow masked to the comms icon shape so color shines "through" */
        .hub-glyph::before{
          content:""; position:absolute; inset:10%; pointer-events:none; mix-blend-mode:screen;
          background: radial-gradient(closest-side, ${hubColor}CC, ${hubColor}55 60%, transparent 75%);
          filter: blur(6px) saturate(1.1) brightness(1.05);
        }
        .hub{
          position:absolute; border-radius:9999px; cursor:pointer;
          display:grid; place-items:center;
          background:
            radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.04), rgba(255,255,255,0) 42%),
            radial-gradient(ellipse 140% 120% at 30% 20%, #F2EF1D33, transparent 70%),
            linear-gradient(135deg, #F2EF1D22, #F2EF1D08 50%, transparent 80%),
            rgba(242,239,29,0.18);
          border:1px solid #F2EF1D44;
          box-shadow:
            0 12px 24px rgba(0,0,0,.6),
            0 0 22px #F2EF1DBB,
            0 0 56px #F2EF1D66,
            0 0 100px #F2EF1D33,
            inset 0 2px 0 rgba(255,255,255,.25),
            inset 0 -6px 14px rgba(0,0,0,.6),
            inset 0 0 20px #F2EF1D22;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          animation: holoPulse 2.6s ease-in-out infinite;
          transition: transform 150ms ease, box-shadow 200ms ease, filter 180ms ease;
        }
        .hub::before{ content:""; position:absolute; inset:-2%; border-radius:9999px; pointer-events:none;
          /* Subtler yellow halo glow */
          box-shadow: 
            0 0 26px #F2EF1DDD, 
            0 0 56px #F2EF1D88,
            0 0 90px #F2EF1D44;
          animation: holoHalo 3.2s ease-in-out infinite;
        }
        .hub::after{ content:""; position:absolute; inset:0; border-radius:9999px; pointer-events:none; mix-blend-mode:screen; opacity:.8;
          background:
            linear-gradient(120deg, rgba(255,255,255,.25), rgba(255,255,255,0) 60%),
            linear-gradient(45deg, #F2EF1D44, transparent 30%),
            repeating-linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.12) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px);
        }
        .hub:hover{ transform: scale(1.06); box-shadow:
            0 16px 30px rgba(0,0,0,.68),
            0 0 34px #F2EF1DEE,
            0 0 90px #F2EF1DBB,
            0 0 150px #F2EF1D55,
            inset 0 2px 0 rgba(255,255,255,.35), 
            inset 0 -8px 18px rgba(0,0,0,.65),
            inset 0 0 30px #F2EF1D33;
          filter: brightness(1.06) saturate(1.15);
        }
        /* Selected/open state: calmer than hover */
        .hub.on{
          transform: none;
          box-shadow:
            0 12px 26px rgba(0,0,0,.6),
            0 0 20px #F2EF1DBB,
            0 0 40px #F2EF1D66,
            inset 0 2px 0 rgba(255,255,255,.25),
            inset 0 -6px 14px rgba(0,0,0,.6),
            inset 0 0 20px #F2EF1D22;
          filter: brightness(1.0) saturate(1.06);
        }
        @keyframes holoHalo { 
          0%, 100% { opacity: 0.8; transform: scale(1); } 
          50% { opacity: 1; transform: scale(1.05); } 
        }
        .hub:active{ transform: scale(.96); }
        .hub-active {
          animation: hubActiveGlow 2s ease-in-out infinite, holoPulse 2.6s ease-in-out infinite;
          box-shadow:
            0 14px 28px rgba(0,0,0,.7),
            0 0 50px #F2EF1DFF,
            0 0 100px #F2EF1DCC,
            0 0 150px #F2EF1D88,
            inset 0 2px 0 rgba(255,255,255,.25),
            inset 0 -6px 14px rgba(0,0,0,.6),
            inset 0 0 20px #F2EF1D22;
        }
        .hub-active::before {
          box-shadow: 
            0 0 60px #F2EF1DFF, 
            0 0 120px #F2EF1DCC,
            0 0 180px #F2EF1D88;
        }
        @keyframes hubActiveGlow {
          0%, 100% { 
            filter: brightness(1.3) saturate(1.4);
            transform: scale(1);
          }
          50% { 
            filter: brightness(1.5) saturate(1.6);
            transform: scale(1.02);
          }
        }
        .hub-icon{ object-fit: contain; display:block; transition: filter 180ms ease, transform 180ms ease; mix-blend-mode: screen;
          filter: saturate(1.24) brightness(1.08)
            drop-shadow(0 0 24px #F2EF1D)
            drop-shadow(0 0 62px #F2EF1D);
        }
        .hub:hover .hub-icon{ transform: scale(1.06); filter: saturate(1.34) brightness(1.14)
            drop-shadow(0 0 32px #F2EF1D)
            drop-shadow(0 0 88px #F2EF1D); }
        @keyframes holoPulse { 0%,100%{ filter: brightness(1) } 50%{ filter: brightness(1.08) } }
        
        /* Synchronized yellow panel pulsing */
        @keyframes yellowPanelPulse {
          0%, 100% { 
            filter: brightness(1) saturate(1);
            box-shadow: 
              0 18px 36px rgba(0,0,0,.5), 
              0 0 42px #F2EF1DDD, 
              0 0 100px #F2EF1DAA, 
              inset 0 2px 0 rgba(255,255,255,.3), 
              inset 0 -6px 14px rgba(242,239,29,.2);
          }
          50% { 
            filter: brightness(1.06) saturate(1.1);
            box-shadow: 
              0 18px 36px rgba(0,0,0,.5), 
              0 0 52px #F2EF1DFF, 
              0 0 120px #F2EF1DCC, 
              inset 0 2px 0 rgba(255,255,255,.35), 
              inset 0 -6px 14px rgba(242,239,29,.25);
          }
        }

        /* old .items rule replaced by centered .items inside panel-wrap */
        /* Radial items: circular hologram chrome around each icon */
        .item{
          position:absolute; border-radius:9999px; width: 44px; height: 44px;
          display:grid; place-items:center; color:#fff; cursor:pointer;
          /* Lighter, glassy base with subtle tint */
          background:
            radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 42%),
            rgba(25,227,255,0.45);
          border: 1px solid rgba(255,255,255,.14);
          box-shadow:
            0 12px 26px rgba(0,0,0,.55),
            0 0 22px var(--tint, #38B6FF)88,
            0 0 60px var(--tint, #38B6FF)44,
            inset 0 1px 0 rgba(255,255,255,.22),
            inset 0 -6px 14px rgba(0,0,0,.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: transform 180ms ease-out, opacity 200ms ease, box-shadow 160ms ease, filter 160ms ease;
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
        }
        .item:hover{ transform: translate(var(--tx,0), var(--ty,0)) translate(-50%, -50%) scale(1.06); box-shadow:
            0 16px 30px rgba(0,0,0,.65),
            0 0 50px var(--tint, #38B6FF),
            0 0 120px var(--tint, #38B6FF),
            inset 0 1px 0 rgba(255,255,255,.26), inset 0 -6px 16px rgba(0,0,0,.6);
          filter: brightness(1.05) saturate(1.1);
        }
        /* All brand buttons: completely clean appearance with NO effects whatsoever */
        .item[data-id="ig"], .item[data-id="tt"], .item[data-id="yt"], .item[data-id="sp"], .item[data-id="am"]{
          background: none !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          overflow: visible;
          --tint: transparent !important; /* Override tint color */
        }
        .item[data-id="ig"]:hover, .item[data-id="tt"]:hover, .item[data-id="yt"]:hover, .item[data-id="sp"]:hover, .item[data-id="am"]:hover{
          background: none !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          filter: brightness(1.08) !important;
          transform: translate(var(--tx,0), var(--ty,0)) translate(-50%, -50%) scale(1.04) !important; /* Maintain position with scale */
        }
        .item[data-id="ig"]::before, .item[data-id="tt"]::before, .item[data-id="yt"]::before, .item[data-id="sp"]::before, .item[data-id="am"]::before,
        .item[data-id="ig"]:hover::before, .item[data-id="tt"]:hover::before, .item[data-id="yt"]:hover::before, .item[data-id="sp"]:hover::before, .item[data-id="am"]:hover::before,
        .item[data-id="ig"]::after, .item[data-id="tt"]::after, .item[data-id="yt"]::after, .item[data-id="sp"]::after, .item[data-id="am"]::after{
          display: none !important;
        }
        /* Brand button icons - fill entire button area completely */
        .item[data-id="ig"] .icon, .item[data-id="yt"] .icon, .item[data-id="sp"] .icon, .item[data-id="am"] .icon{
          position: absolute; inset: 0; width: 100%; height: 100%; 
          display: block; padding: 0 !important; margin: 0 !important;
          transition: none;
        }
        /* TikTok button icon - smaller than other brand buttons */
        .item[data-id="tt"] .icon{
          position: absolute; inset: 8%; width: 84%; height: 84%; 
          display: block; padding: 0 !important; margin: 0 !important;
          transition: none;
        }
        .item[data-id="ig"] .icon img, .item[data-id="tt"] .icon img, .item[data-id="yt"] .icon img, .item[data-id="sp"] .icon img, .item[data-id="am"] .icon img{
          position: absolute; inset: 0; width: 100% !important; height: 100% !important; 
          display: block !important; object-fit: cover !important; border-radius: 50% !important;
          max-width: none !important; max-height: none !important;
          transform: none !important; padding: 0 !important; margin: 0 !important;
          box-sizing: border-box !important;
        }
        /* Regular icon wrapper for non-brand buttons */
        .item .icon{
          position: relative; width: 100%; height: 100%; 
          display: flex; align-items: center; justify-content: center;
          padding: 0 !important; margin: 0 !important;
          transition: transform 180ms ease, filter 160ms ease;
        }
        /* Override any general hover effects for brand buttons */
        .item[data-id="ig"]:hover .icon, .item[data-id="tt"]:hover .icon, .item[data-id="yt"]:hover .icon, .item[data-id="sp"]:hover .icon, .item[data-id="am"]:hover .icon{
          transform: none !important;
          filter: none !important;
        }
        /* General hover for non-brand buttons */
        .item:not([data-id="ig"]):not([data-id="tt"]):not([data-id="yt"]):not([data-id="sp"]):not([data-id="am"]):hover .icon{
          transform: scale(1.08);
          filter: brightness(1.1);
        }
        @keyframes holoCore {}
        .item:active{ transform: translate(var(--tx,0), var(--ty,0)) translate(-50%, -50%) scale(0.95); }
        /* Focus ring should follow the item's own tint, not the hub color */
        .item:focus{ outline: 2px solid var(--tint, #38B6FF); outline-offset: 2px; }
        .item .dot{ width: 10px; height:10px; border-radius:9999px; background:#9EEBFF; }

        @media (max-width: 480px) { .hub{ left:-32px; top:-32px; width:64px; height:64px; } .hub-icon{ width: 38px; height: 38px; } }
      `}</style>
      {/* Comms click SFX */}
      <audio ref={joinRef} src="/audio/join-alien.mp3" preload="auto" playsInline />
    </div>
  );
}
