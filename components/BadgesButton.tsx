"use client";

import React, { useState, useEffect } from "react";
import { sfx } from "@/lib/sfx";
import { useBadges } from "@/hooks/useBadges";
import { BadgeWithProgress, BadgeCategory as BadgeCategoryType } from "@/types/badges";
import { getBadgeIcon } from "@/config/assets";
import { formatRequirementText } from "@/lib/badgeProgress";

type Badge = {
  name: string;
  description?: string;
  progress?: number;
  current?: number;
  total?: number;
  unlocked?: boolean;
  icon_url?: string;
};

type BadgeCategory = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  badges: Badge[];
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
  onBeamColorChange?: (color: string) => void;
  isActive?: boolean;
};

export default function BadgesButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, onOpenBlueDisplay, onBeamColorChange, isActive = false, ...rest }: Props) {
  // Remove internal open state - now controlled by parent
  // const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithProgress | null>(null);
  const [elementFilter, setElementFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Use Supabase data
  const { badgeCategories, loading, error } = useBadges();

  // Define handleClick function early to avoid initialization errors
  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    try { onClick?.(e); } catch {}
    if (!e.defaultPrevented) {
      e.preventDefault();
      try { sfx.play('click', 0.8); } catch {}
      // Trigger yellow light beam
      try { onBeamColorChange?.('yellow'); } catch {}
      // Close blue display first
      try { onCloseBlueDisplay?.(); } catch {}
      // Panel open/close is now handled by parent
    }
  };

  // Listen for openBadges event from hamburger menu - move this before early returns
  useEffect(() => {
    const handleOpenBadges = (e: CustomEvent) => {
      try {
        // Simulate a click to trigger badges opening
        const fakeEvent = {
          preventDefault: () => {},
          defaultPrevented: false
        } as React.MouseEvent<HTMLButtonElement>;
        
        try { sfx.play('click', 0.8); } catch {}
        // Trigger yellow light beam
        try { onBeamColorChange?.('yellow'); } catch {}
        // Close blue display first
        try { onCloseBlueDisplay?.(); } catch {}
        // Trigger parent click handler to open badges
        try { onClick?.(fakeEvent); } catch {}
        
        console.log('Badges opened from hamburger menu');
      } catch (error) {
        console.error('Error handling openBadges event:', error);
      }
    };

    window.addEventListener('openBadges', handleOpenBadges as EventListener);
    return () => window.removeEventListener('openBadges', handleOpenBadges as EventListener);
  }, [onClick, onBeamColorChange, onCloseBlueDisplay]);

  // Show loading state
  if (loading) {
    return (
      <>
        <button
          data-tour-id="badges"
          onClick={handleClick} 
          onMouseEnter={onHoverSound}
          className="p-1 rounded-lg transition-all duration-200 w-20 h-16"
          style={{
            transition: 'all 0.3s ease',
            ...rest.style
          }}
          {...rest}
        >
          <img
            src="/elements/badges.webp"
            alt="Badges"
            className="w-full h-full object-contain rounded opacity-50"
            draggable={false}
          />
        </button>
        
        {isActive && (
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
          <div className="text-pink-400 text-xl">Loading badges...</div>
          </div>
        )}
      </>
    );
  }

  // Show error state  
  if (error) {
    console.error('Badges error:', error);
    // Fall back to showing the button but with no popup
    return (
      <button
        data-tour-id="badges"
        onClick={handleClick} 
        onMouseEnter={onHoverSound}
        className="p-1 rounded-lg transition-all duration-200 w-20 h-16"
        style={{
          transition: 'all 0.3s ease',
          ...rest.style
        }}
        {...rest}
      >
        <img
          src="/elements/badges.webp"
          alt="Badges"
          className="w-full h-full object-contain rounded"
          draggable={false}
        />
      </button>
    );
  }

  const getBadgeDisplayIcon = (badge: BadgeWithProgress, categoryId: string) => {
    const badgeName = badge.badge_name || '';
    
    // Return icon URL if available, otherwise use fallback icons
    if (badge.icon_url) {
      return badge.icon_url;
    }
    
    // Try to construct badge image path from badge name
    if (badgeName) {
      // Convert badge name to filename format (lowercase, spaces to hyphens)
      const filename = badgeName.toLowerCase().replace(/\s+/g, '-');
      const imagePath = `/badges/${filename}.webp`;
      return imagePath;
    }
    
    // Category-based fallbacks
    switch (categoryId) {
      case 'soul-star': return '⭐';
      case 'achievements': return '🏆';
      case 'listening': return '🎵';
      case 'heartcoin': return '💰';
      case 'community': return '🌐';
      default: return '🏅';
    }
  };

  const isUnlocked = (badge: BadgeWithProgress) => {
    return badge.unlocked || (badge.progress !== undefined && badge.progress >= 100);
  };

  const getElementFromBadge = (badge: BadgeWithProgress) => {
    // First check for sub_category field
    if (badge.sub_category) {
      return badge.sub_category.toUpperCase();
    }
    
    // Fallback: parse from badge name for elemental streak badges
    if (badge.category === 'elemental-streak' && badge.badge_name) {
      const name = badge.badge_name.toLowerCase();
      if (name.includes('heart')) return 'HEART';
      if (name.includes('water')) return 'WATER';
      if (name.includes('lightning')) return 'LIGHTNING';
      if (name.includes('darkness')) return 'DARKNESS';
    }
    
    // Legacy fallback: parse from description
    if (badge.description) {
      const description = badge.description;
      if (description.includes('❤️ HEART')) return 'HEART';
      if (description.includes('💧 WATER')) return 'WATER';
      if (description.includes('⚡ LIGHTNING')) return 'LIGHTNING';
      if (description.includes('🌑 DARKNESS')) return 'DARKNESS';
    }
    
    return null;
  };

  const filterBadgesByElement = (badges: BadgeWithProgress[]) => {
    if (!elementFilter) return badges;
    return badges.filter(badge => getElementFromBadge(badge) === elementFilter);
  };

  const getElementalElements = () => {
    return [
      { name: 'HEART', emoji: '❤️', image: '/elements/heart.webp', color: '#ff6b9d' },
      { name: 'WATER', emoji: '💧', image: '/elements/water.webp', color: '#4dd0e1' },
      { name: 'LIGHTNING', emoji: '⚡', image: '/elements/lightning.webp', color: '#ffeb3b' },
      { name: 'DARKNESS', emoji: '🌑', image: '/elements/darkness.webp', color: '#9c27b0' }
    ];
  };

  return (
    <>
      <button
        data-tour-id="badges"
        onClick={handleClick} 
        className="p-1 rounded-lg transition-all duration-200 w-20 h-16"
        style={{
          transition: 'all 0.3s ease',
          ...rest.style
        }}
        onMouseEnter={(e) => {
          if (onHoverSound) onHoverSound();
          e.currentTarget.style.transform = 'scale(1.05)';
          const img = e.currentTarget.querySelector('img');
          if (img) {
            img.style.filter = 'drop-shadow(0 0 15px rgba(255, 255, 0, 0.8)) drop-shadow(0 0 30px rgba(255, 255, 0, 0.4))';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          const img = e.currentTarget.querySelector('img');
          if (img) {
            img.style.filter = 'none';
          }
        }}
        {...rest}
      >
        <img
          src="/elements/badges.webp"
          alt="Badges"
          className="w-full h-full object-contain rounded"
          style={{
          }}
          draggable={false}
        />
      </button>
      
      {/* Hologram base glow */}
      {isActive && null}
      
      {/* Badges Modal */}
      {isActive && (
        <div 
          className="fixed inset-0 z-[2147483647] flex items-start justify-center relative"
          style={{ paddingTop: '8vh' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              try { sfx.play('close', 0.8); } catch {}
              onClick?.({} as any);
              setSelectedCategory(null);
              setSelectedBadge(null);
              setElementFilter(null);
              try { onOpenBlueDisplay?.(); } catch {}
            }
          }}
        >
          {/* Soft pink glow behind the popout container */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 'calc(8vh - 20px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(110vw, 840px)',
              height: 'min(70vh, 560px)',
              background: 'radial-gradient(ellipse 75% 55% at 50% 35%, rgba(255,105,180,0.35) 0%, rgba(255,105,180,0.18) 45%, rgba(255,105,180,0.08) 70%, transparent 100%)',
              filter: 'blur(20px)',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
          <div
            className="badges-hologram-container flex flex-col"
            style={{
              width: 'min(92vw, 700px)',
              maxWidth: '700px',
              minHeight: 'auto',
              maxHeight: '90vh',
              padding: '10px 14px 24px 14px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(255,105,180,0.10), rgba(0,0,0,0.60))',
              border: '1px solid rgba(255,105,180,0.55)',
              boxShadow: '0 -8px 25px rgba(255,105,180,0.4), 0 -4px 15px rgba(255,105,180,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,105,180,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#FF69B4',
              position: 'relative',
              zIndex: 1
            }}
          >
            {/* Extra bloom glows removed to mirror Binder's chrome */}

            {/* Close button */}
            <button
              onClick={() => {
                try { sfx.play('close', 0.8); } catch {}
                // Panel close is now handled by parent via onClick
                onClick?.({} as any);
                setSelectedCategory(null);
                setSelectedBadge(null);
                setElementFilter(null);
                try { onOpenBlueDisplay?.(); } catch {}
              }}
              className="absolute top-2 right-4 text-pink-400 hover:text-pink-200 cursor-pointer w-8 h-8 rounded-full border border-pink-400/80 flex items-center justify-center"
              style={{ 
                fontSize: '16px',
                boxShadow: '0 0 15px rgba(255,105,180,0.8), 0 0 25px rgba(255,105,180,0.5), 0 0 35px rgba(255,105,180,0.3)',
                textShadow: '0 0 8px rgba(255,105,180,0.8), 0 0 15px rgba(255,105,180,0.6)',
                background: 'rgba(255,105,180,0.1)',
                backdropFilter: 'blur(2px)'
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
            
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
              {selectedCategory && (
                <button
                  onClick={() => {
                    try { sfx.play('click', 0.6); } catch {}
                    setSelectedCategory(null);
                    setSelectedBadge(null);
                    setElementFilter(null);
                    setCurrentPage(0);
                  }}
                  className="px-3 py-1 text-[10px] font-bold rounded border border-pink-400/60 hover:border-pink-400/80 transition-all duration-200"
                  style={{
                    background: 'rgba(255,105,180,0.1)',
                    color: '#FF69B4',
                    textShadow: '0 0 4px rgba(255,105,180,0.8)',
                    boxShadow: '0 0 8px rgba(255,105,180,0.3)',
                  }}
                >
                  ← BACK TO CATEGORIES
                </button>
              )}
              <div 
                className="absolute left-1/2 transform -translate-x-1/2"
                style={{ 
                  color: '#FF69B4', 
                  textShadow: '0 0 15px rgba(255,105,180,0.9), 0 0 25px rgba(255,105,180,0.7)', 
                  fontSize: '18px',
                  fontWeight: '900',
                  letterSpacing: '1px'
                }}
              >
                BADGES
              </div>
              <div className="w-32"></div>
            </div>
            
            {/* Thin pink neon line */}
            <div 
              className="w-full h-px mb-4"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,105,180,0.8) 20%, rgba(255,105,180,1) 50%, rgba(255,105,180,0.8) 80%, transparent)',
                boxShadow: '0 0 4px rgba(255,105,180,0.6)'
              }}
            />

            {/* Content */}
            <div className="relative mt-1 flex-1 overflow-auto">
              {!selectedCategory ? (
                // Main Categories View
                <>
                  <div 
                    className="text-center mb-4"
                    style={{ 
                      whiteSpace: 'pre-wrap', 
                      lineHeight: 1.3, 
                      fontSize: 11, 
                      color: '#FF69B4', 
                      textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(255,105,180,0.6)', 
                      marginTop: '4px' 
                    }}
                  >
                    Choose a category to explore your badges and track your progress through the Heartverse.
                  </div>
                  
                  <div className="flex flex-col items-center justify-center w-full">
                    {/* Categories arranged in a centered grid */}
                    <div className="grid grid-cols-3 gap-x-6 gap-y-4 place-items-center">
                      {badgeCategories.slice(0, 6).map((category) => (
                        <div
                          key={category.id}
                          className="text-center cursor-pointer group flex-shrink-0"
                          onClick={() => {
                            try { sfx.play('click', 0.7); } catch {}
                            setSelectedCategory(category.id);
                            setCurrentPage(0);
                          }}
                        >
                          <div 
                            className="w-20 h-20 rounded-full border-2 border-pink-400/60 hover:border-pink-400/80 relative overflow-hidden transition-all duration-300 group-hover:scale-105 flex items-center justify-center"
                            style={{
                              boxShadow: `0 0 15px ${category.color}40`,
                              background: `linear-gradient(135deg, ${category.color}20, rgba(252,84,175,0.1))`
                            }}
                          >
                            <img
                              src={getBadgeIcon(category.id)}
                              alt={category.name}
                              className="w-16 h-16 object-cover rounded-full transition-all duration-300"
                              style={{
                                filter: `drop-shadow(0 0 8px ${category.color})`
                              }}
                              draggable={false}
                            />
                          </div>
                          
                          <div 
                            className="text-xs mt-1 font-bold"
                            style={{ 
                              color: category.name === 'LISTENING' ? '#38B6FF' : category.name === 'COLLECTOR' ? '#ffffff' : category.color, 
                              textShadow: category.name === 'LISTENING' ? '0 0 4px rgba(56,182,255,0.8)' : category.name === 'COLLECTOR' ? '0 0 4px rgba(255,255,255,0.8)' : `0 0 4px ${category.color}80`,
                              fontSize: '10px'
                            }}
                          >
                            {category.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : !selectedBadge ? (
                // Category Badges View
                (() => {
                  const category = badgeCategories.find(cat => cat.id === selectedCategory);
                  if (!category) return null;
                  
                  return (
                    <div className="space-y-4">
                      {category.id === 'elemental-streak' ? (
                        // Element circles for elemental streak
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            {/* Back to elements button when element is selected */}
                            {elementFilter ? (
                              <button
                                onClick={() => {
                                  try { sfx.play('click', 0.6); } catch {}
                                  setElementFilter(null);
                                  setCurrentPage(0);
                                }}
                                className="px-3 py-1 text-[10px] font-bold rounded border border-pink-400/60 hover:border-pink-400/80 transition-all duration-200"
                                style={{
                                  background: 'rgba(255,105,180,0.1)',
                                  color: '#FF69B4',
                                  textShadow: '0 0 4px rgba(255,105,180,0.8)',
                                  boxShadow: '0 0 8px rgba(255,105,180,0.3)',
                              }}
                              >
                                ← BACK TO ELEMENTS
                              </button>
                            ) : (
                              <div className="w-32"></div>
                            )}
                            
                            <div 
                              className="text-center"
                              style={{ 
                                color: category.color, 
                                textShadow: `0 0 8px ${category.color}80`,
                                fontSize: '14px',
                                fontWeight: 'bold'
                              }}
                            >
                              {category.name}
                            </div>
                            
                            <div className="w-32"></div>
                          </div>
                          <div className="flex justify-center gap-4" style={{ marginTop: '0px' }}>
                            {getElementalElements().map(element => {
                              const elementBadges = category.badges.filter(badge => getElementFromBadge(badge) === element.name);
                              const completedCount = elementBadges.filter(badge => isUnlocked(badge)).length;
                              
                              return (
                                <div key={element.name} className="flex flex-col items-center">
                                  <button
                                    onClick={() => {
                                      try { sfx.play('click', 0.7); } catch {}
                                      setElementFilter(element.name);
                                      setCurrentPage(0);
                                    }}
                                    className="relative w-16 h-16 rounded-full border-2 transition-all duration-300 hover:scale-105 flex items-center justify-center group overflow-hidden"
                                    style={{
                                      borderColor: elementFilter === element.name ? element.color : `${element.color}60`,
                                      background: elementFilter === element.name 
                                        ? `linear-gradient(135deg, ${element.color}30, ${element.color}10)`
                                        : `linear-gradient(135deg, ${element.color}20, ${element.color}05)`,
                                      boxShadow: elementFilter === element.name 
                                        ? `0 0 20px ${element.color}60, 0 0 40px ${element.color}30`
                                        : `0 0 15px ${element.color}30`
                                    }}
                                  >
                                    <img
                                      src={element.image}
                                      alt={element.name}
                                      className="absolute inset-0 w-full h-full object-cover rounded-full transition-all duration-300"
                                      style={{
                                        filter: `drop-shadow(0 0 8px ${element.color})`,
                                        transform: elementFilter === element.name ? 'scale(1.05)' : 'scale(1)'
                                      }}
                                      draggable={false}
                                    />
                                    
                                    {/* Progress indicator */}
                                    <div 
                                      className="absolute -bottom-1 -right-1 rounded-full w-5 h-5 flex items-center justify-center text-white font-bold border-2 border-black/50"
                                      style={{ 
                                        background: element.color,
                                        fontSize: '8px',
                                        textShadow: '0 0 4px rgba(0,0,0,0.8)'
                                      }}
                                    >
                                      {completedCount}
                                    </div>
                                  </button>
                                  
                                  <div 
                                    className="text-xs mt-1 font-bold text-center"
                                    style={{ 
                                      color: elementFilter === element.name ? element.color : `${element.color}80`,
                                      textShadow: `0 0 4px ${element.color}60`,
                                      fontSize: '9px'
                                    }}
                                  >
                                    {element.name}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        // Regular category header for other categories
                        <div 
                          className="text-center"
                          style={{ 
                            color: category.color, 
                            textShadow: `0 0 8px ${category.color}80`,
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          {category.name}
                        </div>
                      )}
                      
                      {/* Only show badges if not elemental-streak OR if element filter is selected */}
                      {(category.id !== 'elemental-streak' || elementFilter) && (
                        <div className="space-y-4">

                          {/* Current page badges - dynamically rendered grid */}
                          <div className="space-y-3">
                            {(() => {
                              const badges = filterBadgesByElement(category.badges);
                              const pageOffset = currentPage * 30;
                              const pageBadges = badges.slice(pageOffset, pageOffset + 30);
                              
                              if (pageBadges.length === 0) {
                                return (
                                  <div className="text-center text-white/50 text-sm py-8">
                                    No badges available for this category
                                  </div>
                                );
                              }
                              
                              // Group badges into rows of up to 5
                              const rows = [];
                              for (let i = 0; i < pageBadges.length; i += 5) {
                                rows.push(pageBadges.slice(i, i + 5));
                              }
                              
                              return rows.map((rowBadges, rowIndex) => (
                                <div key={rowIndex} className="flex justify-center gap-4">
                                  {rowBadges.map((badge, badgeIndex) => (
                                    <div key={badgeIndex} className="flex flex-col items-center space-y-2">
                                      <div className="relative">
                                        <button
                                          onClick={() => {
                                            try { sfx.play('click', 0.6); } catch {}
                                            setSelectedBadge(badge);
                                          }}
                                          onMouseEnter={() => {
                                            try { sfx.play('hover', 0.4); } catch {}
                                          }}
                                          className="relative w-12 h-12 rounded-full bg-black/60 border border-white/20 hover:border-white/40 transition-all duration-200 hover:scale-105 flex items-center justify-center group overflow-hidden"
                                          title={badge.description ? `${badge.badge_name}: ${badge.description}` : badge.badge_name}
                                          style={{
                                            opacity: isUnlocked(badge) ? 1 : 0.4,
                                            filter: isUnlocked(badge) ? 'none' : 'grayscale(80%)',
                                          }}
                                        >
                                          {/* Progress ring */}
                                          {badge.progress !== undefined && badge.progress < 100 && (
                                            <div className="absolute inset-0">
                                              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
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
                                                  stroke={isUnlocked(badge) ? "#10B981" : category.color}
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                  strokeDasharray={`${2 * Math.PI * 22}`}
                                                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - (badge.progress || 0) / 100)}`}
                                                  className="transition-all duration-300"
                                                />
                                              </svg>
                                            </div>
                                          )}
                                          
                                          <div className={`absolute inset-0 rounded-full overflow-hidden transition-opacity ${isUnlocked(badge) ? 'opacity-100' : 'opacity-40 group-hover:opacity-60'}`}>
                                            {(() => {
                                              const icon = getBadgeDisplayIcon(badge, category.id);
                                              // Check if it's an image path (starts with / or http) or just an emoji
                                              if (typeof icon === 'string' && (icon.startsWith('/') || icon.startsWith('http'))) {
                                                return (
                                                  <img
                                                    src={icon}
                                                    alt={badge.badge_name}
                                                    className="w-full h-full object-cover"
                                                    draggable={false}
                                                    onError={(e) => {
                                                      // Fallback to emoji if image fails to load
                                                      const target = e.target as HTMLImageElement;
                                                      const container = target.parentElement;
                                                      if (container) {
                                                        container.innerHTML = '<div class="w-full h-full flex items-center justify-center text-lg">🏅</div>';
                                                      }
                                                    }}
                                                  />
                                                );
                                              } else {
                                                return (
                                                  <div className="w-full h-full flex items-center justify-center text-lg">
                                                    {icon}
                                                  </div>
                                                );
                                              }
                                            })()}
                                          </div>
                                          
                                          {!isUnlocked(badge) && (
                                            <div className="absolute inset-0.5 bg-black/40 rounded-full flex items-center justify-center">
                                              <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                                            </div>
                                          )}
                                        </button>
                                        
                                        {badge.progress !== undefined && badge.progress > 0 && badge.progress < 100 && (
                                          <div 
                                            className="absolute -bottom-0.5 -right-0.5 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold"
                                            style={{ 
                                              background: category.color,
                                              fontSize: '8px'
                                            }}
                                          >
                                            {badge.progress}%
                                          </div>
                                        )}
                                        
                                        {isUnlocked(badge) && (
                                          <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                            ✓
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="text-white/80 text-xs text-center max-w-16 font-medium" style={{ textShadow: '0 0 4px rgba(255,255,255,0.3)' }}>
                                        {badge.badge_name}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                // Badge Detail View - Inline within the popup
                <div className="relative space-y-2 max-w-xs mx-auto" style={{ paddingBottom: '12px' }}>
                  {/* Back button positioned to the left */}
                  <button
                    onClick={() => {
                      try { sfx.play('close', 0.6); } catch {}
                      setSelectedBadge(null);
                    }}
                    className="absolute -left-8 top-0 px-3 py-1 text-[10px] font-bold rounded border border-pink-400/60 hover:border-pink-400/80 transition-all duration-200"
                    style={{
                      background: 'rgba(255,105,180,0.1)',
                      color: '#FF69B4',
                      textShadow: '0 0 4px rgba(255,105,180,0.8)',
                      boxShadow: '0 0 8px rgba(255,105,180,0.3)',
                    }}
                  >
                    ← BACK TO BADGES
                  </button>

                  {/* Larger badge display */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-gray-800/80 to-black/90 border border-white/30 flex items-center justify-center overflow-hidden">
                      {selectedBadge.icon_url ? (
                        <img
                          src={selectedBadge.icon_url}
                          alt={selectedBadge.badge_name}
                          className="w-full h-full object-cover rounded-full"
                          style={{
                            opacity: isUnlocked(selectedBadge) ? 1 : 0.4
                          }}
                          draggable={false}
                        />
                      ) : (
                        <div className="relative z-10 text-lg opacity-60">
                          {getBadgeDisplayIcon(selectedBadge, selectedCategory || '')}
                        </div>
                      )}
                      {!isUnlocked(selectedBadge) && (
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white/20 rounded-full" />
                        </div>
                      )}
                    </div>
                    
                    {/* Badge name directly below PNG */}
                    <h2 className="text-white font-bold text-sm text-center">
                      {selectedBadge.badge_name}
                    </h2>
                    
                    {/* Status directly below badge name */}
                    <div className={`text-xs ${isUnlocked(selectedBadge) ? 'text-green-400' : 'text-white/40'}`}>
                      {isUnlocked(selectedBadge) ? '✅ UNLOCKED' : '🔒 LOCKED'}
                    </div>
                  </div>
                  
                  {selectedBadge.description && (
                    <p className="text-white/70 text-xs px-2">
                      {selectedBadge.description}
                    </p>
                  )}
                  
                  {/* Requirement section - Always show */}
                  <div className="space-y-1 px-2">
                    <div className="text-white/50 text-xs font-semibold uppercase tracking-wider">
                      REQUIREMENT
                    </div>
                    <p className="text-white/60 text-xs">
                      {formatRequirementText(selectedBadge) || selectedBadge.requirement_text || 
                       `${selectedBadge.total || selectedBadge.requirement_count || 1} ${(selectedBadge.requirement_type || 'achievement').replace(/_/g, ' ')}${(selectedBadge.total || selectedBadge.requirement_count || 1) === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  
                  {selectedBadge.progress !== undefined && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs px-2">
                        <span className="text-white/70">Progress</span>
                        <span className="text-white/70">{selectedBadge.current || 0} / {selectedBadge.total || 0}</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-1.5 mx-2">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isUnlocked(selectedBadge) ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${selectedBadge.progress || 0}%` }}
                        />
                      </div>
                      <div className="text-center" style={{ marginBottom: '8px' }}>
                        <span className={`text-xs font-bold ${
                          isUnlocked(selectedBadge) ? 'text-green-400' : 'text-blue-400'
                        }`}>
                          {selectedBadge.progress || 0}% Complete
                        </span>
                      </div>
                      
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
