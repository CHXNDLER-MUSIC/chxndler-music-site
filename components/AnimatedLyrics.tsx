"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [audioRef]);

  const segments: LyricSegment[] = useMemo(() => {
    if (!duration || duration <= 0) return [];
    return generateLyricTimeline(lyrics, duration);
  }, [lyrics, duration]);

  const active = useMemo(() => {
    if (!segments.length) return null;
    return (
      segments.find(
        s => currentTime >= s.start && currentTime < s.end
      ) || segments[segments.length - 1]
    );
  }, [segments, currentTime]);

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
        <p className="text-center text-lg md:text-2xl text-[#F2EF1D] tracking-[0.18em] animate-heartverse-line">
          {active.text}
        </p>
      </div>
    );
  }

  // word mode
  return (
    <div className="flex items-center justify-center h-full px-6">
      <p className="text-center text-3xl md:text-4xl text-[#F2EF1D] tracking-[0.2em] animate-heartverse-word">
        {active.text}
      </p>
    </div>
  );
}