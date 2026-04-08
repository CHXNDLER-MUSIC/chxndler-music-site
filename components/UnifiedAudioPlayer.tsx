"use client";

import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useSongs } from "@/hooks/useSongs";
import { AUDIO_ASSETS_BY_SLUG } from "@/data/audioAssets";
import { SONG_ELEMENT_MAPPING } from "@/data/songElements";
import { useAudio, TRACK_INFO, TRACKS, TrackKey } from "@/app/providers/AudioProvider";
import { trackKeyFromSlug } from "@/utils/trackKeyFromSlug";
import { supabaseTrackUrl } from "@/lib/supabaseTrackUrl";
import { sfx } from "@/lib/sfx";
import SongDropdown from "./SongDropdown";
import { useProfile } from "@/contexts/ProfileContext";
import type { Tier } from "@/utils/tier";
import { tierRank, TIER_ORDER } from "@/utils/tier";

// Display title overrides for specific slugs
const TITLE_OVERRIDES: Record<string, string> = {
  'mr-brightside': 'MR. BRIGHTSIDE',
};

// Normalize helper for slugs
const normalizeSlug = (slug?: string) => (slug ? String(slug).toLowerCase().replace(/'/g, "") : "");

// Element mapping for visual consistency
const ELEMENT_MAP: Record<string, string> = {
  "ocean-girl": "water",
  "alone": "darkness",
  "baby": "heart",
  "be-my-bee": "heart",
  "night-drive": "lightning",
  "starlight": "lightning",
  "horizon": "water",
  "afterglow": "lightning",
  "midnight": "darkness",
  "tidal": "water",
  "drift": "water",
  "mr-brightside": "darkness",
};

// Time-locked tracks: accessible early for certain tiers, public at unlockDate
// NOTE: Do not include released songs here; UI auto-unlocks when is_released = true
const TIME_LOCKED_TRACKS: Record<string, { unlockDate: string; earlyAccessTiers: Tier[] }> = {
  // Example template for future drops:
  // "some-unreleased-slug": {
  //   unlockDate: "2026-06-01T12:00:00-05:00",
  //   earlyAccessTiers: ["dreamer", "lover", "guide"],
  // },
};

/** Check if a track is currently time-locked for a given user tier */
function isTrackTimeLocked(slug: string, userTier?: string): { locked: boolean; unlockDate?: string } {
  const config = TIME_LOCKED_TRACKS[slug];
  if (!config) return { locked: false };

  const now = Date.now();
  const unlock = new Date(config.unlockDate).getTime();

  // Past the unlock date — open for everyone
  if (now >= unlock) return { locked: false };

  // Check early-access tiers
  const tier = (userTier?.toLowerCase() || "wanderer") as Tier;
  if (TIER_ORDER.includes(tier) && config.earlyAccessTiers.includes(tier)) {
    return { locked: false };
  }

  return { locked: true, unlockDate: config.unlockDate };
}

// Helper to get track URL from song ID
function getTrackUrlFromSongId(songId: string): string {
  const key = trackKeyFromSlug(normalizeSlug(songId)) as TrackKey | null;
  if (key && TRACKS[key]) {
    // Prefer opus, fallback to mp3
    return TRACKS[key].opus || TRACKS[key].mp3 || "";
  }
  // Fallback: try Supabase Storage path
  return supabaseTrackUrl(`${normalizeSlug(songId)}.mp3`);
}

// Brand colors for the glowing progress bar
const BRAND_COLORS = {
  pink: "#FC54AF",
  blue: "#38B6FF", 
  yellow: "#F2EF1D"
};

interface UnifiedAudioPlayerProps {
  initialTrackId?: string;
}

const UnifiedAudioPlayer = React.memo(function UnifiedAudioPlayer({ initialTrackId }: UnifiedAudioPlayerProps) {
  // Use unified audio provider with centralized state
  const audioManager = useAudio();
  
  // Get centralized state from audio provider
  const isPlaying = audioManager.playing;
  const currentTrackInfo = audioManager.currentTrack;
  
  
  // Use current time and duration from the audio provider
  const currentTime = audioManager.currentTime;
  const duration = audioManager.duration;

  // Ensure smooth UI updates while playing even if event frequency is low
  const [animTick, setAnimTick] = useState(0);
  useEffect(() => {
    let raf: number | null = null;
    let active = true;
    const loop = () => {
      if (!active) return;
      setAnimTick(t => (t + 1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    if (audioManager.playing) {
      raf = requestAnimationFrame(loop);
    }
    return () => { active = false; if (raf) cancelAnimationFrame(raf); };
  }, [audioManager.playing]);
  
  // Track the audio element for additional event handling if needed
  const [currentAudioElement, setCurrentAudioElement] = useState<HTMLAudioElement | null>(null);
  
  // Progress bar reference for click handling
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Get songs from Supabase (includes unreleased for time-lock display)
  const { songs: supabaseSongs, allSongs, loading } = useSongs();

  // Get user profile for tier-based time-lock checks
  const { profile } = useProfile();
  
  // Filter released songs + time-locked unreleased songs, combine with asset data
  const availableSongs = useMemo(() => {
    // Include released songs + unreleased songs that have a time-lock config
    const timeLocked = allSongs.filter(song => !song.is_released && TIME_LOCKED_TRACKS[song.slug]);
    const eligible = [
      ...supabaseSongs.filter(song => song.is_released),
      ...timeLocked,
    ];

    return eligible
      .map(song => {
        const asset = AUDIO_ASSETS_BY_SLUG[song.slug];
        if (!asset) return null;

        return {
          id: song.slug,
          title: TITLE_OVERRIDES[song.slug] || song.title,
          oneLiner: `Released ${new Date(song.created_at).getFullYear()}`,
          src: asset.src,
          cover: asset.cover,
          is_released: song.is_released,
          element: SONG_ELEMENT_MAPPING[song.slug] || 'heart',
          planet: { radius: 1, color: "#38B6FF", orbitRadius: 3, orbitSpeed: 0.5, tilt: 0.2 }
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [supabaseSongs, allSongs]);
  
  // Calculate progress (0-1)
  // Use live element timing while playing to avoid lag from throttled events
  const liveAudio = audioManager.getCurrentAudio?.();
  const liveDuration = (liveAudio && isFinite(liveAudio.duration) && liveAudio.duration > 0) ? liveAudio.duration : duration;
  const liveTime = (isPlaying && liveAudio && isFinite(liveAudio.currentTime)) ? liveAudio.currentTime : currentTime;
  const progress = liveDuration > 0 ? Math.max(0, Math.min(1, liveTime / liveDuration)) : 0;

  // Handle track change from dropdown
  const handleTrackChange = useCallback(async (newTrackId: string) => {
    // Block time-locked tracks unless DB marks as released
    const timeLock = isTrackTimeLocked(newTrackId, profile?.tier);
    if (timeLock.locked) {
      const target = (availableSongs as any[])?.find?.(s => s.id === newTrackId);
      if (!target || !target.is_released) return;
    }

    // Prefer the global warp flow managed by DashboardApp so we get
    // the full camera + lightspeed overlay + auto-play after warp.
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('song:warp-request', {
          detail: { songSlug: newTrackId, source: 'dropdown', autoPlay: false }
        }));
        return; // Hand off to DashboardApp
      }
    } catch {}

    // Fallback: if the global handler isn't available (e.g., embedded usage),
    // perform a minimal local "warp" by switching focus and selecting the track.
    try {
      const { playerStore } = await import("@/store/usePlayerStore");
      const st = playerStore.getState();
      if (st) {
        st.setMain(newTrackId);
        st.setPlanetDisplayMode('hidden');
        st.setPlanetsVisible(false);
      }
    } catch {}

    try {
      await audioManager.selectTrack(newTrackId);
    } catch (err) {
      console.error('Failed to select track:', err);
      const trackInfo = TRACK_INFO[newTrackId];
      if (trackInfo) {
        audioManager.loadTrack(getTrackUrlFromSongId(newTrackId));
      }
    } finally {
      try {
        const { playerStore } = await import("@/store/usePlayerStore");
        const st2 = playerStore.getState();
        if (st2) {
          st2.setPlanetDisplayMode('single');
          st2.setPlanetsVisible(true);
        }
      } catch {}
    }
  }, [audioManager, profile?.tier, availableSongs]);

  // Handle play/pause button
  const handleTogglePlay = useCallback(() => {
    // Prefer the main player's native toggle (same as Spacebar) to ensure
    // we pause/resume the actual playback element when present.
    try {
      const mainToggle = (window as any)?.mainPlayerToggle;
      const main = document.querySelector<HTMLAudioElement>('audio[data-audio-player="1"]');
      if (typeof mainToggle === 'function' && main) {
        // Let MediaPlayer handle SFX to avoid double sounds
        mainToggle();
        return;
      }
    } catch {}

    // Fallback: use the provider toggle and local SFX
    try {
      if (audioManager.playing) {
        sfx.play('pause', 0.6);
      } else {
        sfx.play('flip', 0.6);
      }
    } catch {}
    audioManager.togglePlayPause();
  }, [audioManager]);

  // Handle click-to-seek
  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    const el = progressBarRef.current;
    if (!el || duration <= 0) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    audioManager.seek(ratio * duration);
  }, [duration, audioManager]);

  // Handle drag-to-seek with pointer events
  const handleProgressPointerDown = useCallback((e: React.PointerEvent) => {
    const el = progressBarRef.current;
    if (!el || duration <= 0) return;

    setIsDragging(true);

    const seekFromX = (clientX: number) => {
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = rect.width > 0 ? x / rect.width : 0;
      audioManager.seek(ratio * duration);
    };

    try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
    e.preventDefault();

    // Initial seek
    seekFromX(e.clientX);

    // Drag listeners
    const onMove = (ev: PointerEvent) => seekFromX(ev.clientX);
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }, [duration, audioManager]);

  // Keep track of the current audio element for reference
  useEffect(() => {
    const currentAudio = audioManager.getCurrentAudio();
    setCurrentAudioElement(currentAudio);
  }, [audioManager]);

  // Prepare dropdown items for SongDropdown component - memoized
  const dropdownItems = useMemo(() =>
    availableSongs.map((song: any) => {
      const timeLock = isTrackTimeLocked(song.id, profile?.tier);
      // If DB says released, don't lock it in UI
      const locked = !song.is_released && timeLock.locked;
      return {
        id: song.id,
        title: song.title,
        slug: song.id,
        icon: ELEMENT_MAP[song.id] || "music",
        locked,
        unlockDate: locked ? timeLock.unlockDate : undefined,
      };
    }),
    [availableSongs, profile?.tier]
  );

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[min(98vw,1100px)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Main player container */}
      <div className="bg-transparent rounded-2xl p-4 border border-[#19E3FF]/40 shadow-[0_0_25px_rgba(25,227,255,0.2)] overflow-hidden">
        <div className="flex flex-col gap-4">
          
          {/* Track Dropdown using existing SongDropdown component */}
          <div className="w-full">
            <SongDropdown 
              items={dropdownItems}
              initialActiveId={currentTrackInfo?.id || ""}
              currentId={currentTrackInfo?.id || ""}
              onChange={handleTrackChange}
            />
          </div>

          {/* Player Controls */}
          <div className="flex items-center justify-start gap-4 mt-2 -ml-2">

            {/* Play/Pause Button */}
            <button
              onClick={(e) => {
                if (process.env.NODE_ENV !== 'production') {
                  console.log('[UnifiedAudioPlayer] Play/Pause click', { playing: isPlaying });
                }
                try {
                  handleTogglePlay();
                } catch (err) {
                  console.error('[UnifiedAudioPlayer] togglePlayPause failed:', err);
                }
              }}
              className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#19E3FF]/20 to-[#38B6FF]/20 border-2 border-[#19E3FF]/60 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-[#19E3FF]/30 hover:border-[#19E3FF] hover:shadow-lg hover:shadow-[#19E3FF]/40 hover:scale-105"
              aria-label={isPlaying ? "Pause" : "Play"}
              style={{
                filter: 'drop-shadow(0 0 8px rgba(25, 227, 255, 0.3))'
              }}
            >
              {isPlaying ? (
                <div className="w-5 h-5 flex gap-1.5">
                  <div className="w-1.5 h-full bg-white rounded-sm"></div>
                  <div className="w-1.5 h-full bg-white rounded-sm"></div>
                </div>
              ) : (
                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[14px] border-l-white border-b-[10px] border-b-transparent ml-1"></div>
              )}
            </button>
          </div>

          {/* Progress Bar - Below controls */}
          <div className="flex items-center gap-2 mt-1">
            <div className="text-[#9EEBFF]/70 text-xs font-mono min-w-[3ch]">
              {formatTime(liveTime)}
            </div>
            <div className="flex-1 relative group cursor-pointer" onClick={handleProgressClick} onPointerDown={handleProgressPointerDown} style={{ touchAction: 'none' }}>
              <div
                ref={progressBarRef}
                className="relative w-full h-2 bg-white/20 rounded-full overflow-hidden hover:h-2.5"
                title="Click or drag to seek"
              >
                {/* Progress Fill with Gradient */}
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, progress * 100))}%`,
                    background: `linear-gradient(90deg, ${BRAND_COLORS.pink} 0%, ${BRAND_COLORS.blue} 50%, ${BRAND_COLORS.yellow} 100%)`,
                    boxShadow: `
                      0 0 8px ${BRAND_COLORS.pink}60,
                      0 0 16px ${BRAND_COLORS.blue}40
                    `
                  }}
                />
              </div>

              {/* Circular Handle - draggable seek dot */}
              <div
                className={`pointer-events-none absolute top-1/2 ${isDragging ? 'w-5 h-5' : 'w-4 h-4'} rounded-full bg-white border-2 border-white shadow-lg transition-opacity group-active:opacity-100 ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                style={{
                  left: `${Math.max(0, Math.min(100, progress * 100))}%`,
                  transform: 'translateX(-50%) translateY(-50%)',
                  boxShadow: `
                    0 0 8px rgba(255,255,255,0.85),
                    0 0 14px rgba(255,255,255,0.55),
                    0 2px 6px rgba(0,0,0,0.25)
                  `,
                  zIndex: 2
                }}
              />

              {/* Time label under the handle */}
              <div
                className={`pointer-events-none absolute text-[10px] font-mono text-white/95 bg-black/60 rounded px-1.5 py-0.5 shadow-md transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-active:opacity-100'}`}
                style={{
                  left: `${Math.max(0, Math.min(100, progress * 100))}%`,
                  top: 'calc(50% + 18px)',
                  transform: 'translateX(-50%)',
                  backdropFilter: 'blur(2px)',
                  zIndex: 2
                }}
              >
                {formatTime(liveTime)}
              </div>
            </div>
            <div className="text-[#9EEBFF]/70 text-xs font-mono">
              {formatTime(liveDuration)}
            </div>
          </div>

          {/* Track Info - Moved below controls for better visual hierarchy */}
          <div className="flex-1 min-w-0 text-center mt-2">
            <div className="text-[#CFF7FF] font-semibold text-base truncate">
              {currentTrackInfo?.title === 'BE MY BEE' ? '' : (currentTrackInfo?.title || "Select a Song")}
            </div>
            <div className="text-[#9EEBFF]/80 text-sm truncate">
              {currentTrackInfo?.oneLiner || "Choose from the dropdown above"}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default UnifiedAudioPlayer;

// Helper function to format time in MM:SS format
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
