"use client";
import React, { useEffect, useState } from "react";

export default function InlineBrowserModal({
  url,
  title = "",
  onClose,
  compact = false,
  heightPx,
  iframeHeightPx,
}: {
  url: string;
  title?: string;
  onClose: () => void;
  compact?: boolean;
  heightPx?: number;
  iframeHeightPx?: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // Fallback message if embed is blocked and iframe never completes loading
    const t = window.setTimeout(() => setTimedOut(true), 1800);
    return () => window.clearTimeout(t);
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prefer opening canonical site in new tab if the iframe uses an embed URL
  const externalHref = (() => {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      if (host === 'embed.music.apple.com') { u.hostname = 'music.apple.com'; return u.toString(); }
      if (host === 'open.spotify.com' && u.pathname.startsWith('/embed')) {
        // Convert /embed/... to canonical open page
        u.pathname = u.pathname.replace(/^\/embed/, '');
        return u.toString();
      }
      if ((host === 'youtube.com' || host === 'www.youtube.com') && u.pathname.startsWith('/embed/')) {
        // Convert YouTube embed to canonical watch URL
        const id = u.pathname.split('/')[2];
        if (id) return `https://www.youtube.com/watch?v=${id}`;
      }
      return url;
    } catch { return url; }
  })();

  const isSpotifyEmbed = (() => {
    try { const u = new URL(url); return u.hostname.replace(/^www\./,'') === 'open.spotify.com' && u.pathname.startsWith('/embed'); } catch { return false; }
  })();

  const isAppleEmbed = (() => {
    try { const u = new URL(url); return u.hostname.replace(/^www\./,'') === 'embed.music.apple.com'; } catch { return false; }
  })();

  const getLinkText = () => {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      if (host === 'embed.music.apple.com') return 'Open in Apple Music';
      if (host === 'open.spotify.com' && u.pathname.startsWith('/embed')) return 'Open on Spotify';
      if ((host === 'youtube.com' || host === 'www.youtube.com') && u.pathname.startsWith('/embed')) return 'Open on YouTube';
      return 'Open in new tab';
    } catch { return 'Open in new tab'; }
  };

  return (
    <div
      className="fixed z-[9999] flex justify-center"
      aria-modal="true"
      role="dialog"
      aria-label={title || "Inline Browser"}
      style={{ 
        top: '10px',
        left: '0',
        right: '0',
        bottom: compact ? 'auto' : '0',
        background: compact ? 'transparent' : 'rgba(0,0,0,.85)',
        backdropFilter: compact ? 'none' : 'blur(13px)'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className={`mx-4 w-full ${compact ? 'max-w-2xl' : 'max-w-4xl'}`}
        style={{
          position: 'absolute',
          top: compact ? '5px' : '5px',
          left: '50%',
          transform: compact ? 'translateX(-50%) translateY(-100px)' : 'translateX(-50%)',
          height: compact ? 'min(50vh, 420px)' : 'min(80vh, 760px)',
          zIndex: 10000
        }}
      >
        <div className="relative rounded-2xl backdrop-blur-md border-2 border-[#FC54AF]/60 bg-white/5 shadow-[0_0_26px_rgba(56,182,255,0.35)] h-full flex flex-col overflow-hidden">
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow:
                "0 0 40px rgba(252,84,175,0.5), 0 0 80px rgba(252,84,175,0.3), inset 0 0 24px rgba(252,84,175,0.2)",
            }}
          />

          <div className="relative flex items-center justify-between p-3 border-b border-white/20 shrink-0">
            <h2 className="text-lg font-bold tracking-wider text-white drop-shadow flex items-center gap-2">
              <span 
                className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-[#FC54AF] to-[#38B6FF]"
                style={{ boxShadow: '0 0 12px #FC54AF, 0 0 22px #38B6FF' }}
              />
              {title || "Inline Browser"}
            </h2>
            
            <div className="flex items-center gap-2">
              <a 
                href={externalHref} 
                target="_blank" 
                rel="noreferrer" 
                className="text-[#9ad7ff] text-sm underline opacity-90 hover:opacity-100"
              >
                {getLinkText()}
              </a>
              
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 border border-white/20 hover:bg-white/15"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="relative flex-1 overflow-hidden">
            {compact && (isSpotifyEmbed || isAppleEmbed) && iframeHeightPx ? (
              <div 
                className="relative w-full overflow-hidden"
                style={{ height: Math.max(80, Math.round(iframeHeightPx * 0.9)) }}
              >
                <iframe
                  src={url}
                  title={title || "inline"}
                  referrerPolicy="no-referrer"
                  allow="autoplay; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"
                  onLoad={() => setLoaded(true)}
                  className="absolute inset-0 w-full border-0 bg-[#111]"
                  style={{ 
                    height: Math.max(100, iframeHeightPx), 
                    transform: 'scale(0.9)', 
                    transformOrigin: 'top center' 
                  }}
                />
              </div>
            ) : (
              <iframe
                src={url}
                title={title || "inline"}
                referrerPolicy="no-referrer"
                allow="autoplay; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"
                onLoad={() => setLoaded(true)}
                className="absolute inset-0 w-full h-full border-0 bg-[#111]"
                style={iframeHeightPx ? { height: Math.max(100, iframeHeightPx) } : undefined}
              />
            )}
            
            {!loaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-gradient-to-b from-black/50 to-black/30">
                <div 
                  className="w-7 h-7 rounded-full border-[3px] border-white/20 border-t-[#9ad7ff] animate-spin"
                />
                <div className="text-[#d4e8ff] text-sm opacity-90">
                  {timedOut ? (
                    "This site may block embedding. Use \"Open in new tab\"."
                  ) : (
                    "Loading…"
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
