"use client";
import React, { useRef, useCallback, useEffect, useState } from "react";
import { sfx } from "@/lib/sfx";
import IconButtonShell from "@/components/IconButtonShell";
import { toSpotifyEmbed, spotifyEmbedHeight } from "@/lib/spotify";
import { toAppleEmbed, appleEmbedHeight } from "@/lib/apple";
import { createPortal } from "react-dom";
import { useAudio } from "@/app/providers/AudioProvider";

export default function StreamingButtons({ pos, links, showControls = true, disabled = false }:{ pos: { xVw:number; yVh:number; sizePx:number; gapPx?:number; tilt?:string; vertical?: boolean; mobile?: {sizePx:number; gapPx?:number}; tablet?: {sizePx:number; gapPx?:number} }, links:{ spotify?:string; apple?:string; youtube?:string }, showControls?: boolean, disabled?: boolean }){
  const { playing, play, pause, volume, setVolume } = useAudio();
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

  const PlayPauseIcon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      {playing ? (
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
      ) : (
        <path d="M8 5v14l11-7z" />
      )}
    </svg>
  );

  const VolumeIcon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );

  const LyricsIcon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );

  const YoutubeIcon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M23 12s0-3.2-.4-4.7a3.1 3.1 0 00-2.2-2.2C18.9 4.5 12 4.5 12 4.5s-6.9 0-8.4.6A3.1 3.1 0 001.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a3.1 3.1 0 002.2 2.2c1.5.6 8.4.6 8.4.6s6.9 0 8.4-.6a3.1 3.1 0 002.2-2.2c.4-1.5.4-4.7.4-4.7zM10 15.5v-7l6 3.5-6 3.5z" />
    </svg>
  );

  const [showSpotifyPopover, setShowSpotifyPopover] = useState(false);
  const [spEmbedUrl, setSpEmbedUrl] = useState<string | null>(null);
  const [showApplePopover, setShowApplePopover] = useState(false);
  const [amEmbedUrl, setAmEmbedUrl] = useState<string | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);

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
  
  useEffect(() => {
    if (!showLyrics) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLyrics(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showLyrics]);
  
  useEffect(() => {
    if (!showVolumeControl) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowVolumeControl(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showVolumeControl]);

  return (
    <>
      {/* Play/Pause Button */}
      {showControls && (
        <div
          className="wrap"
          style={vertical
            ? { left: `calc(${pos.xVw}vw - ${size/2}px)`, top: `calc(${pos.yVh}vh - ${size + gap}px)`, width: size, height: size, transform: tilt }
            : { left: `calc(${pos.xVw}vw - ${(size + gap)}px)`, top: `calc(${pos.yVh}vh - ${size/2}px)`, width: size, height: size, transform: tilt }
          }
        >
          <span className="socket" aria-hidden />
          <IconButtonShell
            title={playing ? "Pause" : "Play"}
            color={playing ? "#FF6B6B" : "#4ECDC4"}
            onClickFX={playClick}
            onHoverFX={playHover}
            onClick={playing ? pause : play}
          >
            {PlayPauseIcon}
          </IconButtonShell>
        </div>
      )}

      {/* Volume Button */}
      {showControls && (
        <div
          className="wrap"
          style={vertical
            ? { left: `calc(${pos.xVw}vw - ${size/2}px)`, top: `calc(${pos.yVh}vh + ${gap/2}px)`, width: size, height: size, transform: tilt }
            : { left: `calc(${pos.xVw}vw + ${gap/2}px)`, top: `calc(${pos.yVh}vh - ${size/2}px)`, width: size, height: size, transform: tilt }
          }
        >
          <span className="socket" aria-hidden />
          <IconButtonShell
            title="Volume Control"
            color="#9B59B6"
            onClickFX={playClick}
            onHoverFX={playHover}
            onClick={() => setShowVolumeControl(!showVolumeControl)}
          >
            {VolumeIcon}
          </IconButtonShell>
        </div>
      )}

      {/* Lyrics Button */}
      {showControls && (
        <div
          className="wrap"
          style={vertical
            ? { left: `calc(${pos.xVw}vw - ${size/2}px)`, top: `calc(${pos.yVh}vh + ${size + gap/2}px)`, width: size, height: size, transform: tilt }
            : { left: `calc(${pos.xVw}vw + ${(size + gap)}px)`, top: `calc(${pos.yVh}vh - ${size/2}px)`, width: size, height: size, transform: tilt }
          }
        >
          <span className="socket" aria-hidden />
          <IconButtonShell
            title="Show Lyrics"
            color="#F39C12"
            onClickFX={playClick}
            onHoverFX={playHover}
            onClick={() => setShowLyrics(!showLyrics)}
          >
            {LyricsIcon}
          </IconButtonShell>
        </div>
      )}

      {/* Spotify Button */}
      {(links.spotify || disabled) && (
        <div
          className="wrap"
          style={vertical
            // Move Spotify down slightly more (+17px total)
            ? { left: `calc(${pos.xVw}vw - ${size/2}px)`, top: `calc(${pos.yVh}vh - ${size + gap/2}px + 17px)`, width: size, height: size, transform: tilt }
            : { left: `calc(${pos.xVw}vw - ${(size + gap/2)}px)`, top: `calc(${pos.yVh}vh - ${size/2}px + 17px)`, width: size, height: size, transform: tilt }
          }
        >
          <span className="socket" aria-hidden />
          {/* Constrain click target to icon size to avoid off-target opens */}
          {disabled ? (
            <div style={{ width: iconSize, height: iconSize, margin: '0 auto', pointerEvents: 'auto' }}>
              <div
                className="ck-icon-btn-disabled"
                title="Spotify (Not available for elemental planets)"
                aria-disabled="true"
              >
                <span className="logo-glow-disabled">{SpotifyIcon}</span>
              </div>
            </div>
          ) : (
            <div style={{ width: iconSize, height: iconSize, margin: '0 auto', pointerEvents: 'auto' }}>
              <IconButtonShell
                title="Listen on Spotify"
                href={links.spotify!}
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
        </div>
      )}
      {/* Apple Music Button */}
      {(links.apple || disabled) && (
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
          {disabled ? (
            <div style={{ width: iconSize, height: iconSize, margin: '0 auto', pointerEvents: 'auto' }}>
              <div
                className="ck-icon-btn-disabled"
                title="Apple Music (Not available for elemental planets)"
                aria-disabled="true"
              >
                <span className="logo-glow-disabled">{AppleIcon}</span>
              </div>
            </div>
          ) : (
            <div style={{ width: iconSize, height: iconSize, margin: '0 auto', pointerEvents: 'auto' }}>
              <IconButtonShell
                title="Listen on Apple Music"
                href={links.apple!}
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
        </div>
      )}

      {/* YouTube Button */}
      {(links.youtube || disabled) && (
        <div
          className="wrap"
          style={vertical
            // Position below Apple in vertical layout
            ? { left: `calc(${pos.xVw}vw - ${size/2}px - 18px)`, top: `calc(${pos.yVh}vh + ${gap + size}px + 49px)`, width: size, height: size, transform: tilt }
            // Position to the right in horizontal layout
            : { left: `calc(${pos.xVw}vw + ${(size + gap) * 1.5}px - 16px)`, top: `calc(${pos.yVh}vh - ${size/2}px + 45px)`, width: size, height: size, transform: tilt }
          }
        >
          <span className="socket" aria-hidden />
          {disabled ? (
            <div style={{ width: iconSize, height: iconSize, margin: '0 auto', pointerEvents: 'auto' }}>
              <div
                className="ck-icon-btn-disabled"
                title="YouTube (Not available for elemental planets)"
                aria-disabled="true"
              >
                <span className="logo-glow-disabled">{YoutubeIcon}</span>
              </div>
            </div>
          ) : (
            <div style={{ width: iconSize, height: iconSize, margin: '0 auto', pointerEvents: 'auto' }}>
              <IconButtonShell
                title="Watch on YouTube"
                href={links.youtube!}
                color="#FF0000"
                onClickFX={playClick}
                onHoverFX={playHover}
                onClick={() => {
                  try {
                    window.open(links.youtube!, '_blank', 'noopener,noreferrer');
                  } catch {
                    // Fallback if window.open fails
                  }
                }}
              >
                {YoutubeIcon}
              </IconButtonShell>
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        .wrap{ position:absolute; z-index:40; pointer-events:none; transform-origin:center; overflow:visible; }
        .wrap:hover{ z-index:60; }
        /* Remove recessed inlay/socket behind streaming buttons per request */
        .wrap .socket{ display:none; }
        /* Re-enable pointer events only on actual button elements */
        .wrap :global(.ck-icon-btn), .wrap :global(.ck-icon-btn-disabled){ pointer-events:auto; }
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
        /* Disabled button styles (for elemental planets) */
        .ck-icon-btn-disabled {
          position: relative;
          display: grid;
          place-items: center;
          width: 100%;
          height: 100%;
          border-radius: 16px;
          color: #888;
          background:
            radial-gradient(120% 100% at 50% -10%, rgba(128,128,128,.08), rgba(128,128,128,0) 42%),
            linear-gradient(180deg, #1a1a1a, #0d0d0d 64%);
          border: 1px solid rgba(128,128,128,.25);
          box-shadow:
            0 18px 36px rgba(0,0,0,.45),
            inset 0 2px 0 rgba(128,128,128,.15),
            inset 0 -6px 14px rgba(0,0,0,.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          cursor: not-allowed;
          opacity: 0.5;
          pointer-events: none;
        }
        .logo-glow-disabled {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #666;
          filter: grayscale(1) brightness(0.5);
          opacity: 0.6;
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
              height="600"
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        </div>,
        document.body
      ) : null}

      {/* Lyrics Modal */}
      {typeof document !== 'undefined' && showLyrics ? createPortal(
        <div
          role="dialog"
          aria-label="Lyrics"
          className="lyrics-overlay"
          onClick={() => setShowLyrics(false)}
        >
          <div className="lyrics-popover" onClick={(e) => e.stopPropagation()}>
            <button
              aria-label="Close"
              title="Close"
              className="lyrics-close"
              onMouseEnter={() => { try { const el = hoverRef.current; if (el) { el.currentTime = 0; el.volume = 0.35; el.play().catch(()=>{}); } } catch {} }}
              onClick={() => setShowLyrics(false)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                <path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z" />
              </svg>
            </button>
            <div className="lyrics-content">
              <h3>Lyrics</h3>
              <p>Lyrics will be displayed here when available...</p>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Volume Control Pop-out */}
      {typeof document !== 'undefined' && showVolumeControl ? createPortal(
        <div
          role="dialog"
          aria-label="Volume Control"
          className="volume-overlay"
          onClick={() => setShowVolumeControl(false)}
        >
          <div
            className="volume-popout"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: `calc(${pos.xVw}vw + ${vertical ? 0 : size + gap}px)`,
              top: `calc(${pos.yVh}vh + ${vertical ? gap + size/2 : 0}px)`,
              transform: vertical ? 'translateX(-50%)' : 'translateY(-50%)',
            }}
          >
            <div className="volume-popout-inner">
              <svg className="volume-icon-small" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                {volume === 0 ? (
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                ) : volume < 0.5 ? (
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                ) : (
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                )}
              </svg>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
                className="volume-slider-popout"
              />
              <span className="volume-value">{Math.round(volume * 100)}</span>
            </div>
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
          position: relative; width: min(90vw, 750px);
          background: rgba(0,0,0,0.88);
          border: 1px solid rgba(29,185,84,0.6);
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 18px 46px rgba(0,0,0,0.55), 0 0 32px rgba(29,185,84,0.35);
          /* Much higher on screen */
          margin-top: -200px;
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
          position: relative; width: min(90vw, 750px); height: 600px;
          background: transparent; /* remove black fill */
          border: 1px solid rgba(255,59,48,0.6);
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 0 32px rgba(255,59,48,0.35); /* remove heavy dark drop shadow */
          margin-top: -220px;
        }
        .am-close { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.4); background: rgba(0,0,0,0.45); color: #fff; display: inline-flex;
          align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 0 16px rgba(255,255,255,0.25);
          transition: transform .15s ease, background .15s ease, box-shadow .15s ease; }
        .am-close:hover { transform: scale(1.1); background: rgba(0,0,0,0.6); box-shadow: 0 0 24px rgba(255,255,255,0.55); }
        .am-close:active { transform: scale(0.95); }
        .lyrics-overlay {
          position: fixed; background: transparent; backdrop-filter: none;
          display: flex; justify-content: center; align-items: stretch; z-index: 2147483647;
          left: 0; right: 0;
          top: var(--profile-bar-boundary, 64px);
          height: calc(100vh - var(--profile-bar-boundary, 64px) - var(--light-beam-boundary, 120px));
        }
        .lyrics-popover {
          width: min(98vw, 1400px); height: 100%; overflow-y: auto;
          background: rgba(0,0,0,0.88);
          border-left: 1px solid rgba(243,156,18,0.6);
          border-right: 1px solid rgba(243,156,18,0.6);
          padding: 20px;
          box-shadow: 0 0 32px rgba(243,156,18,0.35);
        }
        .lyrics-close { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.4); background: rgba(0,0,0,0.45); color: #fff; display: inline-flex;
          align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 0 16px rgba(255,255,255,0.25);
          transition: transform .15s ease, background .15s ease, box-shadow .15s ease; }
        .lyrics-close:hover { transform: scale(1.1); background: rgba(0,0,0,0.6); box-shadow: 0 0 24px rgba(255,255,255,0.55); }
        .lyrics-close:active { transform: scale(0.95); }
        .lyrics-content { color: #fff; padding-top: 10px; }
        .lyrics-content h3 { color: #F39C12; margin: 0 0 15px 0; font-size: 18px; font-weight: 600; }
        .lyrics-content p { margin: 0; line-height: 1.6; opacity: 0.9; }

        .volume-overlay {
          position: fixed; inset: 0; background: transparent; backdrop-filter: none;
          z-index: 2147483647;
        }
        .volume-popout {
          background: rgba(0,0,0,0.92);
          border: 1px solid rgba(155,89,182,0.6);
          border-radius: 24px;
          padding: 10px 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(155,89,182,0.3);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .volume-popout-inner {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .volume-icon-small {
          color: #9B59B6;
          flex-shrink: 0;
        }
        .volume-slider-popout {
          width: 120px;
          height: 6px;
          background: rgba(255,255,255,0.15);
          border-radius: 3px;
          outline: none;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
        }
        .volume-slider-popout::-webkit-slider-track {
          height: 6px;
          background: rgba(255,255,255,0.15);
          border-radius: 3px;
        }
        .volume-slider-popout::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #9B59B6;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(155,89,182,0.6);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .volume-slider-popout::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 0 16px rgba(155,89,182,0.8);
        }
        .volume-slider-popout::-moz-range-track {
          height: 6px;
          background: rgba(255,255,255,0.15);
          border-radius: 3px;
        }
        .volume-slider-popout::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #9B59B6;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(155,89,182,0.6);
        }
        .volume-value {
          min-width: 28px;
          font-size: 13px;
          font-weight: 600;
          color: #9B59B6;
          text-align: right;
        }

        @media (max-width: 768px) {
          .sp-popover { margin-top: -150px; width: min(95vw, 650px); }
          .am-popover { margin-top: -150px; width: min(95vw, 650px); }
          .lyrics-popover { width: min(98vw, 1400px); }
          .volume-popout { padding: 8px 12px; }
          .volume-slider-popout { width: 100px; }
          .volume-value { min-width: 24px; font-size: 12px; }
        }
      `}</style>
    </>
  );
}
