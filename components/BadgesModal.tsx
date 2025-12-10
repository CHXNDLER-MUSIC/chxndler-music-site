"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import BadgeCategoryButton from "@/components/BadgeCategoryButton";
import PopoutShell from "@/components/PopoutShell";
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
  requirement_type?: string;
  requirement_count?: number;
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
  const { profile, allBadges, userBadges, badgesLoading, badgesError } = useProfile();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDisplay | null>(null);

  // Create badge display objects with unlocked status and progress
  const badgesWithUnlocked: BadgeDisplay[] = allBadges.map(badge => {
    const userBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
    const isUnlocked = userBadgeIds.has(badge.id);
    
    // Calculate progress for this badge
    let progress;
    if (badge.requirement_type && badge.requirement_count && profile) {
      const badgeProgress = getBadgeProgressForUser({
        requirement_type: badge.requirement_type,
        requirement_count: badge.requirement_count
      } as any, profile);
      
      progress = {
        current: badgeProgress.current,
        target: badgeProgress.target,
        percentage: badgeProgress.percentage
      };
    }
    
    return {
      id: badge.id,
      badge_name: badge.badge_name,
      description: badge.description,
      icon_url: badge.icon_url,
      category: badge.category,
      requirement: badge.requirement,
      requirement_type: (badge as any).requirement_type,
      requirement_count: (badge as any).requirement_count,
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
                <span className="text-white/60 text-xs">{selectedBadge.progress.target}</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-500"
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
        {(selectedBadge.requirement || selectedBadge.requirement_type) && (
          <div className="text-center space-y-2 py-2">
            <div className="text-white/50 text-xs uppercase tracking-wider font-bold">REQUIREMENT</div>
            <div className="text-white text-sm font-medium bg-white/5 rounded px-3 py-2">
              {selectedBadge.requirement || (selectedBadge.requirement_type && selectedBadge.requirement_count ? 
                formatRequirementText({
                  requirement_type: selectedBadge.requirement_type,
                  requirement_count: selectedBadge.requirement_count,
                  requirement_text: selectedBadge.requirement
                } as any) : 'Complete this achievement'
              )}
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
            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-pink-400/60 flex items-center justify-center text-pink-400 hover:text-pink-200 transition-colors z-10"
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
      <PopoutShell title="BADGE DETAILS" onClose={onClose}>
        {badgeDetailContent}
      </PopoutShell>
    );
  }

  // Category view
  if (selectedCategory) {
    const categoryBadges = getBadgesForCategory(selectedCategory);
    const categoryInfo = badgeCategories.find(cat => cat.id === selectedCategory);
    
    const categoryContent = (
      <div className="relative space-y-2">
        <button
          onClick={() => {
            sfx.play('click');
            setSelectedCategory(null);
          }}
          className="mb-4 text-[#38B6FF] hover:text-[#38B6FF]/80 transition text-sm"
        >
          ← Back to Categories
        </button>
        
        {/* Badge grid matching binder layout */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 sm:gap-4 max-h-80 sm:max-h-96 overflow-y-auto px-2 pt-2 pb-0">
          {categoryBadges.length > 0 ? categoryBadges.map((badge, index) => (
            <div key={index} className="flex flex-col items-center space-y-2">
              <div className="relative">
                <button
                  onClick={() => {
                    sfx.play('click');
                    setSelectedBadge(badge);
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
                  <div className="absolute -bottom-1 -right-1 bg-pink-500/80 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
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
            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-pink-400/60 flex items-center justify-center text-pink-400 hover:text-pink-200 transition-colors z-10"
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
      <PopoutShell title={categoryInfo?.displayName || "CATEGORY"} onClose={onClose} compact={true}>
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
            {categoryContent}
          </div>
        </div>
      </PopoutShell>
    );
  }

  // Main badges view - six circular categories
  const badgesContent = (
    <>
      {embedded && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-pink-400/60 flex items-center justify-center text-pink-400 hover:text-pink-200 transition-colors"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {embedded && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">BADGES</h2>
        </div>
      )}

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
          className="relative backdrop-blur-sm"
          style={{
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            borderRadius: '14px',
            boxShadow: '0 0 30px rgba(252,84,175,0.3), 0 0 60px rgba(252,84,175,0.15), inset 0 0 30px rgba(252,84,175,0.1)'
          }}
        >
          {/* Additional pink glow behind container */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(252,84,175,0.08) 0%, rgba(252,84,175,0.04) 40%, transparent 70%)',
              borderRadius: '14px',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          
          {/* Content container */}
          <div className="flex flex-col items-center justify-start space-y-1 pt-2 pb-0">
              {/* Top row - first 3 categories */}
              <div className="grid grid-cols-3 gap-4">
                {badgeCategories.slice(0, 3).map((category) => {
                  return (
                    <div key={category.id} className="flex flex-col items-center space-y-0.5">
                      <button
                        onClick={() => handleCategoryClick(category.id)}
                        onMouseEnter={() => sfx.play('hover')}
                        className="relative w-16 h-16 rounded-full bg-gradient-to-br from-gray-800/80 to-black/90 border-2 border-white/30 hover:border-white/50 transition-all duration-200 hover:scale-105 flex items-center justify-center group overflow-hidden"
                        style={{
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 20px rgba(255,105,180,0.2)'
                        }}
                      >
                        <img
                          src={category.image}
                          alt={category.displayName}
                          className="w-12 h-12 object-cover rounded-full group-hover:scale-110 transition-transform"
                          draggable={false}
                        />
                      </button>
                      <span className="text-white text-xs font-medium text-center max-w-20">
                        {category.displayName}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Bottom row - last 3 categories */}
              <div className="grid grid-cols-3 gap-4">
                {badgeCategories.slice(3, 6).map((category) => {
                  return (
                    <div key={category.id} className="flex flex-col items-center space-y-0.5">
                      <button
                        onClick={() => handleCategoryClick(category.id)}
                        onMouseEnter={() => sfx.play('hover')}
                        className="relative w-16 h-16 rounded-full bg-gradient-to-br from-gray-800/80 to-black/90 border-2 border-white/30 hover:border-white/50 transition-all duration-200 hover:scale-105 flex items-center justify-center group overflow-hidden"
                        style={{
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 20px rgba(255,105,180,0.2)'
                        }}
                      >
                        <img
                          src={category.image}
                          alt={category.displayName}
                          className="w-12 h-12 object-cover rounded-full group-hover:scale-110 transition-transform"
                          draggable={false}
                        />
                      </button>
                      <span className="text-white text-xs font-medium text-center max-w-20">
                        {category.displayName}
                      </span>
                    </div>
                  );
                })}
              </div>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="relative">{badgesContent}</div>;
  }

  return (
    <PopoutShell title="BADGES" onClose={onClose} compact={true}>
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
    </PopoutShell>
  );
}