"use client";

import React, { useState, useEffect } from "react";
import { sfx } from "@/lib/sfx";
import { useProfile } from "@/contexts/ProfileContext";
import { getBadgeIcon } from "@/config/assets";
import { getBadgeProgressForUser, formatRequirementText } from "@/lib/badgeProgress";
import TiltSpinCard from "@/components/TiltSpinCard";

type BadgeWithProgress = {
  id: string;
  badge_name: string;
  description?: string;
  icon_url?: string;
  category?: string;
  sub_category?: string;
  requirement?: string;
  progress?: number;
  current?: number;
  total?: number;
  unlocked?: boolean;
};

type BadgeCategory = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  badges: BadgeWithProgress[];
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
  const [badgeRotation, setBadgeRotation] = useState(0);
  const [isBadgeAnimatingFlip, setIsBadgeAnimatingFlip] = useState(false);
  
  // Use ProfileContext data
  const { allBadges, userBadges, badgesLoading: loading, badgesError: error, profile } = useProfile();

  // Create badge display objects with unlocked status and accurate progress
  const badgesWithUnlocked = allBadges.map(badge => {
    const userBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
    const isUnlocked = userBadgeIds.has(badge.id);

    // Normalize badge shape for progress utility
    const normalizedBadge = {
      id: badge.id,
      slug: (badge as any).slug || '',
      badge_name: badge.badge_name,
      description: badge.description,
      icon_url: badge.icon_url,
      requirement_text: null,
      requirement_type: (badge as any).requirement_type,
      requirement_count: (badge as any).requirement_count,
      category: (badge as any).category,
      created_at: (badge as any).created_at,
    } as any;

    const progressData = getBadgeProgressForUser(normalizedBadge, profile as any);

    return {
      ...badge,
      badge_name: badge.badge_name,
      unlocked: isUnlocked,
      // Percent for ring display
      progress: progressData.percentage,
      // Current/total for detail display
      current: progressData.current,
      total: progressData.target,
      // Display-ready requirement text
      requirement: formatRequirementText(normalizedBadge),
    };
  });

  // Reset badge rotation when selected badge changes
  useEffect(() => {
    setBadgeRotation(0);
    setIsBadgeAnimatingFlip(false);
  }, [selectedBadge?.id]);

  // Create badge categories with all badges (same categories as BadgesModal)
  const badgeCategories = [
    {
      id: 'soul',
      name: 'SOUL STAR',
      emoji: '⭐',
      color: '#FFD700',
      badges: badgesWithUnlocked.filter(badge => badge.category === 'soul')
    },
    {
      id: 'collector',
      name: 'COLLECTOR',
      emoji: '🏆',
      color: '#38B6FF',
      badges: badgesWithUnlocked.filter(badge => badge.category === 'collector')
    },
    {
      id: 'elemental-streak',
      name: 'ELEMENTAL STREAK',
      emoji: '💠',
      color: '#FC54AF',
      badges: badgesWithUnlocked.filter(badge => badge.category === 'elemental-streak')
    },
    {
      id: 'listening',
      name: 'LISTENING',
      emoji: '🎵',
      color: '#9333EA',
      badges: badgesWithUnlocked.filter(badge => badge.category === 'listening')
    },
    {
      id: 'currency',
      name: 'CURRENCY',
      emoji: '💰',
      color: '#F59E0B',
      badges: badgesWithUnlocked.filter(badge => badge.category === 'currency')
    },
    {
      id: 'community',
      name: 'COMMUNITY',
      emoji: '🌐',
      color: '#10B981',
      badges: badgesWithUnlocked.filter(badge => badge.category === 'community')
    }
  ];

  // Add refetch function for compatibility
  const refetch = () => {
    // ProfileContext will automatically refetch when needed
    window.location.reload();
  };

  // Define handleClick function early to avoid initialization errors
  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    try { onClick?.(e); } catch {}
    if (!e.defaultPrevented) {
      e.preventDefault();
      try { sfx.play('click', 0.8); } catch {}
      // Trigger blue light beam when opening badges
      try { onBeamColorChange?.('blue'); } catch {}
      // Close blue display first
      try { onCloseBlueDisplay?.(); } catch {}
      // Panel open/close is now handled by parent
    }
  };

  // DISABLED: Listen for openBadges event from hamburger menu
  // This was causing the badges to open when journal was clicked
  // useEffect(() => {
  //   const handleOpenBadges = (e: CustomEvent) => {
  //     try {
  //       const fakeEvent = {
  //         preventDefault: () => {},
  //         defaultPrevented: false
  //       } as React.MouseEvent<HTMLButtonElement>;
  //       
  //       try { sfx.play('click', 0.8); } catch {}
  //       try { onBeamColorChange?.('yellow'); } catch {}
  //       try { onCloseBlueDisplay?.(); } catch {}
  //       try { onClick?.(fakeEvent); } catch {}
  //       
  //       console.log('Badges opened from hamburger menu');
  //     } catch (error) {
  //       console.error('Error handling openBadges event:', error);
  //     }
  //   };

  //   window.addEventListener('openBadges', handleOpenBadges as EventListener);
  //   return () => window.removeEventListener('openBadges', handleOpenBadges as EventListener);
  // }, [onClick, onBeamColorChange, onCloseBlueDisplay]);

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
    // Fall back to showing the button but with error indicator and retry option
    return (
      <>
        <button
          data-tour-id="badges"
          onClick={handleClick} 
          onMouseEnter={onHoverSound}
          className="p-1 rounded-lg transition-all duration-200 w-20 h-16 relative"
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
          <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></div>
        </button>
        
        {isActive && (
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-sm mx-4 text-center">
              <div className="text-red-400 text-lg mb-4">⚠️ Connection Error</div>
              <div className="text-gray-300 mb-4">{error}</div>
              <button 
                onClick={() => { refetch(); }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </>
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
    return badge.unlocked === true;
  };

  const getElementFromBadge = (badge: BadgeWithProgress) => {
    // Use sub_category if available (database field)
    if (badge.sub_category) {
      const sub = badge.sub_category.toUpperCase();
      if (sub === 'HEART' || sub === 'WATER' || sub === 'LIGHTNING' || sub === 'DARKNESS') {
        return sub;
      }
    }

    // Fallback: parse from badge name for elemental streak badges
    if (badge.category === 'elemental-streak' && badge.badge_name) {
      const name = badge.badge_name.toLowerCase();

      // Check for specific element patterns - order matters, check HEART first for ember/glow
      if (name.includes('heart') || name.includes('love') || name.includes('devotion') || name.includes('radiance') || name.includes('pulse') || name.includes('bloom') || name.includes('warmth') || name.includes('compassion') || name.includes('empathy') || name.includes('soulmate') || name.includes('ember') || name.includes('glow')) return 'HEART';
      if (name.includes('water') || name.includes('ocean') || name.includes('tide') || name.includes('flow') || name.includes('drift') || name.includes('surge') || name.includes('depth') || name.includes('ripple')) return 'WATER';
      if (name.includes('lightning') || name.includes('spark') || name.includes('flash') || name.includes('charge') || name.includes('storm') || name.includes('bolt') || name.includes('electric')) return 'LIGHTNING';
      if (name.includes('darkness') || name.includes('shadow') || name.includes('night') || name.includes('dusk') || name.includes('midnight') || name.includes('veil') || name.includes('eclipse')) return 'DARKNESS';
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
          className="fixed left-0 right-0 z-[2147483647] flex items-center justify-center"
          style={{
            top: 'var(--profile-bar-boundary, 64px)',
            bottom: 'calc(var(--display-touch-top) + 60px)'
          }}
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
          <div
            className="badges-hologram-container flex flex-col relative"
            style={{
              width: 'min(95vw, 740px)',
              maxWidth: '700px',
              minHeight: '350px',
              // Height fills the bounded area (profile bar to light beam)
              height: '100%',
              maxHeight: '100%',
              padding: '10px 14px 10px 14px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(0,191,255,0.10), rgba(0,0,0,0.60))',
              border: '1px solid rgba(0,191,255,0.55)',
              boxShadow: '0 -8px 25px rgba(0,191,255,0.4), 0 -4px 15px rgba(0,191,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,191,255,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#00BFFF',
              position: 'relative',
              zIndex: 1,
              overflow: 'hidden'
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
              onMouseEnter={(e) => {
                sfx.play('hover', 0.6);
                e.currentTarget.style.transform = 'scale(1.15)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0,191,255,1), 0 0 35px rgba(0,191,255,0.7), 0 0 50px rgba(0,191,255,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(0,191,255,0.8), 0 0 25px rgba(0,191,255,0.5), 0 0 35px rgba(0,191,255,0.3)';
              }}
              className="absolute top-2 right-4 text-cyan-400 hover:text-cyan-200 cursor-pointer w-8 h-8 rounded-full border border-cyan-400/80 flex items-center justify-center"
              style={{
                fontSize: '16px',
                boxShadow: '0 0 15px rgba(0,191,255,0.8), 0 0 25px rgba(0,191,255,0.5), 0 0 35px rgba(0,191,255,0.3)',
                textShadow: '0 0 8px rgba(0,191,255,0.8), 0 0 15px rgba(0,191,255,0.6)',
                background: 'rgba(0,191,255,0.1)',
                backdropFilter: 'blur(2px)',
                transition: 'transform 200ms ease, box-shadow 200ms ease'
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
            
            {/* Header */}
            <div className="flex justify-between items-center mb-3 pt-4">
              {selectedCategory && (
                <button
                  onClick={() => {
                    try { sfx.play('click', 0.6); } catch {}
                    setSelectedCategory(null);
                    setSelectedBadge(null);
                    setElementFilter(null);
                    setCurrentPage(0);
                  }}
                  onMouseEnter={(e) => {
                    sfx.play('hover', 0.4);
                    e.currentTarget.style.transform = 'scale(1.15)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0,191,255,0.8), 0 0 35px rgba(0,191,255,0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(0,191,255,0.6), 0 0 25px rgba(0,191,255,0.4)';
                  }}
                  className="w-10 h-10 rounded-full border border-cyan-400/60 hover:border-cyan-400/80 flex items-center justify-center text-cyan-400 hover:text-cyan-200"
                  style={{
                    background: 'rgba(0,191,255,0.1)',
                    boxShadow: '0 0 15px rgba(0,191,255,0.6), 0 0 25px rgba(0,191,255,0.4)',
                    backdropFilter: 'blur(2px)',
                    transition: 'transform 200ms ease, box-shadow 200ms ease',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </button>
              )}
              <div 
                className="absolute left-1/2 transform -translate-x-1/2"
                style={{ 
                  color: '#00BFFF', 
                  textShadow: '0 0 15px rgba(0,191,255,0.9), 0 0 25px rgba(0,191,255,0.7)', 
                  fontSize: '26px',
                  fontWeight: '900',
                  letterSpacing: '1px'
                }}
              >
                BADGES
              </div>
              <div className="w-32"></div>
            </div>
            
            {/* Thin cyan neon line under BADGES title */}
            <div 
              className="w-full h-px mb-4"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.8) 20%, rgba(0,191,255,1) 50%, rgba(0,191,255,0.8) 80%, transparent)',
                boxShadow: '0 0 4px rgba(0,191,255,0.6)'
              }}
            />

            {/* Badge Detail Overlay - Full container */}
            {selectedBadge && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-20 rounded-[18px]">
                {/* Back button - top left */}
                <button
                  onClick={() => {
                    try { sfx.play('close', 0.6); } catch {}
                    setSelectedBadge(null);
                  }}
                  onMouseEnter={(e) => {
                    sfx.play('hover', 0.4);
                    e.currentTarget.style.transform = 'scale(1.15)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0,191,255,0.8), 0 0 35px rgba(0,191,255,0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(0,191,255,0.6), 0 0 25px rgba(0,191,255,0.4)';
                  }}
                  className="absolute top-4 left-4 w-10 h-10 rounded-full border border-cyan-400/60 hover:border-cyan-400/80 flex items-center justify-center text-cyan-400 hover:text-cyan-200"
                  style={{
                    background: 'rgba(0,191,255,0.1)',
                    boxShadow: '0 0 15px rgba(0,191,255,0.6), 0 0 25px rgba(0,191,255,0.4)',
                    backdropFilter: 'blur(2px)',
                    transition: 'transform 200ms ease, box-shadow 200ms ease',
                    zIndex: 30
                  }}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </button>

                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-full max-w-sm mx-4 p-6 text-center space-y-4">
                    {/* Badge display with TiltSpinCard */}
                  <div className="flex flex-col items-center space-y-4">
                    {/* Removed CLAIMED label above badge in enlarged view */}

                    <div
                      className="relative"
                      style={{
                        touchAction: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                    >
                      <TiltSpinCard
                        className="relative w-44 h-44 cursor-grab active:cursor-grabbing"
                        style={{
                          touchAction: 'none',
                          perspective: '1000px',
                          zIndex: 50,
                        }}
                        maxRotateX={10}
                        sensitivity={0.3}
                        returnDuration={400}
                        enableSpin={true}
                        spinSensitivity={0.8}
                        onRotationChange={setBadgeRotation}
                        onClick={() => {
                          sfx.play('flip', 0.8);
                          setIsBadgeAnimatingFlip(true);
                          setBadgeRotation(prev => prev + 180);
                          setTimeout(() => setIsBadgeAnimatingFlip(false), 500);
                        }}
                      >
                        {/* 3D container for badge */}
                        <div
                          className="absolute inset-0 w-full h-full"
                          style={{
                            transformStyle: 'preserve-3d',
                            transform: `rotateY(${badgeRotation}deg)`,
                            transition: isBadgeAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                            pointerEvents: 'none',
                          }}
                        >
                          {/* Front of badge */}
                          <div
                            className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-br from-gray-800/80 to-black/90 border-2 border-cyan-400/60 flex items-center justify-center"
                            style={{
                              backfaceVisibility: 'hidden',
                              boxShadow: '0 0 25px rgba(0,191,255,0.6), 0 0 50px rgba(0,191,255,0.3)',
                            }}
                          >
                            <div
                              className="relative z-10"
                              style={{
                                filter: isUnlocked(selectedBadge) ? 'none' : 'blur(3px) grayscale(30%)',
                                opacity: isUnlocked(selectedBadge) ? 1 : 0.6,
                                transition: 'filter 300ms ease, opacity 300ms ease'
                              }}
                            >
                              {selectedBadge.icon_url ? (
                                <img
                                  src={selectedBadge.icon_url}
                                  alt={selectedBadge.badge_name}
                                  className="w-40 h-40 object-cover rounded-full"
                                  draggable={false}
                                />
                              ) : (
                                <div className="text-3xl">
                                  {getBadgeDisplayIcon(selectedBadge, selectedCategory || '')}
                                </div>
                              )}
                            </div>
                            {/* Locked overlay with text */}
                            {!isUnlocked(selectedBadge) && (
                              <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
                                <div className="text-white/90 text-sm font-bold flex items-center gap-1" style={{ textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>
                                  🔒 LOCKED
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Back of badge */}
                          <div
                            className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-br from-gray-800/80 to-black/90 border-2 border-cyan-400/60 flex items-center justify-center"
                            style={{
                              backfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg)',
                              boxShadow: '0 0 25px rgba(0,191,255,0.6), 0 0 50px rgba(0,191,255,0.3)',
                            }}
                          >
                            {isUnlocked(selectedBadge) ? (
                              // Claimed badge back - show user name and date
                              <div className="flex flex-col items-center justify-center text-center px-2">
                                <div className="text-white font-bold text-sm truncate max-w-[100px]" style={{ textShadow: '0 0 8px rgba(0,191,255,0.8)' }}>
                                  {profile?.name || 'You'}
                                </div>
                                <div
                                  className="text-[10px] font-semibold mt-1"
                                  style={{ color: '#39FF14', textShadow: '0 0 8px #39FF14, 0 0 14px #39FF14' }}
                                >
                                  CLAIMED
                                </div>
                                <div className="text-white/80 text-[10px] mt-0.5">
                                  {(() => {
                                    const userBadge = userBadges.find(ub => ub.badge_id === selectedBadge.id);
                                    if (userBadge?.earned_at) {
                                      const date = new Date(userBadge.earned_at);
                                      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                                    }
                                    return '';
                                  })()}
                                </div>
                              </div>
                            ) : (
                              // Locked badge back
                              <>
                                <div
                                  className="relative z-10"
                                  style={{
                                    filter: 'blur(3px) grayscale(30%)',
                                    opacity: 0.6,
                                    transition: 'filter 300ms ease, opacity 300ms ease'
                                  }}
                                >
                                  {selectedBadge.icon_url ? (
                                    <img
                                      src={selectedBadge.icon_url}
                                      alt={selectedBadge.badge_name}
                                      className="w-40 h-40 object-cover rounded-full"
                                      draggable={false}
                                    />
                                  ) : (
                                    <div className="text-3xl">
                                      {getBadgeDisplayIcon(selectedBadge, selectedCategory || '')}
                                    </div>
                                  )}
                                </div>
                                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
                                  <div className="text-white/90 text-sm font-bold flex items-center gap-1" style={{ textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>
                                    🔒 LOCKED
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </TiltSpinCard>
                    </div>

                    <h2 className="text-white font-bold text-lg text-center">
                      {selectedBadge.badge_name}
                    </h2>

                    {selectedBadge.description && (
                      <p className="text-white/80 text-sm text-center">
                        {selectedBadge.description}
                      </p>
                    )}

                    <div className="space-y-2 text-center">
                      <div className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                        REQUIREMENT
                      </div>
                      <p className="text-white/70 text-xs">
                        {selectedBadge.requirement || selectedBadge.description || 'Complete the required action to earn this badge'}
                      </p>
                    </div>

                    {selectedBadge.progress !== undefined && (
                      <div className="space-y-2 w-full">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/70">Progress</span>
                          <span className="text-white/70">{selectedBadge.current || 0} / {selectedBadge.total || 0}</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isUnlocked(selectedBadge) ? 'bg-green-500' : 'bg-cyan-500'
                            }`}
                            style={{ width: `${selectedBadge.progress || 0}%` }}
                          />
                        </div>
                        <div className="text-center">
                          <span className={`text-xs font-bold ${
                            isUnlocked(selectedBadge) ? 'text-green-400' : 'text-cyan-400'
                          }`}>
                            {selectedBadge.progress || 0}% Complete
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="relative mt-1 flex-1 overflow-auto">
              {!selectedCategory && !selectedBadge ? (
                // Main Categories View
                <>
                  <div className="text-center mb-2">
                    <span className="text-cyan-300 text-base font-bold uppercase tracking-wider">
                      BADGES CLAIMED: {profile?.badges_unlocked || badgesWithUnlocked.filter(badge => badge.unlocked).length}
                    </span>
                  </div>
                  <div 
                    className="text-center mb-4"
                    style={{ 
                      whiteSpace: 'pre-wrap', 
                      lineHeight: 1.3, 
                      fontSize: 16, 
                      color: '#00BFFF', 
                      textShadow: '0 0 8px rgba(0,191,255,0.6), 0 0 15px rgba(0,191,255,0.4)',
                      marginTop: '4px' 
                    }}
                  >
                    Explore your badges and track your progress through the Heartverse.
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
                          onMouseEnter={() => {
                            try { sfx.play('change-channel'); } catch {}
                          }}
                        >
                          <div 
                            className="w-20 h-20 rounded-full border-2 border-cyan-400/60 hover:border-cyan-400/80 relative overflow-hidden transition-all duration-300 group-hover:scale-105 flex items-center justify-center"
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
              ) : (
                // Category Badges View
                (() => {
                  const category = badgeCategories.find(cat => cat.id === selectedCategory);
                  if (!category) return null;
                  
                  return (
                    <div className="space-y-4">
                      {category.id === 'elemental-streak' ? (
                        // Element circles for elemental streak
                        <div className="space-y-3">
                          <div className="flex justify-center items-center">
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
                                      // Toggle: if already selected, deselect; otherwise select
                                      setElementFilter(elementFilter === element.name ? null : element.name);
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
                              // Sort by requirement count/target ascending, then by name
                              const sorted = [...badges].sort((a, b) => {
                                const at = typeof a.total === 'number' ? a.total : (a as any).requirement_count ?? Number.MAX_SAFE_INTEGER;
                                const bt = typeof b.total === 'number' ? b.total : (b as any).requirement_count ?? Number.MAX_SAFE_INTEGER;
                                if (at !== bt) return at - bt;
                                return (a.badge_name || '').localeCompare(b.badge_name || '');
                              });
                              const pageOffset = currentPage * 30;
                              const pageBadges = sorted.slice(pageOffset, pageOffset + 30);
                              
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
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
