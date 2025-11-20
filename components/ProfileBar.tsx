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
import HeartCoinButton from '@/components/HeartCoinButton';
import CodeButton from '@/components/CodeButton';
import ElementalButton from '@/components/ElementalButton';
import { sfx } from '@/lib/sfx';
import { track as trackAnalytics } from '@/lib/analytics';
import { createPortal } from 'react-dom';
import QuestList from '@/components/QuestList';
import { supabaseBrowser } from '@/lib/supabase-browser';

interface Profile {
  id: string;
  name: string | null;
  element: string | null;
  hearts?: number | null;
  phone?: string | null;
  email?: string | null;
  profile_complete?: boolean | null;
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
  savedAlienName?: string; // Name from HUD signup flow
  savedAlienElement?: string; // Element from HUD signup flow
  profileRefreshTrigger?: number; // Increment this to trigger profile refresh
}

export default function ProfileBar({
  onCodeClick,
  onDigitalBinderClick, 
  onBadgesClick,
  onCloseBlueDisplay,
  onOpenBlueDisplay,
  onBeamColorChange,
  hasEnteredHeartverse = false,
  savedAlienName,
  savedAlienElement,
  profileRefreshTrigger = 0
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

  // Refetch profile when profileRefreshTrigger changes
  useEffect(() => {
    if (profileRefreshTrigger > 0) {
      fetchProfile();
    }
  }, [profileRefreshTrigger]);

  async function fetchProfile() {
    try {
      // Try to fetch the most recent completed profile from Supabase
      const { data, error } = await supabaseBrowser
        .from('profiles')
        .select('*, heart_coins_current, heart_coins_total')
        .eq('profile_complete', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Supabase profile fetch error:', error);
        // Demo user fallback
        setProfile({
          id: 'demo',
          name: 'ALIEN',
          hearts: 0,
          element: 'heart'
        });
      } else if (data && data.length > 0) {
        // Use the most recent completed profile
        const profileData = data[0];
        setProfile({
          id: profileData.id,
          name: profileData.name,
          element: profileData.element,
          hearts: profileData.heart_coins_current || 0, // Use actual heart coin count
          phone: profileData.phone,
          email: profileData.email,
          profile_complete: profileData.profile_complete
        });
      } else {
        // No completed profile found, use fallback
        setProfile({
          id: 'demo',
          name: 'ALIEN',
          hearts: 0,
          element: 'heart'
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Demo user fallback
      setProfile({
        id: 'demo',
        name: 'ALIEN',
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

  const currentElement = profile?.element || savedAlienElement || 'heart';
  const displayName = profile?.name || savedAlienName || 'ALIEN';
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
    <div 
      className="fixed top-0 left-0 right-0 z-[200] h-16 bg-black/80 backdrop-blur-md border-b border-white/10 transition-opacity duration-500 ease-in-out"
      style={{
        opacity: hasEnteredHeartverse ? 1 : 0,
        pointerEvents: hasEnteredHeartverse ? 'auto' : 'none'
      }}
    >
      <div className="relative h-full">
        {/* Elemental Button - Top Left */}
        <div className="absolute top-2 left-1 z-10">
          <ElementalButton 
            onHoverSound={() => sfx.play('hover', 0.8)}
            onCloseBlueDisplay={onCloseBlueDisplay}
            onOpenBlueDisplay={onOpenBlueDisplay}
            onBeamColorChange={onBeamColorChange}
            element={currentElement}
            onElementSelect={updateElement}
          />
        </div>

        {/* Main Flex Layout */}
        <div className="flex items-center justify-between h-full pl-12 sm:pl-16 pr-2 min-w-0">
          {/* Left Side */}
          <div className="flex items-center min-w-0 overflow-hidden flex-1">
            {/* Username */}
            <span 
              className="font-medium text-lg relative flex-shrink-0 ml-2"
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

            {/* Journey Button */}
            <div className="ml-12">
              <JourneyButton 
                onHoverSound={() => sfx.play('hover', 0.8)}
                onCloseBlueDisplay={onCloseBlueDisplay}
                onOpenBlueDisplay={onOpenBlueDisplay}
                cumulativeHeartCoins={heartCoins}
              />
            </div>
          </div>

          {/* Center - Code Button */}
          <div className="flex-shrink-0 -mr-3">
            <CodeButton 
              onHoverSound={() => sfx.play('hover', 0.8)}
              onCloseBlueDisplay={onCloseBlueDisplay}
              onOpenBlueDisplay={onOpenBlueDisplay}
            />
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-0.5 sm:space-x-1 flex-shrink-0 mr-0">
            {/* Badges Button */}
            <div className="ml-3">
              <BadgesButton 
                onHoverSound={() => sfx.play('hover', 0.8)}
                onCloseBlueDisplay={onCloseBlueDisplay}
                onOpenBlueDisplay={onOpenBlueDisplay}
              />
            </div>

            {/* Digital Binder Button */}
            <div className="-ml-6">
              <BinderButton 
                onHoverSound={() => sfx.play('hover', 0.8)}
                onCloseBlueDisplay={onCloseBlueDisplay}
                onOpenBlueDisplay={onOpenBlueDisplay}
              />
            </div>

            {/* Heart Coin Button with Count */}
            <div className="flex items-center space-x-0.5 -ml-16">
              <HeartCoinButton 
                onHoverSound={() => sfx.play('hover', 0.8)}
                onCloseBlueDisplay={onCloseBlueDisplay}
                onOpenBlueDisplay={onOpenBlueDisplay}
              />
              
              {/* Heart Coin Count */}
              <span 
                className="font-bold text-lg"
                style={{ 
                  color: '#FFFFFF',
                  textShadow: `
                    0 0 5px #FFFFFF,
                    0 0 10px #FFFFFF,
                    0 0 15px #FFFFFF,
                    0 0 20px #FFFFFF,
                    0 0 25px #FFFFFF,
                    0 0 30px #FFFFFF
                  `,
                  filter: 'brightness(1.5)',
                  letterSpacing: '0.05em'
                }}
              >
                {heartCoins}
              </span>
            </div>

          </div>
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
            paddingTop: '40px'
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
            paddingTop: '40px'
          }}
        >
          <div
            className="heart-coin-hologram-container"
            style={{
              width: 'min(92vw, 700px)',
              height: '28vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(0,255,255,0.55)',
              boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#00FFFF',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
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
              <div className="text-left">
                <div 
                  className="w-16 h-16 mb-2 rounded-full border-2 border-cyan-400/60 overflow-hidden"
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
            paddingTop: '40px'
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