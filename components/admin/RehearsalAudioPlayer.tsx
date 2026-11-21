"use client";

import { useEffect, useRef, useState } from "react";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export default function RehearsalAudioPlayer({ fullSrc, laybackSrc }: { fullSrc: string; laybackSrc: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeTrack, setActiveTrack] = useState<"FULL" | "LAYBACK">("FULL");
  const [available, setAvailable] = useState({ FULL: !!fullSrc, LAYBACK: !!laybackSrc });
  const src = activeTrack === "FULL" ? fullSrc : laybackSrc;
  const unavailable = !src;

  useEffect(() => {
    const probes = ([ ["FULL", fullSrc], ["LAYBACK", laybackSrc] ] as const).map(([track, source]) => {
      if (!source) { setAvailable(current => ({ ...current, [track]: false })); return null; }
      const probe = new Audio(); probe.preload = "metadata"; probe.src = source;
      const found = () => setAvailable(current => ({ ...current, [track]: true }));
      const missing = () => setAvailable(current => ({ ...current, [track]: false }));
      probe.addEventListener("loadedmetadata", found, { once: true });
      probe.addEventListener("error", missing, { once: true });
      return () => { probe.removeEventListener("loadedmetadata", found); probe.removeEventListener("error", missing); probe.src = ""; };
    }).filter((cleanup): cleanup is () => void => !!cleanup);
    return () => probes.forEach(cleanup => cleanup());
  }, [fullSrc, laybackSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => { setPlaying(false); setAvailable(current => ({ ...current, [activeTrack]: false })); };
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onPause);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onPause);
      audio.removeEventListener("error", onError);
    };
  }, [src, activeTrack]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try { await audio.play(); } catch { setPlaying(false); }
    } else audio.pause();
  }

  async function chooseTrack(track: "FULL" | "LAYBACK") {
    const nextSrc = track === "FULL" ? fullSrc : laybackSrc;
    if (!nextSrc) return;
    if (track === activeTrack) { await togglePlayback(); return; }
    const audio = audioRef.current;
    setActiveTrack(track); setCurrentTime(0); setDuration(0);
    if (audio) {
      audio.src = nextSrc; audio.load();
      try { await audio.play(); } catch { setPlaying(false); }
    }
  }

  return <div className="w-full">
    <audio ref={audioRef} src={src || undefined} preload="metadata" className="sr-only" aria-label={`${activeTrack} rehearsal audio`} />
    <div className="grid grid-cols-2 gap-3">
      {([ ["FULL", fullSrc], ["LAYBACK", laybackSrc] ] as const).map(([track, trackSrc]) => {
        const active = activeTrack === track;
        const disabled = !trackSrc || !available[track];
        return <button key={track} type="button" onClick={() => void chooseTrack(track)} disabled={disabled} aria-pressed={active} className={`flex min-h-16 items-center justify-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold transition disabled:cursor-not-allowed ${disabled ? "border-white/[.06] bg-white/[.025] text-white/35" : active ? "border-[#EF43A3]/55 bg-[#EF43A3]/[.12] text-white" : "border-white/[.08] bg-white/[.025] text-white/65 hover:border-white/20 hover:text-white"}`}><span className={`grid h-8 w-8 place-items-center rounded-full ${disabled ? "bg-white/15 text-white/45" : active ? "bg-[#EF43A3] text-[#120b10]" : "bg-white/10 text-white/70"}`} aria-hidden="true">{playing && active ? "Ⅱ" : "▶"}</span>{track}</button>;
      })}
    </div>
    <div className="mt-4 flex items-center gap-3"><span className="shrink-0 font-mono text-xs tabular-nums text-white/45">{formatTime(currentTime)}</span><input type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} disabled={!duration || unavailable} aria-label={`${activeTrack} playback position`} onChange={event => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setCurrentTime(value); }} className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[#EF43A3] disabled:cursor-default disabled:opacity-40"/><span className="shrink-0 font-mono text-xs tabular-nums text-white/45">{formatTime(duration)}</span></div>
  </div>;
}
