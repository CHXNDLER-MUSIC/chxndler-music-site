"use client";

import React, { useState, useEffect } from "react";
import { sfx } from "@/lib/sfx";

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
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [elementFilter, setElementFilter] = useState<string | null>(null);

  const badgeCategories: BadgeCategory[] = [
    {
      id: "soul-star",
      name: "SOUL STAR",
      emoji: "⭐️",
      color: "#FFD700",
      badges: [
        { name: "Soul Star", description: "First reflection", progress: 0, current: 0, total: 1 },
        { name: "Soul Ember", description: "3 reflections", progress: 0, current: 0, total: 3 },
        { name: "Soul Flame", description: "7 reflections", progress: 0, current: 0, total: 7, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Soul%20Flame.png?updatedAt=1763736238477" },
        { name: "Soul Bloom", description: "14 reflections", progress: 0, current: 0, total: 14, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Soul%20Bloom.png?updatedAt=1763736238510" },
        { name: "Soul Rise", description: "30 reflections", progress: 0, current: 0, total: 30 },
        { name: "Soul Eclipse", description: "50 reflections", progress: 0, current: 0, total: 50 },
        { name: "Eternal Soul", description: "100 reflections", progress: 0, current: 0, total: 100, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Eternal%20Soul.png?updatedAt=1763736238338" },
      ]
    },
    {
      id: "achievements",
      name: "ACHIEVEMENTS",
      emoji: "🏆",
      color: "#38B6FF",
      badges: [
        { name: "First Listen", unlocked: true, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/First%20Listen.png?updatedAt=1763736238402" },
        { name: "Digital Collector", description: "Collect 5 cards", progress: 40, current: 2, total: 5, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Digital%20Collector.png?updatedAt=1763736238340" },
        { name: "Cosmic Archivist", description: "Collect 15 cards", progress: 13, current: 2, total: 15, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Cosmic%20Archivist.png?updatedAt=1763736238431" },
        { name: "Starbinder", description: "Collect 25 cards", progress: 8, current: 2, total: 25 },
        { name: "Master Collector", description: "Collect all cards", progress: 4, current: 2, total: 50 },
        { name: "Live Witness", description: "Watch 1 livestream", progress: 0, current: 0, total: 1 },
        { name: "Stream Seeker", description: "Watch 3", progress: 0, current: 0, total: 3 },
        { name: "Signal Streamer", description: "Watch 10", progress: 0, current: 0, total: 10 },
        { name: "Cosmic Broadcaster", description: "Watch 25", progress: 0, current: 0, total: 25 },
        { name: "Merch Supporter", description: "Buy your first merch item", progress: 0, current: 0, total: 1 },
        { name: "Cosmic Donor", description: "Make a donation", progress: 0, current: 0, total: 1 },
      ]
    },
    {
      id: "elemental-streak",
      name: "ELEMENTAL STREAK",
      emoji: "💠",
      color: "#FC54AF",
      badges: [
        // Heart badges
        { name: "Ember Glow", description: "❤️ HEART - 3 days", progress: 67, current: 2, total: 3, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Ember%20Glow.png?updatedAt=1763736238400" },
        { name: "Gentle Bloom", description: "❤️ HEART - 7 days", progress: 29, current: 2, total: 7, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Gentle%20Bloom.png?updatedAt=1763736238445" },
        { name: "Warm Pulse", description: "❤️ HEART - 14 days", progress: 14, current: 2, total: 14, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Warm%20PUlse.png?updatedAt=1763736238454" },
        { name: "Heart Radiance", description: "❤️ HEART - 30 days", progress: 7, current: 2, total: 30 },
        { name: "Deep Devotion", description: "❤️ HEART - 50 days", progress: 4, current: 2, total: 50 },
        { name: "Eternal Love", description: "❤️ HEART - 100 days", progress: 2, current: 2, total: 100, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Eternal%20Love.png?updatedAt=1763736238429" },
        // Water badges
        { name: "Rising Ripple", description: "💧 WATER - 3 days", progress: 0, current: 0, total: 3, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Rising%20Ripple.png?updatedAt=1763736238483" },
        { name: "Steady Flow", description: "💧 WATER - 7 days", progress: 0, current: 0, total: 7, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Steady%20Flow.png?updatedAt=1763736238439" },
        { name: "Shifting Tide", description: "💧 WATER - 14 days", progress: 0, current: 0, total: 14, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Shifting%20Tide.png?updatedAt=1763736238457" },
        { name: "Ocean Surge", description: "💧 WATER - 30 days", progress: 0, current: 0, total: 30, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Ocean%20Surge.png?updatedAt=1763736238406" },
        { name: "Silver Depth", description: "💧 WATER - 50 days", progress: 0, current: 0, total: 50 },
        { name: "Endless Drift", description: "💧 WATER - 100 days", progress: 0, current: 0, total: 100 },
        // Lightning badges
        { name: "First Spark", description: "⚡ LIGHTNING - 3 days", progress: 0, current: 0, total: 3 },
        { name: "Bright Flash", description: "⚡ LIGHTNING - 7 days", progress: 0, current: 0, total: 7 },
        { name: "Quick Charge", description: "⚡ LIGHTNING - 14 days", progress: 0, current: 0, total: 14 },
        { name: "Raging Storm", description: "⚡ LIGHTNING - 30 days", progress: 0, current: 0, total: 30 },
        { name: "Sky Ascend", description: "⚡ LIGHTNING - 50 days", progress: 0, current: 0, total: 50, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Sky%20Ascend.png?updatedAt=1763736238480" },
        { name: "Ever Storm", description: "⚡ LIGHTNING - 100 days", progress: 0, current: 0, total: 100 },
        // Darkness badges
        { name: "Fading Shadow", description: "🌑 DARKNESS - 3 days", progress: 0, current: 0, total: 3, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Fading%20Shadow.png?updatedAt=1763736238459" },
        { name: "Silent Veil", description: "🌑 DARKNESS - 7 days", progress: 0, current: 0, total: 7, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Silent%20Vail.png?updatedAt=1763736238434" },
        { name: "Solar Eclipse", description: "🌑 DARKNESS - 14 days", progress: 0, current: 0, total: 14, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Solar%20Eclipse.png?updatedAt=1763736514798" },
        { name: "Falling Dusk", description: "🌑 DARKNESS - 30 days", progress: 0, current: 0, total: 30 },
        { name: "Black Midnight", description: "🌑 DARKNESS - 50 days", progress: 0, current: 0, total: 50 },
        { name: "Ever Night", description: "🌑 DARKNESS - 100 days", progress: 0, current: 0, total: 100 },
      ]
    },
    {
      id: "listening",
      name: "LISTENING",
      emoji: "🎵",
      color: "#9333EA",
      badges: [
        { name: "Deep Listener", description: "10 unique tracks", progress: 70, current: 7, total: 10, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Deep%20Listener.png?updatedAt=1763736238450" },
        { name: "Song Voyager", description: "25 unique tracks", progress: 28, current: 7, total: 25, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Song%20Voyager.png?updatedAt=1763736238532" },
        { name: "Track Devotee", description: "25 repeats", progress: 48, current: 12, total: 25, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Track%20Devotion.png?updatedAt=1763736238387" },
        { name: "Track Obsession", description: "100 repeats", progress: 12, current: 12, total: 100, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Track%20Obsession.png?updatedAt=1763736238452" },
        { name: "Complete Discography", description: "All songs", progress: 35, current: 7, total: 20, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Complete%20Discography.png?updatedAt=1763736238462" },
      ]
    },
    {
      id: "heartcoin",
      name: "HEARTCOIN",
      emoji: "💰",
      color: "#F59E0B",
      badges: [
        { name: "First HeartCoin", unlocked: true, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/First%20HeartCoin.png?updatedAt=1763736238400" },
        { name: "Treasure Finder", description: "10 HC", progress: 50, current: 5, total: 10 },
        { name: "Heartflow", description: "50 HC", progress: 10, current: 5, total: 50 },
        { name: "Cosmic Prosperity", description: "100 HC", progress: 5, current: 5, total: 100 },
      ]
    },
    {
      id: "community",
      name: "COMMUNITY",
      emoji: "🌐",
      color: "#10B981",
      badges: [
        { name: "Portal Opener", description: "Invite 1 friend", progress: 0, current: 0, total: 1 },
        { name: "Constellation Builder", description: "Invite 5 friends", progress: 0, current: 0, total: 5 },
        { name: "Galactic Signal", description: "Invite 20 friends", progress: 0, current: 0, total: 20 },
        { name: "Starlight Supporter", description: "Follow on Spotify/Apple, TikTok, YouTube, IG", progress: 25, current: 1, total: 4 },
      ]
    }
  ];

  const getBadgeIcon = (badgeName: string, categoryId: string) => {
    // Heart badges
    if (badgeName.includes('Ember') || badgeName.includes('Bloom') || badgeName.includes('Pulse') || 
        badgeName.includes('Radiance') || badgeName.includes('Devotion') || badgeName.includes('Love')) {
      return '❤️';
    }
    // Water badges
    if (badgeName.includes('Ripple') || badgeName.includes('Flow') || badgeName.includes('Tide') || 
        badgeName.includes('Surge') || badgeName.includes('Depth') || badgeName.includes('Drift')) {
      return '💧';
    }
    // Lightning badges
    if (badgeName.includes('Spark') || badgeName.includes('Flash') || badgeName.includes('Charge') || 
        badgeName.includes('Storm') || badgeName.includes('Ascend')) {
      return '⚡';
    }
    // Darkness badges
    if (badgeName.includes('Shadow') || badgeName.includes('Veil') || badgeName.includes('Eclipse') || 
        badgeName.includes('Dusk') || badgeName.includes('Midnight') || badgeName.includes('Night')) {
      return '🌑';
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

  const isUnlocked = (badge: Badge) => {
    return badge.unlocked || (badge.progress !== undefined && badge.progress >= 100);
  };

  const getElementFromBadge = (badge: Badge) => {
    if (!badge.description) return null;
    if (badge.description.includes('❤️ HEART')) return 'HEART';
    if (badge.description.includes('💧 WATER')) return 'WATER';
    if (badge.description.includes('⚡ LIGHTNING')) return 'LIGHTNING';
    if (badge.description.includes('🌑 DARKNESS')) return 'DARKNESS';
    return null;
  };

  const filterBadgesByElement = (badges: Badge[]) => {
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

  // Listen for openBadges event from hamburger menu
  React.useEffect(() => {
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
      {isActive && (
        <div 
          className="fixed inset-0 z-[2147483646] flex items-center justify-center"
          style={{
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              width: 'min(120vw, 700px)',
              height: '200px',
              background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(255,255,0,0.7) 0%, rgba(255,255,0,0.4) 30%, rgba(255,255,0,0.1) 60%, transparent 100%)',
              filter: 'blur(100px)'
            }}
          />
        </div>
      )}
      
      {/* Badges Modal */}
      {isActive && (
        <div 
          className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4"
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
            className="badges-hologram-container flex flex-col"
            style={{
              width: 'min(92vw, 700px)',
              maxWidth: '700px',
              minHeight: 'min(60vh, 500px)',
              maxHeight: '90vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,0,0.55)',
              boxShadow: '0 -8px 25px rgba(255,255,0,0.4), 0 -4px 15px rgba(255,255,0,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,255,0,0.45)',
              backdropFilter: 'blur(8px) saturate(120%)',
              color: '#FFFF00',
              position: 'relative'
            }}
          >
            {/* Soft bottom glow */}
            <div 
              className="absolute"
              style={{
                bottom: '-15px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '120%',
                height: '30px',
                background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,255,0,0.6) 0%, rgba(255,255,0,0.3) 40%, transparent 80%)',
                filter: 'blur(30px)',
                pointerEvents: 'none',
                zIndex: -1
              }}
            />
            
            {/* Top bloom glow */}
            <div 
              className="absolute"
              style={{
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80%',
                height: '20px',
                background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(255,255,0,0.4) 0%, rgba(255,255,0,0.2) 50%, transparent 100%)',
                filter: 'blur(25px)',
                pointerEvents: 'none',
                zIndex: -1
              }}
            />

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
              className="absolute top-2 right-4 text-yellow-400 hover:text-yellow-200 cursor-pointer w-8 h-8 rounded-full border border-yellow-400/80 flex items-center justify-center"
              style={{ 
                fontSize: '16px',
                boxShadow: '0 0 15px rgba(255,255,0,0.8), 0 0 25px rgba(255,255,0,0.5), 0 0 35px rgba(255,255,0,0.3)',
                textShadow: '0 0 8px rgba(255,255,0,0.8), 0 0 15px rgba(255,255,0,0.6)',
                background: 'rgba(255,255,0,0.1)',
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
                  }}
                  className="px-3 py-1 text-[10px] font-bold rounded border border-yellow-400/60 hover:border-yellow-400/80 transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,0,0.1)',
                    color: '#FFFF80',
                    textShadow: '0 0 4px rgba(255,255,128,0.8)',
                    boxShadow: '0 0 8px rgba(255,255,0,0.3)',
                  }}
                >
                  ← BACK TO CATEGORIES
                </button>
              )}
              <div 
                className="absolute left-1/2 transform -translate-x-1/2"
                style={{ 
                  color: '#FFFF00', 
                  textShadow: '0 0 8px rgba(255,255,0,0.6)', 
                  fontSize: '12px',
                  fontWeight: 'bold'
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
                background: 'linear-gradient(90deg, transparent, rgba(255,255,0,0.8) 20%, rgba(255,255,0,1) 50%, rgba(255,255,0,0.8) 80%, transparent)',
                boxShadow: '0 0 4px rgba(255,255,0,0.6)'
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
                      lineHeight: 1.2, 
                      fontSize: 9, 
                      color: '#FFFF00', 
                      textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(255,255,0,0.6)', 
                      marginTop: '-4px' 
                    }}
                  >
                    Choose a category to explore your badges and track your progress through the Heartverse.
                  </div>
                  
                  <div className="flex flex-col items-center justify-center gap-3 w-full">
                    {/* First row: Soul Star, Achievements, Elemental Streak */}
                    <div className="flex justify-center items-center gap-6">
                      {badgeCategories.slice(0, 3).map((category) => (
                        <div
                          key={category.id}
                          className="text-center cursor-pointer group flex-shrink-0"
                          onClick={() => {
                            try { sfx.play('click', 0.7); } catch {}
                            setSelectedCategory(category.id);
                          }}
                        >
                          <div 
                            className="w-20 h-20 rounded-full border-2 border-yellow-400/60 hover:border-yellow-400/80 relative overflow-hidden transition-all duration-300 group-hover:scale-105 flex items-center justify-center"
                            style={{
                              boxShadow: `0 0 15px ${category.color}40`,
                              background: `linear-gradient(135deg, ${category.color}20, rgba(252,84,175,0.1))`
                            }}
                          >
                            <div 
                              className="text-3xl"
                              style={{
                                filter: `drop-shadow(0 0 8px ${category.color})`
                              }}
                            >
                              {category.emoji}
                            </div>
                          </div>
                          
                          <div 
                            className="text-xs mt-1 font-bold"
                            style={{ 
                              color: category.color, 
                              textShadow: `0 0 4px ${category.color}80`,
                              fontSize: '10px'
                            }}
                          >
                            {category.name}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Second row: Listening, HeartCoin, Community */}
                    <div className="flex justify-center items-center gap-6">
                      {badgeCategories.slice(3, 6).map((category) => (
                        <div
                          key={category.id}
                          className="text-center cursor-pointer group flex-shrink-0"
                          onClick={() => {
                            try { sfx.play('click', 0.7); } catch {}
                            setSelectedCategory(category.id);
                          }}
                        >
                          <div 
                            className="w-20 h-20 rounded-full border-2 border-yellow-400/60 hover:border-yellow-400/80 relative overflow-hidden transition-all duration-300 group-hover:scale-105 flex items-center justify-center"
                            style={{
                              boxShadow: `0 0 15px ${category.color}40`,
                              background: `linear-gradient(135deg, ${category.color}20, rgba(252,84,175,0.1))`
                            }}
                          >
                            <div 
                              className="text-3xl"
                              style={{
                                filter: `drop-shadow(0 0 8px ${category.color})`
                              }}
                            >
                              {category.emoji}
                            </div>
                          </div>
                          
                          <div 
                            className="text-xs mt-1 font-bold"
                            style={{ 
                              color: category.color, 
                              textShadow: `0 0 4px ${category.color}80`,
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
                                }}
                                className="px-3 py-1 text-[10px] font-bold rounded border border-yellow-400/60 hover:border-yellow-400/80 transition-all duration-200"
                                style={{
                                  background: 'rgba(255,255,0,0.1)',
                                  color: '#FFFF80',
                                  textShadow: '0 0 4px rgba(255,255,128,0.8)',
                                  boxShadow: '0 0 8px rgba(255,255,0,0.3)',
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
                        <div className={`flex flex-wrap justify-center max-h-64 overflow-y-auto overflow-x-hidden p-2 ${category.id === 'heartcoin' ? 'gap-8' : 'gap-5'}`} style={{ scrollbarWidth: 'thin', marginTop: '-8px' }}>
                          {filterBadgesByElement(category.badges).map((badge, index) => (
                            <div key={index} className="flex flex-col items-center space-y-2">
                            <div className="relative">
                              <button
                                onClick={() => {
                                  try { sfx.play('click', 0.6); } catch {}
                                  setSelectedBadge(badge);
                                }}
                                className="relative w-12 h-12 rounded-full bg-black/60 border border-white/20 hover:border-white/40 transition-all duration-200 hover:scale-105 flex items-center justify-center group overflow-hidden"
                                title={badge.description ? `${badge.name}: ${badge.description}` : badge.name}
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
                                  <img
                                    src={badge.icon_url || `/elements/${getBadgeIcon(badge.name, category.id) === '❤️' ? 'heart' : getBadgeIcon(badge.name, category.id) === '💧' ? 'water' : getBadgeIcon(badge.name, category.id) === '⚡' ? 'lightning' : getBadgeIcon(badge.name, category.id) === '🌑' ? 'darkness' : 'heart'}.png`}
                                    alt={badge.name}
                                    className="w-full h-full object-cover"
                                    draggable={false}
                                  />
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
                              {badge.name}
                            </div>
                          </div>
                          ))}
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
                    className="absolute -left-8 top-0 px-3 py-1 text-[10px] font-bold rounded border border-yellow-400/60 hover:border-yellow-400/80 transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,0,0.1)',
                      color: '#FFFF80',
                      textShadow: '0 0 4px rgba(255,255,128,0.8)',
                      boxShadow: '0 0 8px rgba(255,255,0,0.3)',
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
                          alt={selectedBadge.name}
                          className="w-full h-full object-cover rounded-full"
                          style={{
                            opacity: isUnlocked(selectedBadge) ? 1 : 0.4
                          }}
                          draggable={false}
                        />
                      ) : (
                        <div className="relative z-10 text-lg opacity-60">
                          {getBadgeIcon(selectedBadge.name, selectedCategory || '')}
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
                      {selectedBadge.name}
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
