"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ElementIcon } from '@/lib/elementIcons';
import CodeModal from '@/components/CodeModal';
import BinderModal from '@/components/BinderModal';
import BadgesModal from '@/components/BadgesModal';
import HeartCoinModal from '@/components/HeartCoinModal';
import TestModal from '@/components/TestModal';
import JourneyButton from '@/components/JourneyButton';
import BadgesButton from '@/components/BadgesButton';
import { sfx } from '@/lib/sfx';

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
  onHeartCoinClick?: () => void;
  onTestClick?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
}

export default function ProfileBar({
  onCodeClick,
  onDigitalBinderClick, 
  onBadgesClick,
  onHeartCoinClick,
  onTestClick,
  onCloseBlueDisplay,
  onOpenBlueDisplay
}: ProfileBarProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [elementDropdownOpen, setElementDropdownOpen] = useState(false);
  
  // Modal states
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isBinderOpen, setIsBinderOpen] = useState(false);
  const [isBadgesOpen, setIsBadgesOpen] = useState(false);
  const [isHeartCoinOpen, setIsHeartCoinOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);

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
          display_name: 'Demo User',
          hearts: 0,
          element: 'heart'
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Demo user fallback
      setProfile({
        id: 'demo',
        display_name: 'Demo User', 
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
  const displayName = profile?.display_name || 'Demo User';
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

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-16 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center justify-between h-full px-6">
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
            className="font-medium text-lg"
            style={{ color: getUsernameColor(currentElement) }}
          >
            {displayName}
          </span>

          {/* Journey Button */}
          <JourneyButton 
            onHoverSound={() => sfx.play('hover', 0.8)}
            onCloseBlueDisplay={onCloseBlueDisplay}
            onOpenBlueDisplay={onOpenBlueDisplay}
            style={{ fontSize: '12px', padding: '4px 8px' }}
          />

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Code Button */}
            <button
              onClick={() => {
                setIsCodeOpen(true);
                onCodeClick?.();
              }}
              className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
              style={{
                boxShadow: '0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(255, 255, 255, 0.15)'
              }}
            >
              CODE
            </button>
            
            {/* Digital Binder Button */}
            <button
              onClick={() => {
                setIsBinderOpen(true);
                onDigitalBinderClick?.();
              }}
              className="p-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/20 w-12 h-10"
              style={{
                boxShadow: '0 0 20px rgba(252, 84, 175, 0.4), 0 0 40px rgba(252, 84, 175, 0.2)'
              }}
            >
              <img
                src="/elements/binder.png"
                alt="Digital Binder"
                className="w-full h-full object-cover rounded"
                draggable={false}
              />
            </button>
            
            
            {/* Test Button */}
            <button
              onClick={() => {
                sfx.play('click', 0.8);
                setIsTestOpen(true);
                onTestClick?.();
              }}
              className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/40 text-green-300 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20"
              style={{
                boxShadow: '0 0 20px rgba(34, 197, 94, 0.3), 0 0 40px rgba(34, 197, 94, 0.15)'
              }}
            >
              TEST
            </button>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-3">
          {/* Badges Button */}
          <BadgesButton 
            onHoverSound={() => sfx.play('hover', 0.8)}
            onCloseBlueDisplay={onCloseBlueDisplay}
            onOpenBlueDisplay={onOpenBlueDisplay}
            style={{ fontSize: '12px', padding: '4px 8px' }}
          />

          {/* HeartCoin Button & Balance */}
          <motion.button
            onClick={() => {
              setIsHeartCoinOpen(true);
              onHeartCoinClick?.();
            }}
            className="flex items-center space-x-2 px-2 py-2 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/40 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-pink-500/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-8 h-8 p-0.5">
              <img
                src="/elements/heart-coin.png"
                alt="HeartCoin"
                className="w-full h-full object-cover rounded-sm"
                draggable={false}
              />
            </div>
            <span className="text-pink-300 font-medium">{heartCoins}</span>
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

      {isHeartCoinOpen && (
        <HeartCoinModal open={isHeartCoinOpen} onClose={() => setIsHeartCoinOpen(false)} />
      )}

      {isTestOpen && (
        <TestModal open={isTestOpen} onClose={() => setIsTestOpen(false)} />
      )}
    </div>
  );
}