"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ElementIcon } from '@/lib/elementIcons';
import CodeModal from '@/components/CodeModal';
import BinderModal from '@/components/BinderModal';
import BadgesModal from '@/components/BadgesModal';
import JourneyButton from '@/components/JourneyButton';
import BadgesButton from '@/components/BadgesButton';
import BinderButton from '@/components/BinderButton';
import CodeButton from '@/components/CodeButton';
import { sfx } from '@/lib/sfx';
import { track as trackAnalytics } from '@/lib/analytics';
import { createPortal } from 'react-dom';

interface Profile {
  id: string;
  display_name: string | null;
  hearts: number | null;
  element: string | null;
}

const ELEMENTS = [
  { name: 'heart', label: 'Heart', color: '#FF69B4', innerGlow: '#FF1493' },
  { name: 'water', label: 'Water', color: '#00BFFF', innerGlow: '#0080FF' },
  { name: 'lightning', label: 'Lightning', color: '#FFD700', innerGlow: '#FFFF00' },
  { name: 'darkness', label: 'Darkness', color: '#9400D3', innerGlow: '#FFFFFF' }
];

interface ProfileBarProps {
  onCodeClick?: () => void;
  onDigitalBinderClick?: () => void;
  onBadgesClick?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
  onBeamColorChange?: (color: string) => void;
  hasEnteredHeartverse?: boolean;
}

export default function ProfileBar({
  onCodeClick,
  onDigitalBinderClick, 
  onBadgesClick,
  onCloseBlueDisplay,
  onOpenBlueDisplay,
  onBeamColorChange,
  hasEnteredHeartverse = false
}: ProfileBarProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [elementDropdownOpen, setElementDropdownOpen] = useState(false);
  
  // Modal states
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isBinderOpen, setIsBinderOpen] = useState(false);
  const [isBadgesOpen, setIsBadgesOpen] = useState(false);

  // Heart popover states
  const [showHeartPopover, setShowHeartPopover] = useState(false);
  const heartBtnRef = useRef<HTMLButtonElement>(null);
  const [heartPopoverPos, setHeartPopoverPos] = useState<{left: number, top: number, width?: number, height?: number} | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        // Demo user fallback
        setProfile({
          id: 'demo',
          display_name: 'DEMO user',
          hearts: 0,
          element: 'heart'
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Demo user fallback
      setProfile({
        id: 'demo',
        display_name: 'DEMO user', 
        hearts: 0,
        element: 'heart'
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateElement(element: string) {
    try {
      // Play flip sound when selecting an element
      sfx.play('flip', 0.8);
      
      const res = await fetch('/api/profile/element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_element: element })
      });
      
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, element } : null);
        setElementDropdownOpen(false);
      }
    } catch (error) {
      console.error('Failed to update element:', error);
    }
  }

  const openHeartPopover = () => {
    try { sfx.play('click', 0.4); } catch {}
    try {
      const r = heartBtnRef.current?.getBoundingClientRect?.();
      if (r && typeof window !== 'undefined') {
        let top = r.bottom + 8;
        top = Math.max(8, top);
        let height = Math.max(240, Math.min(560, window.innerHeight * 0.46));
        // Position from center of the button
        let left = r.left + r.width/2;
        // Account for popover width (around 300px) to prevent overflow
        left = Math.max(150, Math.min(left, window.innerWidth - 150));
        setHeartPopoverPos({ left, top, height });
      }
    } catch {}
    setShowHeartPopover(true);
  };

  // Close heart popover on outside click / Escape
  useEffect(() => {
    if (!showHeartPopover) return;
    const onDocDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      const withinBtn = heartBtnRef.current && t && heartBtnRef.current.contains(t);
      const dialog = document.querySelector('[aria-label="HEART PROFILE"]');
      const withinDialog = dialog && t && dialog.contains(t);
      if (!withinBtn && !withinDialog) { 
        try { sfx.play('close', 0.4); } catch {}; 
        setShowHeartPopover(false); 
      }
    };
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') { 
        try { sfx.play('close', 0.4); } catch {}; 
        setShowHeartPopover(false); 
      } 
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showHeartPopover]);


  if (loading) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200] h-16 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between h-full px-6">
          <div className="animate-pulse flex items-center space-x-4">
            <div className="w-10 h-10 bg-white/20 rounded-full"></div>
            <div className="w-24 h-4 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const currentElement = profile?.element || 'heart';
  const displayName = profile?.display_name || 'DEMO user';
  const heartCoins = profile?.hearts || 0;
  const currentElementData = ELEMENTS.find(e => e.name === currentElement) || ELEMENTS[0];

  // Get username text color based on selected element
  const getUsernameColor = (element: string) => {
    switch (element) {
      case 'heart': return '#FF69B4'; // Pink
      case 'water': return '#00BFFF'; // Blue
      case 'lightning': return '#FFD700'; // Yellow
      case 'darkness': return '#FFFFFF'; // White
      default: return '#FFFFFF';
    }
  };

  // Don't render the profile bar at all until user has entered the Heartverse
  if (!hasEnteredHeartverse) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-16 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center justify-between h-full pl-4 pr-6">
        {/* Left Side */}
        <div className="flex items-center space-x-4">
          {/* Element Selector */}
          <div className="relative">
            <motion.button
              onClick={() => {
                // Play close sound when opening/closing element selector
                sfx.play('close', 0.8);
                setElementDropdownOpen(!elementDropdownOpen);
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 bg-black/50 relative overflow-hidden"
              style={{ 
                boxShadow: `inset 0 0 15px ${currentElementData.innerGlow}60, inset 0 0 25px ${currentElementData.innerGlow}40`
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ElementIcon 
                name={currentElement} 
                width={32} 
                height={32}
                className="relative z-10 w-full h-full object-contain"
              />
            </motion.button>

            {/* Element Dropdown */}
            <AnimatePresence>
              {elementDropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => setElementDropdownOpen(false)}
                  />
                  
                  <motion.div
                    className="absolute top-12 left-0 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-3 z-20"
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center space-x-3">
                      {ELEMENTS.map((element) => (
                        <motion.button
                          key={element.name}
                          onClick={() => updateElement(element.name)}
                          className="w-12 h-12 rounded-full flex items-center justify-center border border-white/20 bg-black/50 relative overflow-hidden"
                          style={{ 
                            boxShadow: `inset 0 0 15px ${element.innerGlow}60, inset 0 0 25px ${element.innerGlow}40`
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ElementIcon 
                            name={element.name} 
                            width={40} 
                            height={40}
                            className="relative z-10 w-full h-full object-contain"
                          />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Username */}
          <span 
            className="font-medium text-lg relative"
            style={{ 
              color: getUsernameColor(currentElement),
              textShadow: `
                0 0 5px ${getUsernameColor(currentElement)},
                0 0 10px ${getUsernameColor(currentElement)},
                0 0 15px ${getUsernameColor(currentElement)},
                0 0 20px ${getUsernameColor(currentElement)},
                0 0 25px ${getUsernameColor(currentElement)}
              `,
              filter: 'brightness(1.2)'
            }}
          >
            {displayName}
          </span>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Journey Button */}
            <JourneyButton 
              onHoverSound={() => sfx.play('hover', 0.8)}
              onCloseBlueDisplay={onCloseBlueDisplay}
              onOpenBlueDisplay={onOpenBlueDisplay}
              cumulativeHeartCoins={heartCoins}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-2">
          {/* Code Button */}
          <CodeButton 
            onHoverSound={() => sfx.play('hover', 0.8)}
            onCloseBlueDisplay={onCloseBlueDisplay}
            onOpenBlueDisplay={onOpenBlueDisplay}
          />

          {/* Digital Binder Button */}
          <BinderButton 
            onHoverSound={() => sfx.play('hover', 0.8)}
            onCloseBlueDisplay={onCloseBlueDisplay}
            onOpenBlueDisplay={onOpenBlueDisplay}
          />

          {/* Badges Button */}
          <BadgesButton 
            onHoverSound={() => sfx.play('hover', 0.8)}
            onCloseBlueDisplay={onCloseBlueDisplay}
            onOpenBlueDisplay={onOpenBlueDisplay}
          />

          {/* Heart Coin Button */}
          <motion.button
            ref={heartBtnRef}
            onClick={() => {
              try {
                trackAnalytics('heart_coin_clicked', { 
                  song_slug: 'profile_bar', 
                  payload: { 
                    song_title: 'Profile Bar', 
                    location: 'profile_bar_heart_coin' 
                  } 
                });
              } catch {}
              if (showHeartPopover) { 
                setShowHeartPopover(false); 
                return; 
              }
              openHeartPopover();
            }}
            onMouseEnter={() => sfx.play('hover', 0.8)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-black/50 border border-white/20 hover:border-white/40 transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Heart Coins & Quests"
            aria-label="Heart Coins & Quests"
          >
            <img 
              src="/elements/heart-coin.png" 
              alt="Heart Coins" 
              className="w-4 h-4"
            />
            <span className="text-white text-sm font-medium">{heartCoins}</span>
          </motion.button>

        </div>
      </div>

      {/* Profile Modals - Each uses its own specific modal */}
      {isCodeOpen && (
        <CodeModal open={isCodeOpen} onClose={() => setIsCodeOpen(false)} />
      )}

      {isBinderOpen && (
        <BinderModal open={isBinderOpen} onClose={() => setIsBinderOpen(false)} />
      )}

      {isBadgesOpen && (
        <BadgesModal open={isBadgesOpen} onClose={() => setIsBadgesOpen(false)} />
      )}

      {/* Heart Coin Popover */}
      {typeof window !== 'undefined' && showHeartPopover && heartPopoverPos && createPortal(
        <div
          role="dialog"
          aria-label="HEART PROFILE"
          className="heart-hologram"
          style={{
            position: 'fixed',
            left: heartPopoverPos.left,
            top: heartPopoverPos.top,
            transform: 'translateX(-50%)',
            padding: '16px',
            borderRadius: 14,
            background: 'radial-gradient(140% 160% at 50% 0%, rgba(25,227,255,0.15), rgba(14,168,208,0.10) 35%, rgba(6,40,55,0.85) 100%)',
            border: '1px solid rgba(25,227,255,0.45)',
            boxShadow: '0 18px 46px rgba(0,0,0,0.35), 0 0 26px rgba(25,227,255,0.35)',
            backdropFilter: 'blur(8px) saturate(1.15)',
            color: '#fff',
            zIndex: 2147483647,
            width: 'min(90vw, 400px)',
            height: heartPopoverPos.height || 'auto',
            maxHeight: '60vh',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
          onKeyDown={(e) => { 
            if (e.key === 'Escape') { 
              try { sfx.play('close', 0.4); } catch {}; 
              setShowHeartPopover(false); 
            } 
          }}
        >
          {/* Close button */}
          <button
            aria-label="Close"
            title="Close"
            onClick={() => { 
              try { sfx.play('close', 0.4); } catch {}; 
              setShowHeartPopover(false); 
            }}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              borderRadius: 9999,
              background: 'rgba(0,0,0,0.35)',
              border: '2px solid rgba(33,150,243,0.85)',
              color: '#FF3EA5',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>

          {/* Header with heart coin count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, marginTop: 8 }}>
            <img 
              src="/elements/heart-coin.png" 
              alt="Heart Coins" 
              style={{ width: 32, height: 32 }}
              className="heart-coin-glow"
            />
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 'bold', color: '#19E3FF' }}>
                Heart Coins
              </h3>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 'bold', color: '#fff' }}>
                {heartCoins}
              </p>
            </div>
          </div>

          {/* Quest section */}
          <div style={{ marginTop: 16 }}>
            <h4 style={{ 
              margin: '0 0 12px 0', 
              fontSize: 14, 
              fontWeight: 'bold', 
              color: '#19E3FF',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Quests & Achievements
            </h4>
            <div style={{ 
              padding: '12px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 8,
              border: '1px solid rgba(25,227,255,0.2)'
            }}>
              <p style={{ 
                margin: 0,
                fontSize: 13,
                color: 'rgba(255,255,255,0.8)',
                fontStyle: 'italic'
              }}>
                Complete quests to earn more Heart Coins and unlock exclusive rewards!
              </p>
              {/* TODO: Add actual quest list component here */}
              <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                • Listen to 5 songs - <span style={{ color: '#19E3FF' }}>+10 Hearts</span><br/>
                • Share a song - <span style={{ color: '#19E3FF' }}>+5 Hearts</span><br/>
                • Join the community - <span style={{ color: '#19E3FF' }}>+15 Hearts</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}