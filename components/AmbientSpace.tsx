"use client";
import React, { useEffect, useRef, useState } from "react";

/** Autoplays ambient + welcome VO; ducks to `duckTo` while music is playing. */
export default function AmbientSpace({
  ambientSrc,
  introSrc,
  volume = 0.35,
  duckTo = 0.15,
  playingMusic,
}: {
  ambientSrc: string;
  introSrc: string;
  volume?: number;
  duckTo?: number;
  playingMusic: boolean;
}) {
  const ambRef = useRef<HTMLAudioElement|null>(null);
  const introRef = useRef<HTMLAudioElement|null>(null);
  const [needEnable, setNeedEnable] = useState(false);

  useEffect(() => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!amb || !intro) return;
    amb.volume = volume;
    intro.volume = 0.9;

    Promise.allSettled([ amb.play(), intro.play() ]).then((res) => {
      const blocked = res.some(r => r.status === "rejected");
      if (blocked) setNeedEnable(true);
    });
  }, []);

  useEffect(() => {
    const amb = ambRef.current;
    if (!amb) return;
    amb.volume = playingMusic ? duckTo : volume;
  }, [playingMusic, volume, duckTo]);

  const enable = async () => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!amb || !intro) return;
    try {
      amb.volume = volume;
      await amb.play();
      intro.currentTime = 0;
      intro.volume = 0.9;
      await intro.play();
      setNeedEnable(false);
    } catch { setNeedEnable(true); }
  };

  return (
    <>
      <audio ref={ambRef}  src={ambientSrc} loop preload="auto" />
      <audio ref={introRef} src={introSrc} preload="auto" />
      {needEnable && (
        <button onClick={enable} className="fixed top-3 left-1/2 -translate-x-1/2 z-50 hud-chip glow">
          Enable sound
        </button>
      )}
    </>
  );
}
