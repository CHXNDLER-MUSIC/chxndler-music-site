"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useMemo } from "react";
import { supabaseTrackUrl as S } from "@/lib/supabaseTrackUrl";

// Music and voiceover tracks
// Track info for audio and visual display
export type TrackInfo = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  skyTexture?: string;
  oneLiner?: string;
};

// Audio source files — full-length songs from Supabase Storage; welcome/space kept local.
export const TRACKS = {
  BABY: { mp3: S("baby.mp3"), opus: S("baby.opus") },
  BE_MY_BEE: { mp3: S("be-my-bee.mp3"), opus: S("be-my-bee.opus") },
  BRAIN_FREEZE: { mp3: S("brain-freeze.mp3"), opus: S("brain-freeze.opus") },
  COLLIDE: { mp3: S("collide.mp3"), opus: S("collide.opus") },
  COLORS_HOME: { mp3: S("COLORS OF OUR HOME.mp3"), opus: S("COLORS-OF-OUR-HOME.opus") },
  COLORS_HOME_ACOUSTIC: { mp3: S("COLORS OF OUR HOME (ACOUSTIC).mp3"), opus: S("COLORS-OF-OUR-HOME-_ACOUSTIC_.opus") },
  COLORS_HOME_BLUMA: { mp3: S("COLORS OF OUR HOME (BLUMA Game Soundtrack).mp3"), opus: S("COLORS-OF-OUR-HOME-_BLUMA-Game-Soundtrack_.opus") },
  GAME_BOY_HEART: { mp3: S("game-boy-heart.mp3"), opus: S("game-boy-heart.opus") },
  HOUSE_PARTY: { mp3: S("house-party.mp3"), opus: S("house-party.opus") },
  KID_FOREVER: { mp3: S("kid-forever.mp3"), opus: S("kid-forever.opus") },
  OCEAN_GIRL: { mp3: S("ocean-girl.mp3"), opus: S("ocean-girl.opus") },
  OCEAN_GIRL_ACOUSTIC: { mp3: S("ocean-girl-acoustic.mp3"), opus: S("ocean-girl-acoustic.opus") },
  OCEAN_GIRL_REMIX: { mp3: S("ocean-girl-remix.mp3"), opus: S("ocean-girl-remix.opus") },
  PARIS: { mp3: S("paris.mp3"), opus: S("paris.opus") },
  POKEMON: { mp3: S("pokemon.mp3"), opus: S("pokemon.opus") },
  WJF: { mp3: S("we're-just-friends.mp3"), opus: S("we're-just-friends.opus") },
  WJF_DMVRCO: { mp3: S("we're-just-friends-dmvrco-remix.mp3"), opus: S("we're-just-friends-dmvrco-remix.opus") },
  WJF_MICKEY_JAS: { mp3: S("we're-just-friends-mickey-jas-remix.mp3"), opus: S("we're-just-friends-mickey-jas-remix.opus") },
  // Ambient / voiceover — kept local
  SPACE_MUSIC: { mp3: "/tracks/space-music.mp3" },
  WELCOME_TO_HEARTVERSE: { mp3: "/tracks/welcome-to-the-heartverse.mp3", opus: "/tracks/welcome-to-the-heartverse.opus" },
  WELCOME_BACK: { mp3: "/tracks/welcome-back.mp3", opus: "/tracks/welcome-back.opus" },
};

// Track info mapping - links track keys to visual/metadata information
export const TRACK_INFO: Record<string, TrackInfo> = {
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
  'space-music': {
    id: 'space-music',
    title: 'SPACE MUSIC',
    artist: 'CHXNDLER',
    coverUrl: '/covers/SPACE.webp',
    skyTexture: '/sky/space-sky.webp',
    oneLiner: 'Journey through the cosmos.'
  }
};

export const SFX = {
  WARP: "/audio/warp.mp3",
  BUTTON_BEAM: "/audio/button.mp3",
} as const;

export type TrackKey = keyof typeof TRACKS;

type AudioManagerApi = {
  playStartSequence: (isLoggedIn: boolean) => Promise<void>;
  playSongSequence: (trackKey: TrackKey) => Promise<void>;
  stopAllAudio: () => void;
  bestSourceFor: (t: { mp3?: string; opus?: string }) => string;
  getCurrentAudio: () => HTMLAudioElement | null;
  currentTrackInfo: TrackInfo | null;
  setCurrentTrackInfo: (trackId: string) => void;
  isPlaying: boolean;
};

const Ctx = createContext<AudioManagerApi | null>(null);

// Prefer Opus when available. Fallback to MP3.
function bestSourceForInternal(t: { mp3?: string; opus?: string }): string {
  if (t?.opus) return t.opus;
  if (t?.mp3) return t.mp3;
  return "";
}

function playAudioOnce(src: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.playsInline = true as any;
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
}

function playLoopingAudio(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.playsInline = true as any;
  audio.loop = true;
  audio.volume = 0.5;
  audio.play().catch(() => {});
  return audio;
}

export function AudioManagerProvider({ children }: { children: React.ReactNode }) {
  // If the unified AudioProvider is active, disable this legacy manager to avoid conflicts
  if (typeof window !== 'undefined' && (window as any).__UNIFIED_AUDIO_ACTIVE) {
    // Return a stub provider that provides the expected interface but does nothing
    const stubApi: AudioManagerApi = {
      playStartSequence: () => Promise.resolve(),
      playSongSequence: () => Promise.resolve(),
      stopAllAudio: () => {},
      bestSourceFor: (t) => t?.opus || t?.mp3 || "",
      getCurrentAudio: () => null,
      currentTrackInfo: null,
      setCurrentTrackInfo: () => {},
      isPlaying: false,
    };
    return <Ctx.Provider value={stubApi}>{children}</Ctx.Provider>;
  }

  const foregroundRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const sfxRef = useRef<HTMLAudioElement | null>(null);
  const sfx2Ref = useRef<HTMLAudioElement | null>(null);

  // Track state - single source of truth
  const [currentTrackInfo, setCurrentTrackInfoState] = React.useState<TrackInfo | null>(
    TRACK_INFO['space-music'] || null  // Default to space music track on initial load
  );
  const [isPlaying, setIsPlaying] = React.useState(false);

  // Mark that the new AudioManager is active; used to disable legacy bridges
  useEffect(() => {
    try { (window as any).__AUDIO_MANAGER_ACTIVE = true; } catch {}
    // Ensure absolute silence on initial page load
    stopAllAudioInternal();
    return () => { try { delete (window as any).__AUDIO_MANAGER_ACTIVE; } catch {} };
  }, []);

  const stopAllAudioInternal = useCallback(() => {
    const audios: (HTMLAudioElement | null | undefined)[] = [
      foregroundRef.current,
      ambientRef.current,
      sfxRef.current,
      sfx2Ref.current,
    ];
    for (const a of audios) {
      if (!a) continue;
      try { a.pause(); } catch {}
      try { a.currentTime = 0; } catch {}
    }
    foregroundRef.current = null;
    ambientRef.current = null;
    sfxRef.current = null;
    sfx2Ref.current = null;
    // Also defensively stop any stray <audio> elements on the page
    try {
      const all = document.querySelectorAll<HTMLAudioElement>('audio');
      all.forEach(a => { try { a.pause(); a.currentTime = 0; } catch {} });
    } catch {}
  }, []);

  const playStartSequence = useCallback(async (isLoggedIn: boolean) => {
    stopAllAudioInternal();
    // warp
    try { sfxRef.current = await playAudioOnce(SFX.WARP); } catch {}
    // Stop any ambient space music after warp completes
    if (ambientRef.current) {
      try { ambientRef.current.pause(); } catch {}
      try { ambientRef.current.currentTime = 0; } catch {}
      ambientRef.current = null;
    }
    // button
    try { sfx2Ref.current = await playAudioOnce(SFX.BUTTON_BEAM); } catch {}
    // welcome VO (one-shot)
    const welcome = isLoggedIn ? TRACKS.WELCOME_BACK : TRACKS.WELCOME_TO_HEARTVERSE;
    const welcomeSrc = bestSourceForInternal(welcome);
    try {
      const a = new Audio(welcomeSrc);
      a.preload = "auto";
      a.playsInline = true as any;
      foregroundRef.current = a;
      void a.play().catch(() => {});
      a.addEventListener("ended", () => {
        if (foregroundRef.current === a) foregroundRef.current = null;
      }, { once: true } as any);
    } catch {}
  }, [stopAllAudioInternal]);

  // Helper to set current track info and maintain it during warp
  const setCurrentTrackInfo = useCallback((trackId: string) => {
    const trackInfo = TRACK_INFO[trackId.toLowerCase()];
    if (trackInfo) {
      setCurrentTrackInfoState(trackInfo);
    }
  }, []);

  const playSongSequence = useCallback(async (trackKey: TrackKey) => {
    // First, determine which song this is for and update track info immediately
    const trackId = Object.keys(TRACK_INFO).find(key => {
      const upperKey = key.replace(/-/g, '_').toUpperCase();
      return upperKey === trackKey || trackKey.includes(upperKey);
    });
    
    if (trackId) {
      setCurrentTrackInfo(trackId);
    }
    
    stopAllAudioInternal();
    setIsPlaying(false);
    
    // warp -> button
    try { sfxRef.current = await playAudioOnce(SFX.WARP); } catch {}
    try { sfx2Ref.current = await playAudioOnce(SFX.BUTTON_BEAM); } catch {}
    
    // selected song only (no ambient) 
    const t = TRACKS[trackKey];
    const src = bestSourceForInternal(t);
    const a = new Audio(src);
    a.preload = "auto";
    a.playsInline = true as any;
    
    // Set up event listeners to track playing state
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (foregroundRef.current === a) foregroundRef.current = null;
    };
    
    a.addEventListener("play", handlePlay);
    a.addEventListener("pause", handlePause);  
    a.addEventListener("ended", handleEnded, { once: true } as any);
    
    foregroundRef.current = a;
    void a.play().catch(() => {});
  }, [stopAllAudioInternal, setCurrentTrackInfo]);

  const getCurrentAudio = useCallback(() => {
    return foregroundRef.current;
  }, []);

  const api: AudioManagerApi = useMemo(() => ({
    playStartSequence,
    playSongSequence,
    stopAllAudio: stopAllAudioInternal,
    bestSourceFor: bestSourceForInternal,
    getCurrentAudio,
    currentTrackInfo,
    setCurrentTrackInfo,
    isPlaying,
  }), [
    playStartSequence,
    playSongSequence,
    stopAllAudioInternal,
    getCurrentAudio,
    currentTrackInfo,
    setCurrentTrackInfo,
    isPlaying
  ]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAudioManager() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudioManager must be used within <AudioManagerProvider>");
  return ctx;
}

