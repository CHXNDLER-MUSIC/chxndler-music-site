"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type AudioState = {
  src: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
};

type AudioControls = {
  loadTrack: (src: string) => void;
  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
};

const AudioCtx = createContext<(AudioState & AudioControls) | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioState>({ src: null, playing: false, currentTime: 0, duration: 0, volume: 1 });

  // Lazily create audio element once on client
  useEffect(() => {
    if (audioRef.current) return;
    const a = document.createElement("audio");
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    a.setAttribute("data-global-audio", "1");
    a.style.display = "none";
    document.body.appendChild(a);
    audioRef.current = a;

    const onTime = () => setState(s => ({ ...s, currentTime: a.currentTime }));
    const onDur = () => setState(s => ({ ...s, duration: a.duration || 0 }));
    const onPlay = () => setState(s => ({ ...s, playing: true }));
    const onPause = () => setState(s => ({ ...s, playing: false }));
    const onVol = () => setState(s => ({ ...s, volume: a.volume }));
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("volumechange", onVol);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("volumechange", onVol);
      try { a.pause(); } catch {}
      try { document.body.removeChild(a); } catch {}
      audioRef.current = null;
    };
  }, []);

  const api: AudioControls = useMemo(() => ({
    loadTrack: (src: string) => {
      const a = audioRef.current; if (!a) return;
      if (state.src === src) return;
      a.src = src;
      try { a.load(); } catch {}
      setState(s => ({ ...s, src, currentTime: 0, duration: 0 }));
    },
    play: () => { const a = audioRef.current; if (!a) return; void a.play().catch(()=>{}); },
    pause: () => { const a = audioRef.current; if (!a) return; try { a.pause(); } catch {} },
    seek: (t: number) => { const a = audioRef.current; if (!a) return; try { a.currentTime = Math.max(0, Math.min(a.duration || Infinity, t)); } catch {} },
    setVolume: (v: number) => { const a = audioRef.current; if (!a) return; a.volume = Math.max(0, Math.min(1, v)); },
  }), [state.src]);

  const value = useMemo(() => ({ ...state, ...api }), [state, api]);
  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used within <AudioProvider>");
  return ctx;
}

