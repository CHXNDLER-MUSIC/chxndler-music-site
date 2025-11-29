"use client";

import { ReactNode, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '@/lib/sfx';
import { useProfile } from '@/contexts/ProfileContext';
import BinderModal from './BinderModal';
import BadgesModal from './BadgesModal';

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
  const [chatMessage, setChatMessage] = useState('');
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
      
      {/* Text Chat - appears above popup */}
      {showTextChat && (
        <div 
          className="fixed z-[2147483648] flex items-center justify-center"
          style={{
            left: '50%',
            top: '20vh',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto'
          }}
        >
          <div
            className="relative"
            style={{
              width: 'min(85vw, 600px)',
              minHeight: '300px',
              padding: '16px',
              borderRadius: 18,
              background: 'rgba(0, 15, 30, 0.85)',
              border: '2px solid #00BFFF',
              boxShadow: `0 0 20px #00BFFF60, 0 0 40px #00BFFF30, 0 8px 30px rgba(0,0,0,0.4)`,
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#00BFFF'
            }}
          >
            {/* Chat header */}
            <div 
              className="flex items-center justify-between mb-4 pb-3"
              style={{
                borderBottom: '1px solid #00BFFF40'
              }}
            >
              {/* Left side - User info */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {/* User element icon */}
                  <div 
                    className="w-8 h-8 rounded-full overflow-hidden border"
                    style={{ borderColor: '#00BFFF40' }}
                  >
                    <img 
                      src={getElementIcon(userElement)} 
                      alt={userElement || 'Element'} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* User name - clickable */}
                  <button
                    onClick={() => {
                      try { sfx.play('click', 0.4); } catch {}
                      setShowProfilePopup(true);
                    }}
                    className="hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0"
                    style={{
                      color: '#00BFFF',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      textShadow: '0 0 6px #00BFFF60'
                    }}
                  >
                    {displayName}
                  </button>
                </div>
                <div 
                  style={{
                    fontSize: '14px',
                    color: '#00BFFF80',
                    textShadow: '0 0 4px #00BFFF40'
                  }}
                >
                  Signal Chat
                </div>
              </div>
              
              {/* Right side - Close button */}
              <button
                onClick={() => {
                  try { sfx.play('close', 0.4); } catch {}
                  setShowTextChat(false);
                }}
                className="hover:opacity-70"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#00BFFF',
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                ×
              </button>
            </div>

            {/* Chat content area */}
            <div 
              className="flex-1 mb-4"
              style={{
                height: '200px',
                overflowY: 'auto',
                padding: '12px',
                background: 'rgba(0, 191, 255, 0.05)',
                borderRadius: 12,
                border: '1px solid #00BFFF20'
              }}
            >
              <div 
                style={{
                  fontSize: '14px',
                  opacity: 0.7,
                  textAlign: 'center',
                  marginTop: '80px'
                }}
              >
                Start a conversation...
              </div>
            </div>

            {/* Message input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                style={{
                  padding: '12px 16px',
                  background: 'rgba(0, 191, 255, 0.1)',
                  border: '1px solid #00BFFF40',
                  borderRadius: 25,
                  color: '#00BFFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && chatMessage.trim()) {
                    try { sfx.play('click', 0.3); } catch {}
                    setChatMessage('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (chatMessage.trim()) {
                    try { sfx.play('click', 0.3); } catch {}
                    setChatMessage('');
                  }
                }}
                disabled={!chatMessage.trim()}
                style={{
                  padding: '12px 20px',
                  background: chatMessage.trim() ? '#00BFFF20' : 'rgba(0, 191, 255, 0.1)',
                  border: '1px solid #00BFFF40',
                  borderRadius: 25,
                  color: '#00BFFF',
                  fontSize: '14px',
                  cursor: chatMessage.trim() ? 'pointer' : 'not-allowed',
                  opacity: chatMessage.trim() ? 1 : 0.5
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

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
              width: 'min(85vw, 400px)',
              minHeight: '350px',
              padding: '20px',
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
            <div className="flex flex-col items-center space-y-4">
              {/* User element icon - large */}
              <div className="relative">
                <div 
                  className="w-20 h-20 rounded-full overflow-hidden border-2 shadow-lg"
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
                className="text-2xl font-bold text-center"
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
              <div className="flex space-x-3 w-full pt-4">
                {/* Cards button */}
                <button
                  onClick={() => {
                    try { sfx.play('click', 0.4); } catch {}
                    setShowProfilePopup(false);
                    setShowCardsModal(true);
                  }}
                  className="flex-1 py-3 px-4 rounded-lg border-2 hover:scale-105 transition-all duration-200"
                  style={{
                    background: 'rgba(0, 191, 255, 0.1)',
                    borderColor: '#00BFFF',
                    color: '#00BFFF',
                    textShadow: '0 0 6px #00BFFF',
                    boxShadow: '0 0 10px #00BFFF40'
                  }}
                >
                  <div className="text-center">
                    <div className="text-lg font-bold">CARDS</div>
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
                  className="flex-1 py-3 px-4 rounded-lg border-2 hover:scale-105 transition-all duration-200"
                  style={{
                    background: 'rgba(255, 105, 180, 0.1)',
                    borderColor: '#FF69B4',
                    color: '#FF69B4',
                    textShadow: '0 0 6px #FF69B4',
                    boxShadow: '0 0 10px #FF69B440'
                  }}
                >
                  <div className="text-center">
                    <div className="text-lg font-bold">BADGES</div>
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
        className="fixed inset-0 z-[2147483647] flex items-center justify-center"
        style={{ paddingTop: '0px' }}
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
          
          {/* Text button */}
          <button
            onClick={() => {
              try { sfx.play('click', 0.4); } catch {}
              setShowTextChat(!showTextChat);
            }}
            className="absolute top-2 left-4 hover:opacity-80 cursor-pointer w-8 h-8 rounded-full border flex items-center justify-center overflow-hidden"
            style={{ 
              borderColor: `${glowColor}80`,
              boxShadow: `0 0 15px ${glowColor}80, 0 0 25px ${glowColor}50, 0 0 35px ${glowColor}30`,
              background: `${glowColor}10`,
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
          <div className="relative">
            {children}
          </div>
        </div>
      </div>

      {/* Cards Modal - opened from profile popup */}
      {showCardsModal && (
        <BinderModal 
          open={showCardsModal}
          onClose={() => setShowCardsModal(false)}
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
