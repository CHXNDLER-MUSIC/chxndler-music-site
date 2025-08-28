"use client";
import React, { useRef, useCallback } from "react";

function IconButton({ title, href, children, color = "#1DB954", onClickFX, onHoverFX }) {
  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={title}
        className="ck-icon-btn"
        style={{ "--btn-color": color } as React.CSSProperties}
        onMouseEnter={() => { if (onHoverFX) onHoverFX(); }}
        onMouseDown={(e)=>{ if(onClickFX) onClickFX(); e.currentTarget.style.transform = "translateY(1px) scale(0.985)"; }}
        onMouseUp={(e)=>{ e.currentTarget.style.transform = "none"; }}
      >
        <span className="logo-glow">{children}</span>
      </a>
      <style jsx>{`
        .ck-icon-btn {
          position:relative; display:grid; place-items:center; width:100%; height:100%;
          border-radius:18px; color:#e8f1ff;
          background: radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.06), rgba(255,255,255,0) 40%), linear-gradient(180deg, #0a0a0a, #000);
          border:1px solid rgba(255,255,255,.18);
          box-shadow:
            0 14px 30px rgba(0,0,0,.6),
            inset 0 2px 0 rgba(255,255,255,.22),
            inset 0 -4px 10px rgba(0,0,0,.78);
          backdrop-filter:blur(8px);
          -webkit-backdrop-filter:blur(8px);
          transition: box-shadow .2s ease, background .2s ease, transform .12s ease, filter .18s ease;
          cursor:pointer;
        }
        .ck-icon-btn:before{
          content:""; position:absolute; inset:-2px; border-radius:20px;
          box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset, 0 10px 30px rgba(0,0,0,.65);
          pointer-events:none;
        }
        .ck-icon-btn:after{
          content:""; position:absolute; left:10%; right:10%; top:6%; height:26%; border-radius:9999px;
          background:linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,0));
          filter: blur(1px); opacity:.85; pointer-events:none;
        }
        .logo-glow{
          display:inline-flex; align-items:center; justify-content:center;
          color: var(--btn-color);
          filter:
            drop-shadow(0 0 12px var(--btn-color))
            drop-shadow(0 0 28px var(--btn-color));
          transition: filter .2s ease, transform .25s ease;
          will-change: filter, transform;
          animation: pulseGlow 2.8s ease-in-out infinite;
        }
        .ck-icon-btn:hover .logo-glow{
          filter:
            drop-shadow(0 0 16px var(--btn-color))
            drop-shadow(0 0 36px var(--btn-color))
            drop-shadow(0 0 64px var(--btn-color));
          transform: scale(1.04);
        }
        @keyframes pulseGlow {
          0%, 100% { filter: brightness(1.1) saturate(1.2) drop-shadow(0 0 12px var(--btn-color)) drop-shadow(0 0 28px var(--btn-color)); transform: scale(1); }
          50% { filter: brightness(1.3) saturate(1.4) drop-shadow(0 0 16px var(--btn-color)) drop-shadow(0 0 36px var(--btn-color)); transform: scale(1.03); }
        }
      `}</style>
    </>
  );
}

export default function StreamingButtons({ pos, links }:{ pos: { xVw:number; yVh:number; sizePx:number; gapPx?:number; tilt?:string; vertical?: boolean }, links:{ spotify?:string; apple?:string } }){
  const size = pos.sizePx;
  const gap = pos.gapPx ?? 18;
  const vertical = !!pos.vertical;
  const top = `calc(${pos.yVh}vh - ${size/2}px)`;
  const tilt = pos.tilt ?? "perspective(1200px) rotateX(18deg)";
  const clickRef = useRef<HTMLAudioElement|null>(null);
  const hoverRef = useRef<HTMLAudioElement|null>(null);
  const playClick = useCallback(() => {
    const a = clickRef.current; if (!a) return;
    a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{});
  }, []);
  const playHover = useCallback(() => {
    const a = hoverRef.current; if (!a) return;
    a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{});
  }, []);

  const iconSize = Math.round(size * 0.56);

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
    <>
      {links.spotify && (
        <div
          className="wrap"
          style={vertical
            ? { left: `calc(${pos.xVw}vw - ${size/2}px)`, top: `calc(${pos.yVh}vh - ${size + gap/2}px)`, width: size, height: size, transform: tilt }
            : { left: `calc(${pos.xVw}vw - ${(size + gap/2)}px)`, top, width: size, height: size, transform: tilt }
          }
        >
          <span className="socket" aria-hidden />
          <IconButton title="Listen on Spotify" href={links.spotify} color="#1DB954" onClickFX={playClick} onHoverFX={playHover}>
            {SpotifyIcon}
          </IconButton>
        </div>
      )}
      {links.apple && (
        <div
          className="wrap"
          style={vertical
            // Nudge Apple further down and left relative to Spotify when stacked vertically
            ? { left: `calc(${pos.xVw}vw - ${size/2}px - 18px)`, top: `calc(${pos.yVh}vh + ${gap/2}px + 56px)`, width: size, height: size, transform: tilt }
            // Horizontal layout fallback: also nudge down and left slightly more
            : { left: `calc(${pos.xVw}vw + ${gap/2}px - 16px)`, top: `calc(${pos.yVh}vh - ${size/2}px + 52px)`, width: size, height: size, transform: tilt }
          }
        >
          <span className="socket" aria-hidden />
          <IconButton title="Listen on Apple Music" href={links.apple} color="#FF3B30" onClickFX={playClick} onHoverFX={playHover}>
            {AppleIcon}
          </IconButton>
        </div>
      )}
      <style jsx>{`
        .wrap{ position:absolute; z-index:40; pointer-events:auto; transform-origin:center; }
        .wrap .socket{ position:absolute; inset:-8px; border-radius:22px; pointer-events:none; }
        .wrap .socket{
          background: radial-gradient(120% 130% at 50% 10%, rgba(255,255,255,.08), rgba(0,0,0,0) 40%);
          box-shadow:
            0 18px 40px rgba(0,0,0,.85),
            inset 0 0 22px rgba(0,0,0,.9),
            inset 0 2px 0 rgba(255,255,255,.06);
        }
      `}</style>
      <audio ref={clickRef} src="/audio/join-alien.mp3" preload="auto" />
      <audio ref={hoverRef} preload="auto">
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
    </>
  );
}
