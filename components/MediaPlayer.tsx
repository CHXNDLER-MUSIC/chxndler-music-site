"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { tracks as ALL, type Track } from "@/lib/songs-consolidated";
import { skyFor, verifyAllTrackSkies } from "@/lib/sky";
import { track as gaTrack } from "@/lib/analytics";
import { DEBUG_MEDIA, dlog, dwarn, dumpAudio } from "@/lib/debug";
import { ELEMENT_COLORS, type Element } from "@/lib/planets";
import { retryMediaPlay, playWithAutoplayFallback } from "@/lib/media-retry";
import { testAudioFile, testAllAudioFiles } from "@/lib/audio-debug";
import { MediaStateMachine, type MediaState } from "@/lib/media-state-machine";
import { audioCoordinator } from "@/lib/audio-coordinator";
import { sfx } from "@/lib/sfx";

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
  // Small positive lead time so UI tracks perceived audio output, not decoded timestamp
  // Tuned conservatively to avoid overshoot on slower devices/browsers
  const CURSOR_LEAD_SEC = 0.12;
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
  const rootRef = useRef<HTMLDivElement|null>(null);
  const isHoveredRef = useRef(false);
  const uiClickRef = useRef<HTMLAudioElement|null>(null);
  const detentRef = useRef<HTMLAudioElement|null>(null);
  const volumeSfxLastRef = useRef<number>(0);
  // Suppress responding to programmatic volume changes during priming/autoplay fallbacks
  const suppressVolumeRef = useRef(false);
  const warpPlayTimerRef = useRef<number|undefined>(undefined);
  const isInitialMountRef = useRef(true);
  const intentionalPlayRef = useRef(false); // Track when play is intentionally triggered
  const [pickerOpen, setPickerOpen] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const lastNonZeroVolumeRef = useRef(1.0);
  const VOLUME_STORAGE_KEY = 'mediaPlayer:volume';
  // Popover visibility for volume controls
  const [showMainVolumePopover, setShowMainVolumePopover] = useState(false);
  const [showWaveformVolumePopover, setShowWaveformVolumePopover] = useState(false);
  const mainVolRef = useRef<HTMLDivElement|null>(null);
  const waveVolRef = useRef<HTMLDivElement|null>(null);
  const mainVolBtnRef = useRef<HTMLButtonElement|null>(null);
  const waveVolBtnRef = useRef<HTMLButtonElement|null>(null);
  const [mainPopoverPos, setMainPopoverPos] = useState<{left:number; top:number} | null>(null);
  const [wavePopoverPos, setWavePopoverPos] = useState<{left:number; top:number} | null>(null);
  // YouTube popout state
  const [showYouTubePopover, setShowYouTubePopover] = useState(false);
  const [showSpotifyPopover, setShowSpotifyPopover] = useState(false);
  const [spEmbedUrl, setSpEmbedUrl] = useState<string | null>(null);
  const [showApplePopover, setShowApplePopover] = useState(false);
  const [amEmbedUrl, setAmEmbedUrl] = useState<string | null>(null);
  const [ytEmbedUrl, setYtEmbedUrl] = useState<string | null>(null);
  const ytBtnRef = useRef<HTMLAnchorElement|null>(null);
  // Lyrics state
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const lyricsCacheRef = useRef<Map<string, string>>(new Map());
  const playHover = () => { try { sfx.play('hover', 0.35); } catch {} };
  // Track homepage vs. song-selected view via playerStore's planet display mode
  const [planetDisplayMode, setPlanetDisplayMode] = useState<'all' | 'single' | 'hidden'>('all');
  useEffect(() => {
    // Lazy-require store to avoid SSR import issues
    try {
      const { playerStore } = require("@/store/usePlayerStore");
      // Initialize local state
      setPlanetDisplayMode(playerStore.getState().planetDisplayMode as any);
      // Subscribe for changes
      const unsub = playerStore.subscribe(() => {
        const next = playerStore.getState().planetDisplayMode as any;
        setPlanetDisplayMode(next);
      });
      return () => { try { unsub && unsub(); } catch {} };
    } catch {
      // If store is unavailable (e.g., during SSR), default to 'all'
    }
  }, []);

  // Load saved volume on mount and apply to audio
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
      if (saved != null) {
        const v = parseFloat(saved);
        if (isFinite(v) && v >= 0 && v <= 1) {
          setVolume(v);
          if (v > 0) lastNonZeroVolumeRef.current = v;
          const a = audioRef.current; if (a) a.volume = v;
        }
      }
    } catch {}
  }, []);

  // Persist volume changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Avoid persisting transient 0 volume set during autoplay fallback/priming
    if (suppressVolumeRef.current) return;
    try { localStorage.setItem(VOLUME_STORAGE_KEY, String(Math.max(0, Math.min(1, volume)))); } catch {}
  }, [volume]);

  // Ensure 3D planet toggles on only once the track actually starts playing (post-warp)
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onPlaying = () => {
      try {
        const { playerStore } = require("@/store/usePlayerStore");
        const st = playerStore.getState();
        // Only switch if a song is selected and we aren't already in single mode
        if (st.mainId && st.planetDisplayMode !== 'single') {
          st.setPlanetDisplayMode('single');
        }
        if (!st.planetsVisible) {
          st.setPlanetsVisible(true);
        }
      } catch {}
    };
    a.addEventListener('playing', onPlaying);
    return () => { try { a.removeEventListener('playing', onPlaying); } catch {} };
  }, []);

  // If planets are hidden (warp sequence), force-pause any main audio to avoid early starts
  useEffect(() => {
    try {
      const { playerStore } = require("@/store/usePlayerStore");
      const stopIfWarping = () => {
        try {
          const st = playerStore.getState();
          if (st && st.planetDisplayMode === 'hidden') {
            const a = audioRef.current; if (!a) return;
            if (!a.paused) a.pause();
          }
        } catch {}
      };
      // Run once in case we're already in hidden mode
      stopIfWarping();
      const unsub = playerStore.subscribe(stopIfWarping);
      return () => { try { unsub && unsub(); } catch {} };
    } catch {}
  }, []);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [animationTime, setAnimationTime] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const seekingRef = useRef(false);
  const seekPositionRef = useRef<number | null>(null); // Track visual position during seeking
  
  // Prefer the live duration from the audio element to avoid UI lag before
  // loadedmetadata updates state. Falls back to state if needed.
  const liveDuration = (() => {
    const a = audioRef.current;
    const d = a && isFinite(a.duration) && a.duration > 0 ? a.duration : duration;
    return isFinite(d) && d > 0 ? d : 0;
  })();
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

  // Close YouTube popout on Escape
  useEffect(() => {
    if (!showYouTubePopover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowYouTubePopover(false);
    };
    window.addEventListener('keydown', onKey);
    return () => { try { window.removeEventListener('keydown', onKey); } catch {} };
  }, [showYouTubePopover]);

  // Close Spotify popout on Escape
  useEffect(() => {
    if (!showSpotifyPopover) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowSpotifyPopover(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSpotifyPopover]);

  // Close Apple popout on Escape
  useEffect(() => {
    if (!showApplePopover) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowApplePopover(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showApplePopover]);

  // Subscribe to state machine changes
  useEffect(() => {
    const unsubscribe = stateMachine.current.onStateChange((state, context) => {
      
      setMediaState(state);
      // Reflect actual audio element state to keep UI icon accurate
      try {
        const a = audioRef.current;
        if (a) {
          setPlaying(!a.paused);
        } else {
          setPlaying(context.isPlaying);
        }
      } catch {
        setPlaying(context.isPlaying);
      }
      
      if (DEBUG_MEDIA) {
        dlog('Media state changed:', { state, context });
      }
    });
    
    return unsubscribe;
  }, []);

  // Close volume popovers on outside click or Escape
  useEffect(() => {
    const onDocDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null;
      const inMain = !!(mainVolRef.current && t && mainVolRef.current.contains(t));
      const inWave = !!(waveVolRef.current && t && waveVolRef.current.contains(t));
      if (!inMain) setShowMainVolumePopover(false);
      if (!inWave) setShowWaveformVolumePopover(false);
      // Close lyrics popover when clicking outside waveform container
      try {
        const wf = document.querySelector('.waveform-container');
        if (wf && t && !wf.contains(t)) setLyricsOpen(false);
      } catch {}
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowMainVolumePopover(false); setShowWaveformVolumePopover(false); }
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown as any, { passive: true } as any);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown as any);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Keep popover positions in sync on resize/scroll
  useEffect(() => {
    const updatePositions = () => {
      if (showMainVolumePopover && mainVolBtnRef.current) {
        const r = mainVolBtnRef.current.getBoundingClientRect();
        setMainPopoverPos({ left: r.left + r.width / 2, top: r.bottom + 8 });
      }
      if (showWaveformVolumePopover && waveVolBtnRef.current) {
        const r = waveVolBtnRef.current.getBoundingClientRect();
        setWavePopoverPos({ left: r.left + r.width / 2, top: r.bottom + 8 });
      }
    };
    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions as any, { capture: true, passive: true } as any);
    return () => {
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions as any, true);
    };
  }, [showMainVolumePopover, showWaveformVolumePopover]);

  // Close lyrics when track changes
  useEffect(() => { setLyricsOpen(false); setLyricsError(null); }, [idx]);

  async function ensureLyricsLoaded(slug: string) {
    if (lyricsCacheRef.current.has(slug)) return;
    setLyricsLoading(true);
    setLyricsError(null);
    try {
      const res = await fetch(`/api/lyrics/${encodeURIComponent(slug)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Lyrics not found (${res.status})`);
      }
      const data = await res.json();
      const content = String(data?.content || '');
      lyricsCacheRef.current.set(slug, content);
    } catch (e: any) {
      setLyricsError(e?.message || 'Failed to load lyrics');
    } finally {
      setLyricsLoading(false);
    }
  }


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
    
    // Always stop current song before swapping source to avoid immediate autoplay of new src
    // Do not reset currentTime here; setting a new src will reset it as needed
    try {
      if (!a.paused) {
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
        
        if (want && current !== want) {
          
          a.setAttribute("src", want);
          // If we swapped the src, load the new one to be safe
          try { a.load(); } catch {}
          if (DEBUG_MEDIA) dlog('playSignal: set src', want);
        }
      } catch {}
      
      // Ensure audio is unmuted before playing; preserve current volume
      try {
        a.muted = false;
        // Do not override user volume here
        
      } catch {}
      
      // Use improved retry logic with autoplay fallback
      
      intentionalPlayRef.current = true; // Mark as intentional play
      // Suppress volumechange handling during autoplay fallback mute/unmute cycle
      suppressVolumeRef.current = true;
      playWithAutoplayFallback(a, {
        maxRetries: 3,
        onRetry: (attempt, error) => {
          
          if (DEBUG_MEDIA) dwarn(`playSignal: retry attempt ${attempt}`, error?.name, error?.message);
        }
      })
        .then(({ muted }) => {
          
          if (DEBUG_MEDIA) dlog('playSignal: play successful', { muted });
          stateMachine.current.send({ type: 'PLAY' });
          gaTrack("play", { slug: cur.slug });
          // Re-enable volume updates and sync UI with current element volume
          suppressVolumeRef.current = false;
          try { setVolume(Math.max(0, Math.min(1, a.volume))); } catch {}
        })
        .catch((error) => {
          console.error('🔴 MediaPlayer: Play failed for', cur?.title, error?.name, error?.message);
          if (DEBUG_MEDIA) dwarn('playSignal: all retries failed', error?.name, error?.message);
          stateMachine.current.send({ type: 'ERROR', payload: { error } });
          suppressVolumeRef.current = false;
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
        try { a2.muted = false; /* preserve volume */ } catch {}
        intentionalPlayRef.current = true; // Mark as intentional play
        a2.play().then(() => { if (DEBUG_MEDIA) dlog('playSignal: fallback first-with-audio played'); setPlaying(true); if (onPlayingChange) onPlayingChange(true); gaTrack("play", { slug: tracks[withAudio].slug }); }).catch((e)=>{ if (DEBUG_MEDIA) dwarn('playSignal: fallback play rejected', e?.name, e?.message); setPlaying(false); });
      }, 0);
    }
  }, [playSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debug function to test audio manually (accessible from browser console)
  useEffect(() => {
    (window as any).testCurrentAudio = () => {
      const a = audioRef.current;
      if (!a) {
        console.error('No audio element found');
        return;
      }
      /* debug removed */ ({
        src: a.src,
        paused: a.paused,
        volume: a.volume,
        muted: a.muted,
        readyState: a.readyState,
        duration: a.duration,
        currentTime: a.currentTime,
        networkState: a.networkState,
        error: a.error
      });
      
      a.play().then(() => {
        
      }).catch(err => {
        dwarn('Manual play failed:', err);
      });
    };
    
    (window as any).testCurrentAudioFile = async () => {
      const a = audioRef.current;
      if (!a || !a.src) {
        console.error('No audio element or src found');
        return;
      }
      
      const result = await testAudioFile(a.src);
      
    };
    
    (window as any).testAllAudioFiles = testAllAudioFiles;
    
    (window as any).debugAudioConflicts = () => {
      
      
      const main = document.querySelector('audio[data-audio-player="1"]') as HTMLAudioElement;
      const ambient = document.querySelector('audio[data-ambient="1"]') as HTMLAudioElement;
      const intro = document.querySelector('audio[data-intro="1"]') as HTMLAudioElement;
      
      dlog('Main audio:', main ? {
        src: main.src,
        paused: main.paused,
        volume: main.volume,
        currentTime: main.currentTime,
        readyState: main.readyState
      } : 'Not found');
      
      dlog('Ambient audio:', ambient ? {
        src: ambient.src,
        paused: ambient.paused,
        volume: ambient.volume,
        currentTime: ambient.currentTime,
        readyState: ambient.readyState
      } : 'Not found');
      
      dlog('Intro audio:', intro ? {
        src: intro.src,
        paused: intro.paused,
        volume: intro.volume,
        currentTime: intro.currentTime,
        readyState: intro.readyState
      } : 'Not found');
    };
    
    return () => { 
      delete (window as any).testCurrentAudio;
      delete (window as any).testCurrentAudioFile;
      delete (window as any).testAllAudioFiles;
      delete (window as any).debugAudioConflicts;
    };
  }, []);

  // External toggle signal from steering wheel: if paused, play current (or first with audio); if playing, pause
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) {
      // Resume from current position without reloading
      if (warpPlayTimerRef.current !== undefined) { clearTimeout(warpPlayTimerRef.current); warpPlayTimerRef.current = undefined; }
      if (cur?.src) {
        // Don't reload - just resume from current position
        try { a.muted = false; /* preserve volume */ } catch {}
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
  
  function playVolumeSfx() {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) as number;
    const last = volumeSfxLastRef.current || 0;
    if (now - last > 130) { volumeSfxLastRef.current = now; try { sfx.play('volume', 0.3); } catch {} }
  }

  function adjustVolume(delta: number) {
    const a = audioRef.current; if (!a) return;
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVolume);
    // Ensure volume is valid before setting on audio element
    if (isFinite(newVolume) && newVolume >= 0 && newVolume <= 1) {
      a.volume = newVolume;
    }
    playVolumeSfx();
  }
  
  function toggle() {
    
    // Cancel any pending auto-play timer from warp sequence to respect user intent
    if (warpPlayTimerRef.current !== undefined) {
      clearTimeout(warpPlayTimerRef.current);
      warpPlayTimerRef.current = undefined;
    }
    const a = audioRef.current; 
    if (!a) {
      console.error('🎵 No audio element found in toggle');
      return;
    }
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
      
      intentionalPlayRef.current = true; // Mark as intentional play
      
      // Ensure audio is unmuted and has proper volume
      a.muted = false;
      // Preserve user-selected volume
      
      // Simple play attempt first, fallback to retry logic if needed
      a.play()
        .then(() => {
          
          stateMachine.current.send({ type: 'PLAY' });
          gaTrack("play", { slug: cur.slug });
          // Play click SFX via WebAudio after successful start (won't steal gesture)
          try { sfx.play('click', 0.5); } catch {}
        })
        .catch((error) => {
          
          // Fallback to retry logic only if simple play fails
          // Suppress volumechange handling while fallback may set volume to 0
          suppressVolumeRef.current = true;
          playWithAutoplayFallback(a, {
            maxRetries: 2,
            onRetry: (attempt, error) => {
              
              if (DEBUG_MEDIA) dwarn(`toggle play retry ${attempt}`, error?.name, error?.message);
            }
          })
            .then(() => {
              
              stateMachine.current.send({ type: 'PLAY' });
              gaTrack("play", { slug: cur.slug });
              try { sfx.play('click', 0.5); } catch {}
              suppressVolumeRef.current = false;
              try { setVolume(Math.max(0, Math.min(1, a.volume))); } catch {}
            })
            .catch((retryError) => {
              console.error('🔴 Toggle: All play attempts failed', retryError);
              if (DEBUG_MEDIA) dwarn('toggle play failed after retries', retryError);
              stateMachine.current.send({ type: 'ERROR', payload: { error: retryError } });
              suppressVolumeRef.current = false;
            });
        });
    }
    else { 
      
      // Also cancel any pending auto-starts when the user explicitly pauses
      if (warpPlayTimerRef.current !== undefined) {
        clearTimeout(warpPlayTimerRef.current);
        warpPlayTimerRef.current = undefined;
      }
      a.pause();
      setPlaying(false); // Ensure immediate UI update
      stateMachine.current.send({ type: 'PAUSE' });
      gaTrack("pause", { slug: cur.slug }); 
      
      // Safe to play UI click on pause (no conflict with main play)
      try { uiClick(); } catch {}
    }
  }

  // Expose a direct, gesture-safe toggle so external HUD buttons can call play/pause
  // within the same user click event. This helps bypass autoplay policy blocks
  // that can occur when triggering play() from async effects.
  useEffect(() => {
    try {
      (window as any).mainPlayerToggle = () => { try { toggle(); } catch {} };
      (window as any).mainPlayerPlay = () => {
        try {
          const a = audioRef.current; if (!a) return;
          if (a.paused) { a.muted = false; intentionalPlayRef.current = true; a.play().catch(()=>{}); }
        } catch {}
      };
      (window as any).mainPlayerPause = () => { try { const a = audioRef.current; if (!a) return; if (!a.paused) a.pause(); } catch {} };
    } catch {}
    return () => {
      try {
        delete (window as any).mainPlayerToggle;
        delete (window as any).mainPlayerPlay;
        delete (window as any).mainPlayerPause;
      } catch {}
    };
  }, []);

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
        // Don't reset currentTime - preserve playback position for resume
      }
    } catch {}
    
    const onPlay = () => {
      // Ignore unlock/priming plays that are muted or effectively silent
      const mutedOrSilent = (() => {
        try { return a.muted || a.volume <= 0.0001; } catch { return false; }
      })();
      if (DEBUG_MEDIA) dlog('audio event: play', { muted: a.muted, volume: a.volume, ignored: mutedOrSilent });

      // Hard gate: if planets are hidden (warp in progress), do not allow music yet
      try {
        const { playerStore } = require("@/store/usePlayerStore");
        const st = playerStore.getState();
        if (st && st.planetDisplayMode === 'hidden') {
          if (DEBUG_MEDIA) dwarn('Play attempted during warp (planetDisplayMode=hidden). Pausing until post-warp.');
          a.pause();
          return;
        }
      } catch {}

      // SAFETY: If this is an unwanted auto-play (no signals triggered AND autoPlayOnIndex is disabled AND not intentionally started), pause immediately
      if (!mutedOrSilent && startSignal === 0 && playSignal === 0 && toggleSignal === 0 && !autoPlayOnIndex && !intentionalPlayRef.current) {
        if (DEBUG_MEDIA) dwarn('Unexpected auto-play detected, pausing audio');
        try {
          a.pause();
          // Don't reset currentTime - preserve position for proper pause/resume
          return;
        } catch {}
      }
      
      // Clear the intentional play flag once the play event fires
      intentionalPlayRef.current = false;
      
      if (mutedOrSilent) return;
      
      
      
      // Use audio coordinator to manage audio conflicts
      audioCoordinator.setActiveSource('main');
      
      setPlaying(true);
    };
    const onPause = () => { 
      
      if (DEBUG_MEDIA) dlog('audio event: pause for', cur?.title);
      
      // Clear main audio as active source when paused
      if (audioCoordinator.getCurrentSource() === 'main') {
        audioCoordinator.setActiveSource(null);
      }
      
      setPlaying(false); 
    };
    const onEnded = () => { 
      if (DEBUG_MEDIA) dlog('audio event: ended'); 
      setPlaying(false);
      
      // Clear main audio as active source when ended
      if (audioCoordinator.getCurrentSource() === 'main') {
        audioCoordinator.setActiveSource(null);
      }
    };
    const onErr = (e: any) => { if (DEBUG_MEDIA) { dwarn('audio event: error', e?.target?.error?.message || e?.target?.error?.code || 'unknown audio error'); dumpAudio(a, 'audio:error'); }};
    const onWaiting = () => { if (DEBUG_MEDIA) dlog('audio event: waiting'); };
    const onStalled = () => { if (DEBUG_MEDIA) dlog('audio event: stalled'); };
    const onVolumeChange = () => { 
      if (suppressVolumeRef.current) return; // ignore programmatic mutes/unmutes
      const vol = Math.max(0, Math.min(1, a.volume)); 
      setVolume(vol);
      if (vol > 0) lastNonZeroVolumeRef.current = vol;
    };
    const onTimeUpdate = () => { 
      // Ignore native timeupdate events while the user is actively seeking
      // to prevent the cursor from "snapping back" mid-drag/click.
      if (seekingRef.current) return;
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
    const onDurationChange = () => { if (isFinite(a.duration) && a.duration > 0) setDuration(a.duration); };
    const onCanPlayThrough = () => { try { onAudioReady && onAudioReady(true); } catch {} };
    const onCanPlay = () => { try { onAudioReady && onAudioReady(true); } catch {} };
    const onSeeked = () => { 
      // When seeking completes, update cursor position and resume normal tracking
      const newTime = a.currentTime;
      setCurrentTime(newTime);
      seekingRef.current = false;
      seekPositionRef.current = null; // clear visual override
      setSeeking(false); // re-enable smooth transitions
      if (DEBUG_MEDIA) dlog('audio event: seeked to', newTime);
    };

    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnded);
    a.addEventListener('error', onErr as any);
    a.addEventListener('waiting', onWaiting as any);
    a.addEventListener('stalled', onStalled as any);
    a.addEventListener('volumechange', onVolumeChange);
    a.addEventListener('timeupdate', onTimeUpdate);
    a.addEventListener('loadedmetadata', onLoadedMetadata);
    a.addEventListener('durationchange', onDurationChange as any);
    a.addEventListener('canplaythrough', onCanPlayThrough as any);
    a.addEventListener('canplay', onCanPlay as any);
    a.addEventListener('seeked', onSeeked);

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
      a.removeEventListener('durationchange', onDurationChange as any);
      a.removeEventListener('canplaythrough', onCanPlayThrough as any);
      a.removeEventListener('canplay', onCanPlay as any);
      a.removeEventListener('seeked', onSeeked);
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
        // Suppress volumechange reactions while briefly muting to prime
        suppressVolumeRef.current = true;
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
                // Restore user volume (saved or last known)
                try {
                  const restore = Math.max(0, Math.min(1, lastNonZeroVolumeRef.current || volume || 1));
                  a.volume = restore;
                  suppressVolumeRef.current = false; // allow next change to propagate
                  setVolume(restore);
                } catch {}
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
              try {
                const restore = Math.max(0, Math.min(1, lastNonZeroVolumeRef.current || volume || 1));
                a.volume = restore;
                suppressVolumeRef.current = false;
                setVolume(restore);
              } catch {}
            } catch {}
          });
      } catch {}
    };
    window.addEventListener('pointerdown', unlock, { once: true } as any);
    window.addEventListener('touchstart', unlock, { once: true, passive: true } as any);
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

  // Local Space/MediaPlayPause handling when interacting with the waveform/player area.
  // Uses capture phase + hover/focus containment to avoid double-triggering with DashboardApp.
  useEffect(() => {
    const onKeyCapture = (e: KeyboardEvent) => {
      const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';
      const isMediaToggle = e.code === 'MediaPlayPause' || e.code === 'Pause' || e.key === 'MediaPlayPause';
      if (!isSpace && !isMediaToggle) return;
      // Ignore when typing
      try {
        const ae = (document.activeElement as HTMLElement | null);
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || (ae as any).isContentEditable)) return;
      } catch {}
      // Only take over when the event target is inside the player UI, or the cursor is hovering it
      const t = e.target as Node | null;
      const inside = !!(rootRef.current && t && rootRef.current.contains(t));
      if (!inside && !isHoveredRef.current) return;
      // Prevent global handlers (e.g., DashboardApp) from also toggling
      e.preventDefault();
      e.stopPropagation();
      try { toggle(); } catch {}
    };
    window.addEventListener('keydown', onKeyCapture, { capture: true } as any);
    return () => window.removeEventListener('keydown', onKeyCapture, { capture: true } as any);
  }, []);

  // Animation loop for waveform and smooth cursor movement
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      setAnimationTime(Date.now());
      // Update current time for smooth cursor movement - only when not manually seeking
      const a = audioRef.current;
      if (a && a.duration > 0 && !seekingRef.current) {
        setCurrentTime(a.currentTime);
      }
      animationId = requestAnimationFrame(animate);
    };
    
    // Always run animation loop for smooth cursor tracking
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

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
    <div
      ref={rootRef}
      className="hud-card console-hud h-full w-full relative"
      style={{ borderRadius: '16px' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => { isHoveredRef.current = true; }}
      onMouseLeave={() => { isHoveredRef.current = false; }}
      aria-label="Media dock"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between gap-3 flex-1">
          <div className="flex-1 min-w-0">
            <div className="text-left">
              <div className="text-sm md:text-base opacity-90 leading-tight truncate">{cur.title}</div>
              <div className="text-xs md:text-sm opacity-60 leading-tight line-clamp-2">{cur.subtitle}</div>
            </div>
          </div>
          
        </div>
        {/* Sleek integrated control bar - moved above waveform */}
        <div className="sleek-controls mt-2">
          {showHUDPlay && (
            <button 
              onClick={(e) => {
                
                toggle();
              }} 
              className={`play-pause-btn ${playing ? 'playing' : ''}`} 
              aria-label={playing ? "Pause" : "Play"}
              onMouseEnter={playHover}
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
                const a = audioRef.current; if (!a || !liveDuration) return;
                const now = a.currentTime;
                const next = chorusTimes.find((t) => t > now + 0.75) ?? chorusTimes[0];
                
                // Set seeking state FIRST to disable transitions
                setSeeking(true);
                seekingRef.current = true;
                
                // Store visual position for immediate cursor update
                seekPositionRef.current = next;
                setCurrentTime(next);
                
                const seekTime = Math.max(0, Math.min(liveDuration - 0.2, next));
                a.currentTime = seekTime;
                
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
          
          <div className="volume-control" ref={mainVolRef}>
            {/* Mute/Unmute button */}
            <div className="volume-button-wrap">
            <button
              ref={mainVolBtnRef}
              className="track-btn volume-btn"
              onClick={() => {
                const a = audioRef.current; if (!a) return;
                uiClick();
                // Only open/close the dropdown; do not change volume on click
                setShowWaveformVolumePopover(false);
                setShowMainVolumePopover(v => {
                  const next = !v;
                  if (next && mainVolBtnRef.current) {
                    const r = mainVolBtnRef.current.getBoundingClientRect();
                    setMainPopoverPos({ left: r.left + r.width / 2, top: r.bottom + 8 });
                  }
                  return next;
                });
              }}
              aria-label="Volume"
              title="Volume"
              onMouseEnter={playHover}
            >
              {/* Hover glow to match play/pause */}
              <div className="btn-glow"></div>
              {volume === 0 ? (
                // Muted icon
                <span className="btn-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                    <path d="M16.5 12l3.5 3.5-1.5 1.5L15 13.5 11.5 17H8l-4-4V11l4-4h3.5l3.5 3.5 3.5-3.5 1.5 1.5L16.5 12zM10 8.5L7.5 11H6v2h1.5L10 15.5V8.5z"/>
                  </svg>
                </span>
              ) : volume < 0.5 ? (
                // Low volume icon
                <span className="btn-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                    <path d="M3 10v4h4l5 5V5L7 10H3zm10.5 2c0-1.77-.77-3.29-2-4.3v8.6c1.23-1.01 2-2.53 2-4.3z"/>
                  </svg>
                </span>
              ) : (
                // High volume icon
                <span className="btn-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                    <path d="M3 10v4h4l5 5V5L7 10H3zm8 2c0 2.21-1.79 4-4 4v-2c1.1 0 2-.9 2-2s-.9-2-2-2V8c2.21 0 4 1.79 4 4zm4.5 0c0-3.04-1.72-5.64-4.25-6.92l-.75 1.86C12.6 8.2 14 9.96 14 12s-1.4 3.8-3.5 4.06l.75 1.86C18.28 17.64 19.5 15.04 19.5 12z"/>
                  </svg>
                </span>
              )}
            </button>

            {null}
            </div>
          </div>

          {/* Lyrics + YouTube + Inline volume moved into controls so waveform sits below */}
          <div className="waveform-volume" role="group" aria-label="Lyrics, YouTube, and Volume" ref={waveVolRef}>
            {((cur as any)?.hasLyrics !== false) ? (
              <Link
                href={`/lyrics/${cur.slug}`}
                className="lyrics-link-waveform"
                title={`Lyrics for ${cur.title}`}
                aria-label={`View lyrics for ${cur.title}`}
                data-song={cur.title}
                data-slug={cur.slug}
                data-id="lyrics"
                onMouseEnter={playHover}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                  <rect x="5" y="5" width="14" height="10" rx="4" ry="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="8" cy="16" r="1.2" fill="currentColor" />
                  <circle cx="6.2" cy="18" r="1.1" fill="currentColor" />
                  <rect x="10" y="8" width="2.4" height="4.4" rx="0.8" ry="0.8" fill="currentColor" />
                  <rect x="13.6" y="8" width="2.4" height="4.4" rx="0.8" ry="0.8" fill="currentColor" />
                </svg>
              </Link>
            ) : (
              <div
                className="lyrics-link-unavailable-waveform"
                title={`Lyrics not available for ${cur.title}`}
                aria-disabled="true"
                data-song={cur.title}
                data-slug={cur.slug}
                data-id="lyrics"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                  <rect x="5" y="5" width="14" height="10" rx="4" ry="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="8" cy="16" r="1.2" fill="currentColor" />
                  <circle cx="6.2" cy="18" r="1.1" fill="currentColor" />
                  <rect x="10" y="8" width="2.4" height="4.4" rx="0.8" ry="0.8" fill="currentColor" />
                  <rect x="13.6" y="8" width="2.4" height="4.4" rx="0.8" ry="0.8" fill="currentColor" />
                </svg>
              </div>
            )}

            {cur.youtube ? (
              <a
                ref={ytBtnRef}
                href={cur.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="youtube-link-waveform"
                title={`Open ${cur.title} on YouTube`}
                aria-label={`Open ${cur.title} on YouTube`}
                data-song={cur.title}
                data-slug={cur.slug}
                data-id="yt"
                onClick={(e) => {
                  // Intercept default navigation to open inline popout player
                  try { e.preventDefault(); } catch {}
                  try { uiClick(); } catch {}
                  // Pause site audio while video plays
                  try { const a = audioRef.current; if (a) { a.pause(); setPlaying(false); } } catch {}
                  // Track analytics
                  try {
                    gaTrack('youtube_clicked', {
                      song_slug: cur.slug,
                      payload: { song_title: cur.title, location: 'waveform_player', href: cur.youtube }
                    });
                  } catch {}
                  // Build embeddable URL
                  const toEmbed = (url: string): string | null => {
                    try {
                      const u = new URL(url);
                      const host = u.hostname.replace(/^www\./, '');
                      if (host === 'youtu.be') {
                        const id = u.pathname.slice(1);
                        if (id) return `https://www.youtube.com/embed/${id}`;
                      }
                      if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
                        if (u.pathname === '/watch') {
                          const id = u.searchParams.get('v');
                          if (id) return `https://www.youtube.com/embed/${id}`;
                        }
                        if (u.pathname.startsWith('/shorts/')) {
                          const id = u.pathname.split('/')[2];
                          if (id) return `https://www.youtube.com/embed/${id}`;
                        }
                        if (u.pathname.startsWith('/embed/')) {
                          return `https://${host}/embed/${u.pathname.split('/')[2]}`;
                        }
                        if (u.pathname.startsWith('/live/')) {
                          const id = u.pathname.split('/')[2];
                          if (id) return `https://www.youtube.com/embed/${id}`;
                        }
                      }
                    } catch {}
                    return null;
                  };
                  const embed = toEmbed(cur.youtube);
                  if (embed) {
                    setYtEmbedUrl(`${embed}?autoplay=1&rel=0`);
                    setShowYouTubePopover(true);
                  } else {
                    // Fallback to opening a new tab if we cannot parse embed URL
                    try { window.open(cur.youtube, '_blank', 'noopener,noreferrer'); } catch {}
                  }
                }}
                onMouseEnter={playHover}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                  <path d="M10 8l6 4-6 4z" fill="currentColor" />
                </svg>
              </a>
            ) : (
              <div 
                className="youtube-link-unavailable-waveform"
                title={`No YouTube link available for ${cur.title}`}
                aria-hidden
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                  <path d="M10 8l6 4-6 4z" fill="currentColor" opacity="0.55" />
                </svg>
              </div>
            )}

            <div className="volume-button-wrap">
              <button
                ref={waveVolBtnRef}
                className="waveform-volume-btn"
                onClick={() => {
                  const a = audioRef.current; if (!a) return; uiClick();
                  setShowMainVolumePopover(false);
                  setShowWaveformVolumePopover(v => {
                    const next = !v;
                    if (next && waveVolBtnRef.current) {
                      const r = waveVolBtnRef.current.getBoundingClientRect();
                      setWavePopoverPos({ left: r.left + r.width / 2, top: r.bottom + 8 });
                    }
                    return next;
                  });
                }}
                aria-haspopup="true"
                aria-expanded={showWaveformVolumePopover}
                aria-label="Volume"
                title="Volume"
                onMouseEnter={playHover}
              >
                <div className="btn-glow"></div>
                <span className="btn-icon">
                  {volume === 0 ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                      <path d="M16.5 12l3.5 3.5-1.5 1.5L15 13.5 11.5 17H8l-4-4V11l4-4h3.5l3.5 3.5 3.5-3.5 1.5 1.5L16.5 12zM10 8.5L7.5 11H6v2h1.5L10 15.5V8.5z"/>
                    </svg>
                  ) : volume < 0.5 ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                      <path d="M3 10v4h4l5 5V5L7 10H3zm10.5 2c0-1.77-.77-3.29-2-4.3v8.6c1.23-1.01 2-2.53 2-4.3z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                      <path d="M3 10v4h4l5 5V5L7 10H3zm8 2c0 2.21-1.79 4-4 4v-2c1.1 0 2-.9 2-2s-.9-2-2-2V8c2.21 0 4 1.79 4 4zm4.5 0c0-3.04-1.72-5.64-4.25-6.92l-.75 1.86C12.6 8.2 14 9.96 14 12s-1.4 3.8-3.5 4.06l.75 1.86C18.28 17.64 19.5 15.04 19.5 12z"/>
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="waveform-wrapper">
          <div className="waveform-container" title={cur.title}>
            <div 
            className="waveform" 
            aria-label="Audio waveform visualization"
            onPointerDown={(e) => {
              const a = audioRef.current;
              const d = liveDuration;
              if (!a || !d) return;
              
              // Helper to compute and apply seek time from a given clientX
              const applySeekFromClientX = (clientX: number) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
                const progress = rect.width > 0 ? (x / rect.width) : 0;
                const newTime = progress * d;
                
                // Set seeking state FIRST to disable transitions
                setSeeking(true); 
                seekingRef.current = true;
                
                // Store the visual position for immediate cursor update
                seekPositionRef.current = newTime;
                
                // Also update state for consistency
                setCurrentTime(newTime);
                
                const seekTime = Math.max(0, Math.min(Math.max(0, d - 0.2), newTime));
                try { a.currentTime = seekTime; } catch {}
                return { progress, newTime };
              };

              // Prevent text selection/scroll jank while dragging
              try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
              e.preventDefault();

              const first = applySeekFromClientX(e.clientX);
              // Start/resume playback on interaction to match previous click behavior
              intentionalPlayRef.current = true;
              a.play().catch(() => {});
              setPlaying(true);
              gaTrack("seek_waveform", { slug: cur.slug, seconds: first.newTime, progress: first.progress });

              const onMove = (ev: PointerEvent) => {
                applySeekFromClientX(ev.clientX);
              };
              const onUp = () => {
                seekingRef.current = false; // allow normal updates again; seeked will also sync
                seekPositionRef.current = null; // clear visual override
                setSeeking(false); // re-enable smooth transitions
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp, { once: true } as any);
            }}
            style={{ cursor: 'pointer' }}
          onMouseEnter={playHover}
          >
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
                
                // Use live audio time for perfect sync (falls back to state); respect seeking override
                const d = liveDuration;
                const aEl = audioRef.current;
                const liveT = (aEl && isFinite(aEl.currentTime)) ? aEl.currentTime : currentTime;
                const baseT = (seekPositionRef.current !== null) ? seekPositionRef.current : liveT;
                const isPaused = !!(aEl ? aEl.paused : !playing);
                // Apply small lead only when playing and not seeking
                const displayT = (!seekingRef.current && !isPaused) ? Math.min(d || Infinity, baseT + CURSOR_LEAD_SEC) : baseT;
                const progress = (d > 0 && isFinite(displayT)) ? Math.max(0, Math.min(1, displayT / d)) : 0;
                
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
                    
                  </>
                );
              })()}
            </svg>
            {/* Section markers (verse/chorus/bridge/intro/outro) */}
            {liveDuration > 0 && sections.length > 0 && (
              <div className="section-markers" aria-hidden>
                {sections.map((s, i) => {
                  const pct = Math.max(0, Math.min(100, (s.time / liveDuration) * 100));
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
                        const a = audioRef.current; if (!a || !liveDuration) return;
                        
                        // Set seeking state FIRST to disable transitions
                        setSeeking(true);
                        seekingRef.current = true;
                        
                        // Store visual position for immediate cursor update
                        seekPositionRef.current = s.time;
                        setCurrentTime(s.time);
                        
                        const seekTime = Math.max(0, Math.min(liveDuration - 0.2, s.time));
                        a.currentTime = seekTime;
                        
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
            
            {/* Lyrics/YouTube/Inline volume moved into controls above */}


            {/* Spotify button positioned in waveform container */}
            {cur.spotify ? (
                <a
                  href={cur.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="spotify-btn-waveform"
                  title="Open on Spotify"
                  aria-label={`Open ${cur.title} on Spotify`}
                  data-song={cur.title}
                  data-slug={cur.slug}
                  data-id="sp"
                  onClick={(e) => {
                    try { e.preventDefault(); } catch {}
                    try { uiClick(); } catch {}
                    // Pause site audio while Spotify embed plays
                    try { const a = audioRef.current; if (a) { a.pause(); setPlaying(false); } } catch {}
                    // Track analytics
                    try {
                      gaTrack('spotify_clicked', {
                        song_slug: cur.slug,
                        payload: { song_title: cur.title, location: 'waveform_player', href: cur.spotify }
                      });
                    } catch {}
                    try {
                      const { toSpotifyEmbed } = require('@/lib/spotify');
                      const embed = toSpotifyEmbed(cur.spotify);
                      if (embed) { setSpEmbedUrl(embed); setShowSpotifyPopover(true); }
                      else { window.open(cur.spotify, '_blank', 'noopener,noreferrer'); }
                    } catch {
                      try { window.open(cur.spotify, '_blank', 'noopener,noreferrer'); } catch {}
                    }
                  }}
                  onMouseEnter={playHover}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </a>
            ) : (
              <div 
                className="spotify-btn-unavailable-waveform"
                title={`No Spotify link available for ${cur.title}`}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" opacity="0.5">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
            )}

            {/* Apple logo button in waveform container */}
            {cur.apple ? (
              <a
                href={cur.apple}
                target="_blank"
                rel="noopener noreferrer"
                className="apple-btn-waveform"
                title="Open on Apple Music"
                aria-label={`Open ${cur.title} on Apple Music`}
                data-song={cur.title}
                data-slug={cur.slug}
                data-id="am"
                onClick={(e) => {
                  try { e.preventDefault(); } catch {}
                  try { uiClick(); } catch {}
                  try { const a = audioRef.current; if (a) { a.pause(); setPlaying(false); } } catch {}
                  try {
                    gaTrack('apple_music_clicked', {
                      song_slug: cur.slug,
                      payload: { song_title: cur.title, location: 'waveform_player', href: cur.apple }
                    });
                  } catch {}
                  try {
                    const { toAppleEmbed } = require('@/lib/apple');
                    const embed = toAppleEmbed(cur.apple);
                    if (embed) { setAmEmbedUrl(embed); setShowApplePopover(true); }
                    else { window.open(cur.apple, '_blank', 'noopener,noreferrer'); }
                  } catch {
                    try { window.open(cur.apple, '_blank', 'noopener,noreferrer'); } catch {}
                  }
                }}
              >
                {/* White beamed music note (Apple-like) */}
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden>
                  <circle cx="9" cy="16.2" r="2.4" />
                  <circle cx="17" cy="14.2" r="2.4" />
                  <rect x="8.2" y="8.0" width="1.6" height="7.6" rx="0.8" />
                  <rect x="16.2" y="6.0" width="1.6" height="8.4" rx="0.8" />
                  <rect x="9.0" y="7.0" width="9.0" height="2.0" rx="1.0" />
                </svg>
              </a>
            ) : (
              <div 
                className="apple-btn-unavailable-waveform"
                title={`No Apple Music link available for ${cur.title}`}
              >
                {/* White beamed music note (disabled) */}
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" opacity={0.5} aria-hidden>
                  <circle cx="9" cy="16.2" r="2.4" />
                  <circle cx="17" cy="14.2" r="2.4" />
                  <rect x="8.2" y="8.0" width="1.6" height="7.6" rx="0.8" />
                  <rect x="16.2" y="6.0" width="1.6" height="8.4" rx="0.8" />
                  <rect x="9.0" y="7.0" width="9.0" height="2.0" rx="1.0" />
                </svg>
              </div>
            )}

            {/* Time cursor with element icon - positioned to match animated circle exactly */}
            <div
              className={`absolute top-0 h-full flex flex-col items-center justify-center pointer-events-none z-10 cursor-transition ${playing ? 'playing' : ''} ${seeking ? 'seeking' : ''}`}
              style={{
                left: `${(() => {
                  // Use ref for immediate visual feedback during seeking; otherwise, read from the live audio element to avoid state lag
                  const aEl = audioRef.current;
                  const liveT = (aEl && isFinite(aEl.currentTime)) ? aEl.currentTime : currentTime;
                  // Nudge cursor slightly ahead to compensate for render/audio output latency while playing
                  const baseT = seekPositionRef.current !== null ? seekPositionRef.current : liveT;
                  const isPaused = !!(aEl ? aEl.paused : !playing);
                  const timeToUse = (!seekingRef.current && !isPaused) ? Math.min(liveDuration || Infinity, baseT + CURSOR_LEAD_SEC) : baseT;
                  const progressPercent = Math.max(0, Math.min(100, (liveDuration > 0 && isFinite(timeToUse) ? (timeToUse / liveDuration) * 100 : 0)));
                  return progressPercent;
                })()}%`,
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
              
              {/* Chxndler cursor icon - positioned exactly at circle center (cy="50" = 50% height) */}
              <img
                src={`/elements/${currentElement}.png`}
                alt={`${cur?.title || 'Current track'} cursor`}
                className="absolute w-[1.8rem] h-[1.8rem] min-w-[1.8rem] min-h-[1.8rem] brightness-150 saturate-125"
                style={{ 
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  filter: currentElement === 'music'
                    ? 'drop-shadow(0 0 10px #FFFFFF) drop-shadow(0 0 24px rgba(255,255,255,0.9)) drop-shadow(0 0 48px rgba(255,255,255,0.6))'
                    : `drop-shadow(0 0 14px ${currentElementColor}) drop-shadow(0 0 32px ${currentElementColor}AA) drop-shadow(0 0 64px ${currentElementColor}55)`,
                  animation: playing ? 'cursorPulse 2s ease-in-out infinite' : 'none'
                }}
                onError={(e) => {
                  const img = (e.target as HTMLImageElement);
                  img.src = '/elements/music.png';
                  // Ensure neon white glow on fallback
                  img.style.filter = 'drop-shadow(0 0 10px #FFFFFF) drop-shadow(0 0 24px rgba(255,255,255,0.9)) drop-shadow(0 0 48px rgba(255,255,255,0.6))';
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
                {(() => {
                  const aEl = audioRef.current;
                  const liveT = (aEl && isFinite(aEl.currentTime)) ? aEl.currentTime : currentTime;
                  const baseT = (seekPositionRef.current ?? liveT);
                  const isPaused = !!(aEl ? aEl.paused : !playing);
                  const t = (!seekingRef.current && !isPaused) ? Math.min(liveDuration || Infinity, baseT + CURSOR_LEAD_SEC) : baseT;
                  return liveDuration > 0 ? Math.floor(((t) / liveDuration) * 100) : 0;
                })()}%
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
      </div>


      {/* Controls moved above waveform; block removed from here */}

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
                  // Focus the selected planet immediately when picking a new song
                  try {
                    const { playerStore } = require("@/store/usePlayerStore");
                    if (selectedTrack?.slug) {
                      playerStore.getState().setMain(selectedTrack.slug, true);
                      playerStore.getState().setPlanetDisplayMode('single');
                      playerStore.getState().setPlanetsVisible(true);
                    }
                  } catch {}
                  
                  // When manually selecting from picker, trigger playback immediately
                  if (wasChanged && selectedTrack?.src) {
                    setTimeout(() => {
                      const a = audioRef.current;
                      if (!a) return;
                      
                      // Ensure the correct source is loaded
                      try {
                        const want = String(selectedTrack.src || "");
                        const current = a.getAttribute("src") || a.src;
                        if (want && current !== want) {
                          a.setAttribute("src", want);
                          try { a.load(); } catch {}
                        }
                      } catch {}
                      
                // Play immediately without waiting for warp delay
                      // If warp is in progress (planets hidden), defer to external sequence (warp->join->song)
                      try {
                        const { playerStore } = require("@/store/usePlayerStore");
                        const st = playerStore.getState();
                        if (st && st.planetDisplayMode === 'hidden') {
                          if (DEBUG_MEDIA) dwarn('Picker play suppressed during warp; external flow will start after join.');
                          return; // do not start now
                        }
                      } catch {}

                      intentionalPlayRef.current = true;
                      // Ensure audio is unmuted and has proper volume
                      a.muted = false;
                      // Simple play attempt first, fallback to retry logic if needed
                      a.play()
                        .then(() => {
                          stateMachine.current.send({ type: 'PLAY' });
                          gaTrack("play", { slug: selectedTrack.slug });
                        })
                        .catch((error) => {
                          // Fallback to retry logic only if simple play fails
                          suppressVolumeRef.current = true;
                          playWithAutoplayFallback(a, {
                            maxRetries: 2,
                            onRetry: (attempt, error) => {
                              /* no-op */
                            }
                          })
                            .then(() => {
                              stateMachine.current.send({ type: 'PLAY' });
                              gaTrack("play", { slug: selectedTrack.slug });
                              suppressVolumeRef.current = false;
                              try { setVolume(Math.max(0, Math.min(1, a.volume))); } catch {}
                            })
                            .catch((retryError) => {
                              console.error('🔴 Picker: All play attempts failed for', selectedTrack.title, retryError);
                              stateMachine.current.send({ type: 'ERROR', payload: { error: retryError } });
                              suppressVolumeRef.current = false;
                            });
                        });
                    }, 100); // Short delay to allow index change to settle
                  }
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
          preload="metadata"
          playsInline
          muted={false}
          autoPlay={false}
          crossOrigin="anonymous"
          onError={(e) => {
            const a = audioRef.current; 
            if (!a) return;
            console.error('🔴 Audio element error:', {
              src: cur.src,
              error: a.error,
              readyState: a.readyState,
              networkState: a.networkState
            });
            if (DEBUG_MEDIA) { 
              dwarn('audio tag onError', { 
                src: cur.src, 
                error: a.error?.message || a.error?.code,
                readyState: a.readyState,
                networkState: a.networkState
              }); 
              dumpAudio(a, 'audio:onError'); 
            }
            // Don't immediately clear src - let retry logic handle it
            setPlaying(false);
          }}
          onLoadStart={() => {
            
          }}
          onCanPlay={() => {
            
          }}
          onCanPlayThrough={() => {
            
          }}
          style={{ position:'fixed', width:0, height:0, opacity:0, pointerEvents:'none', left:0, top:0 }}
        />,
        document.body
      ) : null}

      {/* YouTube Popout */}
      {typeof document !== 'undefined' && showYouTubePopover && ytEmbedUrl ? createPortal(
        <div
          className="yt-overlay"
          role="dialog"
          aria-label={`Play ${cur.title} on YouTube`}
          onClick={() => setShowYouTubePopover(false)}
        >
          <div className="yt-popover" onClick={(e) => e.stopPropagation()}>
            <button
              className="yt-close"
              aria-label="Close YouTube player"
              title="Close"
              onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
              onClick={() => setShowYouTubePopover(false)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z" />
              </svg>
            </button>
            <div className="yt-embed-wrap">
              <iframe
                src={ytEmbedUrl}
                title={`${cur.title} — YouTube`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Spotify popout overlay */}
      {typeof document !== 'undefined' && showSpotifyPopover && spEmbedUrl ? createPortal(
        <div className="sp-overlay" role="dialog" aria-label="Spotify player" onClick={() => setShowSpotifyPopover(false)}>
          <div className="sp-popover" onClick={(e) => { e.stopPropagation(); }}>
            <button
              aria-label="Close"
              title="Close"
              className="yt-close"
              onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
              onClick={() => setShowSpotifyPopover(false)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                <path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z" />
              </svg>
            </button>
            <iframe
              src={spEmbedUrl}
              title="Spotify player"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              width="100%"
              height={spEmbedUrl ? (() => { try { return require('@/lib/spotify').spotifyEmbedHeight(spEmbedUrl); } catch { return undefined; } })() : undefined}
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        </div>,
        document.body
      ) : null}

      {typeof document !== 'undefined' && showApplePopover && amEmbedUrl ? createPortal(
        <div className="am-overlay" role="dialog" aria-label="Apple Music player" onClick={() => setShowApplePopover(false)}>
          <div className="am-popover" onClick={(e) => { e.stopPropagation(); }}>
            <button
              aria-label="Close"
              title="Close"
              className="am-close"
              onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
              onClick={() => setShowApplePopover(false)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                <path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z" />
              </svg>
            </button>
            <iframe
              src={amEmbedUrl}
              title="Apple Music player"
              allow="autoplay *; encrypted-media *; clipboard-write"
              loading="lazy"
              width="100%"
              height={(() => { try { return require('@/lib/apple').appleEmbedHeight(amEmbedUrl); } catch { return 360; } })()}
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        </div>,
        document.body
      ) : null}


      {/* SFX: reuse an existing asset to avoid 404; you can provide distinct files in /public/ui */}
      <audio ref={uiClickRef}  src="/audio/click.mp3" preload="auto" />
      <audio ref={detentRef}   src="/audio/warp.mp3" preload="auto" />

      {typeof document !== 'undefined' && showWaveformVolumePopover && wavePopoverPos ? createPortal(
        <div className="volume-popover" role="dialog" aria-label="Adjust volume" style={{ position:'fixed', left: wavePopoverPos.left, top: wavePopoverPos.top, transform:'translateX(-50%)', zIndex: 2147483647 }}>
          <div
            className="volume-slider-vertical"
            role="slider"
            aria-orientation="vertical"
            aria-label="Volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); adjustVolume(0.05); }
              else if (e.key === 'ArrowDown') { e.preventDefault(); adjustVolume(-0.05); }
            }}
            onPointerDown={(e) => {
              const a = audioRef.current; if (!a) return;
              const el = e.currentTarget as HTMLDivElement;
              const applyFromClientY = (clientY: number) => {
                const rect = el.getBoundingClientRect();
                const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
                const pct = rect.height > 0 ? (1 - (y / rect.height)) : 0;
                const newVol = Math.max(0, Math.min(1, pct));
                a.volume = newVol; setVolume(newVol);
                if (newVol > 0) lastNonZeroVolumeRef.current = newVol;
                playVolumeSfx();
              };
              try { el.setPointerCapture?.(e.pointerId); } catch {}
              e.preventDefault(); playVolumeSfx();
              applyFromClientY(e.clientY);
              const onMove = (ev: PointerEvent) => applyFromClientY(ev.clientY);
              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp, { once: true } as any);
            }}
          >
            <div className="volume-slider-track" />
            <div className="volume-slider-level" style={{ height: `${volume * 100}%` }} />
            <div className="volume-slider-thumb" style={{ bottom: `calc(${volume * 100}% - 7px)` }} />
          </div>
          <div className="volume-percent">{Math.round(volume * 100)}%</div>
        </div>,
        document.body
      ) : null}

      {typeof document !== 'undefined' && showMainVolumePopover && mainPopoverPos ? createPortal(
        <div className="volume-popover" role="dialog" aria-label="Adjust volume" style={{ position:'fixed', left: mainPopoverPos.left, top: mainPopoverPos.top, transform:'translateX(-50%)', zIndex: 2147483647 }}>
          <div
            className="volume-slider-vertical"
            role="slider"
            aria-orientation="vertical"
            aria-label="Volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); adjustVolume(0.05); }
              else if (e.key === 'ArrowDown') { e.preventDefault(); adjustVolume(-0.05); }
            }}
            onPointerDown={(e) => {
              const a = audioRef.current; if (!a) return;
              const el = e.currentTarget as HTMLDivElement;
              const applyFromClientY = (clientY: number) => {
                const rect = el.getBoundingClientRect();
                const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
                const pct = rect.height > 0 ? (1 - (y / rect.height)) : 0;
                const newVol = Math.max(0, Math.min(1, pct));
                a.volume = newVol; setVolume(newVol);
                if (newVol > 0) lastNonZeroVolumeRef.current = newVol;
                playVolumeSfx();
              };
              try { el.setPointerCapture?.(e.pointerId); } catch {}
              e.preventDefault(); playVolumeSfx();
              applyFromClientY(e.clientY);
              const onMove = (ev: PointerEvent) => applyFromClientY(ev.clientY);
              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp, { once: true } as any);
            }}
          >
            <div className="volume-slider-track" />
            <div className="volume-slider-level" style={{ height: `${volume * 100}%` }} />
            <div className="volume-slider-thumb" style={{ bottom: `calc(${volume * 100}% - 7px)` }} />
          </div>
          <div className="volume-percent">{Math.round(volume * 100)}%</div>
        </div>,
        document.body
      ) : null}

      <style jsx>{`
        /* Waveform wrapper to contain both waveform and spotify button */
        .waveform-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center; /* center under controls */
          margin-top: 6px;
          width: 100%;
        }
        
        /* Waveform visualization container - slightly wider to accommodate both buttons */
        .waveform-container{
          position: relative; /* make positioned context for absolute children */
          width: 28vw;
          height: 22vw;
          min-width: 140px;
          min-height: 98px;
          max-width: 170px;
          max-height: 130px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.3);
          border-radius: 16px;
          border: 1px solid ${currentElementColor}40;
          backdrop-filter: blur(8px);
          overflow: visible;
          /* Avoid bottom clipping of the blue waveform stroke by not reducing the content height */
          /* If interior spacing is needed later, prefer symmetric padding and scale the svg accordingly */
        }
        
        /* Spotify button - positioned next to play/pause in controls */
        .spotify-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: linear-gradient(135deg, #1DB954, #1ed760);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(29, 185, 84, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.3);
          flex-shrink: 0;
        }
        
        .spotify-btn:hover {
          box-shadow: 0 4px 12px rgba(29, 185, 84, 0.6);
          background: linear-gradient(135deg, #1ed760, #22e55c);
        }
        
        .spotify-btn:active {
          transform: translateY(0);
        }
        
        .spotify-btn-debug {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(255, 0, 0, 0.3);
          color: red;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 8px;
          border: 2px solid red;
          flex-shrink: 0;
        }
        
        /* Spotify button positioned LEFT of center in waveform container */
        .spotify-btn-waveform {
          position: absolute;
          top: 50%;
          left: 45%;
          transform: translate(-50%, -50%);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1DB954, #1ed760);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(29, 185, 84, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.4);
          z-index: 100;
          backdrop-filter: blur(8px);
        }
        
        .spotify-btn-waveform:hover {
          transform: translate(-50%, -50%);
          box-shadow: 0 6px 20px rgba(29, 185, 84, 0.8);
          background: linear-gradient(135deg, #1ed760, #22e55c);
        }
        
        .spotify-btn-waveform:active {
          transform: translate(-50%, -50%);
        }
        
        .spotify-btn-unavailable-waveform {
          position: absolute;
          top: 50%;
          left: 45%;
          transform: translate(-50%, -50%);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(128, 128, 128, 0.3);
          color: #888;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          border: 1px solid rgba(128, 128, 128, 0.5);
          z-index: 90;
          backdrop-filter: blur(8px);
          cursor: not-allowed;
        }
        
        /* Apple Music note icon (right of center) */
        .apple-btn-waveform {
          position: absolute;
          top: 50%;
          left: 55%;
          transform: translate(-50%, -50%);
          width: 28px;
          height: 28px;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: transform 0.2s ease, opacity 0.2s ease;
          z-index: 100;
          background: transparent;
          border: none;
        }
        .apple-btn-waveform:hover { transform: translate(-50%, -50%); opacity: 0.95; }
        .apple-btn-waveform:active { transform: translate(-50%, -50%); }
        .apple-btn-unavailable-waveform {
          position: absolute;
          top: 50%;
          left: 55%;
          transform: translate(-50%, -50%);
          width: 28px;
          height: 28px;
          color: rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          z-index: 90;
          background: transparent;
          border: none;
          cursor: not-allowed;
        }

        /* Lyrics link next to volume control */
        .lyrics-link-waveform {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.5);
          background: radial-gradient(circle at 30% 30%, #FFF76A, #F2EF1D);
          color: #000;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 0.25s ease;
          box-shadow: 0 4px 16px rgba(242,239,29,0.55);
          flex: 0 0 auto;
        }
        .waveform-volume .youtube-link-waveform,
        .waveform-volume .youtube-link-unavailable-waveform {
          flex: 0 0 auto; /* prevent shrinking to zero if space is tight */
        }
        .lyrics-link-waveform:hover { box-shadow: 0 6px 22px rgba(242,239,29,0.9); }
        .lyrics-link-waveform:active { }

        .lyrics-link-unavailable-waveform {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(128,128,128,0.5);
          background: rgba(128,128,128,0.35);
          color: rgba(255,255,255,0.85);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 200;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* YouTube link (to the right of Lyrics) */
        .youtube-link-waveform {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          /* Thin rim to match Apple/Store */
          border: 1px solid rgba(255, 255, 255, 0.4);
          background: radial-gradient(circle at 30% 30%, #FF6B6B, #FF0000);
          color: #FFFFFF;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          text-decoration: none;
          transition: all 0.25s ease;
          /* Match glow strength with other rimmed buttons */
          box-shadow: 0 4px 16px rgba(255,59,48,0.45);
          position: relative;
          z-index: 600; /* sit above waveform/svg and streaming buttons */
        }
        .youtube-link-waveform:hover { 
          box-shadow: 0 6px 20px rgba(255,59,48,0.6);
        }
        .youtube-link-waveform:active { }
        /* Increase icon size so the outer rim appears thinner */
        .youtube-link-waveform svg { width: 24px; height: 24px; }
        .youtube-link-unavailable-waveform {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.25);
          background: rgba(128,128,128,0.35);
          color: rgba(255,255,255,0.85);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 200;
          cursor: not-allowed;
        }
        .youtube-link-unavailable-waveform svg { width: 24px; height: 24px; }
        
        /* Inline controls (lyrics/youtube/volume) now sit in the controls row */
        .waveform-volume {
          position: static;
          transform: none;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          white-space: nowrap;
          gap: 8px;
          padding: 0;
          border-radius: 10px;
          border: none;
          background: transparent;
          backdrop-filter: none;
          box-shadow: none;
          z-index: auto;
        }
        .waveform-volume-btn {
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.4);
          background: radial-gradient(circle at 30% 30%, #19E3FF, #0EA8D0);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 16px rgba(25,227,255,0.6);
        }
        /* Removed outer rim on waveform volume button to match Spotify */
        .waveform-volume-btn:hover { box-shadow: 0 6px 22px rgba(25,227,255,0.75); }
        .waveform-volume-btn:hover .btn-glow { opacity: 1; animation: pulse 2s ease-in-out infinite; }
        .waveform-volume-btn:active { }
        /* Removed legacy horizontal waveform volume bar styles */
        
        /* FULLSCREEN SPOTIFY BUTTON - CENTER OF ENTIRE SCREEN */
        .spotify-btn-fullscreen {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 80px;
          background: linear-gradient(135deg, #1DB954, #1ed760);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(29, 185, 84, 0.8);
          border: 4px solid rgba(255, 255, 255, 0.3);
          z-index: 9999;
          backdrop-filter: blur(8px);
          transition: all 0.3s ease;
        }
        
        .spotify-btn-fullscreen:hover {
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow: 0 12px 40px rgba(29, 185, 84, 1);
        }
        
        .spotify-btn-unavailable-fullscreen {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 220px;
          height: 80px;
          background: rgba(128, 128, 128, 0.3);
          color: #888;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          border: 4px solid rgba(128, 128, 128, 0.5);
          z-index: 9999;
          backdrop-filter: blur(8px);
          cursor: not-allowed;
        }

        
        
        .waveform {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none; /* allow precise pointer scrubbing without scrolling */
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
        .section-marker:hover { opacity: 1; }
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
          justify-content: center; /* center row so waveform can sit directly under */
          flex-wrap: wrap; /* allow wrapping on smaller screens */
          gap: 12px;
          padding: 8px 12px;
          border-radius: 16px;
          border: 1px solid rgba(25,227,255,0.4);
          background: rgba(6,182,212,0.08);
          backdrop-filter: blur(12px);
          box-shadow: 0 0 12px rgba(25,227,255,0.25);
          margin: 0 2px;
          transform: translateY(2px); /* nudge buttons slightly lower */
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
          transition: box-shadow 0.3s ease, background 0.3s ease;
          box-shadow: 
            0 4px 16px rgba(25,227,255,0.3),
            inset 0 1px 0 rgba(255,255,255,0.2);
        }
        
        .play-pause-btn:hover {
          box-shadow: 
            0 6px 20px rgba(25,227,255,0.4),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }
        
        .btn-glow {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(25,227,255,0.4), transparent 70%);
          opacity: 0; /* Only glow when playing */
          animation: none;
        }
        .play-pause-btn.playing .btn-glow { opacity: 1; animation: pulse 2s ease-in-out infinite; }
        
        .btn-icon {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .track-controls {
          display: flex;
          gap: 4px;
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
          transition: background 0.2s ease, box-shadow 0.2s ease;
        }
        
        .track-btn:hover {
          background: rgba(25,227,255,0.2);
        }

        /* Glowing volume button (main controls) similar to Spotify button */
        .volume-btn {
          position: relative;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.4);
          background: radial-gradient(circle at 30% 30%, #19E3FF, #0EA8D0);
          color: white;
          box-shadow: 0 4px 16px rgba(25,227,255,0.6);
        }
        .volume-btn:hover { box-shadow: 0 6px 20px rgba(25,227,255,0.8); }
        .volume-btn:hover .btn-glow { opacity: 1; animation: pulse 2s ease-in-out infinite; }
        .volume-btn:active { }
        
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
          transition: background 0.2s ease, box-shadow 0.2s ease;
        }
        
        .selector-btn:hover {
          background: rgba(252,84,175,0.2);
        }
        
        .volume-control {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 80px;
        }
        
        /* Removed legacy horizontal main volume bar styles */
        
        .volume-text {
          font-size: 10px;
          color: rgba(255,255,255,0.7);
          min-width: 28px;
        }

        /* Vertical volume popover (opens to the left of the button) */
        .volume-control { position: relative; }
        .waveform-volume { position: absolute; }
        .volume-popover {
          position: absolute;
          top: 0;
          transform: none;
          padding: 6px 4px; /* even thinner sides for minimal black padding */
          border-radius: 12px;
          background: rgba(3, 10, 20, 0.86);
          border: 1px solid rgba(25,227,255,0.5);
          box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 0 22px rgba(25,227,255,0.55);
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          z-index: 1000;
        }
        .volume-popover.dropdown { top: calc(100% + 8px); left: 50%; transform: translateX(-50%); }
        .volume-percent { font-size: 11px; color: #19E3FF; text-shadow: 0 0 10px rgba(25,227,255,0.7); text-align: center; }
        .volume-slider-vertical {
          position: relative;
          width: 10px;
          height: 120px;
          cursor: pointer;
          touch-action: none;
        }
        .volume-slider-track {
          position: absolute; left: 4px; right: 4px; top: 0; bottom: 0;
          border-radius: 6px;
          background: rgba(255,255,255,0.15);
          box-shadow: inset 0 0 8px rgba(25,227,255,0.25);
        }
        .volume-slider-level {
          position: absolute; left: 0; right: 0; bottom: 0;
          margin: 0 0; /* align with track */
          background: #19E3FF;
          border-radius: 0 0 6px 6px;
          box-shadow: 0 0 12px rgba(25,227,255,0.65), 0 0 18px rgba(25,227,255,0.45);
        }
        .volume-slider-thumb {
          position: absolute; left: 50%; transform: translateX(-50%);
          width: 14px; height: 14px; border-radius: 50%;
          background: #19E3FF;
          border: 2px solid #19E3FF;
          box-shadow: 0 0 14px rgba(25,227,255,0.9);
          pointer-events: none;
        }
        .volume-button-wrap { position: relative; display: inline-flex; }
        
        /* YouTube popout overlay (no background blur/dim) */
        .yt-overlay {
          position: fixed;
          inset: 0;
          background: transparent;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
          animation: ytFadeIn 150ms ease-out;
        }
        .yt-popover {
          position: relative;
          width: min(84vw, 660px);
          aspect-ratio: 16 / 9;
          background: #000;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.25);
          box-shadow: 0 10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.08);
          overflow: hidden;
          animation: ytZoomIn 160ms ease-out;
          /* Lower on the screen (moved down slightly) */
          margin-top: -44px;
        }
        @media (max-width: 768px) { .yt-popover { margin-top: -18px; } }
        .yt-embed-wrap { position: absolute; inset: 0; }
        .yt-embed-wrap iframe { width: 100%; height: 100%; border: 0; }
        .yt-close {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.4);
          background: rgba(0,0,0,0.45);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 0 16px rgba(255,255,255,0.25);
          transition: background 0.15s ease, box-shadow 0.15s ease;
        }
        .yt-close:hover { background: rgba(0,0,0,0.6); box-shadow: 0 0 24px rgba(255,255,255,0.55); }
        .yt-close:active { }

        /* Spotify popout overlay */
        .sp-overlay {
          position: fixed;
          inset: 0;
          /* No dim or blur for Spotify popout */
          background: transparent !important;
          backdrop-filter: none !important;
          filter: none !important;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
        }
        .sp-popover {
          position: relative;
          width: min(88vw, 420px);
          /* Make container transparent to avoid visible gaps as black */
          background: transparent;
          border-radius: 16px;
          border: 1px solid rgba(29,185,84,0.55);
          /* Remove shadow to avoid any perceived dimming */
          box-shadow: none;
          overflow: hidden;
          /* Slightly higher on the screen */
          margin-top: 180px;
        }
        @media (max-width: 768px) { .sp-popover { margin-top: 120px; } }

        /* Apple Music popout overlay */
        .am-overlay {
          position: fixed;
          inset: 0;
          /* No dim or blur for Apple popout */
          background: transparent;
          backdrop-filter: none;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
        }
        .am-popover {
          position: relative;
          width: min(88vw, 420px);
          background: transparent; /* remove black fill */
          border-radius: 16px;
          border: 1px solid rgba(255,59,48,0.55);
          box-shadow: 0 0 30px rgba(255,59,48,0.25); /* remove heavy dark drop shadow */
          overflow: hidden;
          /* Lower on the screen */
          margin-top: 380px;
        }
        @media (max-width: 768px) { .am-popover { margin-top: 220px; } }
        .am-close {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.4);
          background: rgba(0,0,0,0.45);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 0 16px rgba(255,255,255,0.25);
          transition: background 0.15s ease, box-shadow 0.15s ease;
        }
        .am-close:hover { background: rgba(0,0,0,0.6); box-shadow: 0 0 24px rgba(255,255,255,0.55); }
        .am-close:active { }

        @keyframes ytFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ytZoomIn { from { transform: scale(0.96); opacity: 0.8 } to { transform: scale(1); opacity: 1 } }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        
        @keyframes cursorPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
        
        .cursor-transition {
          transition: none; /* Eliminate smoothing to avoid visual lag */
        }
        .cursor-transition.playing { transition: none; }
        .cursor-transition.seeking {
          transition: none; /* Instant movement while seeking */
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
