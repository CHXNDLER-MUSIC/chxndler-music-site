"use client";
import React, { useEffect, useRef, useState } from "react";
import { audioCoordinator } from "@/lib/audio-coordinator";

/** Autoplays ambient + optional welcome VO; pauses ambient while music is playing. */
export default function AmbientSpace({
  ambientSrc,
  introSrc,
  volume = 0.7,
  playingMusic,
  suspend = false,
  userSelectedSong = false,
}: {
  ambientSrc: string;
  introSrc?: string; // optional intro VO
  volume?: number;
  playingMusic: boolean;
  suspend?: boolean;
  userSelectedSong?: boolean;
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
    // Pre-set volume so audio is audible immediately
    const initialBed = clamp01(introPendingRef.current && !playingMusic ? Math.min(volume, 0.75) : volume);
    amb.volume = initialBed;
    // Start unmuted for immediate audio
    try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
    // As soon as ambient reports 'playing', unmute immediately and ensure bed volume
    const onAmbPlaying = () => {
      try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
      amb.volume = initialBed;
      try { amb.removeEventListener('playing', onAmbPlaying as any); } catch {}
    };
    try { amb.addEventListener('playing', onAmbPlaying as any, { once: true } as any); } catch {}
    // Try to start ambient
    const tryAmbient = amb.play().then(() => {
      // Ensure unmuted immediately on successful play
      try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
      amb.volume = initialBed;
      // Register as active audio source
      try { audioCoordinator.setActiveSource('ambient'); } catch (e) { console.warn('audioCoordinator error:', e); }
    }).catch(() => {
      // Even if play fails, unmute so it's ready when resumed
      try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
      amb.volume = initialBed;
    });
    // Try to play intro once on first load, but wait until ambient is actually playing
    let tryIntro: Promise<any>|undefined;
    const startIntro = () => {
      if (!intro || !introSrc || !introPendingRef.current || playingMusic) return;
      console.log('🎵 AmbientSpace: Starting welcome VO sequence');
      try {
        intro.volume = 0.9;
        const onIntroPlay = () => { 
          console.log('🎵 AmbientSpace: Welcome VO started playing');
          introPlayingRef.current = true; 
          // Ensure ambient is audibly present under the VO from the very start
          try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
          amb.volume = clamp01(Math.min(volume, 0.75)); // Increased from 0.5 to 0.75 for better audibility
          // Register intro as active audio source
          try { audioCoordinator.setActiveSource('intro'); } catch (e) { console.warn('audioCoordinator error:', e); }
        };
        const onIntroEnd  = () => { 
          console.log('🎵 AmbientSpace: Welcome VO ended, returning to ambient');
          introPlayingRef.current = false; 
          fadeVolume(volume, 400);
          // Switch back to ambient as active source
          try { audioCoordinator.setActiveSource('ambient'); } catch (e) { console.warn('audioCoordinator error:', e); }
        };
        intro.addEventListener('play', onIntroPlay);
        intro.addEventListener('ended', onIntroEnd, { once: true });
        // Start intro VO immediately after ambient begins
        tryIntro = new Promise<void>((resolve) => {
          setTimeout(() => {
            if (!introPendingRef.current || playingMusic) { resolve(); return; }
            console.log('🎵 AmbientSpace: Attempting to play welcome VO');
            intro.play().then(() => { 
              introPendingRef.current = false; 
              console.log('🎵 AmbientSpace: Welcome VO play successful');
              resolve(); 
            }).catch((e) => {
              console.error('🎵 AmbientSpace: Welcome VO play failed:', e);
              resolve();
            });
          }, 50); // Reduced delay from 100ms to 50ms
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
      if (blocked) {
        setNeedEnable(true);
      } else {
        // Always unmute ambient once playback is permitted
        try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
        // If intro is about to play or already playing, hold ambient at a lower bed
        if (introPlayingRef.current || (intro && introSrc && introPendingRef.current)) {
          amb.volume = clamp01(Math.min(volume, 0.75));
        } else {
          fadeVolume(clamp01(volume), 100); // Much faster fade for immediate audio response
        }
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
          const onIntroPlay = () => { 
            introPlayingRef.current = true; 
            try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
            amb.volume = clamp01(Math.min(volume, 0.75)); 
          };
          const onIntroEnd  = () => { introPlayingRef.current = false; fadeVolume(volume, 400); };
          intro.addEventListener('play', onIntroPlay);
          intro.addEventListener('ended', onIntroEnd, { once: true });
          // Minimal delay after ambient reports playing
          setTimeout(() => {
            if (!introPendingRef.current || playingMusic || suspend) return;
            intro.play().then(() => { introPendingRef.current = false; }).catch(()=>{});
          }, 100);
        } catch {}
      };
      if (!amb.paused) startIntro();
      else amb.addEventListener('playing', startIntro, { once: true } as any);
      return () => { try { amb.removeEventListener('playing', startIntro as any); } catch {} };
    } catch {}
  }, [introSrc, playingMusic, suspend, volume]);

  // Global unlock: if autoplay is blocked, allow user interaction (keyboard or pointer) to enable
  // Respect suspend and playingMusic — do not start ambient while a song is playing or UI is suspended
  useEffect(() => {
    if (!needEnable) return;
    if (suspend || playingMusic) return; // don't attach unlock while we should be silent
    const onAnyInteract = () => { enable(); };
    window.addEventListener('keydown', onAnyInteract, { passive: true } as any);
    window.addEventListener('pointerdown', onAnyInteract, { passive: true } as any);
    return () => {
      window.removeEventListener('keydown', onAnyInteract as any);
      window.removeEventListener('pointerdown', onAnyInteract as any);
    };
  }, [needEnable, suspend, playingMusic]);

  // Allow external trigger (e.g., Start button flow) to force ambient play
  useEffect(() => {
    const onAmbientPlay = () => {
      const amb = ambRef.current;
      const intro = introRef.current;
      if (!amb) return;
      // Respect suspension and active music: do not start ambient while suspended,
      // during music playback, or when a user-selected track is active.
      if (suspend || playingMusic || userSelectedSong) {
        setNeedEnable(true);
        return;
      }
      // Reset playheads for a clean start
      try { amb.pause(); } catch {}
      try { amb.currentTime = 0; } catch {}
      try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
      const setBed = () => { amb.volume = clamp01(intro && introSrc ? Math.min(volume, 0.75) : volume); };
      setBed();

      // If welcome VO is available and pending, start both VO and ambient together
      if (intro && introSrc && introPendingRef.current && !introPlayingRef.current) {
        try { intro.currentTime = 0; } catch {}
        try { intro.volume = 0.9; } catch {}
        const handleIntroPlay = () => {
          introPlayingRef.current = true;
          setBed();
        };
        const handleIntroEnded = () => {
          introPlayingRef.current = false;
          fadeVolume(clamp01(volume), 400);
          try { intro.removeEventListener('play', handleIntroPlay); } catch {}
        };
        try { intro.addEventListener('play', handleIntroPlay); } catch {}
        try { intro.addEventListener('ended', handleIntroEnded, { once: true } as any); } catch {}
        // Reset ambient fully, set bed, and start both back-to-back
        try { amb.pause(); } catch {}
        try { amb.currentTime = 0; } catch {}
        setBed();
        const p1 = amb.play().catch(()=>{});
        const p2 = intro.play().then(() => { introPendingRef.current = false; }).catch(() => { introPendingRef.current = false; });
        // Do not block on promises; return after queuing both plays
        void p1; void p2;
        return;
      }

      // Otherwise, start ambient immediately
      amb.play().catch(()=>{});
    };
    window.addEventListener('ambient:play', onAmbientPlay as any);
    return () => { window.removeEventListener('ambient:play', onAmbientPlay as any); };
  }, [introSrc, volume, suspend, playingMusic, userSelectedSong]);

  // Prime ambient silently within a user gesture to satisfy autoplay policies
  // without producing sound yet. We keep it muted/volume 0 until explicit play.
  useEffect(() => {
    const onAmbientPrime = () => {
      const amb = ambRef.current;
      if (!amb) return;
      try {
        amb.muted = true;
        amb.volume = 0;
        // Start playback muted to unlock; ignore failures silently
        amb.play().then(() => {
          setNeedEnable(false);
        }).catch(() => {
          // If blocked, leave needEnable true so a subsequent user pointerdown enables it
          setNeedEnable(true);
        });
      } catch {
        // No-op
      }
    };
    window.addEventListener('ambient:prime', onAmbientPrime as any);
    return () => { window.removeEventListener('ambient:prime', onAmbientPrime as any); };
  }, []);

  useEffect(() => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!amb) return;
    if (playingMusic) {
      // Immediately silence ambient while a main song plays
      console.log('AmbientSpace: playingMusic became true, pausing ambient immediately');
      if (fadeDownTimerRef.current !== undefined) { clearTimeout(fadeDownTimerRef.current); fadeDownTimerRef.current = undefined; }
      
      // ENHANCED: Ensure complete audio stop and reset
      try { 
        amb.pause(); 
        amb.currentTime = 0;
        amb.volume = 0;
        console.log('AmbientSpace: space-music.mp3 completely stopped');
      } catch {}
      
      if (intro) {
        try { 
          if (!intro.paused) intro.pause(); 
          intro.currentTime = 0;
          intro.volume = 0;
          console.log('AmbientSpace: welcome VO completely stopped');
        } catch {}
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
      console.log('AmbientSpace: neither playingMusic nor suspend, checking if should resume ambient');
      // If a welcome VO is pending, hold ambient until an explicit ambient:play signal
      // This ensures space-music.mp3 starts together with the welcome VO after button.mp3 finishes
      if (introPendingRef.current) {
        console.log('AmbientSpace: intro pending; deferring ambient resume until ambient:play');
        return cancelFade();
      }
      // Don't resume ambient if user has selected a specific song
      if (userSelectedSong) {
        console.log('AmbientSpace: user selected song, keeping ambient paused');
        if (fadeDownTimerRef.current !== undefined) { 
          clearTimeout(fadeDownTimerRef.current); 
          fadeDownTimerRef.current = undefined; 
        }
        try { amb.pause(); } catch {}
        return;
      }
      console.log('AmbientSpace: no user song selection, resuming ambient');
      if (fadeDownTimerRef.current !== undefined) { 
        clearTimeout(fadeDownTimerRef.current); 
        fadeDownTimerRef.current = undefined; 
      }
      // Resume ambient then fade in when not suspended and not playing music
      if (!amb.paused) {
        // If already playing, just fade volume up
        try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
        // If intro is pending/playing, set bed volume immediately; else quick fade in
        if (introPendingRef.current || introPlayingRef.current) {
          amb.volume = clamp01(Math.min(volume, 0.75));
        } else {
          fadeVolume(clamp01(volume), 200);
        }
      } else {
        // If paused, restart and fade in
        amb.volume = clamp01(introPendingRef.current || introPlayingRef.current ? Math.min(volume, 0.75) : volume);
        const ensurePlay = amb.play();
        ensurePlay.then(() => { 
          try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
          if (introPendingRef.current || introPlayingRef.current) {
            amb.volume = clamp01(Math.min(volume, 0.75));
          } else {
            fadeVolume(clamp01(volume), 200);
          }
        }).catch(() => {
          console.log('Failed to resume ambient audio');
        });
      }
    }
    return cancelFade;
  }, [playingMusic, suspend, volume, userSelectedSong]);

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
      // Don't auto-resume if user manually paused, or if music is playing, or if suspended,
      // or if user selected a song, or if welcome VO is pending (we'll start via ambient:play)
      if (playingMusic || suspend || userPausedRef.current || userSelectedSong || introPendingRef.current) return;
      try { amb.muted = false; } catch {}
      amb.play().catch(()=>{});
    };
    const onPause = () => { 
      console.log('🎵 AmbientSpace: Audio paused unexpectedly, will try resume in 100ms', {
        playingMusic, suspend, userPausedRef: userPausedRef.current, userSelectedSong, introPending: introPendingRef.current
      });
      setTimeout(tryResume, 100); 
    };
    const onEnded = () => { 
      console.log('🎵 AmbientSpace: Audio ended, will try resume immediately');
      setTimeout(tryResume, 0); 
    };
    amb.addEventListener('pause', onPause);
    amb.addEventListener('ended', onEnded);
    // Also periodically ensure it's playing in case of transient blockers
    const id = window.setInterval(() => {
      // Only try resume if audio appears to be stopped/paused unexpectedly
      if (amb && amb.paused && !playingMusic && !suspend && !userPausedRef.current && !userSelectedSong && !introPendingRef.current) {
        console.log('Periodic check: audio unexpectedly paused, attempting resume');
        tryResume();
      }
    }, 60000); // reduced frequency to every 60 seconds to minimize interference
    return () => { 
      amb.removeEventListener('pause', onPause);
      amb.removeEventListener('ended', onEnded);
      window.clearInterval(id);
    };
  }, [playingMusic, suspend, userSelectedSong]);

  // Resilience: if the ambient stream stalls or ends, force a quick resume/reload.
  useEffect(() => {
    const amb = ambRef.current; if (!amb) return;
    const tryResume = () => {
      if (playingMusic || suspend || userSelectedSong || introPendingRef.current) return;
      try { amb.muted = false; } catch {}
      amb.play().catch(() => { try { amb.load(); amb.play().catch(()=>{}); } catch {} });
    };

    const onEnded = () => { 
      console.log('🎵 AmbientSpace: space-music.mp3 ended, checking if should loop');
      try { amb.currentTime = 0; } catch {}; 
      
      // Only auto-resume/loop if we're not playing music and not suspended
      if (!playingMusic && !suspend && !userSelectedSong && !introPendingRef.current) {
        console.log('🎵 AmbientSpace: Auto-looping space-music.mp3');
        tryResume(); 
      } else {
        console.log('🎵 AmbientSpace: Not looping - conditions prevent it');
      }
    };
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
      if (!amb || playingMusic || suspend || userSelectedSong || introPendingRef.current) { 
        stuckSinceRef.current = undefined; 
        lastTimeRef.current = amb?.currentTime || 0; 
        return; 
      }
      const t = amb.currentTime || 0;
      const last = lastTimeRef.current || 0;
      const advanced = (t - last) > 0.1; // more lenient threshold - 100ms advance
      const now = performance.now();
      if (!advanced && !amb.paused && amb.readyState >= 2) {
        // Potential stall
        if (stuckSinceRef.current === undefined) stuckSinceRef.current = now;
        const stuckMs = now - (stuckSinceRef.current || now);
        if (stuckMs > 60000) { // increased threshold to 60 seconds to avoid false positives
          // Instead of nudging playhead, just try to resume playback
          console.log('Audio stall detected after 60s, attempting resume');
          tryResume();
          stuckSinceRef.current = undefined;
        }
      } else {
        // Advanced normally; reset stuck marker
        stuckSinceRef.current = undefined;
      }
      lastTimeRef.current = t;
    }, 5000); // increased interval to 5 seconds

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
  }, [playingMusic, suspend, userSelectedSong]);

  const enable = async () => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!amb) return;
    // Do not start ambient if we are suspended or a song is playing or user selected a song
    if (suspend || playingMusic || userSelectedSong) {
      setNeedEnable(true);
      return;
    }
    try {
      // Start with audible volume immediately and play both together if intro is pending
      const targetVol = (!playingMusic && intro && introSrc && introPendingRef.current) ? Math.min(volume, 0.75) : volume;
      amb.volume = clamp01(targetVol);
      try { amb.currentTime = 0; } catch {}
      try { amb.muted = false; amb.removeAttribute('muted'); } catch {}

      const toPlay: Promise<any>[] = [amb.play()];
      if (!playingMusic && intro && introSrc && introPendingRef.current) {
        try { intro.currentTime = 0; } catch {}
        try { intro.volume = 0.9; } catch {}
        toPlay.push(intro.play().catch(()=>{}));
        introPendingRef.current = false;
        // Restore ambient bed after VO ends
        const onIntroEnd = () => { fadeVolume(clamp01(volume), 400); try { intro.removeEventListener('ended', onIntroEnd); } catch {} };
        try { intro.addEventListener('ended', onIntroEnd, { once: true } as any); } catch {}
      }
      await Promise.allSettled(toPlay);
      if (playingMusic) { introPendingRef.current = false; }
      setNeedEnable(false);
    } catch { setNeedEnable(true); }
  };

  return (
    <>
      {/* Do not autoplay on mount; playback is orchestrated via effects when not suspended */}
      <audio ref={ambRef} src={ambientSrc} preload="auto" playsInline muted loop data-ambient="1" />
      {introSrc ? <audio ref={introRef} src={introSrc} preload="auto" playsInline data-intro="1" /> : null}
      {/* Enable sound button hidden; global interaction starts audio automatically */}
    </>
  );
}
