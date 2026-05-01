"use client";

import React, { useEffect, useMemo } from "react";
import { useYouTubeLive } from "@/hooks/useYouTubeLive";

type Props = {
  pollMs?: number;
  forceLive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  debug?: boolean;
  onStatusChange?: (isLive: boolean, videoId: string | null) => void;
};

function cleanVideoId(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_-]{6,}$/.test(trimmed) ? trimmed : null;
}

// Keep NEXT_PUBLIC_YOUTUBE_CHANNEL_ID only for linking elsewhere, not for embeds here

export default function YouTubeLive({
  pollMs = 60_000,
  forceLive = false,
  className,
  style,
  children,
  debug = false,
  onStatusChange,
}: Props) {
  const { isLive, videoId } = useYouTubeLive(pollMs);
  const live = forceLive || isLive;
  const safeVideoId = cleanVideoId(videoId);

  useEffect(() => {
    onStatusChange?.(live, safeVideoId);
  }, [live, safeVideoId, onStatusChange]);

  // Allow enabling debug mode via URL or env var as well
  const debugEnabled = useMemo(() => {
    if (debug) return true;
    if (typeof window !== "undefined") {
      try {
        const p = new URLSearchParams(window.location.search || "");
        if (p.get("ytdebug") === "1") return true;
      } catch {}
    }
    return process.env.NEXT_PUBLIC_YOUTUBE_DEBUG === "1";
  }, [debug]);

  // Simple, reliable rule:
  // - When forceLive is true OR API says isLive=true
  // - and a detected videoId exists
  // - always embed that video's autoplay/muted URL with modest branding
  const effectiveSrc = useMemo(() => {
    if (!live) return null;
    if (!safeVideoId) return null;
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1',
      playsinline: '1',
      rel: '0',
      modestbranding: '1',
    });
    return `https://www.youtube.com/embed/${safeVideoId}?${params.toString()}`;
  }, [live, safeVideoId]);

  // Console debug logging when enabled
  useEffect(() => {
    if (!debugEnabled) return;
    // Log the detected values and the resulting iframe source
    // Helps compare channel live embed vs direct video embed
    console.log("[YouTubeLive][debug]", {
      forceLive,
      isLive,
      videoId: safeVideoId,
      effectiveSrc,
    });
  }, [debugEnabled, forceLive, isLive, safeVideoId, effectiveSrc]);

  const DebugPanel = (
    <div
      style={{
        marginTop: 8,
        fontFamily:
          "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
        fontSize: 12,
        color: "#d1d5db",
        lineHeight: 1.4,
        wordBreak: "break-all",
      }}
    >
      <div>forceLive: {String(forceLive)}</div>
      <div>isLive: {String(isLive)}</div>
      <div>videoId: {safeVideoId || ""}</div>
      <div>iframe src: {effectiveSrc || ""}</div>
      {safeVideoId && (
        <div style={{ marginTop: 4 }}>
          <a
            href={`https://www.youtube.com/embed/${safeVideoId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#93c5fd", textDecoration: "underline" }}
          >
            Open direct video embed ↗
          </a>
        </div>
      )}
    </div>
  );

  if (!live) return <>{children}{debugEnabled && DebugPanel}</>;
  if (!effectiveSrc) return <>{children}{debugEnabled && DebugPanel}</>;

  return (
    <>
      <iframe
        src={effectiveSrc}
        title="YouTube Live Stream"
        width="100%"
        height="100%"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        frameBorder={0}
        className={className}
        style={style}
      />
      {debugEnabled && DebugPanel}
    </>
  );
}
