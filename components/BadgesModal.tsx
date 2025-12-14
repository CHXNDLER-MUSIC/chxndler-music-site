"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile } from "@/contexts/ProfileContext";
import BadgeCategoryButton from "@/components/BadgeCategoryButton";
import PopoutShell from "@/components/PopoutShell";
import { sfx } from "@/lib/sfx";
import { getBadgeProgressForUser, formatRequirementText } from "@/lib/badgeProgress";
import { updateBadgeProgressCounters, calculateRealtimeBadgeProgress, manualBadgeCheck } from "@/lib/updateBadgeProgress";

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

interface BadgeCategoryData {
  id: string;
  name: string;
  displayName: string;
  badges: BadgeDisplay[];
  image: string;
}

type Props = {
  open: boolean;
  onClose: () => void;
  embedded?: boolean;
};

export default function BadgesModal({ open, onClose, embedded = false }: Props) {
  const { profile, allBadges, userBadges, badgesLoading, badgesError, user } = useProfile();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDisplay | null>(null);
  const [enlargedBadge, setEnlargedBadge] = useState<BadgeDisplay | null>(null);

  // Create badge display objects with unlocked status and progress
  const badgesWithUnlocked: BadgeDisplay[] = allBadges.map(badge => {
    const userBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
    const isUnlocked = userBadgeIds.has(badge.id);
    
    // Calculate progress for this badge
    let progress;
    if (badge.requirement_type && badge.requirement_count && profile) {
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
      }, profile);
      
      progress = {
        current: badgeProgress.current,
        target: badgeProgress.target,
        percentage: badgeProgress.percentage
      };
      
      // Debug log for progress calculation
      console.log(`Badge ${badge.badge_name}: progress=${badgeProgress.current}/${badgeProgress.target} (${badgeProgress.percentage}%)`);
    } else {
      // Fallback for badges without proper requirement data
      progress = {
        current: 0,
        target: badge.requirement_count || 1,
        percentage: 0
      };
      console.warn(`Badge ${badge.badge_name} missing requirement data: type=${badge.requirement_type}, count=${badge.requirement_count}`);
    }
    
    return {
      id: badge.id,
      badge_name: badge.badge_name,
      description: badge.description,
      icon_url: badge.icon_url,
      category: badge.category,
      requirement: null, // This field doesn't exist in BadgeDefinition
      requirement_type: badge.requirement_type,
      requirement_count: badge.requirement_count,
      unlocked: isUnlocked,
      progress
    };
  });

  // Get badge categories organized with all badges (locked and unlocked)
  const getBadgeCategories = (): BadgeCategoryData[] => {
    // Always show all 6 categories regardless of badge loading state
    const categories = [
      {
        id: 'soul',
        name: 'SOUL STAR', 
        displayName: 'SOUL STAR',
        badges: allBadges.length > 0 ? badgesWithUnlocked.filter(badge => badge.category === 'soul') : [],
        image: '/badges/soul star.webp'
      },
      {
        id: 'collector',
        name: 'COLLECTOR',
        displayName: 'COLLECTOR', 
        badges: allBadges.length > 0 ? badgesWithUnlocked.filter(badge => badge.category === 'collector') : [],
        image: '/badges/collector.webp'
      },
      {
        id: 'elemental-streak',
        name: 'ELEMENTAL STREAK',
        displayName: 'ELEMENTAL STREAK',
        badges: allBadges.length > 0 ? badgesWithUnlocked.filter(badge => badge.category === 'elemental-streak') : [],
        image: '/badges/elemental streak.webp'
      },
      {
        id: 'listening',
        name: 'LISTENING',
        displayName: 'LISTENING',
        badges: allBadges.length > 0 ? badgesWithUnlocked.filter(badge => badge.category === 'listening') : [],
        image: '/badges/listening.webp'
      },
      {
        id: 'currency',
        name: 'HEARTCOIN',
        displayName: 'HEARTCOIN',
        badges: allBadges.length > 0 ? badgesWithUnlocked.filter(badge => badge.category === 'currency') : [],
        image: '/badges/currency.webp'
      },
      {
        id: 'community',
        name: 'COMMUNITY',
        displayName: 'COMMUNITY',
        badges: allBadges.length > 0 ? badgesWithUnlocked.filter(badge => badge.category === 'community') : [],
        image: '/badges/community.webp'
      }
    ];

    // Always show all 6 categories so user can see them even if badges haven't loaded yet
    return categories;
  };

  const badgeCategories = getBadgeCategories();

  // Handle category click with sound
  const handleCategoryClick = (categoryId: string) => {
    sfx.play('click');
    setSelectedCategory(categoryId);
  };

  // Get actual badges for a category - show ALL badges (unlocked and locked)
  const getBadgesForCategory = (categoryId: string): BadgeDisplay[] => {
    const category = badgeCategories.find(cat => cat.id === categoryId);
    return category?.badges || [];
  };

  // Badge detail modal
  if (selectedBadge) {
    const badgeDetailContent = (
      <div className="relative text-center space-y-6">
        <button
          onClick={() => {
            sfx.play('click');
            setSelectedBadge(null);
          }}
          className="mb-4 text-[#38B6FF] hover:text-[#38B6FF]/80 transition text-sm"
        >
          ← Back to Badges
        </button>
        
        {/* Large badge display */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-gray-800/80 to-black/90 border-2 border-white/30 flex items-center justify-center">
            <div className={`relative z-10 transition-opacity ${selectedBadge.unlocked ? 'opacity-100' : 'opacity-60'}`}>
              {selectedBadge.icon_url ? (
                <img
                  src={selectedBadge.icon_url}
                  alt={selectedBadge.badge_name}
                  className="w-24 h-24 object-cover rounded-full"
                  draggable={false}
                />
              ) : (
                <div className="text-3xl">🏅</div>
              )}
            </div>
            {/* Locked overlay */}
            {!selectedBadge.unlocked && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-white/20 rounded-full" />
              </div>
            )}
          </div>
          
          {/* Badge name */}
          <h2 className="text-white font-bold text-lg text-center">
            {selectedBadge.badge_name}
          </h2>
          
          {/* Status */}
          <div className={`text-sm ${
            selectedBadge.unlocked ? 'text-green-400' : 'text-white/40'
          }`}>
            {selectedBadge.unlocked ? '✅ UNLOCKED' : '🔒 LOCKED'}
          </div>
        </div>
        
        {/* Badge description */}
        {selectedBadge.description && (
          <p className="text-white/70 text-sm max-w-xs mx-auto">
            {selectedBadge.description}
          </p>
        )}
        
        {/* Progress display - Always show for badges with progress tracking */}
        {selectedBadge.progress && (
          <div className="text-center space-y-3 py-2">
            <div className="text-white/50 text-xs uppercase tracking-wider font-bold">PROGRESS</div>
            
            {/* Progress bar */}
            <div className="mx-auto max-w-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-white/60 text-xs">{selectedBadge.progress.current}</span>
                <span className="text-white/60 text-xs">
                  {selectedBadge.progress.target || selectedBadge.requirement_count}
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${selectedBadge.progress.percentage}%` }}
                />
              </div>
              <div className="text-center mt-1">
                <span className="text-white text-sm font-medium">
                  {selectedBadge.progress.percentage}% Complete
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Requirement text - Always show */}
        {selectedBadge.requirement_type && selectedBadge.requirement_count && (
          <div className="text-center space-y-2 py-2">
            <div className="text-white/50 text-xs uppercase tracking-wider font-bold">REQUIREMENT</div>
            <div className="text-white text-sm font-medium bg-white/5 rounded px-3 py-2">
              {formatRequirementText({
                requirement_type: selectedBadge.requirement_type,
                requirement_count: selectedBadge.requirement_count,
                requirement_text: null,
                id: selectedBadge.id,
                slug: '',
                badge_name: selectedBadge.badge_name,
                icon_url: selectedBadge.icon_url,
                description: selectedBadge.description,
                category: selectedBadge.category as any,
                created_at: ''
              })}
            </div>
          </div>
        )}
      </div>
    );

    if (embedded) {
      return (
        <div className="relative">
          <button
            onClick={onClose}
            onMouseEnter={() => sfx.play('hover')}
            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-cyan-400/60 flex items-center justify-center text-cyan-400 hover:text-cyan-200 transition-colors z-10"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white">BADGE DETAILS</h2>
          </div>
          {badgeDetailContent}
        </div>
      );
    }

    return (
      <PopoutShell title="BADGE DETAILS" onClose={onClose} minWidth={'min(95vw, 420px)'}>
        {badgeDetailContent}
      </PopoutShell>
    );
  }

  // Category view
  if (selectedCategory) {
    const categoryBadges = getBadgesForCategory(selectedCategory);
    // Sort badges by requirement count (ascending). Fallback to name for ties.
    const sortedBadges = [...categoryBadges].sort((a, b) => {
      const ac = typeof a.requirement_count === 'number' ? a.requirement_count : Number.MAX_SAFE_INTEGER;
      const bc = typeof b.requirement_count === 'number' ? b.requirement_count : Number.MAX_SAFE_INTEGER;
      if (ac !== bc) return ac - bc;
      return (a.badge_name || '').localeCompare(b.badge_name || '');
    });
    const categoryInfo = badgeCategories.find(cat => cat.id === selectedCategory);
    
    const categoryContent = (
      <div className="relative flex flex-col h-full">
        <button
          onClick={() => {
            sfx.play('click');
            setSelectedCategory(null);
          }}
          className="mb-4 text-[#38B6FF] hover:text-[#38B6FF]/80 transition text-sm flex-shrink-0"
        >
          ← Back to Categories
        </button>
        
        {/* Badge grid matching binder layout */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 sm:gap-4 flex-1 overflow-y-auto px-2" style={{ paddingBottom: '0px', marginBottom: '0px' }}>
          {sortedBadges.length > 0 ? sortedBadges.map((badge, index) => (
            <div key={index} className="flex flex-col items-center space-y-2">
              <div className="relative">
                <button
                  onClick={() => {
                    sfx.play('click');
                    setEnlargedBadge(badge);
                    // After a short delay, show the detail view
                    setTimeout(() => {
                      setEnlargedBadge(null);
                      setSelectedBadge(badge);
                    }, 800);
                  }}
                  onMouseEnter={() => sfx.play('hover')}
                  className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 border border-white/20 hover:border-white/40 transition-all duration-200 hover:scale-105 flex items-center justify-center group overflow-hidden"
                  title={badge.description ? `${badge.badge_name}: ${badge.description}` : badge.badge_name}
                >
                  {/* Dark circular background */}
                  <div className="absolute inset-1 bg-gradient-to-br from-gray-800/80 to-black/90 rounded-full" />
                  
                  {/* Badge content */}
                  <div className={`relative z-10 transition-opacity ${badge.unlocked ? 'opacity-100' : 'opacity-40 group-hover:opacity-60'}`}>
                    {badge.icon_url ? (
                      <img
                        src={badge.icon_url}
                        alt={badge.badge_name}
                        className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-full"
                        draggable={false}
                      />
                    ) : (
                      <div className="text-sm sm:text-lg">🏅</div>
                    )}
                  </div>
                  
                  {/* Locked overlay */}
                  {!badge.unlocked && (
                    <div className="absolute inset-1 bg-black/40 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white/20 rounded-full" />
                    </div>
                  )}
                </button>
                
                {/* Progress indicator for unlocked badges or progress ring */}
                {badge.unlocked ? (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    ✓
                  </div>
                ) : badge.progress && badge.progress.percentage > 0 && (
                  <div className="absolute -bottom-1 -right-1 bg-cyan-500/80 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                    {badge.progress.percentage}%
                  </div>
                )}
              </div>
              
              {/* Badge name */}
              <div className="text-white/60 text-xs text-center max-w-12 sm:max-w-16 truncate">
                {badge.badge_name}
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-8">
              <div className="text-white/60 text-sm">
                No badges available in this category yet
              </div>
            </div>
          )}
        </div>
      </div>
    );

    if (embedded) {
      return (
        <div className="relative">
          <button
            onClick={onClose}
            onMouseEnter={() => sfx.play('hover')}
            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-cyan-400/60 flex items-center justify-center text-cyan-400 hover:text-cyan-200 transition-colors z-10"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white">{categoryInfo?.displayName}</h2>
          </div>
          {categoryContent}
        </div>
      );
    }

    return (
      <PopoutShell title={categoryInfo?.displayName || "CATEGORY"} onClose={onClose} compact={true} minWidth={'min(95vw, 420px)'}>
        <div className="relative badges-modal-container" style={{ overflow: 'hidden', height: '100%' }}>
          {/* Hide all navigation elements in badges modal */}
          <style jsx global>{`
            /* Hide navigation arrows and pagination */
            .binder-hologram-container .absolute.-right-1,
            .binder-hologram-container .absolute.left-2,
            .binder-hologram-container .absolute[class*="right-1"],
            .binder-hologram-container .absolute[class*="left-2"],
            [data-badges-modal] .absolute[class*="right"],
            [data-badges-modal] .absolute[class*="left"] {
              display: none !important;
            }
            /* Hide Page text and pagination */
            .binder-hologram-container [class*="text-center"]:has(*:contains("Page")) {
              display: none !important;
            }
            /* Hide navigation buttons specifically */
            .binder-hologram-container button.absolute,
            [data-badges-modal] button.absolute:not([class*="top-4"]) {
              display: none !important;
            }
            /* Clean up compact badges modal */
            .badges-modal-container .binder-hologram-container {
              height: fit-content !important;
            }
            /* Remove bottom space in badges modal */
            .badges-modal-container [data-badges-modal] {
              height: 100% !important;
              display: flex !important;
              flex-direction: column !important;
            }
            /* Ensure grid takes up remaining space without bottom padding */
            .badges-modal-container .grid {
              flex: 1 !important;
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
            }
          `}</style>
          <div data-badges-modal style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {categoryContent}
          </div>
        </div>
      </PopoutShell>
    );
  }

  // Get user's unlocked badges for display
  const userUnlockedBadges = badgesWithUnlocked.filter(badge => badge.unlocked);
  
  // Main badges view - horizontal row of user badges like chat profile
  const badgesContent = (
    <>
      {embedded && (
        <button
          onClick={onClose}
          onMouseEnter={() => sfx.play('hover')}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-cyan-400/60 flex items-center justify-center text-cyan-400 hover:text-cyan-200 transition-colors"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* User Stats and Title Section - HeartCoin and Daily Streak */}
      <div className="flex justify-between items-center mb-4 p-3 bg-black/40 rounded-lg border border-white/20">
        {/* HeartCoin Total */}
        <div className="flex items-center gap-2">
          <img 
            src="/elements/heart-coin.webp" 
            alt="Heart Coin" 
            className="w-6 h-6"
          />
          <span 
            className="font-bold text-lg"
            style={{
              color: '#FF69B4',
              textShadow: '0 0 8px #FF69B4'
            }}
          >
            {profile?.heartcoin_total || 0}
          </span>
        </div>
        
        {/* Daily Streak */}
        <div className="flex items-center gap-2">
          <span 
            className="font-bold text-lg"
            style={{
              color: '#00FFFF',
              textShadow: '0 0 8px #00FFFF, 0 0 15px #00FFFF'
            }}
          >
            {profile?.daily_streak || 0} days
          </span>
        </div>
      </div>

      {badgesLoading && (
        <div className="text-center text-white/60">
          Loading badges...
        </div>
      )}

      {badgesError && !badgesLoading && (
        <div className="text-center text-red-400 text-sm p-4 bg-red-900/20 rounded border border-red-400/30">
          <div className="font-bold mb-2">Error loading badges:</div>
          <div>{badgesError}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Reload Page
          </button>
        </div>
      )}

      {!badgesLoading && !badgesError && (
        <div 
          className="relative"
          style={{
            background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(20,20,20,0.8) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
        >
          {/* Header with User Name and Badges title */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <img 
                src="/elements/heart-star.webp" 
                alt="Star" 
                className="w-6 h-6"
              />
              <h3 
                className="text-white font-bold text-lg"
                style={{
                  textShadow: '0 0 8px rgba(255,255,255,0.5)'
                }}
              >
                {profile?.display_name || 'Anonymous'} Badges
              </h3>
            </div>
          </div>
          
          {/* Integrated Badge Display Area */}
          <div className="p-4">
            {/* Horizontal Badge Row - More integrated design */}
            <div className="flex items-center justify-start gap-2 min-h-[100px] bg-black/30 rounded-xl p-4 border border-white/10">
              {userUnlockedBadges.length > 0 ? (
                <>
                  {userUnlockedBadges.slice(0, 5).map((badge, index) => (
                    <button
                      key={badge.id}
                      onClick={() => {
                        sfx.play('click');
                        setEnlargedBadge(badge);
                        // After a short delay, show the detail view if needed
                        setTimeout(() => {
                          setEnlargedBadge(null);
                          setSelectedBadge(badge);
                        }, 800);
                      }}
                      onMouseEnter={() => sfx.play('hover')}
                      className="relative w-20 h-20 rounded-full flex items-center justify-center group overflow-hidden flex-shrink-0 transition-all duration-200 hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(40,40,40,0.8) 100%)',
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4), 0 0 30px rgba(255, 255, 255, 0.1), inset 0 2px 10px rgba(255,255,255,0.1)',
                        border: '2px solid rgba(255, 255, 255, 0.3)'
                      }}
                      title={badge.badge_name}
                    >
                      {/* Inner glow effect */}
                      <div 
                        className="absolute inset-1 rounded-full"
                        style={{
                          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                          pointerEvents: 'none'
                        }}
                      />
                      
                      {/* Badge content */}
                      <div className="relative z-10">
                        {badge.icon_url ? (
                          <img
                            src={badge.icon_url}
                            alt={badge.badge_name}
                            className="w-14 h-14 object-cover rounded-full"
                            draggable={false}
                          />
                        ) : (
                          <div className="text-3xl">🏅</div>
                        )}
                      </div>
                      
                      {/* Outer highlight ring on hover */}
                      <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-white/50 transition-all duration-200" />
                    </button>
                  ))}
                  
                  {/* Show more indicator if user has more than 5 badges */}
                  {userUnlockedBadges.length > 5 && (
                    <div 
                      className="flex items-center justify-center w-20 h-20 rounded-full border-2 border-dashed border-white/30 bg-black/40"
                      style={{
                        marginLeft: '8px'
                      }}
                    >
                      <span className="text-white text-sm font-bold">+{userUnlockedBadges.length - 5}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 text-center text-white/60 py-8">
                  <div className="text-xl mb-2">🏅</div>
                  <div className="text-sm font-medium mb-1">No Badges Yet</div>
                  <div className="text-xs opacity-80">Complete challenges to earn your first badge</div>
                </div>
              )}
            </div>
            
            {/* Category Selection Grid */}
            <div className="mt-6 p-4 bg-black/20 rounded-xl border border-white/10">
              <div className="text-center mb-8">
                <div className="mb-3">
                  <span className="text-cyan-300 text-lg font-bold uppercase tracking-wider">
                    BADGES UNLOCKED: {profile?.badges_unlocked || userUnlockedBadges.length}
                  </span>
                </div>
                <h4 className="text-white/90 text-base font-bold uppercase tracking-wider">
                  Explore your badges and track your progress through the Heartverse.
                </h4>
              </div>
              
              {/* 6-item category grid (2x3) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                {badgeCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    onMouseEnter={() => sfx.play('hover')}
                    className="group relative flex flex-col items-center space-y-3 p-4 rounded-xl bg-black/40 border border-white/20 hover:border-white/40 transition-all duration-200 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(40,40,40,0.8) 100%)',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {/* Category Image */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white/30 group-hover:border-white/50 transition-colors">
                      <div className="absolute inset-1 bg-gradient-to-br from-gray-800/80 to-black/90 rounded-full" />
                      <div className="relative z-10 w-full h-full flex items-center justify-center">
                        <img
                          src={category.image}
                          alt={category.displayName}
                          className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-full"
                          draggable={false}
                        />
                      </div>
                    </div>
                    
                    {/* Category Name */}
                    <div className="text-center">
                      <h5 
                        className="text-white font-bold text-xs sm:text-sm leading-tight group-hover:text-cyan-200 transition-colors"
                        style={{
                          textShadow: '0 0 4px rgba(255,255,255,0.3)'
                        }}
                      >
                        {category.displayName}
                      </h5>
                    </div>
                    
                    {/* Badge Count */}
                    <div className="text-white/60 text-xs">
                      {category.badges.length} badge{category.badges.length !== 1 ? 's' : ''}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const enlargedBadgeModal = (
    <AnimatePresence>
      {enlargedBadge && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          {/* Enlarged Badge */}
          <motion.div
            className="relative z-10 rounded-3xl overflow-hidden"
            style={{
              width: '200px',
              height: '200px',
              boxShadow: '0 0 60px rgba(252,84,175,0.4), 0 0 120px rgba(56,182,255,0.3)'
            }}
            initial={{ scale: 0.5, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: -20 }}
            exit={{ scale: 0.5, opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
          >
            <div className="w-full h-full bg-gradient-to-br from-gray-800/80 to-black/90 border-4 border-white/30 rounded-3xl flex items-center justify-center">
              {/* Badge content */}
              <div className={`transition-opacity ${enlargedBadge.unlocked ? 'opacity-100' : 'opacity-40'}`}>
                {enlargedBadge.icon_url ? (
                  <img
                    src={enlargedBadge.icon_url}
                    alt={enlargedBadge.badge_name}
                    className="w-32 h-32 object-cover rounded-full"
                    draggable={false}
                  />
                ) : (
                  <div className="text-6xl">🏅</div>
                )}
              </div>
              
              {/* Locked overlay */}
              {!enlargedBadge.unlocked && (
                <div className="absolute inset-4 bg-black/40 rounded-3xl flex items-center justify-center">
                  <div className="w-8 h-8 bg-white/20 rounded-full" />
                </div>
              )}
            </div>
            
            {/* Badge name overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <h3 className="text-white font-bold text-lg text-center">{enlargedBadge.badge_name}</h3>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (embedded) {
    return (
      <div className="relative">
        {badgesContent}
        {enlargedBadgeModal}
      </div>
    );
  }

  return (
    <PopoutShell title="BADGES" onClose={onClose} compact={true} minWidth={'min(95vw, 420px)'} headerRuleVariant={'cyan'}>
      <div className="relative badges-modal-container" style={{ overflow: 'hidden' }}>
        {/* Hide all navigation elements in badges modal */}
        <style jsx global>{`
          /* Hide navigation arrows and pagination */
          .binder-hologram-container .absolute.-right-1,
          .binder-hologram-container .absolute.left-2,
          .binder-hologram-container .absolute[class*="right-1"],
          .binder-hologram-container .absolute[class*="left-2"],
          [data-badges-modal] .absolute[class*="right"],
          [data-badges-modal] .absolute[class*="left"] {
            display: none !important;
          }
          /* Hide Page text and pagination */
          .binder-hologram-container [class*="text-center"]:has(*:contains("Page")) {
            display: none !important;
          }
          /* Hide navigation buttons specifically */
          .binder-hologram-container button.absolute,
          [data-badges-modal] button.absolute:not([class*="top-4"]) {
            display: none !important;
          }
          /* Clean up compact badges modal */
          .badges-modal-container .binder-hologram-container {
            height: fit-content !important;
          }
        `}</style>
        <div data-badges-modal>
          {badgesContent}
        </div>
      </div>
      {enlargedBadgeModal}
    </PopoutShell>
  );
}
