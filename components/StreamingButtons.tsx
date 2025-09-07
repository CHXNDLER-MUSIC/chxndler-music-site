"use client";
import React, { useRef, useCallback, useEffect } from "react";
import { sfx } from "@/lib/sfx";
import IconButtonShell from "@/components/IconButtonShell";

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
        onMouseDown={(e)=>{ if(onClickFX) onClickFX(); (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(1px) scale(0.985)"; }}
        onMouseUp={(e)=>{ (e.currentTarget as HTMLAnchorElement).style.transform = "none"; }}
      >
        <span className="logo-glow">{children}</span>
      </a>
      <style jsx>{`
        .ck-icon-btn {
          position:relative; display:grid; place-items:center; width:100%; height:100%;
          border-radius:16px; color:#e8f1ff;
          /* Match SocialIcons button shell exactly */
          background:
            radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,.08), rgba(255,255,255,0) 42%),
            linear-gradient(180deg, #0b0b0b, #000 64%);
          border:1px solid rgba(255,255,255,.18);
          box-shadow:
            0 18px 36px rgba(0,0,0,.65),          /* drop */
            inset 0 2px 0 rgba(255,255,255,.22),  /* top bevel */
            inset 0 -6px 14px rgba(0,0,0,.8);     /* bottom shade */
          backdrop-filter:blur(8px);
          -webkit-backdrop-filter:blur(8px);
          transition: box-shadow .2s ease, background .2s ease, transform .12s ease, filter .18s ease;
          cursor:pointer;
        }
        .ck-icon-btn:before{ /* outer rim glow very subtle to fuse with console */
          content:""; position:absolute; inset:-2px; border-radius:20px;
          box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset, 0 10px 30px rgba(0,0,0,.65), 0 0 0 1px rgba(0,255,255,.06);
          pointer-events:none;
        }
        .ck-icon-btn:after{ /* glossy top highlight */
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
  // Prime SFX on first user interaction to eliminate first-hover lag
  useEffect(() => {
    const prime = () => {
      try {
        const h = hoverRef.current; const c = clickRef.current;
        [h, c].forEach((a) => {
          if (!a) return;
          a.muted = true; a.volume = 0; a.play().catch(()=>{});
          setTimeout(() => { try { a.pause(); a.currentTime = 0; a.muted = false; a.volume = 0.3; } catch {} }, 30);
        });
      } catch {}
      window.removeEventListener('pointerdown', prime as any);
      window.removeEventListener('touchstart', prime as any);
    };
    window.addEventListener('pointerdown', prime, { once: true } as any);
    window.addEventListener('touchstart', prime, { once: true } as any);
    return () => {
      window.removeEventListener('pointerdown', prime as any);
      window.removeEventListener('touchstart', prime as any);
    };
  }, []);
  const playClick = useCallback(() => { try { sfx.play('click', 0.6); } catch {} }, []);
  const playHover = useCallback(() => { try { sfx.play('hover', 0.35); } catch {} }, []);

  const iconSize = Math.round(size * 0.56);

  const SpotifyIcon = (
    <img
      src="/elements/spotify.png"
      alt="Spotify"
      width={iconSize}
      height={iconSize}
      className="object-contain"
    />
  );
  const AppleIcon = (
    <img
      src="/elements/apple.png"
      alt="Apple Music"
      width={iconSize}
      height={iconSize}
      className="object-contain"
    />
  );

  return (
    <>
      {links.spotify && (
        <div
          className="wrap"
          style={vertical
            // Move Spotify down slightly more (+17px total)
            ? { left: `calc(${pos.xVw}vw - ${size/2}px)`, top: `calc(${pos.yVh}vh - ${size + gap/2}px + 17px)`, width: size, height: size, transform: tilt }
            : { left: `calc(${pos.xVw}vw - ${(size + gap/2)}px)`, top: `calc(${pos.yVh}vh - ${size/2}px + 17px)`, width: size, height: size, transform: tilt }
          }
        >
          <span className="socket" aria-hidden />
          <IconButtonShell title="Listen on Spotify" href={links.spotify} color="#1DB954" onClickFX={playClick} onHoverFX={playHover}>
            {SpotifyIcon}
          </IconButtonShell>
        </div>
      )}
      {links.apple && (
        <div
          className="wrap"
          style={vertical
            // Move Apple up slightly more (56px -> 49px)
            ? { left: `calc(${pos.xVw}vw - ${size/2}px - 18px)`, top: `calc(${pos.yVh}vh + ${gap/2}px + 49px)`, width: size, height: size, transform: tilt }
            // Horizontal layout: move up slightly more (52px -> 45px)
            : { left: `calc(${pos.xVw}vw + ${gap/2}px - 16px)`, top: `calc(${pos.yVh}vh - ${size/2}px + 45px)`, width: size, height: size, transform: tilt }
          }
        >
          <span className="socket" aria-hidden />
          <IconButtonShell title="Listen on Apple Music" href={links.apple} color="#FF3B30" onClickFX={playClick} onHoverFX={playHover}>
            {AppleIcon}
          </IconButtonShell>
        </div>
      )}
      <style jsx>{`
        .wrap{ position:absolute; z-index:40; pointer-events:auto; transform-origin:center; overflow:visible; }
        .wrap:hover{ z-index:60; }
        /* Remove recessed inlay/socket behind streaming buttons per request */
        .wrap .socket{ display:none; }
        /* Performance hints for smoother hover animations */
        .ck-icon-btn{ will-change: transform, filter; transform: translateZ(0); backface-visibility: hidden; contain: paint; }
        /* Button hover: brighter + slightly larger (same intensity as SocialIcons) */
        .ck-icon-btn:hover{
          transform: scale(1.05);
          box-shadow:
            0 22px 44px rgba(0,0,0,.7),
            0 0 40px var(--btn-color),
            0 0 90px var(--btn-color),
            inset 0 2px 0 rgba(255,255,255,.35),
            inset 0 -8px 18px rgba(0,0,0,.65);
          filter: brightness(1.06) saturate(1.12);
        }
        /* Match SocialIcons behavior; press handled inline */
        .ck-icon-btn:hover .logo-glow{
          transform: scale(1.06);
          filter:
            drop-shadow(0 0 16px var(--btn-color))
            drop-shadow(0 0 36px var(--btn-color))
            drop-shadow(0 0 64px var(--btn-color));
        }
      `}</style>
      <audio ref={clickRef} src="/audio/join-alien.mp3" preload="auto" playsInline />
      <audio ref={hoverRef} preload="auto" playsInline>
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
    </>
  );
}
