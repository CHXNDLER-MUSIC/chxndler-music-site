"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { useBadges } from "@/hooks/useBadges";
import BadgeCategoryButton from "@/components/BadgeCategoryButton";
import PopoutShell from "@/components/PopoutShell";
import { BadgeWithProgress, BadgeCategoryData } from "@/types/badges";
import { sfx } from "@/lib/sfx";

type Props = {
  open: boolean;
  onClose: () => void;
  embedded?: boolean;
};

export default function BadgesModal({ open, onClose, embedded = false }: Props) {
  const { profile } = useProfile();
  const { badgeCategories, loading, error, badges } = useBadges();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithProgress | null>(null);

  // Map badge categories to display info with images
  const getCategoryDisplayInfo = (category: BadgeCategoryData) => {
    const imageMap: { [key: string]: string } = {
      'soul': '/badges/soul star.webp',
      'collector': '/badges/collector.webp', 
      'elemental-streak': '/badges/elemental streak.webp',
      'listening': '/badges/listening.webp',
      'currency': '/badges/currency.webp',
      'community': '/badges/community.webp'
    };

    const nameMap: { [key: string]: string } = {
      'soul': 'SOUL STAR',
      'collector': 'COLLECTOR',
      'elemental-streak': 'ELEMENTAL STREAK', 
      'listening': 'LISTENING',
      'currency': 'HEARTCOIN',
      'community': 'COMMUNITY'
    };

    return {
      ...category,
      image: imageMap[category.id] || '/badges/collector.webp',
      displayName: nameMap[category.id] || category.name
    };
  };

  // Handle category click with sound
  const handleCategoryClick = (categoryId: string) => {
    sfx.play('click');
    setSelectedCategory(categoryId);
  };

  // Get actual badges for a category from the hook
  const getBadgesForCategory = (categoryId: string): BadgeWithProgress[] => {
    const category = badgeCategories.find(cat => cat.id === categoryId);
    return category?.badges || [];
  };

  // Badge detail modal
  if (selectedBadge) {
    const badgeDetailContent = (
      <div className="relative text-center space-y-4">
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
        
        {/* Progress section */}
        {selectedBadge.progress !== undefined && (
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Progress</span>
                <span className="text-white/70">{selectedBadge.current || 0} / {selectedBadge.total || 0}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    selectedBadge.unlocked ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${selectedBadge.progress || 0}%` }}
                />
              </div>
              <div className="text-center">
                <span className={`text-sm font-bold ${
                  selectedBadge.unlocked ? 'text-green-400' : 'text-blue-400'
                }`}>
                  {selectedBadge.progress || 0}% Complete
                </span>
              </div>
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
    const originalCategory = badgeCategories.find(cat => cat.id === selectedCategory);
    const categoryInfo = originalCategory ? getCategoryDisplayInfo(originalCategory) : null;
    
    const categoryContent = (
      <div className="relative space-y-4">
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
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 sm:gap-4 max-h-80 sm:max-h-96 overflow-y-auto p-2">
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
                  title={badge.description ? `${badge.badge_name}: ${badge.description} (${badge.current || 0}/${badge.total || 0})` : badge.badge_name}
                >
                  {/* Progress ring for badges with progress */}
                  {badge.progress !== undefined && badge.progress < 100 && (
                    <div className="absolute inset-0">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 transform -rotate-90" viewBox="0 0 48 48">
                        <circle
                          cx="24"
                          cy="24"
                          r="22"
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="2"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="22"
                          fill="none"
                          stroke={badge.unlocked ? "#10B981" : "#3B82F6"}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 22}`}
                          strokeDashoffset={`${2 * Math.PI * 22 * (1 - (badge.progress || 0) / 100)}`}
                          className="transition-all duration-300"
                        />
                      </svg>
                    </div>
                  )}
                  
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
                
                {/* Progress percentage */}
                {badge.progress !== undefined && badge.progress > 0 && badge.progress < 100 && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {badge.progress}%
                  </div>
                )}
                
                {/* Completed checkmark */}
                {badge.unlocked && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    ✓
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
                No badges found in this category
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
      <PopoutShell title={categoryInfo?.displayName || "CATEGORY"} onClose={onClose}>
        {categoryContent}
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

      {loading && (
        <div className="text-center text-white/60">
          Loading badges...
        </div>
      )}

      {error && !loading && (
        <div className="text-center text-red-400 text-sm p-4 bg-red-900/20 rounded border border-red-400/30">
          <div className="font-bold mb-2">Error loading badges:</div>
          <div>{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Reload Page
          </button>
        </div>
      )}

      {!loading && !error && (
        <div 
          className="relative backdrop-blur-sm flex items-center justify-center min-h-full"
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
          
          {/* Centered content container */}
          <div className="flex flex-col items-center justify-center space-y-6 pt-6 pb-4">
              {/* Top row - first 3 categories */}
              <div className="grid grid-cols-3 gap-6">
                {badgeCategories.slice(0, 3).map((category) => {
                  const displayInfo = getCategoryDisplayInfo(category);
                  return (
                    <div key={category.id} className="flex flex-col items-center space-y-2">
                      <button
                        onClick={() => handleCategoryClick(category.id)}
                        onMouseEnter={() => sfx.play('hover')}
                        className="relative w-16 h-16 rounded-full bg-gradient-to-br from-gray-800/80 to-black/90 border-2 border-white/30 hover:border-white/50 transition-all duration-200 hover:scale-105 flex items-center justify-center group overflow-hidden"
                        style={{
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 20px rgba(255,105,180,0.2)'
                        }}
                      >
                        <img
                          src={displayInfo.image}
                          alt={displayInfo.displayName}
                          className="w-12 h-12 object-cover rounded-full group-hover:scale-110 transition-transform"
                          draggable={false}
                        />
                      </button>
                      <span className="text-white/70 text-xs font-medium text-center max-w-20">
                        {displayInfo.displayName}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Bottom row - last 3 categories */}
              <div className="grid grid-cols-3 gap-6">
                {badgeCategories.slice(3, 6).map((category) => {
                  const displayInfo = getCategoryDisplayInfo(category);
                  return (
                    <div key={category.id} className="flex flex-col items-center space-y-2">
                      <button
                        onClick={() => handleCategoryClick(category.id)}
                        onMouseEnter={() => sfx.play('hover')}
                        className="relative w-16 h-16 rounded-full bg-gradient-to-br from-gray-800/80 to-black/90 border-2 border-white/30 hover:border-white/50 transition-all duration-200 hover:scale-105 flex items-center justify-center group overflow-hidden"
                        style={{
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 20px rgba(255,105,180,0.2)'
                        }}
                      >
                        <img
                          src={displayInfo.image}
                          alt={displayInfo.displayName}
                          className="w-12 h-12 object-cover rounded-full group-hover:scale-110 transition-transform"
                          draggable={false}
                        />
                      </button>
                      <span className="text-white/70 text-xs font-medium text-center max-w-20">
                        {displayInfo.displayName}
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
    <PopoutShell title="BADGES" onClose={onClose} pageIndicator="1 / 6">
      {badgesContent}
    </PopoutShell>
  );
}