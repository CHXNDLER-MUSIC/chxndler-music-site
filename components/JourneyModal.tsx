"use client";

import { useState } from "react";
import { sfx } from "@/lib/sfx";
import { useProfile } from "@/contexts/ProfileContext";

interface JourneyModalProps {
  open: boolean;
  onClose: () => void;
}

type TierType = 'wanderer' | 'dreamer' | 'lover';

interface TierData {
  name: string;
  color: string;
  glowColor: string;
  image: string;
  priceRange: string;
  backMessage: string;
  benefits: string[];
}

const tierData: Record<TierType, TierData> = {
  wanderer: {
    name: 'WANDERER',
    color: '#00FFFF',
    glowColor: 'rgba(0, 255, 255, 0.8)',
    image: '/elements/wanderer.png',
    priceRange: '0 - 4',
    backMessage: 'You have just arrived, drawn by the signal.',
    benefits: [
      '♡ Released songs',
      '♡ Digital CHXNDLER card',
      '♡ Entry into the Heartverse'
    ]
  },
  dreamer: {
    name: 'DREAMER', 
    color: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.8)',
    image: '/elements/dreamer.png',
    priceRange: '5 - 24',
    backMessage: 'You begin to awaken to the magic.',
    benefits: [
      '♡ Unreleased songs',
      '♡ Physical CHXNDLER cards',
      '♡ Exclusive merch'
    ]
  },
  lover: {
    name: 'LOVER',
    color: '#FF69B4',
    glowColor: 'rgba(255, 105, 180, 0.8)',
    image: '/elements/lover.png',
    priceRange: '25+',
    backMessage: 'The ones who feel the Heartverse inside them.',
    benefits: [
      '♡ Direct line to CHXNDLER',
      '♡ Exclusive concerts',
      '♡ Limited Edition Merch / CHXNDLER cards'
    ]
  }
};

function getUserTier(cumulativeHeartCoins: number): TierType {
  if (cumulativeHeartCoins >= 25) return 'lover';
  if (cumulativeHeartCoins >= 5) return 'dreamer';
  return 'wanderer';
}

export default function JourneyModal({ open, onClose }: JourneyModalProps) {
  const [flippedTier, setFlippedTier] = useState<TierType | null>(null);
  const { profile } = useProfile();
  
  const cumulativeHeartCoins = profile?.heartcoin_total || 0;
  const currentTier = getUserTier(cumulativeHeartCoins);

  const handleTierClick = (tier: TierType) => {
    try { sfx.play('click', 0.8); } catch {}
    setFlippedTier(flippedTier === tier ? null : tier);
  };

  const handleClose = () => {
    try { sfx.play('close', 0.8); } catch {}
    setFlippedTier(null);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Hologram base glow with tier color */}
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 2147483646,
          pointerEvents: 'none',
          paddingTop: '-300px'
        }}
      >
        <div
          style={{
            width: 'min(120vw, 700px)',
            height: '200px',
            background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${tierData[currentTier].glowColor} 0%, ${tierData[currentTier].glowColor.replace('0.8', '0.4')} 30%, ${tierData[currentTier].glowColor.replace('0.8', '0.1')} 60%, transparent 100%)`,
            filter: 'blur(100px)'
          }}
        />
      </div>
      
      <div 
        className="fixed inset-0 z-[2147483647] flex justify-center"
        style={{
          paddingTop: '20px'
        }}
        onClick={handleClose}
      >
        <div
          className="journey-container"
          style={{
            width: 'min(90vw, 700px)',
            height: '50vh',
            padding: '15px',
            borderRadius: 15,
            background: 'rgba(0,0,0,0.7)',
            border: `2px solid ${tierData[currentTier].color}`,
            backdropFilter: 'blur(15px)',
            position: 'relative',
            boxShadow: `0 -8px 25px ${tierData[currentTier].glowColor}, 0 -4px 15px ${tierData[currentTier].glowColor.replace('0.8', '0.6')}, 0 12px 30px rgba(0,0,0,0.4), 0 0 24px ${tierData[currentTier].glowColor}`
          }}
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Soft bottom glow pseudo element with tier color */}
        <div 
          className="absolute"
          style={{
            bottom: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120%',
            height: '30px',
            background: `radial-gradient(ellipse 60% 100% at 50% 0%, ${tierData[currentTier].glowColor} 0%, ${tierData[currentTier].glowColor.replace('0.8', '0.3')} 40%, transparent 80%)`,
            filter: 'blur(30px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />
        
        {/* Top bloom glow with tier color */}
        <div 
          className="absolute"
          style={{
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '20px',
            background: `radial-gradient(ellipse 70% 100% at 50% 100%, ${tierData[currentTier].glowColor.replace('0.8', '0.4')} 0%, ${tierData[currentTier].glowColor.replace('0.8', '0.2')} 50%, transparent 100%)`,
            filter: 'blur(25px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        {/* Close button with tier color */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 cursor-pointer w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{ 
            fontSize: '16px',
            background: `rgba(${tierData[currentTier].color === '#00FFFF' ? '0,255,255' : tierData[currentTier].color === '#FFD700' ? '255,215,0' : '255,105,180'},0.2)`,
            border: `1px solid ${tierData[currentTier].color}`,
            color: tierData[currentTier].color,
            boxShadow: `0 0 10px ${tierData[currentTier].glowColor.replace('0.8', '0.3')}`,
            backdropFilter: 'blur(2px)'
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        
        {/* Header with tier color */}
        <div className="text-center mb-4">
          <div 
            style={{ 
              color: tierData[currentTier].color, 
              fontSize: '20px',
              fontWeight: 'bold',
              textShadow: `0 0 12px ${tierData[currentTier].glowColor}, 0 0 20px ${tierData[currentTier].glowColor}, 0 0 30px ${tierData[currentTier].glowColor}`,
              marginBottom: '8px'
            }}
          >
            {tierData[currentTier].name.toUpperCase()}
          </div>
          <div 
            style={{ 
              color: '#FFFFFF', 
              fontSize: '14px',
              fontWeight: 'normal',
              textShadow: '0 0 8px rgba(255,255,255,0.6), 0 0 15px rgba(255,255,255,0.4)',
              opacity: 0.9
            }}
          >
            Choose the path that feels true to your heart right now.
          </div>
        </div>
        
        {/* Three Tier Buttons */}
        <div className="flex justify-center gap-6 h-4/5">
          {(Object.keys(tierData) as TierType[]).map((tier) => {
            const data = tierData[tier];
            const isFlipped = flippedTier === tier;
            
            return (
              <div
                key={tier}
                className="tier-card"
                style={{
                  width: '185px',
                  height: '100%',
                  perspective: '1000px',
                  cursor: 'pointer'
                }}
                onClick={() => handleTierClick(tier)}
              >
                <div
                  className="tier-card-inner"
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    textAlign: 'center',
                    transition: 'transform 0.8s',
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                >
                  {/* Front Face - Tier Name */}
                  <div
                    className="tier-card-front"
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      background: 'rgba(0,0,0,0.8)',
                      border: `2px solid ${data.color}`,
                      borderRadius: '15px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: data.color,
                      textShadow: `0 0 15px ${data.glowColor}`,
                      boxShadow: `0 0 30px ${data.glowColor}, inset 0 0 30px rgba(255,255,255,0.1)`,
                      transition: 'all 0.3s ease',
                      padding: '15px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isFlipped) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = `0 0 50px ${data.glowColor}, inset 0 0 50px rgba(255,255,255,0.2)`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isFlipped) {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = `0 0 30px ${data.glowColor}, inset 0 0 30px rgba(255,255,255,0.1)`;
                      }
                    }}
                  >
                    <img 
                      src={data.image}
                      alt={data.name}
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'contain',
                        marginBottom: '10px',
                        filter: `drop-shadow(0 0 15px ${data.glowColor})`
                      }}
                    />
                    {data.name}
                    <div 
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '8px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          color: data.color,
                          marginBottom: '6px',
                          textShadow: `0 0 15px ${data.glowColor}`,
                          fontWeight: 'bold'
                        }}
                      >
                        {data.priceRange}
                      </div>
                      <img 
                        src="/elements/heart-coin.png"
                        alt="Heart Coin"
                        style={{
                          width: '48px',
                          height: '48px',
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.9))'
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Back Face - Benefits */}
                  <div
                    className="tier-card-back"
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: 'rgba(0,0,0,0.9)',
                      border: `2px solid ${data.color}`,
                      borderRadius: '15px',
                      padding: '20px 15px 20px 15px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'flex-start',
                      boxShadow: `0 0 30px ${data.glowColor}, inset 0 0 30px rgba(255,255,255,0.1)`
                    }}
                  >
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: data.color,
                        textShadow: `0 0 6px ${data.glowColor}, 0 0 12px ${data.glowColor}`,
                        marginTop: '8px',
                        marginBottom: '15px',
                        textAlign: 'center',
                        width: '100%',
                        lineHeight: '1.3',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {data.backMessage}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#F0F8FF',
                        fontWeight: 'bold',
                        lineHeight: '1.3',
                        textAlign: 'left',
                        width: '100%',
                        textShadow: '0 0 4px rgba(240,248,255,1), 0 0 8px rgba(240,248,255,0.8)'
                      }}
                    >
                      {data.benefits.map((benefit, index) => (
                        <div key={index} style={{ marginBottom: '8px' }}>
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}