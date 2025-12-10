"use client";

import { useState } from "react";
import { sfx } from "@/lib/sfx";
import { useProfile } from "@/contexts/ProfileContext";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  // External control for the chxndler popout
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Function to open welcome home modal
  onOpenWelcomeHome?: () => void;
};

export default function ChxndlerButton({ open: externalOpen, onOpenChange, onOpenWelcomeHome, ...restProps }: Props) {
  const { user, profile } = useProfile();
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"WE BELIEVE" | "CHXNDLER" | "ELEMENTS">("WE BELIEVE");
  const [flippedElements, setFlippedElements] = useState<Record<string, boolean>>({});
  
  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;

  const handleElementClick = (elementKey: string) => {
    try { 
      sfx.play('flip', 0.8); 
    } catch {}
    setFlippedElements(prev => ({
      ...prev,
      [elementKey]: !prev[elementKey]
    }));
  };

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (!e.defaultPrevented) {
      e.preventDefault();
      try { sfx.play('click', 0.8); } catch {}
      
      // Use external callback if provided, otherwise use internal state
      if (onOpenChange) {
        onOpenChange(true);
      } else {
        setInternalOpen(true);
      }
    }
  };

  return (
    <>
      <button
        onClick={handleClick} 
        className="p-1 rounded-lg transition-all duration-200 w-14 h-12"
        style={{
          transition: 'all 0.3s ease',
          ...restProps.style
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          const span = e.currentTarget.querySelector('span');
          if (span) {
            span.style.color = '#FFFFFF';
            span.style.filter = 'brightness(2)';
            span.style.textShadow = '0 0 15px rgba(255, 255, 255, 1), 0 0 30px rgba(255, 255, 255, 0.8)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          const span = e.currentTarget.querySelector('span');
          if (span) {
            span.style.color = '#FFFFFF';
            span.style.filter = 'brightness(1)';
            span.style.textShadow = 'none';
          }
        }}
        {...restProps}
      >
        <span 
          className="font-bold text-sm"
          style={{
            color: '#FFFFFF !important'
          }}
        >
          CHXNDLER
        </span>
      </button>
      
      {/* CHXNDLER Modal - holographic popup with image */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4"
          style={{ 
            alignItems: 'center', 
            transform: 'translateY(-130px)',
            cursor: 'none'
          }}
        >
          <div
            className="chxndler-hologram-container relative"
            style={{
              width: 'min(92vw, 800px)',
              minHeight: '380px',
              padding: '20px 20px 6px 20px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.8)',
              border: '1px solid rgba(252,84,175,0.6)',
              boxShadow: '0 -8px 25px rgba(252,84,175,0.4), 0 -4px 15px rgba(252,84,175,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(252,84,175,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              cursor: 'none'
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
                background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(252,84,175,0.6) 0%, rgba(252,84,175,0.3) 40%, transparent 80%)',
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
                background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(252,84,175,0.4) 0%, rgba(252,84,175,0.2) 50%, transparent 100%)',
                filter: 'blur(25px)',
                pointerEvents: 'none',
                zIndex: -1
              }}
            />

            {/* Close button */}
            <button
              onClick={() => {
                try { sfx.play('close', 0.8); } catch {}
                if (onOpenChange) {
                  onOpenChange(false);
                } else {
                  setInternalOpen(false);
                }
              }}
              className="absolute top-2 right-4 text-pink-400 hover:text-pink-200 w-8 h-8 rounded-full border border-pink-400/80 flex items-center justify-center"
              style={{ 
                fontSize: '16px',
                boxShadow: '0 0 15px rgba(252,84,175,0.8), 0 0 25px rgba(252,84,175,0.5), 0 0 35px rgba(252,84,175,0.3)',
                textShadow: '0 0 8px rgba(252,84,175,0.8), 0 0 15px rgba(252,84,175,0.6)',
                background: 'rgba(252,84,175,0.1)',
                backdropFilter: 'blur(2px)',
                cursor: 'none'
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
                color: '#FFFFFF !important', 
                textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7), 0 0 20px rgba(255,255,255,0.5)', 
                fontSize: '20px',
                fontWeight: 'bold',
                marginTop: '-8px'
              }}
            >
              ABOUT
            </div>
            
            {/* Tabs */}
            <div className="flex justify-center mb-1" style={{ marginTop: '-4px' }}>
              <div className="flex rounded-lg p-1 gap-2">
                <button
                  onClick={() => {
                    sfx.play('click', 0.7);
                    setActiveTab("WE BELIEVE");
                  }}
                  className={`px-4 py-2 rounded-md text-base font-semibold transition-all duration-200 border ${
                    activeTab === "WE BELIEVE"
                      ? "bg-pink-500/30 text-pink-200 border-pink-400/70"
                      : "bg-black/20 text-white/70 hover:text-white border-white/30 hover:border-white/50"
                  }`}
                  style={{
                    textShadow: activeTab === "WE BELIEVE" ? '0 0 8px rgba(252,84,175,0.8)' : 'none',
                    boxShadow: activeTab === "WE BELIEVE" ? '0 0 20px rgba(252,84,175,0.4), inset 0 0 20px rgba(252,84,175,0.1)' : 'none',
                    cursor: 'none'
                  }}
                >
                  WE BELIEVE
                </button>
                <button
                  onClick={() => {
                    sfx.play('click', 0.7);
                    setActiveTab("CHXNDLER");
                  }}
                  className={`px-4 py-2 rounded-md text-base font-semibold transition-all duration-200 border ${
                    activeTab === "CHXNDLER"
                      ? "bg-pink-500/30 text-pink-200 border-pink-400/70"
                      : "bg-black/20 text-white/70 hover:text-white border-white/30 hover:border-white/50"
                  }`}
                  style={{
                    textShadow: activeTab === "CHXNDLER" ? '0 0 8px rgba(252,84,175,0.8)' : 'none',
                    boxShadow: activeTab === "CHXNDLER" ? '0 0 20px rgba(252,84,175,0.4), inset 0 0 20px rgba(252,84,175,0.1)' : 'none',
                    cursor: 'none'
                  }}
                >
                  CHXNDLER
                </button>
                <button
                  onClick={() => {
                    sfx.play('click', 0.7);
                    setActiveTab("ELEMENTS");
                  }}
                  className={`px-4 py-2 rounded-md text-base font-semibold transition-all duration-200 border ${
                    activeTab === "ELEMENTS"
                      ? "bg-pink-500/30 text-pink-200 border-pink-400/70"
                      : "bg-black/20 text-white/70 hover:text-white border-white/30 hover:border-white/50"
                  }`}
                  style={{
                    textShadow: activeTab === "ELEMENTS" ? '0 0 8px rgba(252,84,175,0.8)' : 'none',
                    boxShadow: activeTab === "ELEMENTS" ? '0 0 20px rgba(252,84,175,0.4), inset 0 0 20px rgba(252,84,175,0.1)' : 'none',
                    cursor: 'none'
                  }}
                >
                  ELEMENTS
                </button>
              </div>
            </div>
            
            {/* Pink neon line */}
            <div 
              className="w-full h-px mb-0"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(252,84,175,0.8) 20%, rgba(252,84,175,1) 50%, rgba(252,84,175,0.8) 80%, transparent)',
                boxShadow: '0 0 4px rgba(252,84,175,0.6)'
              }}
            />

            {/* Tab Content */}
            {activeTab === "CHXNDLER" && (
              <>
                {/* Description */}
                <div 
                  className="text-center mt-4"
                  style={{ 
                    fontSize: '18px', 
                    color: '#FFFFFF !important', 
                    textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)', 
                    lineHeight: '1.6'
                  }}
                >
                  CHXNDLER is an alien from the Heartverse, exploring Earth in search of love. They create dreamy electronic pop to understand what it means to be human. Their music becomes a signal carried through the cosmos, guiding wanderers, dreamers, and lovers toward a place to call home.
                </div>
              </>
            )}

            {activeTab === "WE BELIEVE" && (
              <>
                {/* We Believe Content */}
                <div 
                  className="text-left space-y-2 pl-2"
                  style={{ 
                    fontSize: 20, 
                    color: '#FFFFFF !important', 
                    textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)',
                    marginTop: '16px'
                  }}
                >
                  <div className="flex items-start">
                    <span className="mr-3" style={{ color: '#00BFFF !important', textShadow: '0 0 8px rgba(0,191,255,0.9), 0 0 15px rgba(0,191,255,0.7)' }}>♥</span>
                    <span>We believe being your <span style={{ color: '#00E5FF !important', fontWeight: 'bold !important', textShadow: '0 0 10px #00E5FF, 0 0 20px #00E5FF, 0 0 30px #00E5FF', filter: 'brightness(1.8) saturate(1.8)' }}>truest self</span> is the beginning of freedom.</span>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-3" style={{ color: '#FFFF00 !important', textShadow: '0 0 8px rgba(255,255,0,0.9), 0 0 15px rgba(255,255,0,0.7)' }}>♥</span>
                    <span>We believe <span style={{ color: '#FFFF00 !important', fontWeight: 'inherit !important', textShadow: '0 0 10px #FFFF00, 0 0 20px #FFFF00, 0 0 30px #FFFF00', filter: 'brightness(1.8) saturate(2.0)' }}>passion</span> is sacred and should be pursued loudly.</span>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-3" style={{ color: '#FF1493 !important', textShadow: '0 0 8px rgba(255,20,147,0.9), 0 0 15px rgba(255,20,147,0.7)' }}>♥</span>
                    <span>We believe <span style={{ color: '#FF1493 !important', fontWeight: 'inherit !important', textShadow: '0 0 10px #FF1493, 0 0 20px #FF1493, 0 0 30px #FF1493', filter: 'brightness(1.8) saturate(2.0)' }}>love</span> is the force that connects every soul.</span>
                  </div>
                </div>
              </>
            )}

            {activeTab === "ELEMENTS" && (
              <>
                {/* Elements Content */}
                <div 
                  className="text-center mt-2"
                  style={{ 
                    fontSize: '16px', 
                    color: '#FFFFFF !important', 
                    textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)', 
                    lineHeight: '1.6'
                  }}
                >
                  The Elements shape the Heartverse. Each one carries its own energy, guiding souls on their journey.
                </div>
                <div 
                  className="flex justify-center mt-1"
                  style={{ 
                    fontSize: '16px', 
                    color: '#FFFFFF !important', 
                    textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)', 
                    lineHeight: '1.6'
                  }}
                >
                  <div className="grid grid-cols-2 gap-0">
                    <button 
                      onClick={() => handleElementClick('lightning')}
                      className="border-2 transition-all duration-200 hover:scale-105 flex items-center justify-center" 
                      style={{ 
                        borderColor: '#FFFF00', 
                        backgroundColor: 'rgba(255, 255, 0, 0.1)', 
                        boxShadow: '0 0 15px rgba(255, 255, 0, 0.3)',
                        borderRadius: '8px 0 0 0',
                        cursor: 'none',
                        width: '120px',
                        height: '60px',
                        padding: '8px',
                        fontSize: '14px'
                      }}
                    >
                      {flippedElements.lightning ? (
                        <span style={{ color: '#FFFF00 !important', fontWeight: 'bold !important', textShadow: '0 0 10px #FFFF00, 0 0 20px #FFFF00', textAlign: 'center', lineHeight: '1.2' }}>
                          LIGHTNING awakens.
                        </span>
                      ) : (
                        <img src="/elements/lightning.webp" alt="Lightning" className="w-10 h-10" />
                      )}
                    </button>
                    <button 
                      onClick={() => handleElementClick('heart')}
                      className="border-2 transition-all duration-200 hover:scale-105 flex items-center justify-center" 
                      style={{ 
                        borderColor: '#FF1493', 
                        backgroundColor: 'rgba(255, 20, 147, 0.1)', 
                        boxShadow: '0 0 15px rgba(255, 20, 147, 0.3)',
                        borderRadius: '0 8px 0 0',
                        cursor: 'none',
                        width: '120px',
                        height: '60px',
                        padding: '8px',
                        fontSize: '14px'
                      }}
                    >
                      {flippedElements.heart ? (
                        <span style={{ color: '#FF1493 !important', fontWeight: 'bold !important', textShadow: '0 0 10px #FF1493, 0 0 20px #FF1493', textAlign: 'center', lineHeight: '1.2' }}>
                          HEART connects.
                        </span>
                      ) : (
                        <img src="/elements/heart.webp" alt="Heart" className="w-10 h-10" />
                      )}
                    </button>
                    <button 
                      onClick={() => handleElementClick('darkness')}
                      className="border-2 transition-all duration-200 hover:scale-105 flex items-center justify-center" 
                      style={{ 
                        borderColor: '#9A00FF', 
                        backgroundColor: 'rgba(154, 0, 255, 0.1)', 
                        boxShadow: '0 0 15px rgba(154, 0, 255, 0.3)',
                        borderRadius: '0 0 0 8px',
                        cursor: 'none',
                        width: '120px',
                        height: '60px',
                        padding: '8px',
                        fontSize: '14px'
                      }}
                    >
                      {flippedElements.darkness ? (
                        <span style={{ color: '#9A00FF !important', fontWeight: 'bold !important', textShadow: '0 0 10px #9A00FF, 0 0 20px #9A00FF', textAlign: 'center', lineHeight: '1.2' }}>
                          DARKNESS transforms.
                        </span>
                      ) : (
                        <img src="/elements/darkness.webp" alt="Darkness" className="w-10 h-10" />
                      )}
                    </button>
                    <button 
                      onClick={() => handleElementClick('water')}
                      className="border-2 transition-all duration-200 hover:scale-105 flex items-center justify-center" 
                      style={{ 
                        borderColor: '#00E5FF', 
                        backgroundColor: 'rgba(0, 229, 255, 0.1)', 
                        boxShadow: '0 0 15px rgba(0, 229, 255, 0.3)',
                        borderRadius: '0 0 8px 0',
                        cursor: 'none',
                        width: '120px',
                        height: '60px',
                        padding: '8px',
                        fontSize: '14px'
                      }}
                    >
                      {flippedElements.water ? (
                        <span style={{ color: '#00E5FF !important', fontWeight: 'bold !important', textShadow: '0 0 10px #00E5FF, 0 0 20px #00E5FF', textAlign: 'center', lineHeight: '1.2' }}>
                          WATER heals.
                        </span>
                      ) : (
                        <img src="/elements/water.webp" alt="Water" className="w-10 h-10" />
                      )}
                    </button>
                  </div>
                </div>
                <div 
                  className="text-center mt-1"
                  style={{ 
                    fontSize: '16px', 
                    color: '#FFFFFF !important', 
                    textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)', 
                    lineHeight: '1.6'
                  }}
                >
                  Together, they create the emotional ecosystem of the Heartverse — the foundation of every story and song.
                </div>
                {!user && !profile && (
                  <div 
                    className="text-center mt-2"
                    style={{ 
                      fontSize: '14px', 
                      color: '#FFFFFF !important', 
                      textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)', 
                      lineHeight: '1.6'
                    }}
                  >
                    You align with your Element when you{' '}
                    <button
                      onClick={() => {
                        try { sfx.play('click', 0.8); } catch {}
                        // Close the ABOUT popout first
                        if (onOpenChange) {
                          onOpenChange(false);
                        } else {
                          setInternalOpen(false);
                        }
                        // Open welcome home modal after a brief delay
                        setTimeout(() => {
                          onOpenWelcomeHome?.();
                        }, 100);
                      }}
                      className="underline hover:text-pink-300 transition-colors duration-200"
                      style={{
                        color: '#00E5FF !important',
                        textShadow: '0 0 10px #00E5FF, 0 0 20px #00E5FF',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'none',
                        textDecoration: 'underline'
                      }}
                    >
                      create your profile
                    </button>
                    .
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
