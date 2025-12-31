"use client";

import { ReactNode, useEffect, useState } from "react";
import { sfx } from "@/lib/sfx";

interface PopoutShellProps {
  title: string;
  onClose: () => void;
  children?: ReactNode;
  overlayContent?: ReactNode;
  backgroundContent?: ReactNode;
  fullOverlay?: ReactNode; // Content that covers the entire popout including header
  pageIndicator?: string; // Optional, for binder's "1 / 6" display
  compact?: boolean; // Optional, for compact height like badges
  isOpen?: boolean;
  subtitle?: string; // Optional subtitle below the title line
  minWidth?: string; // Optional minimum width for container (e.g., 'min(90vw, 380px)')
  maxHeight?: string; // Optional max height for container (e.g., '78vh')
  fitToPowerTop?: boolean; // If true, dynamically fit bottom to top of Power button
  powerGapPx?: number; // Gap above power button when fitting
  hideHeaderRule?: boolean; // Optional, hide the neon separator line under the title
  headerRuleVariant?: 'pink' | 'cyan'; // Optional, choose pink (default) or cyan line
  topPadding?: string; // Optional custom top padding (default: '8vh')
}

export default function PopoutShell({ title, onClose, children, overlayContent, backgroundContent, fullOverlay, pageIndicator, compact = false, isOpen = true, subtitle, minWidth, maxHeight, fitToPowerTop = false, powerGapPx = 12, hideHeaderRule = false, headerRuleVariant = 'pink', topPadding = '8vh' }: PopoutShellProps) {
  if (!isOpen) return null;

  const [computedMaxHeight, setComputedMaxHeight] = useState<string | null>(null);

  useEffect(() => {
    if (!fitToPowerTop) {
      setComputedMaxHeight(null);
      return;
    }
    function compute() {
      try {
        const vh = window.innerHeight || 0;
        const containerTopPx = Math.round(vh * 0.08); // matches paddingTop: '8vh'
        const powerEl = document.querySelector('.power-btn') as HTMLElement | null;
        if (powerEl) {
          const rect = powerEl.getBoundingClientRect();
          const topOfPower = Math.max(0, Math.round(rect.top));
          const h = Math.max(300, topOfPower - containerTopPx - powerGapPx);
          setComputedMaxHeight(`${h}px`);
        } else {
          setComputedMaxHeight(maxHeight ?? (compact ? '50vh' : '45vh'));
        }
      } catch {
        setComputedMaxHeight(maxHeight ?? (compact ? '50vh' : '45vh'));
      }
    }
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [fitToPowerTop, powerGapPx, compact, maxHeight]);
  return (
    <>
      {/* Backdrop overlay - no dimming */}
      <div
        className="fixed inset-0 z-[99999998]"
        style={{ cursor: 'pointer' }}
        onClick={onClose}
      />

      {/* Main modal container - exact copy from Binder */}
      <div
        className="fixed inset-0 z-[99999999] flex items-start justify-center"
        style={{
          paddingTop: topPadding
        }}
      >
        <div
          className="binder-hologram-container"
          style={{
            width: 'min(85vw, 600px)',
            minWidth: minWidth,
            height: fitToPowerTop ? (computedMaxHeight ?? (maxHeight ?? (compact ? '50vh' : '45vh'))) : (maxHeight ?? (compact ? '50vh' : '45vh')),
            maxHeight: fitToPowerTop ? (computedMaxHeight ?? (maxHeight ?? (compact ? '50vh' : '45vh'))) : (maxHeight ?? (compact ? '50vh' : '45vh')),
            minHeight: compact ? '300px' : '400px',
            display: 'flex',
            flexDirection: 'column',
            padding: '0px',
            borderRadius: 14,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,105,180,0.55)',
            boxShadow: '0 -8px 25px rgba(255,105,180,0.4), 0 -4px 15px rgba(255,105,180,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,105,180,0.45)',
            backdropFilter: 'saturate(140%)',
            color: '#FF69B4',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          
          {/* Soft bottom glow - matching binder exactly */}
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
          
          {/* Top bloom glow - matching binder exactly */}
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
          
          {/* Close button - exact copy from Binder */}
          <button
            onClick={() => {
              try { sfx.play('close', 0.8); } catch {}
              onClose();
            }}
            onMouseEnter={(e) => {
              try { sfx.play('hover', 0.3); } catch {}
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            className="absolute top-4 right-3 text-pink-400 hover:text-pink-200 cursor-pointer w-10 h-10 rounded-full border border-pink-400/80 flex items-center justify-center transition-transform duration-200"
            style={{ 
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(255,105,180,0.8), 0 0 25px rgba(255,105,180,0.5), 0 0 35px rgba(255,105,180,0.3)',
              textShadow: '0 0 8px rgba(255,105,180,0.8), 0 0 15px rgba(255,105,180,0.6)',
              background: 'rgba(255,105,180,0.1)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          
          {/* Header - only show if title exists */}
          {title && (
            <>
              <div className="flex justify-center items-center flex-shrink-0" style={{ padding: '4px 14px 0px 14px' }}>
                <div 
                  style={{ 
                    color: '#FF69B4', 
                    textShadow: '0 0 8px rgba(255,105,180,0.6)', 
                    fontSize: '24px',
                    fontWeight: 'bold'
                  }}
                >
                  {title}
                </div>
              </div>
              
              {/* Thin neon line - optional, variant controlled */}
              {!hideHeaderRule && (
                <div 
                  className="w-full h-px flex-shrink-0"
                  style={{
                    background: headerRuleVariant === 'cyan'
                      ? 'linear-gradient(90deg, transparent, rgba(0,191,255,0.8) 20%, rgba(0,191,255,1) 50%, rgba(0,191,255,0.8) 80%, transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(255,105,180,0.8) 20%, rgba(255,105,180,1) 50%, rgba(255,105,180,0.8) 80%, transparent)',
                    boxShadow: headerRuleVariant === 'cyan'
                      ? '0 0 4px rgba(0,191,255,0.6)'
                      : '0 0 4px rgba(255,105,180,0.6)'
                  }}
                />
              )}
              
              {/* Subtitle below the line */}
              {subtitle && (
                <div className="flex justify-center items-center flex-shrink-0" style={{ padding: '0px 14px 2px 14px' }}>
                  <div 
                    style={{ 
                      color: '#FFFFFF', 
                      textShadow: '0 0 6px rgba(255,255,255,0.8)', 
                      fontSize: '16px',
                      fontWeight: 'bold',
                      opacity: 0.9
                    }}
                  >
                    {subtitle}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Background content area */}
          {backgroundContent && (
            <div className="absolute inset-0 z-0" style={{ padding: '60px 12px 20px 12px' }}>
              {backgroundContent}
            </div>
          )}

          {/* Content container - exact copy from Binder */}
          <div className="flex-1 relative z-10" style={{ maxHeight: 'calc(100% - 80px)', display: 'flex', flexDirection: 'column', alignItems: 'stretch', paddingBottom: compact ? '8px' : '20px', overflow: 'auto' }}>
            {overlayContent || children}
          </div>

          {/* Page Number Display - exact copy from Binder, only show if provided */}
          {pageIndicator && (
            <div
              className="absolute left-1/2 transform -translate-x-1/2"
              style={{
                bottom: '4px',
                color: '#FF69B4',
                fontSize: '12px',
                fontWeight: 'bold',
                textShadow: '0 0 4px rgba(255,105,180,0.6)',
                zIndex: 20,
                pointerEvents: 'none'
              }}
            >
              {pageIndicator}
            </div>
          )}

          {/* Bottom light beam boundary */}
          <div
            className="absolute w-full flex-shrink-0"
            style={{
              bottom: 0,
              left: 0,
              height: '1px',
              background: headerRuleVariant === 'cyan'
                ? 'linear-gradient(90deg, transparent, rgba(0,191,255,0.8) 20%, rgba(0,191,255,1) 50%, rgba(0,191,255,0.8) 80%, transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,105,180,0.8) 20%, rgba(255,105,180,1) 50%, rgba(255,105,180,0.8) 80%, transparent)',
              boxShadow: headerRuleVariant === 'cyan'
                ? '0 0 8px rgba(0,191,255,0.8), 0 0 15px rgba(0,191,255,0.5)'
                : '0 0 8px rgba(255,105,180,0.8), 0 0 15px rgba(255,105,180,0.5)',
              zIndex: 50,
              borderRadius: '0 0 14px 14px',
              pointerEvents: 'none'
            }}
          />

          {/* Full overlay - covers entire popout including header */}
          {fullOverlay && (
            <div
              className="absolute inset-0 z-[60] rounded-[14px] overflow-hidden"
            >
              {fullOverlay}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
