"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { useBadges } from "@/hooks/useBadges";
import BadgeCategoryButton from "@/components/BadgeCategoryButton";
import PopoutShell from "@/components/PopoutShell";
import { BadgeWithProgress, BadgeCategory } from "@/types/badges";

type Props = {
  open: boolean;
  onClose: () => void;
  embedded?: boolean;
};

export default function BadgesModal({ open, onClose, embedded = false }: Props) {
  const { profile } = useProfile();
  const { badgeCategories, loading, error } = useBadges();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithProgress | null>(null);

  // Six badge categories matching your requirements
  const sixCategories = [
    { id: "soul-star", name: "SOUL STAR", emoji: "⭐" },
    { id: "achievements", name: "ACHIEVEMENTS", emoji: "🏆" },
    { id: "elemental-streak", name: "ELEMENTAL STREAK", emoji: "🔷" },
    { id: "listening", name: "LISTENING", emoji: "🎵" },
    { id: "heartcoin", name: "HEARTCOINS", emoji: "💛" },
    { id: "community", name: "MILESTONES", emoji: "👣" }
  ];

  // Get actual badges for a category, fallback to empty if not found
  const getBadgesForCategory = (categoryId: string): BadgeWithProgress[] => {
    const category = badgeCategories.find(cat => cat.id === categoryId);
    return category?.badges || [];
  };

  // Badge detail modal
  if (selectedBadge) {
    const badgeDetailContent = (
      <div className="relative text-center space-y-4">
        <button
          onClick={() => setSelectedBadge(null)}
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
    const categoryInfo = sixCategories.find(cat => cat.id === selectedCategory);
    
    const categoryContent = (
      <div className="relative space-y-4">
        <button
          onClick={() => setSelectedCategory(null)}
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
                  onClick={() => setSelectedBadge(badge)}
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
            <h2 className="text-xl font-bold text-white">{categoryInfo?.name}</h2>
          </div>
          {categoryContent}
        </div>
      );
    }

    return (
      <PopoutShell title={categoryInfo?.name || "CATEGORY"} onClose={onClose}>
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
        <div className="text-center text-red-400 text-sm">
          Error loading badges: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="relative">
          {/* Six circular category buttons in binder card grid layout */}
          <div className="grid gap-2 grid-cols-5 p-2">
            {sixCategories.slice(0, 5).map((category, index) => (
              <div
                key={category.id}
                className="flex items-center justify-center"
                style={{ aspectRatio: '2/3' }}
              >
                <BadgeCategoryButton
                  category={category}
                  onClick={() => setSelectedCategory(category.id)}
                />
              </div>
            ))}
          </div>
          
          {/* Second row - single category button in first slot */}
          <div className="grid gap-2 grid-cols-5 mt-3 p-2">
            <div
              className="flex items-center justify-center"
              style={{ aspectRatio: '2/3' }}
            >
              <BadgeCategoryButton
                category={sixCategories[5]}
                onClick={() => setSelectedCategory(sixCategories[5].id)}
              />
            </div>
            {/* Empty locked slots to match binder layout */}
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={`empty-slot-${index}`}
                className="rounded-lg border border-white/5 backdrop-blur-sm transition-all duration-300"
                style={{
                  boxShadow: '0 0 5px rgba(255,105,180,0.1)',
                  aspectRatio: '2/3'
                }}
              >
                <div className="w-full h-full bg-gradient-to-br from-pink-500/5 to-purple-500/5 rounded border-2 border-dashed border-pink-400/20 flex items-center justify-center">
                  <div 
                    className="text-xs font-bold text-center"
                    style={{ 
                      color: 'rgba(255,105,180,0.4)', 
                      textShadow: '0 0 4px rgba(255,105,180,0.3)',
                    }}
                  >
                    LOCKED
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="relative">{badgesContent}</div>;
  }

  return (
    <PopoutShell title="BADGES" onClose={onClose}>
      {badgesContent}
    </PopoutShell>
  );
}