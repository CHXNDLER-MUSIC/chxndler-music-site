"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { tracks } from "@/lib/songs-consolidated";
import { usePlayerStore } from "@/store/usePlayerStore";

export default function HoloAudioBridge() {
  const { mainId, songs } = usePlayerStore((s) => ({ mainId: s.mainId, songs: s.songs }));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const warpAudioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState(null);

  // Find the current track from player store songs and map to tracks array
  useEffect(() => {
    console.log('🎵 HoloAudioBridge: mainId changed', { mainId, songsLength: songs.length });
    if (!mainId || !songs.length) return;
    
    // Find the holo song from player store
    const holoSong = songs.find(s => s.id === mainId);
    console.log('🎵 HoloAudioBridge: Found holo song', holoSong);
    if (!holoSong) {
      console.log('🎵 HoloAudioBridge: Available song IDs:', songs.map(s => s.id));
      return;
    }

    // Map back to the original track using the title
    const track = tracks.find(t => t.title === holoSong.title);
    console.log('🎵 HoloAudioBridge: Found matching track', track);
    if (!track) {
      console.log('🎵 HoloAudioBridge: Available track titles:', tracks.map(t => t.title));
      console.log('🎵 HoloAudioBridge: Looking for title:', holoSong.title);
    }
    if (track) {
      setCurrentTrack(track);
    }
  }, [mainId, songs]);

  // Load+play on track change (when source exists) with warp delay
  useEffect(() => {
    console.log('🎵 HoloAudioBridge: currentTrack changed', currentTrack);
    const a = audioRef.current; if (!a) return;
    if (!currentTrack) return;
    
    // Stop current song before loading new one
    try {
      a.pause();
      a.currentTime = 0;
    } catch (e) {
      // Silently handle any errors during stop
    }
    
    // Also stop all other audio elements to prevent conflicts
    try {
      const allAudio = document.querySelectorAll('audio');
      allAudio.forEach(audio => {
        if (audio !== a) { // Don't stop our own audio element
          audio.pause();
          audio.currentTime = 0;
        }
      });
    } catch (e) {
      // Silently handle any errors during audio stop
    }
    
    a.src = currentTrack.src || "";
    a.load();
    
    if (currentTrack.src) {
      console.log('🎵 HoloAudioBridge: Starting warp delay for', currentTrack.title);
      
      // Visual feedback that warp is happening
      document.body.style.backgroundColor = '#FF0000';
      setTimeout(() => {
        document.body.style.backgroundColor = '';
      }, 500);
      
      // Play warp sound immediately
      const warpAudio = warpAudioRef.current;
      if (warpAudio) {
        warpAudio.currentTime = 0;
        warpAudio.volume = 0.7;
        warpAudio.play().catch((err) => {
          console.log('🎵 HoloAudioBridge: Warp sound failed', err);
        });
      }
      
      // Implement warp delay like MediaPlayer
      const WARP_MS = 1800;
      const warpTimeout = setTimeout(() => {
        console.log('🎵 HoloAudioBridge: Warp delay complete, playing', currentTrack.title);
        a.play().catch((err) => {
          console.error('🎵 HoloAudioBridge: Play failed', err);
        });
      }, WARP_MS);
      
      // Return cleanup function to clear timeout if component unmounts or track changes again
      return () => clearTimeout(warpTimeout);
    }
  }, [currentTrack]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when focusing inputs
      try {
        const ae = document.activeElement as HTMLElement | null;
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || (ae as any).isContentEditable)) return;
      } catch {}
      const a = audioRef.current; if (!a) return;
      if (e.key === ' ') { e.preventDefault(); if (a.paused) a.play().catch(()=>{}); else a.pause(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (a.paused) a.play().catch(()=>{}); else a.pause(); }
      else if (e.key === 'ArrowLeft') { 
        e.preventDefault(); 
        const currentIndex = songs.findIndex(s => s.id === mainId);
        if (currentIndex >= 0) {
          const newIndex = (currentIndex - 1 + songs.length) % songs.length;
          usePlayerStore.getState().setMain(songs[newIndex].id);
        }
      }
      else if (e.key === 'ArrowRight') { 
        e.preventDefault(); 
        const currentIndex = songs.findIndex(s => s.id === mainId);
        if (currentIndex >= 0) {
          const newIndex = (currentIndex + 1) % songs.length;
          usePlayerStore.getState().setMain(songs[newIndex].id);
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
    </>
  );
}
