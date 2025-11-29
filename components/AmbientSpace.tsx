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
  // Intro VO should play only once per session (first ambient trigger)
  // Use sessionStorage to persist intro consumption across component remounts
  const getIntroSessionKey = (src: string) => `intro_consumed_${src.split('/').pop()?.split('?')[0]}`;
  const isIntroConsumedForSession = (src: string) => {
    try {
      return sessionStorage.getItem(getIntroSessionKey(src)) === 'true';
    } catch {
      return false;
    }
  };
  const markIntroConsumedForSession = (src: string) => {
    try {
      sessionStorage.setItem(getIntroSessionKey(src), 'true');
    } catch {}
  };
  
  const introPendingRef = useRef<boolean>(!!introSrc && !isIntroConsumedForSession(introSrc || ''));
  const introConsumedRef = useRef<boolean>(isIntroConsumedForSession(introSrc || ''));
  const introPlayingRef = useRef<boolean>(false);
  // Plays welcome VO alongside the first ambient start only
  const lastTimeRef = useRef<number>(0);
  const stuckSinceRef = useRef<number|undefined>(undefined);
  const fadeDownTimerRef = useRef<number|undefined>(undefined);
  const userPausedRef = useRef<boolean>(false); // Track if user manually paused
  // If we receive an ambient:play while suspended/blocked, queue it to run once clear
  const queuedStartRef = useRef<boolean>(false);
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  function cancelFade() {
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
  }

  function fadeVolume(to: number, ms = 300, then?: () => void) {
    const amb = ambRef.current; if (!amb) return;
    
    cancelFade();
    const from = amb.volume;
    if (ms <= 0) { amb.volume = clamp01(to); if (then) then(); return; }
    const start = performance.now();
    const step = (now: number) => {
      // Check if audio element still exists and is in a valid state
      if (!amb || amb.paused) {
        rafRef.current = undefined;
        if (then) then();
        return;
      }
      const t = Math.min(1, (now - start) / ms);
      const v = from + (to - from) * t;
      // Only set volume if the element is still valid and playing
      try {
        amb.volume = clamp01(v);
      } catch (e) {
        console.warn('Failed to set volume during fade:', e);
        rafRef.current = undefined;
        if (then) then();
        return;
      }
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else { rafRef.current = undefined; if (then) then(); }
    };
    rafRef.current = requestAnimationFrame(step);
  }

  // Do NOT auto-play intro VO on mount. Only play with the first ambient:play.
  useEffect(() => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!amb) return;
    // Never auto-play intro while suspended; wait for ambient:play trigger
    if (suspend) return;
    // Pre-set volume so audio is audible immediately (no ducking)
    const initialVol = clamp01(volume);
    amb.volume = initialVol;
    // Start unmuted for immediate audio
    try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
    // As soon as ambient reports 'playing', unmute immediately and ensure bed volume
    const onAmbPlaying = () => {
      try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
      amb.volume = initialVol;
      try { amb.removeEventListener('playing', onAmbPlaying as any); } catch {}
    };
    try { amb.addEventListener('playing', onAmbPlaying as any, { once: true } as any); } catch {}
    // Do not auto-start ambient here; wait for explicit triggers
    return cancelFade;
  }, [suspend]);

  // If introSrc becomes available after mount, mark it pending exactly once.
  useEffect(() => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!introSrc || !intro || !amb) return;
    // Only (re)pend if we haven't already consumed it this session
    const consumed = isIntroConsumedForSession(introSrc);
    introConsumedRef.current = consumed;
    if (!consumed) {
      introPendingRef.current = true;
    }
    // Do not auto-play; will be started via ambient:play
  }, [introSrc]);

  // Global unlock: if autoplay is blocked, allow user interaction (keyboard or pointer) to enable.
  // Respect playingMusic — but allow intro VO to start even while suspended.
  useEffect(() => {
    if (!needEnable) return;
    if (playingMusic) return;
    // If suspended, only attach if an intro is pending (to allow VO-only start)
    if (suspend && !introPendingRef.current) return;
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
        // Queue a start so we kick off as soon as suspension/blocks clear
        queuedStartRef.current = true;
        setNeedEnable(true);
        return;
      }
      // Reset playheads for a clean start
      try { amb.pause(); } catch {}
      try { amb.currentTime = 0; } catch {}
      try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
      const setAmbient = () => { amb.volume = clamp01(volume); };
      setAmbient();
      // If welcome VO is available and pending, start both VO and ambient together
      if (intro && introSrc && introPendingRef.current && !introPlayingRef.current) {
        try { intro.currentTime = 0; } catch {}
        try { intro.volume = 0.9; } catch {}
        const handleIntroPlay = () => {
          introPlayingRef.current = true;
          setAmbient();
        };
        const handleIntroEnded = () => {
          introPlayingRef.current = false;
          try { intro.removeEventListener('play', handleIntroPlay); } catch {}
        };
        try { intro.addEventListener('play', handleIntroPlay); } catch {}
        try { intro.addEventListener('ended', handleIntroEnded, { once: true } as any); } catch {}
        // Reset ambient fully, set bed, and start both back-to-back
        try { amb.pause(); } catch {}
        try { amb.currentTime = 0; } catch {}
        setAmbient();
        const p1 = amb.play().catch(()=>{});
        const p2 = intro.play().then(() => { 
          introPendingRef.current = false; 
          introConsumedRef.current = true;
          markIntroConsumedForSession(introSrc);
        }).catch(() => { 
          introPendingRef.current = false; 
          introConsumedRef.current = true;
          markIntroConsumedForSession(introSrc);
        });
        void p1; void p2;
        return;
      }
      // Otherwise, start ambient immediately
      amb.play().catch(()=>{});
    };
    window.addEventListener('ambient:play', onAmbientPlay as any);
    // Expose a generic enable event to attempt starting audio (VO and/or ambient)
    const onAmbientEnable = () => { enable(); };
    window.addEventListener('ambient:enable', onAmbientEnable as any);
    return () => { 
      window.removeEventListener('ambient:play', onAmbientPlay as any); 
      window.removeEventListener('ambient:enable', onAmbientEnable as any);
    };
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
      
      if (fadeDownTimerRef.current !== undefined) { clearTimeout(fadeDownTimerRef.current); fadeDownTimerRef.current = undefined; }
      
      // ENHANCED: Ensure complete audio stop and reset
      try { 
        amb.pause(); 
        amb.currentTime = 0;
        amb.volume = 0;
        
      } catch {}
      
      if (intro) {
        try { 
          if (!intro.paused) intro.pause(); 
          intro.currentTime = 0;
          intro.volume = 0;
          
        } catch {}
        introPlayingRef.current = false;
        introPendingRef.current = false; // don't replay VO during music
      }
    } else if (suspend) {
      // UI/warp suspend: fade ambient down but do NOT pause (prevents cut‑offs)
      
      if (fadeDownTimerRef.current !== undefined) cancelAnimationFrame(fadeDownTimerRef.current as any);
      fadeVolume(0, 150);
      // Leave intro playing if it already started; if not started yet, let normal flow handle it
  } else {
      
      // If a welcome VO is pending, hold ambient until an explicit ambient:play signal
      // This ensures space-music.mp3 starts together with the welcome VO after button.mp3 finishes
      if (introPendingRef.current && !queuedStartRef.current) {
        
        return cancelFade();
      }
      // Don't resume ambient if user has selected a specific song
      if (userSelectedSong) {
        
        if (fadeDownTimerRef.current !== undefined) { 
          clearTimeout(fadeDownTimerRef.current); 
          fadeDownTimerRef.current = undefined; 
        }
        try { amb.pause(); } catch {}
        return;
      }
      
      if (fadeDownTimerRef.current !== undefined) { 
        clearTimeout(fadeDownTimerRef.current); 
        fadeDownTimerRef.current = undefined; 
      }
      // If there is a queued start (from an earlier ambient:play while suspended), honor it now.
      if (queuedStartRef.current) {
        queuedStartRef.current = false;
        try { amb.pause(); } catch {}
        try { amb.currentTime = 0; } catch {}
        try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
        const setAmbient = () => { amb.volume = clamp01(volume); };
        setAmbient();
        if (intro && introSrc && introPendingRef.current && !introPlayingRef.current) {
          try { intro.currentTime = 0; } catch {}
          try { intro.volume = 0.9; } catch {}
          const handleIntroPlay = () => {
            introPlayingRef.current = true;
            setAmbient();
          };
          const handleIntroEnded = () => {
            introPlayingRef.current = false;
            try { intro.removeEventListener('play', handleIntroPlay); } catch {}
          };
          try { intro.addEventListener('play', handleIntroPlay); } catch {}
          try { intro.addEventListener('ended', handleIntroEnded, { once: true } as any); } catch {}
          const p1 = amb.play().catch(()=>{});
          const p2 = intro.play().then(() => { 
          introPendingRef.current = false; 
          introConsumedRef.current = true;
          markIntroConsumedForSession(introSrc);
        }).catch(() => { 
          introPendingRef.current = false; 
          introConsumedRef.current = true;
          markIntroConsumedForSession(introSrc);
        });
          void p1; void p2;
          return cancelFade();
        }
        // No intro pending; just start ambient
        amb.play().catch(()=>{});
        return cancelFade();
      }

      // Resume ambient then fade in when not suspended and not playing music
      if (!amb.paused) {
        // If already playing, just fade volume up to configured level
        try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
        fadeVolume(clamp01(volume), 200);
      } else {
        // If paused, restart and fade in at configured level
        amb.volume = clamp01(volume);
        const ensurePlay = amb.play();
        ensurePlay.then(() => { 
          try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
          fadeVolume(clamp01(volume), 200);
        }).catch(() => {
          
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
      
      // Increased delay to 2 seconds to avoid rapid pause/resume cycles that could cause cutting out
      setTimeout(tryResume, 2000); 
    };
    const onEnded = () => { 
      
      setTimeout(tryResume, 0); 
    };
    amb.addEventListener('pause', onPause);
    amb.addEventListener('ended', onEnded);
    // Also periodically ensure it's playing in case of transient blockers
    const id = window.setInterval(() => {
      // Only try resume if audio appears to be stopped/paused unexpectedly
      if (amb && amb.paused && !playingMusic && !suspend && !userPausedRef.current && !userSelectedSong && !introPendingRef.current) {
        
        tryResume();
      }
    }, 300000); // increased frequency to every 5 minutes to minimize interference
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
      
      try { amb.currentTime = 0; } catch {}; 
      
      // Auto-resume/loop whenever we're not playing music and not suspended.
      // Do NOT block looping solely because an intro VO is pending — this avoids a 6s cutoff stall.
      if (!playingMusic && !suspend && !userSelectedSong) {
        
        // Ensure audible volume on loop to avoid cases where a primed 0 volume persists
        try { amb.muted = false; amb.removeAttribute('muted'); amb.volume = clamp01(volume); } catch {}
        tryResume(); 
      } else {
        
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
      const advanced = (t - last) > 0.5; // more lenient threshold - 500ms advance to reduce false positives
      const now = performance.now();
      if (!advanced && !amb.paused && amb.readyState >= 2) {
        // Potential stall
        if (stuckSinceRef.current === undefined) stuckSinceRef.current = now;
        const stuckMs = now - (stuckSinceRef.current || now);
        if (stuckMs > 120000) { // increased threshold to 120 seconds (2 minutes) to avoid false positives
          // Instead of nudging playhead, just try to resume playback
          
          tryResume();
          stuckSinceRef.current = undefined;
        }
      } else {
        // Advanced normally; reset stuck marker
        stuckSinceRef.current = undefined;
      }
      lastTimeRef.current = t;
    }, 10000); // increased interval to 10 seconds to reduce interference

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

  // (No first-loop deferral; VO starts with first ambient play when pending)

  // Guard: some devices misreport MP3 duration (~6s) and fire 'ended' early.
  // Detect suspiciously short duration and repair by nudging currentTime or reloading src.
  useEffect(() => {
    const amb = ambRef.current; if (!amb) return;

    let fixedOnce = false;
    const isSuspectDuration = () => isFinite(amb.duration) && amb.duration > 0 && amb.duration < 10; // ~6s bug

    const attemptRepair = (reason: string) => {
      if (playingMusic || suspend || userSelectedSong) return;
      try { amb.muted = false; } catch {}
      // First try a gentle nudge forward which often forces a full file parse
      try {
        if (!fixedOnce) {
          amb.currentTime = Math.min(0.2, (amb.duration || 0.2) * 0.04);
          fixedOnce = true;
          amb.play().catch(()=>{});
          return;
        }
      } catch {}
      // If still broken, force a cache-busted reload without changing user-facing volume
      const vol = amb.volume;
      const wasPlaying = !amb.paused;
      try {
        const base = (ambientSrc || '').split('#')[0];
        amb.src = `${base}?fix=${Date.now()}#t=0.01,`;
        amb.load();
      } catch {}
      amb.volume = vol;
      if (wasPlaying) amb.play().catch(()=>{});
    };

    const onMeta = () => { if (isSuspectDuration()) attemptRepair('metadata'); };
    const onDurChange = () => { if (isSuspectDuration()) attemptRepair('durationchange'); };
    const onTU = () => {
      if (!amb) return;
      if (isSuspectDuration() && amb.currentTime > 4 && !amb.paused) {
        attemptRepair('timeupdate');
      }
    };

    amb.addEventListener('loadedmetadata', onMeta);
    amb.addEventListener('durationchange', onDurChange);
    amb.addEventListener('timeupdate', onTU);
    return () => {
      amb.removeEventListener('loadedmetadata', onMeta);
      amb.removeEventListener('durationchange', onDurChange);
      amb.removeEventListener('timeupdate', onTU);
    };
  }, [ambientSrc, playingMusic, suspend, userSelectedSong]);

  const enable = async () => {
    const amb = ambRef.current;
    const intro = introRef.current;
    if (!amb) return;
    // Do not start ambient if a song is playing or user selected a song
    if (playingMusic || userSelectedSong) {
      setNeedEnable(true);
      return;
    }
    try {
      const toPlay: Promise<any>[] = [];
      if (!suspend) {
        // Start ambient only when not suspended
        amb.volume = clamp01(volume);
        try { amb.currentTime = 0; } catch {}
        try { amb.muted = false; amb.removeAttribute('muted'); } catch {}
        toPlay.push(amb.play());
      }
      // Only allow the intro VO to begin when ambient is allowed to start
      // (ensures the VO plays together with space-music rather than earlier while suspended)
      if (!suspend && intro && introSrc && introPendingRef.current) {
        try { intro.currentTime = 0; } catch {}
        try { intro.volume = 0.9; } catch {}
        toPlay.push(intro.play().catch(()=>{}));
        introPendingRef.current = false;
        introConsumedRef.current = true;
        markIntroConsumedForSession(introSrc);
      }
      await Promise.allSettled(toPlay);
      if (playingMusic) { introPendingRef.current = false; }
      setNeedEnable(false);
    } catch { setNeedEnable(true); }
  };

  return (
    <>
      {/* Do not autoplay on mount; playback is orchestrated via effects when not suspended */}
      {/*
        Notes:
        - Append media fragment `#t=0,` to work around rare MP3 metadata issues where
          browsers misreport duration (~6s) and prematurely end playback.
        - Manage `muted` via effects (we remove the static attribute here) to avoid
          React re-applying it on re-renders and to ensure unmute timing is explicit.
      */}
      <audio
        ref={ambRef}
        src={`${ambientSrc}#t=0,`}
        preload="auto"
        playsInline
        data-ambient="1"
      />
      {introSrc ? <audio ref={introRef} src={introSrc} preload="auto" playsInline data-intro="1" /> : null}
      {/* Enable sound button hidden; global interaction starts audio automatically */}
    </>
  );
}
