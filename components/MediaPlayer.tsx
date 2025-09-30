"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { tracks as ALL, type Track } from "@/lib/songs-consolidated";
import { skyFor, verifyAllTrackSkies } from "@/lib/sky";
import { track as gaTrack } from "@/lib/analytics";
import { DEBUG_MEDIA, dlog, dwarn, dumpAudio } from "@/lib/debug";
import { ELEMENT_COLORS, type Element } from "@/lib/planets";
import { retryMediaPlay, playWithAutoplayFallback } from "@/lib/media-retry";
import { MediaStateMachine, type MediaState } from "@/lib/media-state-machine";

type Props = {
  onSkyChange: (webm: string, mp4: string, key: string) => void;
  onPlayingChange: (playing: boolean) => void;
  onTrackChange?: (track: Track) => void;
  onAudioReady?: (ready: boolean) => void; // notifies when audio can play (canplaythrough)
  wrapChannels?: boolean;
  startSignal?: number;    // increments to force start
  startIndex?: number;     // default 0
  playSignal?: number;     // increments to force play current or nearest with audio
  toggleSignal?: number;   // increments to toggle play/pause (prefers local audio)
  showHUDPlay?: boolean;   // show the HUD play/pause button (default true)
  index?: number;          // controlled index (optional)
  onIndexChange?: (idx:number)=>void; // notify parent on index change
  autoPlayOnIndex?: boolean; // if false, do not auto-start playback on index changes
  unlockPlays?: boolean;     // if false, gesture unlock will not auto-play
};

export default function MediaPlayer({ onSkyChange, onPlayingChange, onTrackChange, onAudioReady, wrapChannels = true, startSignal = 0, startIndex = 0, playSignal = 0, toggleSignal = 0, showHUDPlay = true, index, onIndexChange, autoPlayOnIndex = true, unlockPlays = true }: Props) {
  const [internalIdx, setInternalIdx] = useState(startIndex);
  const idx = (typeof index === 'number') ? index : internalIdx;
  const setIdx = (val: number | ((p:number)=>number)) => {
    const next = typeof val === 'function' ? (val as (p:number)=>number)(idx) : val;
    if (onIndexChange) onIndexChange(next); else setInternalIdx(next);
  };
  // Define tracks and current track before any memoized computations that depend on them
  const tracks = ALL;
  const cur = tracks[idx];
  const [playing, setPlaying] = useState(false);
  
  // Initialize media state machine
  const stateMachine = useRef(new MediaStateMachine());
  const [mediaState, setMediaState] = useState<MediaState>('idle');
  const audioRef = useRef<HTMLAudioElement|null>(null);
  const uiClickRef = useRef<HTMLAudioElement|null>(null);
  const detentRef = useRef<HTMLAudioElement|null>(null);
  const warpPlayTimerRef = useRef<number|undefined>(undefined);
  const isInitialMountRef = useRef(true);
  const intentionalPlayRef = useRef(false); // Track when play is intentionally triggered
  const [pickerOpen, setPickerOpen] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [animationTime, setAnimationTime] = useState(0);
  // Structured sections and derived chorus times
  const sections = useMemo(() => {
    const secs = (cur as any)?.sections as { time: number; label: string; kind?: string }[] | undefined;
    if (Array.isArray(secs) && secs.length > 0) {
      return secs
        .filter(s => s && typeof s.time === 'number' && isFinite(s.time) && s.time >= 0 && typeof s.label === 'string')
        .sort((a,b) => a.time - b.time);
    }
    const ch = (cur as any)?.choruses as number[] | undefined;
    if (Array.isArray(ch) && ch.length > 0) {
      return ch
        .filter(n => typeof n === 'number' && isFinite(n) && n >= 0)
        .sort((a,b)=>a-b)
        .map((t, i) => ({ time: t, label: `Chorus ${i+1}`, kind: 'chorus' as const }));
    }
    return [] as { time: number; label: string; kind?: string }[];
  }, [cur]);
  const chorusTimes: number[] = useMemo(() => sections.filter(s => (s.kind||'').toLowerCase() === 'chorus').map(s => s.time), [sections]);
  const currentSection = useMemo(() => {
    if (!sections.length) return null as null | { time:number; label:string; kind?: string };
    const t = currentTime;
    let curSec: any = null;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].time <= t + 0.05) curSec = sections[i]; else break;
    }
    return curSec;
  }, [sections, currentTime]);
  
  // Get current song's element and color
  const currentElement = getTrackElement(cur);
  const currentElementColor = ELEMENT_COLORS[currentElement];

  // Run sky verification in development on component mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Run verification after a short delay to avoid blocking initial render
      const timeoutId = setTimeout(() => {
        verifyAllTrackSkies(tracks);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, []); // Run once on mount

  // Subscribe to state machine changes
  useEffect(() => {
    const unsubscribe = stateMachine.current.onStateChange((state, context) => {
      setMediaState(state);
      setPlaying(context.isPlaying);
      
      if (DEBUG_MEDIA) {
        dlog('Media state changed:', { state, context });
      }
    });
    
    return unsubscribe;
  }, []);


  // Notify parent only when `playing` changes; avoid depending on inline callbacks
  const onPlayingChangeRef = useRef(onPlayingChange);
  useEffect(() => { onPlayingChangeRef.current = onPlayingChange; }, [onPlayingChange]);
  useEffect(() => { try { onPlayingChangeRef.current && onPlayingChangeRef.current(playing); } catch {} }, [playing]);

  // External "start" signal: only act when startSignal increments (>0).
  // Prevent auto-start on initial mount.
  useEffect(() => {
    if (!startSignal) return;
    const a = audioRef.current; if (!a) return;
    setIdx(startIndex);
    setTimeout(() => {
      try { if (a.readyState < 2) a.load(); } catch {}
      if (cur.src) {
        intentionalPlayRef.current = true; // Mark as intentional play
        a.play().then(() => { setPlaying(true); gaTrack("play", { slug: cur.slug }); })
                 .catch(() => setPlaying(false));
      }
    }, 0);
  }, [startSignal]); // eslint-disable-line

  // Load on index change; update sky; optionally auto-start after delay
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    if (DEBUG_MEDIA) { dlog('index change', { idx, title: cur?.title, slug: cur?.slug, autoPlayOnIndex }); dumpAudio(a, 'onIndexChange:before'); }
    
    // Send load song event to state machine
    if (cur.src) {
      stateMachine.current.send({ 
        type: 'LOAD_SONG', 
        payload: { slug: cur.slug, src: cur.src } 
      });
    }
    
    // Clear any pending delayed plays from prior index changes
    if (warpPlayTimerRef.current !== undefined) { clearTimeout(warpPlayTimerRef.current); warpPlayTimerRef.current = undefined; }
    
    // Stop current song before starting warp sequence
    // But only if this isn't part of an intended playback sequence
    try {
      if (!a.paused && autoPlayOnIndex) {
        // Don't reset currentTime to 0 when changing songs - let it transition smoothly
        a.pause();
      }
    } catch (e) {
      if (DEBUG_MEDIA) dwarn('Failed to stop current song', e);
    }
    
    // Update sky and notify parent components
    const s = skyFor(cur.slug);
    if (onSkyChange) onSkyChange(s.webm, s.mp4, s.key);
    if (onTrackChange) onTrackChange(cur);
    gaTrack("track_change", { title: cur.title, slug: cur.slug, idx });
    // Only play detent SFX if this is not the initial load and user has interacted
    if (startSignal > 0 || playSignal > 0 || toggleSignal > 0) {
      detent(); // detent SFX
    }
    

    // Always load the song when index changes, but only auto-play if autoPlayOnIndex is true
    if (cur.src) {
      // Always set up the audio element with the new source
      try {
        const want = String(cur.src || "");
        const current = a.getAttribute("src") || a.src;
        if (want && current !== want) {
          a.setAttribute("src", want);
          try { a.load(); } catch {}
          if (DEBUG_MEDIA) dlog('index change: set src', want);
        }
      } catch {}
      
      // Only auto-play if autoPlayOnIndex is enabled AND not initial mount
      if (autoPlayOnIndex && !isInitialMountRef.current) {
        const WARP_MS = 1800;
        warpPlayTimerRef.current = window.setTimeout(() => {
          const a2 = audioRef.current; if (!a2) return;
          
          // Use retry logic for post-warp play
          intentionalPlayRef.current = true; // Mark as intentional play
          playWithAutoplayFallback(a2, {
            maxRetries: 2,
            onRetry: (attempt, error) => {
              if (DEBUG_MEDIA) dwarn(`autoPlay retry ${attempt}`, error?.name, error?.message);
            }
          })
            .then(() => {
              stateMachine.current.send({ type: 'PLAY' });
              if (DEBUG_MEDIA) dlog('autoPlayOnIndex successful after warp');
            })
            .catch((error) => {
              if (DEBUG_MEDIA) dwarn('autoPlayOnIndex failed after retries', error);
              stateMachine.current.send({ type: 'ERROR', payload: { error } });
            });
          
          warpPlayTimerRef.current = undefined;
        }, WARP_MS);
      }
    }
    
    // Mark that we've completed the initial mount
    isInitialMountRef.current = false;
  }, [idx, autoPlayOnIndex]); // eslint-disable-line

  // Cleanup any pending warp timers on unmount
  useEffect(() => () => {
    if (warpPlayTimerRef.current !== undefined) { clearTimeout(warpPlayTimerRef.current); }
  }, []);

  // External play signal: play current track if it has audio; otherwise jump to first with local audio
  useEffect(() => {
    if (playSignal === 0) return; // Don't run on initial mount
    console.log('🎵 MediaPlayer: playSignal effect triggered with signal:', playSignal, 'current track:', cur?.title, 'src:', cur?.src);
    console.log('🎵 MediaPlayer: Audio element exists:', !!audioRef.current, 'Index:', index);
    const a = audioRef.current; 
    if (!a) {
      console.error('🎵 MediaPlayer: No audio element found!');
      return;
    }
    if (cur?.src) {
      // Ensure the audio element is pointing at the current track source
      try {
        const want = String(cur.src || "");
        const current = a.getAttribute("src") || a.src;
        console.log('🎵 MediaPlayer: playSignal - want src:', want, 'current src:', current);
        if (want && current !== want) {
          console.log('🎵 MediaPlayer: Setting new audio src:', want);
          a.setAttribute("src", want);
          // If we swapped the src, load the new one to be safe
          try { a.load(); } catch {}
          if (DEBUG_MEDIA) dlog('playSignal: set src', want);
        }
      } catch {}
      
      // Ensure audio is unmuted and has proper volume before playing
      try {
        a.muted = false;
        a.volume = 1.0;
        console.log('MediaPlayer: Unmuted audio element for', cur?.title);
      } catch {}
      
      // Use improved retry logic with autoplay fallback
      console.log('🎵 MediaPlayer: Attempting to play audio for', cur?.title, 'src:', cur?.src);
      console.log('🎵 MediaPlayer: Audio ready state:', a.readyState, 'duration:', a.duration, 'current time:', a.currentTime);
      intentionalPlayRef.current = true; // Mark as intentional play
      playWithAutoplayFallback(a, {
        maxRetries: 3,
        onRetry: (attempt, error) => {
          console.log(`MediaPlayer: playSignal retry attempt ${attempt}`, error?.name, error?.message);
          if (DEBUG_MEDIA) dwarn(`playSignal: retry attempt ${attempt}`, error?.name, error?.message);
        }
      })
        .then(({ muted }) => {
          console.log('🎵 MediaPlayer: Play successful for', cur?.title, { muted });
          console.log('🎵 MediaPlayer: Audio element state - paused:', a.paused, 'volume:', a.volume, 'muted:', a.muted);
          if (DEBUG_MEDIA) dlog('playSignal: play successful', { muted });
          stateMachine.current.send({ type: 'PLAY' });
          gaTrack("play", { slug: cur.slug });
        })
        .catch((error) => {
          console.error('🔴 MediaPlayer: Play failed for', cur?.title, error?.name, error?.message);
          if (DEBUG_MEDIA) dwarn('playSignal: all retries failed', error?.name, error?.message);
          stateMachine.current.send({ type: 'ERROR', payload: { error } });
        });
      return;
    }
    // Fallback: find first track that has a local audio src
    const withAudio = tracks.findIndex(t => !!t.src);
    if (withAudio >= 0) {
      setIdx(withAudio);
      setTimeout(() => {
        const a2 = audioRef.current; if (!a2) return;
        // Ensure source is correct when jumping tracks programmatically
        try {
          const want = String(tracks[withAudio]?.src || "");
          if (want && a2.getAttribute("src") !== want) { a2.setAttribute("src", want); try { a2.load(); } catch {} }
        } catch {}
        // As above, only load if needed to avoid resetting mid-play when already correct
        try { if (a2.readyState < 2) a2.load(); } catch {}
        try { a2.muted = false; a2.volume = 1.0; } catch {}
        intentionalPlayRef.current = true; // Mark as intentional play
        a2.play().then(() => { if (DEBUG_MEDIA) dlog('playSignal: fallback first-with-audio played'); setPlaying(true); if (onPlayingChange) onPlayingChange(true); gaTrack("play", { slug: tracks[withAudio].slug }); }).catch((e)=>{ if (DEBUG_MEDIA) dwarn('playSignal: fallback play rejected', e?.name, e?.message); setPlaying(false); });
      }, 0);
    }
  }, [playSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debug function to test audio manually (accessible from browser console)
  useEffect(() => {
    window.testAudio = () => {
      const a = audioRef.current;
      if (!a) {
        console.error('No audio element found');
        return;
      }
      console.log('🔍 Audio element test:', {
        src: a.src,
        paused: a.paused,
        volume: a.volume,
        muted: a.muted,
        readyState: a.readyState,
        duration: a.duration,
        currentTime: a.currentTime
      });
      console.log('🔍 Attempting manual play...');
      a.play().then(() => {
        console.log('✅ Manual play successful');
      }).catch(err => {
        console.error('❌ Manual play failed:', err);
      });
    };
    return () => { delete window.testAudio; };
  }, []);

  // External toggle signal from steering wheel: if paused, play current (or first with audio); if playing, pause
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) {
      // Resume from current position without reloading
      if (warpPlayTimerRef.current !== undefined) { clearTimeout(warpPlayTimerRef.current); warpPlayTimerRef.current = undefined; }
      if (cur?.src) {
        // Don't reload - just resume from current position
        try { a.muted = false; a.volume = 1.0; } catch {}
        intentionalPlayRef.current = true; // Mark as intentional play
        a.play().then(() => {
          setPlaying(true); if (onPlayingChange) onPlayingChange(true); gaTrack("play", { slug: cur.slug });
        }).catch(()=>{});
      } else {
        // Fallback to first with audio
        const withAudio = tracks.findIndex(t => !!t.src);
        if (withAudio >= 0) {
          setIdx(withAudio);
          // This will trigger index change effect which handles the warp sequence
        }
      }
    } else {
      a.pause(); setPlaying(false); if (onPlayingChange) onPlayingChange(false); gaTrack("pause", { slug: cur.slug });
    }
  }, [toggleSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  function uiClick() { const a = uiClickRef.current; if (!a) return; a.currentTime = 0; a.volume = 0.5; a.play().catch(()=>{}); }
  function detent()  { const d = detentRef.current; if (!d) return; d.currentTime = 0; d.volume = 0.6; d.play().catch(()=>{}); }

  function prev() { uiClick(); setIdx((p) => wrapChannels ? (p - 1 + tracks.length) % tracks.length : Math.max(0, p - 1)); }
  function next() { uiClick(); setIdx((p) => wrapChannels ? (p + 1) % tracks.length : Math.min(tracks.length - 1, p + 1)); }
  
  function adjustVolume(delta: number) {
    const a = audioRef.current; if (!a) return;
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVolume);
    // Ensure volume is valid before setting on audio element
    if (isFinite(newVolume) && newVolume >= 0 && newVolume <= 1) {
      a.volume = newVolume;
    }
    uiClick();
  }
  
  function toggle() {
    uiClick();
    const a = audioRef.current; if (!a) return;
    if (!cur.src) {
      // No local audio: jump to the first track with local audio and play
      const withAudio = tracks.findIndex(t => !!t.src);
      if (withAudio >= 0) {
        setIdx(withAudio);
        // Index change will handle loading and playing the new track
      }
      return;
    }
    if (a.paused) { 
      // Use retry logic for play
      intentionalPlayRef.current = true; // Mark as intentional play
      playWithAutoplayFallback(a, {
        maxRetries: 2,
        onRetry: (attempt, error) => {
          if (DEBUG_MEDIA) dwarn(`toggle play retry ${attempt}`, error?.name, error?.message);
        }
      })
        .then(() => {
          stateMachine.current.send({ type: 'PLAY' });
          gaTrack("play", { slug: cur.slug });
        })
        .catch((error) => {
          if (DEBUG_MEDIA) dwarn('toggle play failed after retries', error);
          stateMachine.current.send({ type: 'ERROR', payload: { error } });
        });
    }
    else { 
      a.pause(); 
      stateMachine.current.send({ type: 'PAUSE' });
      gaTrack("pause", { slug: cur.slug }); 
    }
  }

  useEffect(() => {
    // Keep local playing state in sync with the audio element's real state
    const a = audioRef.current; if (!a) return;
    
    // Store original pause method for cleanup
    const originalPause = a.pause.bind(a);
    
    // SAFETY: Ensure audio is paused on mount to prevent auto-play
    // But only if no play signals are pending to avoid interrupting intentional playback
    try {
      if (startSignal === 0 && playSignal === 0 && toggleSignal === 0 && !autoPlayOnIndex) {
        a.pause();
        a.currentTime = 0;
      }
    } catch {}
    
    const onPlay = () => {
      // Ignore unlock/priming plays that are muted or effectively silent
      const mutedOrSilent = (() => {
        try { return a.muted || a.volume <= 0.0001; } catch { return false; }
      })();
      if (DEBUG_MEDIA) dlog('audio event: play', { muted: a.muted, volume: a.volume, ignored: mutedOrSilent });
      
      // SAFETY: If this is an unwanted auto-play (no signals triggered AND autoPlayOnIndex is disabled AND not intentionally started), pause immediately
      if (!mutedOrSilent && startSignal === 0 && playSignal === 0 && toggleSignal === 0 && !autoPlayOnIndex && !intentionalPlayRef.current) {
        if (DEBUG_MEDIA) dwarn('Unexpected auto-play detected, pausing audio');
        try {
          a.pause();
          a.currentTime = 0;
          return;
        } catch {}
      }
      
      // Clear the intentional play flag once the play event fires
      intentionalPlayRef.current = false;
      
      if (mutedOrSilent) return;
      setPlaying(true);
    };
    const onPause = () => { 
      if (DEBUG_MEDIA) dlog('audio event: pause for', cur?.title); 
      setPlaying(false); 
    };
    const onEnded = () => { if (DEBUG_MEDIA) dlog('audio event: ended'); setPlaying(false); };
    const onErr = (e: any) => { if (DEBUG_MEDIA) { dwarn('audio event: error', e?.target?.error?.message || e?.target?.error?.code || 'unknown audio error'); dumpAudio(a, 'audio:error'); }};
    const onWaiting = () => { if (DEBUG_MEDIA) dlog('audio event: waiting'); };
    const onStalled = () => { if (DEBUG_MEDIA) dlog('audio event: stalled'); };
    const onVolumeChange = () => { 
      const vol = Math.max(0, Math.min(1, a.volume)); 
      setVolume(vol); 
    };
    const onTimeUpdate = () => { 
      const newTime = a.currentTime;
      setCurrentTime(newTime);
      if (DEBUG_MEDIA) {
        // Only log every 5 seconds to avoid spam
        if (Math.floor(newTime) % 5 === 0 && Math.floor(newTime) !== Math.floor(currentTime)) {
          dlog('timeupdate', { currentTime: newTime, duration: a.duration, playing: !a.paused });
        }
      }
    };
    const onLoadedMetadata = () => { setDuration(a.duration); };
    const onCanPlayThrough = () => { try { onAudioReady && onAudioReady(true); } catch {} };
    const onCanPlay = () => { try { onAudioReady && onAudioReady(true); } catch {} };

    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnded);
    a.addEventListener('error', onErr as any);
    a.addEventListener('waiting', onWaiting as any);
    a.addEventListener('stalled', onStalled as any);
    a.addEventListener('volumechange', onVolumeChange);
    a.addEventListener('timeupdate', onTimeUpdate);
    a.addEventListener('loadedmetadata', onLoadedMetadata);
    a.addEventListener('canplaythrough', onCanPlayThrough as any);
    a.addEventListener('canplay', onCanPlay as any);

    return () => {
      // Restore original pause method
      if (originalPause) {
        a.pause = originalPause;
      }
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('error', onErr as any);
      a.removeEventListener('waiting', onWaiting as any);
      a.removeEventListener('stalled', onStalled as any);
      a.removeEventListener('volumechange', onVolumeChange);
      a.removeEventListener('timeupdate', onTimeUpdate);
      a.removeEventListener('loadedmetadata', onLoadedMetadata);
      a.removeEventListener('canplaythrough', onCanPlayThrough as any);
      a.removeEventListener('canplay', onCanPlay as any);
    };
  }, []);

  useEffect(() => {
    // Prime audio on first real user interaction to satisfy autoplay policies,
    // but do NOT actually start music. We play muted briefly, then pause.
    const unlock = () => {
      const a = audioRef.current; if (!a) return;
      
      // Store original source and clear it to prevent actual song from playing
      const originalSrc = a.src;
      try { 
        a.removeAttribute('src');
        a.load(); 
      } catch {}
      
      try {
        a.muted = true;
        a.volume = 0; // Extra safety
        a.play()
          .then(() => {
            // Briefly run to unlock, then pause and reset silently
            setTimeout(() => {
              try { a.pause(); } catch {}
              try { a.currentTime = 0; } catch {}
              // Restore original source after unlock
              try { 
                if (originalSrc) {
                  a.src = originalSrc;
                }
                a.muted = false; 
                a.volume = 1;
              } catch {}
            }, 100);
          })
          .catch(() => {
            // Restore state on error
            try { 
              if (originalSrc) {
                a.src = originalSrc;
              }
              a.muted = false; 
              a.volume = 1;
            } catch {}
          });
      } catch {}
    };
    window.addEventListener('pointerdown', unlock, { once: true } as any);
    window.addEventListener('touchstart', unlock, { once: true } as any);
    return () => {
      window.removeEventListener('pointerdown', unlock as any);
      window.removeEventListener('touchstart', unlock as any);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore global hotkeys when typing in an input/textarea/contenteditable
      try {
        const ae = (document.activeElement as HTMLElement | null);
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || (ae as any).isContentEditable)) return;
      } catch {}
      // Do not force-load on keydown; this can reset currentTime.
      // Space/Enter handlers below will attempt play() as a user gesture.
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); adjustVolume(0.1); }
      else if (e.key === "ArrowDown") { e.preventDefault(); adjustVolume(-0.1); }
      // Do not handle Space here to avoid double-toggles with DashboardApp
      else if (/^[1-9]$/.test(e.key)) {
        const n = Number(e.key) - 1; if (n < tracks.length) { uiClick(); setIdx(n); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, wrapChannels, tracks.length]);

  // Animation loop for waveform when playing
  useEffect(() => {
    if (!playing) return;
    
    const animate = () => {
      setAnimationTime(Date.now());
      // Also update current time more frequently for smoother cursor movement
      const a = audioRef.current;
      if (a && !a.paused) {
        setCurrentTime(a.currentTime);
      }
      if (playing) {
        requestAnimationFrame(animate);
      }
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [playing]);

  // Dial interactions moved to StationDialOverlay; keep keyboard + prev/next here

  // mobile swipe
  const touchStart = useRef<{x:number;y:number}|null>(null);
  function onTouchStart(e: React.TouchEvent) { const t = e.touches[0]; touchStart.current = { x: t.clientX, y: t.clientY }; }
  function onTouchEnd(e: React.TouchEvent) {
    const s = touchStart.current; if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x, dy = t.clientY - s.y;
    touchStart.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) next(); else prev();
  }

  

  return (
    <div className="hud-card console-hud h-full w-full relative" style={{ borderRadius: '16px' }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} aria-label="Media dock">
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between gap-3 flex-1">
          <div className="flex-1 min-w-0 pr-2">
            <div className="text-left">
              <div className="text-sm md:text-base opacity-90 leading-tight truncate">{cur.title}</div>
              <div className="text-xs md:text-sm opacity-60 leading-tight line-clamp-2">{cur.subtitle}</div>
            </div>
          </div>
        </div>
        <div className="waveform-container" title={cur.title}>
          <div className="waveform" aria-label="Audio waveform visualization">
            {/* Audio Waveform using SVG for smooth curves */}
            <svg 
              className="w-full h-full" 
              viewBox="0 0 800 100" 
              preserveAspectRatio="none"
              style={{ background: 'transparent' }}
            >
              {/* Background grid lines for audio feel */}
              <defs>
                <pattern id="grid" width="20" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Generate realistic waveform data */}
              {(() => {
                const waveformData = Array.from({ length: 200 }, (_, i) => {
                  // Use song title as seed for consistent waveform per song
                  const seed = cur.title.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                  
                  // Create realistic audio frequency components
                  const bassLine = Math.sin((i + seed) * 0.01) * 0.4;           // Bass frequencies
                  const melody = Math.sin((i + seed) * 0.05 + 2) * 0.3;         // Mid frequencies  
                  const percussion = Math.sin((i + seed) * 0.15 + 4) * 0.2;     // High frequencies
                  const vocals = Math.sin((i + seed) * 0.08 + 1) * 0.25;        // Vocal range
                  const harmonics = Math.sin((i + seed) * 0.3 + 5) * 0.1;       // Harmonics
                  
                  // Create natural audio envelope (songs typically start/end quieter)
                  const fadeIn = Math.min(1, i / 20);
                  const fadeOut = Math.min(1, (200 - i) / 30);
                  const envelope = Math.min(fadeIn, fadeOut);
                  
                  // Add some natural variation like dynamics in music
                  const dynamics = Math.sin((i / 200) * Math.PI * 3) * 0.3 + 0.7; // Musical dynamics
                  
                  // Combine all elements for realistic audio appearance
                  const amplitude = Math.abs(bassLine + melody + percussion + vocals + harmonics) * envelope * dynamics;
                  
                  return Math.max(0.02, Math.min(0.95, amplitude));
                });
                
                const progress = (duration > 0 && isFinite(currentTime) && isFinite(duration)) ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
                
                return (
                  <>
                    {/* Full waveform path */}
                    <path
                      d={`M 0 50 ${waveformData.map((amp, i) => {
                        const x = (i / (waveformData.length - 1)) * 800;
                        const y1 = 50 - (amp * 35); // Top of wave
                        const y2 = 50 + (amp * 35); // Bottom of wave
                        return `L ${x} ${y1} L ${x} ${y2}`;
                      }).join(' ')} L 800 50`}
                      fill="none"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="1"
                      opacity="0.8"
                    />
                    
                    {/* Played portion of waveform */}
                    <path
                      d={`M 0 50 ${waveformData.slice(0, Math.floor(progress * waveformData.length)).map((amp, i) => {
                        const x = (i / (waveformData.length - 1)) * 800;
                        const y1 = 50 - (amp * 35);
                        const y2 = 50 + (amp * 35);
                        return `L ${x} ${y1} L ${x} ${y2}`;
                      }).join(' ')} L ${progress * 800} 50`}
                      fill="none"
                      stroke={currentElementColor}
                      strokeWidth="2"
                      opacity="1"
                      style={{
                        filter: `drop-shadow(0 0 3px ${currentElementColor}66)`,
                      }}
                    />
                    
                    {/* Animated playing indicator */}
                    {playing && (
                      <g>
                        {/* Pulse effect at current position */}
                        <circle
                          cx={progress * 800}
                          cy="50"
                          r="3"
                          fill={currentElementColor}
                          opacity="0.8"
                          style={{
                            filter: `drop-shadow(0 0 6px ${currentElementColor})`,
                          }}
                        >
                          <animate attributeName="r" values="3;8;3" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
                        </circle>
                        
                        {/* Moving frequency indicators */}
                        {[...Array(5)].map((_, i) => (
                          <rect
                            key={i}
                            x={Math.max(0, progress * 800 - 40 + i * 10)}
                            y={45 + Math.sin(animationTime * 0.002 + i) * 3}
                            width="2"
                            height={8 + Math.sin(animationTime * 0.003 + i * 2) * 4}
                            fill={currentElementColor}
                            opacity={0.6 - i * 0.1}
                            rx="1"
                          />
                        ))}
                      </g>
                    )}
                  </>
                );
              })()}
            </svg>
            {/* Section markers (verse/chorus/bridge/intro/outro) */}
            {duration > 0 && sections.length > 0 && (
              <div className="section-markers" aria-hidden>
                {sections.map((s, i) => {
                  const pct = Math.max(0, Math.min(100, (s.time / duration) * 100));
                  if (pct <= 0 || pct >= 100) return null;
                  const kind = (s.kind || '').toLowerCase();
                  const klass = kind ? `section-marker ${kind}` : 'section-marker';
                  return (
                    <button
                      key={`${cur.slug}-section-${i}`}
                      type="button"
                      className={klass}
                      style={{ left: `${pct}%` }}
                      title={`${s.label} (${Math.round(s.time)}s)`}
                      onClick={() => {
                        const a = audioRef.current; if (!a || !duration) return;
                        a.currentTime = Math.max(0, Math.min(duration - 0.2, s.time));
                        intentionalPlayRef.current = true; // Mark as intentional play
                        a.play().catch(()=>{});
                        setPlaying(true);
                        gaTrack("seek_section", { slug: cur.slug, index: i, kind: kind || 'section', label: s.label, seconds: s.time });
                      }}
                    >
                      <span className="sr-only">Jump to {s.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Time cursor with element icon */}
            <div
              className="absolute top-0 h-full flex flex-col items-center justify-center pointer-events-none z-10 cursor-transition"
              style={{
                left: `${Math.max(0, Math.min(100, (duration > 0 && isFinite(currentTime) && isFinite(duration) ? (currentTime / duration) * 100 : 0)))}%`,
                transform: 'translateX(-50%)',
                width: '32px',
              }}
            >
              {/* Vertical cursor line for better tracking visibility */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-current opacity-80"
                style={{
                  background: `linear-gradient(to bottom, transparent 0%, ${currentElementColor} 20%, ${currentElementColor} 80%, transparent 100%)`,
                  boxShadow: `0 0 4px ${currentElementColor}`,
                }}
              />
              
              {/* Element-shaped cursor icon */}
              <img
                src={`/elements/${currentElement}.png`}
                alt={`${cur.title} element`}
                className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 transform w-[2rem] h-[2rem] min-w-[2rem] min-h-[2rem] brightness-150 saturate-125"
                style={{ 
                  filter: `drop-shadow(0 0 14px ${currentElementColor}) drop-shadow(0 0 32px ${currentElementColor}AA) drop-shadow(0 0 64px ${currentElementColor}55)`,
                  animation: playing ? 'cursorPulse 2s ease-in-out infinite' : 'none'
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/elements/music.png';
                }}
              />
              
              {/* Time + section display */}
              <div 
                className="absolute -bottom-6 text-xs font-mono px-2 py-1 rounded transition-all duration-200"
                style={{ 
                  background: `${currentElementColor}22`,
                  color: currentElementColor,
                  border: `1px solid ${currentElementColor}44`,
                }}
              >
                {duration > 0 ? Math.floor((currentTime / duration) * 100) : 0}%
              </div>
              {currentSection ? (
                <div 
                  className="absolute -top-6 text-[10px] font-mono px-2 py-0.5 rounded transition-all duration-300"
                  style={{ 
                    background: 'rgba(0,0,0,0.35)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  {currentSection.label}
                </div>
              ) : null}
            </div>
          </div>
      </div>
      </div>


      {/* Sleek integrated control bar */}
      <div className="sleek-controls mt-3">
        {showHUDPlay && (
          <button 
            onClick={toggle} 
            className="play-pause-btn" 
            aria-label={playing ? "Pause" : "Play"}
          >
            <div className="btn-glow"></div>
            <span className="btn-icon">
              {playing ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </span>
          </button>
        )}
        
        <div className="track-controls">
          <button onClick={prev} className="track-btn" aria-label="Previous">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>
          <button onClick={next} className="track-btn" aria-label="Next">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>
        {chorusTimes.length > 0 && (
          <button
            onClick={() => {
              const a = audioRef.current; if (!a || !duration) return;
              const now = a.currentTime;
              const next = chorusTimes.find((t) => t > now + 0.75) ?? chorusTimes[0];
              a.currentTime = Math.max(0, Math.min(duration - 0.2, next));
              intentionalPlayRef.current = true; // Mark as intentional play
              a.play().catch(()=>{});
              setPlaying(true);
              gaTrack("jump_chorus", { slug: cur.slug, seconds: next });
            }}
            className="selector-btn"
            aria-label="Jump to chorus"
            title="Jump to chorus"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M4 4h2v16H4zM8 12l10 6V6z" />
            </svg>
            <span>Chorus</span>
          </button>
        )}
        
        <button 
          onClick={() => setPickerOpen((o)=>!o)} 
          className="selector-btn" 
          aria-haspopup="listbox" 
          aria-expanded={pickerOpen} 
          aria-label="Select song"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
          <span>Track</span>
        </button>
        
        <div className="volume-control">
          <div className="volume-bar">
            <div className="volume-fill" style={{ width: `${volume * 100}%` }}></div>
          </div>
          <span className="volume-text">{Math.round(volume * 100)}%</span>
        </div>
      </div>

      {pickerOpen ? (
        <div className="picker hud-card mt-3" role="dialog" aria-label="Select a song">
          <div className="text-xs opacity-70 mb-2">Choose a track</div>
          <div className="picker-list" role="listbox">
            {tracks.map((t, i) => (
              <button
                key={t.slug}
                role="option"
                aria-selected={i === idx}
                className={`picker-item ${i===idx ? 'active' : ''}`}
                onClick={()=>{ 
                  const wasChanged = i !== idx;
                  const selectedTrack = tracks[i];
                  setIdx(i); 
                  setPickerOpen(false);
                  
                  // The index change effect will handle playing after warp delay
                  // No need for duplicate timer logic here
                }}
                title={t.title}
              >
                <span className="truncate">{t.title}</span>
                {i===idx ? <span className="ml-2 opacity-70">•</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {typeof document !== 'undefined' ? createPortal(
        <audio
          ref={audioRef}
          src={cur.src}
          controls={false}
          className="media-dock-audio"
          data-audio-player="1"
          loop
          preload="auto"
          playsInline
          muted={false}
          autoPlay={false}
          onError={() => {
            const a = audioRef.current; if (!a) return;
            if (DEBUG_MEDIA) { dwarn('audio tag onError'); dumpAudio(a, 'audio:onError'); }
            a.removeAttribute("src"); a.load(); setPlaying(false);
          }}
          style={{ position:'fixed', width:0, height:0, opacity:0, pointerEvents:'none', left:0, top:0 }}
        />,
        document.body
      ) : null}

      {/* SFX: reuse an existing asset to avoid 404; you can provide distinct files in /public/ui */}
      <audio ref={uiClickRef}  src="/audio/click.mp3" preload="auto" />
      <audio ref={detentRef}   src="/audio/warp.mp3" preload="auto" />

      <style jsx>{`
        /* Waveform visualization container */
        .waveform-container{
          position: absolute;
          bottom: -4px;
          right: 4px;
          width: 22vw;
          height: 20vw;
          min-width: 110px;
          min-height: 90px;
          max-width: 140px;
          max-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.3);
          border-radius: 16px;
          border: 1px solid ${currentElementColor}40;
          backdrop-filter: blur(8px);
          overflow: hidden;
        }
        
        .waveform {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Section markers */
        .section-markers { position: absolute; inset: 0; pointer-events: none; }
        .section-marker {
          position: absolute;
          top: 6px;
          bottom: 6px;
          width: 8px;
          margin-left: -4px; /* center align */
          background: linear-gradient(180deg, #888, #bbb);
          border: 0;
          border-radius: 999px;
          opacity: 0.7;
          box-shadow: 0 0 8px rgba(255,255,255,0.4), 0 0 16px rgba(255,255,255,0.2);
          cursor: pointer;
          pointer-events: auto;
        }
        .section-marker:hover { opacity: 1; transform: translateY(-1px); }
        .section-marker.chorus{ background: linear-gradient(180deg, #FC54AF, #19E3FF); box-shadow: 0 0 8px #FC54AFCC, 0 0 16px #19E3FF88; }
        .section-marker.verse{ background: linear-gradient(180deg, #19E3FF, #38B6FF); box-shadow: 0 0 8px #19E3FF99, 0 0 16px #38B6FF66; }
        .section-marker.bridge{ background: linear-gradient(180deg, #F2EF1D, #FFC800); box-shadow: 0 0 8px #F2EF1DB3, 0 0 16px #FFC8007A; }
        .section-marker.intro{ background: linear-gradient(180deg, #A0AEC0, #E2E8F0); }
        .section-marker.outro{ background: linear-gradient(180deg, #A0AEC0, #718096); }

        .picker{
          max-height: 40vh;
          overflow: auto;
          border-radius: 16px;
          background: rgba(6,182,212,0.05);
          border: 1px solid rgba(25,227,255,0.3);
          margin: 0 2px;
        }
        .picker-list{ display:flex; flex-direction:column; gap:6px; }
        .picker-item{
          display:flex; align-items:center; justify-content:space-between;
          width:100%; text-align:left; padding:8px 10px; border-radius:12px;
          background: rgba(255,255,255,.06);
        }
        .picker-item.active{ outline:1px solid rgba(25,227,255,.4); background: rgba(25,227,255,.1); }
        
        .volume-display{
          font-size: 10px;
          padding: 4px 8px;
          min-width: 60px;
          text-align: center;
        }
        
        /* Sleek integrated controls - matching blue container style */
        .sleek-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 16px;
          border: 1px solid rgba(25,227,255,0.4);
          background: rgba(6,182,212,0.08);
          backdrop-filter: blur(12px);
          box-shadow: 0 0 12px rgba(25,227,255,0.25);
          margin: 0 2px;
        }
        
        .play-pause-btn {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: radial-gradient(circle at 30% 30%, #19E3FF, #0EA8D0);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 
            0 4px 16px rgba(25,227,255,0.3),
            inset 0 1px 0 rgba(255,255,255,0.2);
        }
        
        .play-pause-btn:hover {
          transform: scale(1.05);
          box-shadow: 
            0 6px 20px rgba(25,227,255,0.4),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }
        
        .btn-glow {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(25,227,255,0.4), transparent 70%);
          animation: pulse 2s ease-in-out infinite;
        }
        
        .btn-icon {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .track-controls {
          display: flex;
          gap: 6px;
        }
        
        .track-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: rgba(25,227,255,0.1);
          color: #19E3FF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .track-btn:hover {
          background: rgba(25,227,255,0.2);
          transform: translateY(-1px);
        }
        
        .selector-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          background: rgba(252,84,175,0.1);
          color: #FC54AF;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .selector-btn:hover {
          background: rgba(252,84,175,0.2);
          transform: translateY(-1px);
        }
        
        .volume-control {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 80px;
        }
        
        .volume-bar {
          width: 60px;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        
        .volume-fill {
          height: 100%;
          background: linear-gradient(90deg, #19E3FF, #FC54AF);
          border-radius: 2px;
          transition: width 0.2s ease;
        }
        
        .volume-text {
          font-size: 10px;
          color: rgba(255,255,255,0.7);
          min-width: 28px;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        
        @keyframes cursorPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
        
        .cursor-transition {
          transition: left 0.05s ease-out;
        }
      `}</style>
    </div>
  );
}

/* utils */
 

function getTrackElement(track: Track): Element {
  const slug = track.slug || "";
  const s = slug.toLowerCase();
  // Specific themes first (matching logic from planets.ts)
  if (s.includes("ocean") || s.includes("tide") || s.includes("wave") || s.includes("sea")) return "water";
  if (s.includes("heart") || s.includes("love") || s.includes("friends") || s.includes("somebody-to-love")) return "heart";
  if (s.includes("lightning") || s.includes("lighting") || s.includes("electric") || s.includes("neon") || s.includes("collide") || s.includes("brain") || s.includes("kid") || s.includes("game")) return "lightning";
  if (s.includes("dark") || s.includes("black") || s.includes("alone") || s.includes("midnight")) return "darkness";
  if (s.includes("fire") || s.includes("burn")) return "fire";
  if (s.includes("home") || s.includes("earth") || s.includes("paris") || s.includes("bee")) return "earth";
  if (s.includes("air") || s.includes("sky")) return "air";
  // fallback to water for unknown tracks
  return "water";
}
