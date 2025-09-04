"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LumaKeyVideo from "@/components/LumaKeyVideo";
import HoloHubMenu from "@/components/HoloHubMenu";
import HoloJoinPopout from "@/components/HoloJoinPopout";
import { LINKS } from "@/config/cockpit";

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
  const [showJoin, setShowJoin] = useState(false);

  function handleLaunch() {
    const willPause = !!playing;
    // Trigger toggle action first so downstream can open streaming links within a user gesture
    try { onLaunch(); } catch {}
    // Then play context-appropriate SFX without blocking the gesture
    // Remove launch sound on start press; keep pause sound only when pausing
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

  // START button variant flag (legacy "boost" fully removed)
  const isStart = Boolean(
    (POS?.wheel && ((POS.wheel as any).start || (POS.wheel as any).startButton)) ||
    process.env.NEXT_PUBLIC_START_BUTTON === '1' ||
    process.env.NEXT_PUBLIC_PLAY_BUTTON_STYLE === 'start'
  );

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
      {/* Hologram Comms menu — offset from the wheel's top-left */}
      {(() => {
        const iconSize = 30;
        const InstagramIcon = (
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} fill="none">
            <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
            <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
          </svg>
        );
        const TikTokIcon = (
          <svg viewBox="0 0 256 256" width={iconSize} height={iconSize} aria-hidden>
            <g transform="translate(8,-6)"><path fill="#69C9D0" d="M120 32h40c2 26 21 47 46 52v32c-18-.4-36-5.9-52-15.7V184c0 35.3-28.7 64-64 64s-64-28.7-64-64c0-34.2 26.7-62.1 60.6-63.9 5.6-.3 11.2.2 16.7 1.4v32c-5.2-1.9-10.7-2.7-16.2-2.3-16.7 1.1-30.2 14.9-30.8 31.6-.7 18.5 14.1 33.6 32.6 33.6s32-14.3 32-32.8V32Z"/></g>
            <g transform="translate(-8,8)"><path fill="#EE1D52" d="M120 32h40c2 26 21 47 46 52v32c-18-.4-36-5.9-52-15.7V184c0 35.3-28.7 64-64 64s-64-28.7-64-64c0-34.2 26.7-62.1 60.6-63.9 5.6-.3 11.2.2 16.7 1.4v32c-5.2-1.9-10.7-2.7-16.2-2.3-16.7 1.1-30.2 14.9-30.8 31.6-.7 18.5 14.1 33.6 32.6 33.6s32-14.3 32-32.8V32Z"/></g>
            <path fill="#FFFFFF" d="M120 32h40c2 26 21 47 46 52v32c-18-.4-36-5.9-52-15.7V184c0 35.3-28.7 64-64 64s-64-28.7-64-64c0-34.2 26.7-62.1 60.6-63.9 5.6-.3 11.2.2 16.7 1.4v32c-5.2-1.9-10.7-2.7-16.2-2.3-16.7 1.1-30.2 14.9-30.8 31.6-.7 18.5 14.1 33.6 32.6 33.6s32-14.3 32-32.8V32Z"/>
          </svg>
        );
        const YouTubeIcon = (
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} fill="currentColor">
            <path d="M23 12s0-3.2-.4-4.7a3.1 3.1 0 00-2.2-2.2C18.9 4.5 12 4.5 12 4.5s-6.9 0-8.4.6A3.1 3.1 0 001.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a3.1 3.1 0 002.2 2.2c1.5.6 8.4.6 8.4.6s6.9 0 8.4-.6a3.1 3.1 0 002.2-2.2c.4-1.5.4-4.7.4-4.7zM10 15.5v-7l6 3.5-6 3.5z" />
          </svg>
        );
        const SpotifyIcon = (
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} fill="currentColor">
            <path d="M12 1.5a10.5 10.5 0 100 21 10.5 10.5 0 000-21zm4.8 15.2a.8.8 0 01-1.1.3c-3-1.8-6.9-2.2-11.4-1.1a.8.8 0 11-.4-1.6c4.9-1.2 9.2-.7 12.6 1.3.4.2.6.7.3 1.1zm1.5-3.2a1 1 0 01-1.4.4c-3.4-2-8.7-2.6-12.8-1.3a1 1 0 11-.6-1.9c4.8-1.4 10.7-.8 14.7 1.6.5.3.7.9.4 1.4zm.2-3.5c-3.9-2.3-10.5-2.5-14.3-1.4a1.2 1.2 0 01-.7-2.2c4.4-1.4 11.8-1.2 16.4 1.5a1.2 1.2 0 01-1.4 2.1z"/>
          </svg>
        );
        const AppleIcon = (
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} fill="currentColor">
            <path d="M16.36 2.5c-.97.06-2.1.57-2.77 1.23-.6.6-1.11 1.53-.91 2.49 1.04.03 2.1-.55 2.75-1.21.62-.63 1.14-1.56.93-2.51zM20.5 17.2c-.46 1.06-.68 1.53-1.27 2.46-.83 1.28-2 2.87-3.45 2.9-1.29.03-1.63-.84-3.39-.84-1.75 0-2.14.82-3.42.87-1.37.05-2.41-1.38-3.25-2.66-1.77-2.74-3.13-7.73-1.31-11.11.9-1.73 2.52-2.83 4.33-2.86 1.35-.03 2.63.9 3.39.9.76 0 2.2-1.12 3.71-.95.63.03 2.4.26 3.54 2-3.11 1.72-2.61 6.18.52 7.29-.32.8-.47 1.2-.69 1.9z"/>
          </svg>
        );
        return (
          <div
            style={{
              position: "absolute",
              top: `calc(${(pp.topVh + (vconf.offsetVh || 0))}vh - ${vs/2}px + ${(POS?.wheel?.comms?.dyPx ?? 0) + 10}px)`,
              left: vconf.centerHoriz
                ? `calc(50vw - ${vs/2}px + ${(POS?.wheel?.comms?.dxPx ?? 0) + 10}px)`
                : `calc(${(pp.leftVw + (vconf.offsetVw || 0))}vw - ${vs/2}px + ${(POS?.wheel?.comms?.dxPx ?? 0) + 10}px)`,
              zIndex: 92,
              pointerEvents: 'auto',
            }}
            aria-hidden={false}
          >
            <HoloHubMenu
              items={[
                LINKS.instagram ? { id: 'ig', label: 'Instagram', href: LINKS.instagram, icon: InstagramIcon, color: '#FC54AF' } : null,
                LINKS.tiktok ? { id: 'tt', label: 'TikTok', href: LINKS.tiktok, icon: TikTokIcon, color: '#38B6FF' } : null,
                LINKS.youtube ? { id: 'yt', label: 'YouTube', href: LINKS.youtube, icon: YouTubeIcon, color: '#FF3B30' } : null,
                LINKS.spotify ? { id: 'sp', label: 'Spotify', href: LINKS.spotify, icon: SpotifyIcon, color: '#1DB954' } : null,
                LINKS.apple ? { id: 'am', label: 'Apple Music', href: LINKS.apple, icon: AppleIcon, color: '#FF3B30' } : null,
              ].filter(Boolean) as any}
              radius={96}
              hubColor="#FC54AF"
              itemSize={68}
              hubSize={84}
            />
          </div>
        );
      })()}

      {/* Hologram Join button — to the right of the steering wheel (pop-out) */}
      {(() => {
        const joinCfg: any = (POS?.wheel as any)?.join || {};
        const joinSize: number = typeof joinCfg.sizePx === 'number' ? joinCfg.sizePx : 84;
        // Horizontal: allow relative offset from the wheel rim via offsetRightPx; fallback to absolute dxPx; else default (vs + 24)
        const jdx = (typeof joinCfg.offsetRightPx === 'number')
          ? (vs + joinCfg.offsetRightPx)
          : ((typeof joinCfg.dxPx === 'number' && joinCfg.dxPx !== 0) ? joinCfg.dxPx : (vs + 24));
        const jdy = (typeof joinCfg.dyPx === 'number' && joinCfg.dyPx !== 0) ? joinCfg.dyPx : (Math.round(vs/2 - joinSize/2));
        return (
          <div
            style={{
              position: "absolute",
              top: `calc(${(pp.topVh + (vconf.offsetVh || 0))}vh - ${vs/2}px + ${jdy}px)`,
              left: vconf.centerHoriz
                ? `calc(50vw - ${vs/2}px + ${jdx}px)`
                : `calc(${(pp.leftVw + (vconf.offsetVw || 0))}vw - ${vs/2}px + ${jdx}px)`,
              zIndex: 92,
              pointerEvents: 'auto',
            }}
          >
            <HoloJoinPopout size={joinSize} label="Join" iconSrc="/elements/join.png" hubColor="#FC54AF" panelWidth={320} panelSide="above" />
          </div>
        );
      })()}
      {/* Start button anchored on the wheel */}
      <button
        onClick={handleLaunch}
        className={`pointer-events-auto wheel-play${isStart ? ' chx' : ''}`}
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
        aria-label={isStart ? "Start" : (playing ? "Pause" : "Play")}
        title={isStart ? "Start" : (playing ? "Pause" : "Play")}
      >
        {/* No outer ring for START icon variant */}
        {/* Ring removed for START variant and standard play/pause */}
        <span className="glyph" aria-hidden>
          {isStart ? (
            <img src="/elements/chxndler.png" alt="Start" className="chx-icon" />
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
        /* CHXNDLER element variant: icon-only, transparent background */
        .wheel-play.chx{
          background: transparent;
          border: none;
          box-shadow: none;
          position: relative;
        }
        /* Do not use the default before; define our own halo on ::after */
        .wheel-play.chx::before{ display:none; content:none; }
        .wheel-play.chx::after{
          content:""; position:absolute; inset:-10%; border-radius:9999px; pointer-events:none;
          box-shadow: 0 0 36px rgba(25,227,255,.65), 0 0 80px rgba(25,227,255,.45);
          animation: startHalo 2s ease-in-out infinite;
        }
        .chx-icon{ width: 82%; height: 82%; object-fit: contain; display:block; will-change: transform, filter;
          filter: saturate(1.25) brightness(1.1) drop-shadow(0 0 8px #19E3FF) drop-shadow(0 0 22px #19E3FF) drop-shadow(0 0 42px #19E3FF);
          animation: startPulse 2s ease-in-out infinite;
        }
        @keyframes startPulse {
          0%, 100% { transform: scale(1); filter: saturate(1.25) brightness(1.1) drop-shadow(0 0 8px #19E3FF) drop-shadow(0 0 22px #19E3FF) drop-shadow(0 0 42px #19E3FF); }
          50% { transform: scale(1.08); filter: saturate(1.5) brightness(1.22) drop-shadow(0 0 16px #19E3FF) drop-shadow(0 0 40px #19E3FF) drop-shadow(0 0 84px #19E3FF); }
        }
        @keyframes startHalo {
          0%, 100% { box-shadow: 0 0 36px rgba(25,227,255,.65), 0 0 80px rgba(25,227,255,.45); }
          50% { box-shadow: 0 0 56px rgba(25,227,255,.85), 0 0 120px rgba(25,227,255,.65); }
        }
        /* START variant: warm red/orange glow and plume */
        .wheel-play.start{
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
        .wheel-play.start::before{
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
        .wheel-play.start::after{
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
        .start-label{ font-family: OrbitronLocal, InterLocal, system-ui, sans-serif; font-weight: 900; font-size: 18px; letter-spacing: 0.14em; color:#fff; text-transform: uppercase;
          text-shadow: 0 0 10px rgba(255,59,48,1), 0 0 34px rgba(255,59,48,.8), 0 0 64px rgba(255,59,48,.55);
        }
        .wheel-play:hover {
          transform: scale(1.06) rotateZ(-1deg);
          box-shadow: 0 14px 36px rgba(0,0,0,.6), 0 0 44px rgba(0,255,200,.95), 0 0 110px rgba(0,255,200,.65), inset 0 2px 0 rgba(255,255,255,.5), inset 0 -8px 20px rgba(0,0,0,.45);
          filter: brightness(1.06) saturate(1.15);
        }
        .wheel-play.start:hover{
          box-shadow: 0 14px 36px rgba(0,0,0,.6), 0 0 60px rgba(255,59,48,.98), 0 0 150px rgba(255,59,48,.7), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -8px 20px rgba(0,0,0,.45);
        }
        .wheel-play:active { transform: scale(0.96); }
        /* CHXNDLER start button hover: outline the icon itself, no circular glow */
        .wheel-play.chx:hover{ box-shadow: none; transform: none; filter:none; }
        .wheel-play.chx .chx-icon{ transition: transform .12s ease, filter .15s ease; }
        .wheel-play.chx:hover .chx-icon{
          transform: scale(1.06);
          filter:
            saturate(1.25) brightness(1.12)
            drop-shadow(0 0 0 #19E3FF)
            drop-shadow(0 0 10px #19E3FF)
            drop-shadow(0 0 26px #19E3FF)
            drop-shadow(0 0 54px #19E3FF);
        }
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
