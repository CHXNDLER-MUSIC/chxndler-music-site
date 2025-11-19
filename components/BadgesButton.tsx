"use client";

import { useState, useEffect } from "react";
import HeartverseButton from "@/components/HeartverseButton";
import { sfx } from "@/lib/sfx";
import { Badge, getAllBadges, getRarityColor, getRarityGlow, achievementBadges, streakBadges, elementBadges } from "@/lib/badges";
import { loadUserProgress, updateStreak, UserProgress } from "@/lib/userProgress";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
  onBeamColorChange?: (color: string) => void;
};

export default function BadgesButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, onOpenBlueDisplay, onBeamColorChange, ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    // Load user progress and update streak
    const progress = loadUserProgress();
    const { updatedProgress, newBadges, streakBroken } = updateStreak(progress);
    setUserProgress(updatedProgress);
    
    // Load all badges and mark unlocked ones
    const allBadges = getAllBadges();
    const updatedBadges = allBadges.map(badge => {
      let unlocked = false;
      
      // Check achievement badges
      if (badge.category === 'achievement' && badge.achievementType) {
        unlocked = updatedProgress.achievements[badge.achievementType];
      }
      
      // Check streak badges
      if (badge.category === 'streak' && badge.streakDays) {
        unlocked = updatedProgress.currentStreak >= badge.streakDays;
      }
      
      // Check element-specific streak badges
      if (badge.category === 'element_streak' && badge.streakDays && badge.element === updatedProgress.element) {
        unlocked = updatedProgress.currentStreak >= badge.streakDays;
      }
      
      return {
        ...badge,
        unlocked
      };
    });
    
    setBadges(updatedBadges);
  }, []);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    try { onClick?.(e); } catch {}
    if (!e.defaultPrevented) {
      e.preventDefault();
      try { sfx.play('click', 0.8); } catch {}
      // Trigger yellow light beam
      try { onBeamColorChange?.('yellow'); } catch {}
      // Close blue display first
      try { onCloseBlueDisplay?.(); } catch {}
      setOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick} 
        onMouseEnter={onHoverSound}
        className="bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/40 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20 w-14 h-12"
        style={{
          boxShadow: '0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)',
          transition: 'all 0.3s ease',
          ...rest.style
        }}
        onMouseEnter={(e) => {
          if (onHoverSound) onHoverSound();
          e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.8), 0 0 50px rgba(255, 215, 0, 0.5), 0 0 70px rgba(255, 215, 0, 0.3)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        {...rest}
      >
        <img
          src="/elements/badges.png"
          alt="Badges"
          className="w-full h-full object-cover rounded"
          draggable={false}
        />
      </button>
      
      {/* Hologram base glow - wider and stronger */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483646] flex items-center justify-center"
          style={{
            pointerEvents: 'none',
            paddingTop: '400px'
          }}
        >
          <div
            style={{
              width: 'min(120vw, 700px)',
              height: '200px',
              background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(255,215,0,0.7) 0%, rgba(255,215,0,0.4) 30%, rgba(255,215,0,0.1) 60%, transparent 100%)',
              filter: 'blur(100px)'
            }}
          />
        </div>
      )}
      
      {/* Badges Modal - holographic popup */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          style={{
            paddingTop: '300px'
          }}
        >
          <div
            className="badges-hologram-container"
            style={{
              width: 'min(92vw, 700px)',
              height: '35vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,215,0,0.55)',
              boxShadow: '0 -8px 25px rgba(255,215,0,0.4), 0 -4px 15px rgba(255,215,0,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,215,0,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#FFD700',
              position: 'relative'
            }}
        >
          {/* Soft bottom glow pseudo element */}
          <div 
            className="absolute"
            style={{
              bottom: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120%',
              height: '30px',
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,215,0,0.6) 0%, rgba(255,215,0,0.3) 40%, transparent 80%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          
          {/* Top bloom glow - simulates hologram light rising through panel */}
          <div 
            className="absolute"
            style={{
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '20px',
              background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(255,215,0,0.4) 0%, rgba(255,215,0,0.2) 50%, transparent 100%)',
              filter: 'blur(25px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          {/* Close button */}
          <button
            onClick={() => {
              try { sfx.play('close', 0.8); } catch {}
              setOpen(false);
              // Show blue display when closing badges popup
              try { onOpenBlueDisplay?.(); } catch {}
            }}
            className="absolute top-2 right-4 text-yellow-400 hover:text-yellow-200 cursor-pointer w-8 h-8 rounded-full border border-yellow-400/80 flex items-center justify-center"
            style={{ 
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(255,215,0,0.8), 0 0 25px rgba(255,215,0,0.5), 0 0 35px rgba(255,215,0,0.3)',
              textShadow: '0 0 8px rgba(255,215,0,0.8), 0 0 15px rgba(255,215,0,0.6)',
              background: 'rgba(255,215,0,0.1)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          
          {/* Header */}
          <div 
            className="text-center mb-3"
            style={{ 
              color: '#FFD700', 
              textShadow: '0 0 8px rgba(255,215,0,0.6)', 
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            COLLECT BADGES FROM THE HEARTVERSE
          </div>
          
          {/* Current streak info */}
          {userProgress && (
            <div 
              className="text-center mb-2"
              style={{ 
                color: '#FFD700', 
                fontSize: '12px',
                textShadow: '0 0 4px rgba(255,215,0,0.5)' 
              }}
            >
              CURRENT STREAK: {userProgress.currentStreak} DAYS | ELEMENT: {userProgress.element.toUpperCase()} | UNLOCKED: {badges.filter(b => b.unlocked).length}/{badges.length}
            </div>
          )}
          
          {/* Thin yellow neon line */}
          <div 
            className="w-full h-px mb-4"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.8) 20%, rgba(255,215,0,1) 50%, rgba(255,215,0,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(255,215,0,0.6)'
            }}
          />

          {/* Badges Display */}
          <div className="relative mt-1 max-h-40 overflow-y-auto">
            {/* Achievement Badges */}
            {achievementBadges.length > 0 && (
              <>
                <div 
                  className="text-xs mb-2"
                  style={{ 
                    color: '#FFD700', 
                    textShadow: '0 0 4px rgba(255,215,0,0.6)',
                    textAlign: 'center'
                  }}
                >
                  ACHIEVEMENTS
                </div>
                <div className="grid grid-cols-6 gap-2 mb-4">
                  {achievementBadges.slice(0, 6).map((badge) => (
                    <div key={badge.id} className="text-center">
                      <div 
                        className="w-12 h-12 mx-auto mb-1 rounded-full border flex items-center justify-center"
                        style={{
                          borderColor: badge.unlocked ? getRarityColor(badge.rarity) : 'rgba(128,128,128,0.3)',
                          background: badge.unlocked ? getRarityGlow(badge.rarity) : 'rgba(128,128,128,0.1)',
                          boxShadow: badge.unlocked ? `0 0 12px ${getRarityGlow(badge.rarity)}` : '0 0 6px rgba(128,128,128,0.2)',
                        }}
                        title={`${badge.name}: ${badge.description}`}
                      >
                        <span style={{ 
                          fontSize: '16px', 
                          opacity: badge.unlocked ? 1 : 0.4,
                          filter: badge.unlocked ? 'none' : 'grayscale(100%)'
                        }}>
                          {badge.emoji}
                        </span>
                      </div>
                      <div 
                        className="text-xs"
                        style={{ 
                          color: badge.unlocked ? '#FFFFFF' : '#666', 
                          textShadow: badge.unlocked ? '0 0 3px rgba(255,255,255,0.5)' : 'none',
                          fontSize: '8px'
                        }}
                      >
                        {badge.name.split(' ').slice(0, 2).join(' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {/* Streak Badges */}
            {userProgress && (
              <>
                <div 
                  className="text-xs mb-2"
                  style={{ 
                    color: '#FFD700', 
                    textShadow: '0 0 4px rgba(255,215,0,0.6)',
                    textAlign: 'center'
                  }}
                >
                  GENERAL STREAKS
                </div>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {streakBadges.map((badge) => {
                    const unlocked = userProgress.currentStreak >= (badge.streakDays || 0);
                    return (
                      <div key={badge.id} className="text-center">
                        <div 
                          className="w-12 h-12 mx-auto mb-1 rounded-full border flex items-center justify-center"
                          style={{
                            borderColor: unlocked ? getRarityColor(badge.rarity) : 'rgba(128,128,128,0.3)',
                            background: unlocked ? getRarityGlow(badge.rarity) : 'rgba(128,128,128,0.1)',
                            boxShadow: unlocked ? `0 0 12px ${getRarityGlow(badge.rarity)}` : '0 0 6px rgba(128,128,128,0.2)',
                          }}
                          title={`${badge.name}: ${badge.description}`}
                        >
                          <span style={{ 
                            fontSize: '16px', 
                            opacity: unlocked ? 1 : 0.4,
                            filter: unlocked ? 'none' : 'grayscale(100%)'
                          }}>
                            {badge.emoji}
                          </span>
                        </div>
                        <div 
                          className="text-xs"
                          style={{ 
                            color: unlocked ? '#FFFFFF' : '#666', 
                            textShadow: unlocked ? '0 0 3px rgba(255,255,255,0.5)' : 'none',
                            fontSize: '8px'
                          }}
                        >
                          {badge.streakDays}D
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Element Badges */}
                <div 
                  className="text-xs mb-2"
                  style={{ 
                    color: '#FFD700', 
                    textShadow: '0 0 4px rgba(255,215,0,0.6)',
                    textAlign: 'center'
                  }}
                >
                  {userProgress.element.toUpperCase()} ELEMENT STREAKS
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {elementBadges[userProgress.element]?.slice(0, 12).map((badge) => {
                    const unlocked = userProgress.currentStreak >= (badge.streakDays || 0);
                    return (
                      <div key={badge.id} className="text-center">
                        <div 
                          className="w-10 h-10 mx-auto mb-1 rounded-full border flex items-center justify-center"
                          style={{
                            borderColor: unlocked ? getRarityColor(badge.rarity) : 'rgba(128,128,128,0.3)',
                            background: unlocked ? getRarityGlow(badge.rarity) : 'rgba(128,128,128,0.1)',
                            boxShadow: unlocked ? `0 0 10px ${getRarityGlow(badge.rarity)}` : '0 0 4px rgba(128,128,128,0.2)',
                          }}
                          title={`${badge.name}: ${badge.description} (${badge.streakDays} days)`}
                        >
                          <span style={{ 
                            fontSize: '12px', 
                            opacity: unlocked ? 1 : 0.4,
                            filter: unlocked ? 'none' : 'grayscale(100%)'
                          }}>
                            {badge.emoji}
                          </span>
                        </div>
                        <div 
                          className="text-xs"
                          style={{ 
                            color: unlocked ? '#FFFFFF' : '#666', 
                            textShadow: unlocked ? '0 0 3px rgba(255,255,255,0.5)' : 'none',
                            fontSize: '7px'
                          }}
                        >
                          {badge.streakDays}D
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      )}
    </>
  );
}