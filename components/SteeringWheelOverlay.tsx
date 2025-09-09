"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import HoloHubMenu from "@/components/HoloHubMenu";
import LumaKeyVideo from "@/components/LumaKeyVideo";
import HoloJoinPopout from "@/components/HoloJoinPopout";
import { LINKS } from "@/config/cockpit";

export default function SteeringWheelOverlay({
  logoSrc = "/logo/CHXNDLER_Logo.png",
  onLaunch,
  POS,
  playing,
  showUI = true,
}: {
  logoSrc?: string;
  onLaunch: () => void;
  POS: any;
  playing?: boolean;
  showUI?: boolean;
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
    // Do not toggle main track audio on Start. Playback is controlled via song selection.
  }

  const wheel = POS?.wheel || {};
  const lp = wheel.logo || { topVh: 66, leftVw: 26, sizePx: 72 };
  // Default play button to the exact center of the wheel logo
  const pp = wheel.play || { topVh: lp.topVh, leftVw: lp.leftVw, sizePx: Math.round(lp.sizePx * 0.9) };
  // Wheel video size (relative to footprint) + optional offsets
  // Minimal scale for subtle wheel presence
  const vconf = wheel.video || { scale: 1.0, offsetVh: 0, offsetVw: 0, centerHoriz: true, debug: false };
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
          // Do not mask/clamp — allow hands to extend beyond the wheel
          borderRadius: undefined,
          overflow: "visible",
          zIndex: 60,
          outline: vconf.debug ? "1px dashed rgba(25,227,255,0.6)" : undefined,
          background: vconf.debug ? "rgba(25,227,255,0.08)" : "transparent",
          // Allow hiding via config if needed, default to visible
          display: (vconf as any)?.hidden ? 'none' as const : undefined,
        }}
      >
        {/* Wheel video with luma key: remove black background; no circle crop, allow hands to extend. */}
        <LumaKeyVideo
          srcMp4="/cockpit/wheel.mp4"
          srcAlt="/wheel.mp4"
          threshold={(vconf as any)?.threshold ?? 0.01}
          softness={(vconf as any)?.softness ?? 0.0}
          saturation={(vconf as any)?.saturation ?? 1.8}
          contrast={(vconf as any)?.contrast ?? 2.0}
          offsetYRatio={0.08}
          className="block"
          style={{
            display: 'block',
            width: vs,
            height: vs,
            pointerEvents: 'none',
            background: 'transparent',
            transform: 'scale(0.9)',
            transformOrigin: 'center',
          }}
        />
      </div>
      {/* Hologram Comms menu — offset from the wheel's top-left */}
      {(() => {
        const iconSize = 30;
        const InstagramIcon = (
          <img
            src="/elements/instagram.png"
            alt="Instagram"
            width={iconSize}
            height={iconSize}
            style={{ objectFit: 'contain' }}
          />
        );
        const TikTokIcon = (
          <img
            src="/elements/tiktok.png"
            alt="TikTok"
            width={iconSize}
            height={iconSize}
            style={{ objectFit: 'contain' }}
          />
        );
        const YouTubeIcon = (
          <img
            src="/elements/youtube.png"
            alt="YouTube"
            width={iconSize}
            height={iconSize}
            style={{ objectFit: 'contain' }}
          />
        );
        const SpotifyIcon = (
          <img
            src="/elements/spotify.png"
            alt="Spotify"
            width={iconSize}
            height={iconSize}
            style={{ objectFit: 'contain' }}
          />
        );
        // Apple Music icon using PNG
        const AppleMusicIcon = (
          <img
            src="/elements/apple.png"
            alt="Apple Music"
            width={iconSize}
            height={iconSize}
            style={{ objectFit: 'contain' }}
          />
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
            <div style={{ opacity: showUI ? 1 : 0, transition: 'opacity 300ms ease', pointerEvents: showUI ? 'auto' : 'none' }}>
              <HoloHubMenu
                items={[
                LINKS.instagram ? { id: 'ig', label: 'Instagram', href: LINKS.instagram, icon: '/elements/instagram.png', color: '#E1306C' } : null,
                LINKS.tiktok ? { id: 'tt', label: 'TikTok', href: LINKS.tiktok, icon: '/elements/tiktok.png', color: '#69C9D0' } : null,
                LINKS.youtube ? { id: 'yt', label: 'YouTube', href: LINKS.youtube, icon: '/elements/youtube.png', color: '#FF0000' } : null,
                LINKS.spotify ? { id: 'sp', label: 'Spotify', href: LINKS.spotify, icon: '/elements/spotify.png', color: '#1DB954' } : null,
                LINKS.apple ? { id: 'am', label: 'Apple Music', href: LINKS.apple, icon: '/elements/apple.png', color: '#FA2D48' } : null,
              ].filter(Boolean) as any}
                radius={108}
                hubColor="#F2EF1D"
                itemSize={84}
                hubSize={84}
                // Explicit placement by clock position:
                // 12 o'clock: Spotify (-90deg), 2 o'clock: Apple (-30deg),
                // 3:30–4 o'clock: Instagram (15deg), 5 o'clock: TikTok (60deg), 6:30–7 o'clock: YouTube (110deg)
                angles={{ sp: -90, am: -30, ig: 15, tt: 60, yt: 110 }}
              />
            </div>
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
              top: `calc(${(pp.topVh + (vconf.offsetVh || 0))}vh - ${vs/2}px + ${jdy}px - 4px)`, // Moved up 4px
              left: vconf.centerHoriz
                ? `calc(50vw - ${vs/2}px + ${jdx}px)`
                : `calc(${(pp.leftVw + (vconf.offsetVw || 0))}vw - ${vs/2}px + ${jdx}px)`,
              zIndex: 92,
              // Prevent any interaction before UI reveal
              pointerEvents: showUI ? 'auto' : 'none',
            }}
          >
            {showUI ? (
              <div style={{ opacity: 1, transition: 'opacity 300ms ease', pointerEvents: 'auto' }}>
                <HoloJoinPopout size={joinSize} label="Join" iconSrc="/elements/join.png" hubColor="#FC54AF" panelWidth={244} panelSide="above" />
              </div>
            ) : null}
          </div>
        );
      })()}
      {/* Start button anchored on the wheel */}
      <button
        onClick={handleLaunch}
        className={`pointer-events-auto wheel-play${isStart ? ' chx' : ''}`}
        style={{
          position: "absolute",
          top: `calc(${pp.topVh}vh - ${(pp.sizePx * 0.95)/2}px - 12px)`, // Moved up 12px (4px more)
          left: `calc(${pp.leftVw}vw - ${(pp.sizePx * 0.95)/2}px + 10px)`,
          width: pp.sizePx * 0.95,
          height: pp.sizePx * 0.95,
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
            <img src="/elements/start.png" alt="Start" className="chx-icon" />
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
          /* Transparent face: remove dark circle behind the wheel */
          background: transparent;
          box-shadow:
            0 0 32px rgba(0,255,180,.75),
            0 0 88px rgba(0,255,180,.55),
            inset 0 2px 0 rgba(255,255,255,.35),
            inset 0 0 24px rgba(0,255,200,.22);
          border:1px solid rgba(255,255,255,.18);
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease;
          overflow: visible;
        }
        /* CHXNDLER element variant: icon-only, transparent background */
        .wheel-play.chx{
          background: transparent;
          border: none;
          box-shadow: none;
          position: relative;
          cursor: pointer;
        }
        /* No halo/glow behind the START icon */
        .wheel-play.chx::before{ display:none; content:none; }
        .wheel-play.chx::after{ display:none; content:none; }
        .chx-icon{ width: 92%; height: 92%; object-fit: contain; display:block; will-change: transform, filter;
          filter: none;
          animation: none;
        }
        .wheel-play.chx:hover .chx-icon{ animation: none; transform: scale(1.04); filter: none; }
        .wheel-play.chx:hover::after{ display:none; }
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
          background: transparent;
          box-shadow:
            0 0 36px rgba(255,59,48,.95),
            0 0 120px rgba(255,59,48,.55),
            inset 0 2px 0 rgba(255,255,255,.45),
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
          transform: scale(1.04);
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
          transform: scale(1.04);
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
