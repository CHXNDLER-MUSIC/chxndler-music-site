"use client";
import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

export default function HoloHUD({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const mount = useMemo(() => {
    if (typeof document === "undefined") return null;
    let el = document.getElementById("hud-root") as HTMLDivElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = "hud-root";
      document.body.appendChild(el);
    }
    return el;
  }, []);

  useEffect(() => {
    rootRef.current = (mount as HTMLElement) || null;
    return () => {
      // Keep root alive to allow toggling without remount flicker
    };
  }, [mount]);

  if (!mount) return null;

  return createPortal(
    <div className="fixed inset-0 overflow-visible z-50 pointer-events-none">
      {/* Origin sits over the dashboard; allow safe-area insets on mobile */}
      <div className="origin absolute left-1/2 -translate-x-1/2 [bottom:clamp(96px,18vh,220px)]"
           style={{ paddingLeft: "max(env(safe-area-inset-left),12px)" }}>
        {/* Projection system below panel (multi-layer, animated, exaggerated) */}
        <div className="relative mx-auto -mb-3 grid place-items-center">
          {/* base slit emitter (brighter and wider) */}
          <div className="proj-emitter" />
          {/* bright inner beam core (taller) */}
          <div className="proj-beam proj-core" />
          {/* soft outer halo (wider) */}
          <div className="proj-beam proj-halo" />
          {/* scanline streaks to suggest volumetric rays */}
          <div className="proj-scan" />
        </div>
        {/* Panel container; interactive */}
        <div className="hud-panel mx-auto w-[min(96vw,1280px)] rounded-2xl border border-cyan-300/60 bg-cyan-300/5 backdrop-blur-[2px] shadow-[0_0_40px_10px_rgba(0,255,255,0.12)] p-6 sm:p-7 grid gap-6 [grid-template-columns:1.3fr_1fr] [grid-template-areas:'title art' 'planet list'] pointer-events-auto"
             style={{ paddingRight: "max(env(safe-area-inset-right),12px)" }}>
          {children}
        </div>
      </div>
      <style jsx global>{`
        @media (max-width: 900px) {
          .hud-panel{ grid-template-columns: 1fr !important; grid-template-areas: 'title' 'art' 'planet' 'list' !important; }
          .planet-area{ transform: translateY(-12vh) scale(.85); }
          .list-area{ max-height: min(46vh, 420px) !important; }
        }

        /* Exaggerated projection system styles */
        .proj-emitter{ position:absolute; bottom:0; height:10px; width:min(34vw, 560px); border-radius:9999px; opacity:.95;
          background: radial-gradient(50% 60% at 50% 50%, rgba(25,227,255,.75), rgba(25,227,255,0) 72%);
          filter: blur(6px);
          animation: emitterPulse 2.2s ease-in-out infinite;
        }
        .proj-beam{ position:absolute; inset:0; pointer-events:none; mix-blend-mode:screen; transform-origin:bottom center; }
        .proj-core{ height:34vh; width:min(68vw, 1100px); bottom:0; left:50%; transform:translateX(-50%); filter: blur(7px);
          background: linear-gradient(0deg, rgba(25,227,255,.58), rgba(25,227,255,0));
          clip-path: polygon(49% 100%, 51% 100%, 98% 30%, 2% 30%);
          opacity:.95; animation: beamPulse 2.6s ease-in-out infinite;
        }
        .proj-halo{ height:32vh; width:min(78vw, 1280px); bottom:0; left:50%; transform:translateX(-50%); filter: blur(16px);
          background: linear-gradient(0deg, rgba(25,227,255,.38), rgba(25,227,255,0));
          clip-path: polygon(46% 100%, 54% 100%, 98% 32%, 2% 32%);
          opacity:.95; animation: beamPulse 3.2s ease-in-out infinite alternate;
        }
        .proj-scan{ position:absolute; bottom:2vh; height:26vh; width:min(70vw, 1200px); left:50%; transform:translateX(-50%);
          background: repeating-linear-gradient(0deg, rgba(25,227,255,.22), rgba(25,227,255,.22) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 8px);
          clip-path: polygon(46% 100%, 54% 100%, 98% 30%, 2% 30%);
          filter: blur(5px); opacity:.65; animation: scanShift 3.2s linear infinite;
        }

        @keyframes emitterPulse { 0%, 100% { opacity:.85; transform:scaleX(.94);} 50% { opacity:1; transform:scaleX(1);} }
        @keyframes beamPulse { 0%, 100% { opacity:.9; } 50% { opacity:1; } }
        @keyframes scanShift { 0% { background-position: 0 0; } 100% { background-position: 0 -80px; } }
      `}</style>
    </div>,
    mount
  );
}
