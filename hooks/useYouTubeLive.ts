"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface YouTubeLiveStatus {
  isLive: boolean;
  videoId: string | null;
}

export function useYouTubeLive(pollMs: number = 60_000) {
  const [status, setStatus] = useState<YouTubeLiveStatus>({ isLive: false, videoId: null });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/youtube/live", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as YouTubeLiveStatus;
      setStatus({ isLive: !!data?.isLive, videoId: data?.videoId ?? null });
    } catch (e: any) {
      setStatus({ isLive: false, videoId: null });
      setError(e?.message || "Failed to load live status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    timerRef.current = setInterval(fetchStatus, pollMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchStatus, pollMs]);

  return { ...status, loading, error, refresh: fetchStatus };
}

