"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

// Track info for audio and visual display
export type TrackInfo = {
  id: string;
  title: string;
  artist?: string;
  coverUrl?: string;
  skyTexture?: string;
  oneLiner?: string;
};

// Audio source files  
export const TRACKS = {
  BABY: { mp3: "/tracks/baby.mp3", opus: "/tracks/baby.opus" },
  BE_MY_BEE: { mp3: "/tracks/be-my-bee.mp3", opus: "/tracks/be-my-bee.opus" },
  BRAIN_FREEZE: { mp3: "/tracks/brain-freeze.mp3", opus: "/tracks/brain-freeze.opus" },
  COLLIDE: { mp3: "/tracks/collide.mp3", opus: "/tracks/collide.opus" },
  COLORS_HOME: { mp3: "/tracks/COLORS OF OUR HOME.mp3", opus: "/tracks/COLORS-OF-OUR-HOME.opus" },
  COLORS_HOME_ACOUSTIC: { mp3: "/tracks/COLORS OF OUR HOME (ACOUSTIC).mp3", opus: "/tracks/COLORS-OF-OUR-HOME-_ACOUSTIC_.opus" },
  COLORS_HOME_BLUMA: { mp3: "/tracks/COLORS OF OUR HOME (BLUMA Game Soundtrack).mp3", opus: "/tracks/COLORS-OF-OUR-HOME-_BLUMA-Game-Soundtrack_.opus" },
  GAME_BOY_HEART: { mp3: "/tracks/game-boy-heart.mp3", opus: "/tracks/game-boy-heart.opus" },
  HOUSE_PARTY: { mp3: "/tracks/house-party.mp3", opus: "/tracks/house-party.opus" },
  KID_FOREVER: { mp3: "/tracks/kid-forever.mp3", opus: "/tracks/kid-forever.opus" },
  OCEAN_GIRL: { mp3: "/tracks/ocean-girl.mp3", opus: "/tracks/ocean-girl.opus" },
  OCEAN_GIRL_ACOUSTIC: { mp3: "/tracks/ocean-girl-acoustic.mp3", opus: "/tracks/ocean-girl-acoustic.opus" },
  OCEAN_GIRL_REMIX: { mp3: "/tracks/ocean-girl-remix.mp3", opus: "/tracks/ocean-girl-remix.opus" },
  PARIS: { mp3: "/tracks/paris.mp3", opus: "/tracks/paris.opus" },
  POKEMON: { mp3: "/tracks/pokemon.mp3", opus: "/tracks/pokemon.opus" },
  WJF: { mp3: "/tracks/we're-just-friends.mp3", opus: "/tracks/we're-just-friends.opus" },
  WJF_DMVRCO: { mp3: "/tracks/we're-just-friends-dmvrco-remix.mp3", opus: "/tracks/we're-just-friends-dmvrco-remix.opus" },
  WJF_MICKEY_JAS: { mp3: "/tracks/we're-just-friends-mickey-jas-remix.mp3", opus: "/tracks/we're-just-friends-mickey-jas-remix.opus" },
  // Ambient / voiceover
  SPACE_MUSIC: { mp3: "/tracks/space-music.mp3", opus: "/tracks/space-music.opus" },
  WELCOME_TO_HEARTVERSE: { mp3: "/tracks/welcome-to-the-heartverse.mp3", opus: "/tracks/welcome-to-the-heartverse.opus" },
  WELCOME_BACK: { mp3: "/tracks/welcome-back.mp3", opus: "/tracks/welcome-back.opus" },
} as const;

// Track info mapping - links track keys to visual/metadata information
export const TRACK_INFO: Record<string, TrackInfo> = {
  'welcome-to-the-heartverse': {
    id: 'welcome-to-the-heartverse',
    title: 'Welcome to the Heartverse',
    artist: 'CHXNDLER',
    oneLiner: 'Enter the cosmic music experience'
  },
  'welcome-back': {
    id: 'welcome-back', 
    title: 'Welcome Back',
    artist: 'CHXNDLER',
    oneLiner: 'Welcome back to the Heartverse'
  },
  'space-music': {
    id: 'space-music',
    title: 'Space Music',
    artist: 'CHXNDLER',
    oneLiner: 'Ambient cosmic journey'
  },
  'baby': {
    id: 'baby',
    title: 'BABY',
    artist: 'CHXNDLER',
    coverUrl: '/covers/BABY.webp',
    skyTexture: '/sky/baby-sky.webp',
    oneLiner: 'Chaos, magic, and first-date sparks.'
  },
  'ocean-girl': {
    id: 'ocean-girl',
    title: 'OCEAN GIRL',
    artist: 'CHXNDLER',
    coverUrl: '/covers/OCEAN GIRL.webp',
    skyTexture: '/sky/ocean-girl-sky.webp',
    oneLiner: 'Love flows back like the tide.'
  },
  'ocean-girl-acoustic': {
    id: 'ocean-girl-acoustic',
    title: 'OCEAN GIRL (ACOUSTIC)',
    artist: 'CHXNDLER',
    coverUrl: '/covers/OCEAN GIRL (ACOUSTIC).webp',
    skyTexture: '/sky/ocean-girl-sky.webp',
    oneLiner: 'Love flows back like the tide.'
  },
  'be-my-bee': {
    id: 'be-my-bee',
    title: 'BE MY BEE',
    artist: 'CHXNDLER', 
    coverUrl: '/covers/BE MY BEE.webp',
    skyTexture: '/sky/be-my-bee-sky.webp',
    oneLiner: 'Love\'s sweet buzz, then the sting.'
  },
  'game-boy-heart': {
    id: 'game-boy-heart',
    title: 'GAME BOY HEART',
    artist: 'CHXNDLER',
    coverUrl: '/covers/GAME BOY HEART.webp',
    skyTexture: '/sky/game-boy-heart-sky.webp',
    oneLiner: 'Escaping into an 8-bit dream.'
  },
  'house-party': {
    id: 'house-party',
    title: 'ALIEN (House Party)',
    artist: 'CHXNDLER',
    coverUrl: '/covers/HOUSE PARTY.webp', 
    skyTexture: '/sky/house-party-sky.webp',
    oneLiner: 'A crush, a crowd, all aliens in disguise.'
  },
  'kid-forever': {
    id: 'kid-forever',
    title: 'KID FOREVER',
    artist: 'CHXNDLER',
    coverUrl: '/covers/KID FOREVER.webp',
    skyTexture: '/sky/kid-forever-sky.webp',
    oneLiner: 'Fearless in your daydream land.'
  },
  'paris': {
    id: 'paris',
    title: 'PARIS',
    artist: 'CHXNDLER',
    coverUrl: '/covers/PARIS.webp',
    skyTexture: '/sky/paris-sky.webp',
    oneLiner: 'Poison love kissed anyway.'
  },
  'pokemon': {
    id: 'pokemon',
    title: 'POKÉMON',
    artist: 'CHXNDLER',
    coverUrl: '/covers/POKEMON.webp',
    skyTexture: '/sky/pokemon-sky.webp',
    oneLiner: 'Dream big, fight hard, never stop chasing.'
  },
  'were-just-friends': {
    id: 'were-just-friends',
    title: 'WE\'RE JUST FRIENDS',
    artist: 'CHXNDLER',
    coverUrl: '/covers/WE\'RE JUST FRIENDS.webp',
    skyTexture: '/sky/were-just-friends-sky.webp',
    oneLiner: 'Lines blur between us.'
  }
};

export const SFX = {
  WARP: "/audio/warp.mp3",
  BUTTON_BEAM: "/audio/button.mp3",
} as const;

export type TrackKey = keyof typeof TRACKS;

type AudioState = {
  src: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentTrack: TrackInfo | null;
  isLoading: boolean;
  pendingTrack: string | null;
  warpCompleted: boolean;
};

type AudioControls = {
  loadTrack: (src: string) => void;
  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  playTrack: (trackId: string) => Promise<void>;
  playStartSequence: (isLoggedIn: boolean) => Promise<void>;
  bestSourceFor: (t: { mp3?: string; opus?: string }) => string;
  getCurrentAudio: () => HTMLAudioElement | null;
  stopAllAudio: () => void;
  setPendingTrack: (trackId: string | null) => void;
  markWarpCompleted: () => void;
};

const AudioCtx = createContext<(AudioState & AudioControls) | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioState>({ 
    src: null, 
    playing: false, 
    currentTime: 0, 
    duration: 0, 
    volume: 1,
    currentTrack: null,
    isLoading: false,
    pendingTrack: null,
    warpCompleted: false
  });

  // Lazily create audio element once on client
  useEffect(() => {
    if (audioRef.current) return;
    const a = document.createElement("audio");
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    a.setAttribute("data-global-audio", "1");
    a.style.display = "none";
    document.body.appendChild(a);
    audioRef.current = a;

    const onTime = () => setState(s => ({ ...s, currentTime: a.currentTime }));
    const onDur = () => setState(s => ({ ...s, duration: a.duration || 0 }));
    const onPlay = () => setState(s => ({ ...s, playing: true, isLoading: false }));
    const onPause = () => setState(s => ({ ...s, playing: false }));
    const onVol = () => setState(s => ({ ...s, volume: a.volume }));
    const onLoadStart = () => setState(s => ({ ...s, isLoading: true }));
    const onLoadEnd = () => setState(s => ({ ...s, isLoading: false }));
    
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("volumechange", onVol);
    a.addEventListener("loadstart", onLoadStart);
    a.addEventListener("canplaythrough", onLoadEnd);
    
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("volumechange", onVol);
      a.removeEventListener("loadstart", onLoadStart);
      a.removeEventListener("canplaythrough", onLoadEnd);
      try { a.pause(); } catch {}
      try { document.body.removeChild(a); } catch {}
      audioRef.current = null;
    };
  }, []);

  // Mark that the unified AudioProvider is active; used to disable legacy bridges
  useEffect(() => {
    try { (window as any).__UNIFIED_AUDIO_ACTIVE = true; } catch {}
    return () => { try { delete (window as any).__UNIFIED_AUDIO_ACTIVE; } catch {} };
  }, []);

  // This will be used for auto-playing after warp completion
  const autoPlayAfterWarpRef = useRef<string | null>(null);

  // Prefer Opus when available. Fallback to MP3.
  const bestSourceFor = (t: { mp3?: string; opus?: string }): string => {
    if (t?.opus) return t.opus;
    if (t?.mp3) return t.mp3;
    return "";
  };

  // Helper to play an <audio> element and resolve when it ends
  const playAudioOnce = (src: string): Promise<HTMLAudioElement> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      (audio as any).playsInline = true;
      const onEnded = () => { cleanup(); resolve(audio); };
      const onError = (e: any) => { cleanup(); reject(e); };
      const cleanup = () => {
        try { audio.removeEventListener("ended", onEnded); } catch {}
        try { audio.removeEventListener("error", onError); } catch {}
      };
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("error", onError);
      audio.play().catch(reject);
    });
  };

  const stopAllAudioInternal = () => {
    const a = audioRef.current;
    if (a) {
      try { a.pause(); } catch {}
      try { a.currentTime = 0; } catch {}
    }
    // Also defensively stop any stray <audio> elements on the page
    try {
      const all = document.querySelectorAll<HTMLAudioElement>('audio:not([data-global-audio])');
      all.forEach(audio => { try { audio.pause(); audio.currentTime = 0; } catch {} });
    } catch {}
  };

  const api: AudioControls = useMemo(() => ({
    loadTrack: (src: string) => {
      const a = audioRef.current; if (!a) return;
      if (state.src === src) return;
      a.src = src;
      try { a.load(); } catch {}
      setState(s => ({ ...s, src, currentTime: 0, duration: 0 }));
    },
    
    play: () => { 
      const a = audioRef.current; 
      if (!a) return;
      
      // Check if audio has a valid source before trying to play
      if (!a.src || a.src === 'null' || a.src === '') {
        console.warn('No audio source loaded. Cannot play.');
        return;
      }
      
      void a.play().catch((err) => {
        console.error('Failed to play audio:', err);
      }); 
    },
    
    pause: () => { 
      const a = audioRef.current; 
      if (!a) return; 
      try { a.pause(); } catch {} 
    },
    
    seek: (t: number) => { 
      const a = audioRef.current; 
      if (!a) return; 
      try { a.currentTime = Math.max(0, Math.min(a.duration || Infinity, t)); } catch {} 
    },
    
    setVolume: (v: number) => { 
      const a = audioRef.current; 
      if (!a) return; 
      a.volume = Math.max(0, Math.min(1, v)); 
    },

    playTrack: async (trackId: string) => {
      const trackInfo = TRACK_INFO[trackId];
      if (!trackInfo) {
        console.warn(`Track not found: ${trackId}`);
        return;
      }

      // Find the track source
      let trackSource = "";
      const trackKey = Object.keys(TRACKS).find(key => {
        const normalizedKey = key.toLowerCase().replace(/_/g, '-');
        return normalizedKey === trackId || trackId.includes(normalizedKey);
      }) as TrackKey;

      if (trackKey) {
        trackSource = bestSourceFor(TRACKS[trackKey]);
      } else {
        // Fallback: try direct path
        trackSource = `/tracks/${trackId}.opus`;
      }

      if (!trackSource) {
        console.warn(`No source found for track: ${trackId}`);
        return;
      }

      // Update current track info immediately
      setState(s => ({ ...s, currentTrack: trackInfo, isLoading: true }));

      // Stop any existing audio and wait a bit to prevent race conditions
      stopAllAudioInternal();
      
      // Small delay to ensure audio has fully stopped before starting new track
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load and play the track
      const a = audioRef.current;
      if (!a) return;

      // Verify we're still trying to play the same track (prevent race conditions)
      const currentState = state;
      if (currentState.currentTrack?.id !== trackId) {
        console.warn('Track changed during loading, aborting playback');
        return;
      }

      a.src = trackSource;
      try { 
        a.load();
        
        // Wait for audio to be ready before playing
        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error('Audio load failed'));
          };
          const cleanup = () => {
            a.removeEventListener('canplay', onCanPlay);
            a.removeEventListener('error', onError);
          };
          
          if (a.readyState >= 3) { // Already loaded
            resolve();
          } else {
            a.addEventListener('canplay', onCanPlay, { once: true });
            a.addEventListener('error', onError, { once: true });
          }
        });
      } catch (loadErr) {
        console.error('Failed to load track:', loadErr);
        setState(s => ({ ...s, isLoading: false }));
        return;
      }
      
      setState(s => ({ ...s, src: trackSource, currentTime: 0, duration: 0 }));

      try {
        await a.play();
      } catch (err) {
        console.error('Failed to play track:', err);
        setState(s => ({ ...s, isLoading: false }));
      }
    },

    playStartSequence: async (isLoggedIn: boolean) => {
      stopAllAudioInternal();
      
      try {
        // Play warp effect
        await playAudioOnce(SFX.WARP);
        
        // Play button beam effect  
        await playAudioOnce(SFX.BUTTON_BEAM);
        
        // Do NOT auto-play space music here anymore
        // The warp completion handler will take care of playing the pending track or space music
        
      } catch (err) {
        console.error('Failed to play start sequence:', err);
      }
    },

    bestSourceFor,
    
    getCurrentAudio: () => audioRef.current,
    
    stopAllAudio: stopAllAudioInternal,
    
    setPendingTrack: (trackId: string | null) => {
      setState(s => ({ ...s, pendingTrack: trackId }));
    },
    
    markWarpCompleted: () => {
      setState(s => ({ ...s, warpCompleted: true }));
    },
    
  }), [state.src]);

  // Auto-play track when warp completes
  useEffect(() => {
    if (!state.warpCompleted) return;

    const trackToPlay = state.pendingTrack || 'space-music';
    
    // Clear pending track 
    setState(s => ({ ...s, pendingTrack: null }));
    
    // Use the API to play the track
    const playTrack = api.playTrack;
    playTrack(trackToPlay).catch(console.error);
    
  }, [state.warpCompleted, state.pendingTrack, api.playTrack]);

  const value = useMemo(() => ({ ...state, ...api }), [state, api]);
  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used within <AudioProvider>");
  return ctx;
}

