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
import ElementalButton from '@/components/ElementalButton';
import { sfx } from '@/lib/sfx';
import { track as trackAnalytics } from '@/lib/analytics';
import { createPortal } from 'react-dom';
import QuestList from '@/components/QuestList';

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
  const [showQuests, setShowQuests] = useState(false);
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

  // Close quest modal on outside click / Escape
  useEffect(() => {
    if (!showQuests) return;
    const onDocDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      const dialog = document.querySelector('.quest-hologram-container');
      const withinDialog = dialog && t && dialog.contains(t);
      if (!withinDialog) { 
        try { sfx.play('close', 0.4); } catch {}; 
        setShowQuests(false); 
      }
    };
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') { 
        try { sfx.play('close', 0.4); } catch {}; 
        setShowQuests(false); 
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
  }, [showQuests]);


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

            {/* Elemental Button */}
            <ElementalButton 
              onHoverSound={() => sfx.play('hover', 0.8)}
              onCloseBlueDisplay={onCloseBlueDisplay}
              onOpenBlueDisplay={onOpenBlueDisplay}
              onBeamColorChange={onBeamColorChange}
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

      {/* Hologram base glow - wider and stronger */}
      {showHeartPopover && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[2147483646] flex items-center justify-center"
          style={{
            pointerEvents: 'none',
            paddingTop: '80px'
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
        </div>,
        document.body
      )}
      
      {/* Heart Coin Modal - holographic popup */}
      {showHeartPopover && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          style={{
            paddingTop: '80px'
          }}
        >
          <div
            className="heart-coin-hologram-container"
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
              setShowHeartPopover(false);
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
            MANAGE YOUR HEART COINS ♥
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
              whiteSpace: 'pre-wrap' as const, 
              lineHeight: 1.2, 
              fontSize: 14, 
              color: '#00FFFF', 
              textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(0,255,255,0.6)', 
              marginTop: '-4px' 
            }}
          >
            HeartCoins are the energy of the Heartverse. You earn them by exploring, connecting, and showing up.
          </div>

          {/* Heart Coin Stats */}
          <div className="relative mt-1">
            <div className="grid grid-cols-2 gap-4">
              {/* Balance Display */}
              <div className="text-center">
                <div 
                  className="w-16 h-16 mx-auto mb-2 rounded-full border-2 border-cyan-400/60 overflow-hidden"
                  style={{
                    background: 'rgba(0,255,255,0.1)',
                    boxShadow: '0 0 15px rgba(0,255,255,0.3)',
                  }}
                >
                  <img
                    src="/elements/heart-coin.png"
                    alt="Heart Coin"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
                <div 
                  className="text-xs mb-1"
                  style={{ 
                    color: '#FFFFFF', 
                    textShadow: '0 0 4px rgba(255,255,255,0.7)' 
                  }}
                >
                  BALANCE
                </div>
                <div 
                  className="text-lg font-bold"
                  style={{ 
                    color: '#FF69B4', 
                    textShadow: '0 0 8px rgba(255,105,180,0.8)' 
                  }}
                >
                  {heartCoins}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="text-center space-y-2">
                <button
                  onClick={() => {
                    try { sfx.play('click', 0.8); } catch {}
                    // TODO: Open store popup
                    console.log("Open store popup");
                  }}
                  className="w-full px-3 py-2 bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300 rounded text-xs transition-all duration-200"
                  style={{
                    boxShadow: '0 0 10px rgba(236, 72, 153, 0.3)',
                    textShadow: '0 0 4px rgba(236, 72, 153, 0.6)'
                  }}
                >
                  USE MY HEARTS
                </button>
                <button
                  onClick={() => {
                    try { sfx.play('click', 0.8); } catch {}
                    console.log('EARN MORE HEARTS button clicked, setting showQuests to true');
                    setShowQuests(true);
                  }}
                  className="w-full px-3 py-1 bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-300 rounded text-xs transition-all duration-200"
                  style={{
                    boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
                    textShadow: '0 0 4px rgba(0, 255, 255, 0.6)'
                  }}
                >
                  EARN MORE HEARTS
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>,
        document.body
      )}

      {/* Quest List Modal */}
      {showQuests && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[2147483648] flex items-center justify-center"
          style={{
            paddingTop: '80px'
          }}
        >
          <div
            className="quest-hologram-container"
            style={{
              width: 'min(92vw, 800px)',
              height: '70vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(0,255,255,0.55)',
              boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#00FFFF',
              position: 'relative',
              overflow: 'auto'
            }}
          >
            {/* Quest List Content */}
            <QuestList 
              onBack={() => setShowQuests(false)}
              onOpenStore={() => {
                setShowQuests(false);
                // TODO: Open store popup
                console.log("Open store popup from quest list");
              }}
            />
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}