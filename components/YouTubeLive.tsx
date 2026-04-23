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
};

function cleanVideoId(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_-]{6,}$/.test(trimmed) ? trimmed : null;
}

function cleanChannelId(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^UC[a-zA-Z0-9_-]+$/.test(trimmed) ? trimmed : null;
}

export default function YouTubeLive({
  pollMs = 60_000,
  forceLive = false,
  className,
  style,
  children,
  debug = false,
}: Props) {
  const { isLive, videoId } = useYouTubeLive(pollMs);
  const live = forceLive || isLive;

  const channelId = cleanChannelId(process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID);
  const safeVideoId = cleanVideoId(videoId);

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

  const src = useMemo(() => {
    if (!live) return null;

    // When forcing live, ALWAYS use channel live embed, ignore videoId.
    if (forceLive && channelId) {
      return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}`;
    }

    // When not forcing, prefer detected live video if present.
    if (!forceLive && safeVideoId) {
      return `https://www.youtube.com/embed/${safeVideoId}`;
    }

    // Otherwise, fall back to channel live embed (not a specific video).
    if (channelId) {
      return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}`;
    }

    return null;
  }, [live, forceLive, channelId, safeVideoId]);

  // Console debug logging when enabled
  useEffect(() => {
    if (!debugEnabled) return;
    // Log the detected values and the resulting iframe source
    // Helps compare channel live embed vs direct video embed
    console.log("[YouTubeLive][debug]", {
      forceLive,
      isLive,
      videoId: safeVideoId,
      src,
    });
  }, [debugEnabled, forceLive, isLive, safeVideoId, src]);

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
      <div>iframe src: {src || ""}</div>
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
  if (!src) return <>{children}{debugEnabled && DebugPanel}</>;

  return (
    <>
      <iframe
        src={src}
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
