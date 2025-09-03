"use client";
import React, { useRef } from "react";
import LumaKeyVideo from "@/components/LumaKeyVideo";

export default function SteeringWheelOverlay({
  logoSrc = "/logo/CHXNDLER_Logo.png",
  onLaunch,
  POS,
  playing,
}: {
  logoSrc?: string;
  onLaunch: () => void;
  POS: any;
  playing?: boolean;
}) {
  const sfxRef = useRef<HTMLAudioElement|null>(null);
  const pauseRef = useRef<HTMLAudioElement|null>(null);
  const hoverRef = useRef<HTMLAudioElement|null>(null);

  function handleLaunch() {
    const willPause = !!playing;
    // Trigger toggle action first so downstream can open streaming links within a user gesture
    try { onLaunch(); } catch {}
    // Then play context-appropriate SFX without blocking the gesture
    // Remove launch sound on boost press; keep pause sound only when pausing
    try {
      if (willPause) {
        const a = pauseRef.current;
        if (a) { a.currentTime = 0; a.volume = 0.95; a.play().catch(()=>{}); }
      }
    } catch {}
    // Also attempt a direct, gesture-synchronous toggle of the main audio element
    // This helps bypass autoplay restrictions on iOS/Safari that reject play() in effects
    try {
      const main = document.querySelector<HTMLAudioElement>('audio[data-audio-player="1"]');
      if (main) {
        // Ensure not muted and reasonable volume
        try { main.muted = false; if (main.volume === 0) main.volume = 1.0; } catch {}
        if (willPause) { main.pause(); }
        else { void main.play(); }
      }
    } catch {}
  }

  const wheel = POS?.wheel || {};
  const lp = wheel.logo || { topVh: 66, leftVw: 26, sizePx: 72 };
  // Default play button to the exact center of the wheel logo
  const pp = wheel.play || { topVh: lp.topVh, leftVw: lp.leftVw, sizePx: Math.round(lp.sizePx * 0.9) };
  // Wheel video size (relative to footprint) + optional offsets
  const vconf = wheel.video || { scale: 4.0, offsetVh: 0, offsetVw: 0, centerHoriz: true, debug: false };
  const basePx = Math.max(lp.sizePx || 72, pp.sizePx || 64);
  const vs = Math.round(basePx * (vconf.scale || 4.0));

  const isBoost = Boolean((POS?.wheel && (POS.wheel as any).boost) || process.env.NEXT_PUBLIC_BOOST_BUTTON === '1' || process.env.NEXT_PUBLIC_PLAY_BUTTON_STYLE === 'boost');

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden
      suppressHydrationWarning
      style={{ position: 'absolute', inset: 0, zIndex: 80, pointerEvents: 'none' }}
    >
      {/* Wheel video projection aligned to cockpit wheel area */}
      <div
        style={{
          position: "absolute",
          // Center horizontally by default, align vertical using play button Y for cockpit fit
          top: `calc(${(pp.topVh + (vconf.offsetVh || 0))}vh - ${vs/2}px)`,
          left: vconf.centerHoriz
            ? `calc(50vw - ${vs/2}px)`
            : `calc(${(pp.leftVw + (vconf.offsetVw || 0))}vw - ${vs/2}px)`,
          width: vs,
          height: vs,
          transform: "none",
          borderRadius: vs/2,
          // Allow content like hands below the wheel to render past the circle
          overflow: "visible",
          zIndex: 60,
          outline: vconf.debug ? "1px dashed rgba(25,227,255,0.6)" : undefined,
          background: vconf.debug ? "rgba(25,227,255,0.08)" : "transparent",
        }}
      >
        <LumaKeyVideo
          srcMp4="/cockpit/wheel.mp4"
          srcAlt="/wheel.mp4"
          threshold={0.08}
          softness={0.08}
          offsetYRatio={0}
          className="block w-full h-full"
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>
      {/* Boost button anchored on the wheel */}
      <button
        onClick={handleLaunch}
        className={`pointer-events-auto wheel-play${isBoost ? ' boost' : ''}`}
        style={{
          position: "absolute",
          top: `calc(${pp.topVh}vh - ${pp.sizePx/2}px)`,
          left: `calc(${pp.leftVw}vw - ${pp.sizePx/2}px)`,
          width: pp.sizePx,
          height: pp.sizePx,
          borderRadius: 9999,
          transform: "none",
          zIndex: 90,
        }}
        onMouseEnter={() => { try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
        aria-label={isBoost ? "Boost" : (playing ? "Pause" : "Play")}
        title={isBoost ? "Boost" : (playing ? "Pause" : "Play")}
      >
        {/* Outer animated glow ring for boost visual */}
        {isBoost ? <span className="ring" aria-hidden /> : null}
        <span className="glyph" aria-hidden>
          {isBoost ? (
            <span className="boost-label">BOOST</span>
          ) : (
            playing ? (
              <svg viewBox="0 0 24 24" width="52" height="52" fill="currentColor">
                <rect x="6.5" y="5.5" width="4.2" height="13" rx="1.2" />
                <rect x="13.3" y="5.5" width="4.2" height="13" rx="1.2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="52" height="52" fill="currentColor">
                <path d="M7 5l12 7-12 7z" />
              </svg>
            )
          )}
        </span>
      </button>

      <style jsx>{`
        .wheel-play {
          position: relative;
          display:grid; place-items:center; font-size:22px; font-weight:700; color:#00ffd0;
          /* Thruster nozzle: dark metal face with inner glow */
          background:
            radial-gradient(60% 60% at 50% 40%, rgba(255,255,255,.08), rgba(255,255,255,0) 65%),
            radial-gradient(closest-side, rgba(0,255,160,.18), rgba(0,0,0,0) 70%),
            radial-gradient(100% 100% at 50% 50%, #0b0b0b, #000);
          box-shadow:
            0 14px 32px rgba(0,0,0,.55),
            0 0 32px rgba(0,255,180,.75),
            0 0 88px rgba(0,255,180,.55),
            inset 0 2px 0 rgba(255,255,255,.35),
            inset 0 -10px 22px rgba(0,0,0,.6),
            inset 0 0 34px rgba(0,255,200,.28);
          border:1px solid rgba(255,255,255,.22);
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease;
          overflow: visible;
        }
        /* BOOST variant: warm red/orange glow and plume */
        .wheel-play.boost{
          color:#fff;
          background:
            radial-gradient(60% 60% at 50% 40%, rgba(255,255,255,.10), rgba(255,255,255,0) 66%),
            radial-gradient(closest-side, rgba(255,100,80,.25), rgba(0,0,0,0) 72%),
            radial-gradient(120% 120% at 50% 60%, #161010, #000);
          box-shadow:
            0 14px 32px rgba(0,0,0,.55),
            0 0 36px rgba(255,59,48,.95),
            0 0 120px rgba(255,59,48,.55),
            inset 0 2px 0 rgba(255,255,255,.45),
            inset 0 -12px 24px rgba(0,0,0,.65),
            inset 0 0 40px rgba(255,92,72,.38);
          animation: breathe 1.8s ease-in-out infinite;
        }
        @keyframes breathe { 0%{ filter: brightness(1) } 50%{ filter: brightness(1.08) } 100%{ filter: brightness(1) } }
        /* Outer glow ring */
        .wheel-play .ring{ position:absolute; inset:-16%; border-radius:9999px; pointer-events:none;
          box-shadow: 0 0 0 2px rgba(255,59,48,.28), 0 0 34px rgba(255,59,48,.55), 0 0 90px rgba(255,59,48,.45);
          animation: ringPulse 1.6s ease-in-out infinite;
        }
        @keyframes ringPulse { 0%{ transform: scale(.96); opacity:.85 } 50%{ transform: scale(1); opacity:1 } 100%{ transform: scale(.96); opacity:.85 } }
        /* Nozzle inner rim */
        .wheel-play::before{
          content:""; position:absolute; inset:8%; border-radius:9999px; pointer-events:none;
          box-shadow: inset 0 0 0 2px rgba(0,255,180,.25), inset 0 0 30px rgba(0,255,180,.25), inset 0 -8px 18px rgba(0,0,0,.5);
          background: radial-gradient(70% 70% at 50% 40%, rgba(114,255,220,.12), rgba(0,0,0,0) 70%);
        }
        .wheel-play.boost::before{
          box-shadow: inset 0 0 0 2px rgba(255,59,48,.35), inset 0 0 36px rgba(255,120,100,.35), inset 0 -10px 18px rgba(0,0,0,.5);
          background: radial-gradient(70% 70% at 50% 40%, rgba(255,140,120,.16), rgba(0,0,0,0) 70%);
        }
        /* Exhaust plume shooting rightwards */
        .wheel-play::after{
          content:""; position:absolute; left:48%; top:30%; width:160%; height:40%; border-radius:9999px; pointer-events:none;
          background:
            radial-gradient(80% 70% at 0% 50%, rgba(255,255,255,1), rgba(255,255,255,0) 60%),
            radial-gradient(90% 80% at 0% 50%, rgba(114,255,255,.95), rgba(114,255,255,0) 70%),
            radial-gradient(100% 90% at 0% 50%, rgba(25,227,255,.75), rgba(25,227,255,0) 75%);
          filter: blur(9px) saturate(1.25) brightness(1.1);
          mix-blend-mode: screen;
          transform-origin: 0% 50%;
          animation: plume 1.1s ease-in-out infinite alternate;
        }
        .wheel-play.boost::after{
          background:
            radial-gradient(80% 70% at 0% 50%, rgba(255,255,255,1), rgba(255,255,255,0) 60%),
            radial-gradient(90% 80% at 0% 50%, rgba(255,180,120,.95), rgba(255,180,120,0) 70%),
            radial-gradient(100% 90% at 0% 50%, rgba(255,59,48,.85), rgba(255,59,48,0) 75%);
        }
        @keyframes plume {
          0% { transform: scaleX(0.9) translateX(0); opacity: .75; filter: blur(10px) saturate(1.2); }
          100%{ transform: scaleX(1.15) translateX(4px); opacity: 1; filter: blur(8px) saturate(1.35); }
        }
        /* inner icon glow, like the logo-glow on other buttons */
        .glyph{ display:inline-flex; align-items:center; justify-content:center; transform: translateY(1px); }
        .boost-label{ font-family: OrbitronLocal, InterLocal, system-ui, sans-serif; font-weight: 900; font-size: 18px; letter-spacing: 0.14em; color:#fff; text-transform: uppercase;
          text-shadow: 0 0 10px rgba(255,59,48,1), 0 0 34px rgba(255,59,48,.8), 0 0 64px rgba(255,59,48,.55);
        }
        .wheel-play:hover {
          transform: scale(1.06) rotateZ(-1deg);
          box-shadow: 0 14px 36px rgba(0,0,0,.6), 0 0 44px rgba(0,255,200,.95), 0 0 110px rgba(0,255,200,.65), inset 0 2px 0 rgba(255,255,255,.5), inset 0 -8px 20px rgba(0,0,0,.45);
          filter: brightness(1.06) saturate(1.15);
        }
        .wheel-play.boost:hover{
          box-shadow: 0 14px 36px rgba(0,0,0,.6), 0 0 60px rgba(255,59,48,.98), 0 0 150px rgba(255,59,48,.7), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -8px 20px rgba(0,0,0,.45);
        }
        .wheel-play:active { transform: scale(0.96); }
      `}</style>

      <audio ref={sfxRef} src="/audio/launch.MP3" preload="auto" />
      <audio ref={pauseRef} src="/audio/pause.mp3" preload="auto" />
      <audio ref={hoverRef} preload="auto">
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
    </div>
  );
}
