// components/FastAudioBus.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import NowPlayingHUD from "./NowPlayingHUD";
import type { Track } from "@/config/tracks";

export default function FastAudioBus({ track }: { track: Track }) {
  const audio = useMemo(() => new Audio(), []);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // load on track change
  useEffect(() => {
    if (!track) return;
    audio.src = track.file;
    audio.load();
    setIsPlaying(false);
    setProgress(0);
  }, [track, audio]);

  // progress loop
  const raf = useRef<number>();
  useEffect(() => {
    const loop = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => raf.current && cancelAnimationFrame(raf.current);
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

  return <NowPlayingHUD title={track.title} progress={progress} onToggle={toggle} isPlaying={isPlaying} />;
}
