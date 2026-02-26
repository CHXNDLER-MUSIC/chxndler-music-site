"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateLyricTimeline,
  LyricSegment,
} from "@/lib/lyricTimeline";

type AnimatedLyricsProps = {
  audioRef: React.RefObject<HTMLAudioElement>;
  lyrics: string;
};

export default function AnimatedLyrics({
  audioRef,
  lyrics,
}: AnimatedLyricsProps) {
  const [duration, setDuration] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number>(-1);
  const lastIdxRef = useRef(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Use duration immediately if already available
    if (audio.duration && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }

    const handleLoaded = () => {
      setDuration(audio.duration || 0);
    };

    audio.addEventListener("loadedmetadata", handleLoaded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
    };
  }, [audioRef]);

  const segments: LyricSegment[] = useMemo(() => {
    if (!duration || duration <= 0) return [];
    return generateLyricTimeline(lyrics, duration);
  }, [lyrics, duration]);

  // Find the active segment efficiently using the last known index
  const findActive = useCallback(
    (time: number): number => {
      if (!segments.length) return -1;
      // Check last known position first (most common case - sequential playback)
      const last = lastIdxRef.current;
      if (last < segments.length && time >= segments[last].start && time < segments[last].end) {
        return last;
      }
      // Check next segment (song progressing forward)
      const next = last + 1;
      if (next < segments.length && time >= segments[next].start && time < segments[next].end) {
        lastIdxRef.current = next;
        return next;
      }
      // Fallback: binary search for seeks or jumps
      let lo = 0;
      let hi = segments.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        if (time < segments[mid].start) {
          hi = mid - 1;
        } else if (time >= segments[mid].end) {
          lo = mid + 1;
        } else {
          lastIdxRef.current = mid;
          return mid;
        }
      }
      // Past all segments - return last
      lastIdxRef.current = segments.length - 1;
      return segments.length - 1;
    },
    [segments]
  );

  // Use requestAnimationFrame-throttled timeupdate to batch renders
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !segments.length) return;

    let rafId: number | null = null;

    const handleTimeUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const newId = findActive(audio.currentTime || 0);
        setActiveId((prev) => (prev === newId ? prev : newId));
      });
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);

    // Set initial active segment
    handleTimeUpdate();

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [audioRef, segments, findActive]);

  const active = activeId >= 0 && activeId < segments.length ? segments[activeId] : null;

  if (!segments.length || !active) {
    return (
      <div className="flex items-center justify-center h-full px-6">
        <p className="text-center text-base md:text-xl text-[#F2EF1D]/70 tracking-[0.16em]">
          LYRIC SIGNAL CALIBRATING
        </p>
      </div>
    );
  }

  if (active.mode === "line") {
    return (
      <div className="flex items-center justify-center h-full px-6">
        <p
          key={active.id}
          className="text-center text-lg md:text-2xl text-[#F2EF1D] tracking-[0.18em] animate-heartverse-line"
        >
          {active.text}
        </p>
      </div>
    );
  }

  // word mode
  return (
    <div className="flex items-center justify-center h-full px-6">
      <p
        key={active.id}
        className="text-center text-3xl md:text-4xl text-[#F2EF1D] tracking-[0.2em] animate-heartverse-word"
      >
        {active.text}
      </p>
    </div>
  );
}
