"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile } from "@/contexts/ProfileContext";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { sfx } from "@/lib/sfx";
import { getBadgeProgressForUser, formatRequirementText } from "@/lib/badgeProgress";

// Local types for badge display
interface BadgeDisplay {
  id: string;
  badge_name: string;
  description: string | null;
  icon_url: string | null;
  category: string | null;
  requirement: string | null;
  requirement_type: string;
  requirement_count: number;
  unlocked: boolean;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

interface UserProfile {
  id: string;
  name: string | null;
  heartcoin_total: number | null;
  daily_streak: number | null;
  total_reflections?: number | null;
  total_listening_minutes?: number | null;
  total_heartcoins_earned?: number | null;
  elemental_sessions_count?: number | null;
  community_interactions?: number | null;
  achievements_unlocked?: number | null;
  streams_attended?: number | null;
  concerts_attended?: number | null;
  cards_owned?: number | null;
  merch_items_owned?: number | null;
  donations_made?: number | null;
  heartcoins_sent?: number | null;
}

interface BadgeDefinition {
  id: string;
  slug: string;
  badge_name: string;
  description: string | null;
  requirement_type: string;
  requirement_count: number;
  icon_url: string | null;
  category: string | null;
  created_at: string;
}

interface UserBadgeRecord {
  id: string;
  badge_id: string;
  earned_at: string;
}

type Props = {
  userId: string; // User ID to show badges for
  embedded?: boolean;
  className?: string;
  showTitle?: boolean;
  maxBadges?: number; // Limit number of badges shown
  onBadgeClick?: (badge: BadgeDisplay) => void;
};

export default function UserBadges({ 
  userId, 
  embedded = true, 
  className = "", 
  showTitle = false,
  maxBadges = 6,
  onBadgeClick 
}: Props) {
  const { user: currentUser } = useProfile();
  
  // State for user data
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadgeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!userId) return;
        
        const { data, error } = await supabaseBrowser
          .from('profiles')
          .select(`
            id,
            name,
            heartcoin_total,
            daily_streak_current,
            total_reflections,
            total_listening_minutes,
            total_heartcoins_earned,
            elemental_sessions_count,
            community_interactions,
            achievements_unlocked,
            streams_attended,
            concerts_attended,
            cards_owned,
            merch_items_owned,
            donations_made,
            heartcoins_sent
          `)
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          setError(`Failed to load user profile: ${error.message}`);
          return;
        }

        setUserProfile({
          id: data.id,
          name: data.name,
          heartcoin_total: data.heartcoin_total,
          daily_streak: data.daily_streak_current,
          total_reflections: data.total_reflections,
          total_listening_minutes: data.total_listening_minutes,
          total_heartcoins_earned: data.total_heartcoins_earned,
          elemental_sessions_count: data.elemental_sessions_count,
          community_interactions: data.community_interactions,
          achievements_unlocked: data.achievements_unlocked,
          streams_attended: data.streams_attended,
          concerts_attended: data.concerts_attended,
          cards_owned: data.cards_owned,
          merch_items_owned: data.merch_items_owned,
          donations_made: data.donations_made,
          heartcoins_sent: data.heartcoins_sent,
        });
      } catch (err) {
        console.error('Error in fetchUserProfile:', err);
        setError(`Failed to fetch user profile: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    fetchUserProfile();
  }, [userId]);

  // Fetch badge data
  useEffect(() => {
    const fetchBadgeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all badges and user badges in parallel
        const [badgesResponse, userBadgesResponse] = await Promise.all([
          supabaseBrowser
            .from('badges')
            .select('*')
            .order('category', { ascending: true })
            .order('badge_name', { ascending: true }),
          supabaseBrowser
            .from('user_badges')
            .select('id, badge_id, earned_at')
            .eq('user_id', userId)
        ]);

        if (badgesResponse.error) {
          console.error('Error fetching badges:', badgesResponse.error);
          setError(`Failed to load badges: ${badgesResponse.error.message}`);
          return;
        }

        if (userBadgesResponse.error) {
          console.error('Error fetching user badges:', userBadgesResponse.error);
          setError(`Failed to load user badges: ${userBadgesResponse.error.message}`);
          return;
        }

        setAllBadges(badgesResponse.data || []);
        setUserBadges(userBadgesResponse.data || []);
      } catch (err) {
        console.error('Error in fetchBadgeData:', err);
        setError(`Failed to fetch badge data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBadgeData();
    setCurrentPage(0); // Reset to first page when userId changes
  }, [userId]);

  // Create badge display objects with unlocked status and progress
  const badgesWithUnlocked: BadgeDisplay[] = useMemo(() => {
    if (!allBadges.length || !userProfile) return [];
    
    return allBadges.map(badge => {
      const userBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
      const isUnlocked = userBadgeIds.has(badge.id);
      
      // Calculate progress for this badge
      let progress;
      if (badge.requirement_type && badge.requirement_count && userProfile) {
        const badgeProgress = getBadgeProgressForUser({
          requirement_type: badge.requirement_type,
          requirement_count: badge.requirement_count,
          id: badge.id,
          slug: badge.slug || '',
          badge_name: badge.badge_name,
          icon_url: badge.icon_url,
          description: badge.description,
          requirement_text: null,
          category: badge.category as any,
          created_at: badge.created_at
        }, userProfile);
        
        progress = {
          current: badgeProgress.current,
          target: badgeProgress.target,
          percentage: badgeProgress.percentage
        };
      } else {
        // Fallback for badges without proper requirement data
        progress = {
          current: 0,
          target: badge.requirement_count || 1,
          percentage: 0
        };
      }
      
      return {
        id: badge.id,
        badge_name: badge.badge_name,
        description: badge.description,
        icon_url: badge.icon_url,
        category: badge.category,
        requirement: null,
        requirement_type: badge.requirement_type,
        requirement_count: badge.requirement_count,
        unlocked: isUnlocked,
        progress
      };
    });
  }, [allBadges, userBadges, userProfile]);

  // Get user's unlocked badges for display
  const userUnlockedBadges = badgesWithUnlocked.filter(badge => badge.unlocked);

  if (loading) {
    return (
      <div className={`text-center text-white/60 ${className}`}>
        Loading badges...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center text-red-400 text-sm ${className}`}>
        Error loading badges: {error}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showTitle && (
        <div className="flex items-center gap-2 mb-3">
          <img 
            src="/elements/badges.webp" 
            alt="Badges" 
            className="w-5 h-5"
          />
          <h3 className="text-sm font-bold uppercase tracking-wider animate-pulse text-cyan-300">
            BADGES CLAIMED
          </h3>
        </div>
      )}

      {/* Horizontal Badge Row */}
      <div className="flex items-center justify-center gap-4 min-h-[60px] bg-black/30 rounded-xl p-3 border border-white/10">
        {/* Left arrow button if not on first page */}
        {currentPage > 0 && (
          <button
            onClick={() => {
              try { 
                sfx.play('click', 0.4); 
              } catch {}
              setCurrentPage(currentPage - 1);
            }}
            onMouseEnter={() => {
              try { sfx.play('hover', 0.6); } catch {}
            }}
            className="flex items-center justify-center w-6 h-8 rounded transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(255, 105, 180, 0.1)',
              border: '1px solid #FF69B440',
              color: '#FF69B4',
              boxShadow: '0 0 4px #FF69B420'
            }}
          >
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none"
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
        )}

        {userUnlockedBadges.length > 0 ? (
          <>
            {userUnlockedBadges.slice(currentPage * maxBadges, (currentPage + 1) * maxBadges).map((badge) => (
              <div
                key={badge.id}
                className="relative w-12 h-12 rounded-full flex items-center justify-center group overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-200 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(40,40,40,0.8) 100%)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 255, 255, 0.3)'
                }}
                title={badge.badge_name}
                onClick={() => {
                  try { sfx.play('click', 0.6); } catch {}
                  if (onBadgeClick) {
                    onBadgeClick(badge);
                  }
                }}
                onMouseEnter={() => {
                  try { sfx.play('hover', 0.6); } catch {}
                }}
              >
                {/* Badge content */}
                <div className="relative z-10">
                  {badge.icon_url ? (
                    <img
                      src={badge.icon_url}
                      alt={badge.badge_name}
                      className="w-full h-full object-cover rounded-full"
                      draggable={false}
                    />
                  ) : (
                    <div className="text-lg">🏅</div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Right arrow button if user has more badges */}
            {userUnlockedBadges.length > (currentPage + 1) * maxBadges && (
              <button
                onClick={() => {
                  try { 
                    sfx.play('click', 0.4); 
                  } catch {}
                  setCurrentPage(currentPage + 1);
                }}
                onMouseEnter={() => {
                  try { sfx.play('hover', 0.6); } catch {}
                }}
                className="flex items-center justify-center w-6 h-8 rounded transition-all duration-200 hover:scale-105 ml-2"
                style={{
                  background: 'rgba(255, 105, 180, 0.1)',
                  border: '1px solid #FF69B440',
                  color: '#FF69B4',
                  boxShadow: '0 0 4px #FF69B420'
                }}
              >
                <svg 
                  width="12" 
                  height="12" 
                  viewBox="0 0 24 24" 
                  fill="none"
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            )}
          </>
        ) : (
          <div className="flex-1 text-center text-white/60 py-4">
            <div className="text-sm">🏅</div>
            <div className="text-xs opacity-80">No badges yet</div>
          </div>
        )}
      </div>
    </div>
  );
}
