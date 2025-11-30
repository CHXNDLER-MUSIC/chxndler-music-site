"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { tracks } from "@/lib/songs-consolidated";
import { playerStore } from "@/store/usePlayerStore";
import { playWithAutoplayFallback } from "@/lib/media-retry";
import { useProfile } from "@/contexts/ProfileContext";

export default function HoloAudioBridge() {
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

  // Find the current track from player store songs and map to tracks array
  useEffect(() => {
    
    if (!mainId || !songs.length) return;
    
    // Find the holo song from player store
    const holoSong = songs.find(s => s.id === mainId);
    
    if (!holoSong) {
      console.warn('🎵 HoloAudioBridge: No holo song found for mainId:', mainId);
      return;
    }

    // Map back to the original track using the slug/ID
    console.log('🎵 HoloAudioBridge: Looking for track with slug:', holoSong.id);
    console.log('🎵 HoloAudioBridge: Available track slugs:', tracks.map(t => `${t.slug}(${t.title})`).slice(0, 5), '...');
    
    const track = tracks.find(t => t.slug === holoSong.id);
    
    if (!track) {
      console.error('🎵 HoloAudioBridge: No track found for slug:', holoSong.id);
      console.error('🎵 HoloAudioBridge: Available slugs:', tracks.map(t => t.slug));
      return;
    }
    
    console.log('🎵 HoloAudioBridge: Selected track:', track.title, 'src:', track.src);
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

  // Load+play on track change (when source exists) with warp -> join -> song sequence
  useEffect(() => {
    
    const a = audioRef.current; if (!a) return;
    if (!currentTrack) return;
    
    // Immediately hide all planets during warp regardless of selection source
    try { playerStore.getState().setPlanetsVisible(false); } catch {}
    try { playerStore.getState().setPlanetDisplayMode('hidden'); } catch {}

    // Stop ALL audio elements first to prevent conflicts (especially the default baby.mp3)
    try {
      const allAudio = document.querySelectorAll('audio');
      allAudio.forEach(audio => {
        if (audio !== a) { // Don't stop our own audio element yet
          audio.pause();
          audio.currentTime = 0;
          // Also clear the src to prevent auto-resume
          if (audio.src) {
            console.log('🎵 HoloAudioBridge: Stopping conflicting audio:', audio.src.slice(-20));
          }
        }
      });
      
      // Specifically stop our background audio tracks
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

    // Stop current song before loading new one
    try {
      a.pause();
      a.currentTime = 0;
    } catch (e) {
      // Silently handle any errors during stop
    }
    
    // Don't load the track immediately - wait until after warp effect
    if (currentTrack.src) {
      console.log('🎵 HoloAudioBridge: Starting warp sequence for:', currentTrack.title);
      
      // Visual feedback that warp is happening
      document.body.style.backgroundColor = '#FF0000';
      const clearFlash = () => { document.body.style.backgroundColor = ''; };
      setTimeout(clearFlash, 500);

      // Sequence guard to cancel if track changes again
      let cancelled = false;
      const cancel = () => { cancelled = true; };

      // Chain: warp sfx -> join-alien sfx -> THEN load and play song
      const run = async () => {
        try {
          // Play warp SFX and wait (fallback ~1.6s if needed)
          console.log('🎵 HoloAudioBridge: Playing warp effect...');
          const warpEl = warpAudioRef.current; if (warpEl) warpEl.volume = 0.7;
          await playAndWait(warpAudioRef.current, 1600);
          if (cancelled) return;

          // Play join-alien SFX and wait (fallback ~0.9s)
          console.log('🎵 HoloAudioBridge: Playing join effect...');
          const joinEl = joinAudioRef.current; if (joinEl) joinEl.volume = 0.9;
          await playAndWait(joinAudioRef.current, 900);
          if (cancelled) return;

          // After blue display/join button sound, play appropriate welcome + space music combination
          const isLoggedIn = profile?.id; // Check if user is logged in
          console.log('🎵 HoloAudioBridge: User logged in status:', !!isLoggedIn);
          
          if (isLoggedIn) {
            // Logged in: play space-music.opus + welcome-back.opus together
            console.log('🎵 HoloAudioBridge: Playing welcome back + space music for logged in user');
            const spaceMusicEl = spaceMusicRef.current;
            const welcomeBackEl = welcomeBackRef.current;
            
            if (spaceMusicEl) {
              spaceMusicEl.volume = 0.5;
              spaceMusicEl.loop = true;
              spaceMusicEl.currentTime = 0;
              spaceMusicEl.play().catch(console.error);
            }
            
            if (welcomeBackEl) {
              welcomeBackEl.volume = 0.7;
              welcomeBackEl.currentTime = 0;
              welcomeBackEl.play().catch(console.error);
            }
          } else {
            // Not logged in: play space-music.opus + welcome-to-the-heartverse.opus together
            console.log('🎵 HoloAudioBridge: Playing welcome to heartverse + space music for guest user');
            const spaceMusicEl = spaceMusicRef.current;
            const welcomeToHeartrverseEl = welcomeToHeartrverseRef.current;
            
            if (spaceMusicEl) {
              spaceMusicEl.volume = 0.5;
              spaceMusicEl.loop = true;
              spaceMusicEl.currentTime = 0;
              spaceMusicEl.play().catch(console.error);
            }
            
            if (welcomeToHeartrverseEl) {
              welcomeToHeartrverseEl.volume = 0.7;
              welcomeToHeartrverseEl.currentTime = 0;
              welcomeToHeartrverseEl.play().catch(console.error);
            }
          }

          // NOW load and play the track after warp effects complete
          if (!currentTrack.src) {
            console.error('🎵 HoloAudioBridge: currentTrack.src is empty/undefined for track:', currentTrack.title);
            return;
          }
          
          console.log('🎵 HoloAudioBridge: Loading track:', currentTrack.src);
          a.src = currentTrack.src;
          a.load();

          // After SFX sequence, start the song with autoplay fallbacks and only
          // reveal the focused planet once playback actually starts
          const onPlaying = () => {
            console.log('🎵 HoloAudioBridge: Song started playing, revealing planet');
            try { playerStore.getState().setPlanetsVisible(true); } catch {}
            try { playerStore.getState().setPlanetDisplayMode('single'); } catch {}
            try { a.removeEventListener('playing', onPlaying); } catch {}
          };
          try { a.addEventListener('playing', onPlaying, { once: true } as any); } catch {}

          try {
            await playWithAutoplayFallback(a, { maxRetries: 3, initialDelay: 500 });
          } catch (err) {
            console.error('🎵 HoloAudioBridge: Play failed after retries', err);
            // If play ultimately fails (autoplay restrictions), do not reveal planets yet
            try { a.removeEventListener('playing', onPlaying); } catch {}
          }
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
      <audio ref={audioRef} data-holo-audio="1" preload="auto" />
      <audio ref={warpAudioRef} src="/audio/warp.mp3" preload="auto" style={{ display: 'none' }} />
      <audio ref={joinAudioRef} src="/audio/join-alien.mp3" preload="auto" style={{ display: 'none' }} />
      <audio ref={spaceMusicRef} src="/tracks/space-music.opus" preload="auto" style={{ display: 'none' }} />
      <audio ref={welcomeToHeartrverseRef} src="/tracks/welcome-to-the-heartverse.opus" preload="auto" style={{ display: 'none' }} />
      <audio ref={welcomeBackRef} src="/tracks/welcome-back.opus" preload="auto" style={{ display: 'none' }} />
    </>
  );
}
