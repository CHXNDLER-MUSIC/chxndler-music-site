"use client";
import React, { useRef, useCallback, useEffect, useState } from "react";
import { sfx } from "@/lib/sfx";
import IconButtonShell from "@/components/IconButtonShell";
import { toSpotifyEmbed, spotifyEmbedHeight } from "@/lib/spotify";
import { toAppleEmbed, appleEmbedHeight } from "@/lib/apple";
import { createPortal } from "react-dom";

export default function StreamingButtons({ pos, links }:{ pos: { xVw:number; yVh:number; sizePx:number; gapPx?:number; tilt?:string; vertical?: boolean; mobile?: {sizePx:number; gapPx?:number}; tablet?: {sizePx:number; gapPx?:number} }, links:{ spotify?:string; apple?:string } }){
  // Get responsive size based on screen width
  const getResponsiveSize = () => {
    if (typeof window === 'undefined') return pos.sizePx;
    const w = window.innerWidth;
    if (w <= 768 && pos.mobile?.sizePx) return pos.mobile.sizePx;
    if (w <= 1024 && pos.tablet?.sizePx) return pos.tablet.sizePx;
    return pos.sizePx;
  };
  
  const getResponsiveGap = () => {
    if (typeof window === 'undefined') return pos.gapPx ?? 18;
    const w = window.innerWidth;
    if (w <= 768 && pos.mobile?.gapPx) return pos.mobile.gapPx;
    if (w <= 1024 && pos.tablet?.gapPx) return pos.tablet.gapPx;
    return pos.gapPx ?? 18;
  };
  
  const [size, setSize] = useState(getResponsiveSize);
  const [gap, setGap] = useState(getResponsiveGap);
  
  // Update size on window resize
  useEffect(() => {
    const handleResize = () => {
      setSize(getResponsiveSize());
      setGap(getResponsiveGap());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const vertical = !!pos.vertical;
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
    window.addEventListener('touchstart', prime, { once: true, passive: true } as any);
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
      src="/elements/spotify.webp"
      alt="Spotify"
      width={iconSize}
      height={iconSize}
      className="object-contain"
    />
  );
  const AppleIcon = (
    <img
      src="/elements/apple.webp"
      alt="Apple Music"
      width={iconSize}
      height={iconSize}
      className="object-contain"
    />
  );

  const [showSpotifyPopover, setShowSpotifyPopover] = useState(false);
  const [spEmbedUrl, setSpEmbedUrl] = useState<string | null>(null);
  const [showApplePopover, setShowApplePopover] = useState(false);
  const [amEmbedUrl, setAmEmbedUrl] = useState<string | null>(null);

  // DEBUG: Log popover states and force reset if stuck
  useEffect(() => {
    console.log('🎵 StreamingButtons popover states:', { showSpotifyPopover, showApplePopover });
    // TEMPORARY FIX: Force close any stuck popovers
    if (showSpotifyPopover) {
      console.log('🚨 FORCE CLOSING STUCK SPOTIFY POPOVER');
      setShowSpotifyPopover(false);
    }
    if (showApplePopover) {
      console.log('🚨 FORCE CLOSING STUCK APPLE POPOVER');
      setShowApplePopover(false);
    }
  }, [showSpotifyPopover, showApplePopover]);

  // Close on Escape
  useEffect(() => {
    if (!showSpotifyPopover) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowSpotifyPopover(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSpotifyPopover]);
  useEffect(() => {
    if (!showApplePopover) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowApplePopover(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showApplePopover]);

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
          <IconButtonShell
            title="Listen on Spotify"
            href={links.spotify}
            color="#1DB954"
            onClickFX={playClick}
            onHoverFX={playHover}
            onClick={() => {
              try {
                const embed = toSpotifyEmbed(links.spotify!);
                if (embed) {
                  setSpEmbedUrl(embed);
                  setShowSpotifyPopover(true);
                } else {
                  window.open(links.spotify!, '_blank', 'noopener,noreferrer');
                }
              } catch {
                try { window.open(links.spotify!, '_blank', 'noopener,noreferrer'); } catch {}
              }
            }}
          >
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
          <IconButtonShell
            title="Listen on Apple Music"
            href={links.apple}
            color="#FF3B30"
            onClickFX={playClick}
            onHoverFX={playHover}
            onClick={() => {
              try {
                const embed = toAppleEmbed(links.apple!);
                if (embed) { setAmEmbedUrl(embed); setShowApplePopover(true); }
                else { window.open(links.apple!, '_blank', 'noopener,noreferrer'); }
              } catch {
                try { window.open(links.apple!, '_blank', 'noopener,noreferrer'); } catch {}
              }
            }}
          >
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

      {typeof document !== 'undefined' && showSpotifyPopover && spEmbedUrl ? createPortal(
        <div
          role="dialog"
          aria-label="Spotify"
          className="sp-overlay"
          onClick={() => setShowSpotifyPopover(false)}
          data-clickable="true"
        >
          <div className="sp-popover" onClick={(e) => e.stopPropagation()} style={{ height: spEmbedUrl ? spotifyEmbedHeight(spEmbedUrl) : undefined }}>
            <button
              aria-label="Close"
              title="Close"
              className="sp-close"
              onMouseEnter={() => { try { const el = hoverRef.current; if (el) { el.currentTime = 0; el.volume = 0.35; el.play().catch(()=>{}); } } catch {} }}
              onClick={() => setShowSpotifyPopover(false)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                <path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z" />
              </svg>
            </button>
            <iframe
              src={spEmbedUrl}
              title="Spotify"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              width="100%"
              height={spEmbedUrl ? spotifyEmbedHeight(spEmbedUrl) : undefined}
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        </div>,
        document.body
      ) : null}

      {typeof document !== 'undefined' && showApplePopover && amEmbedUrl ? createPortal(
        <div
          role="dialog"
          aria-label="Apple Music"
          className="am-overlay"
          onClick={() => setShowApplePopover(false)}
          data-clickable="true"
        >
          <div className="am-popover" onClick={(e) => e.stopPropagation()}>
            <button
              aria-label="Close"
              title="Close"
              className="am-close"
              onMouseEnter={() => { try { const el = hoverRef.current; if (el) { el.currentTime = 0; el.volume = 0.35; el.play().catch(()=>{}); } } catch {} }}
              onClick={() => setShowApplePopover(false)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                <path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z" />
              </svg>
            </button>
            <iframe
              src={amEmbedUrl}
              title="Apple Music"
              allow="autoplay *; encrypted-media *; clipboard-write"
              loading="lazy"
              width="100%"
              height={amEmbedUrl ? appleEmbedHeight(amEmbedUrl) : 360}
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        </div>,
        document.body
      ) : null}

      <style jsx global>{`
        .sp-overlay {
          position: fixed; inset: 0; background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none;
          display: flex; align-items: center; justify-content: center; z-index: 2147483647;
        }
        .sp-popover {
          position: relative; width: min(88vw, 420px);
          background: rgba(0,0,0,0.88);
          border: 1px solid rgba(29,185,84,0.6);
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 18px 46px rgba(0,0,0,0.55), 0 0 32px rgba(29,185,84,0.35);
          /* Higher on screen than before */
          margin-top: -80px;
        }
        .sp-close { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.4); background: rgba(0,0,0,0.45); color: #fff; display: inline-flex;
          align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 0 16px rgba(255,255,255,0.25);
          transition: transform .15s ease, background .15s ease, box-shadow .15s ease; }
        .sp-close:hover { transform: scale(1.1); background: rgba(0,0,0,0.6); box-shadow: 0 0 24px rgba(255,255,255,0.55); }
        .sp-close:active { transform: scale(0.95); }

        .am-overlay {
          position: fixed; inset: 0; background: transparent; backdrop-filter: none;
          display: flex; align-items: center; justify-content: center; z-index: 2147483647;
        }
        .am-popover {
          position: relative; width: min(88vw, 420px);
          background: transparent; /* remove black fill */
          border: 1px solid rgba(255,59,48,0.6);
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 0 32px rgba(255,59,48,0.35); /* remove heavy dark drop shadow */
          margin-top: 380px;
        }
        .am-close { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.4); background: rgba(0,0,0,0.45); color: #fff; display: inline-flex;
          align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 0 16px rgba(255,255,255,0.25);
          transition: transform .15s ease, background .15s ease, box-shadow .15s ease; }
        .am-close:hover { transform: scale(1.1); background: rgba(0,0,0,0.6); box-shadow: 0 0 24px rgba(255,255,255,0.55); }
        .am-close:active { transform: scale(0.95); }
        @media (max-width: 768px) {
          .sp-popover { margin-top: -60px; }
          .am-popover { margin-top: 220px; }
        }
      `}</style>
    </>
  );
}
