"use client";

import { ReactNode, useState } from 'react';
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
  const [showTextChat, setShowTextChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

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
              <div 
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  textShadow: '0 0 8px #00BFFF80'
                }}
              >
                Signal Chat
              </div>
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
    </>,
    document.body
  );
}
