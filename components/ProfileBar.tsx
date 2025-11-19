"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ElementIcon } from '@/lib/elementIcons';
import ProfilePopup from '@/components/ProfilePopup';

interface Profile {
  id: string;
  display_name: string | null;
  hearts: number | null;
  element: string | null;
}

const ELEMENTS = [
  { name: 'heart', label: 'Heart', color: '#FF69B4' },
  { name: 'water', label: 'Water', color: '#00BFFF' },
  { name: 'lightning', label: 'Lightning', color: '#FFD700' },
  { name: 'darkness', label: 'Darkness', color: '#9400D3' }
];

interface ProfileBarProps {
  onCodeClick?: () => void;
  onDigitalBinderClick?: () => void;
  onBadgesClick?: () => void;
  onHeartCoinClick?: () => void;
}

export default function ProfileBar({
  onCodeClick,
  onDigitalBinderClick, 
  onBadgesClick,
  onHeartCoinClick
}: ProfileBarProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [elementDropdownOpen, setElementDropdownOpen] = useState(false);
  
  // Popup states
  const [codePopupOpen, setCodePopupOpen] = useState(false);
  const [digitalBinderPopupOpen, setDigitalBinderPopupOpen] = useState(false);
  const [badgesPopupOpen, setBadgesPopupOpen] = useState(false);
  const [heartCoinPopupOpen, setHeartCoinPopupOpen] = useState(false);

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

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-16 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left Side */}
        <div className="flex items-center space-x-4">
          {/* Element Selector */}
          <div className="relative">
            <motion.button
              onClick={() => setElementDropdownOpen(!elementDropdownOpen)}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 bg-black/50 relative overflow-hidden"
              style={{ 
                boxShadow: `0 0 20px ${currentElementData.color}40, inset 0 0 20px ${currentElementData.color}20`
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ElementIcon 
                name={currentElement} 
                width={24} 
                height={24}
                className="relative z-10"
              />
              <div 
                className="absolute inset-0 rounded-full opacity-30"
                style={{ 
                  background: `radial-gradient(circle, ${currentElementData.color}40 0%, transparent 70%)`
                }}
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
                    className="absolute top-12 left-0 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-4 z-20"
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      {ELEMENTS.map((element) => (
                        <motion.button
                          key={element.name}
                          onClick={() => updateElement(element.name)}
                          className="w-16 h-16 rounded-full flex items-center justify-center border border-white/20 bg-black/50 relative overflow-hidden"
                          style={{ 
                            boxShadow: `0 0 20px ${element.color}40, inset 0 0 20px ${element.color}20`
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ElementIcon 
                            name={element.name} 
                            width={32} 
                            height={32}
                            className="relative z-10"
                          />
                          <div 
                            className="absolute inset-0 rounded-full opacity-30"
                            style={{ 
                              background: `radial-gradient(circle, ${element.color}60 0%, transparent 70%)`
                            }}
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
          <span className="text-white font-medium text-lg">{displayName}</span>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Code Button */}
            <button
              onClick={() => {
                setCodePopupOpen(true);
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
                setDigitalBinderPopupOpen(true);
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
            
            {/* Badges Button */}
            <button
              onClick={() => {
                setBadgesPopupOpen(true);
                onBadgesClick?.();
              }}
              className="p-1 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/40 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20 w-12 h-10"
              style={{
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)'
              }}
            >
              <img
                src="/elements/badges.png"
                alt="Badges"
                className="w-full h-full object-cover rounded"
                draggable={false}
              />
            </button>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-3">
          {/* HeartCoin Button & Balance */}
          <motion.button
            onClick={() => {
              setHeartCoinPopupOpen(true);
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

      {/* Profile Popups */}
      <ProfilePopup
        open={codePopupOpen}
        onClose={() => setCodePopupOpen(false)}
        title="HeartCode"
      >
        <p className="text-sm text-white/80 mb-4">
          Enter or view your HeartCodes here.
        </p>
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-blue-600/10 border border-blue-500/30">
            <h3 className="text-blue-300 font-semibold mb-2">Your HeartCodes</h3>
            <p className="text-white/70 text-sm">Coming soon - manage your personal HeartCodes for exclusive access and experiences.</p>
          </div>
        </div>
      </ProfilePopup>

      <ProfilePopup
        open={digitalBinderPopupOpen}
        onClose={() => setDigitalBinderPopupOpen(false)}
        title="Digital Binder"
      >
        <p className="text-sm text-white/80 mb-4">
          View and organize your Heartverse cards here.
        </p>
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-purple-600/10 border border-purple-500/30">
            <h3 className="text-purple-300 font-semibold mb-2">Card Collection</h3>
            <p className="text-white/70 text-sm">Your digital trading cards, holographic memories, and collectible items will appear here.</p>
          </div>
        </div>
      </ProfilePopup>

      <ProfilePopup
        open={badgesPopupOpen}
        onClose={() => setBadgesPopupOpen(false)}
        title="Badges"
      >
        <p className="text-sm text-white/80 mb-4">
          See your unlocked badges and progress.
        </p>
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-yellow-600/10 border border-yellow-500/30">
            <h3 className="text-yellow-300 font-semibold mb-2">Achievement Badges</h3>
            <p className="text-white/70 text-sm">Track your journey through the Heartverse with badges for completed quests, milestones, and special accomplishments.</p>
          </div>
        </div>
      </ProfilePopup>

      <ProfilePopup
        open={heartCoinPopupOpen}
        onClose={() => setHeartCoinPopupOpen(false)}
        title="HeartCoins"
      >
        <p className="text-sm text-white/80 mb-4">
          Your HeartCoin balance, history, and ways to earn more.
        </p>
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-pink-600/10 border border-pink-500/30">
            <h3 className="text-pink-300 font-semibold mb-2">Current Balance</h3>
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-6 h-6 p-0.5">
                <img
                  src="/elements/heart-coin.png"
                  alt="HeartCoin"
                  className="w-full h-full object-cover rounded"
                  draggable={false}
                />
              </div>
              <span className="text-2xl font-bold text-pink-300">{heartCoins}</span>
              <span className="text-white/70">HeartCoins</span>
            </div>
            <p className="text-white/70 text-sm">Use HeartCoins to unlock exclusive content, purchase digital collectibles, and access special experiences in the Heartverse.</p>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/20">
            <h4 className="text-white font-semibold mb-2">Ways to Earn</h4>
            <ul className="text-white/70 text-sm space-y-1">
              <li>• Complete daily quests</li>
              <li>• Participate in community events</li>
              <li>• Share content and invite friends</li>
              <li>• Purchase directly with real currency</li>
            </ul>
          </div>
        </div>
      </ProfilePopup>
    </div>
  );
}