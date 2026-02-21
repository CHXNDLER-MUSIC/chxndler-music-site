"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { tracks } from "@/lib/songs-consolidated";
import { playerStore } from "@/store/usePlayerStore";
import { playWithAutoplayFallback } from "@/lib/media-retry";
import { useProfile } from "@/contexts/ProfileContext";

export default function HoloAudioBridge() {
  // If the unified AudioProvider is active, disable this legacy bridge to avoid conflicts
  if (typeof window !== 'undefined' && (window as any).__UNIFIED_AUDIO_ACTIVE) {
    return null;
  }
  // If the old AudioManager is active, disable this legacy bridge to avoid conflicts
  if (typeof window !== 'undefined' && (window as any).__AUDIO_MANAGER_ACTIVE) {
    return null;
  }
  const [storeSnap, setStoreSnap] = React.useState(() => playerStore.getState());
  React.useEffect(() => playerStore.subscribe(() => setStoreSnap(playerStore.getState())), []);
  const { mainId, songs } = storeSnap as any;
  const { profile } = useProfile();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const warpAudioRef = useRef<HTMLAudioElement | null>(null);
  const joinAudioRef = useRef<HTMLAudioElement | null>(null);
  const spaceMusicRef = useRef<HTMLAudioElement | null>(null);
  const welcomeToHeartrverseRef = useRef<HTMLAudioElement | null>(null);
  const welcomeBackRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState(null);

  // Warm audio buffers exactly once after first user gesture.
  const holoWarmedUp = useRef(false);
  useEffect(() => {
    const warmUp = () => {
      if (holoWarmedUp.current) return;
      holoWarmedUp.current = true;
      const refs = [warpAudioRef, joinAudioRef, spaceMusicRef, welcomeToHeartrverseRef, welcomeBackRef];
      let count = 0;
      refs.forEach(ref => {
        try { if (ref.current) { ref.current.load(); count++; } } catch {}
      });
      try {
        if (typeof window !== 'undefined' && (window as any).__DEBUG_AUDIO_WARMUP__) {
          if (process.env.NODE_ENV !== "production") console.debug(`[HoloAudioBridge] warm-up ran once, loaded ${count} audio elements`);
        }
      } catch {}
    };
    const onPointer = () => warmUp();
    const onKey = () => warmUp();
    window.addEventListener('pointerdown', onPointer, { once: true });
    window.addEventListener('keydown', onKey, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Find the current track from player store songs and map to tracks array
  useEffect(() => {
    
    if (!mainId || !songs.length) return;
    
    // Find the holo song from player store
    const holoSong = songs.find(s => s.id === mainId);
    
    if (!holoSong) {
      if (process.env.NODE_ENV !== "production") console.warn('🎵 HoloAudioBridge: No holo song found for mainId:', mainId);
      return;
    }

    // Map back to the original track using the slug/ID
    if (process.env.NODE_ENV !== "production") console.log('🎵 HoloAudioBridge: Looking for track with slug:', holoSong.id);
    if (process.env.NODE_ENV !== "production") console.log('🎵 HoloAudioBridge: Available track slugs:', tracks.map(t => `${t.slug}(${t.title})`).slice(0, 5), '...');
    
    const track = tracks.find(t => t.slug === holoSong.id);
    
    if (!track) {
      console.error('🎵 HoloAudioBridge: No track found for slug:', holoSong.id);
      console.error('🎵 HoloAudioBridge: Available slugs:', tracks.map(t => t.slug));
      return;
    }
    
    if (process.env.NODE_ENV !== "production") console.log('🎵 HoloAudioBridge: Selected track:', track.title, 'sources:', track.sources?.map(s => s.src) || [track.src]);
    setCurrentTrack(track);
  }, [mainId, songs]);

  // Helper: play an <audio> element and resolve when it ends (with safe timeout fallback)
  function playAndWait(el: HTMLAudioElement | null, fallbackMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const wait = Math.max(200, fallbackMs);
      if (!el) { setTimeout(resolve, wait); return; }
      try { el.currentTime = 0; } catch {}
      let settled = false;
      const finish = () => { if (!settled) { settled = true; cleanup(); resolve(); } };
      const onEnded = () => finish();
      const onError = () => {
        // On error, still wait the fallback duration to preserve timing
        setTimeout(finish, wait);
      };
      const cleanup = () => {
        try { el.removeEventListener('ended', onEnded); } catch {}
        try { el.removeEventListener('error', onError); } catch {}
      };
      try { el.addEventListener('ended', onEnded, { once: true } as any); } catch {}
      try { el.addEventListener('error', onError, { once: true } as any); } catch {}
      try {
        void el.play().catch(() => {
          // Autoplay block or other failure: fall back to timeout
          setTimeout(finish, wait);
        });
      } catch {
        setTimeout(finish, wait);
      }
    });
  }

  // Load+play on track change (when source exists) with warp -> join + song simultaneously
  useEffect(() => {

    const a = audioRef.current; if (!a) return;
    if (!currentTrack) return;

    // Signal that HoloAudioBridge is handling this track - prevents AudioProvider from interfering
    try { (window as any).__HOLO_WARP_IN_PROGRESS = true; } catch {}

    // Immediately hide all planets during warp regardless of selection source
    try { playerStore.getState().setPlanetsVisible(false); } catch {}
    try { playerStore.getState().setPlanetDisplayMode('hidden'); } catch {}

    // Stop current song before loading new one
    try {
      a.pause();
      a.currentTime = 0;
    } catch (e) {
      // Silently handle any errors during stop
    }

    // Don't load the track immediately - wait until after warp effect
    const primarySrc = (currentTrack as any).sources?.[0]?.src || (currentTrack as any).src;
    if (primarySrc) {
      if (process.env.NODE_ENV !== "production") console.log('🎵 HoloAudioBridge: Starting warp sequence for:', currentTrack.title);

      // Visual feedback that warp is happening
      document.body.style.backgroundColor = '#FF0000';
      const clearFlash = () => { document.body.style.backgroundColor = ''; };
      setTimeout(clearFlash, 500);

      // Sequence guard to cancel if track changes again
      let cancelled = false;
      const cancel = () => {
        cancelled = true;
        try { (window as any).__HOLO_WARP_IN_PROGRESS = false; } catch {}
      };

      // Chain: warp sfx -> THEN play join-alien + song SIMULTANEOUSLY
      const run = async () => {
        try {
          // Stop any conflicting audio AFTER starting warp (not before)
          // This ensures we only stop audio once we're committed to the new track
          try {
            // Stop our background audio tracks
            [spaceMusicRef, welcomeToHeartrverseRef, welcomeBackRef].forEach(ref => {
              const el = ref.current;
              if (el && !el.paused) {
                el.pause();
                el.currentTime = 0;
              }
            });
          } catch (e) {
            // Silently handle any errors during audio stop
          }

          // Play warp SFX and wait (fallback ~1.6s if needed)
          if (process.env.NODE_ENV !== "production") console.log('🎵 HoloAudioBridge: Playing warp effect...');
          const warpEl = warpAudioRef.current; if (warpEl) warpEl.volume = 0.7;
          await playAndWait(warpAudioRef.current, 1600);
          if (cancelled) return;

          // NOW load the track source while preparing for simultaneous playback
          const trackSrc = (currentTrack as any).sources?.[0]?.src || (currentTrack as any).src;
          if (!trackSrc) {
            console.error('🎵 HoloAudioBridge: No audio source available for track:', currentTrack.title);
            return;
          }

          if (process.env.NODE_ENV !== "production") console.log('🎵 HoloAudioBridge: Pre-loading track:', trackSrc);

          // Disable browser media session before playing to prevent title overlays
          if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = null;
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
            navigator.mediaSession.setActionHandler('previoustrack', null);
            navigator.mediaSession.setActionHandler('nexttrack', null);
          }

          // Pre-load the track
          a.src = trackSrc;
          a.load();

          // Wait for track to be ready to play
          await new Promise<void>((resolve) => {
            if (a.readyState >= 3) {
              resolve();
              return;
            }
            const onCanPlay = () => {
              a.removeEventListener('canplaythrough', onCanPlay);
              a.removeEventListener('canplay', onCanPlayFallback);
              resolve();
            };
            const onCanPlayFallback = () => {
              a.removeEventListener('canplaythrough', onCanPlay);
              a.removeEventListener('canplay', onCanPlayFallback);
              resolve();
            };
            a.addEventListener('canplaythrough', onCanPlay, { once: true });
            a.addEventListener('canplay', onCanPlayFallback, { once: true });
            // Timeout fallback
            setTimeout(resolve, 2000);
          });

          if (cancelled) return;

          // Play join-alien SFX (blue display) AND song SIMULTANEOUSLY
          if (process.env.NODE_ENV !== "production") console.log('🎵 HoloAudioBridge: Playing join effect + song simultaneously...');
          const joinEl = joinAudioRef.current; if (joinEl) joinEl.volume = 0.9;

          // Reveal planet and start song at the SAME time as join sound
          const onPlaying = () => {
            if (process.env.NODE_ENV !== "production") console.log('🎵 HoloAudioBridge: Song started playing, revealing planet');
            try { playerStore.getState().setPlanetsVisible(true); } catch {}
            try { playerStore.getState().setPlanetDisplayMode('single'); } catch {}
            try { a.removeEventListener('playing', onPlaying); } catch {}
          };
          try { a.addEventListener('playing', onPlaying, { once: true } as any); } catch {}

          // Start both join-alien and track at the same time
          try {
            if (joinEl) {
              joinEl.currentTime = 0;
              joinEl.play().catch(console.error);
            }
            await playWithAutoplayFallback(a, { maxRetries: 3, initialDelay: 500 });
          } catch (err) {
            console.error('🎵 HoloAudioBridge: Play failed after retries', err);
            try { a.removeEventListener('playing', onPlaying); } catch {}
          }

          // Clear the warp flag now that playback has started
          try { (window as any).__HOLO_WARP_IN_PROGRESS = false; } catch {}

        } finally {
          clearFlash();
        }
      };

      void run();

      // Cleanup cancels the sequence if track changes
      return cancel;
    }
  }, [currentTrack]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when focusing inputs
      try {
        const ae = document.activeElement as HTMLElement | null;
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || (ae as any).isContentEditable)) return;
      } catch {}
      // Do not bind space/enter to audio in the 3D panel to avoid affecting planets
      // Only support arrow navigation between planets
      if (e.key === 'ArrowLeft') { 
        e.preventDefault(); 
        const currentIndex = songs.findIndex(s => s.id === mainId);
        if (currentIndex >= 0) {
          const newIndex = (currentIndex - 1 + songs.length) % songs.length;
          playerStore.getState().setMain(songs[newIndex].id);
        }
      }
      else if (e.key === 'ArrowRight') { 
        e.preventDefault(); 
        const currentIndex = songs.findIndex(s => s.id === mainId);
        if (currentIndex >= 0) {
          const newIndex = (currentIndex + 1) % songs.length;
          playerStore.getState().setMain(songs[newIndex].id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [songs, mainId]);

  return (
    <>
      <audio ref={audioRef} data-holo-audio="1" preload="none" />
      <audio ref={warpAudioRef} src="/audio/warp.mp3" preload="none" style={{ display: 'none' }} />
      <audio ref={joinAudioRef} src="/audio/join-alien.mp3" preload="none" style={{ display: 'none' }} />
      <audio ref={spaceMusicRef} src="/tracks/space-music.mp3" preload="none" style={{ display: 'none' }} />
      <audio ref={welcomeToHeartrverseRef} src="/tracks/welcome-to-the-heartverse.opus" preload="none" style={{ display: 'none' }} />
      <audio ref={welcomeBackRef} src="/tracks/welcome-back.opus" preload="none" style={{ display: 'none' }} />
    </>
  );
}
