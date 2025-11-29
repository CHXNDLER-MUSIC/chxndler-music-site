"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseClient } from '@/lib/supabaseClient';
import { chatService, getElementColor } from '@/lib/supabase/chat';
import { ElementIcon } from '@/lib/elementIcons';

/**
 * ProfileModal Component
 * Shows user profile details with badges, cards, and avatar editing
 */
export default function ProfileModal({ user, isOpen, onClose, isOwnProfile = false }) {
  const [profileData, setProfileData] = useState(null);
  const [badges, setBadges] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState(null);

  // Load full profile data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadProfileData();
    }
  }, [isOpen, user]);

  /**
   * Load complete profile data including badges and cards
   */
  const loadProfileData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Load profile details
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        return;
      }

      setProfileData(profile);

      // Load user's badges
      const { data: userBadges, error: badgeError } = await supabaseClient
        .from('user_badges')
        .select(`
          id,
          badge_id,
          awarded_at,
          badges (
            id,
            badge_name,
            description,
            icon_url
          )
        `)
        .eq('user_id', user.id);

      if (badgeError) {
        console.error('Error loading badges:', badgeError);
      } else {
        setBadges(userBadges || []);
      }

      // Load user's cards
      const { data: userCards, error: cardError } = await supabaseClient
        .from('user_cards')
        .select(`
          id,
          card_id,
          acquired_at,
          cards (
            id,
            card_name,
            element,
            rarity,
            image_url
          )
        `)
        .eq('user_id', user.id);

      if (cardError) {
        console.error('Error loading cards:', cardError);
      } else {
        setCards(userCards || []);
      }

    } catch (error) {
      console.error('Error in loadProfileData:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update user's avatar badge
   */
  const updateAvatarBadge = async (badgeId) => {
    try {
      const success = await chatService.updateAvatarBadge(badgeId);
      if (success) {
        setProfileData(prev => ({ ...prev, avatar_badge_id: badgeId }));
        setSelectedBadgeId(badgeId);
        setEditingAvatar(false);
      }
    } catch (error) {
      console.error('Error updating avatar badge:', error);
    }
  };

  if (!isOpen || !user) return null;

  const elementColor = getElementColor(user.element);
  const displayName = user.name || 'Anonymous';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-60 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md mx-4 max-h-[80vh] overflow-hidden rounded-xl"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(0, 0, 0, 0.95) 0%,
                rgba(0, 20, 40, 0.9) 50%,
                rgba(0, 0, 0, 0.95) 100%
              )
            `,
            border: `2px solid ${elementColor}60`,
            boxShadow: `
              0 0 50px ${elementColor}30,
              inset 0 0 50px rgba(255, 255, 255, 0.05)
            `
          }}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60">Loading profile...</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[80vh]">
              {/* Header */}
              <div className="p-6 border-b border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 
                    className="text-xl font-bold"
                    style={{
                      color: elementColor,
                      textShadow: `0 0 10px ${elementColor}60`
                    }}
                  >
                    {displayName}
                  </h2>
                  
                  <button
                    onClick={onClose}
                    className="text-white/70 hover:text-white transition-colors p-2 rounded-lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Avatar and Element */}
                <div className="flex items-center space-x-4">
                  <div 
                    className="relative w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background: `${elementColor}20`,
                      border: `3px solid ${elementColor}`,
                      boxShadow: `0 0 20px ${elementColor}60`
                    }}
                  >
                    {profileData?.avatar_badge_id && badges.find(b => b.badge_id === profileData.avatar_badge_id) ? (
                      // Custom badge avatar
                      <div className="text-2xl">🏆</div>
                    ) : user.element ? (
                      <ElementIcon 
                        name={user.element} 
                        width={32} 
                        height={32}
                      />
                    ) : (
                      <div 
                        className="w-8 h-8 rounded-full"
                        style={{ 
                          background: `linear-gradient(45deg, ${elementColor}, #FFFFFF)`
                        }}
                      />
                    )}

                    {/* Edit avatar button for own profile */}
                    {isOwnProfile && (
                      <button
                        onClick={() => setEditingAvatar(true)}
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center text-xs text-black hover:bg-cyan-300 transition-colors"
                        title="Change avatar"
                      >
                        ✏️
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-white/60 mb-1">Element</p>
                    <p 
                      className="font-semibold capitalize"
                      style={{
                        color: elementColor,
                        textShadow: `0 0 6px ${elementColor}60`
                      }}
                    >
                      {user.element || 'Unknown'}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                {profileData && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400">
                        {profileData.heartcoin_total || 0}
                      </p>
                      <p className="text-xs text-white/60">HeartCoins</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-cyan-400">
                        {cards.length}
                      </p>
                      <p className="text-xs text-white/60">Cards</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar Badge Selection (Own Profile Only) */}
              {isOwnProfile && editingAvatar && (
                <div className="p-4 border-b border-white/20">
                  <h3 className="text-sm font-semibold text-white mb-3">Choose Avatar Badge</h3>
                  <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                    {/* Default element avatar */}
                    <button
                      onClick={() => updateAvatarBadge(null)}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        !profileData?.avatar_badge_id 
                          ? `border-${elementColor} bg-${elementColor}20` 
                          : 'border-white/20 bg-white/10'
                      }`}
                      title="Default element avatar"
                    >
                      {user.element && (
                        <ElementIcon 
                          name={user.element} 
                          width={24} 
                          height={24}
                        />
                      )}
                    </button>

                    {/* Available badges */}
                    {badges.map(badge => (
                      <button
                        key={badge.id}
                        onClick={() => updateAvatarBadge(badge.badge_id)}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          profileData?.avatar_badge_id === badge.badge_id
                            ? `border-${elementColor} bg-${elementColor}20`
                            : 'border-white/20 bg-white/10'
                        }`}
                        title={badge.badges.badge_name}
                      >
                        {badge.badges.icon_url ? (
                          <img 
                            src={badge.badges.icon_url} 
                            alt={badge.badges.badge_name}
                            className="w-6 h-6 mx-auto"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-yellow-500 rounded-full mx-auto">🏆</div>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setEditingAvatar(false)}
                    className="mt-3 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Badges Section */}
              {badges.length > 0 && (
                <div className="p-4 border-b border-white/20">
                  <h3 className="text-sm font-semibold text-white mb-3">
                    Badges ({badges.length})
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {badges.map(badge => (
                      <div
                        key={badge.id}
                        className="p-2 rounded-lg bg-white/10 border border-white/20 text-center hover:bg-white/20 transition-colors"
                        title={badge.badges.description || badge.badges.badge_name}
                      >
                        {badge.badges.icon_url ? (
                          <img 
                            src={badge.badges.icon_url} 
                            alt={badge.badges.badge_name}
                            className="w-8 h-8 mx-auto mb-1"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-yellow-500 rounded-full mx-auto mb-1 flex items-center justify-center">
                            🏆
                          </div>
                        )}
                        <p className="text-xs text-white/80 truncate">
                          {badge.badges.badge_name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cards Section */}
              {cards.length > 0 && (
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">
                    Cards ({cards.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {cards.map(card => {
                      const cardElementColor = getElementColor(card.cards.element);
                      return (
                        <div
                          key={card.id}
                          className="aspect-square rounded-lg p-2 text-center"
                          style={{
                            background: `${cardElementColor}20`,
                            border: `1px solid ${cardElementColor}60`
                          }}
                          title={`${card.cards.card_name} (${card.cards.rarity})`}
                        >
                          {card.cards.image_url ? (
                            <img 
                              src={card.cards.image_url} 
                              alt={card.cards.card_name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                              <ElementIcon 
                                name={card.cards.element} 
                                width={24} 
                                height={24}
                              />
                              <p className="text-xs mt-1 text-white/80 truncate">
                                {card.cards.card_name}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty states */}
              {badges.length === 0 && cards.length === 0 && !loading && (
                <div className="p-8 text-center">
                  <div 
                    className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4"
                  >
                    <span className="text-2xl">✨</span>
                  </div>
                  <p className="text-white/60">
                    {isOwnProfile ? "You haven't collected any badges or cards yet!" : `${displayName} is just getting started!`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Holographic scan lines */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              background: `
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 3px,
                  rgba(0, 255, 255, 0.1) 3px,
                  rgba(0, 255, 255, 0.1) 6px
                )
              `,
              animation: 'scan 4s linear infinite'
            }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}