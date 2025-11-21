"use client";

import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '@/lib/sfx';

interface PopoutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  glowColor?: string;
  borderColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function PopoutPanel({
  isOpen,
  onClose,
  children,
  title,
  glowColor = '#FF69B4',
  borderColor = 'rgba(255,105,180,0.55)',
  className = '',
  style = {}
}: PopoutPanelProps) {
  if (!isOpen || typeof window === 'undefined') {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      try { sfx.play('close', 0.4); } catch {}
      onClose();
    }
  };

  const handleCloseClick = () => {
    try { sfx.play('close', 0.8); } catch {}
    onClose();
  };

  return createPortal(
    <>
      {/* Hologram base glow */}
      <div 
        className="fixed inset-0 z-[2147483646] flex items-center justify-center"
        style={{
          pointerEvents: 'none',
          paddingTop: '40px'
        }}
      >
        <div
          style={{
            width: 'min(120vw, 700px)',
            height: '200px',
            background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${glowColor}70 0%, ${glowColor}40 30%, ${glowColor}10 60%, transparent 100%)`,
            filter: 'blur(100px)'
          }}
        />
      </div>
      
      {/* Main popup */}
      <div 
        className="fixed inset-0 z-[2147483647] flex items-center justify-center"
        style={{ paddingTop: '40px' }}
        onClick={handleBackdropClick}
      >
        <div
          className={`relative ${className}`}
          style={{
            width: 'min(92vw, 700px)',
            minHeight: '200px',
            padding: '10px 14px 14px 14px',
            borderRadius: 18,
            background: 'rgba(0,0,0,0.6)',
            border: `1px solid ${borderColor}`,
            boxShadow: `0 -8px 25px ${glowColor}40, 0 -4px 15px ${glowColor}25, 0 12px 30px rgba(0,0,0,0.4), 0 0 24px ${glowColor}45`,
            backdropFilter: 'blur(12px) saturate(140%)',
            color: glowColor,
            ...style
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
              background: `radial-gradient(ellipse 60% 100% at 50% 0%, ${glowColor}60 0%, ${glowColor}30 40%, transparent 80%)`,
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
              background: `radial-gradient(ellipse 70% 100% at 50% 100%, ${glowColor}40 0%, ${glowColor}20 50%, transparent 100%)`,
              filter: 'blur(25px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          
          {/* Close button */}
          <button
            onClick={handleCloseClick}
            className="absolute top-2 right-4 hover:opacity-80 cursor-pointer w-8 h-8 rounded-full border flex items-center justify-center"
            style={{ 
              fontSize: '16px',
              borderColor: `${glowColor}80`,
              color: glowColor.replace('69B4', 'B6C1'), // Lighter variant
              boxShadow: `0 0 15px ${glowColor}80, 0 0 25px ${glowColor}50, 0 0 35px ${glowColor}30`,
              textShadow: `0 0 8px ${glowColor}80, 0 0 15px ${glowColor}60`,
              background: `${glowColor}10`,
              backdropFilter: 'blur(2px)'
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          
          {/* Title */}
          {title && (
            <>
              <div 
                className="text-center mb-3"
                style={{ 
                  color: glowColor, 
                  textShadow: `0 0 8px ${glowColor}60`, 
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {title}
              </div>
              
              {/* Thin neon line */}
              <div 
                className="w-full h-px mb-4"
                style={{
                  background: `linear-gradient(90deg, transparent, ${glowColor}80 20%, ${glowColor} 50%, ${glowColor}80 80%, transparent)`,
                  boxShadow: `0 0 4px ${glowColor}60`
                }}
              />
            </>
          )}
          
          {/* Content */}
          <div className="relative">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}