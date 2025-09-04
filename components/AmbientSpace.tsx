"use client";
import React, { useEffect, useRef, useState } from "react";

/** Autoplays ambient + optional welcome VO; pauses ambient while music is playing. */
export default function AmbientSpace({
  ambientSrc,
  introSrc,
  volume = 0.35,
  playingMusic,
  suspend = false,
}: {
  ambientSrc: string;
  introSrc?: string; // optional intro VO
  volume?: number;
  playingMusic: boolean;
  suspend?: boolean;
}) {
  const ambRef = useRef<HTMLAudioElement|null>(null);
  const introRef = useRef<HTMLAudioElement|null>(null);
  const [needEnable, setNeedEnable] = useState(false);
  const rafRef = useRef<number|undefined>(undefined);
  const introPendingRef = useRef<boolean>(!!introSrc);
  const introPlayingRef = useRef<boolean>(false);

  function cancelFade() {
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
  }

  function fadeVolume(to: number, ms = 300, then?: () => void) {
    const amb = ambRef.current; if (!amb) return;
    cancelFade();
    const from = amb.volume;
    if (ms <= 0) { amb.volume = to; if (then) then(); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      amb.volume = from + (to - from) * t;
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else { rafRef.current = undefined; if (then) then(); }
    };
    rafRef.current = requestAnimationFrame(step);
  }

  // Attempt autoplay of ambient + one-time intro VO on mount
  useEffect(() => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!amb) return;
    amb.volume = 0;
    try { amb.muted = true; } catch {}
    // Try to start ambient
    const tryAmbient = amb.play();
    // Try to play intro once on first load, but wait until ambient is actually playing
    let tryIntro: Promise<any>|undefined;
    const startIntro = () => {
      if (!intro || !introSrc || !introPendingRef.current || playingMusic) return;
      try {
        intro.volume = 0.9;
        const onIntroPlay = () => { introPlayingRef.current = true; amb.volume = Math.min(volume, 0.12); };
        const onIntroEnd  = () => { introPlayingRef.current = false; fadeVolume(volume, 400); };
        intro.addEventListener('play', onIntroPlay);
        intro.addEventListener('ended', onIntroEnd, { once: true });
        // Slight delay so ambient has actually started audibly before VO comes in
        tryIntro = new Promise<void>((resolve) => {
          setTimeout(() => {
            if (!introPendingRef.current || playingMusic) { resolve(); return; }
            intro.play().then(() => { introPendingRef.current = false; resolve(); }).catch(() => resolve());
          }, 250);
        });
      } catch {}
    };
    // Play intro after ambient reports playing; if ambient is already playing, start immediately
    if (intro && introSrc && introPendingRef.current && !playingMusic) {
      if (!amb.paused) startIntro();
      else amb.addEventListener('playing', startIntro, { once: true } as any);
    }
    Promise.allSettled([tryAmbient, tryIntro].filter(Boolean) as Promise<any>[]).then((res) => {
      const blocked = res.some(r => r && r.status === "rejected");
      if (blocked) setNeedEnable(true);
      else if (!introPlayingRef.current) { try { amb.muted = false; } catch {}; fadeVolume(volume, 300); }
    });
    return cancelFade;
  }, []);

  // If introSrc becomes available after mount (e.g., navigate to homepage), play it once
  useEffect(() => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!introSrc || !intro || !amb) return;
    // Mark intro as pending when a new introSrc arrives (e.g., after first Start)
    introPendingRef.current = true;
    if (playingMusic || suspend) return;
    if (!introPendingRef.current) return;
    try {
      const startIntro = () => {
        if (!introPendingRef.current || playingMusic || suspend) return;
        try {
          intro.volume = 0.9;
          const onIntroPlay = () => { introPlayingRef.current = true; amb.volume = Math.min(volume, 0.12); };
          const onIntroEnd  = () => { introPlayingRef.current = false; fadeVolume(volume, 400); };
          intro.addEventListener('play', onIntroPlay);
          intro.addEventListener('ended', onIntroEnd, { once: true });
          // Slight delay after ambient reports playing
          setTimeout(() => {
            if (!introPendingRef.current || playingMusic || suspend) return;
            intro.play().then(() => { introPendingRef.current = false; }).catch(()=>{});
          }, 250);
        } catch {}
      };
      if (!amb.paused) startIntro();
      else amb.addEventListener('playing', startIntro, { once: true } as any);
      return () => { try { amb.removeEventListener('playing', startIntro as any); } catch {} };
    } catch {}
  }, [introSrc, playingMusic, suspend, volume]);

  // Global unlock: if autoplay is blocked, start only on key press (not clicks/taps)
  useEffect(() => {
    if (!needEnable) return;
    const onAnyInteract = () => { enable(); };
    window.addEventListener('keydown', onAnyInteract, { passive: true } as any);
    return () => {
      window.removeEventListener('keydown', onAnyInteract as any);
    };
  }, [needEnable]);

  useEffect(() => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!amb) return;
    if (playingMusic || suspend) {
      // Fade out quickly then pause to avoid overlap with music
      fadeVolume(0, 150, () => { amb.pause(); });
      // Stop welcome VO if it's playing
      if (intro) {
        try { if (!intro.paused) intro.pause(); } catch {}
        try { intro.currentTime = 0; } catch {}
        introPlayingRef.current = false;
        // If a track started playing, permanently cancel the VO; if just suspended (warp/UI), keep it pending
        if (playingMusic) introPendingRef.current = false;
      }
    } else {
      // Resume then fade in
      amb.volume = 0;
      amb.play().then(() => { try { amb.muted = false; } catch {}; fadeVolume(volume, 300); }).catch(()=>{});
    }
    return cancelFade;
  }, [playingMusic, suspend, volume]);

  const enable = async () => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!amb) return;
    try {
      amb.volume = 0;
      await amb.play();
      // If intro is about to play and no song is playing, duck ambient; else fade up
      if (!playingMusic && intro && introSrc && introPendingRef.current) amb.volume = Math.min(volume, 0.12);
      else { try { amb.muted = false; } catch {}; fadeVolume(volume, 300); }
      // If intro didn't get a chance to play on initial load, play it once now
      if (!playingMusic && intro && introSrc && introPendingRef.current) {
        intro.volume = 0.9;
        // Small delay to ensure ambient is up
        await new Promise(r => setTimeout(r, 250));
        await intro.play().catch(()=>{});
        introPendingRef.current = false;
        fadeVolume(volume, 400);
      }
      if (playingMusic) { introPendingRef.current = false; }
      setNeedEnable(false);
    } catch { setNeedEnable(true); }
  };

  return (
    <>
      <audio ref={ambRef}  src={ambientSrc} loop preload="auto" autoPlay playsInline muted data-ambient="1" />
      {introSrc ? <audio ref={introRef} src={introSrc} preload="auto" playsInline data-intro="1" /> : null}
      {/* Enable sound button hidden; global interaction starts audio automatically */}
    </>
  );
}
