"use client";

import { ReactNode } from "react";
import { sfx } from "@/lib/sfx";

interface PopoutShellProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  pageIndicator?: string; // Optional, for binder's "1 / 6" display
}

export default function PopoutShell({ title, onClose, children, pageIndicator }: PopoutShellProps) {
  return (
    <>
      {/* Backdrop overlay - no dimming */}
      <div 
        className="fixed inset-0 z-[2147483646]"
        onClick={onClose}
      />
      
      {/* Main modal container - exact copy from Binder */}
      <div 
        className="fixed inset-0 z-[2147483647] flex items-start justify-center"
        style={{
          paddingTop: '2vh'
        }}
      >
        <div
          className="binder-hologram-container"
          style={{
            width: 'min(90vw, 650px)',
            height: 'auto',
            maxHeight: '95vh',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            padding: '0px',
            borderRadius: 14,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,105,180,0.55)',
            boxShadow: '0 -8px 25px rgba(255,105,180,0.4), 0 -4px 15px rgba(255,105,180,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,105,180,0.45)',
            backdropFilter: 'blur(12px) saturate(140%)',
            color: '#FF69B4',
            position: 'relative',
            overflow: 'visible'
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
            className="absolute top-4 right-4 text-pink-400 hover:text-pink-200 cursor-pointer w-8 h-8 rounded-full border border-pink-400/80 flex items-center justify-center"
            style={{ 
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(255,105,180,0.8), 0 0 25px rgba(255,105,180,0.5), 0 0 35px rgba(255,105,180,0.3)',
              textShadow: '0 0 8px rgba(255,105,180,0.8), 0 0 15px rgba(255,105,180,0.6)',
              background: 'rgba(255,105,180,0.1)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          
          {/* Header - exact copy from Binder */}
          <div className="flex justify-center items-center mb-3 flex-shrink-0" style={{ padding: '10px 14px 0px 14px' }}>
            <div 
              style={{ 
                color: '#FF69B4', 
                textShadow: '0 0 8px rgba(255,105,180,0.6)', 
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {title}
            </div>
          </div>
          
          {/* Thin pink neon line - exact copy from Binder */}
          <div 
            className="w-full h-px flex-shrink-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,105,180,0.8) 20%, rgba(255,105,180,1) 50%, rgba(255,105,180,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(255,105,180,0.6)'
            }}
          />

          {/* Content container - exact copy from Binder */}
          <div className="flex-1 relative overflow-hidden" style={{ maxHeight: 'calc(100% - 80px)', display: 'flex', alignItems: 'center' }}>
            {children}
          </div>

          {/* Page Number Display - exact copy from Binder, only show if provided */}
          {pageIndicator && (
            <div 
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
              style={{
                color: '#FF69B4',
                fontSize: '12px',
                fontWeight: 'bold',
                textShadow: '0 0 4px rgba(255,105,180,0.6)',
                pointerEvents: 'none'
              }}
            >
              {pageIndicator}
            </div>
          )}
        </div>
      </div>
    </>
  );
}