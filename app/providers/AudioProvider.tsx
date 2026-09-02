"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { trackKeyFromSlug } from "@/utils/trackKeyFromSlug";
import { supabaseTrackUrl as S } from "@/lib/supabaseTrackUrl";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useDailySongProgress, recordSongEndedPlay } from "@/hooks/useDailySongProgress";
import { getNYDateString } from "@/lib/time";

// Song-of-Day completion thresholds
const SOD_COMPLETE_RATIO = 0.99;
const SOD_COMPLETE_REMAINING_SECONDS = 1.0;

// Writable columns for user_song_daily_progress.
// award_date_ny is GENERATED ALWAYS – never include it (or any future generated col).
const USDP_WRITABLE_COLS = [
  'user_id', 'song_id', 'day', 'completed', 'completed_at',
  'completion_percent', 'play_number', 'started_at', 'play_count',
] as const;

/** Strip any non-writable keys (e.g. generated columns) from a daily-progress payload. */
function pickWritableUsdp(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of USDP_WRITABLE_COLS) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
}

function isSongComplete(duration: number, currentTime: number) {
  if (!duration || duration <= 0) return false;
  const ratio = currentTime / duration;
  const remaining = duration - currentTime;
  return ratio >= SOD_COMPLETE_RATIO || remaining <= SOD_COMPLETE_REMAINING_SECONDS;
}

// Anonymous session ID management for tracking logged-out user listens
const ANON_SESSION_ID_KEY = 'anon_session_id';

function getAnonSessionId(): string {
  if (typeof window === 'undefined') return '';

  let anonSessionId = localStorage.getItem(ANON_SESSION_ID_KEY);
  if (!anonSessionId) {
    // Generate a unique anonymous session ID using crypto API
    anonSessionId = crypto.randomUUID();
    localStorage.setItem(ANON_SESSION_ID_KEY, anonSessionId);
  }
  return anonSessionId;
}

// Cache for song slug -> UUID lookups
const songIdCache = new Map<string, string>();

async function getSongUuidBySlug(slug: string): Promise<string | null> {
  // Check cache first
  if (songIdCache.has(slug)) {
    return songIdCache.get(slug) || null;
  }

  try {
    const { data, error } = await supabaseBrowser
      .from('songs')
      .select('id')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      if (process.env.NODE_ENV !== "production") console.warn('🎧 Could not find song UUID for slug:', slug);
      return null;
    }

    // Cache the result
    songIdCache.set(slug, data.id);
    return data.id;
  } catch (err) {
    console.error('🎧 Error looking up song UUID:', err);
    return null;
  }
}

// Track info for audio and visual display
export type TrackInfo = {
  id: string;
  title: string;
  artist?: string;
  coverUrl?: string;
  skyTexture?: string;
  oneLiner?: string;
};

// Audio source files — full-length songs served from Supabase Storage (public bucket).
// Small UI sounds, welcome clips, and space ambience remain in /public.
export const TRACKS = {
  // Use MP3 only for ALONE to avoid loading a missing Opus source
  ALONE: { mp3: S("alone.mp3") },
  // Use MP3 only for ALWAYS ON MY MIND — no Opus source uploaded
  ALWAYS_ON_MY_MIND: { mp3: S("ALWAYS ON MY MIND.mp3") },
  ALWAYS_ON_MY_MIND_ACOUSTIC: { mp3: S("ALWAYS ON MY MIND (ACOUSTIC).mp3") },
  BABY: { mp3: S("baby.mp3"), opus: S("baby.opus") },
  BE_MY_BEE: { mp3: S("be-my-bee.mp3"), opus: S("be-my-bee.opus") },
  BRAIN_FREEZE: { mp3: S("brain-freeze.mp3"), opus: S("brain-freeze.opus") },
  // Uploaded filename matches display title exactly — no Opus source
  FEELING_THIS: { mp3: S("FEELING THIS.mp3") },
  // Actual uploaded filename is uppercase — no lowercase/Opus source exists
  CHEERLEADER: { mp3: S("CHEERLEADER.mp3") },
  // Unreleased early access — uploaded filename matches the display title exactly
  CHEERLEADER_ACOUSTIC: { mp3: S("CHEERLEADER (ACOUSTIC).mp3") },
  COLLIDE: { mp3: S("collide.mp3"), opus: S("collide.opus") },
  MR_BRIGHTSIDE: { mp3: S("MR.BRIGHTSIDE.mp3") },
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
  SUGAR_WERE_GOING_DOWN: { mp3: S("sugar-were-going-down.mp3") },
  WHATS_MY_AGE_AGAIN: { mp3: S("whats-my-age-again.mp3") },
  // Ambient / voiceover — kept local in /public
  SPACE_MUSIC: { mp3: "/tracks/space-music.mp3" },
  WELCOME_TO_HEARTVERSE: { mp3: "/tracks/welcome-to-the-heartverse.mp3", opus: "/tracks/welcome-to-the-heartverse.opus" },
  WELCOME_BACK: { mp3: "/tracks/welcome-back.mp3", opus: "/tracks/welcome-back.opus" },
  // Element planet tracks
  WATER: { mp3: S("WATER.MP3") },
  LIGHTNING: { mp3: S("LIGHTNING.MP3") },
  DARKNESS: { mp3: S("darkness.MP3") },
  HEART: { mp3: S("heart.MP3") },
  CENTER: { mp3: S("center.MP3") },
};

// Track info mapping - links track keys to visual/metadata information
export const TRACK_INFO: Record<string, TrackInfo> = {
  'alone': {
    id: 'alone',
    title: 'ALONE',
    artist: 'CHXNDLER',
    oneLiner: 'Lost in a crowd under city lights.'
  },
  'always-on-my-mind': {
    id: 'always-on-my-mind',
    title: 'ALWAYS ON MY MIND',
    artist: 'CHXNDLER',
    coverUrl: '/covers/ALWAYS ON MY MIND.webp',
    oneLiner: "Even goodbyes can't erase you."
  },
  'always-on-my-mind-acoustic': {
    id: 'always-on-my-mind-acoustic',
    title: 'ALWAYS ON MY MIND (ACOUSTIC)',
    artist: 'CHXNDLER',
    coverUrl: '/covers/ALWAYS ON MY MIND (ACOUSTIC).webp',
    oneLiner: "Even goodbyes can't erase you."
  },
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
  'ocean-girl-remix': {
    id: 'ocean-girl-remix',
    title: 'OCEAN GIRL (REMIX)',
    artist: 'CHXNDLER',
    coverUrl: '/covers/OCEAN GIRL (REMIX).webp',
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
  'brain-freeze': {
    id: 'brain-freeze',
    title: 'BRAIN FREEZE',
    artist: 'CHXNDLER',
    coverUrl: '/covers/BRAIN FREEZE.webp',
    skyTexture: '/sky/brain-freeze-sky.webp',
    oneLiner: 'A rush of emotion and chaos from chasing summer highs.'
  },
  'collide': {
    id: 'collide',
    title: 'COLLIDE',
    artist: 'CHXNDLER',
    coverUrl: '/covers/COLLIDE.webp',
    skyTexture: '/sky/collide-sky.webp',
    oneLiner: 'Two souls crash into fate.'
  },
  'cheerleader': {
    id: 'cheerleader',
    title: 'CHEERLEADER',
    artist: 'CHXNDLER',
    coverUrl: '/covers/cheerleader.webp',
    oneLiner: 'Signal unlocked for DREAMERS & LOVERS.'
  },
  'cheerleader-acoustic': {
    id: 'cheerleader-acoustic',
    title: 'CHEERLEADER (ACOUSTIC)',
    artist: 'CHXNDLER',
    coverUrl: '/covers/CHEERLEADER (ACOUSTIC).webp',
    oneLiner: 'Wanting the person you love most to be cheering in the crowd.'
  },
  'game-boy-heart': {
    id: 'game-boy-heart',
    title: 'GAME BOY HEART',
    artist: 'CHXNDLER',
    coverUrl: '/covers/GAME BOY HEART.webp',
    skyTexture: '/sky/game-boy-heart-sky.webp',
    oneLiner: 'Escaping into an 8-bit dream.'
  },
  'feeling-this': {
    id: 'feeling-this',
    title: 'FEELING THIS',
    artist: 'CHXNDLER',
    coverUrl: '/covers/FEELING THIS.webp',
    oneLiner: 'Skin, sweat, and emotion take over.'
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
  'were-just-friends-dmvrco-remix': {
    id: 'were-just-friends-dmvrco-remix',
    title: 'WE\'RE JUST FRIENDS (DMVRCO Remix)',
    artist: 'CHXNDLER',
    coverUrl: '/covers/WE\'RE JUST FRIENDS (DMVRCO REMIX).webp',
    skyTexture: '/sky/were-just-friends-sky.webp',
    oneLiner: 'Lines blur between us.'
  },
  'were-just-friends-mickey-jas-remix': {
    id: 'were-just-friends-mickey-jas-remix',
    title: 'WE\'RE JUST FRIENDS (mickey jas Remix)',
    artist: 'CHXNDLER',
    coverUrl: '/covers/WE\'RE JUST FRIENDS (MICKEY JAS REMIX).webp',
    skyTexture: '/sky/were-just-friends-sky.webp',
    oneLiner: 'Lines blur between us.'
  },
  'sugar-were-going-down': {
    id: 'sugar-were-going-down',
    title: "SUGAR, WE'RE GOING DOWN",
    artist: 'CHXNDLER',
    coverUrl: "/covers/SUGAR, WE'RE GOING DOWN.webp",
    oneLiner: 'Fall Out Boy cover'
  },
  'whats-my-age-again': {
    id: 'whats-my-age-again',
    title: "WHAT'S MY AGE AGAIN?",
    artist: 'CHXNDLER',
    coverUrl: "/covers/WHAT'S MY AGE AGAIN.webp",
    oneLiner: 'Blink-182 cover'
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
  trackingSlug: string | null; // Original slug for daily progress tracking (not normalized)
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
  preloadTrack: (trackId: string) => void; // Load track without playing
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
    warpCompleted: false,
    trackingSlug: null
  });

  // Listen session tracking - robust lifecycle
  type ListenSession = {
    trackId: string;
    startedAt: Date;
    listenedSeconds: number;
    flushed: boolean;
  };
  const sessionRef = useRef<ListenSession | null>(null);
  const listenIntervalRef = useRef<number | null>(null);
  const currentTrackRef = useRef<string | null>(null);
  const lastCurrentTimeRef = useRef<number>(0); // Track previous currentTime for repeat detection
  const flushInFlightRef = useRef<boolean>(false); // Guard against concurrent flushSession calls
  const authUserRef = useRef<{ id: string } | null>(null); // Cached auth user from subscription
  

  // Play tracking - debounce duplicate play events per song
  const lastPlayTrackRef = useRef<{ songId: string; timestamp: number } | null>(null);
  const PLAY_DEBOUNCE_MS = 1500;

  // Song of Day claim tracking - prevent duplicate HeartCoin awards per song per day
  // Format: { songId: UUID, day: 'YYYY-MM-DD' }
  const lastSotdClaimRef = useRef<{ songId: string; day: string } | null>(null);

  // Completion tracking - prevent duplicate completed=true writes per user+day+songId
  // Keys format: `${userId}|${songUuid}|${YYYY-MM-DD}` (NY time)
  const completedOnceRef = useRef<Set<string>>(new Set());

  // Song of Day completion tracking - prevent duplicate claims per (day + songId)
  // Keys format: `${day}:${songId}`
  const completedSotdRef = useRef<Set<string>>(new Set());

  // Ref to track Song of the Day ID (avoids stale closure in callbacks)
  const songOfDayIdRef = useRef<string | null>(null);

  // Refs to track warp state for playerStore subscription (avoids stale closure issues)
  const warpCompletedRef = useRef<boolean>(state.warpCompleted);
  const pendingTrackRef = useRef<string | null>(state.pendingTrack);

  // Record play event - called when audio "play" event fires
  // This only tracks play starts for analytics, NOT Song of Day awards
  // HeartCoin awards happen on completion via claimSongOfDayIfEligible
  const recordPlayEvent = async (trackSlug: string): Promise<void> => {
    try {
      // Get song UUID for tracking
      const songUuid = await getSongUuidBySlug(trackSlug);
      if (!songUuid) {
        if (process.env.NODE_ENV !== "production") console.warn('[TRACK] Cannot record play - song UUID not found for:', trackSlug);
        return;
      }

      // Check if this play should be debounced
      const now = Date.now();
      const lastPlay = lastPlayTrackRef.current;

      if (lastPlay && lastPlay.songId === songUuid && (now - lastPlay.timestamp) < PLAY_DEBOUNCE_MS) {
        if (process.env.NODE_ENV !== "production") console.log('[TRACK] Debounced duplicate play event', {
          songId: songUuid,
          timeSinceLastPlay: now - lastPlay.timestamp
        });
        return;
      }

      // Update last play timestamp
      lastPlayTrackRef.current = { songId: songUuid, timestamp: now };

      // Check authentication
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      if (!sessionData?.session?.user) {
        // Not authenticated - skip tracking silently
        return;
      }

      // Log play start event (analytics only, no HeartCoin award)
      if (process.env.NODE_ENV !== "production") console.log('[TRACK] play started', {
        songId: songUuid,
        songName: state.currentTrack?.title || trackSlug
      });

      // Note: Completion award/claims are handled by backend triggers based on daily_progress
    } catch (err) {
      console.error('[TRACK] recordPlayEvent error', {
        error: err,
        message: (err as any)?.message,
      });
    }
  };

  // Guard: ensure Song of Day completion triggers once per playback session
  const sodFiredRef = useRef<boolean>(false);
  

  // General completion marker for any track (not just Song of the Day)
  // Ensures we upsert completed=true, completed_at, completion_percent
  const markSongCompleted = async (songUuid: string, completionPercent: number = 1): Promise<void> => {
    try {
      // Guard: skip entirely when not logged in — avoids 403 on /auth/v1/user
      const { data: { session: markSession } } = await supabaseBrowser.auth.getSession();
      if (!markSession?.user) {
        if (process.env.NODE_ENV !== "production") console.log('[MARK COMPLETE] skipped: no session');
        return;
      }
      const { data: userData, error: userErr } = await supabaseBrowser.auth.getUser();
      const user = userData?.user || null;
      if (userErr || !user) {
        if (process.env.NODE_ENV !== "production") console.log('[MARK COMPLETE] skipped: getUser returned no user');
        return;
      }

      const day = getNYDateString();
      const key = `${user.id}|${songUuid}|${day}`;
      if (completedOnceRef.current.has(key)) {
        if (process.env.NODE_ENV !== "production") console.log('[MARK COMPLETE] skipped: already marked this user/song/day', { songUuid, day, userId: user.id });
        return;
      }

      // Only set completed=true when this song is the Song of the Day.
      // For non-SOTD songs, omit the flag so the backend trigger (which awards the
      // SOTD HeartCoin on completed=true) never fires for the wrong song.
      const now = new Date().toISOString();
      const isSotd = !!songOfDayIdRef.current && songUuid === songOfDayIdRef.current;
      const payload = pickWritableUsdp({
        user_id: user.id,
        song_id: songUuid,
        day,
        completion_percent: 1,
        ...(isSotd ? { completed: true, completed_at: now } : {}),
      });

      // NOTE: the live DB's unique constraint on user_song_daily_progress is
      // (user_id, song_id, day) — NOT (user_id, song_id, day, play_number).
      // The migrations that widened it to include play_number were never
      // applied in production (confirmed via direct PostgREST probing), so
      // onConflict must match the 3-column constraint or every upsert 42P10s.
      console.log('[MARK COMPLETE] pre-upsert', {
        songUuid,
        day,
        userId: user.id,
        isSotd,
        songOfDayIdRef: songOfDayIdRef.current,
        willSetCompleted: isSotd,
        payload,
      });
      const { data: markCompleteData, error } = await supabaseBrowser
        .from('user_song_daily_progress')
        .upsert(payload, { onConflict: 'user_id,song_id,day', ignoreDuplicates: false })
        .select();
      console.log('[MARK COMPLETE] post-upsert', {
        songUuid,
        day,
        isSotd,
        returnedRows: markCompleteData,
        affectedRowCompleted: markCompleteData?.[0]?.completed,
        affectedRowCompletedAt: markCompleteData?.[0]?.completed_at,
        error,
      });
      if (error) {
        const errCode = (error as any)?.code;
        const errMsg = (error as any)?.message ?? '';
        // If the heartcoin transaction already exists (duplicate from a DB trigger),
        // treat it as success — the progress was recorded and the coin already awarded.
        const isHeartcoinDupe =
          errCode === '23505' && errMsg.includes('heartcoin_tx_card_purchase_unique_idx');
        if (!isHeartcoinDupe) {
          console.error('[MARK COMPLETE] upsert error', {
            error,
            code: errCode,
            message: errMsg,
            details: (error as any)?.details,
            hint: (error as any)?.hint,
            table: 'user_song_daily_progress',
            payload,
          });
          return;
        }
        if (process.env.NODE_ENV !== "production") console.log('[MARK COMPLETE] heartcoin already awarded (duplicate trigger) — treating as success', {
          code: errCode,
          songUuid,
          day,
        });
      }

      completedOnceRef.current.add(key);
      if (process.env.NODE_ENV !== "production") console.log('[MARK COMPLETE] success', { songUuid, day, userId: user.id });
      // Broadcast completion so UI (e.g., badges modal) can refresh progress
      try {
        window.dispatchEvent(new CustomEvent('song:completed', { detail: { songUuid, day } }));
      } catch {}

      // Also trigger Song of the Day claim if this is the SOTD
      // markDailySongCompleted has its own guards and will no-op if not applicable
      console.log('[MARK COMPLETE] calling markDailySongCompleted', { songUuid, isSotd });
      markDailySongCompleted(songUuid);
    } catch (err) {
      console.error('[MARK COMPLETE] exception', {
        error: err,
        message: (err as any)?.message,
      });
    }
  };

  // Mark the Song of the Day as completed and insert claim
  // Idempotent: only runs once per (day + songId) combination (guarded here and by DB onConflict)
  const markDailySongCompleted = async (songUuid: string): Promise<void> => {
    try {
      // Guard: require authenticated user
      const user = authUserRef.current;
      if (!user) {
        if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] skipped: no authenticated user');
        return;
      }

      // Guard: require songUuid
      if (!songUuid) {
        if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] skipped: no songUuid provided');
        return;
      }

      // Guard: only complete the Song of the Day
      const currentSongOfDayId = songOfDayIdRef.current;
      if (!currentSongOfDayId) {
        if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] skipped: no Song of the Day configured');
        return;
      }
      if (songUuid !== currentSongOfDayId) {
        if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] skipped: not Song of the Day', {
          songUuid,
          currentSongOfDayId
        });
        return;
      }

      // Get today's date in NY timezone
      const nyDayString = getNYDateString();
      const nowIso = new Date().toISOString();

      // Guard: check if we already completed this song today (in-memory cache)
      const completionKey = `${nyDayString}:${songUuid}`;
      if (completedSotdRef.current.has(completionKey)) {
        if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] skipped: already completed today', {
          songUuid,
          day: nyDayString
        });
        return;
      }

      // Get audio details for logging
      const audioEl = audioRef.current;
      const currentTime = audioEl?.currentTime ?? 0;
      const duration = audioEl?.duration ?? 0;

      if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] Marking daily song completed', {
        songUuid,
        day: nyDayString,
        currentTime: currentTime.toFixed(2),
        duration: duration.toFixed(2)
      });

      // 1) Upsert to user_song_daily_progress with completed=true and completed_at
      // NOTE: the live DB's unique constraint is (user_id, song_id, day) — the
      // migration widening it to include play_number was never applied in
      // production (confirmed via direct PostgREST probing), so onConflict
      // must target the 3-column constraint or this upsert 42P10s.
      const progressPayload = pickWritableUsdp({
        user_id: user.id,
        song_id: songUuid,
        day: nyDayString,
        completed: true,
        completion_percent: 1,
        completed_at: nowIso,
      });

      console.log('[SOTD-COMPLETE] pre-upsert', {
        songUuid,
        day: nyDayString,
        userId: user.id,
        currentSongOfDayId,
        payload: progressPayload,
      });
      const { data: progressData, error: progressError } = await supabaseBrowser
        .from('user_song_daily_progress')
        .upsert(progressPayload, { onConflict: 'user_id,song_id,day', ignoreDuplicates: false })
        .select();
      console.log('[SOTD-COMPLETE] post-upsert', {
        songUuid,
        day: nyDayString,
        returnedRows: progressData,
        affectedRowCompleted: progressData?.[0]?.completed,
        affectedRowCompletedAt: progressData?.[0]?.completed_at,
        error: progressError,
      });

      if (progressError) {
        const pErrCode = (progressError as any)?.code;
        const pErrMsg = (progressError as any)?.message ?? '';
        console.error('[SOTD-COMPLETE] user_song_daily_progress upsert error (continuing to claim anyway)', {
          error: progressError,
          code: pErrCode,
          message: pErrMsg,
          details: (progressError as any)?.details,
          hint: (progressError as any)?.hint,
          payload: progressPayload,
        });
        // Do NOT return — still attempt claim insertion so the HeartCoin is awarded
      } else {
        if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] user_song_daily_progress upsert success', {
          returned: progressData,
          songUuid,
          day: nyDayString,
        });
      }

      // 2) Insert to user_song_of_day_claims to trigger award via DB trigger
      // Guard: ensure we do not spam claim writes within the same session
      const lastClaim = lastSotdClaimRef.current;
      if (lastClaim && lastClaim.songId === songUuid && lastClaim.day === nyDayString) {
        if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] Claim skipped (already attempted this session)', {
          songUuid,
          day: nyDayString,
        });
      } else {
        const claimPayload = {
          user_id: user.id,
          day: nyDayString,
          song_id: songUuid,
          claimed_at: nowIso,
        } as const;

        if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] Inserting user_song_of_day_claims payload', claimPayload);
        let claimSuccess = false;
        let claimId: string | null = null;

        try {
          const { data: claimData, error: claimError } = await supabaseBrowser
            .from('user_song_of_day_claims')
            .insert(claimPayload)
            .select()
            .single();

          if (claimError) {
            // Check for duplicate key (already claimed today)
            const code = (claimError as any)?.code;
            if (code === '23505') {
              if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] Claim already exists for today');
              lastSotdClaimRef.current = { songId: songUuid, day: nyDayString };
              // Still mark as success for UI update purposes
              claimSuccess = true;
            } else {
              const triggerHint =
                code === 'P0001' ? 'Trigger raised an exception (check heartcoin award/transaction trigger)' :
                code === '23503' ? 'Foreign-key violation inside a downstream trigger (user_heartcoin_awards or heartcoin_transactions)' :
                code === '42501' ? 'Insufficient privilege — RLS may block the trigger-inserted row' :
                null;
              console.error('[SOTD-COMPLETE] user_song_of_day_claims insert error', {
                error: claimError,
                code,
                message: (claimError as any)?.message,
                details: (claimError as any)?.details,
                hint: (claimError as any)?.hint,
                ...(triggerHint ? { triggerDiagnostic: triggerHint } : {}),
                table: 'user_song_of_day_claims',
                payload: claimPayload,
              });
            }
          } else {
            // Update session guard for claims
            lastSotdClaimRef.current = { songId: songUuid, day: nyDayString };
            claimId = claimData?.id || null;
            claimSuccess = true;
            if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] Claim inserted successfully', {
              returnedRow: claimData,
              claimId,
            });
          }
        } catch (claimErr: any) {
          // Ignore duplicate key (already claimed today)
          const code = claimErr?.code || claimErr?.data?.code || claimErr?.status;
          if (code === '23505') {
            if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] Claim already exists for today');
            lastSotdClaimRef.current = { songId: songUuid, day: nyDayString };
            claimSuccess = true;
          } else {
            const pgCode = claimErr?.code;
            const triggerHint =
              pgCode === 'P0001' ? 'Trigger raised an exception (check heartcoin award/transaction trigger)' :
              pgCode === '23503' ? 'Foreign-key violation inside a downstream trigger (user_heartcoin_awards or heartcoin_transactions)' :
              pgCode === '42501' ? 'Insufficient privilege — RLS may block the trigger-inserted row' :
              null;
            console.error('[SOTD-COMPLETE] user_song_of_day_claims insert error', {
              error: claimErr,
              code: pgCode,
              message: claimErr?.message,
              details: claimErr?.details,
              hint: claimErr?.hint,
              ...(triggerHint ? { triggerDiagnostic: triggerHint } : {}),
              table: 'user_song_of_day_claims',
              payload: claimPayload,
            });
          }
        }

        try {
          // Refresh SOTD status
          window.dispatchEvent(new CustomEvent('songOfDay:refresh'));

          // Notify HeartcoinBalanceProvider that SOTD quest was completed.
          // Balance update is handled server-side: the DB trigger on
          // user_song_of_day_claims inserts a heartcoin_transactions row,
          // and the realtime subscription picks it up.
          window.dispatchEvent(new CustomEvent('dailySongQuestCompleted', {
            detail: {
              day: nyDayString,
              claimId,
              claimSuccess,
            }
          }));

          if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] Dispatched completion events', {
            claimId,
            claimSuccess,
          });
        } catch (eventErr) {
          if (process.env.NODE_ENV !== "production") console.warn('[SOTD-COMPLETE] Failed to dispatch events', eventErr);
        }
      }

      // Mark as completed in our in-memory cache (prevents re-running completion logic)
      completedSotdRef.current.add(completionKey);

      if (process.env.NODE_ENV !== "production") console.log('[SOTD-COMPLETE] Completed progress+claim flow', {
        songUuid,
        day: nyDayString,
        returnedRow: progressData?.[0] || progressData,
      });

    } catch (err) {
      console.error('[SOTD-COMPLETE] exception', {
        error: err,
        message: (err as any)?.message
      });
    }
  };

  // Flush session to DB - call this before switching tracks, on pause, on ended, on visibility hidden, on beforeunload
  // minSeconds: minimum listened_seconds required to record (2 for pause, 0 for track end/switch)
  const flushSession = async (minSeconds: number = 0): Promise<boolean> => {
    const session = sessionRef.current;
    if (!session || session.flushed) return false;

    // Prevent concurrent flush calls
    if (flushInFlightRef.current) return false;
    flushInFlightRef.current = true;

    const listenedSeconds = Math.max(0, Math.floor(session.listenedSeconds));

    // Check minimum threshold
    if (listenedSeconds < minSeconds) {
      flushInFlightRef.current = false;
      return false;
    }

    // Mark as flushed immediately to prevent duplicates
    session.flushed = true;

    // Stop the listen interval
    if (listenIntervalRef.current) {
      clearInterval(listenIntervalRef.current);
      listenIntervalRef.current = null;
    }

    try {
      // Get audio duration if available (needed for both logged-in and anonymous)
      const audio = audioRef.current;
      const durationSeconds = audio?.duration && !isNaN(audio.duration)
        ? Math.floor(audio.duration)
        : null;

      // Check session first - missing session means logged-out user
      const { data: { session: authSession }, error: sessionError } = await supabaseBrowser.auth.getSession();

      // Handle logged-out users - track anonymously
      if (!authSession) {
        // Guard log once
        if (!(flushSession as any)._skippedLogged) {
          (flushSession as any)._skippedLogged = true;
          if (process.env.NODE_ENV !== "production") console.log('[DailyProgress] skipped: no session');
        }
        // Look up the song UUID for the anonymous_song_listen_sessions table
        const songUuid = await getSongUuidBySlug(session.trackId);
        if (!songUuid) {
          if (process.env.NODE_ENV !== "production") console.warn('🎧 Cannot track anonymous listen - song UUID not found for:', session.trackId);
          flushInFlightRef.current = false;
          return false;
        }

        const anonSessionId = getAnonSessionId();
        if (!anonSessionId) {
          if (process.env.NODE_ENV !== "production") console.warn('🎧 Cannot track anonymous listen - no anon session ID');
          flushInFlightRef.current = false;
          return false;
        }

        // Build anonymous tracking payload - similar to logged-in sessions
        const anonPayload = {
          anon_session_id: anonSessionId,
          song_uuid: songUuid,
          started_at: session.startedAt.toISOString(),
          ended_at: new Date().toISOString(),
          source: 'web',
          listened_seconds: listenedSeconds,
          duration_seconds: durationSeconds
        };

        if (process.env.NODE_ENV !== "production") console.log('🎧 Flushing anonymous session:', JSON.stringify(anonPayload, null, 2));

        const { error: anonInsertError } = await supabaseBrowser
          .from('anonymous_song_listen_sessions')
          .insert(anonPayload);

        if (anonInsertError) {
          console.error('🎧 Anonymous insert failed:', {
            error: anonInsertError,
            errorCode: anonInsertError?.code,
            errorMessage: anonInsertError?.message,
            errorDetails: (anonInsertError as any)?.details,
            errorHint: (anonInsertError as any)?.hint,
            payload: anonPayload,
            hasSession: false,
          });
          flushInFlightRef.current = false;
          return false;
        }

        if (process.env.NODE_ENV !== "production") console.log(`🎧 Recorded anonymous: ${session.trackId}, ${listenedSeconds}s`);
        flushInFlightRef.current = false;
        return true;
      }

      // Only log errors for unexpected issues (network, misconfig), not missing session
      if (sessionError) {
        console.error('🎧 Auth error:', sessionError.message);
        flushInFlightRef.current = false;
        return false;
      }

      // Use session.user directly instead of calling getUser()
      const user = authSession.user;
      if (!user) {
        flushInFlightRef.current = false;
        return false;
      }

      const durationMs = durationSeconds !== null ? durationSeconds * 1000 : null;

      // Build payload with exact snake_case DB columns
      const payload = {
        user_id: user.id,
        song_id: String(session.trackId),
        started_at: session.startedAt.toISOString(),
        ended_at: new Date().toISOString(),
        listened_seconds: listenedSeconds,
        duration_seconds: durationSeconds,
        duration_ms: durationMs,
        source: 'player',
        metadata: null
      };

      if (process.env.NODE_ENV !== "production") console.log('🎧 Flushing session:', JSON.stringify(payload, null, 2));

      const { error: insertError } = await supabaseBrowser
        .from('song_listen_sessions')
        .insert(payload);

      if (insertError) {
        console.error('🎧 Insert failed:', {
          error: insertError,
          errorCode: insertError?.code,
          errorMessage: insertError?.message,
          errorDetails: (insertError as any)?.details,
          errorHint: (insertError as any)?.hint,
          payload,
          hasSession: true,
          userId: user.id,
        });
        flushInFlightRef.current = false;
        return false;
      }

      if (process.env.NODE_ENV !== "production") console.log(`🎧 Recorded: ${session.trackId}, ${listenedSeconds}s`);

      // Also upsert to user_song_daily_progress for logged-in users
      try {
        const songUuid = await getSongUuidBySlug(session.trackId);
        if (songUuid) {
          // Build minimal payload: only valid columns per schema
          const nyDay = getNYDateString();
          // Guard: ensure both IDs exist
          if (!user?.id || !songUuid) {
            return;
          }

          const dailyProgressPayload = pickWritableUsdp({
            user_id: user.id,
            song_id: songUuid,
            day: nyDay, // explicit NY date; DB has default but we pass for clarity
          });

          // Live DB's unique constraint is (user_id, song_id, day) — see note above.
          if (process.env.NODE_ENV !== "production") console.log('[DailyProgress Payload]', dailyProgressPayload);
          const { error: dailyProgressError } = await supabaseBrowser
            .from('user_song_daily_progress')
            .upsert(dailyProgressPayload, { onConflict: 'user_id,song_id,day', ignoreDuplicates: false });

          if (dailyProgressError) {
            console.error('[DailyProgress Upsert Error]', {
              error: dailyProgressError,
              code: (dailyProgressError as any)?.code,
              message: (dailyProgressError as any)?.message,
              details: (dailyProgressError as any)?.details,
              hint: (dailyProgressError as any)?.hint,
              table: 'user_song_daily_progress',
              payload: dailyProgressPayload,
            });
          } else {
            if (process.env.NODE_ENV !== "production") console.log(`🎧 Upserted daily progress row for ${session.trackId} on ${nyDay}`);
          }
        }
      } catch (dailyProgressErr) {
        console.error('🎧 Daily progress update exception:', dailyProgressErr);
        // Don't fail the whole flush if daily progress fails
      }

      flushInFlightRef.current = false;
      return true;
    } catch (err) {
      console.error('🎧 Error flushing session:', err);
      flushInFlightRef.current = false;
      return false;
    }
  };

  // Start a new listen session for a track
  const startListenSession = (trackId: string) => {
    // Flush any existing session first
    if (sessionRef.current && !sessionRef.current.flushed) {
      flushSession(0); // Flush with 0 min when switching tracks
    }

    // Clear any existing interval
    if (listenIntervalRef.current) {
      clearInterval(listenIntervalRef.current);
      listenIntervalRef.current = null;
    }

    // Reset lastCurrentTimeRef to avoid false repeat detection
    lastCurrentTimeRef.current = 0;

    // Create new session
    sessionRef.current = {
      trackId,
      startedAt: new Date(),
      listenedSeconds: 0,
      flushed: false
    };

    // Start 1-second interval to track listen time
    listenIntervalRef.current = window.setInterval(() => {
      const audio = audioRef.current;
      if (audio && !audio.paused && sessionRef.current && !sessionRef.current.flushed) {
        sessionRef.current.listenedSeconds += 1;
      }
    }, 1000);

    if (process.env.NODE_ENV !== "production") console.log(`🎧 Started session: ${trackId}`);
    // Reset SOTD completion trigger for new playback session
    sodFiredRef.current = false;

    // Increment play_count for this play start via RPC (once per session start)
    try {
      const user = authUserRef.current;
      if (user) {
        getSongUuidBySlug(trackId).then(async (songUuid) => {
          if (!songUuid) return;
          const nyDay = getNYDateString();
          if (process.env.NODE_ENV !== "production") console.log('[PLAY COUNT] increment_song_play RPC', { song_id: songUuid, day: nyDay });
          const { error: incErr } = await supabaseBrowser.rpc('increment_song_play', { p_song_id: songUuid });
          if (incErr) {
            console.error('[PLAY COUNT] RPC error', {
              error: incErr,
              code: (incErr as any)?.code,
              message: (incErr as any)?.message,
              details: (incErr as any)?.details,
              hint: (incErr as any)?.hint,
              rpc: 'increment_song_play',
              payload: { p_song_id: songUuid },
            });
          }
        }).catch(() => {});
      }
    } catch {}
  };

  // End the current session (flush if meaningful)
  const endListenSession = (minSeconds: number = 2) => {
    if (listenIntervalRef.current) {
      clearInterval(listenIntervalRef.current);
      listenIntervalRef.current = null;
    }
    flushSession(minSeconds);
    sessionRef.current = null;
  };

  // Lazily create audio element once on client
  useEffect(() => {
    if (audioRef.current) return;
    const a = document.createElement("audio");
    a.preload = "none";
    a.crossOrigin = "anonymous";
    a.setAttribute("data-global-audio", "1");
    a.style.display = "none";
    document.body.appendChild(a);
    audioRef.current = a;

    const onTime = async () => {
      const currentTime = a.currentTime;
      const lastTime = lastCurrentTimeRef.current;
      const duration = a.duration || 0;
      const listenedSeconds = sessionRef.current ? Math.max(0, Math.floor(sessionRef.current.listenedSeconds)) : 0;
      const trackLengthSeconds = isFinite(duration) && duration > 0 ? Math.floor(duration) : 0;

      // Detect repeat: currentTime jumped backwards significantly (from near end to near start)
      // This catches loop mode and manual repeat without onended firing
      if (
        duration > 10 && // Only for tracks longer than 10 seconds
        lastTime > duration - 5 && // Was near the end (within 5 seconds)
        currentTime < 3 && // Now near the start
        sessionRef.current &&
        !sessionRef.current.flushed &&
        sessionRef.current.listenedSeconds >= 2 // Had meaningful listen time
      ) {
        if (process.env.NODE_ENV !== "production") console.log(`🎧 Repeat detected: ${lastTime.toFixed(1)}s -> ${currentTime.toFixed(1)}s (duration: ${duration.toFixed(1)}s)`);
        // On repeat, mark completion once (progress only)
        if (currentTrackRef.current && !sodFiredRef.current) {
          sodFiredRef.current = true;
          getSongUuidBySlug(currentTrackRef.current).then(songUuid => {
            if (songUuid) {
              markSongCompleted(songUuid, 1.0);
            }
          }).catch(() => {});
        }
        // Flush the completed playthrough and start a new session
        flushSession(0).then(() => {
          if (currentTrackRef.current && !a.paused) {
            startListenSession(currentTrackRef.current);
          }
        });
      }

      // Update last time ref
      lastCurrentTimeRef.current = currentTime;

      // Update state
      setState(s => ({ ...s, currentTime }));

      // Upsert per-day song progress for logged-in users
      try {
        const user = authUserRef.current;
        if (!user) {
          // Guard log once per page load to avoid console spam
          (onTime as any)._skippedLogged = (onTime as any)._skippedLogged || false;
          if (!(onTime as any)._skippedLogged) {
            (onTime as any)._skippedLogged = true;
            if (process.env.NODE_ENV !== "production") console.log('[DailyProgress] skipped: no session');
          }
          return; // Do not attempt to write if logged out
        }

        const slug = currentTrackRef.current;
        if (!slug) return;

        // Throttle DB writes to reduce load (5s)
        const now = Date.now();
        (onTime as any)._lastUpsertAt = (onTime as any)._lastUpsertAt || 0;
        if (now - (onTime as any)._lastUpsertAt < 5000) return; // 5s throttle
        (onTime as any)._lastUpsertAt = now;

        // Resolve song UUID (cached inside helper)
        const songUuid = await getSongUuidBySlug(slug);
        if (!songUuid) return;

        const nyDay = getNYDateString();
        // If already completed for this user/song/day, stop progress upserts
        const completeKey = `${user.id}|${songUuid}|${nyDay}`;
        if (completedOnceRef.current.has(completeKey)) return;

        // Only update completion_percent when we have a finite duration
        const dur = a?.duration ?? 0;
        if (!isFinite(dur) || dur <= 0) return;
        const pct = Math.max(0, Math.min(0.999, (a?.currentTime ?? 0) / dur));

        // Guard: ensure both IDs exist
        if (!user?.id || !songUuid) return;
        // Progress payload with incremental completion_percent
        const dailyProgressPayload = pickWritableUsdp({
          user_id: user.id,
          song_id: songUuid,
          day: nyDay,
          completion_percent: pct,
        });

        // Live DB's unique constraint is (user_id, song_id, day) — see note above.
        if (process.env.NODE_ENV !== "production") console.log('[DailyProgress Payload]', dailyProgressPayload);
        const { error: dailyProgressError } = await supabaseBrowser
          .from('user_song_daily_progress')
          .upsert(dailyProgressPayload, { onConflict: 'user_id,song_id,day', ignoreDuplicates: false });

        if (dailyProgressError) {
          console.error('[DailyProgress Upsert Error]', {
            error: dailyProgressError,
            code: (dailyProgressError as any)?.code,
            message: (dailyProgressError as any)?.message,
            details: (dailyProgressError as any)?.details,
            hint: (dailyProgressError as any)?.hint,
            table: 'user_song_daily_progress',
            payload: dailyProgressPayload,
          });
        }
      } catch (progressErr) {
        // Be quiet on errors here to avoid console spam; detailed errors are logged above
      }

      // Completion checks (two signals) and logging
      const percent = duration > 0 ? currentTime / duration : 0;
      const meetsTimeRatio = isFinite(duration) && duration > 0 && percent >= 0.995;
      const meetsListenedThreshold = trackLengthSeconds > 0 && listenedSeconds >= Math.floor(0.995 * trackLengthSeconds);

      if (!sodFiredRef.current && (meetsTimeRatio || meetsListenedThreshold)) {
        if (process.env.NODE_ENV !== "production") console.log('[COMPLETE CHECK]', {
          currentTime: Number.isFinite(currentTime) ? Number(currentTime.toFixed(2)) : currentTime,
          duration: Number.isFinite(duration) ? Number(duration.toFixed(2)) : duration,
          percent: Number(percent.toFixed(4)),
          listenedSeconds,
          trackLengthSeconds,
          signal: meetsTimeRatio ? 'time_ratio' : 'listened_seconds',
        });

        const slug = currentTrackRef.current;
        if (slug) {
          sodFiredRef.current = true;
          const comp = Math.max(0.995, Math.min(1, percent || (trackLengthSeconds > 0 ? listenedSeconds / trackLengthSeconds : 1)));
          // Always mark general completion
          getSongUuidBySlug(slug).then(songUuid => {
            if (songUuid) {
              markSongCompleted(songUuid, comp);
            }
          }).catch(() => {});
        }
      }
    };
    const onDur = () => setState(s => ({ ...s, duration: a.duration || 0 }));
    const onPlay = () => {
      if (process.env.NODE_ENV !== "production") console.log('🎵 AudioProvider: onPlay event fired');
      setState(s => ({ ...s, playing: true, isLoading: false }));
      // Suppress macOS Now Playing / Apple Music HUD on every play event
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      }

      // Record play event for analytics
      if (currentTrackRef.current) {
        recordPlayEvent(currentTrackRef.current);
      }

      // Start listen session tracking (or resume if paused)
      if (currentTrackRef.current) {
        if (!sessionRef.current || sessionRef.current.flushed || sessionRef.current.trackId !== currentTrackRef.current) {
          startListenSession(currentTrackRef.current);
        } else if (!listenIntervalRef.current) {
          // Resume the interval if session exists but interval stopped
          listenIntervalRef.current = window.setInterval(() => {
            const audio = audioRef.current;
            if (audio && !audio.paused && sessionRef.current && !sessionRef.current.flushed) {
              sessionRef.current.listenedSeconds += 1;
            }
          }, 1000);
        }
      }
    };
    const onPause = () => {
      if (process.env.NODE_ENV !== "production") console.log('🎵 AudioProvider: onPause event fired');
      setState(s => ({ ...s, playing: false }));
      // Flush listen session with 2-second minimum threshold
      if (sessionRef.current && !sessionRef.current.flushed) {
        flushSession(2);
      }
    };
    const onVol = () => setState(s => ({ ...s, volume: a.volume }));
    const onLoadStart = () => setState(s => ({ ...s, isLoading: true }));
    const onLoadEnd = () => setState(s => ({ ...s, isLoading: false }));

    const onEnded = () => {
      if (process.env.NODE_ENV !== "production") console.log('🎵 AudioProvider: Song ended');
      // Completion handling on ended (once per session)
      try {
        const slug = currentTrackRef.current;
        if (slug && !sodFiredRef.current) {
          sodFiredRef.current = true;
          const aDur = a.duration || 0;
          const aCT = a.currentTime || aDur;
          const percent = aDur > 0 ? aCT / aDur : 1;
          if (process.env.NODE_ENV !== "production") console.log('[COMPLETE CHECK]', {
            currentTime: Number.isFinite(aCT) ? Number(aCT.toFixed(2)) : aCT,
            duration: Number.isFinite(aDur) ? Number(aDur.toFixed(2)) : aDur,
            percent: Number(percent.toFixed(4)),
            listenedSeconds: sessionRef.current ? Math.max(0, Math.floor(sessionRef.current.listenedSeconds)) : 0,
            trackLengthSeconds: isFinite(aDur) && aDur > 0 ? Math.floor(aDur) : 0,
            signal: 'ended',
          });

          // Completion flow (general progress)
          getSongUuidBySlug(slug).then(async songUuid => {
            if (songUuid) {
              await markSongCompleted(songUuid, Math.max(0.995, Math.min(1, percent)));
            }
          }).catch(() => {});
        }
      } catch {}
      // Flush the listen session before restarting (min 0 seconds for track end)
      if (sessionRef.current && !sessionRef.current.flushed) {
        flushSession(0).then(async () => {
          // On full end, mark completion for daily progress
          try {
            const slug = currentTrackRef.current || state.currentTrack?.id || null;
            if (slug) {
              const songUuid = await getSongUuidBySlug(slug);
              if (songUuid) {
                await markSongCompleted(songUuid, 1.0);
              }
            }
          } catch (err) {
            if (process.env.NODE_ENV !== "production") console.warn('Failed end-of-track completion processing:', err);
          }
          // Start a new session for the repeated playback
          if (currentTrackRef.current) {
            startListenSession(currentTrackRef.current);
          }
        });
      }
      // Restart the track
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

    // Also listen to MediaPlayer's audio element for volume sync
    const syncMediaPlayerVolume = () => {
      const mediaPlayerAudio = document.querySelector<HTMLAudioElement>('audio[data-audio-player="1"]');
      if (mediaPlayerAudio) {
        const onMediaPlayerVol = () => setState(s => ({ ...s, volume: mediaPlayerAudio.volume }));
        mediaPlayerAudio.addEventListener("volumechange", onMediaPlayerVol);
        // Sync initial volume from MediaPlayer
        setState(s => ({ ...s, volume: mediaPlayerAudio.volume }));
      }
    };
    // Try immediately and also after a short delay (MediaPlayer might not be mounted yet)
    syncMediaPlayerVolume();
    setTimeout(syncMediaPlayerVolume, 1000);

    // Debug: Track unexpected pauses
    const onPauseDebug = () => {
      if (process.env.NODE_ENV !== "production") console.log('🎵 Audio paused at time:', a.currentTime, 'src:', a.src);
      if (a.currentTime > 0 && a.currentTime < 10) {
        if (process.env.NODE_ENV !== "production") console.log('🎵 ⚠️  Audio paused early! This might be the 4-second stop issue');
        if (process.env.NODE_ENV !== "production") console.log('🎵 Checking if pause was user-initiated or system-caused...');

        // Check if this was an unexpected pause (not user-initiated)
        // If audio was stopped very early, it might be a race condition
        if (a.currentTime < 5 && !a.ended) {
          if (process.env.NODE_ENV !== "production") console.log('🎵 🚨 DETECTED: Potential race condition causing early audio stop');
          if (process.env.NODE_ENV !== "production") console.log('🎵 Current playing state:', state.playing);
          if (process.env.NODE_ENV !== "production") console.log('🎵 Audio src:', a.src);
          if (process.env.NODE_ENV !== "production") console.log('🎵 Audio readyState:', a.readyState);
          if (process.env.NODE_ENV !== "production") console.log('🎵 All audio elements on page:');
          const allAudio = document.querySelectorAll('audio');
          allAudio.forEach((audio, index) => {
            if (process.env.NODE_ENV !== "production") console.log(`🎵 Audio ${index}:`, {
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
      if (process.env.NODE_ENV !== "production") console.log('🎵 Audio ended at time:', a.currentTime, 'duration:', a.duration);
      if (a.currentTime < (a.duration - 1)) {
        if (process.env.NODE_ENV !== "production") console.log('🎵 ⚠️  Audio ended early! This might be the 5-second stop issue');
      }
    };
    a.addEventListener("ended", onEndedDebug);

    // Disable browser media session to prevent title overlays
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
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
      try { if (a.parentElement) a.parentElement.removeChild(a); } catch {}
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
            if (process.env.NODE_ENV !== "production") console.log('🎵 Stopped existing conflicting audio element');
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

  // Sync currentTrackRef when track changes and handle track-to-track transitions
  useEffect(() => {
    const newTrackId = state.currentTrack?.id || null;
    const previousTrackId = currentTrackRef.current;

    // If track changed, flush the old session before starting new one
    if (previousTrackId && newTrackId !== previousTrackId && sessionRef.current && !sessionRef.current.flushed) {
      flushSession(0); // 0 minimum when switching tracks
    }

    // Update the ref
    currentTrackRef.current = newTrackId;

    // Reset SOTD fired guard when song changes
    if (newTrackId !== previousTrackId) {
      sodFiredRef.current = false;
    }

    // If a new track started and we're playing, start a new session
    if (newTrackId && state.playing && (!sessionRef.current || sessionRef.current.flushed || sessionRef.current.trackId !== newTrackId)) {
      startListenSession(newTrackId);
    }
  }, [state.currentTrack?.id, state.playing]);

  // Handle visibilitychange and beforeunload to flush sessions and stop audio
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Stop all audio when page becomes hidden (new tab opened, etc.)
        const a = audioRef.current;
        if (a && !a.paused) {
          if (process.env.NODE_ENV !== "production") console.log('🎧 Page hidden, stopping audio playback');
          try { a.pause(); } catch {}
          setState(s => ({ ...s, playing: false }));
        }

        // Also stop any ambient/intro audio
        try {
          const ambientAudio = document.querySelector<HTMLAudioElement>('audio[data-ambient="1"]');
          const introAudio = document.querySelector<HTMLAudioElement>('audio[data-intro="1"]');
          if (ambientAudio && !ambientAudio.paused) { ambientAudio.pause(); }
          if (introAudio && !introAudio.paused) { introAudio.pause(); }
        } catch {}

        // Flush session if active
        if (sessionRef.current && !sessionRef.current.flushed) {
          if (process.env.NODE_ENV !== "production") console.log('🎧 Page hidden, flushing session');
          flushSession(2); // Require at least 2 seconds
        }
      }
    };

    const handleBeforeUnload = () => {
      if (sessionRef.current && !sessionRef.current.flushed) {
        if (process.env.NODE_ENV !== "production") console.log('🎧 Page unloading, flushing session');
        // Use fetch with keepalive for best-effort flush on unload
        const session = sessionRef.current;
        const listenedSeconds = Math.max(0, Math.floor(session.listenedSeconds));
        if (listenedSeconds >= 2) {
          // Mark as flushed to prevent double-send
          session.flushed = true;
          try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (supabaseUrl && supabaseAnonKey) {
              const audio = audioRef.current;
              const durationSeconds = audio?.duration && !isNaN(audio.duration) ? Math.floor(audio.duration) : null;

              // Get auth token from localStorage
              const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
              const authData = localStorage.getItem(storageKey);

              if (authData) {
                // Logged-in user - send to song_listen_sessions
                const parsed = JSON.parse(authData);
                const userId = parsed?.user?.id;
                const accessToken = parsed?.access_token;
                if (userId && accessToken) {
                  const payload = {
                    user_id: userId,
                    song_id: String(session.trackId),
                    started_at: session.startedAt.toISOString(),
                    ended_at: new Date().toISOString(),
                    listened_seconds: listenedSeconds,
                    duration_seconds: durationSeconds,
                    duration_ms: durationSeconds !== null ? durationSeconds * 1000 : null,
                    source: 'player',
                    metadata: null
                  };
                  // Use fetch with keepalive - allows request to complete after page unloads
                  fetch(`${supabaseUrl}/rest/v1/song_listen_sessions`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': supabaseAnonKey,
                      'Authorization': `Bearer ${accessToken}`,
                      'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(payload),
                    keepalive: true
                  }).catch(() => {}); // Ignore errors on unload
                  if (process.env.NODE_ENV !== "production") console.log('🎧 Sent session via keepalive fetch');
                }
              } else {
                // Anonymous user - send to anonymous_song_listen_sessions
                // Use cached song UUID (song lookups happen during flushSession, so cache should be warm)
                const songUuid = songIdCache.get(session.trackId);
                const anonSessionId = localStorage.getItem(ANON_SESSION_ID_KEY);

                if (songUuid && anonSessionId) {
                  const anonPayload = {
                    anon_session_id: anonSessionId,
                    song_uuid: songUuid,
                    started_at: session.startedAt.toISOString(),
                    ended_at: new Date().toISOString(),
                    source: 'web',
                    listened_seconds: listenedSeconds,
                    duration_seconds: durationSeconds
                  };

                  fetch(`${supabaseUrl}/rest/v1/anonymous_song_listen_sessions`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': supabaseAnonKey,
                      'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(anonPayload),
                    keepalive: true
                  }).catch(() => {}); // Ignore errors on unload
                  if (process.env.NODE_ENV !== "production") console.log('🎧 Sent anonymous session via keepalive fetch');
                }
              }
            }
          } catch (err) {
            console.error('🎧 beforeunload flush failed:', err);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (listenIntervalRef.current) {
        clearInterval(listenIntervalRef.current);
        listenIntervalRef.current = null;
      }
      if (sessionRef.current && !sessionRef.current.flushed) {
        flushSession(0);
      }
    };
  }, []);

  // Auth subscription - track login/logout state for user-dependent operations
  useEffect(() => {
    let mounted = true;

    // Get initial session on mount
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      authUserRef.current = session?.user ?? null;
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          authUserRef.current = session.user;
        }
      } else if (event === 'SIGNED_OUT' || !session) {
        // Clear cached user - any in-progress session flush will handle missing auth gracefully
        authUserRef.current = null;
        // Clear listen session since user logged out
        if (sessionRef.current && !sessionRef.current.flushed) {
          sessionRef.current.flushed = true; // Mark flushed without sending to DB
        }
        if (listenIntervalRef.current) {
          clearInterval(listenIntervalRef.current);
          listenIntervalRef.current = null;
        }
        sessionRef.current = null;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // This will be used for auto-playing after warp completion
  const autoPlayAfterWarpRef = useRef<string | null>(null);

  // Daily song progress tracking (no HeartCoin logic here)
  // Uses audioRef.current as source of truth for currentTime/duration
  // trackingSlug is the original slug (not normalized) for accurate DB lookup

  useDailySongProgress({
    audioElement: audioRef.current,
    trackSlug: state.trackingSlug || null,
    isPlaying: state.playing,
    enabled: true, // Only tracks when authenticated user is playing a song
    songOfDaySlug: null, // Fallback slug comparison for Song of the Day (unused; useDailySongProgress is a no-op)
    songOfDayId: null // Canonical song_id from element_of_day table (unused; see songOfDayIdRef below)
  });

  // Resolve today's Song of the Day id directly from the API instead of
  // usePlanetRewardsContext(): AudioProvider is mounted ABOVE
  // PlanetRewardsProvider in app/layout.tsx, so it is an ANCESTOR, not a
  // descendant, of that provider. React context only flows to descendants,
  // so usePlanetRewardsContext() here always hit its `!context` fallback and
  // returned songOfDayId: null forever — meaning `isSotd` in
  // markSongCompleted() was always false and `completed` never got set,
  // even though progress upserts (completion_percent, play_count) worked
  // fine. Confirmed live: a real user's row had completion_percent === 1
  // but completed === false. Fetching independently here sidesteps the
  // provider-order dependency entirely.
  useEffect(() => {
    let cancelled = false;
    const fetchSongOfDayId = async () => {
      try {
        const res = await fetch('/api/element-of-day');
        if (!res.ok) {
          if (process.env.NODE_ENV !== "production") console.warn('[SOTD] element-of-day fetch failed', res.status);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          songOfDayIdRef.current = data?.songOfDayId ?? null;
          if (process.env.NODE_ENV !== "production") console.log('[SOTD] songOfDayId resolved', songOfDayIdRef.current);
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") console.warn('[SOTD] element-of-day fetch error', err);
      }
    };
    fetchSongOfDayId();
    // Re-check periodically in case a long-lived tab crosses midnight rollover.
    const intervalId = window.setInterval(fetchSongOfDayId, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

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
        if (process.env.NODE_ENV !== "production") console.warn('No audio source loaded. Cannot play.');
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
      // Also pause any other audio elements that might be playing
      try {
        const allAudio = document.querySelectorAll<HTMLAudioElement>('audio');
        allAudio.forEach(audio => {
          try { if (!audio.paused) audio.pause(); } catch {}
        });
      } catch {}
    },

    togglePlayPause: () => {
      // If the main MediaPlayer is present, delegate to its native toggle
      // so behavior matches Spacebar and Media keys.
      try {
        const main = document.querySelector<HTMLAudioElement>('audio[data-audio-player="1"]');
        const mainToggle = (window as any)?.mainPlayerToggle;
        if (main && typeof mainToggle === 'function') {
          mainToggle();
          return;
        }
      } catch {}
      // Prefer the main MediaPlayer element if present; fallback to provider's element
      const main = document.querySelector<HTMLAudioElement>('audio[data-audio-player="1"]');
      const a = main || audioRef.current;
      if (!a) return;

      // Use the browser's actual audio state as truth
      const isActuallyPlaying = !a.paused;

      // Also detect any audio playing across the page
      let anyAudioPlaying = isActuallyPlaying;
      if (!anyAudioPlaying) {
        try {
          const allAudio = document.querySelectorAll<HTMLAudioElement>('audio');
          allAudio.forEach(audio => {
            if (!audio.paused && audio.currentTime > 0) anyAudioPlaying = true;
          });
        } catch {}
      }

      if (process.env.NODE_ENV !== "production") console.log('🎵 togglePlayPause', {
        statePlaying: state.playing,
        elPaused: a.paused,
        anyAudioPlaying
      });

      if (anyAudioPlaying || state.playing) {
        if (process.env.NODE_ENV !== "production") console.log('🎵 Pausing audio');
        setState(s => ({ ...s, playing: false }));
        setState(s => ({ ...s, pendingTrack: null }));
        try { a.pause(); } catch {}
        try {
          const allAudio = document.querySelectorAll<HTMLAudioElement>('audio');
          allAudio.forEach(audio => { try { if (!audio.paused) audio.pause(); } catch {} });
        } catch {}
        try { (window as any).__BLOCK_MAIN_AUDIO = true; } catch {}
        return;
      }

      // Otherwise, resume playback
      try { (window as any).__BLOCK_MAIN_AUDIO = false; } catch {}

      // If resuming on main MediaPlayer element, don't touch sources; just play
      if (main) {
        setState(s => ({ ...s, playing: true }));
        void a.play().catch(err => {
          console.error('Failed to resume main player:', err);
          setState(s => ({ ...s, playing: false }));
        });
        return;
      }

      // Fallback to provider-managed element: ensure it has a source
      if (state.currentTrack) {
        const norm = normalizeSlug(state.currentTrack.id);
        const key = trackKeyFromSlug(norm) as TrackKey | null;
        const expectedSource = key ? bestSourceFor(TRACKS[key]) : S(`${norm}.mp3`);
        if (!a.src || a.src === 'null' || a.src === '') {
          a.src = expectedSource;
          try { a.load(); } catch {}
          setState(s => ({ ...s, src: expectedSource }));
        }
      } else if (!a.src || a.src === 'null' || a.src === '') {
        const spaceMusicSource = bestSourceFor(TRACKS.SPACE_MUSIC);
        a.src = spaceMusicSource;
        try { a.load(); } catch {}
        setState(s => ({ ...s, src: spaceMusicSource, currentTrack: TRACK_INFO['space-music'] || null }));
      }

      if (a.readyState >= 3) {
        setState(s => ({ ...s, playing: true }));
        void a.play().catch(err => {
          console.error('Failed to toggle play audio:', err);
          setState(s => ({ ...s, playing: false }));
        });
      } else {
        setState(s => ({ ...s, playing: true, isLoading: true }));
        const handleCanPlay = () => {
          setState(s => ({ ...s, isLoading: false }));
          void a.play().catch(err => {
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
        if (a.readyState === 0) { try { a.load(); } catch {} }
        setTimeout(() => {
          if (a.readyState < 3) {
            a.removeEventListener('canplay', handleCanPlay);
            a.removeEventListener('error', handleError);
            void a.play().catch(err => {
              console.error('Failed to play audio after timeout:', err);
              setState(s => ({ ...s, playing: false, isLoading: false }));
            });
          }
        }, 3000);
      }
    },

    seek: (t: number) => {
      const a = audioRef.current;
      if (!a) return;
      try { a.currentTime = Math.max(0, Math.min(a.duration || Infinity, t)); } catch {}
    },

    setVolume: (v: number) => {
      const clampedVol = Math.max(0, Math.min(1, v));
      // Set volume on AudioProvider's audio element
      const a = audioRef.current;
      if (a) a.volume = clampedVol;
      // Also set volume on MediaPlayer's audio element (the actual playback element)
      const mediaPlayerAudio = document.querySelector<HTMLAudioElement>('audio[data-audio-player="1"]');
      if (mediaPlayerAudio) mediaPlayerAudio.volume = clampedVol;
      // Update state
      setState(s => ({ ...s, volume: clampedVol }));
    },

    selectTrack: async (trackId: string) => {
      const normId = normalizeSlug(trackId);
      let trackInfo = TRACK_INFO[normId] || TRACK_INFO[trackId];
      if (!trackInfo) {
        if (process.env.NODE_ENV !== "production") console.log(`🎵 selectTrack: Track not in TRACK_INFO, creating dynamic info for: ${trackId}`);
        trackInfo = {
          id: normId || trackId,
          title: (trackId || '').toUpperCase().replace(/-/g, ' '),
          artist: 'CHXNDLER',
          oneLiner: 'Listen now'
        };
      }

      // Find the track source using the shared mapper
      let trackSource = "";
      const key = trackKeyFromSlug(normId) as TrackKey | null;
      trackSource = key ? bestSourceFor(TRACKS[key]) : S(`${normId}.mp3`);

      if (!trackSource) {
        if (process.env.NODE_ENV !== "production") console.warn(`No source found for track: ${trackId}`);
        return;
      }

      if (process.env.NODE_ENV !== "production") console.log('🎵 selectTrack: Setting up track for warp sequence:', normId);

      // Update currentTrack state FIRST to prevent the playerStore subscription
      // from triggering a duplicate playTrack call
      // Also set trackingSlug with original trackId for daily progress tracking
      setState(s => ({ ...s, currentTrack: trackInfo, trackingSlug: trackId }));

      // Update playerStore.mainId to keep play/pause button in sync
      // This ensures the player UI shows the correct track after warp
      try {
        const { playerStore } = await import('@/store/usePlayerStore');
        playerStore.setState({ mainId: normId, prevMainId: playerStore.getState().mainId });
        if (process.env.NODE_ENV !== "production") console.log('🎵 Updated playerStore.mainId to:', normId);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") console.warn('Failed to update playerStore:', err);
      }

      // Stop current music immediately
      if (process.env.NODE_ENV !== "production") console.log('🎵 Stopping current music for track selection');
      stopAllAudioInternal();
      setState(s => ({ ...s, playing: false }));

      // NOTE: Do NOT play warp sound here - the visual warp system in DashboardApp
      // handles the warp effect. This prevents double warp sounds.

      // Set up the pending track for post-warp playback
      // The warp visual will call markWarpCompleted() when done, which triggers auto-play
      setState(s => ({
        ...s,
        pendingTrack: normId,
        warpCompleted: false,
        src: trackSource,
        currentTrack: trackInfo,
        trackingSlug: trackId // Keep original slug for tracking
      }));

      // Pre-load the track so it's ready to play when warp completes
      const a = audioRef.current;
      if (!a) return;

      if (process.env.NODE_ENV !== "production") console.log('🎵 Pre-loading track for post-warp playback:', normId, 'source:', trackSource);
      a.src = trackSource;
      try {
        a.load();
        if (process.env.NODE_ENV !== "production") console.log('🎵 Track pre-loaded successfully');
      } catch (loadErr) {
        console.error('Failed to pre-load track:', loadErr);
      }

      // Playback will be triggered by the warpCompleted effect when markWarpCompleted() is called
    },

    // Load a track without playing - useful for setup mode where user should click play
    preloadTrack: (trackId: string) => {
      const normId = normalizeSlug(trackId);
      let trackInfo = TRACK_INFO[normId] || TRACK_INFO[trackId];

      // If track not found in static list, create dynamic track info
      if (!trackInfo) {
        if (process.env.NODE_ENV !== "production") console.log(`🎵 preloadTrack: Track not in TRACK_INFO, creating dynamic info for: ${trackId}`);
        trackInfo = {
          id: normId || trackId,
          title: (trackId || '').toUpperCase().replace(/-/g, ' '),
          artist: 'CHXNDLER',
          oneLiner: 'Listen now'
        };
      }

      // Find the track source using the shared mapper
      let trackSource = "";
      const key = trackKeyFromSlug(normId) as TrackKey | null;
      if (key && TRACKS[key]) {
        trackSource = bestSourceFor(TRACKS[key]);
        if (process.env.NODE_ENV !== "production") console.log(`🎵 preloadTrack: Found track source via TRACKS mapping: ${key} -> ${trackSource}`);
      } else {
        // Fallback to direct file path
        trackSource = S(`${normId}.mp3`);
        if (process.env.NODE_ENV !== "production") console.log(`🎵 preloadTrack: Using fallback track source: ${trackSource}`);
      }

      if (!trackSource) {
        if (process.env.NODE_ENV !== "production") console.warn(`🎵 preloadTrack: No source found for track: ${trackId}`);
        return;
      }

      if (process.env.NODE_ENV !== "production") console.log(`🎵 preloadTrack: Loading ${trackId} without autoplay`);

      // Load the track source
      const a = audioRef.current;
      if (a) {
        a.src = trackSource;
        try { a.load(); } catch {}
      }

      // Update current track info and source (but don't set playing to true)
      setState(s => ({ ...s, currentTrack: trackInfo, src: trackSource, trackingSlug: trackId, isLoading: false }));

      // Update playerStore.mainId to keep play/pause button in sync
      import('@/store/usePlayerStore').then(({ playerStore }) => {
        playerStore.setState({ mainId: normId, prevMainId: playerStore.getState().mainId });
        if (process.env.NODE_ENV !== "production") console.log('🎵 preloadTrack: Updated playerStore.mainId to:', normId);
      }).catch(err => {
        if (process.env.NODE_ENV !== "production") console.warn('preloadTrack: Failed to update playerStore:', err);
      });
    },

    playTrack: async (trackId: string) => {
      const normId = normalizeSlug(trackId);
      let trackInfo = TRACK_INFO[normId] || TRACK_INFO[trackId];

      // If track not found in static list, create dynamic track info
      // This allows playing songs from database that aren't hardcoded
      if (!trackInfo) {
        if (process.env.NODE_ENV !== "production") console.log(`🎵 Track not in TRACK_INFO, creating dynamic info for: ${trackId}`);
        trackInfo = {
          id: normId || trackId,
          title: (trackId || '').toUpperCase().replace(/-/g, ' '),
          artist: 'CHXNDLER',
          oneLiner: 'Listen now'
        };
      }

      // Find the track source using the shared mapper
      let trackSource = "";
      const key = trackKeyFromSlug(normId) as TrackKey | null;
      if (key && TRACKS[key]) {
        trackSource = bestSourceFor(TRACKS[key]);
        if (process.env.NODE_ENV !== "production") console.log(`🎵 Found track source via TRACKS mapping: ${key} -> ${trackSource}`);
      } else {
        // Fallback to direct file path
        trackSource = S(`${normId}.mp3`);
        if (process.env.NODE_ENV !== "production") console.log(`🎵 Using fallback track source: ${trackSource}`);
      }

      if (!trackSource) {
        if (process.env.NODE_ENV !== "production") console.warn(`🎵 No source found for track: ${trackId}`);
        return;
      }

      if (process.env.NODE_ENV !== "production") console.log(`🎵 playTrack: ${trackId} -> ${normId}`);

      // Update current track info immediately
      // Store original trackId as trackingSlug for daily progress tracking (before normalization)
      setState(s => ({ ...s, currentTrack: trackInfo, isLoading: true, trackingSlug: trackId }));

      // Always flush any existing listen session when starting a new track
      // This ensures session tracking works even when track is pre-loaded
      if (sessionRef.current && !sessionRef.current.flushed) {
        if (process.env.NODE_ENV !== "production") console.log('🎧 Flushing session before playing new track');
        await flushSession(0);
      }

      // Only stop audio if we're switching to a different track
      const currentAudio = audioRef.current;
      const isSameTrack = currentAudio && currentAudio.src && currentAudio.src.includes(normId);

      if (!isSameTrack) {
        // Stop any existing audio only when switching tracks
        stopAllAudioInternal();

        // Small delay to ensure audio has fully stopped before starting new track
        await new Promise(resolve => setTimeout(resolve, 50));
      } else {
        if (process.env.NODE_ENV !== "production") console.log('🎵 Same track detected, not stopping current audio to prevent interruption');
      }

      // Load and play the track
      const a = audioRef.current;
      if (!a) return;

      // Disable browser media session before playing to prevent title overlays
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }

      // Skip reload if selectTrack already pre-loaded this track — calling a.load() again
      // resets readyState to 0 and discards the buffer, causing the canplay timeout.
      const alreadyPreloaded = a.readyState >= 2 && a.src.includes(normId);

      if (!alreadyPreloaded) {
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
      }

      setState(s => ({ ...s, src: trackSource, currentTime: 0, duration: 0 }));

      try {
        // Set playing state immediately for instant UI feedback
        setState(s => ({ ...s, playing: true, isLoading: false }));
        await a.play();
        if (process.env.NODE_ENV !== "production") console.log('🎵 Successfully started playing:', normId);
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
        if (process.env.NODE_ENV !== "production") console.log('🎵 Start sequence complete, loading space music...');

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
      // When setting a new pending track, reset warpCompleted to false
      // This ensures the playerStore subscription defers playback until warp finishes
      setState(s => ({ ...s, pendingTrack: trackId, warpCompleted: trackId ? false : s.warpCompleted }));
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

  // Keep refs in sync with state (for use in subscription callbacks to avoid stale closures)
  useEffect(() => {
    warpCompletedRef.current = state.warpCompleted;
  }, [state.warpCompleted]);

  useEffect(() => {
    pendingTrackRef.current = state.pendingTrack;
  }, [state.pendingTrack]);

  // Auto-play track when warp completes
  useEffect(() => {
    if (!state.warpCompleted) return;
    if (!state.pendingTrack) return; // Only auto-play if a track was specifically selected

    const trackToPlay = state.pendingTrack;

    if (process.env.NODE_ENV !== "production") console.log('🎵 Auto-playing after warp completion:', trackToPlay);

    // Clear pending track AND warpCompleted to prevent re-triggering
    setState(s => ({ ...s, pendingTrack: null, warpCompleted: false }));

    // Use the API to play the track (playTrack already handles starting playback)
    const playTrack = api.playTrack;
    playTrack(trackToPlay).catch(console.error);

  }, [state.warpCompleted, state.pendingTrack, api.playTrack]);

  // Keep currentTrack ref in sync for use in playerStore subscription (avoids stale closures)
  const currentTrackIdRef = useRef<string | null>(state.currentTrack?.id ?? null);
  useEffect(() => {
    currentTrackIdRef.current = state.currentTrack?.id ?? null;
  }, [state.currentTrack?.id]);

  // Listen for player store changes to sync with holo panel selections
  // Single subscription set up once - uses refs to avoid stale closure issues
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let unsubscribeFn: (() => void) | undefined;
    let cancelled = false;

    // Import playerStore dynamically to avoid SSR issues
    const setup = async () => {
      try {
        const { playerStore } = await import('@/store/usePlayerStore');
        if (cancelled) return;

        unsubscribeFn = playerStore.subscribe((storeState: any) => {
          const currentMainId = storeState?.mainId;
          // Use ref to get latest currentTrack.id (avoids stale closure)
          const currentTrackId = currentTrackIdRef.current;

          // Check if HoloAudioBridge is handling the warp sequence - if so, don't interfere
          if ((window as any).__HOLO_WARP_IN_PROGRESS) {
            if (process.env.NODE_ENV !== "production") console.log('🎵 AudioProvider: Warp in progress, skipping track sync');
            return;
          }

          // Only sync if a different song is selected AND we're not already playing that specific track
          if (currentMainId && currentMainId !== currentTrackId) {
            if (process.env.NODE_ENV !== "production") console.log('🎵 AudioProvider: Syncing with player store selection:', currentMainId, 'was playing:', currentTrackId);

            // Set current track info immediately for UI updates
            const trackInfo = TRACK_INFO[currentMainId];
            if (trackInfo) {
              setState(s => ({ ...s, currentTrack: trackInfo, trackingSlug: currentMainId }));
            }

            // A new song was selected via playerStore.setMain() - this triggers a warp effect
            // Reset warpCompleted to false and set as pending track to wait for warp to finish
            // The warp SFX completion (markWarpCompleted) will trigger auto-play via the effect
            if (process.env.NODE_ENV !== "production") console.log('🎵 AudioProvider: New song selected, setting as pending track and waiting for warp:', currentMainId);
            setState(s => ({ ...s, pendingTrack: currentMainId, warpCompleted: false }));
          }
        });
      } catch (err) {
        if (process.env.NODE_ENV !== "production") console.warn('Failed to subscribe to player store:', err);
      }
    };

    setup();

    // Cleanup: unsubscribe when effect re-runs or component unmounts
    return () => {
      cancelled = true;
      if (unsubscribeFn) unsubscribeFn();
    };
  }, []); // Empty deps - subscribe once, use refs for latest values

  // Store playTrack in a ref to avoid stale closure issues
  const playTrackRef = useRef(api.playTrack);
  useEffect(() => {
    playTrackRef.current = api.playTrack;
  }, [api.playTrack]);

  // Listen for direct song play requests (e.g., from daily quests LISTEN button)
  // This bypasses the warp completion check for immediate playback
  // Track if listener is already set up to prevent duplicate setup logs
  const listenerSetupRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (listenerSetupRef.current) return; // Already set up
    listenerSetupRef.current = true;

    const handleSongPlayNow = (e: CustomEvent) => {
      const trackSlug = e?.detail?.slug;
      const source = e?.detail?.source || 'unknown';

      if (!trackSlug) {
        if (process.env.NODE_ENV !== "production") console.warn('🎵 song:play-now event received without slug');
        return;
      }

      // Clear pending track state since we're playing immediately
      setState(s => ({ ...s, pendingTrack: null, warpCompleted: true }));

      // Play the track directly using ref to avoid stale closure
      playTrackRef.current(trackSlug).catch(err => {
        console.error('🎵 Failed to play track:', err);
      });
    };

    window.addEventListener('song:play-now', handleSongPlayNow as EventListener);

    // Also expose a global function as fallback for direct calls
    (window as any).__playTrackDirect = (slug: string, source: string = 'global') => {
      setState(s => ({ ...s, pendingTrack: null, warpCompleted: true }));
      playTrackRef.current(slug).catch(err => {
        console.error('🎵 Failed to play track:', err);
      });
    };

    return () => {
      listenerSetupRef.current = false;
      window.removeEventListener('song:play-now', handleSongPlayNow as EventListener);
      delete (window as any).__playTrackDirect;
    };
  }, []); // Empty deps - only set up once

  const value = useMemo(() => ({ ...state, ...api }), [state, api]);
  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used within <AudioProvider>");
  return ctx;
}
