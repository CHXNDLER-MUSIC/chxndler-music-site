"use client";

import { useState } from "react";
import HeartverseButton from "@/components/HeartverseButton";
import { sfx } from "@/lib/sfx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
  onCloseBlueDisplay?: () => void;
};

export default function JourneyButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, ...rest }: Props) {
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
        className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-400/60 text-cyan-300 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:shadow-cyan-400/30"
        style={{
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 255, 255, 0.2)',
          fontSize: '12px',
          textShadow: '0 0 8px rgba(0, 255, 255, 0.8), 0 0 15px rgba(0, 255, 255, 0.6)',
          ...rest.style
        }}
        {...rest}
      >
        JOURNEY
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
      
      {/* Journey Modal - holographic popup */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          style={{
            paddingTop: '300px'
          }}
        >
          <div
            className="journey-hologram-container"
            style={{
              width: 'min(92vw, 700px)',
              height: '35vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(33,150,243,0.55)',
              boxShadow: '0 -8px 25px rgba(33,150,243,0.4), 0 -4px 15px rgba(33,150,243,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(33,150,243,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#2196F3',
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
            }}
            className="absolute top-2 right-4 text-blue-400 hover:text-white cursor-pointer w-8 h-8 rounded-full border border-blue-400/80 flex items-center justify-center"
            style={{ 
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(33,150,243,0.8), 0 0 25px rgba(33,150,243,0.5), 0 0 35px rgba(33,150,243,0.3)',
              textShadow: '0 0 8px rgba(33,150,243,0.8), 0 0 15px rgba(33,150,243,0.6)',
              background: 'rgba(33,150,243,0.1)',
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
              color: '#2196F3', 
              textShadow: '0 0 8px rgba(33,150,243,0.6)', 
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            START YOUR JOURNEY INTO THE HEARTVERSE ♥
          </div>
          
          {/* Thin blue neon line */}
          <div 
            className="w-full h-px mb-4"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(33,150,243,0.8) 20%, rgba(33,150,243,1) 50%, rgba(33,150,243,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(33,150,243,0.6)'
            }}
          />
          <div 
            className="text-center mb-4"
            style={{ 
              whiteSpace: 'pre-wrap', 
              lineHeight: 1.2, 
              fontSize: 14, 
              color: '#2196F3', 
              textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(33,150,243,0.6)', 
              marginTop: '-4px' 
            }}
          >
            JOIN OUR ALIEN COMMUNITY AND GET ACCESS TO NEW RELEASES, EXCLUSIVE CONTENT, AND SPECIAL EVENTS.
          </div>

          {/* Form */}
          <div className="relative mt-1">
            <div className="flex flex-col gap-3">
              {/* Phone and Email side by side */}
              <div className="flex gap-3">
                {/* Phone number section */}
                <div className="flex-1">
                  <label htmlFor="journey-phone" className="block text-sm font-medium text-white/90 text-center">
                    PHONE
                  </label>
                  <input
                    id="journey-phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="block w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 shadow-sm focus:border-[#2196F3] focus:outline-none"
                  />
                </div>
                
                {/* Email section */}
                <div className="flex-1">
                  <label htmlFor="journey-email" className="block text-sm font-medium text-white/90 text-center">
                    EMAIL
                  </label>
                  <input
                    id="journey-email"
                    type="email"
                    placeholder="your@email.com"
                    className="block w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 shadow-sm focus:border-[#2196F3] focus:outline-none"
                  />
                </div>
              </div>
              
              {/* Join button */}
              <button
                type="submit"
                className="w-full mt-2 px-4 py-2 bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 rounded-lg font-medium transition-all duration-200"
                style={{
                  boxShadow: '0 0 20px rgba(33, 150, 243, 0.3)',
                  textShadow: '0 0 8px rgba(33,150,243,0.6)'
                }}
              >
                JOIN THE JOURNEY
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  );
}