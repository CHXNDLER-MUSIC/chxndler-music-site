"use client";

import React, { useMemo } from "react";
import { useYouTubeLive } from "@/hooks/useYouTubeLive";

type Props = {
  pollMs?: number;
  forceLive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
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
}: Props) {
  const { isLive, videoId } = useYouTubeLive(pollMs);
  const live = forceLive || isLive;

  const channelId = cleanChannelId(process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID);
  const safeVideoId = cleanVideoId(videoId);

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

  if (!live) return <>{children}</>;
  if (!src) return <>{children}</>;

  return (
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
  );
}
