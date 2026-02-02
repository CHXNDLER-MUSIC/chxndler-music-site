"use client";

import { useState, useEffect, useRef } from "react";
import { usePublicSoulJournalEntries } from "@/hooks/useSoulJournalEntries";
import { useProfile } from "@/contexts/ProfileContext";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getDisplayDateString } from "@/utils/dateHelpers";
import { sfx } from "@/lib/sfx";
import Image from 'next/image';
import UserBadges from "./UserBadges";
import { getCardImageUrl } from "@/lib/supabaseCardUrl";
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

// Type for badge data from UserBadges
type BadgeData = {
  id: string;
  badge_name: string;
  description: string | null;
  icon_url: string | null;
  category: string | null;
  earned_at?: string | null;
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
  const [enlargedBadge, setEnlargedBadge] = useState<{ entryId: string; badge: BadgeData } | null>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);
  const [badgeRotation, setBadgeRotation] = useState(0);
  const [isBadgeAnimatingFlip, setIsBadgeAnimatingFlip] = useState(false);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  // Public profile fallbacks when denormalized fields are missing
  const [authorOverrides, setAuthorOverrides] = useState<Record<string, { name: string | null; avatar: string | null; journey: string | null }>>({});

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

  // Helper: Resolve author journey with correct priority
  // 1. Current user's fresh profile (for own entries)
  // 2. Fresh data from public_profiles_table (authorOverrides)
  // 3. Fallback: 'wanderer'
  const resolveAuthorJourney = (entry: { user_id: string }) => {
    const isOwnEntry = user?.id && entry.user_id?.toLowerCase() === user.id?.toLowerCase();
    if (isOwnEntry && profile?.journey) {
      return profile.journey;
    }
    if (authorOverrides[entry.user_id]?.journey) {
      return authorOverrides[entry.user_id].journey;
    }
    return 'wanderer';
  };

  // Helper: Map journey to display label/color
  const getJourneyDisplay = (journey: string | null | undefined) => {
    const j = (journey || 'wanderer').toString().toLowerCase();
    switch (j) {
      case 'lover':
        return { label: 'LOVER', color: '#FF6B9D' };
      case 'dreamer':
        return { label: 'DREAMER', color: '#FFD700' };
      default:
        return { label: 'WANDERER', color: '#00FFFF' };
    }
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

        const next: Record<string, { name: string | null; avatar: string | null; journey: string | null }> = {};
        (profilesData || []).forEach((profileData: any) => {
          if (profileData?.id) {
            next[profileData.id] = {
              name: profileData.name || null,
              avatar: profileData.profile_image_url || null,
              journey: null
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

  // Reset badge state when enlarged badge changes
  useEffect(() => {
    if (enlargedBadge) {
      setBadgeRotation(0);
      setIsBadgeAnimatingFlip(false);
    }
  }, [enlargedBadge]);

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
    <div
      className="space-y-4 relative"
      style={{
        overflow: (enlargedCard || enlargedBadge) ? 'hidden' : undefined,
        height: (enlargedCard || enlargedBadge) ? '100%' : undefined,
      }}
    >
      {/* Full-screen Enlarged Card Overlay - covers entire journal panel */}
      {enlargedCard && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(12px)',
            overflow: 'hidden',
          }}
          onClick={() => {
            try { sfx.play('close', 0.8); } catch {}
            setEnlargedCard(null);
            setIsCardFlipped(false);
            setSpinRotation(0);
          }}
        >
          {/* Back arrow button - top left */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              try { sfx.play('close', 0.8); } catch {}
              setEnlargedCard(null);
              setIsCardFlipped(false);
              setSpinRotation(0);
            }}
            onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
            className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center text-pink-400 hover:text-pink-200 transition-all duration-200 z-20"
            style={{
              background: 'rgba(255,105,180,0.1)',
              border: '2px solid #FF69B4',
              boxShadow: '0 0 20px rgba(255,105,180,0.8), 0 0 30px rgba(255,105,180,0.6), 0 0 40px rgba(255,105,180,0.4)',
              textShadow: '0 0 10px rgba(255,105,180,0.8)',
              backdropFilter: 'blur(10px)'
            }}
            aria-label="Close card"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Content container - fills entire area like badge overlay */}
          <div
            className="relative w-full h-full max-h-[90%] rounded-lg p-4 flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 0 30px rgba(255, 105, 180, 0.25)'
            }}
          >
            {/* TiltSpinCard wrapper for drag-to-spin interaction */}
            <div
              className="flex-1 flex items-center justify-center w-full"
              style={{
                animation: 'cardPulse 3s ease-in-out infinite',
              }}
            >
              <TiltSpinCard
                className="relative flex items-center justify-center"
                style={{ width: '100%', height: '100%', borderRadius: '24px' }}
                maxRotateX={10}
                sensitivity={0.3}
                returnDuration={400}
                enableSpin={true}
                spinSensitivity={0.8}
                onRotationChange={setSpinRotation}
                onClick={() => {
                  try { sfx.play('flip', 0.45); } catch {}
                  setIsCardFlipped(prev => !prev);
                }}
              >
                {/* Front of card - rotates with spinRotation */}
                <img
                  src={getCardImageUrl((enlargedCard.card as any).image_object_key || enlargedCard.card.card_name || 'CHXNDLER')}
                  alt={enlargedCard.card.card_name}
                  className="rounded-2xl pointer-events-none"
                  style={{
                    maxHeight: '70vh',
                    maxWidth: '80%',
                    objectFit: 'contain',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: `rotateY(${spinRotation + (isCardFlipped ? 180 : 0)}deg)`,
                    transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    border: '2px solid rgba(255,255,255,0.1)',
                  }}
                  draggable={false}
                  onError={(e) => {
                    const objectKey = (enlargedCard.card as any).image_object_key || enlargedCard.card.card_name || 'CHXNDLER';
                    console.warn('[CardImage] Failed to load card image', { objectKey, attemptedUrl: e.currentTarget.src });
                    const fallback = getCardImageUrl('CHXNDLER');
                    if (e.currentTarget.src !== fallback) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                />

                {/* Back of card - offset by 180° */}
                <img
                  src={getCardImageUrl('BACK')}
                  alt="Card Back"
                  className="absolute rounded-2xl pointer-events-none"
                  style={{
                    maxHeight: '70vh',
                    maxWidth: '80%',
                    objectFit: 'contain',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotateY(${spinRotation + (isCardFlipped ? 180 : 0) + 180}deg)`,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    border: '2px solid rgba(255,255,255,0.1)',
                  }}
                  draggable={false}
                />
              </TiltSpinCard>
            </div>

            {/* Card name at bottom */}
            <div className="text-center mt-4">
              <div className="text-2xl font-bold text-white">
                {enlargedCard.card.card_name}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Enlarged Badge Overlay - covers entire journal panel */}
      {enlargedBadge && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(12px)',
            overflow: 'hidden',
          }}
          onClick={() => {
            try { sfx.play('close', 0.8); } catch {}
            setEnlargedBadge(null);
            setBadgeRotation(0);
            setIsBadgeAnimatingFlip(false);
          }}
        >
          {/* Back arrow button - top left */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              try { sfx.play('close', 0.8); } catch {}
              setEnlargedBadge(null);
              setBadgeRotation(0);
              setIsBadgeAnimatingFlip(false);
            }}
            onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
            className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center text-pink-400 hover:text-pink-200 transition-all duration-200 z-20"
            style={{
              background: 'rgba(255,105,180,0.1)',
              border: '2px solid #FF69B4',
              boxShadow: '0 0 20px rgba(255,105,180,0.8), 0 0 30px rgba(255,105,180,0.6), 0 0 40px rgba(255,105,180,0.4)',
              textShadow: '0 0 10px rgba(255,105,180,0.8)',
              backdropFilter: 'blur(10px)'
            }}
            aria-label="Close badge"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Content container */}
          <div
            className="relative w-full h-full max-h-[90%] rounded-lg p-4 flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 0 30px rgba(255, 105, 180, 0.25)'
            }}
          >
            {(() => {
              // Category colors for badge styling
              const getCategoryColors = (category: string | null) => {
                switch(category) {
                  case 'soul': return { bg: '#FFD700', border: '#FFA500' };
                  case 'collector': return { bg: '#38B6FF', border: '#0EA5E9' };
                  case 'community': return { bg: '#10B981', border: '#059669' };
                  case 'elemental-streak': return { bg: '#FC54AF', border: '#EC4899' };
                  case 'currency': return { bg: '#FFD700', border: '#FFA500' };
                  case 'listening': return { bg: '#9333EA', border: '#7C3AED' };
                  default: return { bg: '#FFD700', border: '#FFA500' };
                }
              };
              const colors = getCategoryColors(enlargedBadge.badge.category);

              // Fallback emoji based on category
              const fallbackEmoji = (() => {
                switch(enlargedBadge.badge.category) {
                  case 'soul': return '⭐';
                  case 'collector': return '🏆';
                  case 'community': return '🌐';
                  case 'elemental-streak': return '💠';
                  case 'currency': return '💰';
                  case 'listening': return '🎵';
                  default: return '🏆';
                }
              })();

              // Format claimed date
              const formatClaimedDate = (dateString: string | null | undefined) => {
                if (!dateString) return '';
                const d = new Date(dateString);
                const mm = d.getMonth() + 1;
                const dd = d.getDate();
                const yyyy = d.getFullYear();
                return `${mm}/${dd}/${yyyy}`;
              };
              const claimedDateStr = formatClaimedDate(enlargedBadge.badge.earned_at);

              // Badge icon overrides
              const badgeIconOverrides: Record<string, string> = {
                'wanderer': '/badges/wanderer.webp',
                'first steps': '/badges/wanderer.webp',
              };
              const badgeNameLower = enlargedBadge.badge.badge_name?.toLowerCase() || '';
              const iconUrl = badgeIconOverrides[badgeNameLower] || enlargedBadge.badge.icon_url;

              return (
                <>
                  <div className="flex items-center justify-center mb-6 flex-1">
                    {/* TiltSpinCard wrapper for drag-to-spin interaction */}
                    <TiltSpinCard
                      enableSpin={true}
                      spinSensitivity={0.8}
                      onRotationChange={(rotation) => setBadgeRotation(rotation)}
                      onClick={() => {
                        try { sfx.play('flip', 0.45); } catch {}
                        setIsBadgeAnimatingFlip(true);
                        setBadgeRotation((prev) => prev + 180);
                        setTimeout(() => setIsBadgeAnimatingFlip(false), 500);
                      }}
                      style={{ cursor: 'grab' }}
                    >
                      <div
                        className="relative"
                        style={{
                          width: '200px',
                          height: '200px',
                          transformStyle: 'preserve-3d',
                          perspective: '1000px'
                        }}
                      >
                        {/* Front of badge */}
                        <div
                          className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden"
                          style={{
                            width: '200px',
                            height: '200px',
                            background: 'transparent',
                            border: `2px solid ${colors.border}`,
                            boxShadow: `0 0 15px ${colors.border}80, 0 0 30px ${colors.border}40`,
                            transform: `rotateY(${badgeRotation}deg)`,
                            backfaceVisibility: 'hidden',
                            transition: isBadgeAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                          }}
                        >
                          {iconUrl ? (
                            <img
                              src={iconUrl}
                              alt={enlargedBadge.badge.badge_name || 'Badge'}
                              className="w-full h-full object-cover"
                              draggable={false}
                              style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.8))', animation: 'cardPulse 2s ease-in-out infinite' }}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <span className="text-7xl" style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.8))' }}>
                              {fallbackEmoji}
                            </span>
                          )}
                        </div>

                        {/* Back of badge */}
                        <div
                          className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden"
                          style={{
                            width: '200px',
                            height: '200px',
                            background: `linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)`,
                            border: `2px solid ${colors.border}`,
                            boxShadow: `0 0 15px ${colors.border}80, 0 0 30px ${colors.border}40`,
                            transform: `rotateY(${badgeRotation + 180}deg)`,
                            backfaceVisibility: 'hidden',
                            transition: isBadgeAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                          }}
                        >
                          {claimedDateStr ? (
                            <div className="flex flex-col items-center justify-center text-center px-3">
                              <div className="text-base font-semibold tracking-wider" style={{ color: '#39FF14', textShadow: '0 0 8px #39FF14, 0 0 14px #39FF14' }}>CLAIMED</div>
                              <div className="text-white/80 text-sm mt-0.5">
                                {claimedDateStr}
                              </div>
                            </div>
                          ) : (
                            <span
                              className="text-5xl font-bold"
                              style={{
                                color: 'rgba(255,255,255,0.2)',
                                textShadow: '0 0 4px rgba(255,255,255,0.25)'
                              }}
                            >
                              {fallbackEmoji}
                            </span>
                          )}
                        </div>
                      </div>
                    </TiltSpinCard>
                  </div>

                  {/* Badge name and description */}
                  <div className="text-center mt-4">
                    <div className="text-2xl font-bold text-white mb-2">
                      {enlargedBadge.badge.badge_name}
                    </div>
                    {enlargedBadge.badge.description && (
                      <div className="text-base text-white/80">
                        {enlargedBadge.badge.description}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
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

                            {/* Journey label */}
                            {(() => {
                              const { label, color } = getJourneyDisplay(resolveAuthorJourney(entry));
                              return (
                                <div
                                  className="text-sm font-semibold tracking-wider mt-1"
                                  style={{ color, textShadow: `0 0 6px ${color}80` }}
                                >
                                  {label}
                                </div>
                              );
                            })()}

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
                            style={{ opacity: 0.5 }}
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
                          onBadgeClick={(badge) => {
                            try { sfx.play('card-ding', 0.5); } catch {}
                            setEnlargedBadge({ entryId: entry.entry_id, badge });
                          }}
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
