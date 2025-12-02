"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";

// Music and voiceover tracks
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
  WJF_DMVRCO: { mp3: "/tracks/we're-just-friends-dmvrco-remix.mp3" },
  WJF_MICKEY_JAS: { mp3: "/tracks/we're-just-friends-mickey-jas-remix.mp3" },
  // Ambient / voiceover
  SPACE_MUSIC: { mp3: "/tracks/space-music.mp3", opus: "/tracks/space-music.opus" },
  WELCOME_TO_HEARTVERSE: { mp3: "/tracks/welcome-to-the-heartverse.mp3", opus: "/tracks/welcome-to-the-heartverse.opus" },
  WELCOME_BACK: { mp3: "/tracks/welcome-back.mp3", opus: "/tracks/welcome-back.opus" },
} as const;

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
  const foregroundRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const sfxRef = useRef<HTMLAudioElement | null>(null);
  const sfx2Ref = useRef<HTMLAudioElement | null>(null);

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
    // button
    try { sfx2Ref.current = await playAudioOnce(SFX.BUTTON_BEAM); } catch {}
    // ambient loop
    const ambientSrc = bestSourceForInternal(TRACKS.SPACE_MUSIC);
    ambientRef.current = playLoopingAudio(ambientSrc);
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

  const playSongSequence = useCallback(async (trackKey: TrackKey) => {
    stopAllAudioInternal();
    // warp -> button
    try { sfxRef.current = await playAudioOnce(SFX.WARP); } catch {}
    try { sfx2Ref.current = await playAudioOnce(SFX.BUTTON_BEAM); } catch {}
    // selected song only (no ambient)
    const t = TRACKS[trackKey];
    const src = bestSourceForInternal(t);
    const a = new Audio(src);
    a.preload = "auto";
    a.playsInline = true as any;
    foregroundRef.current = a;
    void a.play().catch(() => {});
    a.addEventListener("ended", () => {
      if (foregroundRef.current === a) foregroundRef.current = null;
    }, { once: true } as any);
  }, [stopAllAudioInternal]);

  const getCurrentAudio = useCallback(() => {
    return foregroundRef.current;
  }, []);

  const api: AudioManagerApi = {
    playStartSequence,
    playSongSequence,
    stopAllAudio: stopAllAudioInternal,
    bestSourceFor: bestSourceForInternal,
    getCurrentAudio,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAudioManager() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudioManager must be used within <AudioManagerProvider>");
  return ctx;
}

