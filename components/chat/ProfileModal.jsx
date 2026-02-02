"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseClient } from '@/lib/supabaseClient';
import { chatService, getElementColor } from '@/lib/supabase/chat';
import { ElementIcon } from '@/lib/elementIcons';
import TiltSpinCard from '@/components/TiltSpinCard';
import { sfx } from '@/lib/sfx';
import { getCardImageUrl } from '@/lib/supabaseCardUrl';

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
  const [activeTab, setActiveTab] = useState('cards'); // 'cards' or 'badges'
  const [enlargedCard, setEnlargedCard] = useState(null);
  const [isEnlargedCardFlipped, setIsEnlargedCardFlipped] = useState(false);
  const [cardRotation, setCardRotation] = useState(0); // For 360° spin mode
  const [isAnimatingFlip, setIsAnimatingFlip] = useState(false); // For smooth flip transition

  // Inject card animation keyframes when enlarged card is shown
  useEffect(() => {
    if (enlargedCard && typeof document !== 'undefined') {
      const existingStyle = document.querySelector('#card-pulse-keyframes');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'card-pulse-keyframes';
        style.innerHTML = `
          @keyframes cardPulse {
            0%, 100% { 
              transform: scale(1);
              filter: saturate(1.06) contrast(1.06) brightness(1.04) drop-shadow(0 0 15px rgba(255, 215, 0, 0.6));
            }
            50% { 
              transform: scale(1.02);
              filter: saturate(1.1) brightness(1.08) contrast(1.08) drop-shadow(0 0 25px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 50px rgba(255, 215, 0, 0.6));
            }
          }
        `;
        document.head.appendChild(style);
      }
      return () => {
        const styleElement = document.querySelector('#card-pulse-keyframes');
        if (styleElement) {
          styleElement.remove();
        }
      };
    }
  }, [enlargedCard]);

  // Load full profile data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      // Check if this is a guest/anonymous user
      const isGuestUser = user.id === 'anonymous' || (typeof user.id === 'string' && user.id.startsWith('guest_'));

      // Only load profile data for real users, not guest/anonymous aliens
      if (!isGuestUser) {
        loadProfileData();
      } else {
        // For guest aliens, create a mock profile
        setProfileData({
          id: user.id,
          name: user.name,
          element: 'alien',
          avatar_badge_id: null,
          heartcoin_total: 0
        });
        setBadges([]);
        setCards([]);
        setLoading(false);
      }
    }
  }, [isOpen, user]);

  /**
   * Load complete profile data including badges and cards
   */
  const loadProfileData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Load profile details using RPC
      const { data: profile, error: profileError } = await supabaseClient
        .rpc('get_public_profile', { p_profile_id: user.id })
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
        className="fixed inset-0 z-[120] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
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
                  <button
                    onClick={onClose}
                    className="text-white/70 hover:text-white transition-colors p-2 rounded-lg ml-auto"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* User Name and Element/ALIEN Indicator */}
                <div className="text-center mb-6">
                  <h2
                    className="text-2xl font-bold mb-2"
                    style={{
                      color: elementColor,
                      textShadow: `0 0 15px ${elementColor}60`
                    }}
                  >
                    {displayName}
                  </h2>

                  {/* Element/ALIEN Indicator */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {user.element ? (
                      <>
                        <ElementIcon
                          name={user.element}
                          width={24}
                          height={24}
                        />
                        <span
                          className="text-sm font-semibold uppercase"
                          style={{
                            color: elementColor,
                            textShadow: `0 0 8px ${elementColor}60`
                          }}
                        >
                          {user.element}
                        </span>
                      </>
                    ) : (
                      <>
                        <img
                          src="/elements/alien.webp"
                          alt="Alien"
                          className="w-6 h-6"
                          style={{
                            filter: 'drop-shadow(0 0 6px rgba(0, 255, 127, 0.8))'
                          }}
                        />
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color: '#00FF7F',
                            textShadow: '0 0 8px rgba(0, 255, 127, 0.6)'
                          }}
                        >
                          ALIEN
                        </span>
                      </>
                    )}
                  </div>

                  {/* Action Buttons - Binder, Badges, Send HeartCoin */}
                  <div className="flex justify-center gap-3 mb-4">
                    {/* Send HeartCoin Button - only show for other users */}
                    {!isOwnProfile && (
                      <button
                        onClick={() => {
                          sfx.play('click', 0.8);
                          // Dispatch event to open HeartCoin modal with recipient
                          window.dispatchEvent(new CustomEvent('openSendHeartCoin', {
                            detail: { recipient: user, recipientName: displayName }
                          }));
                          onClose();
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                        style={{
                          background: 'rgba(252, 84, 175, 0.2)',
                          border: '2px solid rgba(252, 84, 175, 0.6)',
                          boxShadow: '0 0 15px rgba(252, 84, 175, 0.3)',
                        }}
                      >
                        <img
                          src="/elements/heart-coin.webp"
                          alt="HeartCoin"
                          className="w-5 h-5"
                          style={{
                            filter: 'drop-shadow(0 0 4px rgba(252, 84, 175, 0.8))'
                          }}
                        />
                        <span
                          className="text-sm font-bold"
                          style={{
                            color: '#FC54AF',
                            textShadow: '0 0 8px rgba(252, 84, 175, 0.6)'
                          }}
                        >
                          Send
                        </span>
                      </button>
                    )}

                    {/* Binder Button */}
                    <button
                      onClick={() => {
                        sfx.play('click', 0.8);
                        // Dispatch event to open binder modal
                        window.dispatchEvent(new CustomEvent('openDigitalBinder'));
                        onClose();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                      style={{
                        background: 'rgba(255, 105, 180, 0.2)',
                        border: '2px solid rgba(255, 105, 180, 0.6)',
                        boxShadow: '0 0 15px rgba(255, 105, 180, 0.3)',
                      }}
                    >
                      <img
                        src="/elements/binder.webp"
                        alt="Binder"
                        className="w-5 h-5"
                        style={{
                          filter: 'drop-shadow(0 0 4px rgba(255, 105, 180, 0.8))'
                        }}
                      />
                      <span
                        className="text-sm font-bold"
                        style={{
                          color: '#FF69B4',
                          textShadow: '0 0 8px rgba(255, 105, 180, 0.6)'
                        }}
                      >
                        Binder
                      </span>
                    </button>

                    {/* Badges Button */}
                    <button
                      onClick={() => {
                        sfx.play('click', 0.8);
                        // Dispatch event to open badges modal
                        window.dispatchEvent(new CustomEvent('openBadgesModal'));
                        onClose();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                      style={{
                        background: 'rgba(0, 191, 255, 0.2)',
                        border: '2px solid rgba(0, 191, 255, 0.6)',
                        boxShadow: '0 0 15px rgba(0, 191, 255, 0.3)',
                      }}
                    >
                      <img
                        src="/elements/badges.webp"
                        alt="Badges"
                        className="w-5 h-5"
                        style={{
                          filter: 'drop-shadow(0 0 4px rgba(0, 191, 255, 0.8))'
                        }}
                      />
                      <span
                        className="text-sm font-bold"
                        style={{
                          color: '#00BFFF',
                          textShadow: '0 0 8px rgba(0, 191, 255, 0.6)'
                        }}
                      >
                        Badges
                      </span>
                    </button>
                  </div>

                  {/* HeartCoins Display */}
                  <div className="flex items-center justify-center space-x-2 mt-4">
                    <img
                      src="/elements/heart.webp"
                      alt="HeartCoin"
                      className="w-8 h-8"
                      style={{
                        filter: 'drop-shadow(0 0 8px rgba(252, 84, 175, 0.8))'
                      }}
                    />
                    <span
                      className="text-2xl font-bold"
                      style={{
                        color: '#FC54AF',
                        textShadow: '0 0 10px rgba(252, 84, 175, 0.8)'
                      }}
                    >
                      {profileData?.heartcoin_total || 0}
                    </span>
                    <span className="text-sm text-white/60 ml-1">HeartCoins</span>
                  </div>
                </div>
              </div>

              {/* Avatar Badge Selection (Own Profile Only) */}
              {isOwnProfile && editingAvatar && user.id !== 'anonymous' && (
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

              {/* Tab Navigation */}
              <div className="flex border-b border-white/20">
                <button
                  onClick={() => setActiveTab('cards')}
                  className={`flex-1 py-3 px-4 text-sm font-semibold transition-all ${
                    activeTab === 'cards'
                      ? 'bg-cyan-400/20 text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  CARDS ({cards.length})
                </button>
                <button
                  onClick={() => setActiveTab('badges')}
                  className={`flex-1 py-3 px-4 text-sm font-semibold transition-all ${
                    activeTab === 'badges'
                      ? 'bg-yellow-400/20 text-yellow-400 border-b-2 border-yellow-400'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  BADGES ({badges.length})
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === 'cards' ? (
                  /* Cards Tab Content */
                  <div>
                    {cards.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                        {cards.map(card => {
                          const cardElementColor = getElementColor(card.cards.element);
                          return (
                            <div
                              key={card.id}
                              className="aspect-square rounded-lg p-2 text-center transition-all hover:scale-105 cursor-pointer"
                              style={{
                                background: `${cardElementColor}20`,
                                border: `2px solid ${cardElementColor}60`,
                                boxShadow: `0 0 10px ${cardElementColor}30`
                              }}
                              title={`${card.cards.card_name} (${card.cards.rarity})`}
                              onClick={() => setEnlargedCard(card.cards)}
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
                                    width={32} 
                                    height={32}
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
                    ) : (
                      <div className="text-center py-8">
                        <div 
                          className="w-16 h-16 rounded-lg bg-cyan-400/20 border-2 border-cyan-400/50 flex items-center justify-center mx-auto mb-4"
                        >
                          <span className="text-2xl">🃏</span>
                        </div>
                        <p className="text-white/60">
                          {user.id === 'anonymous' 
                            ? `${displayName} is a mysterious visitor from another dimension.`
                            : isOwnProfile 
                              ? "You haven't collected any cards yet!" 
                              : `${displayName} has no cards in their collection.`}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Badges Tab Content */
                  <div>
                    {badges.length > 0 ? (
                      <div className="grid grid-cols-4 gap-3 max-h-60 overflow-y-auto">
                        {badges.map(badge => (
                          <div
                            key={badge.id}
                            className="p-3 rounded-lg bg-white/10 border border-white/20 text-center hover:bg-white/20 transition-all hover:scale-105"
                            style={{
                              border: '2px solid rgba(255, 215, 0, 0.6)',
                              boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
                            }}
                            title={badge.badges.description || badge.badges.badge_name}
                          >
                            {badge.badges.icon_url ? (
                              <img 
                                src={badge.badges.icon_url} 
                                alt={badge.badges.badge_name}
                                className="w-10 h-10 mx-auto mb-2"
                              />
                            ) : (
                              <div 
                                className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                                style={{
                                  background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                                  boxShadow: '0 0 8px rgba(255, 215, 0, 0.6)'
                                }}
                              >
                                🏆
                              </div>
                            )}
                            <p className="text-xs text-white/80 truncate font-medium">
                              {badge.badges.badge_name}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div 
                          className="w-16 h-16 rounded-lg bg-yellow-400/20 border-2 border-yellow-400/50 flex items-center justify-center mx-auto mb-4"
                        >
                          <span className="text-2xl">🏆</span>
                        </div>
                        <p className="text-white/60">
                          {user.id === 'anonymous' 
                            ? `${displayName} carries no earthly achievements.`
                            : isOwnProfile 
                              ? "You haven't earned any badges yet!" 
                              : `${displayName} has no badges to display.`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enlarged Card Modal */}
          {enlargedCard && (
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg"
              onClick={() => {
                setEnlargedCard(null);
                setIsEnlargedCardFlipped(false);
                setCardRotation(0);
              }}
            >
              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEnlargedCard(null);
                  setIsEnlargedCardFlipped(false);
                  setCardRotation(0);
                }}
                className="absolute top-4 right-4 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white text-xl font-bold transition-all duration-200 z-20 border border-white/30"
              >
                ×
              </button>

              {/* Card container */}
              <div className="flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
                {/* Card wrapper with explicit dimensions */}
                <div
                  className="relative"
                  style={{
                    width: 'min(280px, 70vw)',
                    height: 'min(373px, 50vh)',
                  }}
                >
                  {/* TiltSpinCard wrapper for 360° drag-to-spin interaction */}
                  <TiltSpinCard
                    className="relative w-full h-full cursor-grab active:cursor-grabbing"
                    maxRotateX={10}
                    sensitivity={0.3}
                    returnDuration={400}
                    enableSpin={true}
                    spinSensitivity={0.8}
                    onRotationChange={setCardRotation}
                    onClick={() => {
                      // Play flip sound
                      try {
                        sfx.play('flip', 0.8);
                      } catch {
                        try {
                          const audio = new Audio('/audio/flip.mp3');
                          audio.volume = 0.8;
                          audio.play();
                        } catch {}
                      }
                      // Animate flip by 180 degrees
                      setIsAnimatingFlip(true);
                      setCardRotation(prev => prev + 180);
                      setTimeout(() => setIsAnimatingFlip(false), 500);
                    }}
                  >
                    {/* Front of card */}
                    <img
                      src={getCardImageUrl(enlargedCard.card_name || 'CHXNDLER')}
                      alt={enlargedCard.card_name}
                      className="absolute inset-0 w-full h-full rounded-lg border-4 border-yellow-500/80 shadow-2xl object-contain pointer-events-none"
                      style={{
                        filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.6))',
                        backfaceVisibility: 'hidden',
                        transform: `rotateY(${cardRotation}deg)`,
                        transition: isAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                      }}
                      draggable={false}
                    />
                    {/* Back of card */}
                    <img
                      src={getCardImageUrl('BACK')}
                      alt="Card back"
                      className="absolute inset-0 w-full h-full rounded-lg border-4 border-yellow-500/80 shadow-2xl object-contain pointer-events-none"
                      style={{
                        filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.6))',
                        backfaceVisibility: 'hidden',
                        transform: `rotateY(${cardRotation + 180}deg)`,
                        transition: isAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                      }}
                      draggable={false}
                    />
                  </TiltSpinCard>
                </div>

                {/* Card name */}
                <div
                  className="mt-4 text-center text-white font-bold text-lg"
                  style={{ textShadow: '0 0 10px rgba(255, 215, 0, 0.6)' }}
                >
                  {enlargedCard.card_name}
                </div>
              </div>
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