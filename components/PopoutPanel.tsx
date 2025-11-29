"use client";

import { ReactNode, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '@/lib/sfx';
import { useProfile } from '@/contexts/ProfileContext';
import BinderModal from './BinderModal';
import BadgesModal from './BadgesModal';
import ChatPanel from './chat/ChatPanel';

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
  const [showTextChat, setShowTextChat] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showCardsModal, setShowCardsModal] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const { profile, loading } = useProfile();

  // Helper function to get element icon path
  const getElementIcon = (element: string | null) => {
    const iconMap: Record<string, string> = {
      'heart': '/elements/heart.webp',
      'water': '/elements/water.webp', 
      'lightning': '/elements/lightning.webp',
      'darkness': '/elements/darkness.webp'
    };
    return iconMap[element || ''] || '/elements/elementals.webp';
  };

  // Get user display info
  const displayName = profile?.name || 'ALIEN';
  const userElement = profile?.element || null;
  const heartCoins = profile?.heartcoin_balance || 0;

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
          paddingTop: '0px'
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
      
      {/* Text Chat - Full ChatPanel integration */}
      <ChatPanel
        isOpen={showTextChat}
        onClose={() => {
          try { sfx.play('close', 0.4); } catch {}
          setShowTextChat(false);
        }}
      />

      {/* User Profile Popup - appears when clicking user name in chat */}
      {showProfilePopup && (
        <div 
          className="fixed z-[2147483649] flex items-center justify-center"
          style={{
            left: '50%',
            top: '15vh',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto'
          }}
        >
          <div
            className="relative"
            style={{
              width: 'min(80vw, 320px)',
              minHeight: '280px',
              padding: '16px',
              borderRadius: 18,
              background: 'rgba(0, 15, 30, 0.9)',
              border: '2px solid #FFD700',
              boxShadow: `0 0 20px #FFD700, 0 0 40px #FFD700AA, 0 8px 30px rgba(0,0,0,0.6)`,
              backdropFilter: 'blur(15px) saturate(150%)',
              color: '#FFD700'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => {
                try { sfx.play('close', 0.4); } catch {}
                setShowProfilePopup(false);
              }}
              className="absolute top-3 right-3 hover:opacity-70"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFD700',
                cursor: 'pointer',
                fontSize: '20px'
              }}
            >
              ×
            </button>

            {/* Profile Content */}
            <div className="flex flex-col items-center space-y-3">
              {/* User element icon - large */}
              <div className="relative">
                <div 
                  className="w-16 h-16 rounded-full overflow-hidden border-2 shadow-lg"
                  style={{ borderColor: '#FFD700' }}
                >
                  <img 
                    src={getElementIcon(userElement)} 
                    alt={userElement || 'Element'} 
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Element glow effect */}
                <div 
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    boxShadow: '0 0 15px #FFD700AA, 0 0 30px #FFD700, inset 0 0 15px #FFD70040'
                  }}
                />
              </div>

              {/* User name */}
              <h3 
                className="text-xl font-bold text-center"
                style={{
                  color: '#FFD700',
                  textShadow: '0 0 10px #FFD700',
                  letterSpacing: '0.05em'
                }}
              >
                {displayName}
              </h3>

              {/* Heart coins display */}
              <div className="flex items-center space-x-2 bg-black/30 rounded-full px-4 py-2">
                <img 
                  src="/elements/heart-coin.webp" 
                  alt="Heart Coin" 
                  className="w-6 h-6"
                />
                <span 
                  className="font-bold text-lg"
                  style={{
                    color: '#FF69B4',
                    textShadow: '0 0 8px #FF69B4'
                  }}
                >
                  {heartCoins}
                </span>
                <span 
                  style={{
                    color: '#FFFFFF',
                    fontSize: '14px',
                    textShadow: '0 0 4px #FFFFFF80'
                  }}
                >
                  Heart Coins
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-3 w-full pt-3">
                {/* Cards button */}
                <button
                  onClick={() => {
                    try { sfx.play('click', 0.4); } catch {}
                    setShowProfilePopup(false);
                    setShowCardsModal(true);
                  }}
                  className="flex-1 py-2 px-3 rounded-lg border-2 hover:scale-105 transition-all duration-200"
                  style={{
                    background: 'rgba(0, 191, 255, 0.1)',
                    borderColor: '#00BFFF',
                    color: '#00BFFF',
                    textShadow: '0 0 6px #00BFFF',
                    boxShadow: '0 0 10px #00BFFF40'
                  }}
                >
                  <div className="text-center">
                    <div className="text-sm font-bold">CARDS</div>
                    <div className="text-xs opacity-80">View Collection</div>
                  </div>
                </button>

                {/* Badges button */}
                <button
                  onClick={() => {
                    try { sfx.play('click', 0.4); } catch {}
                    setShowProfilePopup(false);
                    setShowBadgesModal(true);
                  }}
                  className="flex-1 py-2 px-3 rounded-lg border-2 hover:scale-105 transition-all duration-200"
                  style={{
                    background: 'rgba(255, 105, 180, 0.1)',
                    borderColor: '#FF69B4',
                    color: '#FF69B4',
                    textShadow: '0 0 6px #FF69B4',
                    boxShadow: '0 0 10px #FF69B440'
                  }}
                >
                  <div className="text-center">
                    <div className="text-sm font-bold">BADGES</div>
                    <div className="text-xs opacity-80">View Achievements</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main popup */}
      <div 
        className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          className={`relative ${className}`}
          style={{
            width: 'min(92vw, 700px)',
            maxWidth: '700px',
            minHeight: '200px',
            maxHeight: '90vh',
            padding: '10px 14px 14px 14px',
            borderRadius: 18,
            background: 'rgba(0,0,0,0.6)',
            border: `1px solid ${borderColor}`,
            boxShadow: `0 -8px 25px ${glowColor}40, 0 -4px 15px ${glowColor}25, 0 12px 30px rgba(0,0,0,0.4), 0 0 24px ${glowColor}45`,
            backdropFilter: 'blur(12px) saturate(140%)',
            color: glowColor,
            overflow: 'hidden',
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
          
          {/* Text button */}
          <button
            onClick={() => {
              try { sfx.play('click', 0.4); } catch {}
              setShowTextChat(!showTextChat);
            }}
            className="absolute top-2 left-4 hover:opacity-80 cursor-pointer w-8 h-8 rounded-full border flex items-center justify-center overflow-hidden"
            style={{ 
              borderColor: '#F2EF1D80',
              boxShadow: '0 0 15px #F2EF1D80, 0 0 25px #F2EF1D50, 0 0 35px #F2EF1D30',
              background: '#F2EF1D10',
              backdropFilter: 'blur(2px)',
              padding: 0
            }}
          >
            <img 
              src="/elements/text.webp" 
              alt="Text" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </button>

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
          <div className="relative overflow-auto max-h-full">
            {children}
          </div>
        </div>
      </div>

      {/* Cards Modal - opened from profile popup */}
      {showCardsModal && (
        <BinderModal 
          open={showCardsModal}
          onClose={() => setShowCardsModal(false)}
          pulsingCards={true}
        />
      )}

      {/* Badges Modal - opened from profile popup */}
      {showBadgesModal && (
        <BadgesModal 
          open={showBadgesModal}
          onClose={() => setShowBadgesModal(false)}
        />
      )}
    </>,
    document.body
  );
}
