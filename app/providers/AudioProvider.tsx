"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { trackKeyFromSlug } from "@/utils/trackKeyFromSlug";

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
  // Element planet tracks
  WATER: { mp3: "/tracks/WATER.MP3" },
  LIGHTNING: { mp3: "/tracks/LIGHTNING.MP3" },
  DARKNESS: { mp3: "/tracks/darkness.MP3" },
  HEART: { mp3: "/tracks/heart.MP3" },
  CENTER: { mp3: "/tracks/center.MP3" },
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
  },
  // Element planet tracks
  'water': {
    id: 'water',
    title: 'WATER',
    artist: 'CHXNDLER',
    oneLiner: 'Flow like the ocean.'
  },
  'lightning': {
    id: 'lightning',
    title: 'LIGHTNING',
    artist: 'CHXNDLER',
    oneLiner: 'Electric energy.'
  },
  'darkness': {
    id: 'darkness',
    title: 'DARKNESS',
    artist: 'CHXNDLER',
    oneLiner: 'Embrace the shadows.'
  },
  'heart': {
    id: 'heart',
    title: 'HEART',
    artist: 'CHXNDLER',
    oneLiner: 'Feel the love.'
  },
  'center': {
    id: 'center',
    title: 'HEARTVERSE',
    artist: 'CHXNDLER',
    oneLiner: 'Welcome to the center.'
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
  togglePlayPause: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  selectTrack: (trackId: string) => Promise<void>;
  playTrack: (trackId: string) => Promise<void>;
  playStartSequence: (isLoggedIn: boolean) => Promise<void>;
  bestSourceFor: (t: { mp3?: string; opus?: string }) => string;
  getCurrentAudio: () => HTMLAudioElement | null;
  stopAllAudio: () => void;
  setPendingTrack: (trackId: string | null) => void;
  markWarpCompleted: () => void;
  currentTrack: TrackInfo | null;
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
    const onPlay = () => {
      console.log('🎵 AudioProvider: onPlay event fired');
      setState(s => ({ ...s, playing: true, isLoading: false }));
    };
    const onPause = () => {
      console.log('🎵 AudioProvider: onPause event fired');
      setState(s => ({ ...s, playing: false }));
    };
    const onVol = () => setState(s => ({ ...s, volume: a.volume }));
    const onLoadStart = () => setState(s => ({ ...s, isLoading: true }));
    const onLoadEnd = () => setState(s => ({ ...s, isLoading: false }));
    
    const onEnded = () => {
      console.log('🎵 AudioProvider: Song ended, restarting...');
      if (a.src && a.src !== 'null' && a.src !== '') {
        a.currentTime = 0;
        a.play().catch((err) => {
          console.error('Failed to repeat song:', err);
        });
      }
    };
    
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("volumechange", onVol);
    a.addEventListener("loadstart", onLoadStart);
    a.addEventListener("canplaythrough", onLoadEnd);
    a.addEventListener("ended", onEnded);
    
    // Debug: Track unexpected pauses
    const onPauseDebug = () => {
      console.log('🎵 Audio paused at time:', a.currentTime, 'src:', a.src);
      if (a.currentTime > 0 && a.currentTime < 10) {
        console.log('🎵 ⚠️  Audio paused early! This might be the 4-second stop issue');
        console.log('🎵 Checking if pause was user-initiated or system-caused...');
        
        // Check if this was an unexpected pause (not user-initiated)
        // If audio was stopped very early, it might be a race condition
        if (a.currentTime < 5 && !a.ended) {
          console.log('🎵 🚨 DETECTED: Potential race condition causing early audio stop');
          console.log('🎵 Current playing state:', state.playing);
          console.log('🎵 Audio src:', a.src);
          console.log('🎵 Audio readyState:', a.readyState);
          console.log('🎵 All audio elements on page:');
          const allAudio = document.querySelectorAll('audio');
          allAudio.forEach((audio, index) => {
            console.log(`🎵 Audio ${index}:`, {
              src: audio.src,
              paused: audio.paused,
              currentTime: audio.currentTime,
              duration: audio.duration,
              readyState: audio.readyState,
              hasGlobalFlag: audio.hasAttribute('data-global-audio')
            });
          });
        }
      }
    };
    a.addEventListener("pause", onPauseDebug);
    
    // Debug: Track when audio ends unexpectedly
    const onEndedDebug = () => {
      console.log('🎵 Audio ended at time:', a.currentTime, 'duration:', a.duration);
      if (a.currentTime < (a.duration - 1)) {
        console.log('🎵 ⚠️  Audio ended early! This might be the 5-second stop issue');
      }
    };
    a.addEventListener("ended", onEndedDebug);
    
    // Disable browser media session to prevent title overlays
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    }
    
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("volumechange", onVol);
      a.removeEventListener("loadstart", onLoadStart);
      a.removeEventListener("canplaythrough", onLoadEnd);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("pause", onPauseDebug);
      a.removeEventListener("ended", onEndedDebug);
      try { a.pause(); } catch {}
      try { document.body.removeChild(a); } catch {}
      audioRef.current = null;
    };
  }, []);

  // Mark that the unified AudioProvider is active; used to disable legacy bridges
  useEffect(() => {
    try { 
      (window as any).__UNIFIED_AUDIO_ACTIVE = true; 
      // Also set the audio manager flag to disable other audio systems
      (window as any).__AUDIO_MANAGER_ACTIVE = true;
      
      // Aggressively stop any existing audio to prevent conflicts
      const existingAudio = document.querySelectorAll('audio');
      existingAudio.forEach(audio => {
        if (!audio.getAttribute('data-global-audio')) {
          try { 
            audio.pause(); 
            audio.currentTime = 0; 
            console.log('🎵 Stopped existing conflicting audio element');
          } catch {} 
        }
      });
    } catch {}
    
    return () => { 
      try { 
        delete (window as any).__UNIFIED_AUDIO_ACTIVE; 
        delete (window as any).__AUDIO_MANAGER_ACTIVE; 
      } catch {} 
    };
  }, []);

  // This will be used for auto-playing after warp completion
  const autoPlayAfterWarpRef = useRef<string | null>(null);

  // Normalize incoming slugs so dropdown selections (e.g. `we're-just-friends`) map to TRACK_INFO ids (e.g. `were-just-friends`)
  const normalizeSlug = (slug?: string): string => {
    if (!slug) return "";
    // Remove apostrophes and normalize common variations
    return String(slug).toLowerCase().replace(/'/g, "");
  };

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
    
    togglePlayPause: () => {
      const a = audioRef.current;
      if (!a) return;
      
      console.log('🎵 togglePlayPause called - current playing state:', state.playing);
      console.log('🎵 Audio element src:', a.src);
      console.log('🎵 State src:', state.src);
      console.log('🎵 Current track:', state.currentTrack?.id);
      console.log('🎵 Audio readyState:', a.readyState);
      
      if (state.playing) {
        console.log('🎵 Pausing audio');
        // Update state immediately to provide instant UI feedback
        setState(s => ({ ...s, playing: false }));
        try { a.pause(); } catch {}
      } else {
        // Check if there's a current track that should be playing
        if (state.currentTrack) {
          console.log('🎵 Current track exists, checking if it matches audio source:', state.currentTrack.id);
          
          // Determine expected source using shared mapper with normalized slug
          const norm = normalizeSlug(state.currentTrack.id);
          const key = trackKeyFromSlug(norm) as TrackKey | null;
          const expectedSource = key ? bestSourceFor(TRACKS[key]) : `/tracks/${norm}.opus`;
          
          // Check if the audio element has the correct source loaded
          if (!a.src || a.src === 'null' || a.src === '' || !a.src.includes(norm)) {
            console.log('🎵 Audio source mismatch, loading current track:', norm);
            a.src = expectedSource;
            try { a.load(); } catch {}
            setState(s => ({ 
              ...s, 
              src: expectedSource
            }));
          }
        } else {
          // If no track loaded, load space music as default for now
          // Note: The existing player store sync logic will handle switching to selected songs
          if (!a.src || a.src === 'null' || a.src === '') {
            console.log('🎵 No track loaded, loading space music as default');
            const spaceMusicSource = bestSourceFor(TRACKS.SPACE_MUSIC);
            a.src = spaceMusicSource;
            try { a.load(); } catch {}
            setState(s => ({ 
              ...s, 
              src: spaceMusicSource, 
              currentTrack: TRACK_INFO['space-music'] || null 
            }));
          }
        }
        
        console.log('🎵 Starting audio playback with src:', a.src);
        
        // Check if audio is ready to play
        if (a.readyState >= 3) {
          // Audio is ready, play immediately
          console.log('🎵 Audio ready, playing immediately');
          setState(s => ({ ...s, playing: true }));
          void a.play().catch((err) => {
            console.error('Failed to toggle play audio:', err);
            setState(s => ({ ...s, playing: false }));
          });
        } else {
          // Audio not ready, wait for it to load
          console.log('🎵 Audio not ready (readyState:', a.readyState, '), waiting for load...');
          setState(s => ({ ...s, playing: true, isLoading: true }));
          
          const handleCanPlay = () => {
            console.log('🎵 Audio can play, starting playback');
            setState(s => ({ ...s, isLoading: false }));
            void a.play().catch((err) => {
              console.error('Failed to play audio after load:', err);
              setState(s => ({ ...s, playing: false, isLoading: false }));
            });
            a.removeEventListener('canplay', handleCanPlay);
            a.removeEventListener('error', handleError);
          };
          
          const handleError = (e: Event) => {
            console.error('🎵 Audio load error during toggle play:', e);
            setState(s => ({ ...s, playing: false, isLoading: false }));
            a.removeEventListener('canplay', handleCanPlay);
            a.removeEventListener('error', handleError);
          };
          
          a.addEventListener('canplay', handleCanPlay, { once: true });
          a.addEventListener('error', handleError, { once: true });
          
          // Trigger load if needed
          if (a.readyState === 0) {
            try { a.load(); } catch {}
          }
          
          // Timeout fallback
          setTimeout(() => {
            if (a.readyState < 3) {
              console.warn('🎵 Audio load timeout, attempting to play anyway');
              a.removeEventListener('canplay', handleCanPlay);
              a.removeEventListener('error', handleError);
              void a.play().catch((err) => {
                console.error('Failed to play audio after timeout:', err);
                setState(s => ({ ...s, playing: false, isLoading: false }));
              });
            }
          }, 3000);
        }
      }
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

    selectTrack: async (trackId: string) => {
      const normId = normalizeSlug(trackId);
      const trackInfo = TRACK_INFO[normId] || TRACK_INFO[trackId];
      if (!trackInfo) {
        console.warn(`Track not found: ${trackId}`);
        return;
      }

      // Find the track source using the shared mapper
      let trackSource = "";
      const key = trackKeyFromSlug(normId) as TrackKey | null;
      trackSource = key ? bestSourceFor(TRACKS[key]) : `/tracks/${normId}.opus`;

      if (!trackSource) {
        console.warn(`No source found for track: ${trackId}`);
        return;
      }

      // Update currentTrack state FIRST to prevent the playerStore subscription
      // from triggering a duplicate playTrack call
      setState(s => ({ ...s, currentTrack: trackInfo }));

      // Update playerStore.mainId to keep play/pause button in sync
      // This ensures the player UI shows the correct track after warp
      try {
        const { playerStore } = await import('@/store/usePlayerStore');
        playerStore.setState({ mainId: normId, prevMainId: playerStore.getState().mainId });
        console.log('🎵 Updated playerStore.mainId to:', normId);
      } catch (err) {
        console.warn('Failed to update playerStore:', err);
      }

      // 1. Stop current music immediately
      console.log('🎵 Stopping current music for track selection');
      stopAllAudioInternal();
      setState(s => ({ ...s, playing: false }));

      // 2. Play warp sound effect
      try {
        console.log('🎵 Playing warp sound effect');
        await playAudioOnce(SFX.WARP);
        console.log('🎵 Warp sound effect completed');
        
        // Small delay after warp to ensure audio session is clear
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error('Failed to play warp effect:', err);
      }

      // 3. Load the selected track and auto-play after warp completes
      const a = audioRef.current;
      if (!a) return;

      console.log('🎵 Loading selected track:', normId, 'with source:', trackSource);
      a.src = trackSource;
      console.log('🎵 Audio element src set to:', a.src);
      try { 
        a.load();
        console.log('🎵 Audio load() called successfully');
        
        // Wait for audio to be ready
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Audio load timeout'));
          }, 10000);
          
          const onCanPlay = () => {
            cleanup();
            resolve();
          };
          const onError = (e: Event) => {
            cleanup();
            console.error('Audio load error:', e);
            reject(new Error('Audio load failed'));
          };
          const cleanup = () => {
            clearTimeout(timeout);
            a.removeEventListener('canplay', onCanPlay);
            a.removeEventListener('error', onError);
          };
          
          if (a.readyState >= 3) {
            clearTimeout(timeout);
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
      
      // 4. Update state with the loaded track and start playback
      // Don't override duration - let the audio metadata loading handle it
      setState(s => ({ 
        ...s, 
        src: trackSource, 
        currentTrack: trackInfo,
        currentTime: 0,
        // Set playing true optimistically for snappy UI; onPlay event will confirm
        playing: true,
        isLoading: false
      }));

      try {
        await a.play();
        console.log('🎵 Auto-played selected track after warp:', normId);
      } catch (err) {
        console.error('Failed to auto-play after warp:', err);
        // Reflect failure in state so UI shows correct status
        setState(s => ({ ...s, playing: false }));
      }
    },

    playTrack: async (trackId: string) => {
      const normId = normalizeSlug(trackId);
      const trackInfo = TRACK_INFO[normId] || TRACK_INFO[trackId];
      if (!trackInfo) {
        console.warn(`Track not found: ${trackId}`);
        return;
      }

      // Find the track source using the shared mapper
      let trackSource = "";
      const key = trackKeyFromSlug(normId) as TrackKey | null;
      trackSource = key ? bestSourceFor(TRACKS[key]) : `/tracks/${normId}.opus`;

      if (!trackSource) {
        console.warn(`No source found for track: ${trackId}`);
        return;
      }

      // Update current track info immediately
      setState(s => ({ ...s, currentTrack: trackInfo, isLoading: true }));

      // Only stop audio if we're switching to a different track
      const currentAudio = audioRef.current;
      const isSameTrack = currentAudio && currentAudio.src && currentAudio.src.includes(normId);
      
      if (!isSameTrack) {
        // Stop any existing audio only when switching tracks
        stopAllAudioInternal();
        
        // Small delay to ensure audio has fully stopped before starting new track
        await new Promise(resolve => setTimeout(resolve, 50));
      } else {
        console.log('🎵 Same track detected, not stopping current audio to prevent interruption');
      }

      // Load and play the track
      const a = audioRef.current;
      if (!a) return;

      // Disable browser media session before playing to prevent title overlays
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }

      // Ensure we're still working with the same track (prevent race conditions)
      if (state.currentTrack?.id !== normId) {
        console.log('🎵 Track changed during loading, aborting:', normId);
        return;
      }

      a.src = trackSource;
      try { 
        a.load();
        
        // Wait for audio to be ready before playing
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Audio load timeout'));
          }, 10000); // 10 second timeout
          
          const onCanPlay = () => {
            cleanup();
            resolve();
          };
          const onError = (e: Event) => {
            cleanup();
            console.error('Audio load error:', e);
            reject(new Error('Audio load failed'));
          };
          const cleanup = () => {
            clearTimeout(timeout);
            a.removeEventListener('canplay', onCanPlay);
            a.removeEventListener('error', onError);
          };
          
          if (a.readyState >= 3) { // Already loaded
            clearTimeout(timeout);
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
        // Set playing state immediately for instant UI feedback
        setState(s => ({ ...s, playing: true, isLoading: false }));
        await a.play();
        console.log('🎵 Successfully started playing:', normId);
      } catch (err) {
        console.error('Failed to play track:', err);
        setState(s => ({ ...s, isLoading: false, playing: false }));
      }
    },

    playStartSequence: async (isLoggedIn: boolean) => {
      stopAllAudioInternal();
      
      try {
        // Play warp effect
        await playAudioOnce(SFX.WARP);
        
        // Play join-alien effect (this was missing - it plays after warp in HoloAudioBridge)
        await playAudioOnce("/audio/join-alien.mp3");
        
        // Play button beam effect  
        await playAudioOnce(SFX.BUTTON_BEAM);
        
        // Play appropriate welcome message
        if (isLoggedIn) {
          // Play welcome back message
          await playAudioOnce(bestSourceFor(TRACKS.WELCOME_BACK));
        } else {
          // Play welcome to heartverse message
          await playAudioOnce(bestSourceFor(TRACKS.WELCOME_TO_HEARTVERSE));
        }
        
        // After all SFX complete, load space music but don't auto-play
        console.log('🎵 Start sequence complete, loading space music...');
        
        // Load space music track into the global player for user to play manually
        const spaceMusicSource = bestSourceFor(TRACKS.SPACE_MUSIC);
        api.loadTrack(spaceMusicSource);
        
        // Set space music as current track
        const spaceMusicInfo = TRACK_INFO['space-music'];
        if (spaceMusicInfo) {
          setState(s => ({ ...s, currentTrack: spaceMusicInfo }));
        }
        
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
      setState(s => ({ 
        ...s, 
        warpCompleted: true
        // Keep existing pendingTrack - don't override with space-music
      }));
    },
    
    // Expose currentTrack for compatibility
    currentTrack: state.currentTrack,
    
  }), [state.src, state.currentTrack, state.playing]);

  // Auto-play track when warp completes
  useEffect(() => {
    if (!state.warpCompleted) return;
    if (!state.pendingTrack) return; // Only auto-play if a track was specifically selected

    const trackToPlay = state.pendingTrack;
    
    console.log('🎵 Auto-playing after warp completion:', trackToPlay);
    
    // Clear pending track 
    setState(s => ({ ...s, pendingTrack: null }));
    
    // Use the API to play the track (playTrack already handles starting playback)
    const playTrack = api.playTrack;
    playTrack(trackToPlay).catch(console.error);
    
  }, [state.warpCompleted, state.pendingTrack, api.playTrack]);

  // Listen for player store changes to sync with holo panel selections
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Import playerStore dynamically to avoid SSR issues
    const subscribeToPlayerStore = async () => {
      try {
        const { playerStore } = await import('@/store/usePlayerStore');
        const { useProfile } = await import('@/contexts/ProfileContext');

        const unsubscribe = playerStore.subscribe((storeState: any) => {
          const currentMainId = storeState?.mainId;
          const currentTrackId = state.currentTrack?.id; // Use local AudioProvider state, not store state

          // Check if HoloAudioBridge is handling the warp sequence - if so, don't interfere
          if ((window as any).__HOLO_WARP_IN_PROGRESS) {
            console.log('🎵 AudioProvider: Warp in progress, skipping track sync');
            return;
          }

          // Only sync if a different song is selected AND we're not already playing that specific track
          if (currentMainId && currentMainId !== currentTrackId) {
            console.log('🎵 AudioProvider: Syncing with player store selection:', currentMainId, 'was playing:', currentTrackId);

            // Set current track info immediately for UI updates
            const trackInfo = TRACK_INFO[currentMainId];
            if (trackInfo) {
              setState(s => ({ ...s, currentTrack: trackInfo }));
            }

            // Always switch to the new track, even if something else is playing
            console.log('🎵 AudioProvider: Switching to new track:', currentMainId);
            api.playTrack(currentMainId).catch(console.error);
          }
        });

        return unsubscribe;
      } catch (err) {
        console.warn('Failed to subscribe to player store:', err);
      }
    };

    subscribeToPlayerStore();
  }, [state.currentTrack?.id, state.playing, api.playTrack]);

  const value = useMemo(() => ({ ...state, ...api }), [state, api]);
  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used within <AudioProvider>");
  return ctx;
}
