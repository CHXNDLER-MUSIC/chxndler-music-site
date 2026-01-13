"use client";

import { useState, useEffect, useRef } from "react";
import { usePublicSoulJournalEntries } from "@/hooks/useSoulJournalEntries";
import { useProfile } from "@/contexts/ProfileContext";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getDisplayDateString } from "@/utils/dateHelpers";
import { sfx } from "@/lib/sfx";
import Image from 'next/image';
import UserBadges from "./UserBadges";
import UserCards from "./UserCards";
import TiltSpinCard from "./TiltSpinCard";

const ELEMENT_COLORS: Record<string, { color: string; glow: string; emoji: string; label: string }> = {
  heart: { color: "#F91880", glow: "#F918B0", emoji: "💖", label: "HEART" },
  water: { color: "#38B6FF", glow: "#38D6FF", emoji: "🌊", label: "WATER" },
  lightning: { color: "#F2EF1D", glow: "#FFFF00", emoji: "⚡", label: "LIGHTNING" },
  darkness: { color: "#FFFFFF", glow: "#E0E0E0", emoji: "🌑", label: "DARKNESS" },
};

// Type for card data from UserCards
type CardData = {
  id: string;
  card_name: string;
  element: string;
  rarity: string;
  is_released?: boolean;
  min_tier?: string;
  artwork_url?: string;
};

// Rarity colors for card display
const RARITY_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  common: { bg: 'rgba(156, 163, 175, 0.2)', border: '#9CA3AF', glow: '#9CA3AF40' },
  uncommon: { bg: 'rgba(34, 197, 94, 0.2)', border: '#22C55E', glow: '#22C55E40' },
  rare: { bg: 'rgba(59, 130, 246, 0.2)', border: '#3B82F6', glow: '#3B82F640' },
  epic: { bg: 'rgba(168, 85, 247, 0.2)', border: '#A855F7', glow: '#A855F740' },
  legendary: { bg: 'rgba(251, 191, 36, 0.2)', border: '#FBBF24', glow: '#FBBF2440' },
};

interface PublicJournalFeedProps {
  onStarToggle?: () => void;
}

export default function PublicJournalFeed({ onStarToggle }: PublicJournalFeedProps) {
  // Public feed - no auth dependency for viewing entries
  const { entries, loading, error, refreshEntries } = usePublicSoulJournalEntries();
  // Get current user's profile for avatar fallback on own entries
  const { user, profile } = useProfile();
  const [showProfileInfo, setShowProfileInfo] = useState<{[key: string]: boolean}>({});
  const [starredByMe, setStarredByMe] = useState<Set<string>>(new Set());
  const [starringEntryId, setStarringEntryId] = useState<string | null>(null);
  const [showIntegratedBinder, setShowIntegratedBinder] = useState<{[key: string]: boolean}>({});
  const [showBadgesModal, setShowBadgesModal] = useState<{[key: string]: boolean}>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [enlargedCard, setEnlargedCard] = useState<{ entryId: string; card: CardData } | null>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  // Public profile fallbacks when denormalized fields are missing
  const [authorOverrides, setAuthorOverrides] = useState<Record<string, { name: string | null; avatar: string | null }>>({});

  // Helper: Resolve avatar URL with correct priority order
  // 1. Current user's fresh profile (for own entries) - always use latest
  // 2. Fresh data from public_profiles_table (authorOverrides) - preferred over stale DB data
  // 3. entry.author_avatar_url (from DB - may be stale)
  // 4. default avatar "/elements/alien.webp"
  const resolveAvatarUrl = (entry: { user_id: string; author_avatar_url?: string | null }) => {
    // First priority: current user's profile context (for own entries) - always use fresh profile
    const isOwnEntry = user?.id && entry.user_id?.toLowerCase() === user.id?.toLowerCase();
    if (isOwnEntry && profile?.profile_image_url) {
      return profile.profile_image_url;
    }
    // Second priority: fresh data from public_profiles_table (authorOverrides)
    if (authorOverrides[entry.user_id]?.avatar) {
      return authorOverrides[entry.user_id].avatar;
    }
    // Third priority: DB-stored author avatar (may be stale)
    if (entry.author_avatar_url) {
      return entry.author_avatar_url;
    }
    // Fallback: default avatar
    return "/elements/alien.webp";
  };

  // Helper: Resolve author name with correct priority order
  const resolveAuthorName = (entry: { user_id: string; author_name?: string | null }) => {
    // First priority: DB-stored author name
    if (entry.author_name) {
      return entry.author_name;
    }
    // Second priority: current user's profile context (for own entries) - use case-insensitive comparison
    const isOwnEntry = user?.id && entry.user_id?.toLowerCase() === user.id?.toLowerCase();
    if (isOwnEntry && profile?.name) {
      return profile.name;
    }
    // Third priority: fetched public profile override (for other users)
    if (authorOverrides[entry.user_id]?.name) {
      return authorOverrides[entry.user_id].name;
    }
    // Fallback: default name
    return 'Alien';
  };

  // Check auth state only for starring functionality (not for viewing)
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const userId = session?.user?.id ?? null;
      setCurrentUserId(userId);

      // Load starred entries only if logged in
      if (userId) {
        try {
          const { data: starredData, error: starredError } = await supabaseBrowser
            .from('journal_entry_stars')
            .select('entry_id')
            .eq('user_id', userId);

          if (!starredError && starredData) {
            setStarredByMe(new Set(starredData.map(row => row.entry_id)));
          }
        } catch (err) {
          console.error('Error loading starred entries:', err);
        }
      }
    };

    checkAuth();
  }, []);

  // Preload spin audio
  useEffect(() => {
    spinAudioRef.current = new Audio('/sfx/spin.mp3');
    spinAudioRef.current.volume = 0.5;
  }, []);

  // Load author public profile info from public_profiles_table (view with proper RLS for anon access)
  // Always fetch fresh data to ensure profile images are up-to-date
  useEffect(() => {
    const loadAuthorProfiles = async () => {
      try {
        // Get ALL unique user IDs from entries (not just missing ones)
        const allUserIds = Array.from(new Set(
          (entries || [])
            .map(e => e.user_id)
            .filter(Boolean)
        ));

        if (allUserIds.length === 0) return;

        // Query public_profiles_table (view with anon RLS) for fresh profile_image_url
        const { data: profilesData, error: profilesError } = await supabaseBrowser
          .from('public_profiles_table')
          .select('id, name, profile_image_url')
          .in('id', allUserIds);

        if (profilesError) {
          console.warn('PublicJournalFeed: failed to query public_profiles_table', profilesError);
          return;
        }

        const next: Record<string, { name: string | null; avatar: string | null }> = {};
        (profilesData || []).forEach((profileData: any) => {
          if (profileData?.id) {
            next[profileData.id] = {
              name: profileData.name || null,
              avatar: profileData.profile_image_url || null
            };
          }
        });

        if (Object.keys(next).length > 0) {
          setAuthorOverrides(next);
        }
      } catch (err) {
        console.warn('PublicJournalFeed: failed to load public author profiles', err);
      }
    };

    if (entries && entries.length > 0) {
      loadAuthorProfiles();
    }
  }, [entries]);

  // Reset card state when enlarged card changes
  useEffect(() => {
    if (enlargedCard) {
      setIsCardFlipped(false);
      setSpinRotation(0);
    }
  }, [enlargedCard]);

  // Handle card click - spin 180 degrees
  const handleCardSpin = () => {
    // Play spin sound
    if (spinAudioRef.current) {
      spinAudioRef.current.currentTime = 0;
      spinAudioRef.current.play().catch(() => {});
    }
    // Toggle flip state (adds 180 degrees)
    setIsCardFlipped(prev => !prev);
  };

  const handleToggleStar = async (entryId: string, entryOwnerId: string) => {
    // Require authentication to star entries
    if (!currentUserId) {
      // Anon users can't star - just return silently
      return;
    }

    // Prevent self-starring - guard against own entries
    if (currentUserId.toLowerCase() === entryOwnerId.toLowerCase()) {
      return;
    }

    // Prevent double-clicks while request is in flight
    if (starringEntryId) return;

    setStarringEntryId(entryId);

    const isCurrentlyStarred = starredByMe.has(entryId);

    // Optimistic update: toggle star state
    if (isCurrentlyStarred) {
      setStarredByMe(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    } else {
      setStarredByMe(prev => new Set(prev).add(entryId));
    }

    try {
      // Call the RPC to toggle the star (server is source of truth)
      const { error } = await supabaseBrowser
        .rpc('toggle_journal_entry_star', { p_entry_id: entryId });

      if (error) {
        console.error('Error toggling star:', error);
        // Revert optimistic update on failure
        if (isCurrentlyStarred) {
          setStarredByMe(prev => new Set(prev).add(entryId));
        } else {
          setStarredByMe(prev => {
            const next = new Set(prev);
            next.delete(entryId);
            return next;
          });
        }
        setStarringEntryId(null);
        return;
      }

      // Refresh entries to get updated star counts
      refreshEntries();

      // Notify parent to refresh their journal entries (syncs private tab)
      onStarToggle?.();
    } catch (err) {
      console.error('Failed to toggle star:', err);
      // Revert optimistic update
      if (isCurrentlyStarred) {
        setStarredByMe(prev => new Set(prev).add(entryId));
      } else {
        setStarredByMe(prev => {
          const next = new Set(prev);
          next.delete(entryId);
          return next;
        });
      }
    } finally {
      setStarringEntryId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: "#FFFFFFCC" }}>
        Loading public reflections…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: "#FFFFFFCC" }}>
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Full-screen Enlarged Card Overlay */}
      {enlargedCard && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.98) 100%)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => {
            try { sfx.play('click', 0.4); } catch {}
            setEnlargedCard(null);
          }}
        >
          {/* Interactive Card with TiltSpinCard - fills the container */}
          <TiltSpinCard
            enableSpin={true}
            spinSensitivity={0.8}
            maxRotateX={15}
            maxRotateY={25}
            onRotationChange={(rotation) => setSpinRotation(rotation)}
            onClick={(e) => {
              e.stopPropagation();
              handleCardSpin();
            }}
            className="cursor-grab active:cursor-grabbing h-full flex items-center justify-center"
            style={{
              width: '100%',
              height: '100%',
              padding: '8px',
            }}
          >
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                height: '100%',
                maxHeight: '100%',
                aspectRatio: '3/4',
                boxShadow: `
                  0 0 60px ${RARITY_COLORS[enlargedCard.card.rarity?.toLowerCase()]?.glow || '#FF69B440'},
                  0 20px 40px rgba(0,0,0,0.5),
                  inset 0 0 30px rgba(255,255,255,0.1)
                `,
                border: `3px solid ${RARITY_COLORS[enlargedCard.card.rarity?.toLowerCase()]?.border || '#FF69B4'}60`,
                transform: `rotateY(${spinRotation + (isCardFlipped ? 180 : 0)}deg)`,
                transition: isCardFlipped !== undefined ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Card front */}
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: 'hidden',
                }}
              >
                <img
                  src={enlargedCard.card.artwork_url || '/cards/default-card.webp'}
                  alt={enlargedCard.card.card_name}
                  className="w-full h-full object-cover"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.src = '/cards/default-card.webp';
                  }}
                />
                {/* Holographic overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(
                      ${135 + (spinRotation % 360)}deg,
                      transparent 0%,
                      rgba(255,255,255,0.1) 25%,
                      transparent 50%,
                      rgba(255,255,255,0.15) 75%,
                      transparent 100%
                    )`,
                    mixBlendMode: 'overlay',
                  }}
                />
              </div>

              {/* Card back */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                }}
              >
                <div
                  className="text-4xl font-bold"
                  style={{
                    color: RARITY_COLORS[enlargedCard.card.rarity?.toLowerCase()]?.border || '#FF69B4',
                    textShadow: `0 0 30px ${RARITY_COLORS[enlargedCard.card.rarity?.toLowerCase()]?.border || '#FF69B4'}`,
                  }}
                >
                  ✧
                </div>
              </div>
            </div>
          </TiltSpinCard>
        </div>
      )}

      {/* CSS for pulsing animation */}
      <style jsx>{`
        @keyframes cardPulse {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>

      {entries.length === 0 ? (
        <div className="text-center p-8 text-white/60">
          <div className="text-lg mb-2">🌍 No Public Journal Entries</div>
          <div className="text-sm opacity-80">Public journal entries will appear here</div>
        </div>
      ) : (
        entries.map((entry) => {
          const entryTheme = ELEMENT_COLORS[entry.element] || ELEMENT_COLORS.heart;

          return (
            <div
              key={entry.entry_id}
              className="rounded-lg p-2 space-y-2 transition-all duration-200 hover:opacity-90"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: `1px solid ${entryTheme.color}40`,
                boxShadow: `0 0 15px ${entryTheme.color}20`
              }}
            >
              {/* Header with Profile (left), Date (center), Element + Soul Star (right) */}
              <div className="flex items-center justify-between mb-2 relative">
                {/* Profile Info - Left */}
                <div
                  className="flex items-center gap-2 cursor-pointer transition-all duration-200 hover:opacity-80 hover:scale-105"
                  onClick={(e) => {
                    e.stopPropagation();
                    try { sfx.play('click', 0.6); } catch {}
                    setShowProfileInfo(prev => ({
                      ...prev,
                      [entry.entry_id]: !prev[entry.entry_id]
                    }));
                  }}
                  onMouseEnter={() => {
                    try { sfx.play('hover', 0.6); } catch {}
                  }}
                >
                  <img
                    src={resolveAvatarUrl(entry)}
                    alt="User"
                    className="w-8 h-8 rounded-full object-cover"
                    style={{
                      border: `1px solid ${entryTheme.color}60`,
                      boxShadow: `0 0 4px ${entryTheme.color}30`
                    }}
                    onError={(e) => {
                      e.currentTarget.src = '/elements/alien.webp';
                    }}
                  />
                  <div className="text-sm font-medium text-white">
                    {resolveAuthorName(entry)}
                  </div>
                </div>

                {/* Date + Element + Soul Star - Right */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="text-sm font-semibold text-white/90">
                    {getDisplayDateString(entry.entry_date)}
                  </div>
                  <div
                    className="px-1.5 py-0.5 text-xs font-semibold uppercase flex items-center"
                    style={{
                      color: entryTheme.color,
                      textShadow: `0 0 4px ${entryTheme.glow}`
                    }}
                  >
                    {entry.element?.toUpperCase()}
                  </div>
                  {/* Soul Star Button - Always visible, disabled for own entries */}
                  {(() => {
                    const isOwnEntry = currentUserId && entry.user_id && currentUserId.toLowerCase() === entry.user_id.toLowerCase();
                    return (
                      <button
                        type="button"
                        className={`flex items-center gap-1 transition-all duration-200 px-1 py-1 ${
                          isOwnEntry ? 'cursor-default' : starringEntryId === entry.entry_id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'
                        }`}
                        disabled={isOwnEntry || starringEntryId === entry.entry_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isOwnEntry) {
                            // If not logged in, play song-select sound and return
                            if (!currentUserId) {
                              try {
                                const audio = new Audio('/audio/song-select.mp3');
                                audio.volume = 0.6;
                                audio.play().catch(() => {});
                              } catch {}
                              return;
                            }
                            try { sfx.play('card-ding', 0.45); } catch {}
                            handleToggleStar(entry.entry_id, entry.user_id);
                          }
                        }}
                        onMouseEnter={() => {
                          if (!isOwnEntry) {
                            try { sfx.play('hover', 0.6); } catch {}
                          }
                        }}
                        style={{
                          background: 'transparent',
                          opacity: isOwnEntry ? 0.7 : 1
                        }}
                      >
                        <Image
                          src="/elements/soul-star.webp"
                          alt="Soul Star"
                          width={28}
                          height={28}
                          style={{
                            filter: starredByMe.has(entry.entry_id)
                              ? `drop-shadow(0 0 10px ${entryTheme.color}) drop-shadow(0 0 20px ${entryTheme.glow}) brightness(1.3)`
                              : `drop-shadow(0 0 6px ${entryTheme.color}) drop-shadow(0 0 10px ${entryTheme.glow}) brightness(1.0)`
                          }}
                        />
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color: entryTheme.color,
                            textShadow: starredByMe.has(entry.entry_id)
                              ? `0 0 8px ${entryTheme.glow}, 0 0 12px ${entryTheme.glow}`
                              : `0 0 4px ${entryTheme.glow}`
                          }}
                        >
                          {(entry as any).stars_count ?? 0}
                        </span>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Soul Star Preview - Always visible in public view */}
              <div
                className="rounded-lg px-3 py-2 mb-2"
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${entryTheme.color}60`,
                  boxShadow: `0 0 12px ${entryTheme.color}20`
                }}
              >
                {showProfileInfo[entry.entry_id] ? (
                  <>
                    {/* Profile Info Layout */}
                    <div className="flex flex-col mb-3">
                      {/* Top Row: Profile/Name/Journey/Element on left, Stats on right */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start">
                          <img
                            src={resolveAvatarUrl(entry)}
                            alt="User"
                            className="w-16 h-16 rounded-full object-cover mr-3"
                            style={{
                              border: `3px solid ${entryTheme.color}60`,
                              boxShadow: `0 0 12px ${entryTheme.color}30`
                            }}
                            onError={(e) => {
                              e.currentTarget.src = '/elements/alien.webp';
                            }}
                          />
                          <div className="flex flex-col">
                            <div className="text-2xl font-bold text-white">
                              {resolveAuthorName(entry)}
                            </div>

                            {/* Element label */}
                            <div
                              className="text-sm font-medium uppercase tracking-wider flex items-center gap-1 mt-2"
                              style={{
                                color: entryTheme.color,
                                background: 'transparent',
                                border: 'none'
                              }}
                            >
                              {entry.element ? entry.element.toUpperCase() : 'UNKNOWN ELEMENT'}
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Binder, Badges, and Send HeartCoin Buttons - Larger and Centered */}
                      <div className="flex justify-center gap-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            try { sfx.play('click', 0.4); } catch {}
                            setShowBadgesModal(prev => ({ ...prev, [entry.entry_id]: false }));
                            setShowIntegratedBinder(prev => ({ ...prev, [entry.entry_id]: !prev[entry.entry_id] }));
                          }}
                          onMouseEnter={() => {
                            try { sfx.play('hover', 0.6); } catch {}
                          }}
                          className="w-20 h-20 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center"
                          style={{
                            background: 'transparent',
                            color: '#00BFFF',
                            textShadow: '0 0 4px #00BFFF'
                          }}
                        >
                          <img
                            src="/elements/binder.webp"
                            alt="Binder"
                            className="w-12 h-12"
                          />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            try { sfx.play('click', 0.4); } catch {}
                            setShowIntegratedBinder(prev => ({ ...prev, [entry.entry_id]: false }));
                            setShowBadgesModal(prev => ({ ...prev, [entry.entry_id]: !prev[entry.entry_id] }));
                          }}
                          onMouseEnter={() => {
                            try { sfx.play('hover', 0.6); } catch {}
                          }}
                          className="w-20 h-20 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center"
                          style={{
                            background: 'transparent',
                            color: '#FF69B4',
                            textShadow: '0 0 4px #FF69B4'
                          }}
                        >
                          <img
                            src="/elements/badges.webp"
                            alt="Badges"
                            className="w-12 h-12"
                          />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            try { sfx.play('click', 0.4); } catch {}
                            // TODO: Add send heart coin functionality
                            console.log('Send heart coin to:', entry.user_id);
                          }}
                          onMouseEnter={() => {
                            try { sfx.play('hover', 0.6); } catch {}
                          }}
                          className="w-20 h-20 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center"
                          style={{
                            background: 'transparent',
                            color: '#FF69B4',
                            textShadow: '0 0 4px #FF69B4'
                          }}
                        >
                          <img
                            src="/elements/heart-coin.webp"
                            alt="Send Heart Coin"
                            className="w-12 h-12"
                          />
                        </button>
                      </div>
                    </div>

                    {/* Integrated Binder Display - Show when BINDER is clicked, hide when card is enlarged */}
                    {showIntegratedBinder[entry.entry_id] && enlargedCard?.entryId !== entry.entry_id && (
                      <div
                        className="rounded-lg px-3 py-2 mb-2"
                        style={{
                          background: 'rgba(255, 105, 180, 0.1)',
                          border: `1px solid #FF69B430`,
                          boxShadow: `0 0 8px #FF69B420`
                        }}
                      >
                        <UserCards
                          userId={entry.user_id}
                          embedded={true}
                          showTitle={true}
                          maxCards={4}
                          onCardClick={(card) => {
                            try { sfx.play('card-ding', 0.5); } catch {}
                            setEnlargedCard({ entryId: entry.entry_id, card });
                          }}
                        />
                      </div>
                    )}

                    {/* Integrated Badges Display - Show when BADGES is clicked */}
                    {showBadgesModal[entry.entry_id] && (
                      <div
                        className="rounded-lg px-3 py-2 mb-2"
                        style={{
                          background: 'rgba(255, 105, 180, 0.1)',
                          border: `1px solid #FF69B430`,
                          boxShadow: `0 0 8px #FF69B420`
                        }}
                      >
                        <div className="text-center mb-3">
                          <h3 className="text-lg font-bold text-white">
                            BADGE COLLECTION
                          </h3>
                        </div>
                        <UserBadges
                          userId={entry.user_id}
                          embedded={true}
                          maxBadges={4}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{
                          filter: `drop-shadow(0 0 4px ${entryTheme.color})`
                        }}
                      >
                        <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" fill={entryTheme.color} stroke={entryTheme.color} strokeWidth="0.5"/>
                        <circle cx="12" cy="12" r="8" fill="none" stroke={entryTheme.color} strokeWidth="1" opacity="0.6"/>
                      </svg>
                      <div
                        className="text-sm font-semibold uppercase tracking-wider"
                        style={{ color: entryTheme.color, textShadow: `0 0 4px ${entryTheme.glow}` }}
                      >
                        Soul Star
                      </div>
                    </div>
                    <div className="text-sm leading-relaxed text-white">
                      {entry.entry_text || "No entry text"}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
