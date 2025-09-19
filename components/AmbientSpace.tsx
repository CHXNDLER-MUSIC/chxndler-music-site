"use client";
import React, { useEffect, useRef, useState } from "react";

/** Autoplays ambient + optional welcome VO; pauses ambient while music is playing. */
export default function AmbientSpace({
  ambientSrc,
  introSrc,
  volume = 0.55,
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
  const lastTimeRef = useRef<number>(0);
  const stuckSinceRef = useRef<number|undefined>(undefined);
  const fadeDownTimerRef = useRef<number|undefined>(undefined);
  const userPausedRef = useRef<boolean>(false); // Track if user manually paused
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  function cancelFade() {
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
  }

  function fadeVolume(to: number, ms = 300, then?: () => void) {
    const amb = ambRef.current; if (!amb) return;
    console.log(`AmbientSpace: fadeVolume from ${amb.volume.toFixed(2)} to ${to.toFixed(2)} over ${ms}ms`);
    cancelFade();
    const from = amb.volume;
    if (ms <= 0) { amb.volume = clamp01(to); if (then) then(); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const v = from + (to - from) * t;
      amb.volume = clamp01(v);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else { rafRef.current = undefined; if (then) then(); }
    };
    rafRef.current = requestAnimationFrame(step);
  }

  // Attempt autoplay of ambient + one-time intro VO on mount (only if not suspended)
  useEffect(() => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!amb || suspend) return; // Don't start if suspended
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
        const onIntroPlay = () => { introPlayingRef.current = true; amb.volume = clamp01(Math.min(volume, 0.25)); };
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
      else if (!introPlayingRef.current) { 
        try { amb.muted = false; amb.removeAttribute('muted'); } catch {} 
        fadeVolume(clamp01(volume), 800); // Slower fade for smoother entry
      }
    });
    return cancelFade;
  }, [suspend]);

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
          const onIntroPlay = () => { introPlayingRef.current = true; amb.volume = clamp01(Math.min(volume, 0.25)); };
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

  // Allow external trigger (e.g., Start button flow) to force ambient play
  useEffect(() => {
    const onAmbientPlay = () => {
      const amb = ambRef.current;
      const intro = introRef.current;
      if (!amb) return;
      // If ambient is already playing and we're not suspended or playing music,
      // do not restart it — just ensure it is audible. Restarting can sound like a cut.
      if (!amb.paused && !suspend && !playingMusic) {
        try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
        fadeVolume(clamp01(volume), 800); // Slower fade for smoother entry
      } else {
        // Otherwise, start from the beginning cleanly
        try { amb.pause(); } catch {}
        try { amb.currentTime = 0; } catch {}
        amb.volume = 0;
        amb.play().then(() => { try { amb.muted = false; amb.removeAttribute('muted'); } catch {}; fadeVolume(clamp01(volume), 800); }).catch(()=>{});
      }

      // If intro is configured to play, restart it from 0 alongside ambient
      if (intro && introSrc) {
        try { intro.currentTime = 0; } catch {}
        try {
          intro.volume = 0.9;
          const ambEl = amb; // capture
          const onIntroPlay = () => { introPlayingRef.current = true; if (ambEl) ambEl.volume = clamp01(Math.min(volume, 0.25)); };
          const onIntroEnd  = () => { introPlayingRef.current = false; fadeVolume(clamp01(volume), 400); try { intro.removeEventListener('play', onIntroPlay); } catch {}; };
          intro.addEventListener('play', onIntroPlay);
          intro.addEventListener('ended', onIntroEnd, { once: true } as any);
          intro.play().catch(()=>{});
        } catch {}
      }
    };
    window.addEventListener('ambient:play', onAmbientPlay as any);
    return () => { window.removeEventListener('ambient:play', onAmbientPlay as any); };
  }, [introSrc, volume]);

  useEffect(() => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!amb) return;
    if (playingMusic) {
      // Debounce the fade-down so brief play blips don't cause audible cuts.
      console.log('AmbientSpace: playingMusic became true, setting fade-down timer');
      if (fadeDownTimerRef.current !== undefined) clearTimeout(fadeDownTimerRef.current);
      fadeDownTimerRef.current = window.setTimeout(() => {
        if (!ambRef.current) return; // unmounted
        if (!playingMusic) return; // state flipped back
        // Main track is playing: fade ambient to silence but keep it running
        // so resuming is instant and never cuts off.
        console.log('AmbientSpace: fade-down timer fired, fading ambient to 0');
        fadeVolume(0, 150);
      }, 5000); // increased delay to 5 seconds to avoid premature fading
      if (intro) {
        try { if (!intro.paused) intro.pause(); } catch {}
        try { intro.currentTime = 0; } catch {}
        introPlayingRef.current = false;
        introPendingRef.current = false; // don't replay VO during music
      }
    } else if (suspend) {
      // UI/warp suspend: fade ambient down but do NOT pause (prevents cut‑offs)
      console.log('AmbientSpace: suspend became true, fading ambient down');
      if (fadeDownTimerRef.current !== undefined) cancelAnimationFrame(fadeDownTimerRef.current as any);
      fadeVolume(0, 150);
      // Leave intro playing if it already started; if not started yet, let normal flow handle it
    } else {
      console.log('AmbientSpace: neither playingMusic nor suspend, resuming ambient');
      if (fadeDownTimerRef.current !== undefined) { 
        clearTimeout(fadeDownTimerRef.current); 
        fadeDownTimerRef.current = undefined; 
      }
      // Resume ambient then fade in when not suspended and not playing music
      if (!amb.paused) {
        // If already playing, just fade volume up
        try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
        fadeVolume(clamp01(volume), 800); // Slower fade for smoother entry
      } else {
        // If paused, restart and fade in
        amb.volume = 0;
        const ensurePlay = amb.play();
        ensurePlay.then(() => { 
          try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
          fadeVolume(clamp01(volume), 800); // Slower fade for smoother entry
        }).catch(() => {
          console.log('Failed to resume ambient audio');
        });
      }
    }
    return cancelFade;
  }, [playingMusic, suspend, volume]);

  // Listen for user pause/play events
  useEffect(() => {
    const onUserPause = () => {
      userPausedRef.current = true;
    };
    const onUserPlay = () => {
      userPausedRef.current = false;
    };
    window.addEventListener('ambient:userPause', onUserPause);
    window.addEventListener('ambient:userPlay', onUserPlay);
    return () => {
      window.removeEventListener('ambient:userPause', onUserPause);
      window.removeEventListener('ambient:userPlay', onUserPlay);
    };
  }, []);

  // Keep ambient playing on home: if it ever pauses/ends while not suspended and no track is playing, resume it.
  useEffect(() => {
    const amb = ambRef.current; if (!amb) return;
    const tryResume = () => {
      // Don't auto-resume if user manually paused, or if music is playing, or if suspended
      if (playingMusic || suspend || userPausedRef.current) return;
      try { amb.muted = false; } catch {}
      amb.play().catch(()=>{});
    };
    const onPause = () => { setTimeout(tryResume, 100); };
    const onEnded = () => { setTimeout(tryResume, 0); };
    amb.addEventListener('pause', onPause);
    amb.addEventListener('ended', onEnded);
    // Also periodically ensure it's playing in case of transient blockers
    const id = window.setInterval(() => {
      // Only try resume if audio appears to be stopped/paused unexpectedly
      if (amb && amb.paused && !playingMusic && !suspend && !userPausedRef.current) {
        console.log('Periodic check: audio unexpectedly paused, attempting resume');
        tryResume();
      }
    }, 30000); // reduced frequency to every 30 seconds and only when needed
    return () => { 
      amb.removeEventListener('pause', onPause);
      amb.removeEventListener('ended', onEnded);
      window.clearInterval(id);
    };
  }, [playingMusic, suspend]);

  // Resilience: if the ambient stream stalls or ends, force a quick resume/reload.
  useEffect(() => {
    const amb = ambRef.current; if (!amb) return;
    const tryResume = () => {
      if (playingMusic || suspend) return;
      try { amb.muted = false; } catch {}
      amb.play().catch(() => { try { amb.load(); amb.play().catch(()=>{}); } catch {} });
    };

    const onEnded = () => { try { amb.currentTime = 0; } catch {}; tryResume(); };
    const onStallish = () => { tryResume(); };
    const onError = () => { try { amb.load(); } catch {}; tryResume(); };

    amb.addEventListener('ended', onEnded);
    amb.addEventListener('stalled', onStallish as any);
    amb.addEventListener('suspend', onStallish as any);
    amb.addEventListener('waiting', onStallish as any);
    amb.addEventListener('emptied', onError as any);
    amb.addEventListener('error', onError as any);
    amb.addEventListener('abort', onError as any);

    // Watchdog: detect if time stops advancing for several seconds while "playing"
    const id = window.setInterval(() => {
      if (!amb || playingMusic || suspend) { 
        stuckSinceRef.current = undefined; 
        lastTimeRef.current = amb?.currentTime || 0; 
        return; 
      }
      const t = amb.currentTime || 0;
      const last = lastTimeRef.current || 0;
      const advanced = (t - last) > 0.01; // more lenient threshold - 10ms advance
      const now = performance.now();
      if (!advanced && !amb.paused && amb.readyState >= 2) {
        // Potential stall
        if (stuckSinceRef.current === undefined) stuckSinceRef.current = now;
        const stuckMs = now - (stuckSinceRef.current || now);
        if (stuckMs > 15000) { // increased threshold to 15 seconds to avoid false positives
          // Instead of nudging playhead, just try to resume playback
          console.log('Audio stall detected, attempting resume');
          tryResume();
          stuckSinceRef.current = undefined;
        }
      } else {
        // Advanced normally; reset stuck marker
        stuckSinceRef.current = undefined;
      }
      lastTimeRef.current = t;
    }, 3000); // increased interval to 3 seconds

    return () => {
      amb.removeEventListener('ended', onEnded);
      amb.removeEventListener('stalled', onStallish as any);
      amb.removeEventListener('suspend', onStallish as any);
      amb.removeEventListener('waiting', onStallish as any);
      amb.removeEventListener('emptied', onError as any);
      amb.removeEventListener('error', onError as any);
      amb.removeEventListener('abort', onError as any);
      window.clearInterval(id);
    };
  }, [playingMusic, suspend]);

  const enable = async () => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!amb) return;
    try {
      amb.volume = 0;
      await amb.play();
      // If intro is about to play and no song is playing, duck ambient; else fade up
      if (!playingMusic && intro && introSrc && introPendingRef.current) amb.volume = clamp01(Math.min(volume, 0.25));
      else { try { amb.muted = false; } catch {}; fadeVolume(clamp01(volume), 300); }
      // If intro didn't get a chance to play on initial load, play it once now
      if (!playingMusic && intro && introSrc && introPendingRef.current) {
        intro.volume = 0.9;
        // Small delay to ensure ambient is up
        await new Promise(r => setTimeout(r, 250));
        await intro.play().catch(()=>{});
        introPendingRef.current = false;
        fadeVolume(clamp01(volume), 400);
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
