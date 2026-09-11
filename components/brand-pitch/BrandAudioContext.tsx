"use client";

// Single shared <audio> element for the whole brand-pitch page. Every player
// instance (hero CTA, version selector, sonic logo, full song) calls the same
// play()/toggle() — because there is only ever one underlying element, only
// one clip can ever be audible at a time, no manual "stop the others" bookkeeping needed.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type BrandAudioState = {
  activeId: string | null;
  playing: boolean;
  loading: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
};

type BrandAudioContextValue = BrandAudioState & {
  toggle: (id: string, src: string) => void;
  play: (id: string, src: string) => void;
  pause: () => void;
  seek: (time: number) => void;
};

const BrandAudioContext = createContext<BrandAudioContextValue | null>(null);

export function BrandAudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const [state, setState] = useState<BrandAudioState>({
    activeId: null,
    playing: false,
    loading: false,
    currentTime: 0,
    duration: 0,
    error: null,
  });

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const onTime = () => setState((s) => ({ ...s, currentTime: audio.currentTime }));
    const onDuration = () => setState((s) => ({ ...s, duration: isFinite(audio.duration) ? audio.duration : 0 }));
    const onPlay = () => setState((s) => ({ ...s, playing: true, loading: false, error: null }));
    const onPause = () => setState((s) => ({ ...s, playing: false }));
    const onEnded = () => setState((s) => ({ ...s, playing: false, currentTime: 0 }));
    const onWaiting = () => setState((s) => ({ ...s, loading: true }));
    const onCanPlay = () => setState((s) => ({ ...s, loading: false }));
    const onError = () => setState((s) => ({ ...s, loading: false, playing: false, error: "This clip couldn't be loaded." }));

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.src = "";
    };
  }, []);

  const play = useCallback((id: string, src: string) => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    if (activeIdRef.current !== id) {
      activeIdRef.current = id;
      audio.src = src;
      setState((s) => ({ ...s, activeId: id, currentTime: 0, duration: 0, error: null, loading: true }));
    }

    audio.play().catch(() => {
      setState((s) => ({ ...s, playing: false, loading: false, error: "Playback was blocked — tap play again." }));
    });
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(
    (id: string, src: string) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (activeIdRef.current === id && !audio.paused) {
        audio.pause();
      } else {
        play(id, src);
      }
    },
    [play]
  );

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(time)) return;
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || time));
  }, []);

  const value = useMemo<BrandAudioContextValue>(
    () => ({ ...state, toggle, play, pause, seek }),
    [state, toggle, play, pause, seek]
  );

  return <BrandAudioContext.Provider value={value}>{children}</BrandAudioContext.Provider>;
}

export function useBrandAudio(): BrandAudioContextValue {
  const ctx = useContext(BrandAudioContext);
  if (!ctx) throw new Error("useBrandAudio must be used within a BrandAudioProvider");
  return ctx;
}
