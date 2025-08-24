// components/FastAudioBus.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import NowPlayingHUD from "./NowPlayingHUD";
import type { Track } from "@/config/tracks";
import { tracks as ALL } from "@/config/tracks";

// Lightweight player that shows a minimal HUD for a single track
export default function FastAudioBus({ track }: { track?: Track }) {
  const defaultTrack = ALL?.[0];
  const active = track ?? defaultTrack;

  const audio = useMemo(() => new Audio(), []);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // load on track change
  useEffect(() => {
    if (!active) return;
    audio.src = active.src ?? ""; // use mapped src
    audio.load();
    setIsPlaying(false);
    setProgress(0);
  }, [active, audio]);

  // progress loop
  const raf = useRef<number>();
  useEffect(() => {
    const loop = () => {
      if (!audio.paused && audio.duration) setProgress(audio.currentTime / audio.duration);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [audio]);

  const toggle = () => {
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  // cleanup on unmount
  useEffect(() => () => { audio.pause(); }, [audio]);

  if (!active) return null;
  return (
    <NowPlayingHUD
      title={active.title}
      progress={progress}
      onToggle={toggle}
      isPlaying={isPlaying}
    />
  );
}
