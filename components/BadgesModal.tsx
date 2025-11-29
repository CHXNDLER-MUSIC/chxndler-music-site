"use client";

import { useState } from "react";
import HeartversePopup from "@/components/HeartversePopup";
import { useProfile } from "@/contexts/ProfileContext";
import { useBadges } from "@/hooks/useBadges";

type BadgeCategory = {
  id: string;
  name: string;
  emoji: string;
  badges: Array<{
    name: string;
    description?: string;
    progress?: number; // 0-100 percentage
    total?: number; // total requirement for badge
    current?: number; // current progress
    icon_url?: string;
  }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  embedded?: boolean; // New prop to render without HeartversePopup wrapper
};

export default function BadgesModal({ open, onClose, embedded = false }: Props) {
  const { profile } = useProfile();
  const { badgeCategories, loading, error } = useBadges();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<{name: string; description?: string; progress?: number; current?: number; total?: number; icon_url?: string} | null>(null);

  // Fallback categories if Supabase data isn't available
  const fallbackCategories: BadgeCategory[] = [
    {
      id: "soul-star",
      name: "SOUL STAR",
      emoji: "⭐",
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
      emoji: "📄",
      badges: [
        { name: "First Listen", progress: 100, current: 1, total: 1, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/First%20Listen.png?updatedAt=1763736238402" },
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
      emoji: "⚡",
      badges: [
        { name: "❤️ HEART" },
        { name: "Ember Glow", description: "3 days", progress: 67, current: 2, total: 3, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Ember%20Glow.png?updatedAt=1763736238400" },
        { name: "Gentle Bloom", description: "7 days", progress: 29, current: 2, total: 7, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Gentle%20Bloom.png?updatedAt=1763736238445" },
        { name: "Warm Pulse", description: "14 days", progress: 14, current: 2, total: 14, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Warm%20PUlse.png?updatedAt=1763736238454" },
        { name: "Heart Radiance", description: "30 days", progress: 7, current: 2, total: 30 },
        { name: "Deep Devotion", description: "50 days", progress: 4, current: 2, total: 50 },
        { name: "Eternal Love", description: "100 days", progress: 2, current: 2, total: 100, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Eternal%20Love.png?updatedAt=1763736238429" },
        { name: "💧 WATER" },
        { name: "Rising Ripple", description: "3 days", progress: 0, current: 0, total: 3, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Rising%20Ripple.png?updatedAt=1763736238483" },
        { name: "Steady Flow", description: "7 days", progress: 0, current: 0, total: 7, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Steady%20Flow.png?updatedAt=1763736238439" },
        { name: "Shifting Tide", description: "14 days", progress: 0, current: 0, total: 14, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Shifting%20Tide.png?updatedAt=1763736238457" },
        { name: "Ocean Surge", description: "30 days", progress: 0, current: 0, total: 30, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Ocean%20Surge.png?updatedAt=1763736238406" },
        { name: "Silver Depth", description: "50 days", progress: 0, current: 0, total: 50 },
        { name: "Endless Drift", description: "100 days", progress: 0, current: 0, total: 100 },
        { name: "⚡ LIGHTNING" },
        { name: "First Spark", description: "3 days", progress: 0, current: 0, total: 3 },
        { name: "Bright Flash", description: "7 days", progress: 0, current: 0, total: 7 },
        { name: "Quick Charge", description: "14 days", progress: 0, current: 0, total: 14 },
        { name: "Raging Storm", description: "30 days", progress: 0, current: 0, total: 30 },
        { name: "Sky Ascend", description: "50 days", progress: 0, current: 0, total: 50, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Sky%20Ascend.png?updatedAt=1763736238480" },
        { name: "Ever Storm", description: "100 days", progress: 0, current: 0, total: 100 },
        { name: "🌑 DARKNESS" },
        { name: "Fading Shadow", description: "3 days", progress: 0, current: 0, total: 3, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Fading%20Shadow.png?updatedAt=1763736238459" },
        { name: "Silent Veil", description: "7 days", progress: 0, current: 0, total: 7, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Silent%20Vail.png?updatedAt=1763736238434" },
        { name: "Solar Eclipse", description: "14 days", progress: 0, current: 0, total: 14, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/Solar%20Eclipse.png?updatedAt=1763736514798" },
        { name: "Falling Dusk", description: "30 days", progress: 0, current: 0, total: 30 },
        { name: "Black Midnight", description: "50 days", progress: 0, current: 0, total: 50 },
        { name: "Ever Night", description: "100 days", progress: 0, current: 0, total: 100 },
      ]
    },
    {
      id: "listening",
      name: "LISTENING",
      emoji: "🎧",
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
      name: "HEART COIN",
      emoji: "💰",
      badges: [
        { name: "First HeartCoin", progress: 100, current: 1, total: 1, icon_url: "https://ik.imagekit.io/CHXNDLER/Badges/First%20HeartCoin.png?updatedAt=1763736238400" },
        { name: "Treasure Finder", description: "10 HC", progress: 50, current: 5, total: 10 },
        { name: "Heartflow", description: "50 HC", progress: 10, current: 5, total: 50 },
        { name: "Cosmic Prosperity", description: "100 HC", progress: 5, current: 5, total: 100 },
      ]
    },
    {
      id: "community",
      name: "COMMUNITY",
      emoji: "🌐",
      badges: [
        { name: "Portal Opener", description: "Invite 1 friend", progress: 0, current: 0, total: 1 },
        { name: "Constellation Builder", description: "Invite 5 friends", progress: 0, current: 0, total: 5 },
        { name: "Galactic Signal", description: "Invite 20 friends", progress: 0, current: 0, total: 20 },
        { name: "Starlight Supporter", description: "Follow on Spotify/Apple, TikTok, YouTube, IG", progress: 25, current: 1, total: 4 },
      ]
    }
  ];

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
              <div className={`relative z-10 transition-opacity ${selectedBadge.progress === 100 ? 'opacity-100' : 'opacity-60'}`}>
                {selectedBadge.icon_url ? (
                  <img
                    src={selectedBadge.icon_url}
                    alt={selectedBadge.name}
                    className="w-24 h-24 object-cover rounded-full"
                    draggable={false}
                  />
                ) : (
                  <div className="text-3xl">
                    {selectedBadge.name.includes('HEART') ? '❤️' : 
                     selectedBadge.name.includes('WATER') ? '💧' : 
                     selectedBadge.name.includes('LIGHTNING') ? '⚡' : 
                     selectedBadge.name.includes('DARKNESS') ? '🌑' :
                     selectedBadge.name.includes('Soul') ? '⭐' :
                     selectedBadge.name.includes('Listen') || selectedBadge.name.includes('Track') || selectedBadge.name.includes('Song') || selectedBadge.name.includes('Discography') ? '🎵' :
                     selectedBadge.name.includes('Collector') || selectedBadge.name.includes('Digital') || selectedBadge.name.includes('Cosmic') || selectedBadge.name.includes('Starbinder') || selectedBadge.name.includes('Master') ? '🏆' :
                     selectedBadge.name.includes('Live') || selectedBadge.name.includes('Stream') || selectedBadge.name.includes('Signal') || selectedBadge.name.includes('Broadcast') ? '📺' :
                     selectedBadge.name.includes('Merch') || selectedBadge.name.includes('Donor') ? '👕' :
                     selectedBadge.name.includes('Heart') && selectedBadge.name.includes('Coin') ? '💰' :
                     selectedBadge.name.includes('Portal') || selectedBadge.name.includes('Constellation') || selectedBadge.name.includes('Galactic') || selectedBadge.name.includes('Starlight') ? '🌐' :
                     '🏅'}
                  </div>
                )}
              </div>
              {/* Locked overlay */}
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-white/20 rounded-full" />
              </div>
            </div>
            
            {/* Badge name directly below PNG */}
            <h2 className="text-white font-bold text-lg text-center">
              {selectedBadge.name}
            </h2>
            
            {/* Status directly below badge name */}
            <div className={`text-sm ${
              selectedBadge.progress === 100 ? 'text-green-400' : 'text-white/40'
            }`}>
              {selectedBadge.progress === 100 ? '✅ UNLOCKED' : '🔒 LOCKED'}
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
              {/* Requirement */}
              {selectedBadge.description && (
                <div className="text-center">
                  <span className="text-white/80 text-sm font-medium">
                    {selectedBadge.description}
                  </span>
                </div>
              )}
              
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Progress</span>
                  <span className="text-white/70">{selectedBadge.current || 0} / {selectedBadge.total || 0}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      selectedBadge.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${selectedBadge.progress || 0}%` }}
                  />
                </div>
                <div className="text-center">
                  <span className={`text-sm font-bold ${
                    selectedBadge.progress === 100 ? 'text-green-400' : 'text-blue-400'
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
          {/* Close button for embedded mode */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-pink-400/60 flex items-center justify-center text-pink-400 hover:text-pink-200 transition-colors z-10"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Header for embedded mode */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white">BADGE DETAILS</h2>
          </div>

          {badgeDetailContent}
        </div>
      );
    }

    return (
      <div
        className="fixed inset-0 z-[2147483647] modal-no-drag flex items-center justify-center p-4"
        aria-modal="true"
        role="dialog"
        aria-label="BADGE DETAILS"
        style={{ touchAction: 'none', overscrollBehaviorX: 'none' }}
      >
        <div
          className="absolute inset-0 backdrop-blur-md"
          onClick={onClose}
        />
        <div className="relative w-full max-w-lg max-h-[90vh] z-[2147483648]">
          <div className="relative rounded-2xl p-4 backdrop-blur-md border border-pink-400/60 bg-black/60 shadow-[0_-8px_25px_rgba(255,105,180,0.4),_0_-4px_15px_rgba(255,105,180,0.25),_0_12px_30px_rgba(0,0,0,0.4),_0_0_24px_rgba(255,105,180,0.45)] overflow-y-auto">
            
            {/* Soft bottom glow */}
            <div 
              className="absolute"
              style={{
                bottom: '-15px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '120%',
                height: '30px',
                background: 'radial-gradient(ellipse 60% 100% at 50% 0%, #FF69B460 0%, #FF69B430 40%, transparent 80%)',
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
                background: 'radial-gradient(ellipse 70% 100% at 50% 100%, #FF69B440 0%, #FF69B420 50%, transparent 100%)',
                filter: 'blur(25px)',
                pointerEvents: 'none',
                zIndex: -1
              }}
            />

            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border text-lg font-bold transition-all duration-200 hover:scale-110 text-pink-400 border-pink-400/80"
              style={{
                background: '#FF69B410',
                backdropFilter: 'blur(2px)',
                boxShadow: '0 0 15px #FF69B480, 0 0 25px #FF69B450, 0 0 35px #FF69B430',
                textShadow: '0 0 8px #FF69B480, 0 0 15px #FF69B460'
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            <h2 className="relative text-xl font-bold tracking-wider text-white drop-shadow mb-1" style={{
              color: '#FF69B4',
              textShadow: '0 0 8px #FF69B460'
            }}>
              BADGE DETAILS
            </h2>
            
            <div className="relative">
              {badgeDetailContent}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedCategory) {
    const allCategories = badgeCategories.length > 0 ? badgeCategories : fallbackCategories;
    const category = allCategories.find(cat => cat.id === selectedCategory);
    if (!category) return null;
    
    const categoryContent = (
      <div className="relative space-y-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className="mb-4 text-[#38B6FF] hover:text-[#38B6FF]/80 transition text-sm"
          >
            ← Back to Categories
          </button>
          
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 sm:gap-4 max-h-80 sm:max-h-96 overflow-y-auto p-2">
            {category.badges.map((badge, index) => (
              <div key={index} className="flex flex-col items-center space-y-2">
                <div className="relative">
                  <button
                    onClick={() => setSelectedBadge(badge)}
                    className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 border border-white/20 hover:border-white/40 transition-all duration-200 hover:scale-105 flex items-center justify-center group overflow-hidden"
                    title={badge.description ? `${badge.name}: ${badge.description} (${badge.current || 0}/${badge.total || 0})` : badge.name}
                  >
                    {/* Progress ring for badges with progress */}
                    {badge.progress !== undefined && badge.progress < 100 && (
                      <div className="absolute inset-0">
                        <svg className="w-10 h-10 sm:w-12 sm:h-12 transform -rotate-90" viewBox="0 0 48 48">
                          {/* Background circle */}
                          <circle
                            cx="24"
                            cy="24"
                            r="22"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="2"
                          />
                          {/* Progress circle */}
                          <circle
                            cx="24"
                            cy="24"
                            r="22"
                            fill="none"
                            stroke={badge.progress === 100 ? "#10B981" : "#3B82F6"}
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
                    
                    {/* Badge content - icon image or emoji fallback */}
                    <div className={`relative z-10 transition-opacity ${badge.progress === 100 ? 'opacity-100' : 'opacity-40 group-hover:opacity-60'}`}>
                      {badge.icon_url ? (
                        <img
                          src={badge.icon_url}
                          alt={badge.name}
                          className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-full"
                          draggable={false}
                        />
                      ) : (
                        <div className="text-sm sm:text-lg">
                          {badge.name.includes('HEART') ? '❤️' : 
                           badge.name.includes('WATER') ? '💧' : 
                           badge.name.includes('LIGHTNING') ? '⚡' : 
                           badge.name.includes('DARKNESS') ? '🌑' :
                           badge.name.includes('Soul') ? '⭐' :
                           badge.name.includes('Listen') || badge.name.includes('Track') || badge.name.includes('Song') || badge.name.includes('Discography') ? '🎵' :
                           badge.name.includes('Collector') || badge.name.includes('Digital') || badge.name.includes('Cosmic') || badge.name.includes('Starbinder') || badge.name.includes('Master') ? '🏆' :
                           badge.name.includes('Live') || badge.name.includes('Stream') || badge.name.includes('Signal') || badge.name.includes('Broadcast') ? '📺' :
                           badge.name.includes('Merch') || badge.name.includes('Donor') ? '👕' :
                           badge.name.includes('Heart') && badge.name.includes('Coin') ? '💰' :
                           badge.name.includes('Portal') || badge.name.includes('Constellation') || badge.name.includes('Galactic') || badge.name.includes('Starlight') ? '🌐' :
                           '🏅'}
                        </div>
                      )}
                    </div>
                    
                    {/* Locked overlay - only show if not completed */}
                    {badge.progress !== 100 && (
                      <div className="absolute inset-1 bg-black/40 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white/20 rounded-full" />
                      </div>
                    )}
                  </button>
                  
                  {/* Progress percentage text - only for badges with progress > 0 and < 100 */}
                  {badge.progress !== undefined && badge.progress > 0 && badge.progress < 100 && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {badge.progress}%
                    </div>
                  )}
                  
                  {/* Completed checkmark */}
                  {badge.progress === 100 && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                </div>
                
                {/* Badge name below circle */}
                <div className="text-white/60 text-xs text-center max-w-12 sm:max-w-16 truncate">
                  {badge.name}
                </div>
              </div>
            ))}
          </div>
        </div>
    );

    if (embedded) {
      return (
        <div className="relative">
          {/* Close button for embedded mode */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-pink-400/60 flex items-center justify-center text-pink-400 hover:text-pink-200 transition-colors z-10"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Header for embedded mode */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white">{category.name}</h2>
          </div>

          {categoryContent}
        </div>
      );
    }

    return (
      <div
        className="fixed inset-0 z-[2147483647] modal-no-drag flex items-center justify-center p-4"
        aria-modal="true"
        role="dialog"
        aria-label={category.name}
        style={{ touchAction: 'none', overscrollBehaviorX: 'none' }}
      >
        <div
          className="absolute inset-0 backdrop-blur-md"
          onClick={onClose}
        />
        <div className="relative w-full max-w-lg max-h-[90vh] z-[2147483648]">
          <div className="relative rounded-2xl p-4 backdrop-blur-md border border-pink-400/60 bg-black/60 shadow-[0_-8px_25px_rgba(255,105,180,0.4),_0_-4px_15px_rgba(255,105,180,0.25),_0_12px_30px_rgba(0,0,0,0.4),_0_0_24px_rgba(255,105,180,0.45)] overflow-y-auto">
            
            {/* Soft bottom glow */}
            <div 
              className="absolute"
              style={{
                bottom: '-15px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '120%',
                height: '30px',
                background: 'radial-gradient(ellipse 60% 100% at 50% 0%, #FF69B460 0%, #FF69B430 40%, transparent 80%)',
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
                background: 'radial-gradient(ellipse 70% 100% at 50% 100%, #FF69B440 0%, #FF69B420 50%, transparent 100%)',
                filter: 'blur(25px)',
                pointerEvents: 'none',
                zIndex: -1
              }}
            />

            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border text-lg font-bold transition-all duration-200 hover:scale-110 text-pink-400 border-pink-400/80"
              style={{
                background: '#FF69B410',
                backdropFilter: 'blur(2px)',
                boxShadow: '0 0 15px #FF69B480, 0 0 25px #FF69B450, 0 0 35px #FF69B430',
                textShadow: '0 0 8px #FF69B480, 0 0 15px #FF69B460'
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            <h2 className="relative text-xl font-bold tracking-wider text-white drop-shadow mb-1" style={{
              color: '#FF69B4',
              textShadow: '0 0 8px #FF69B460'
            }}>
              {category.name}
            </h2>
            
            <div className="relative">
              {categoryContent}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render just the content when embedded
  const badgesContent = (
    <>
      {/* Close button for embedded mode */}
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

      {/* Header for embedded mode */}
      {embedded && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">BADGES</h2>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center text-white/60">
          Loading badges...
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center text-red-400 text-sm">
          Error loading badges: {error}
        </div>
      )}

      {/* Badge Categories Grid - 6 categories in 3x2 layout */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4 justify-items-center max-w-md mx-auto">
          {(badgeCategories.length > 0 ? badgeCategories : fallbackCategories).map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-yellow-400/60 hover:border-yellow-400 hover:scale-105 transition-all duration-200 text-center group flex flex-col items-center justify-center"
            style={{
              background: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(40,40,40,0.9) 100%)',
              boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)'
            }}
          >
            <div className="text-2xl sm:text-3xl mb-1">{category.emoji}</div>
            <div className="text-yellow-300 font-bold text-[10px] sm:text-xs group-hover:text-yellow-100 transition-colors px-1 leading-tight text-center">
              {category.name}
            </div>
          </button>
        ))}
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="relative">{badgesContent}</div>;
  }

  return (
    <div
      className="fixed inset-0 z-[2147483647] modal-no-drag flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-label="BADGES"
      style={{ touchAction: 'none', overscrollBehaviorX: 'none' }}
    >
      <div
        className="absolute inset-0 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[90vh] z-[2147483648]">
        <div className="relative rounded-2xl p-4 backdrop-blur-md border border-pink-400/60 bg-black/60 shadow-[0_-8px_25px_rgba(255,105,180,0.4),_0_-4px_15px_rgba(255,105,180,0.25),_0_12px_30px_rgba(0,0,0,0.4),_0_0_24px_rgba(255,105,180,0.45)] overflow-y-auto">
          
          {/* Soft bottom glow */}
          <div 
            className="absolute"
            style={{
              bottom: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120%',
              height: '30px',
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, #FF69B460 0%, #FF69B430 40%, transparent 80%)',
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
              background: 'radial-gradient(ellipse 70% 100% at 50% 100%, #FF69B440 0%, #FF69B420 50%, transparent 100%)',
              filter: 'blur(25px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border text-lg font-bold transition-all duration-200 hover:scale-110 text-pink-400 border-pink-400/80"
            style={{
              background: '#FF69B410',
              backdropFilter: 'blur(2px)',
              boxShadow: '0 0 15px #FF69B480, 0 0 25px #FF69B450, 0 0 35px #FF69B430',
              textShadow: '0 0 8px #FF69B480, 0 0 15px #FF69B460'
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>

          <h2 className="relative text-xl font-bold tracking-wider text-white drop-shadow mb-1" style={{
            color: '#FF69B4',
            textShadow: '0 0 8px #FF69B460'
          }}>
            BADGES
          </h2>
          
          <div className="relative">
            {badgesContent}
          </div>
        </div>
      </div>
    </div>
  );
}