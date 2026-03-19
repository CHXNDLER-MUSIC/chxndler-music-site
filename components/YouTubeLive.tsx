"use client";

import React, { useEffect } from "react";
import { useYouTubeLive } from "@/hooks/useYouTubeLive";

type Props = {
  pollMs?: number;
  /** Optional: force live UI (useful for local overrides/testing) */
  forceLive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Fallback UI when not live (e.g., countdown) */
  children?: React.ReactNode;
  /** Notify parent of live status changes for header indicators, etc. */
  onStatusChange?: (isLive: boolean) => void;
};

export default function YouTubeLive({ pollMs = 60_000, forceLive = false, className, style, children, onStatusChange }: Props) {
  const { isLive, videoId } = useYouTubeLive(pollMs);
  const live = forceLive || isLive;

  useEffect(() => { onStatusChange?.(live); }, [live, onStatusChange]);

  if (!live || !videoId) {
    // Offline / countdown fallback
    return <>{children}</>;
  }

  const origin = typeof window !== "undefined" ? `&origin=${encodeURIComponent(window.location.origin)}` : "";
  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0${origin}`;

  return (
    <div className={className} style={style}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          background: "rgba(0,0,0,0.8)",
          borderRadius: 0,
          boxShadow: "0 0 15px rgba(252, 84, 175, 0.2)",
          overflow: "hidden",
        }}
      >
        <iframe
          src={src}
          title="YouTube Live Stream"
          width="100%"
          height="100%"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          frameBorder={0}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
        <a
          href="https://www.youtube.com/@chxndlerthealien/live"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
            fontSize: 12,
            color: "#F2EF1D",
            textDecoration: "none",
            opacity: 0.9,
          }}
        >
          Watch on YouTube ↗
        </a>
      </div>
    </div>
  );
}

