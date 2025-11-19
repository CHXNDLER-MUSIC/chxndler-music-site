"use client";

import { useState } from "react";
import { sfx } from "@/lib/sfx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
};

type TierType = 'wanderer' | 'dreamer' | 'lover';

interface TierData {
  name: string;
  color: string;
  glowColor: string;
  image: string;
  priceRange: string;
  benefits: string[];
}

const tierData: Record<TierType, TierData> = {
  wanderer: {
    name: 'WANDERER',
    color: '#00FFFF',
    glowColor: 'rgba(0, 255, 255, 0.8)',
    image: '/elements/wanderer.png',
    priceRange: '0 - 4',
    benefits: [
      '• Early access to new releases',
      '• Exclusive behind-the-scenes content',
      '• Community forum access',
      '• Monthly newsletter updates'
    ]
  },
  dreamer: {
    name: 'DREAMER', 
    color: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.8)',
    image: '/elements/dreamer.png',
    priceRange: '5 - 24',
    benefits: [
      '• Everything in Wanderer',
      '• Private Discord channels',
      '• Exclusive remix stems',
      '• Virtual meet & greet sessions',
      '• Limited edition merchandise'
    ]
  },
  lover: {
    name: 'LOVER',
    color: '#FF69B4',
    glowColor: 'rgba(255, 105, 180, 0.8)',
    image: '/elements/lover.png',
    priceRange: '25+',
    benefits: [
      '• Everything in Dreamer',
      '• One-on-one studio sessions',
      '• Personal song dedications',
      '• VIP concert experiences',
      '• Co-creation opportunities',
      '• Direct artist communication'
    ]
  }
};

export default function JourneyButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, onOpenBlueDisplay, ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const [flippedTier, setFlippedTier] = useState<TierType | null>(null);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    try { onClick?.(e); } catch {}
    if (!e.defaultPrevented) {
      e.preventDefault();
      try { sfx.play('click', 0.8); } catch {}
      try { onCloseBlueDisplay?.(); } catch {}
      setOpen(true);
    }
  };

  const handleTierClick = (tier: TierType) => {
    try { sfx.play('click', 0.8); } catch {}
    setFlippedTier(flippedTier === tier ? null : tier);
  };

  return (
    <>
      <button
        onClick={handleClick} 
        onMouseEnter={onHoverSound}
        className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-400/60 hover:border-cyan-300/80 text-cyan-300 hover:text-cyan-200 rounded-lg font-medium transition-all duration-200"
        style={{
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 255, 255, 0.2)',
          fontSize: '12px',
          textShadow: '0 0 8px rgba(0, 255, 255, 0.8), 0 0 15px rgba(0, 255, 255, 0.6)',
          transition: 'all 0.3s ease',
          ...rest.style
        }}
        onMouseEnter={(e) => {
          if (onHoverSound) onHoverSound();
          e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.8), 0 0 50px rgba(0, 255, 255, 0.5), 0 0 70px rgba(0, 255, 255, 0.3)';
          e.currentTarget.style.textShadow = '0 0 12px rgba(0, 255, 255, 1), 0 0 20px rgba(0, 255, 255, 0.8), 0 0 30px rgba(0, 255, 255, 0.6)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 255, 255, 0.2)';
          e.currentTarget.style.textShadow = '0 0 8px rgba(0, 255, 255, 0.8), 0 0 15px rgba(0, 255, 255, 0.6)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        {...rest}
      >
        JRN
      </button>
      
      {/* Journey Modal - Three Tiers */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          style={{
            paddingTop: '150px',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(5px)'
          }}
        >
          <div
            className="journey-container"
            style={{
              width: 'min(90vw, 700px)',
              height: '50vh',
              padding: '15px',
              borderRadius: 15,
              background: 'rgba(0,0,0,0.7)',
              border: '2px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(15px)',
              position: 'relative'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => {
                try { sfx.play('close', 0.8); } catch {}
                setOpen(false);
                setFlippedTier(null);
                try { onOpenBlueDisplay?.(); } catch {}
              }}
              className="absolute top-4 right-4 text-white hover:text-gray-300 cursor-pointer w-8 h-8 rounded-full border border-white/40 flex items-center justify-center"
              style={{ 
                fontSize: '16px',
                background: 'rgba(255,255,255,0.1)',
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
              className="text-center mb-4"
              style={{ 
                color: '#FFFFFF', 
                fontSize: '20px',
                fontWeight: 'bold',
                textShadow: '0 0 10px rgba(255,255,255,0.8)'
              }}
            >
              CHOOSE YOUR JOURNEY
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
                      width: '160px',
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
                              fontSize: tier === 'wanderer' ? '16px' : '12px',
                              color: tier === 'wanderer' ? data.color : '#FFFFFF',
                              marginBottom: '6px',
                              textShadow: tier === 'wanderer' ? `0 0 15px ${data.glowColor}` : 'none'
                            }}
                          >
                            <img 
                              src="/elements/heart-coin.png"
                              alt="Heart Coin"
                              style={{
                                width: '16px',
                                height: '16px',
                                objectFit: 'contain',
                                marginRight: '4px',
                                filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.8))'
                              }}
                            />
                            {data.priceRange}
                          </div>
                          <img 
                            src="/elements/heart-coin.png"
                            alt="Heart Coin"
                            style={{
                              width: '32px',
                              height: '32px',
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
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-start',
                          alignItems: 'flex-start',
                          boxShadow: `0 0 30px ${data.glowColor}, inset 0 0 30px rgba(255,255,255,0.1)`
                        }}
                      >
                        <div
                          style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: data.color,
                            textShadow: `0 0 10px ${data.glowColor}`,
                            marginBottom: '15px',
                            textAlign: 'center',
                            width: '100%'
                          }}
                        >
                          {data.name}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#FFFFFF',
                            lineHeight: '1.4',
                            textAlign: 'left',
                            width: '100%'
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
      )}
    </>
  );
}