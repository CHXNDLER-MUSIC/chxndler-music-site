"use client";

import { useState } from "react";
import HeartverseButton from "@/components/HeartverseButton";
import { sfx } from "@/lib/sfx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
};

export default function BadgesButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, onOpenBlueDisplay, ...rest }: Props) {
  const [open, setOpen] = useState(false);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    try { onClick?.(e); } catch {}
    if (!e.defaultPrevented) {
      e.preventDefault();
      try { sfx.play('click', 0.8); } catch {}
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
        BADGES
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
              background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(33,150,243,0.7) 0%, rgba(33,150,243,0.4) 30%, rgba(33,150,243,0.1) 60%, transparent 100%)',
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
              border: '1px solid rgba(0,255,255,0.55)',
              boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#00FFFF',
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
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(33,150,243,0.6) 0%, rgba(33,150,243,0.3) 40%, transparent 80%)',
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
              background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(33,150,243,0.4) 0%, rgba(33,150,243,0.2) 50%, transparent 100%)',
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
            className="absolute top-2 right-4 text-cyan-400 hover:text-cyan-200 cursor-pointer w-8 h-8 rounded-full border border-cyan-400/80 flex items-center justify-center"
            style={{ 
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(0,255,255,0.8), 0 0 25px rgba(0,255,255,0.5), 0 0 35px rgba(0,255,255,0.3)',
              textShadow: '0 0 8px rgba(0,255,255,0.8), 0 0 15px rgba(0,255,255,0.6)',
              background: 'rgba(0,255,255,0.1)',
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
              color: '#00FFFF', 
              textShadow: '0 0 8px rgba(0,255,255,0.6)', 
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            COLLECT BADGES FROM THE HEARTVERSE ♥
          </div>
          
          {/* Thin blue neon line */}
          <div 
            className="w-full h-px mb-4"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(0,255,255,0.6)'
            }}
          />
          <div 
            className="text-center mb-4"
            style={{ 
              whiteSpace: 'pre-wrap', 
              lineHeight: 1.2, 
              fontSize: 14, 
              color: '#00FFFF', 
              textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(0,255,255,0.6)', 
              marginTop: '-4px' 
            }}
          >
            DISCOVER AND UNLOCK EXCLUSIVE BADGES BY EXPLORING THE HEARTVERSE. EACH BADGE REPRESENTS A UNIQUE ACHIEVEMENT.
          </div>

          {/* Badges Display */}
          <div className="relative mt-1">
            <div className="grid grid-cols-3 gap-4">
              {/* Sample badges - you can replace with actual badge data */}
              <div className="text-center">
                <div 
                  className="w-16 h-16 mx-auto mb-2 rounded-full border-2 border-cyan-400/60 flex items-center justify-center"
                  style={{
                    background: 'rgba(0,255,255,0.1)',
                    boxShadow: '0 0 15px rgba(0,255,255,0.3)',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>🎵</span>
                </div>
                <div 
                  className="text-xs"
                  style={{ 
                    color: '#FFFFFF', 
                    textShadow: '0 0 4px rgba(255,255,255,0.7)' 
                  }}
                >
                  FIRST LISTEN
                </div>
              </div>
              
              <div className="text-center">
                <div 
                  className="w-16 h-16 mx-auto mb-2 rounded-full border-2 border-cyan-400/60 flex items-center justify-center"
                  style={{
                    background: 'rgba(0,255,255,0.1)',
                    boxShadow: '0 0 15px rgba(0,255,255,0.3)',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>💫</span>
                </div>
                <div 
                  className="text-xs"
                  style={{ 
                    color: '#FFFFFF', 
                    textShadow: '0 0 4px rgba(255,255,255,0.7)' 
                  }}
                >
                  EXPLORER
                </div>
              </div>
              
              <div className="text-center">
                <div 
                  className="w-16 h-16 mx-auto mb-2 rounded-full border-2 border-gray-400/30 flex items-center justify-center"
                  style={{
                    background: 'rgba(128,128,128,0.1)',
                    boxShadow: '0 0 10px rgba(128,128,128,0.2)',
                  }}
                >
                  <span style={{ fontSize: '24px', opacity: 0.5 }}>❓</span>
                </div>
                <div 
                  className="text-xs"
                  style={{ 
                    color: '#888', 
                    textShadow: '0 0 2px rgba(136,136,136,0.5)' 
                  }}
                >
                  LOCKED
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  );
}