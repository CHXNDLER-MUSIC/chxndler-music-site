"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { trackKeyFromSlug } from "@/utils/trackKeyFromSlug";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useDailySongProgress, recordSongEndedPlay } from "@/hooks/useDailySongProgress";
import { triggerHeartCoinCelebration } from "@/utils/heartcoinCelebration";
import { getNYDateString } from "@/lib/time";
import { usePlanetRewardsContext } from "@/components/PlanetRewardsProvider";

// Song-of-Day completion thresholds
const SOD_COMPLETE_RATIO = 0.99;
const SOD_COMPLETE_REMAINING_SECONDS = 1.0;

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
      console.warn('🎧 Could not find song UUID for slug:', slug);
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
        console.warn('[TRACK] Cannot record play - song UUID not found for:', trackSlug);
        return;
      }

      // Check if this play should be debounced
      const now = Date.now();
      const lastPlay = lastPlayTrackRef.current;

      if (lastPlay && lastPlay.songId === songUuid && (now - lastPlay.timestamp) < PLAY_DEBOUNCE_MS) {
        console.log('[TRACK] Debounced duplicate play event', {
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
      console.log('[TRACK] play started', {
        songId: songUuid,
        songName: state.currentTrack?.title || trackSlug
      });

      // Note: Song of Day HeartCoin award happens on completion, not play start
      // See claimSongOfDayIfEligible() called from onTime and onEnded handlers
    } catch (err) {
      console.error('[TRACK] recordPlayEvent error', {
        error: err,
        message: (err as any)?.message,
      });
    }
  };

  // Guard: ensure Song of Day completion RPC triggers once per playback session
  const sodFiredRef = useRef<boolean>(false);

  // Claim Song of Day HeartCoin award - called ONLY on song completion
  // This is idempotent - safe to call multiple times, backend enforces once per day
  const claimSongOfDayIfEligible = async (trackSlug: string, completionRatio: number = 1.0): Promise<void> => {
    try {
      // Get song UUID
      const songUuid = await getSongUuidBySlug(trackSlug);
      if (!songUuid) {
        console.warn('[SOTD] Cannot claim - song UUID not found for:', trackSlug);
        return;
      }

      // Check if user is authenticated
      const user = authUserRef.current;
      if (!user) {
        console.log('[SOTD] skipped: no authenticated user');
        return;
      }

      // Get today's date in NY timezone
      const nyDay = getNYDateString();

      // Check if this is the Song of the Day
      // Use ref to avoid stale closure in callbacks
      const currentSongOfDayId = songOfDayIdRef.current;
      if (!currentSongOfDayId) {
        console.log('[SOTD] skipped: no Song of the Day configured');
        return;
      }

      if (songUuid !== currentSongOfDayId) {
        console.log('[SOTD] skipped: track is not Song of the Day', {
          trackSongId: songUuid,
          songOfDayId: currentSongOfDayId
        });
        return;
      }

      // Check guard ref to prevent duplicate calls in the same session
      const lastClaim = lastSotdClaimRef.current;
      if (lastClaim && lastClaim.songId === songUuid && lastClaim.day === nyDay) {
        console.log('[SOTD] skipped: already claimed in this session', {
          songId: songUuid,
          day: nyDay
        });
        return;
      }

      const audioEl = audioRef.current;
      const currentTime = audioEl?.currentTime ?? null;
      const duration = audioEl?.duration ?? null;
      const ratio = completionRatio;
      console.log('[SOD RPC FIRE]', { songId: songUuid, currentTime, duration, ratio });

      // Build NY day string for RPC
      const dayNY = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const dayStr = dayNY.toISOString().slice(0,10);

      // Use RPC to claim SOTD and award HeartCoin; frontend should NOT touch awards table directly
      console.log('[SOTD RPC args]', { songId: songUuid, dayStr, completionRatio });
      const { data, error } = await supabaseBrowser.rpc('claim_song_of_day_and_award', {
        p_song_id: songUuid,
        p_day: dayStr,
        p_completion_ratio: completionRatio,
      });

      console.log('[SOTD RPC result]', { data, error });

      if (error) {
        console.error('[SOTD] claim_song_of_day_and_award error', {
          songId: songUuid,
          error,
          code: (error as any)?.code,
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
        });
        // Don't update guard ref on error so we can retry
        return;
      }

      // Update guard ref to prevent duplicate calls
      lastSotdClaimRef.current = { songId: songUuid, day: nyDay };

      const resp: any = data || {};
      const ok = !!resp.ok;
      const awardedNow = !!resp.awarded_now;
      const reason = resp.reason || null;

      if (ok) {
        console.log('[SOTD] RPC ok', { awardedNow, resp });
        if (awardedNow) {
          try { triggerHeartCoinCelebration(1); } catch {}
          try {
            window.dispatchEvent(new CustomEvent('songOfDay:refresh'));
            window.dispatchEvent(new CustomEvent('dailySongQuestCompleted', { detail: { day: nyDay } }));
          } catch {}
        }
      } else if (reason === 'not_completed') {
        // ignore silently
      } else {
        console.warn('[SOTD] Unexpected RPC response', { resp });
      }

    } catch (err) {
      console.error('[SOTD] claimSongOfDayIfEligible error', {
        error: err,
        message: (err as any)?.message,
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
          console.log('[DailyProgress] skipped: no session');
        }
        // Look up the song UUID for the anonymous_song_listen_sessions table
        const songUuid = await getSongUuidBySlug(session.trackId);
        if (!songUuid) {
          console.warn('🎧 Cannot track anonymous listen - song UUID not found for:', session.trackId);
          flushInFlightRef.current = false;
          return false;
        }

        const anonSessionId = getAnonSessionId();
        if (!anonSessionId) {
          console.warn('🎧 Cannot track anonymous listen - no anon session ID');
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

        console.log('🎧 Flushing anonymous session:', JSON.stringify(anonPayload, null, 2));

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

        console.log(`🎧 Recorded anonymous: ${session.trackId}, ${listenedSeconds}s`);
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

      console.log('🎧 Flushing session:', JSON.stringify(payload, null, 2));

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

      console.log(`🎧 Recorded: ${session.trackId}, ${listenedSeconds}s`);

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

          const dailyProgressPayload: any = {
            user_id: user.id,
            song_id: songUuid,
            day: nyDay, // explicit NY date; DB has default but we pass for clarity
          };

          console.log('[DailyProgress Payload]', dailyProgressPayload);
          const { error: dailyProgressError } = await supabaseBrowser
            .from('user_song_daily_progress')
            .upsert(dailyProgressPayload, { onConflict: 'user_id,song_id,day', ignoreDuplicates: false });

          if (dailyProgressError) {
            console.log('[DailyProgress Upsert Error]', dailyProgressError);
          } else {
            console.log(`🎧 Upserted daily progress row for ${session.trackId} on ${nyDay}`);
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

    console.log(`🎧 Started session: ${trackId}`);
    // Reset SOTD completion trigger for new playback session
    sodFiredRef.current = false;
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
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    a.setAttribute("data-global-audio", "1");
    a.style.display = "none";
    document.body.appendChild(a);
    audioRef.current = a;

    const onTime = async () => {
      const currentTime = a.currentTime;
      const lastTime = lastCurrentTimeRef.current;
      const duration = a.duration || 0;

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
        console.log(`🎧 Repeat detected: ${lastTime.toFixed(1)}s -> ${currentTime.toFixed(1)}s (duration: ${duration.toFixed(1)}s)`);
        // Claim Song of Day HeartCoin award on repeat (complete playthrough)
        if (currentTrackRef.current && !sodFiredRef.current) {
          sodFiredRef.current = true;
          claimSongOfDayIfEligible(currentTrackRef.current, 1.0);
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
            console.log('[DailyProgress] skipped: no session');
          }
          return; // Do not attempt to write if logged out
        }

        const slug = currentTrackRef.current;
        if (!slug) return;

        // Throttle DB writes to reduce load
        const now = Date.now();
        (onTime as any)._lastUpsertAt = (onTime as any)._lastUpsertAt || 0;
        if (now - (onTime as any)._lastUpsertAt < 2000) return; // 2s throttle
        (onTime as any)._lastUpsertAt = now;

        // Resolve song UUID (cached inside helper)
        const songUuid = await getSongUuidBySlug(slug);
        if (!songUuid) return;

        const nyDay = getNYDateString();
        // Guard: ensure both IDs exist
        if (!user?.id || !songUuid) return;
        // Minimal payload only; table requires user_id and song_id, day has default
        const dailyProgressPayload: any = {
          user_id: user.id,
          song_id: songUuid,
          day: nyDay,
        };

        console.log('[DailyProgress Payload]', dailyProgressPayload);
        const { error: dailyProgressError } = await supabaseBrowser
          .from('user_song_daily_progress')
          .upsert(dailyProgressPayload, { onConflict: 'user_id,song_id,day', ignoreDuplicates: false });

        if (dailyProgressError) {
          console.log('[DailyProgress Upsert Error]', dailyProgressError);
        }
      } catch (progressErr) {
        // Be quiet on errors here to avoid console spam; detailed errors are logged above
      }

      // Independent SOTD completion trigger: only when actually complete
      if (duration > 0 && !sodFiredRef.current && isSongComplete(duration, currentTime)) {
        const slug = currentTrackRef.current;
        if (slug) {
          sodFiredRef.current = true;
          const ratio = Math.max(0, Math.min(1, currentTime / duration));
          claimSongOfDayIfEligible(slug, ratio);
        }
      }
    };
    const onDur = () => setState(s => ({ ...s, duration: a.duration || 0 }));
    const onPlay = () => {
      console.log('🎵 AudioProvider: onPlay event fired');
      setState(s => ({ ...s, playing: true, isLoading: false }));

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
      console.log('🎵 AudioProvider: onPause event fired');
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
      console.log('🎵 AudioProvider: Song ended');
      // Ensure SOTD completion awards trigger on ended as well (once per session)
      try {
        const slug = currentTrackRef.current;
        if (slug && !sodFiredRef.current) {
          sodFiredRef.current = true;
          claimSongOfDayIfEligible(slug, 1.0);
        }
      } catch {}
      // Flush the listen session before restarting (min 0 seconds for track end)
      if (sessionRef.current && !sessionRef.current.flushed) {
        flushSession(0).then(async () => {
          // Increment daily song play only on full end
          try {
            const slug = currentTrackRef.current || state.currentTrack?.id || null;
            if (slug) {
              const songUuid = await getSongUuidBySlug(slug);
              if (songUuid) {
                await recordSongEndedPlay(songUuid);
              }
            }
          } catch (err) {
            console.warn('Failed SOTD end-of-track processing:', err);
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
          console.log('🎧 Page hidden, stopping audio playback');
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
          console.log('🎧 Page hidden, flushing session');
          flushSession(2); // Require at least 2 seconds
        }
      }
    };

    const handleBeforeUnload = () => {
      if (sessionRef.current && !sessionRef.current.flushed) {
        console.log('🎧 Page unloading, flushing session');
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
                  console.log('🎧 Sent session via keepalive fetch');
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
                  console.log('🎧 Sent anonymous session via keepalive fetch');
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

  // Get Song of the Day from PlanetRewardsContext for HeartCoin awards
  const { songOfDaySlug, songOfDayId } = usePlanetRewardsContext();

  useDailySongProgress({
    audioElement: audioRef.current,
    trackSlug: state.trackingSlug || null,
    isPlaying: state.playing,
    enabled: true, // Only tracks when authenticated user is playing a song
    songOfDaySlug, // Fallback slug comparison for Song of the Day
    songOfDayId // Canonical song_id from element_of_day table
  });

  // Keep songOfDayIdRef in sync with context value (for use in callbacks)
  useEffect(() => {
    songOfDayIdRef.current = songOfDayId ?? null;
  }, [songOfDayId]);

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
          console.log('🎵 Current track exists, validating audio source for resume:', state.currentTrack.id);

          // Determine expected source using shared mapper with normalized slug
          const norm = normalizeSlug(state.currentTrack.id);
          const key = trackKeyFromSlug(norm) as TrackKey | null;
          const expectedSource = key ? bestSourceFor(TRACKS[key]) : `/tracks/${norm}.opus`;

          // Only set src when there's no source at all. Do NOT reload when resuming.
          // Some filenames contain URL-encoded characters (e.g., we%27re-just-friends),
          // which makes naive substring checks unreliable and could cause unwanted reloads
          // that reset currentTime to 0 on resume.
          if (!a.src || a.src === 'null' || a.src === '') {
            console.log('🎵 No audio source loaded, setting expected source:', expectedSource);
            a.src = expectedSource;
            try { a.load(); } catch {}
            setState(s => ({ ...s, src: expectedSource }));
          } else {
            // Keep existing src to preserve currentTime on resume
            console.log('🎵 Source already present; skipping reload to preserve position');
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

      console.log('🎵 selectTrack: Setting up track for warp sequence:', normId);

      // Update currentTrack state FIRST to prevent the playerStore subscription
      // from triggering a duplicate playTrack call
      // Also set trackingSlug with original trackId for daily progress tracking
      setState(s => ({ ...s, currentTrack: trackInfo, trackingSlug: trackId }));

      // Update playerStore.mainId to keep play/pause button in sync
      // This ensures the player UI shows the correct track after warp
      try {
        const { playerStore } = await import('@/store/usePlayerStore');
        playerStore.setState({ mainId: normId, prevMainId: playerStore.getState().mainId });
        console.log('🎵 Updated playerStore.mainId to:', normId);
      } catch (err) {
        console.warn('Failed to update playerStore:', err);
      }

      // Stop current music immediately
      console.log('🎵 Stopping current music for track selection');
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

      console.log('🎵 Pre-loading track for post-warp playback:', normId, 'source:', trackSource);
      a.src = trackSource;
      try {
        a.load();
        console.log('🎵 Track pre-loaded successfully');
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
        console.log(`🎵 preloadTrack: Track not in TRACK_INFO, creating dynamic info for: ${trackId}`);
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
        console.log(`🎵 preloadTrack: Found track source via TRACKS mapping: ${key} -> ${trackSource}`);
      } else {
        // Fallback to direct file path
        trackSource = `/tracks/${normId}.mp3`;
        console.log(`🎵 preloadTrack: Using fallback track source: ${trackSource}`);
      }

      if (!trackSource) {
        console.warn(`🎵 preloadTrack: No source found for track: ${trackId}`);
        return;
      }

      console.log(`🎵 preloadTrack: Loading ${trackId} without autoplay`);

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
        console.log('🎵 preloadTrack: Updated playerStore.mainId to:', normId);
      }).catch(err => {
        console.warn('preloadTrack: Failed to update playerStore:', err);
      });
    },

    playTrack: async (trackId: string) => {
      const normId = normalizeSlug(trackId);
      let trackInfo = TRACK_INFO[normId] || TRACK_INFO[trackId];

      // If track not found in static list, create dynamic track info
      // This allows playing songs from database that aren't hardcoded
      if (!trackInfo) {
        console.log(`🎵 Track not in TRACK_INFO, creating dynamic info for: ${trackId}`);
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
        console.log(`🎵 Found track source via TRACKS mapping: ${key} -> ${trackSource}`);
      } else {
        // Fallback to direct file path
        trackSource = `/tracks/${normId}.opus`;
        console.log(`🎵 Using fallback track source: ${trackSource}`);
      }

      if (!trackSource) {
        console.warn(`🎵 No source found for track: ${trackId}`);
        return;
      }

      console.log(`🎵 playTrack: ${trackId} -> ${normId}`);

      // Update current track info immediately
      // Store original trackId as trackingSlug for daily progress tracking (before normalization)
      setState(s => ({ ...s, currentTrack: trackInfo, isLoading: true, trackingSlug: trackId }));

      // Always flush any existing listen session when starting a new track
      // This ensures session tracking works even when track is pre-loaded
      if (sessionRef.current && !sessionRef.current.flushed) {
        console.log('🎧 Flushing session before playing new track');
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

      // Note: Removed stale state check that was causing race conditions
      // The check `state.currentTrack?.id !== normId` used closure state
      // which could be stale, causing valid playback to be aborted

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
              setState(s => ({ ...s, currentTrack: trackInfo, trackingSlug: currentMainId }));
            }

            // A new song was selected via playerStore.setMain() - this triggers a warp effect
            // Reset warpCompleted to false and set as pending track to wait for warp to finish
            // The warp SFX completion (markWarpCompleted) will trigger auto-play via the effect
            console.log('🎵 AudioProvider: New song selected, setting as pending track and waiting for warp:', currentMainId);
            setState(s => ({ ...s, pendingTrack: currentMainId, warpCompleted: false }));
          }
        });

        return unsubscribe;
      } catch (err) {
        console.warn('Failed to subscribe to player store:', err);
      }
    };

    subscribeToPlayerStore();
  }, [state.currentTrack?.id, state.playing, api.playTrack]);

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
        console.warn('🎵 song:play-now event received without slug');
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
