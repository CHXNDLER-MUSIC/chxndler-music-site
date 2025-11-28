"use client";

import { useState } from "react";
import { sfx } from "@/lib/sfx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  // External control for the chxndler popout
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function ChxndlerButton({ open: externalOpen, onOpenChange, ...restProps }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"WE BELIEVE" | "CHXNDLER">("CHXNDLER");
  
  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;

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
          className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4"
          style={{ alignItems: 'center', transform: 'translateY(-40px)' }}
        >
          <div
            className="chxndler-hologram-container relative"
            style={{
              width: 'min(92vw, 500px)',
              minHeight: '400px',
              padding: '20px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.8)',
              border: '1px solid rgba(252,84,175,0.6)',
              boxShadow: '0 -8px 25px rgba(252,84,175,0.4), 0 -4px 15px rgba(252,84,175,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(252,84,175,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
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
              className="absolute top-2 right-4 text-pink-400 hover:text-pink-200 cursor-pointer w-8 h-8 rounded-full border border-pink-400/80 flex items-center justify-center"
              style={{ 
                fontSize: '16px',
                boxShadow: '0 0 15px rgba(252,84,175,0.8), 0 0 25px rgba(252,84,175,0.5), 0 0 35px rgba(252,84,175,0.3)',
                textShadow: '0 0 8px rgba(252,84,175,0.8), 0 0 15px rgba(252,84,175,0.6)',
                background: 'rgba(252,84,175,0.1)',
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
              className="text-center mb-6"
              style={{ 
                color: '#FFFFFF !important', 
                textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7), 0 0 20px rgba(255,255,255,0.5)', 
                fontSize: '20px',
                fontWeight: 'bold'
              }}
            >
              CHXNDLER
            </div>
            
            {/* Tabs */}
            <div className="flex justify-center mb-4">
              <div className="flex bg-black/30 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("CHXNDLER")}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                    activeTab === "CHXNDLER"
                      ? "bg-pink-500/20 text-pink-300 border border-pink-400/50"
                      : "text-white/70 hover:text-white"
                  }`}
                  style={{
                    textShadow: activeTab === "CHXNDLER" ? '0 0 8px rgba(252,84,175,0.8)' : 'none',
                    boxShadow: activeTab === "CHXNDLER" ? '0 0 15px rgba(252,84,175,0.3)' : 'none'
                  }}
                >
                  CHXNDLER
                </button>
                <button
                  onClick={() => setActiveTab("WE BELIEVE")}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                    activeTab === "WE BELIEVE"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50"
                      : "text-white/70 hover:text-white"
                  }`}
                  style={{
                    textShadow: activeTab === "WE BELIEVE" ? '0 0 8px rgba(0,255,255,0.8)' : 'none',
                    boxShadow: activeTab === "WE BELIEVE" ? '0 0 15px rgba(0,255,255,0.3)' : 'none'
                  }}
                >
                  WE BELIEVE
                </button>
              </div>
            </div>
            
            {/* Pink neon line */}
            <div 
              className="w-full h-px mb-6"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(252,84,175,0.8) 20%, rgba(252,84,175,1) 50%, rgba(252,84,175,0.8) 80%, transparent)',
                boxShadow: '0 0 4px rgba(252,84,175,0.6)'
              }}
            />

            {/* Tab Content */}
            {activeTab === "CHXNDLER" && (
              <>
                {/* CHXNDLER Image */}
                <div className="flex justify-center mb-6">
                  <div 
                    className="relative"
                    style={{
                      width: '200px',
                      height: '200px',
                      filter: 'drop-shadow(0 0 20px rgba(252,84,175,0.6))'
                    }}
                  >
                    <img
                      src="/elements/chxndler.png"
                      alt="CHXNDLER"
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'brightness(1.1) saturate(1.2)'
                      }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div 
                  className="text-center"
                  style={{ 
                    fontSize: '16px', 
                    color: '#FFFFFF !important', 
                    textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)', 
                    lineHeight: '1.6'
                  }}
                >
                  <div className="mb-4">
                    <span style={{ 
                      color: '#FC54AF !important', 
                      textShadow: '0 0 5px #FC54AF, 0 0 10px #FC54AF, 0 0 15px #FC54AF', 
                      fontWeight: 'bold' 
                    }}>
                      Welcome to the Heartverse
                    </span>
                  </div>
                  <div>
                    Where music meets emotion and every beat tells a story of connection, 
                    passion, and the infinite journey of the heart.
                  </div>
                </div>
              </>
            )}

            {activeTab === "WE BELIEVE" && (
              <>
                {/* We Believe Header */}
                <div 
                  className="text-center mb-6"
                  style={{ 
                    fontSize: 18, 
                    color: '#FFFFFF !important', 
                    textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7), 0 0 20px rgba(255,255,255,0.5)',
                    fontWeight: 'bold'
                  }}
                >
                  We Believe
                </div>
                
                {/* We Believe Content */}
                <div 
                  className="text-left space-y-4"
                  style={{ 
                    fontSize: 14, 
                    color: '#FFFFFF !important', 
                    textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)', 
                  }}
                >
                  <div className="flex items-start">
                    <span className="mr-3" style={{ color: '#FFFFFF !important', textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)' }}>•</span>
                    <span>We believe being your <span style={{ color: '#0099FF !important', textShadow: '0 0 5px #0099FF, 0 0 10px #0099FF, 0 0 15px #0099FF, 0 0 20px #0099FF', fontWeight: 'inherit !important' }}>truest self</span> is the beginning of freedom.</span>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-3" style={{ color: '#FFFFFF !important', textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)' }}>•</span>
                    <span>We believe <span style={{ color: '#FFD700 !important', textShadow: '0 0 5px #FFD700, 0 0 10px #FFD700, 0 0 15px #FFD700, 0 0 20px #FFD700', fontWeight: 'inherit !important' }}>passion</span> is sacred and should be pursued loudly.</span>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-3" style={{ color: '#FFFFFF !important', textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)' }}>•</span>
                    <span>We believe <span style={{ color: '#FF1493 !important', textShadow: '0 0 5px #FF1493, 0 0 10px #FF1493, 0 0 15px #FF1493, 0 0 20px #FF1493', fontWeight: 'inherit !important' }}>love</span> is the force that connects every soul.</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}