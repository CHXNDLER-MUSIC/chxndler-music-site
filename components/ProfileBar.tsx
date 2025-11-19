"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ElementIcon } from '@/lib/elementIcons';
import { supabaseClient } from "@/lib/supabaseClient";
import SharedModal from '@/components/SharedModal';

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

  // Form states for identical Join Us content
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

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

  // Identical functions from LoginModal
  async function signInWithGoogle() {
    setError(null);
    setMessage(null);
    setFormLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message || "Failed to start sign-in");
    } finally {
      setFormLoading(false);
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setFormLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) throw error;
      setMessage("Check your email for a magic link.");
    } catch (e: any) {
      setError(e?.message || "Failed to send magic link");
    } finally {
      setFormLoading(false);
    }
  }

  async function signInWithPhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setFormLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        phone,
      });
      if (error) throw error;
      setMessage("Check your phone for a verification code.");
    } catch (e: any) {
      setError(e?.message || "Failed to send SMS");
    } finally {
      setFormLoading(false);
    }
  }

  // Identical content from LoginModal
  const renderJoinUsContent = () => (
    <>
      <p className="relative text-sm text-white/80 mb-3">Choose your connection method.</p>

      {error && (
        <div className="relative mb-2 rounded-md bg-red-50/10 border border-red-200/40 p-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className="relative mb-2 rounded-md bg-green-50/10 border border-green-200/40 p-2 text-sm text-green-200">
          {message}
        </div>
      )}

      <div className="relative space-y-3">
        <button
          onClick={signInWithGoogle}
          disabled={formLoading}
          className="w-full inline-flex items-center justify-center rounded-lg bg-[#FC54AF] px-4 py-3 text-sm font-semibold text-black hover:brightness-110 transition disabled:opacity-50"
        >
          CONNECT with Google
        </button>

        <div className="relative flex items-center text-white/50">
          <div className="flex-grow border-t border-white/20" />
          <span className="mx-3 text-xs uppercase">or</span>
          <div className="flex-grow border-t border-white/20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Phone Login Section */}
          <form onSubmit={signInWithPhone} className="space-y-2">
            <label htmlFor="profile-phone" className="block text-sm font-medium text-white/90">
              Phone Number
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              required
              className="block w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 shadow-sm focus:border-[#38B6FF] focus:outline-none"
            />
            <button
              type="submit"
              disabled={formLoading || phone.length === 0}
              className="w-full inline-flex items-center justify-center rounded-lg bg-[#FC54AF]/20 border-2 border-[#FC54AF]/60 px-4 py-3 text-sm font-medium text-white hover:bg-[#FC54AF]/30 transition disabled:opacity-50"
              style={{
                boxShadow: formLoading || phone.length === 0 
                  ? 'none' 
                  : '0 0 20px rgba(252,84,175,0.6), 0 0 40px rgba(252,84,175,0.4), inset 0 0 10px rgba(252,84,175,0.2)'
              }}
            >
              CONNECT
            </button>
          </form>

          {/* Email Login Section */}
          <form onSubmit={signInWithEmail} className="space-y-2">
            <label htmlFor="profile-email" className="block text-sm font-medium text-white/90">
              Email Address
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="block w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 shadow-sm focus:border-[#38B6FF] focus:outline-none"
            />
            <button
              type="submit"
              disabled={formLoading || email.length === 0}
              className="w-full inline-flex items-center justify-center rounded-lg bg-[#FC54AF]/20 border-2 border-[#FC54AF]/60 px-4 py-3 text-sm font-medium text-white hover:bg-[#FC54AF]/30 transition disabled:opacity-50"
              style={{
                boxShadow: formLoading || email.length === 0 
                  ? 'none' 
                  : '0 0 20px rgba(252,84,175,0.6), 0 0 40px rgba(252,84,175,0.4), inset 0 0 10px rgba(252,84,175,0.2)'
              }}
            >
              CONNECT
            </button>
          </form>
        </div>
      </div>
    </>
  );

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

      {/* Profile Popups - All identical to Join Us popup */}
      <SharedModal
        open={codePopupOpen}
        onClose={() => setCodePopupOpen(false)}
        title="WELCOME BACK TO THE HEARTVERSE <3"
        ariaLabel="Sign in"
      >
        {renderJoinUsContent()}
      </SharedModal>

      <SharedModal
        open={digitalBinderPopupOpen}
        onClose={() => setDigitalBinderPopupOpen(false)}
        title="WELCOME BACK TO THE HEARTVERSE <3"
        ariaLabel="Sign in"
      >
        {renderJoinUsContent()}
      </SharedModal>

      <SharedModal
        open={badgesPopupOpen}
        onClose={() => setBadgesPopupOpen(false)}
        title="WELCOME BACK TO THE HEARTVERSE <3"
        ariaLabel="Sign in"
      >
        {renderJoinUsContent()}
      </SharedModal>

      <SharedModal
        open={heartCoinPopupOpen}
        onClose={() => setHeartCoinPopupOpen(false)}
        title="WELCOME BACK TO THE HEARTVERSE <3"
        ariaLabel="Sign in"
      >
        {renderJoinUsContent()}
      </SharedModal>
    </div>
  );
}