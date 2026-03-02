"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService } from '@/lib/supabase/chat';
import { supabaseClient } from '@/lib/supabaseClient';
import { useProfile } from '@/contexts/ProfileContext';
import { sfx } from '@/lib/sfx';
import { getOrCreateGuestNameSync, getOrCreateGuestIdSync, clearGuestIdentity } from '@/lib/supabase/guest';
// import { useLiveStatus } from '@/hooks/useLiveStatus'; // Removed since chat is always available
import UserList from './UserList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ProfileModal from './ProfileModal';
import VotingPanel from './VotingPanel';
import ReactionTray from './ReactionTray';
import FloatingRoomReactions from './FloatingRoomReactions';
import { RATE_LIMITS, markSoulStarUsed } from '@/lib/reactions';
import { useLogOnChange } from '@/lib/useLogOnChange';
import { TiltSpinCard } from '@/components/TiltSpinCard';
import { getCardImageUrl } from '@/lib/supabaseCardUrl';

// Debug flag to control console logging
const DEBUG = process.env.NODE_ENV === 'development' && true;

// NOTE: Guest username is now resolved per-instance via identity resolution in ChatPanel.
// Do NOT use a module-level cache—it causes stale guest aliases to leak into auth sessions.

/**
 * Generate a unique client_id for messages that don't have a DB id yet
 */
const generateClientId = (prefix = 'msg') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${random}`;
};

// Counter for guaranteed unique IDs within a session
let messageIdCounter = 0;

/**
 * Normalize a message to ensure it has a client_id for stable React keys
 * GUARANTEE: returned message will always have a non-empty client_id
 */
const normalizeMessage = (msg) => {
  if (!msg) return null;

  // If message already has a valid non-empty client_id, return as-is
  if (msg.client_id && typeof msg.client_id === 'string' && msg.client_id.length > 0) {
    return msg;
  }

  // If message has a valid DB id (UUID string), use that as the basis for client_id
  const msgId = msg.id;
  if (msgId && typeof msgId === 'string' && msgId.length > 0 &&
      !msgId.startsWith('temp-') && !msgId.startsWith('guest-')) {
    return { ...msg, client_id: `db_${msgId}` };
  }

  // For temp/guest/optimistic messages, or messages without valid id
  // Generate a guaranteed unique client_id
  messageIdCounter++;
  const uniqueId = generateClientId(`${msgId || 'msg'}_${messageIdCounter}`);
  return { ...msg, client_id: uniqueId };
};

/**
 * Merge/dedupe messages by id and dedupe_key; stable and order-preserving.
 * Rules:
 * - Prefer DB id when present
 * - Replace an optimistic row when a row with the same dedupe_key arrives with a real id
 * - No empty/undefined keys used for identity
 */
const mergeMessages = (prev, incoming) => {
  const outMap = new Map(); // key: id or dedupe_key

  // Seed with previous messages
  (prev || []).forEach((m) => {
    const base = normalizeMessage(m) || {};
    const k = base.id || base.dedupe_key || base.client_nonce;
    if (!k) return;
    outMap.set(k, base);
  });

  const arr = Array.isArray(incoming) ? incoming : [incoming];
  arr.forEach((raw) => {
    const msg = normalizeMessage(raw) || {};
    const hasId = !!msg.id;
    const k = msg.id || msg.dedupe_key || msg.client_nonce;
    if (!k) {
      DEBUG && console.warn('⚠️ mergeMessages: incoming message has no id/dedupe_key:', raw);
      return;
    }

    // If server row with id arrives: remove any optimistic with same dedupe_key
    if (hasId) {
      // Remove any record under its dedupe_key
      const dk = msg.dedupe_key || msg.client_nonce;
      if (dk && outMap.has(dk)) outMap.delete(dk);
      // Also remove if it was stored under previous temp/tempId/client_id
      const optimistic = Array.from(outMap.entries())
        .find(([_, v]) => (v.dedupe_key && v.dedupe_key === dk) || (v.client_nonce && v.client_nonce === dk));
      if (optimistic) outMap.delete(optimistic[0]);
    }

    outMap.set(k, { ...outMap.get(k), ...msg });
  });

  // Sort by created_at ascending
  const result = Array.from(outMap.values()).sort((a, b) => {
    const aT = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const bT = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return aT - bT;
  });

  if (DEBUG) {
    const ids = result.map(m => m.id || m.dedupe_key || m.client_nonce || '');
    const set = new Set(ids);
    const empty = ids.filter(k => !k).length;
    const dups = ids.length - set.size;
    if (empty > 0 || dups > 0) {
      console.warn(`⚠️ mergeMessages result: ${empty} empty keys, ${dups} duplicates of ${ids.length}`);
    }
  }

  return result;
};

/**
 * Normalize a chat user to ensure stable keys
 */
const normalizeUser = (user) => {
  if (!user) return null;
  if (user.client_id) return user;

  const stableId = user.id || user.user_id || user.name;
  if (stableId) {
    return { ...user, client_id: `user_${stableId}` };
  }

  // Fallback: generate client_id from random
  return { ...user, client_id: `user_${generateClientId('anon')}` };
};

// Helper: derive a short guest alias from a guest ID (last 6 chars, uppercased)
const guestAliasFromId = (guestId) => {
  if (!guestId || guestId.length < 6) return 'ALIEN000000';
  return 'ALIEN' + guestId.replace(/-/g, '').slice(-6).toUpperCase();
};

/**
 * Main Chat Panel Component
 * Slides in from the left side when live streaming is active
 */
export default function ChatPanel({ isOpen, onClose, onProfileOpen }) {
  const { profile, user, loading: profileLoading, unlockedBadges, badgesLoading, badgesError, userBadges } = useProfile();
  
  // Log badges debug only when values change
  useLogOnChange('🔥 ChatPanel badges debug:', {
    unlockedBadgesLength: unlockedBadges?.length ?? 0,
    badgesLoading,
    badgesError: badgesError?.message ?? null,
  });
  
  // Real song collection data from BinderModal - exact match
  const songCollection = [
    { name: 'CHXNDLER', element: 'ALL', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'MR. BRIGHTSIDE', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'CHEERLEADER (ACOUSTIC)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'MAKE BELIEVE', element: '', rarity: 'Common', is_released: false, min_tier: 'wanderer' },
    { name: 'ALONE', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'ALONE (ACOUSTIC)', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'LITTLE BLACK HEART (ACOUSTIC)', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'dreamer' },
    { name: 'LITTLE BLACK HEART', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'dreamer' },
    { name: 'AMERICAN DREAM', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'PARIS', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'PINK MOON', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'ALWAYS ON MY MIND', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'ALWAYS ON MY MIND (REMIX)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'BE MY BEE', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'BE MY BEE (ACOUSTIC)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'CHEERLEADER', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'COLLIDE', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'dreamer' },
    { name: 'COLORS OF OUR HOME (BLUMA Game Soundtrack)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'COLORS OF OUR HOME (ACOUSTIC)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'COLORS OF OUR HOME', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'I MIGHT FALL IN LOVE WITH YOU', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'LOVE ME', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'LOVE ME (ACOUSTIC)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'SOMEBODY TO LOVE', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'lover' },
    { name: 'TIENES UN AMIGO', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'WE\'RE JUST FRIENDS', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'WE\'RE JUST FRIENDS (ACOUSTIC)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'WE\'RE JUST FRIENDS (DMVRCO REMIX)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'WE\'RE JUST FRIENDS (mickey jas REMIX)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'BABY', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'BLUE (ACOUSTIC)', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'BLUE', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'BRAIN FREEZE', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'FEELING THIS', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'dreamer' },
    { name: 'GAME BOY HEART', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'HOME', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'HOME (ACOUSTIC)', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'HOUSE PARTY', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'HOUSE PARTY (ACOUSTIC)', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'KID FOREVER', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'POKÉMON', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'LETTING GO', element: 'WATER', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'OCEAN GIRL', element: 'WATER', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'OCEAN GIRL (ACOUSTIC)', element: 'WATER', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'OCEAN GIRL (REMIX)', element: 'WATER', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
    { name: 'WATER', element: 'WATER', rarity: 'Rare', is_released: true, min_tier: 'lover' },
    { name: 'HEART', element: 'HEART', rarity: 'Rare', is_released: true, min_tier: 'lover' },
    { name: 'LIGHTNING', element: 'LIGHTNING', rarity: 'Rare', is_released: true, min_tier: 'lover' },
    { name: 'DARKNESS', element: 'DARKNESS', rarity: 'Rare', is_released: true, min_tier: 'lover' },
  ];

  // Helper to check if user owns a card
  const isCardOwned = (cardName) => {
    if (!profile?.cards) return false;
    return profile.cards.some(cardRow => cardRow.cards.card_name === cardName);
  };

  // Helper function to get element color and icon
  const getElementDisplay = (element) => {
    switch(element) {
      case 'DARKNESS': return { color: 'purple-400', icon: '🌙' };
      case 'HEART': return { color: 'pink-400', icon: '💖' };
      case 'LIGHTNING': return { color: 'blue-400', icon: '⚡' };
      case 'WATER': return { color: 'cyan-400', icon: '🌊' };
      default: return { color: 'gray-400', icon: '✨' };
    }
  };

  // Helper function to get element color (hex values for consistency with BinderModal)
  const getElementColor = (element) => {
    const elementColors = {
      'LIGHTNING': '#FFD700', // Gold
      'DARKNESS': '#FFFFFF', // White
      'WATER': '#1E90FF', // Dodger blue
      'HEART': '#FF69B4', // Hot pink
      'ALL': '#FFFFFF', // White for special cards
      'CHXNDLER': '#FF69B4' // Hot pink for default
    };
    return elementColors[element] || '#FFFFFF';
  };

  // Get card image URL for a given song
  const getCardImage = (songName, element) => {
    const songImages = {
      'ALWAYS ON MY MIND': getCardImageUrl('HEART'),
      'ALWAYS ON MY MIND (REMIX)': getCardImageUrl('ALWAYS ON MY MIND (REMIX)'),
      'ALONE': getCardImageUrl('ALONE'),
      'ALONE (ACOUSTIC)': getCardImageUrl('ALONE'),
      'AMERICAN DREAM': getCardImageUrl('AMERICAN DREAM'),
      'BABY': getCardImageUrl('BABY'),
      'BE MY BEE': getCardImageUrl('BE MY BEE'),
      'BE MY BEE (ACOUSTIC)': getCardImageUrl('BE MY BEE (ACOUSTIC)'),
      'BLUE (ACOUSTIC)': getCardImageUrl('BLUE (ACOUSTIC)'),
      'BLUE': getCardImageUrl('BLUE'),
      'BRAIN FREEZE': getCardImageUrl('BRAIN FREEZE'),
      'CHEERLEADER': getCardImageUrl('CHEERLEADER'),
      'CHEERLEADER (ACOUSTIC)': getCardImageUrl('CHEERLEADER (ACOUSTIC)'),
      'CHXNDLER': getCardImageUrl('CHXNDLER'),
      'COLLIDE': getCardImageUrl('COLLIDE'),
      'COLORS OF OUR HOME': getCardImageUrl('COLORS OF OUR HOME'),
      'COLORS OF OUR HOME (ACOUSTIC)': getCardImageUrl('COLORS OF OUR HOME (ACOUSTIC)'),
      'COLORS OF OUR HOME (BLUMA Game Soundtrack)': getCardImageUrl('COLORS OF OUR HOME (BLUMA Game Soundtrack)'),
      'DARKNESS': getCardImageUrl('DARKNESS'),
      'FEELING THIS': getCardImageUrl('FEELING THIS'),
      'GAME BOY HEART': getCardImageUrl('GAME BOY HEART'),
      'HEART': getCardImageUrl('HEART'),
      'HOME': getCardImageUrl('HOME'),
      'HOME (ACOUSTIC)': getCardImageUrl('HOME (ACOUSTIC)'),
      'HOUSE PARTY': getCardImageUrl('HOUSE PARTY'),
      'HOUSE PARTY (ACOUSTIC)': getCardImageUrl('HOUSE PARTY (ACOUSTIC)'),
      'I MIGHT FALL IN LOVE WITH YOU': getCardImageUrl('I MIGHT FALL IN LOVE WITH YOU'),
      'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)': getCardImageUrl('I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)'),
      'KID FOREVER': getCardImageUrl('KID FOREVER'),
      'LETTING GO': getCardImageUrl('LETTING GO'),
      'LIGHTNING': getCardImageUrl('LIGHTNING'),
      'LITTLE BLACK HEART': getCardImageUrl('LITTLE BLACK HEART'),
      'LITTLE BLACK HEART (ACOUSTIC)': getCardImageUrl('LITTLE BLACK HEART (ACOUSTIC)'),
      'LOVE ME': getCardImageUrl('LOVE ME'),
      'LOVE ME (ACOUSTIC)': getCardImageUrl('LOVE ME (ACOUSTIC)'),
      'MAKE BELIEVE': getCardImageUrl('MAKE BELIEVE'),
      'MR. BRIGHTSIDE': getCardImageUrl('MR. BRIGHTSIDE'),
      'OCEAN GIRL': getCardImageUrl('OCEAN GIRL'),
      'OCEAN GIRL (ACOUSTIC)': getCardImageUrl('OCEAN GIRL (ACOUSTIC)'),
      'OCEAN GIRL (REMIX)': getCardImageUrl('OCEAN GIRL (REMIX)'),
      'PARIS': getCardImageUrl('PARIS'),
      'PINK MOON': getCardImageUrl('PINK MOON'),
      'POKÉMON': getCardImageUrl('POKEMON'),
      'SOMEBODY TO LOVE': getCardImageUrl('SOMEBODY TO LOVE'),
      'TIENES UN AMIGO': getCardImageUrl('TIENES UN AMIGO'),
      'WATER': getCardImageUrl('WATER'),
      'WE\'RE JUST FRIENDS': getCardImageUrl('WE\'RE JUST FRIENDS'),
      'WE\'RE JUST FRIENDS (ACOUSTIC)': getCardImageUrl('WE\'RE JUST FRIENDS (ACOUSTIC)'),
      'WE\'RE JUST FRIENDS (DMVRCO REMIX)': getCardImageUrl('WE\'RE JUST FRIENDS (DMVRCO REMIX)'),
      'WE\'RE JUST FRIENDS (mickey jas REMIX)': getCardImageUrl('WE\'RE JUST FRIENDS (MICKEY JAS REMIX)'),
    };

    // Return the specific song image if available
    if (songImages[songName]) {
      return songImages[songName];
    }

    // Fallback to element image
    const elementImages = {
      'HEART': getCardImageUrl('HEART'),
      'WATER': getCardImageUrl('WATER'),
      'LIGHTNING': getCardImageUrl('LIGHTNING'),
      'DARKNESS': getCardImageUrl('DARKNESS')
    };

    return elementImages[element] || elementImages['HEART'];
  };
  
  // Log render state only when values change
  useLogOnChange('🔥 ChatPanel render:', { isOpen, profile: !!profile, user: !!user });

  // ─── Identity resolution: never announce presence until we know who we are ───
  const [resolvedName, setResolvedName] = useState(null);      // display name for presence & messages
  const [resolvedUserId, setResolvedUserId] = useState(null);  // auth user.id when authenticated
  const [resolvedGuestId, setResolvedGuestId] = useState(null); // localStorage guest id when unauthenticated
  const [isIdentityReady, setIsIdentityReady] = useState(false);

  // Resolve identity once ProfileContext finishes loading
  useEffect(() => {
    // Don't resolve while profile is still loading — we'd get a false "guest" result.
    // IMPORTANT: do NOT reset isIdentityReady here. ProfileContext re-fetches on
    // auth state change, which toggles profileLoading true→false again. Resetting
    // would cause initializeChat to fire twice (duplicate channels, broken scroll).
    if (profileLoading) return;

    if (user) {
      // ── Authenticated path ──
      // Immediately clear any guest alias state so it can never leak
      clearGuestIdentity();

      const name = profile?.name
        ?? profile?.display_name
        ?? profile?.username
        ?? ('ALIEN' + user.id.replace(/-/g, '').slice(-6).toUpperCase());

      setResolvedUserId(user.id);
      setResolvedGuestId(null);
      setResolvedName(name);
      setIsIdentityReady(true);
      DEBUG && console.log('🔥 Identity resolved (auth):', name);
    } else {
      // ── Guest path ──
      // Use the stable guest identity from localStorage (creates if missing)
      const guestName = getOrCreateGuestNameSync();
      const guestId = getOrCreateGuestIdSync();
      setResolvedUserId(null);
      setResolvedGuestId(guestId);
      setResolvedName(guestName);
      setIsIdentityReady(true);
      DEBUG && console.log('🔥 Identity resolved (guest):', guestName);
    }
  }, [profileLoading, user, profile?.name, profile?.display_name, profile?.username, profile?.id]);

  /**
   * Get display name — always returns the identity-resolved name.
   * Falls back to a safe default only if called before resolution (should not happen).
   */
  const getDisplayName = useCallback(() => {
    return resolvedName || 'ALIEN000000';
  }, [resolvedName]);

  // Convenience alias used in the profile panel
  const alienName = resolvedName || 'ALIEN000000';
  const [messages, setMessages] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isUserPanelCollapsed, setIsUserPanelCollapsed] = useState(true); // Start collapsed by default
  const [isChatCollapsed, setIsChatCollapsed] = useState(true); // Default to half-collapsed view

  // Reaction state
  const [messageReactions, setMessageReactions] = useState({});
  const [roomReactions, setRoomReactions] = useState([]);

  // Map of userId -> basic profile data for quick lookup (element, profile image)
  const userProfilesById = useMemo(() => {
    const map = {};
    try {
      (chatUsers || []).forEach(u => {
        if (!u?.id) return;
        map[u.id] = {
          element: u.element || null,
          profile_image_url: u.profile_image_url || null,
        };
      });
      if (user && profile) {
        map[user.id] = {
          element: profile.element || null,
          profile_image_url: profile.profile_image_url || null,
        };
      }
    } catch {}
    return map;
  }, [chatUsers, user?.id, profile?.element, profile?.profile_image_url]);
  const [showRoomReactionTray, setShowRoomReactionTray] = useState(false);
  const [lastReactionTime, setLastReactionTime] = useState(0);
  const [lastLightningTime, setLastLightningTime] = useState(0);
  const [messageReactionCooldowns, setMessageReactionCooldowns] = useState({}); // messageId_reaction -> timestamp
  
  // Auto-collapse user panel on small screens when profile is selected
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        if (window.innerWidth < 768 && selectedUser && !isUserPanelCollapsed) {
          setIsUserPanelCollapsed(true);
        }
      };
      
      handleResize(); // Check on mount
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [selectedUser, isUserPanelCollapsed]);
  const [showUserBadges, setShowUserBadges] = useState(false);
  const [showUserBinder, setShowUserBinder] = useState(false);
  const [showSendHeartCoin, setShowSendHeartCoin] = useState(false);
  const [badgeStartIndex, setBadgeStartIndex] = useState(0);
  const [binderStartIndex, setBinderStartIndex] = useState(0);
  const [selectedCardPopup, setSelectedCardPopup] = useState(null);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [selectedUserCards, setSelectedUserCards] = useState([]); // Cards owned by the selected user profile
  const [cardRotation, setCardRotation] = useState(0); // Card 3D rotation
  const [isCardAnimatingFlip, setIsCardAnimatingFlip] = useState(false);
  const [selectedBadgePopup, setSelectedBadgePopup] = useState(null);
  const [badgeRotation, setBadgeRotation] = useState(0); // Badge 3D rotation
  const [isBadgeAnimatingFlip, setIsBadgeAnimatingFlip] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'voting', 'badges', 'cards'
  const [isVotingPanelCollapsed, setIsVotingPanelCollapsed] = useState(true); // Start collapsed by default
  const channelRef = useRef(null);

  // Notify parent when a user profile is opened/closed
  useEffect(() => {
    onProfileOpen?.(!!selectedUser);
  }, [selectedUser, onProfileOpen]);

  // Initialize chat users when chat opens — only after identity is resolved
  useEffect(() => {
    if (!isOpen || !isIdentityReady) return;

    if (resolvedUserId && resolvedName) {
      // Authenticated user
      DEBUG && console.log('🚀 IMMEDIATE: Using authenticated user:', resolvedName);
      const authenticatedUser = {
        id: resolvedUserId,
        name: resolvedName,
        element: profile?.element || null,
        avatar_badge_id: profile?.avatar_badge_id || null,
        profile_image_url: profile?.profile_image_url || null,
        last_seen: new Date().toISOString()
      };
      setChatUsers([authenticatedUser]);
    } else if (resolvedName) {
      // Guest user
      DEBUG && console.log('🚀 IMMEDIATE: Using guest username:', resolvedName);
      const guestUser = normalizeUser({
        id: `guest-${resolvedName}`,
        name: resolvedName,
        element: 'alien',
        avatar_badge_id: null,
        last_seen: new Date().toISOString()
      });
      setChatUsers([guestUser]);
    }
  }, [isIdentityReady, resolvedUserId, resolvedName, isOpen]);

  // Initialize chat when panel opens — but ONLY after identity is resolved.
  // Uses a ref to prevent double-init when isIdentityReady re-fires (profile refresh).
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (isOpen && isIdentityReady) {
      // Guard: don't re-init if already subscribed (prevents duplicate channels)
      if (hasInitializedRef.current && channelRef.current) {
        DEBUG && console.log('🔥 Skipping re-init: channel already active');
        return;
      }
      hasInitializedRef.current = true;
      initializeChat();
      // Reset profile-related states when chat opens
      setSelectedUser(null);
      setSelectedUserCards([]);
      setShowUserBadges(false);
      setShowUserBinder(false);
      setShowSendHeartCoin(false);
      setSelectedCardPopup(null);
      setSelectedBadgePopup(null);
      setCardFlipped(false);
      setBinderStartIndex(0);
    } else if (!isOpen) {
      hasInitializedRef.current = false;
      cleanupChat();
    }
  }, [isOpen, isIdentityReady]);

  // Update chat users when resolved identity changes (e.g. auth becomes available mid-session)
  useEffect(() => {
    if (!isOpen || !isIdentityReady) return;

    if (resolvedUserId && resolvedName) {
      DEBUG && console.log('🔥 Chat: ensuring authenticated user exists:', resolvedName);
      setChatUsers(prev => {
        const otherUsers = prev.filter(u => u.id !== resolvedUserId && u.id !== 'anonymous' && !u.id?.startsWith('guest-'));
        const authenticatedUser = {
          id: resolvedUserId,
          name: resolvedName,
          element: profile?.element || null,
          avatar_badge_id: profile?.avatar_badge_id || null,
          profile_image_url: profile?.profile_image_url || null,
          last_seen: new Date().toISOString()
        };
        return [authenticatedUser, ...otherUsers];
      });
    } else if (resolvedName) {
      DEBUG && console.log('🔥 Chat: ensuring guest user exists:', resolvedName);
      setChatUsers(prev => {
        const otherUsers = prev.filter(u => u.id !== 'anonymous' && u.name !== resolvedName);
        const guestUser = normalizeUser({
          id: `guest-${resolvedName}`,
          name: resolvedName,
          element: 'alien',
          avatar_badge_id: null,
          last_seen: new Date().toISOString()
        });
        return [guestUser, ...otherUsers];
      });
    }
  }, [isOpen, isIdentityReady, resolvedUserId, resolvedName]);

  // Reaction subscription useEffect
  useEffect(() => {
    let reactionChannelRef = null;

    const setupReactions = async () => {
      if (isOpen) {
        try {
          reactionChannelRef = await chatService.subscribeToReactions(
            (reactionEvent) => {
              DEBUG && console.log('🎉 Reaction received:', reactionEvent);
              
              if (reactionEvent.type === 'message_reaction' && reactionEvent.message_id) {
                // Update message reactions
                setMessageReactions(prev => ({
                  ...prev,
                  [reactionEvent.message_id]: {
                    ...prev[reactionEvent.message_id],
                    [reactionEvent.reaction]: (prev[reactionEvent.message_id]?.[reactionEvent.reaction] || 0) + 1
                  }
                }));
              } else if (reactionEvent.type === 'room_reaction') {
                // Add room reaction for animation; replace any active reaction from the same user
                const roomReaction = {
                  id: `${reactionEvent.user_id}_${Date.now()}`,
                  reaction: reactionEvent.reaction,
                  user_id: reactionEvent.user_id,
                  created_at: reactionEvent.created_at
                };
                setRoomReactions(prev => {
                  const others = prev.filter(r => r.user_id !== reactionEvent.user_id);
                  return [...others, roomReaction];
                });
              }
            },
            (error) => {
              console.error('Reaction subscription error:', error);
            }
          );
        } catch (error) {
          console.error('Error setting up reaction subscription:', error);
        }
      }
    };

    const cleanupReactions = async () => {
      if (reactionChannelRef) {
        try {
          await chatService.disconnectReactions();
          reactionChannelRef = null;
        } catch (error) {
          console.error('Error cleaning up reactions:', error);
        }
      }
    };

    setupReactions();

    return () => {
      cleanupReactions();
    };
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupChat();
    };
  }, []);

  /**
   * Initialize chat connection and load recent messages
   */
  const initializeChat = async () => {
    try {
      setLoading(true);

      // Load recent messages from heart_signal_messages table via API
      try {
        const response = await fetch('/api/heart-signal-messages?limit=50');
        const result = await response.json();
        if (result.success && result.messages) {
          // Transform messages to match expected format and normalize with client_id
          // Guests have user_id = null, authenticated users have user_id set
          const transformedMessages = result.messages.map(msg => normalizeMessage({
            id: msg.id,
            user_id: msg.user_id,
            username: msg.username,
            message: msg.message,
            message_type: msg.is_system ? 'join' : 'message',
            created_at: msg.created_at,
            dedupe_key: msg.dedupe_key || null,
            user_profile: {
              name: msg.username,
              element: msg.user_id === null ? 'alien' : null, // Guests (user_id=null) have alien element
              avatar_badge_id: null,
              profile_image_url: null
            }
          }));
          // Merge and dedupe by id and dedupe_key
          setMessages((prev) => mergeMessages(prev, transformedMessages));

          // Load reaction counts from messages into messageReactions state
          const loadedReactions = {};
          result.messages.forEach(msg => {
            const reactions = {};
            // Map database columns to reaction types
            if (msg.heart_count > 0) reactions.heart_pulse = msg.heart_count;
            if (msg.water_count > 0) reactions.water_ripple = msg.water_count;
            if (msg.lightning_count > 0) reactions.lightning_spark = msg.lightning_count;
            if (msg.darkness_count > 0) reactions.shadow_glow = msg.darkness_count;
            if (msg.alien_count > 0) reactions.alien_wave = msg.alien_count;

            if (Object.keys(reactions).length > 0) {
              loadedReactions[msg.id] = reactions;
            }
          });
          setMessageReactions(loadedReactions);
          DEBUG && console.log('🎉 Loaded message reactions:', loadedReactions);
        }
      } catch (error) {
        console.error('Error loading heart signal messages:', error);
        // Preserve any existing messages (e.g., optimistic) on load failure
        setMessages((prev) => (prev && prev.length > 0 ? prev : []));
      }

      // Load current chat users from database
      const databaseUsers = await chatService.getChatUsers();
      
      // Handle user representation using resolved identity (guaranteed ready at this point)
      if (resolvedUserId && resolvedName) {
        DEBUG && console.log('🔥 InitializeChat: Adding authenticated user:', resolvedName);
        const authenticatedUser = {
          id: resolvedUserId,
          name: resolvedName,
          element: profile?.element || null,
          avatar_badge_id: profile?.avatar_badge_id || null,
          profile_image_url: profile?.profile_image_url || null,
          last_seen: new Date().toISOString()
        };
        setChatUsers([authenticatedUser, ...databaseUsers.filter(u => u.id !== resolvedUserId)]);
      } else if (resolvedName) {
        DEBUG && console.log('🔥 InitializeChat: Using guest username:', resolvedName);
        const guestUser = {
          id: `guest-${resolvedName}`,
          name: resolvedName,
          element: 'alien',
          avatar_badge_id: null,
          last_seen: new Date().toISOString()
        };
        setChatUsers([guestUser, ...databaseUsers.filter(u => u.name !== resolvedName)]);
      } else {
        setChatUsers(databaseUsers);
      }

      // Clean up any existing channel before subscribing (prevents duplicate subscriptions)
      if (channelRef.current) {
        try {
          await supabaseClient.removeChannel(channelRef.current);
          channelRef.current = null;
        } catch (err) {
          DEBUG && console.warn('⚠️ Error removing stale channel:', err);
        }
      }

      // Subscribe to heart_signal_messages table directly
      channelRef.current = supabaseClient
        .channel('heart-signal-chat-panel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'heart_signal_messages' },
          (payload) => {
            DEBUG && console.log('🔥 Heart Signal realtime message:', payload);
            const msg = payload.new;

            // Determine if this is a guest message (user_id = null)
            const isGuestMessage = msg.user_id === null;

            const newMessage = normalizeMessage({
              id: msg.id,
              user_id: msg.user_id,
              username: msg.username,
              message: msg.message,
              message_type: msg.is_system ? 'join' : 'message',
              created_at: msg.created_at,
              dedupe_key: msg.dedupe_key || msg.client_nonce || null,
              user_profile: {
                name: msg.username,
                element: isGuestMessage ? 'alien' : null,
                avatar_badge_id: null,
                profile_image_url: null
              }
            });

            // Dedupe: skip if a message with this id already exists in state
            setMessages(prev => {
              if (msg.id && prev.some(m => m.id === msg.id)) return prev;
              if (process.env.NODE_ENV !== "production") console.log('🛰 realtime INSERT', { id: msg.id, dedupe_key: msg.dedupe_key });
              return mergeMessages(prev, newMessage);
            });

            // Play notification sound for new messages (not system messages)
            if (!msg.is_system) {
              // Check if it's our own message (don't play sound for own messages)
              const isOwnMessage = (resolvedUserId && msg.user_id === resolvedUserId) ||
                (!resolvedUserId && msg.username === resolvedName);

              if (!isOwnMessage) {
                try {
                  const audio = new Audio('/notification.mp3');
                  audio.volume = 0.3;
                  audio.play().catch(error => {
                    if (process.env.NODE_ENV !== "production") console.log('Notification sound failed:', error);
                  });
                } catch (error) {
                  if (process.env.NODE_ENV !== "production") console.log('Audio creation failed:', error);
                }
              }
            }

            // Update user list with new sender
            const senderId = msg.user_id || `guest-${msg.username}`;
            setChatUsers(prev => {
              const existingUser = prev.find(u => u.id === senderId || u.name === msg.username);
              if (existingUser) {
                return prev.map(u =>
                  (u.id === senderId || u.name === msg.username)
                    ? { ...u, last_seen: msg.created_at }
                    : u
                );
              } else {
                return [...prev, {
                  id: senderId,
                  name: msg.username,
                  element: isGuestMessage ? 'alien' : null,
                  avatar_badge_id: null,
                  profile_image_url: null,
                  last_seen: msg.created_at
                }];
              }
            });
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'heart_signal_messages' },
          (payload) => {
            DEBUG && console.log('🔥 Heart Signal message UPDATE:', payload);
            const msg = payload.new;

            // Update reaction counts in messageReactions state
            const reactions = {};
            if (msg.heart_count > 0) reactions.heart_pulse = msg.heart_count;
            if (msg.water_count > 0) reactions.water_ripple = msg.water_count;
            if (msg.lightning_count > 0) reactions.lightning_spark = msg.lightning_count;
            if (msg.darkness_count > 0) reactions.shadow_glow = msg.darkness_count;
            if (msg.alien_count > 0) reactions.alien_wave = msg.alien_count;

            setMessageReactions(prev => ({
              ...prev,
              [msg.id]: Object.keys(reactions).length > 0 ? reactions : undefined
            }));
          }
        )
        .on('broadcast', { event: 'typing' }, (payload) => {
          const typingData = payload.payload;
          DEBUG && console.log('🔥 Typing event:', typingData);
          // Update typing users
          setTypingUsers(prev => {
            const filtered = prev.filter(u => u.user_id !== typingData.user_id);
            if (typingData.is_typing) {
              return [...filtered, typingData];
            }
            return filtered;
          });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            DEBUG && console.log('✅ Heart Signal chat subscription active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Heart Signal chat subscription error');
          }
        });

      // Send sync message if not already joined this session
      // Use sessionStorage to prevent duplicate "connected" messages across panel open/close cycles
      const sessionJoinKey = resolvedUserId
        ? `heartverse_joined_${resolvedUserId}`
        : `heartverse_joined_guest_${resolvedName || 'unknown'}`;
      const hasJoinedThisSession = typeof window !== 'undefined' && sessionStorage.getItem(sessionJoinKey) === 'true';

      if (!hasJoined && !hasJoinedThisSession) {
        const displayName = resolvedName;
        DEBUG && console.log('🔥 Joining chat with name:', displayName);

        // Send connection message via heart-signal-messages API
        try {
          const response = await fetch('/api/heart-signal-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `${displayName} connected to the signal`,
              username: displayName,
              is_system: true,
              client_nonce: crypto.randomUUID(),
              guest_id: resolvedGuestId || null,
            }),
          });
          const result = await response.json();
          DEBUG && console.log('🔥 Sync message result:', result);

          // Mark as joined for this session
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(sessionJoinKey, 'true');
          }
        } catch (error) {
          DEBUG && console.log('🔥 Sync message failed:', error);
        }

        // For guest users, ensure they're in the user list
        if (!resolvedUserId && resolvedName) {
          setChatUsers(prev => {
            const existingGuest = prev.find(u => u.name === resolvedName);
            if (!existingGuest) {
              return [...prev, {
                id: `guest-${resolvedName}`,
                name: resolvedName,
                element: 'alien',
                avatar_badge_id: null,
                last_seen: new Date().toISOString()
              }];
            }
            return prev;
          });
        }

        setHasJoined(true);
      } else if (hasJoinedThisSession && !hasJoined) {
        // Already joined this session but state was reset, just update the state
        setHasJoined(true);
      }

    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cleanup chat connection
   */
  const cleanupChat = async () => {
    if (hasJoined) {
      try {
        const displayName = getDisplayName();
        await chatService.sendLeaveMessage(displayName);
      } catch (error) {
        console.error('Error sending leave message:', error);
      }
    }

    // Properly remove this component's realtime channel to avoid leaks/duplicates
    try {
      if (channelRef.current) {
        await supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    } catch (err) {
      console.error('Error removing chat channel:', err);
    }

    setHasJoined(false);
    setMessages([]);
    setChatUsers([]);
  };

  /**
   * Handle sending a new message
   */
  const handleSendMessage = async (messageText) => {
    const displayName = getDisplayName();
    DEBUG && console.log('🔥 Sending message:', {
      messageText,
      displayName,
      user: !!user,
      profile: !!profile,
      profileName: profile?.name
    });

    // Generate IDs for optimistic UI and server dedupe
    const dedupe_key = crypto.randomUUID();
    const client_nonce = dedupe_key; // back-compat with any places still checking client_nonce
    const tempId = crypto.randomUUID();

    // Determine if authenticated or guest using resolved identity
    const isAuthenticated = !!resolvedUserId;
    const guestUsername = isAuthenticated ? null : resolvedName;
    const finalUsername = isAuthenticated ? displayName : guestUsername;

    // Create optimistic message
    const optimistic = normalizeMessage({
      id: null, // No DB id yet
      client_nonce: client_nonce,
      client_id: client_nonce, // keep for stability where used
      dedupe_key: dedupe_key,
      tempId, // For React key and matching
      clientKey: client_nonce, // For animation stability
      user_id: isAuthenticated ? resolvedUserId : null,
      username: finalUsername,
      message: messageText.trim(),
      message_type: 'message',
      created_at: new Date().toISOString(),
      pending: true, // Back-compat flag
      status: 'sending', // sending | sent | failed
      errorMessage: null,
      user_profile: isAuthenticated ? {
        name: displayName,
        element: profile?.element || null,
        avatar_badge_id: profile?.avatar_badge_id || null,
        profile_image_url: profile?.profile_image_url || null,
      } : {
        name: guestUsername,
        element: 'alien',
        avatar_badge_id: null,
        profile_image_url: null,
      },
    });

    // Add optimistic message to state
    if (process.env.NODE_ENV !== "production") console.log('🧪 OPTIMISTIC message', optimistic);
    setMessages(prev => mergeMessages(prev, optimistic));

    // For guests, ensure they're in the users list
    if (!isAuthenticated) {
      setChatUsers(prev => {
        const existingGuest = prev.find(u => u.name === guestUsername);
        if (!existingGuest) {
          DEBUG && console.log('🔥 Adding guest user to list');
          return [{
            id: `guest-${client_nonce}`,
            name: guestUsername,
            element: 'alien',
            avatar_badge_id: null,
            last_seen: new Date().toISOString()
          }, ...prev];
        }
        return prev;
      });
    }

    try {
      // POST to API
      const response = await fetch('/api/heart-signal-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          username: finalUsername,
          is_system: false,
          client_nonce: client_nonce,
          dedupe_key: dedupe_key,
          guest_id: isAuthenticated ? null : (resolvedGuestId || null),
        }),
      });

      const result = await response.json();
      DEBUG && console.log('🧪 INSERT RESULT:', result?.message || result);

      if (!response.ok || !result.ok) {
        console.error('Failed to send message:', result?.error || 'Unknown error');
        // On failure, keep the optimistic message and mark as failed
        setMessages(prev => prev.map(m => {
          if (m.tempId === tempId || m.client_nonce === client_nonce) {
            return { ...m, status: 'failed', pending: false, errorMessage: result?.error || 'Failed to send' };
          }
          return m;
        }));
        return;
      }

      // On success, replace optimistic message with real one from server
      // API returns { ok: true, message: row } where row includes id
      if (result.ok && result.message) {
        const realMessage = normalizeMessage({
          ...result.message,
          client_nonce: client_nonce, // Keep for matching
          dedupe_key: result.message?.dedupe_key || dedupe_key,
          message_type: result.message.is_system ? 'join' : 'message',
          user_profile: optimistic.user_profile, // Preserve profile info
        });

        setMessages(prev => {
          // If realtime already delivered this id (and it's not an optimistic), skip
          if (realMessage.id && prev.some(m => m.id === realMessage.id && !m.pending)) return prev;
          // Replace optimistic message matched by dedupe_key (primary) or client_nonce
          const next = prev.map(m => {
            if (m.dedupe_key === dedupe_key || m.client_nonce === client_nonce || m.tempId === tempId) {
              return { ...realMessage, status: 'sent', pending: false, tempId: m.tempId };
            }
            return m;
          });
          const hasIt = next.some(m => m.id === realMessage.id);
          return hasIt ? next : mergeMessages(next, realMessage);
        });
      }
      // Realtime subscription will also deliver the message; mergeMessages handles dedup
    } catch (error) {
      console.error('Error sending message:', error);
      // Keep the optimistic message and mark as failed
      setMessages(prev => prev.map(m => {
        if (m.tempId === tempId || m.client_nonce === client_nonce || m.dedupe_key === dedupe_key) {
          return { ...m, status: 'failed', pending: false, errorMessage: 'Network error' };
        }
        return m;
      }));
    }
  };

  /**
   * Handle typing indicator
   */
  const handleTyping = async (isTyping) => {
    try {
      const displayName = getDisplayName();
      await chatService.sendTypingIndicator(displayName, isTyping);
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  };

  /**
   * Handle user profile click
   */
  const handleUserClick = (userId) => {
    DEBUG && console.log('🔥 User clicked:', userId);
    
    // Play click sound
    try {
      const audio = new Audio('/audio/click.mp3');
      audio.volume = 0.3;
      audio.play().catch(error => {
        if (process.env.NODE_ENV !== "production") console.log('Click audio play failed:', error);
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.log('Click audio creation failed:', error);
    }

    // Toggle profile - if clicking on same user, close profile
    if (selectedUser && selectedUser.id === userId) {
      DEBUG && console.log('🔥 Closing profile for same user');
      setSelectedUser(null);
      setSelectedUserCards([]);
      setShowUserBadges(false);
      setShowUserBinder(false);
      setShowSendHeartCoin(false);
      setBinderStartIndex(0);
      return;
    }
    
    let user = chatUsers.find(u => u.id === userId);
    DEBUG && console.log('🔥 Found user in chatUsers:', user);
    DEBUG && console.log('🔥 Current chatUsers:', chatUsers);
    
    // For anonymous/guest users, use resolved guest name
    if (userId === 'anonymous' || (typeof userId === 'string' && userId.startsWith('guest-'))) {
      const guestUsername = resolvedName || 'ALIEN000000';
      user = normalizeUser({
        id: `guest-${guestUsername}`,
        name: guestUsername,
        element: 'alien',
        avatar_badge_id: null,
        last_seen: new Date().toISOString()
      });
      DEBUG && console.log('🔥 Using guest user:', user);
    }
    
    // If user not found in chatUsers, try to build from message data
    if (!user) {
      const msg = messages.find(m => m.user_id === userId);
      if (msg) {
        const msgProfile = msg.user_profile;
        user = normalizeUser({
          id: userId,
          name: msgProfile?.name || msg.username || 'Unknown',
          element: msgProfile?.element || null,
          avatar_badge_id: msgProfile?.avatar_badge_id || null,
          profile_image_url: msgProfile?.profile_image_url || null,
          last_seen: msg.created_at
        });
        DEBUG && console.log('🔥 Built user from message data:', user);
      }
    }

    if (user) {
      setSelectedUser(user);
      setShowUserBadges(false); // Reset badge view when switching users
      setShowUserBinder(false); // Reset binder view when switching users
      setShowSendHeartCoin(false); // Reset heart coin view when switching users
      setIsUserPanelCollapsed(true); // Auto-collapse left panel when profile opens
      setSelectedUserCards([]); // Reset cards when switching users
      setBinderStartIndex(0); // Reset binder pagination
      DEBUG && console.log('🔥 Set selected user:', user);

      // Fetch selected user's cards (skip for anonymous users)
      if (userId !== 'anonymous') {
        (async () => {
          try {
            const { data: userCards, error } = await supabaseClient
              .from('user_cards')
              .select(`
                id,
                card_id,
                acquired_at,
                is_public,
                cards (
                  id,
                  card_name,
                  element,
                  rarity,
                  artwork_url
                )
              `)
              .eq('user_id', userId)
              .eq('is_public', true);

            if (error) {
              DEBUG && console.log('🔥 Error fetching user cards:', error);
            } else {
              DEBUG && console.log('🔥 Fetched user cards:', userCards);
              setSelectedUserCards(userCards || []);
            }
          } catch (err) {
            DEBUG && console.log('🔥 Exception fetching user cards:', err);
          }
        })();
      }
    } else {
      DEBUG && console.log('🔥 No user found for ID:', userId);
    }
  };

  /**
   * Handle close with sound effect
   */
  const handleClose = () => {
    try {
      const audio = new Audio('/audio/close.mp3');
      audio.volume = 0.5;
      audio.play().catch(error => {
        if (process.env.NODE_ENV !== "production") console.log('Audio play failed:', error);
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.log('Audio creation failed:', error);
    }
    onClose();
  };

  /**
   * Handle reaction events
   */
  const handleReaction = async (reaction, messageId) => {
    const now = Date.now();
    const currentUserId = user?.id || 'anonymous';

    // Rate limiting checks
    if (now - lastReactionTime < RATE_LIMITS.global) {
      if (process.env.NODE_ENV !== "production") console.log('Rate limited: too fast');
      return;
    }

    if (reaction === 'lightning_spark' && now - lastLightningTime < RATE_LIMITS.lightning_spark) {
      if (process.env.NODE_ENV !== "production") console.log('Rate limited: lightning too fast');
      return;
    }

    if (messageId) {
      const cooldownKey = `${messageId}_${reaction}`;
      const lastMessageReaction = messageReactionCooldowns[cooldownKey] || 0;
      if (now - lastMessageReaction < RATE_LIMITS.message_repeat) {
        if (process.env.NODE_ENV !== "production") console.log('Rate limited: same reaction on same message');
        return;
      }
    }

    // Soul star special handling
    if (reaction === 'soul_star') {
      markSoulStarUsed(currentUserId);
    }

    try {
      // Play sound by reaction
      const reactionAudioMap = {
        heart_pulse: '/audio/heart-pulse.MP3',
        water_ripple: '/audio/water-ripple.MP3',
        lightning_spark: '/audio/lightning-spark.MP3',
        shadow_glow: '/audio/shadow-glow.MP3',
        alien_wave: '/audio/alien-wave.MP3',
      };
      const audioSrc = reactionAudioMap[reaction];
      if (audioSrc) {
        try {
          const audio = new Audio(audioSrc);
          audio.volume = 0.5;
          audio.play().catch(err => {
            DEBUG && console.log('Reaction audio play blocked or failed:', err);
          });
        } catch (e) {
          DEBUG && console.log('Reaction audio init failed:', e);
        }
      }

      // Send reaction via chat service (broadcast for UI effects)
      await chatService.sendReaction(reaction, messageId, currentUserId);

      // Persist reaction counts to heart_signal_messages via RPC when applicable
      if (messageId) {
        const mapReactionToEmoji = (r) => ({
          heart_pulse: 'heart',
          water_ripple: 'water',
          lightning_spark: 'lightning',
          shadow_glow: 'darkness',
          alien_wave: 'alien',
        })[r];
        const emoji = mapReactionToEmoji(reaction);

        // Only attempt DB update for supported mapped reactions
        if (emoji) {
          try {
            const { data: isNowReacted, error } = await supabaseClient.rpc('toggle_heart_signal_reaction', {
              p_message_id: messageId,
              p_emoji: emoji,
            });
            if (error) {
              console.error('Failed to persist reaction count:', error);
            } else {
              if (process.env.NODE_ENV !== "production") console.log(`Reaction ${emoji} persisted for message ${messageId}:`, isNowReacted);
            }
          } catch (e) {
            console.error('Error calling toggle_heart_signal_reaction RPC:', e);
          }
        }
      }

      // Update rate limiting state
      setLastReactionTime(now);
      if (reaction === 'lightning_spark') {
        setLastLightningTime(now);
      }
      if (messageId) {
        const cooldownKey = `${messageId}_${reaction}`;
        setMessageReactionCooldowns(prev => ({
          ...prev,
          [cooldownKey]: now
        }));
      }

      // Optimistic local update
      if (messageId) {
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: {
            ...prev[messageId],
            [reaction]: (prev[messageId]?.[reaction] || 0) + 1
          }
        }));
      } else {
        // Add room reaction
        // Ensure only the latest reaction from this user is shown at a time
        const roomReaction = {
          id: `${currentUserId}_${now}`,
          reaction,
          user_id: currentUserId,
          created_at: new Date().toISOString()
        };
        setRoomReactions(prev => {
          // Remove any active room reactions from the same user to avoid stacking
          const others = prev.filter(r => r.user_id !== currentUserId);
          return [...others, roomReaction];
        });
      }

      if (process.env.NODE_ENV !== "production") console.log(`✨ ${reaction} sent for ${messageId ? 'message' : 'room'}`);
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  /**
   * Handle room reaction complete (animation finished)
   */
  const handleRoomReactionComplete = (reactionId) => {
    setRoomReactions(prev => prev.filter(r => r.id !== reactionId));
  };

  // Panel variants for smooth sliding animation
  const panelVariants = {
    closed: {
      x: '-100%',
      opacity: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40
      }
    },
    open: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40
      }
    }
  };

  // Backdrop variants
  const backdropVariants = {
    closed: { opacity: 0 },
    open: { opacity: 1 }
  };

  // Chat is now always available (not gated behind live status)

  return (
    <AnimatePresence>
      {/* Backdrop */}
      {isOpen && (
        <motion.div
          key="chat-backdrop"
          className="absolute inset-0 z-[100]"
          variants={backdropVariants}
          initial="closed"
          animate="open"
          exit="closed"
          onClick={onClose}
        />
      )}

      {/* Chat Panel */}
      {isOpen && (
        <>
        <motion.div
          key="chat-panel"
          className={`absolute z-[110] flex overflow-hidden left-0 right-0 ${isChatCollapsed ? 'bottom-0' : 'inset-0'}`}
          style={isChatCollapsed ? { top: 'auto', height: '55%' } : undefined}
          variants={panelVariants}
          initial="closed"
          animate="open"
          exit="closed"
        >
            <div
              className="w-full h-full flex flex-col overflow-hidden"
              style={{
                background: `
                  linear-gradient(135deg,
                    rgba(0, 0, 0, 0.05) 0%,
                    rgba(0, 20, 40, 0.03) 50%,
                    rgba(0, 0, 0, 0.05) 100%
                  )
                `,
                boxShadow: `
                  0 0 50px rgba(242, 239, 29, 0.08),
                  inset 0 0 100px rgba(242, 239, 29, 0.01)
                `,
                backdropFilter: 'blur(2px)',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                overscrollBehavior: 'contain'
              }}
            >

              {/* Content Area */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative" style={{ overscrollBehavior: 'contain' }}>

                {/* Collapse/Expand toggle — hidden when viewing a profile */}
                {!selectedUser && <button
                  onClick={() => {
                    try { sfx.play('audio/click.mp3', 0.5); } catch {}
                    setIsChatCollapsed(prev => !prev);
                  }}
                  onMouseEnter={() => { try { sfx.play('hover', 0.2); } catch {} }}
                  className="text-yellow-400 hover:text-yellow-300 transition-all duration-200 hover:scale-110"
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '8px',
                    zIndex: 20,
                    background: 'rgba(242, 239, 29, 0.2)',
                    borderRadius: '6px',
                    border: '2px solid rgba(242, 239, 29, 0.6)',
                    color: '#F2EF1D',
                    textShadow: '0 0 12px rgba(242, 239, 29, 0.8)',
                    boxShadow: '0 0 16px rgba(242, 239, 29, 0.4)',
                    fontSize: '14px',
                    minWidth: '28px',
                    minHeight: '28px',
                    padding: '2px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title={isChatCollapsed ? 'Expand chat' : 'Collapse chat'}
                >
                  {isChatCollapsed ? '▲' : '▼'}
                </button>}

                <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* User List */}
                <div
                  className={`border-r border-cyan-400/20 transition-all duration-300 ease-in-out flex-shrink-0 ${
                    isUserPanelCollapsed ? 'w-8' : selectedUser ? 'w-32 sm:w-40 md:w-48' : 'w-48'
                  }`}
                >
                  {/* Collapse Toggle Button */}
                  <div className="h-full flex flex-col">
                    <button
                      onClick={() => {
                        try {
                          const audio = new Audio('/audio/close.mp3');
                          audio.volume = 0.5;
                          audio.play().catch(error => {
                            if (process.env.NODE_ENV !== "production") console.log('Collapse audio play failed:', error);
                          });
                        } catch (error) {
                          if (process.env.NODE_ENV !== "production") console.log('Collapse audio creation failed:', error);
                        }
                        setIsUserPanelCollapsed(!isUserPanelCollapsed);
                      }}
                      className="w-full py-1 px-2 hover:bg-yellow-400/10 transition-colors duration-200 border-b border-cyan-400/20 flex items-center justify-between relative"
                      style={{
                        color: '#F2EF1D',
                        textShadow: '0 0 8px rgba(242, 239, 29, 0.6)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#FFFF99';
                        e.target.style.textShadow = '0 0 12px rgba(242, 239, 29, 0.8)';
                        try { sfx.play('hover', 0.3); } catch {}
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#F2EF1D';
                        e.target.style.textShadow = '0 0 8px rgba(242, 239, 29, 0.6)';
                      }}
                      title={isUserPanelCollapsed ? "Show users" : "Hide users"}
                    >
                      {/* ONLINE label on the left */}
                      {!isUserPanelCollapsed && (
                        <p
                          className="text-sm font-semibold"
                          style={{
                            color: '#F2EF1D',
                            textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
                            fontSize: '16px'
                          }}
                        >
                          ALIENS ONLINE
                        </p>
                      )}
                      
                      {/* Arrow on the right */}
                      <div 
                        className="transition-transform duration-200"
                        style={{
                          transform: isUserPanelCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
                        }}
                      >
                        ▶
                      </div>
                      {/* User count when collapsed */}
                      {isUserPanelCollapsed && chatUsers.length > 0 && (
                        <div className="flex flex-col items-center">
                          <div 
                            className="text-xs mt-1 px-1 rounded-full min-w-4 h-4 flex items-center justify-center"
                            style={{
                              background: 'rgba(0, 255, 255, 0.2)',
                              border: '1px solid rgba(0, 255, 255, 0.5)',
                              fontSize: '10px'
                            }}
                          >
                            {chatUsers.length}
                          </div>
                          {/* Typing indicator when collapsed */}
                          {typingUsers.length > 0 && (
                            <div 
                              className="mt-1 w-2 h-2 rounded-full animate-pulse"
                              style={{
                                background: '#F2EF1D',
                                boxShadow: '0 0 4px rgba(242, 239, 29, 0.6)'
                              }}
                            />
                          )}
                        </div>
                      )}
                    </button>
                    
                    {/* User List Content */}
                    <div className={`flex-1 overflow-hidden transition-all duration-300 ${
                      isUserPanelCollapsed ? 'opacity-0' : 'opacity-100'
                    }`}>
                      {!isUserPanelCollapsed && (() => {
                        let usersToShow = chatUsers;
                        
                        // If no users and authenticated, show current user
                        if (chatUsers.length === 0 && user && profile?.name) {
                          usersToShow = [{
                            id: user.id,
                            name: profile.name,
                            element: profile.element || null,
                            avatar_badge_id: profile.avatar_badge_id || null,
                            profile_image_url: profile.profile_image_url || null,
                            last_seen: new Date().toISOString()
                          }];
                        }
                        // If no users and not authenticated, show guest user with resolved name
                        else if (chatUsers.length === 0 && !resolvedUserId) {
                          const guestUsername = resolvedName || 'ALIEN000000';
                          usersToShow = [normalizeUser({
                            id: `guest-${guestUsername}`,
                            name: guestUsername,
                            element: 'alien',
                            avatar_badge_id: null,
                            last_seen: new Date().toISOString()
                          })];
                        }
                        
                        DEBUG && console.log('🔥 Rendering UserList:', { usersToShow, user: !!user, profileName: profile?.name });
                        return (
                          <UserList 
                            users={usersToShow}
                            onUserClick={handleUserClick}
                            loading={loading}
                            currentUserProfile={profile}
                          />
                        );
                      })()}
                    </div>
                    
                    {/* Voting Section */}
                    <div className={`border-t border-cyan-400/20 transition-all duration-300 ${
                      isUserPanelCollapsed ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100'
                    }`}>
                      <button
                        onClick={() => {
                          try {
                            const audio = new Audio('/audio/close.mp3');
                            audio.volume = 0.5;
                            audio.play().catch(error => {
                              if (process.env.NODE_ENV !== "production") console.log('Vote toggle audio play failed:', error);
                            });
                          } catch (error) {
                            if (process.env.NODE_ENV !== "production") console.log('Vote toggle audio creation failed:', error);
                          }
                          setIsVotingPanelCollapsed(!isVotingPanelCollapsed);
                        }}
                        className="w-full py-1 px-2 hover:bg-yellow-400/10 transition-colors duration-200 border-b border-cyan-400/20 flex items-center justify-between relative"
                        style={{
                          color: '#F2EF1D',
                          textShadow: '0 0 8px rgba(242, 239, 29, 0.6)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.color = '#FFFF99';
                          e.target.style.textShadow = '0 0 12px rgba(242, 239, 29, 0.8)';
                          try { sfx.play('hover', 0.3); } catch {}
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = '#F2EF1D';
                          e.target.style.textShadow = '0 0 8px rgba(242, 239, 29, 0.6)';
                        }}
                        title={isVotingPanelCollapsed ? "Show voting" : "Hide voting"}
                      >
                        {/* VOTING label on the left */}
                        <p 
                          className="text-sm font-semibold"
                          style={{
                            color: '#F2EF1D',
                            textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
                            fontSize: '16px'
                          }}
                        >
                          VOTING
                        </p>
                        
                        {/* Arrow on the right */}
                        <div
                          className="transition-transform duration-200"
                          style={{
                            transform: isVotingPanelCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
                          }}
                        >
                          ▲
                        </div>
                      </button>
                      
                      {/* Voting Panel Content */}
                      <div className={`transition-all duration-300 overflow-hidden ${
                        isVotingPanelCollapsed ? 'max-h-0 opacity-0' : 'max-h-[400px] opacity-100'
                      }`}>
                        {!isVotingPanelCollapsed && (
                          <VotingPanel />
                        )}
                      </div>

                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className={`flex flex-col transition-all duration-300 ${selectedUser ? 'hidden' : 'flex-1'} min-h-0 overflow-hidden`}>
                  {/* Messages Container - takes up remaining space and scrolls */}
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Always show messages */}
                    <MessageList 
                      messages={messages}
                      onUserClick={handleUserClick}
                      loading={loading}
                      messageReactions={messageReactions}
                      onReact={handleReaction}
                      currentUserId={user?.id || 'anonymous'}
                      currentUserElement={profile?.element || null}
                      currentUserProfileImageUrl={profile?.profile_image_url || null}
                      userProfilesById={userProfilesById}
                      onUserClickByName={(name) => {
                        try {
                          const audio = new Audio('/audio/click.mp3');
                          audio.volume = 0.3;
                          audio.play().catch(() => {});
                        } catch {}
                        const match = chatUsers.find(u => (u.name || '').trim() === name.trim());
                        if (match) { handleUserClick(match.id); return; }
                        if (profile?.name && profile.name.trim() === name.trim() && user?.id) { handleUserClick(user.id); return; }
                        const ci = chatUsers.find(u => (u.name || '').toLowerCase() === name.toLowerCase());
                        if (ci) { handleUserClick(ci.id); }
                      }}
                    />
                  </div>
                  
                  {/* Bottom Fixed Section - typing indicators and input */}
                  <div className="flex-shrink-0">
                    {/* Typing Indicators */}
                    {typingUsers.length > 0 && (
                      <div className="px-3 py-2 border-t border-cyan-400/20">
                        <div className="text-xs text-white/60">
                          {typingUsers.map(user => user.display_name).join(', ')} 
                          {typingUsers.length === 1 ? ' is' : ' are'} typing
                          <span className="inline-flex ml-1">
                            <span className="animate-pulse">.</span>
                            <span className="animate-pulse" style={{animationDelay: '0.2s'}}>.</span>
                            <span className="animate-pulse" style={{animationDelay: '0.4s'}}>.</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Message Input - shown when no profile is selected */}
                    {!selectedUser && (
                      <MessageInput 
                        onSendMessage={handleSendMessage}
                        onTyping={handleTyping}
                        onRoomReaction={handleReaction}
                        showRoomReactionTray={showRoomReactionTray}
                        setShowRoomReactionTray={setShowRoomReactionTray}
                        user={user}
                        currentUserElement={profile?.element || null}
                      />
                    )}
                  </div>
                </div>

                {/* Profile Panel - full width when user is selected */}
                {selectedUser && (
                  <div className="flex-1 border-l border-yellow-400/30 flex flex-col overflow-hidden h-full">
                    {/* Profile Header */}
                    <div className="relative px-2 py-1 sm:px-3 sm:py-1.5 border-b border-yellow-400/30">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col flex-1 min-w-0">
                          {/* User Icon and Name Row */}
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {/* User Icon */}
                              {selectedUser.id === 'anonymous' ? (
                                <img src="/elements/alien.webp" alt="Alien" className="w-14 h-14 flex-shrink-0 relative -top-8" draggable={false} />
                              ) : selectedUser?.profile_image_url ? (
                                <img 
                                  src={selectedUser.profile_image_url} 
                                  alt="Profile" 
                                  className="w-14 h-14 rounded-full flex-shrink-0 object-cover relative -top-8"
                                  draggable={false}
                                  style={{
                                    border: '1px solid rgba(242, 239, 29, 0.5)',
                                    boxShadow: '0 0 8px rgba(242, 239, 29, 0.3)'
                                  }}
                                  onError={(e) => {
                                    // Fallback to element icon if provided
                                    const target = e.target;
                                    if (target && target.parentElement) {
                                      target.parentElement.innerHTML = '';
                                      const img = document.createElement('img');
                                      const el = (selectedUser.element || '').toLowerCase();
                                      img.src = el ? `/elements/${el}.webp` : '/elements/chxndler.webp';
                                      img.alt = 'Element';
                                      img.className = 'w-10 h-10 flex-shrink-0 object-cover';
                                      target.parentElement.appendChild(img);
                                    }
                                  }}
                                />
                              ) : (
                                // Fallback to element icon if no profile image
                                <img 
                                  src={selectedUser?.element ? `/elements/${String(selectedUser.element).toLowerCase()}.webp` : '/elements/chxndler.webp'}
                                  alt="Element"
                                  className="w-14 h-14 flex-shrink-0 object-cover rounded-full relative -top-8"
                                  draggable={false}
                                  style={{
                                    border: '1px solid rgba(242, 239, 29, 0.5)',
                                    boxShadow: '0 0 8px rgba(242, 239, 29, 0.3)'
                                  }}
                                />
                              )}
                              
                              <div className="flex flex-col mt-3 ml-2">
                                <div className="flex items-start gap-2">
                                  <h3 
                                    className="text-xl font-bold truncate"
                                    style={{
                                      color: '#F2EF1D',
                                      textShadow: '0 0 8px #F2EF1D',
                                      fontSize: '28px'
                                    }}
                                  >
                                    {selectedUser.id === 'anonymous' ? alienName : (selectedUser.name || getDisplayName())}
                                  </h3>
                                </div>
                                
                                {/* Journey directly below user name */}
                                <span
                                  className={"text-base font-bold " + (
                                    ((selectedUser.id === 'anonymous')
                                      ? 'WANDERER'
                                      : (user && profile?.journey)
                                        ? String(profile.journey).toUpperCase()
                                        : 'WANDERER') === 'LOVER'
                                      ? 'text-pink-400'
                                      : (((selectedUser.id === 'anonymous')
                                          ? 'WANDERER'
                                          : (user && profile?.journey)
                                            ? String(profile.journey).toUpperCase()
                                            : 'WANDERER') === 'DREAMER'
                                          ? 'text-yellow-400'
                                          : 'text-cyan-400')
                                  )}
                                  style={{ lineHeight: '1.2' }}
                                >
                                  { (selectedUser.id === 'anonymous')
                                    ? 'WANDERER'
                                    : (user && profile?.journey)
                                      ? String(profile.journey).toUpperCase()
                                      : 'WANDERER' }
                                </span>
                                
                                {/* Element name */}
                                <div className="mt-1">
                                  <span 
                                    className="text-sm font-bold"
                                    style={{
                                      color: getElementColor(selectedUser?.element ? String(selectedUser.element).toUpperCase() : 'CHXNDLER'),
                                      textShadow: `0 0 4px ${getElementColor(selectedUser?.element ? String(selectedUser.element).toUpperCase() : 'CHXNDLER')}80`,
                                      lineHeight: '1.2'
                                    }}
                                  >
                                    {selectedUser?.element ? String(selectedUser.element).toUpperCase() : 'CHXNDLER'}
                                  </span>

                                  {/* Action buttons below element */}
                                  <div className="mt-2 w-full flex items-center justify-center gap-2">
                                      {/* Binder Button */}
                                      <button
                                        onClick={() => {
                                          try { sfx.play('click', 0.8); } catch {}
                                          // Toggle inline card collection instead of opening modal
                                          // Hide badges when showing card collection
                                          if (!showUserBinder) {
                                            setShowUserBadges(false);
                                          }
                                          setShowUserBinder(!showUserBinder);
                                        }}
                                        onMouseEnter={(e) => {
                                          try { sfx.play('hover', 0.3); } catch {}
                                          e.currentTarget.style.transform = 'scale(1.1)';
                                          const img = e.currentTarget.querySelector('img');
                                          if (img) {
                                            img.style.filter = 'drop-shadow(0 0 8px rgba(252, 84, 175, 0.8)) drop-shadow(0 0 16px rgba(252, 84, 175, 0.4)) drop-shadow(0 0 20px rgba(255, 105, 180, 0.8))';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'scale(1)';
                                          const img = e.currentTarget.querySelector('img');
                                          if (img) {
                                            img.style.filter = 'drop-shadow(0 0 4px rgba(252, 84, 175, 0.6))';
                                          }
                                        }}
                                        className="w-12 h-12 sm:w-14 sm:h-14 rounded transition-all duration-200 flex-shrink-0"
                                        title="Open Binder"
                                      >
                                        <img
                                          src="/elements/binder.webp"
                                          alt="Binder"
                                          className="w-full h-full object-cover rounded"
                                          draggable={false}
                                          style={{
                                            filter: 'drop-shadow(0 0 4px rgba(252, 84, 175, 0.6))'
                                          }}
                                          draggable={false}
                                        />
                                      </button>

                                      {/* Badges Button */}
                                      <button
                                        onClick={() => {
                                          try { sfx.play('click', 0.8); } catch {}
                                          // Toggle inline badges display instead of opening modal
                                          // Hide card collection when showing badges
                                          if (!showUserBadges) {
                                            setShowUserBinder(false);
                                          }
                                          setShowUserBadges(!showUserBadges);
                                        }}
                                        onMouseEnter={(e) => {
                                          try { sfx.play('hover', 0.3); } catch {}
                                          e.currentTarget.style.transform = 'scale(1.1)';
                                          const img = e.currentTarget.querySelector('img');
                                          if (img) {
                                            img.style.filter = 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 16px rgba(255, 215, 0, 0.4)) drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'scale(1)';
                                          const img = e.currentTarget.querySelector('img');
                                          if (img) {
                                            img.style.filter = 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))';
                                          }
                                        }}
                                        className="w-12 h-12 sm:w-14 sm:h-14 rounded transition-all duration-200 flex-shrink-0"
                                        title="Open Badges"
                                      >
                                        <img
                                          src="/elements/badges.webp"
                                          alt="Badges"
                                          className="w-full h-full object-cover rounded"
                                          draggable={false}
                                          style={{
                                            filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.6))'
                                          }}
                                          draggable={false}
                                        />
                                      </button>

                                      {/* Heart Coin Button - Disabled */}
                                      <button
                                        disabled
                                        className="w-12 h-12 sm:w-14 sm:h-14 rounded transition-all duration-200 flex-shrink-0 opacity-40 cursor-not-allowed"
                                        title="Heart Coins (Disabled)"
                                      >
                                        <img
                                          src="/elements/heart-coin.webp"
                                          alt="Heart Coins"
                                          className="w-full h-full object-cover rounded"
                                          draggable={false}
                                          style={{
                                            filter: 'drop-shadow(0 0 2px rgba(255, 105, 180, 0.3))'
                                          }}
                                          draggable={false}
                                        />
                                      </button>
                                    </div>
                                </div>
                              </div>
                            </div>
                          
                            
                          </div>
                        </div>
                        {/* Close button aligned to far right */}
                        <button
                          onClick={() => {
                            try {
                              const audio = new Audio('/audio/close.mp3');
                              audio.volume = 0.5;
                              audio.play().catch(error => {
                                if (process.env.NODE_ENV !== "production") console.log('Close audio play failed:', error);
                              });
                            } catch (error) {
                              if (process.env.NODE_ENV !== "production") console.log('Close audio creation failed:', error);
                            }
                            setSelectedUser(null);
                            setSelectedUserCards([]);
                            setShowUserBadges(false);
                            setShowUserBinder(false);
                            setShowSendHeartCoin(false);
                            setBinderStartIndex(0);
                          }}
                          onMouseEnter={() => {
                            try { sfx.play('hover', 0.3); } catch {}
                          }}
                          className="absolute right-2 top-1 z-10 text-yellow-400 hover:text-yellow-300 transition-all duration-200 text-xl px-3 py-1 rounded"
                          style={{
                            background: 'rgba(242, 239, 29, 0.15)',
                            border: '1px solid #F2EF1D',
                            color: '#F2EF1D',
                            textShadow: '0 0 10px rgba(242, 239, 29, 0.7)',
                            boxShadow: '0 0 12px rgba(242, 239, 29, 0.45)'
                          }}
                          aria-label="Close profile"
                          title="Close"
                        >
                          ×
                        </button>
                        
                        {/* Total Heart Coins positioned directly below X button */}
                        <div className="absolute right-2 top-12 z-10 flex flex-col items-center space-y-1">
                          <div className="flex items-center space-x-1">
                            <img 
                              src="/elements/heart-coin.webp" 
                              alt="Total Heart Coins" 
                              className="w-6 h-6"
                              draggable={false}
                            />
                            <span className="text-lg text-pink-400 font-bold">
                              {selectedUser.id === 'anonymous' 
                                ? 0 
                                : (user && profile?.heartcoin_balance !== undefined) 
                                  ? profile.heartcoin_balance 
                                  : (selectedUser.total_heart_coins || 0)
                              }
                            </span>
                            <span className="text-sm text-white/80">earned</span>
                          </div>
                          <div className="text-sm text-white/80 text-center bg-black/30 px-1 py-0.5 rounded -mt-0.5">
                            <span className="text-yellow-400 font-bold">
                              Streak: {selectedUser.id === 'anonymous' 
                                ? 0 
                                : (user && profile?.daily_streak !== undefined) 
                                  ? profile.daily_streak 
                                  : 0
                              } Days
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Profile Content - scrollable */}
                    <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-4">


                      {/* Badges Section */}
                      {showUserBadges && (
                        <div className="pt-2 border-t border-white/20">
                          <h4 className="text-sm font-semibold mb-1 flex items-center"
                              style={{ 
                                color: '#1E90FF',
                                textShadow: '0 0 10px rgba(0,255,255,0.8), 0 0 20px rgba(0,255,255,0.6), 0 0 30px rgba(0,255,255,0.4)',
                                filter: 'brightness(1.2)',
                                WebkitTextStroke: '1px rgba(0,255,255,0.3)'
                              }}>
                            <img src="/elements/badges.webp" alt="Badges" className="w-4 h-4 mr-2" draggable={false} />
                            BADGES CLAIMED
                          </h4>
                          
                          {(() => {
                            // Determine which badges to show
                            const isViewingOwnProfile = selectedUser && user && selectedUser.id === user.id;
                            const isViewingAnonymous = selectedUser && selectedUser.id === 'anonymous';
                            
                            // Use actual unlocked badges from ProfileContext
                            const badgesToShow = isViewingOwnProfile && unlockedBadges ? unlockedBadges : []; // Only show badges for own profile
                            
                            DEBUG && console.log('🔥 Badge display debug:', {
                              isViewingOwnProfile,
                              isViewingAnonymous,
                              unlockedBadges,
                              badgesToShow,
                              badgeStartIndex,
                              totalBadges: badgesToShow?.length,
                              firstBadge: badgesToShow?.[0]
                            });
                            
                            return (
                              <>
                                {/* Show message for anonymous users or other users */}
                                {(isViewingAnonymous || (!isViewingOwnProfile && selectedUser?.id !== user?.id)) && (
                                  <div className="text-center py-4">
                                    <div className="flex justify-center space-x-2">
                                      {Array.from({ length: 5 }, (_, index) => (
                                        <div 
                                          key={`placeholder-${index}`}
                                          className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-dashed"
                                          style={{
                                            background: 'rgba(128, 128, 128, 0.1)',
                                            border: '2px dashed rgba(128, 128, 128, 0.3)',
                                            boxShadow: 'inset 0 0 8px rgba(0, 0, 0, 0.2)'
                                          }}
                                        >
                                          <span className="text-xs opacity-30">◯</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Show loading state */}
                                {badgesLoading && isViewingOwnProfile && (
                                  <div className="text-center py-4">
                                    <div className="text-sm text-white/60 mb-2">Loading badges...</div>
                                    <div className="flex justify-center space-x-2">
                                      {Array.from({ length: 5 }, (_, index) => (
                                        <div 
                                          key={`loading-${index}`}
                                          className="w-12 h-12 rounded-full flex items-center justify-center border-2 animate-pulse"
                                          style={{
                                            background: 'rgba(242, 239, 29, 0.1)',
                                            border: '2px solid rgba(242, 239, 29, 0.3)',
                                            boxShadow: '0 0 8px rgba(242, 239, 29, 0.2)'
                                          }}
                                        >
                                          <span className="text-xs opacity-50">...</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Show badge section for own profile with unlocked badges */}
                                {isViewingOwnProfile && !badgesLoading && badgesToShow && badgesToShow.length > 0 && (
                                  <div className="flex items-center space-x-2">
                                    {/* Left Arrow */}
                                    <button 
                                      onClick={() => {
                                        try {
                                          const audio = new Audio('/audio/click.mp3');
                                          audio.volume = 0.3;
                                          audio.play().catch(error => {
                                            if (process.env.NODE_ENV !== "production") console.log('Click audio play failed:', error);
                                          });
                                        } catch (error) {
                                          if (process.env.NODE_ENV !== "production") console.log('Click audio creation failed:', error);
                                        }
                                        setBadgeStartIndex(Math.max(0, badgeStartIndex - 4));
                                      }}
                                      disabled={!badgesToShow || badgesToShow.length === 0 || badgeStartIndex === 0}
                                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-yellow-400 hover:text-yellow-300 disabled:text-yellow-400/30 transition-colors"
                                      style={{
                                        textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        textRendering: 'optimizeLegibility',
                                        WebkitFontSmoothing: 'antialiased',
                                        MozOsxFontSmoothing: 'grayscale',
                                        filter: 'none',
                                        backdropFilter: 'none'
                                      }}
                                    >
                                      ◀
                                    </button>

                                    {/* Badge Grid - shows 4 slots for own profile */}
                                    <div className="flex-1 grid grid-cols-4 gap-2">
                                      {Array.from({ length: 4 }, (_, index) => {
                                        const badgeIndex = badgeStartIndex + index;
                                        const badge = badgesToShow?.[badgeIndex];
                                
                                if (badge) {
                                  // Get badge category color for display
                                  const getCategoryColors = (category) => {
                                    switch(category) {
                                      case 'soul': return { bg: '#FFD700', border: '#FFA500' };
                                      case 'collector': return { bg: '#38B6FF', border: '#0EA5E9' };
                                      case 'community': return { bg: '#10B981', border: '#059669' };
                                      case 'elemental-streak': return { bg: '#FC54AF', border: '#EC4899' };
                                      case 'currency': return { bg: '#FFD700', border: '#FFA500' };
                                      case 'listening': return { bg: '#9333EA', border: '#7C3AED' };
                                      default: return { bg: '#FFD700', border: '#FFA500' };
                                    }
                                  };
                                  
                                  const colors = getCategoryColors(badge.category);
                                  
                                  // Try to get icon from icon_url or use a default based on category
                                  const getDisplayIcon = (badge) => {
                                    // Fallback emoji icons based on category
                                    switch(badge.category) {
                                      case 'soul': return '⭐';
                                      case 'collector': return '🏆';
                                      case 'community': return '🌐';
                                      case 'elemental-streak': return '💠';
                                      case 'currency': return '💰';
                                      case 'listening': return '🎵';
                                      default: return '🏆';
                                    }
                                  };
                                  
                                  const displayIcon = getDisplayIcon(badge);
                                  
                                  return (
                                    <div key={`earned-badge-${badge.id}`} className="flex flex-col items-center" title={badge.badge_name}>
                                      <div 
                                        className="relative overflow-hidden w-12 h-12 rounded-full mb-1 flex items-center justify-center border-2 transition-all duration-300 cursor-pointer hover:scale-110"
                                        style={{
                                          background: 'rgba(0, 0, 0, 0.3)',
                                          border: `2px solid ${colors.border}`,
                                          boxShadow: `0 0 15px ${colors.border}60, 0 0 25px ${colors.border}30`
                                        }}
                                        onMouseEnter={() => {
                                          try {
                                            const audio = new Audio('/audio/hover.mp3');
                                            audio.volume = 0.3;
                                            audio.play().catch(error => {
                                              if (process.env.NODE_ENV !== "production") console.log('Hover audio play failed:', error);
                                            });
                                          } catch (error) {
                                            if (process.env.NODE_ENV !== "production") console.log('Hover audio creation failed:', error);
                                          }
                                        }}
                                        onClick={() => {
                                          try {
                                            const audio = new Audio('/audio/flip.mp3');
                                            audio.volume = 0.8;
                                            audio.play().catch(() => {});
                                          } catch {}
                                          setSelectedBadgePopup(badge);
                                        }}
                                      >
                                        {badge.icon_url ? (
                                          <>
                                            <img
                                              src={badge.icon_url}
                                              alt={badge.badge_name || 'Badge'}
                                              className="absolute inset-0 w-full h-full object-cover rounded-full"
                                              draggable={false}
                                              style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }}
                                              onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                              }}
                                            />
                                            <span
                                              className="text-2xl"
                                              style={{
                                                filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))',
                                                display: 'none'
                                              }}
                                            >
                                              {displayIcon}
                                            </span>
                                          </>
                                        ) : (
                                          <span
                                            className="text-2xl"
                                            style={{
                                              filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))'
                                            }}
                                          >
                                            {displayIcon}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                } else {
                                  // Show grey placeholder slot
                                  return (
                                    <div key={`empty-badge-${badgeIndex}`} className="flex flex-col items-center">
                                      <div 
                                        className="w-12 h-12 rounded-full mb-1 flex items-center justify-center border-2 border-dashed"
                                        style={{
                                          background: 'rgba(128, 128, 128, 0.2)',
                                          border: '2px dashed rgba(128, 128, 128, 0.4)',
                                          boxShadow: 'inset 0 0 8px rgba(0, 0, 0, 0.3)'
                                        }}
                                      >
                                        <span className="text-sm opacity-40">◯</span>
                                      </div>
                                    </div>
                                  );
                                }
                              })}
                            </div>

                                    {/* Right Arrow */}
                                    <button 
                                      onClick={() => {
                                        try {
                                          const audio = new Audio('/audio/click.mp3');
                                          audio.volume = 0.3;
                                          audio.play().catch(error => {
                                            if (process.env.NODE_ENV !== "production") console.log('Click audio play failed:', error);
                                          });
                                        } catch (error) {
                                          if (process.env.NODE_ENV !== "production") console.log('Click audio creation failed:', error);
                                        }
                                        setBadgeStartIndex(Math.min(Math.max(0, (badgesToShow?.length || 0) - 4), badgeStartIndex + 4));
                                      }}
                                      disabled={!badgesToShow || badgesToShow.length <= 4 || badgeStartIndex + 4 >= badgesToShow.length}
                                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-yellow-400 hover:text-yellow-300 disabled:text-yellow-400/30 transition-colors"
                                      style={{
                                        textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        textRendering: 'optimizeLegibility',
                                        WebkitFontSmoothing: 'antialiased',
                                        MozOsxFontSmoothing: 'grayscale',
                                        filter: 'none',
                                        backdropFilter: 'none'
                                      }}
                                    >
                                      ▶
                                    </button>
                                  </div>
                                )}
                                
                                {/* Show empty badge slots for own profile when no badges are unlocked */}
                                {isViewingOwnProfile && !badgesLoading && (!badgesToShow || badgesToShow.length === 0) && (
                                  <div className="text-center py-4">
                                    <div className="text-sm text-white/60 mb-2">No badges unlocked yet</div>
                                    <div className="flex justify-center space-x-2">
                                      {Array.from({ length: 5 }, (_, index) => (
                                        <div 
                                          key={`empty-badge-${index}`}
                                          className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-dashed"
                                          style={{
                                            background: 'rgba(128, 128, 128, 0.1)',
                                            border: '2px dashed rgba(128, 128, 128, 0.3)',
                                            boxShadow: 'inset 0 0 8px rgba(0, 0, 0, 0.2)'
                                          }}
                                        >
                                          <span className="text-xs opacity-30">◯</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {/* Binder Section */}
                      {showUserBinder && (
                        <div style={{ marginTop: '-8px' }}>
                          <h4 className="text-base font-semibold mb-0 flex items-center" style={{ color: '#FF69B4' }}>
                            <img src="/elements/binder.webp" alt="Cards" className="w-4 h-4 mr-2" draggable={false} />
                            CARD COLLECTION
                          </h4>
                          <div className="flex items-center space-x-2">
                            {/* Left Arrow */}
                            <button 
                              onClick={() => {
                                try {
                                  const audio = new Audio('/audio/click.mp3');
                                  audio.volume = 0.3;
                                  audio.play().catch(error => {
                                    if (process.env.NODE_ENV !== "production") console.log('Click audio play failed:', error);
                                  });
                                } catch (error) {
                                  if (process.env.NODE_ENV !== "production") console.log('Click audio creation failed:', error);
                                }
                                setBinderStartIndex(Math.max(0, binderStartIndex - 5));
                              }}
                              onMouseEnter={() => {
                                try { sfx.play('hover', 0.3); } catch {}
                              }}
                              disabled={binderStartIndex === 0}
                              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-yellow-400 hover:text-yellow-300 disabled:text-yellow-400/30 transition-colors"
                              style={{
                                textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                textRendering: 'optimizeLegibility',
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                                filter: 'none',
                                backdropFilter: 'none'
                              }}
                            >
                              ◀
                            </button>

                            {/* Cards Grid */}
                            <div className="flex-1 grid grid-cols-4 gap-3">
                              {/* Display selected user's owned cards */}
                              {Array.from({ length: 4 }, (_, index) => {
                                // Build cards to show based on selected user
                                // CHXNDLER card is always first (everyone has it)
                                const chxndlerCard = songCollection.find(song => song.name === 'CHXNDLER');

                                let cardsToShow = [];

                                // For anonymous users: only show CHXNDLER
                                if (selectedUser?.id === 'anonymous') {
                                  cardsToShow = [chxndlerCard];
                                } else {
                                  // For authenticated users: show their owned cards from selectedUserCards
                                  // Convert selectedUserCards to display format
                                  const ownedCardNames = selectedUserCards.map(uc => uc.cards?.card_name).filter(Boolean);
                                  const ownedCards = songCollection.filter(song =>
                                    ownedCardNames.includes(song.name) && song.name !== 'CHXNDLER'
                                  );
                                  cardsToShow = [chxndlerCard, ...ownedCards];
                                }

                                const cardIndex = binderStartIndex + index;
                                const cardSong = cardsToShow[cardIndex];
                                const hasCard = !!cardSong;

                                const elementDisplay = cardSong ? getElementDisplay(cardSong.element) : null;
                                
                                return (
                                  <div 
                                    key={`card-slot-${cardIndex}`} 
                                    className="rounded-lg border border-white/10 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-2xl hover:-translate-y-1"
                                    style={{
                                      boxShadow: hasCard ? '0 0 8px rgba(255,105,180,0.4), 0 4px 12px rgba(255,105,180,0.2)' : '0 0 5px rgba(255,105,180,0.1)',
                                      aspectRatio: '2.2/3',
                                      background: 'rgba(0, 0, 0, 0.3)',
                                      transform: 'perspective(1000px)',
                                      backfaceVisibility: 'hidden'
                                    }}
                                    onMouseEnter={() => {
                                      if (hasCard) {
                                        try {
                                          const audio = new Audio('/audio/hover.mp3');
                                          audio.volume = 0.3;
                                          audio.play().catch(error => {
                                            if (process.env.NODE_ENV !== "production") console.log('Hover audio play failed:', error);
                                          });
                                        } catch (error) {
                                          if (process.env.NODE_ENV !== "production") console.log('Hover audio creation failed:', error);
                                        }
                                      }
                                    }}
                                    onClick={() => {
                                      if (hasCard && cardSong) {
                                        try {
                                          const audio = new Audio('/audio/click.mp3');
                                          audio.volume = 0.3;
                                          audio.play().catch(error => {
                                            if (process.env.NODE_ENV !== "production") console.log('Click audio play failed:', error);
                                          });
                                        } catch (error) {
                                          if (process.env.NODE_ENV !== "production") console.log('Click audio creation failed:', error);
                                        }
                                        setSelectedCardPopup({
                                          name: cardSong.name,
                                          element: cardSong.element,
                                          image: getCardImage(cardSong.name, cardSong.element),
                                          rarity: cardSong.rarity,
                                          isReleased: cardSong.is_released
                                        });
                                        setCardFlipped(false); // Reset flip state when opening new card
                                      }
                                    }}
                                  >
                                    {hasCard ? (
                                      // Show actual card image
                                      <div className="w-full h-full rounded-lg overflow-hidden relative">
                                        <img
                                          src={getCardImage(cardSong.name, cardSong.element)}
                                          alt={cardSong.name}
                                          className="w-full h-full object-contain"
                                          draggable={false}
                                          style={{
                                            boxShadow: '0 0 10px rgba(255,105,180,0.6)',
                                            padding: '2px'
                                          }}
                                          onError={(e) => {
                                            // Fallback to icon if image fails to load
                                            const target = e.target;
                                            target.style.display = 'none';
                                            const parent = target.parentElement;
                                            if (parent) {
                                              parent.innerHTML = `
                                                <div class="w-full h-full rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-400/50 flex flex-col items-center justify-center p-1">
                                                  <div class="text-lg mb-1" style="color: ${elementDisplay?.color || '#FFB6C1'}; filter: drop-shadow(0 0 4px rgba(255,182,193,0.8))">
                                                    ${elementDisplay?.icon || '🎵'}
                                                  </div>
                                                  <div class="text-xs font-bold text-center leading-tight" style="color: #FFB6C1; text-shadow: 0 0 4px rgba(255,182,193,0.6); font-size: 7px">
                                                    ${cardSong.name.split(' ').slice(0, 2).join(' ')}
                                                  </div>
                                                </div>
                                              `;
                                            }
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      // Show empty slot
                                      <div className="w-full h-full rounded-lg bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-2 border-dashed border-pink-400/30 flex items-center justify-center">
                                        <div 
                                          className="text-xs font-bold text-center"
                                          style={{ 
                                            color: '#FFB6C1', 
                                            textShadow: '0 0 4px rgba(255,182,193,0.6)',
                                            fontSize: '8px',
                                            opacity: 0.5
                                          }}
                                        >
                                          ○
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Right Arrow */}
                            <button 
                              onClick={() => {
                                try {
                                  const audio = new Audio('/audio/click.mp3');
                                  audio.volume = 0.3;
                                  audio.play().catch(error => {
                                    if (process.env.NODE_ENV !== "production") console.log('Click audio play failed:', error);
                                  });
                                } catch (error) {
                                  if (process.env.NODE_ENV !== "production") console.log('Click audio creation failed:', error);
                                }
                                // Get owned cards count for pagination based on selected user
                                const chxndlerCard = songCollection.find(song => song.name === 'CHXNDLER');
                                let cardsToShow = [];
                                if (selectedUser?.id === 'anonymous') {
                                  cardsToShow = [chxndlerCard];
                                } else {
                                  const ownedCardNames = selectedUserCards.map(uc => uc.cards?.card_name).filter(Boolean);
                                  const ownedCards = songCollection.filter(song =>
                                    ownedCardNames.includes(song.name) && song.name !== 'CHXNDLER'
                                  );
                                  cardsToShow = [chxndlerCard, ...ownedCards];
                                }
                                const totalCards = cardsToShow.length;
                                setBinderStartIndex(Math.min(Math.max(0, totalCards - 5), binderStartIndex + 5));
                              }}
                              onMouseEnter={() => {
                                try { sfx.play('hover', 0.3); } catch {}
                              }}
                              disabled={(() => {
                                const chxndlerCard = songCollection.find(song => song.name === 'CHXNDLER');
                                let cardsToShow = [];
                                if (selectedUser?.id === 'anonymous') {
                                  cardsToShow = [chxndlerCard];
                                } else {
                                  const ownedCardNames = selectedUserCards.map(uc => uc.cards?.card_name).filter(Boolean);
                                  const ownedCards = songCollection.filter(song =>
                                    ownedCardNames.includes(song.name) && song.name !== 'CHXNDLER'
                                  );
                                  cardsToShow = [chxndlerCard, ...ownedCards];
                                }
                                return binderStartIndex + 4 >= cardsToShow.length;
                              })()}
                              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-yellow-400 hover:text-yellow-300 disabled:text-yellow-400/30 transition-colors"
                              style={{
                                textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                textRendering: 'optimizeLegibility',
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                                filter: 'none',
                                backdropFilter: 'none'
                              }}
                            >
                              ▶
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Send Heart Coin Section */}
                      {showSendHeartCoin && (
                        <div className="pt-2 border-t border-white/20">
                          <h4 className="text-sm font-semibold mb-3 flex items-center" style={{ color: '#FF69B4' }}>
                            <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-4 h-4 mr-2" draggable={false} />
                            SEND HEARTCOIN
                          </h4>
                          <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-pink-400/30">
                            {/* YOU HAVE section on the left */}
                            <div className="flex flex-col items-start space-y-1">
                              <span className="text-sm text-pink-400 font-bold">YOU HAVE</span>
                              <div className="flex items-center space-x-2">
                                <img 
                                  src="/elements/heart-coin.webp" 
                                  alt="Heart Coins" 
                                  className="w-6 h-6"
                                  draggable={false}
                                />
                                <span className="text-lg text-pink-400 font-bold">{profile?.heartcoin_balance || 0}</span>
                              </div>
                            </div>
                            
                            {/* SEND button on the right */}
                            <button 
                              onClick={async () => {
                                try {
                                  const audio = new Audio('/audio/click.mp3');
                                  audio.volume = 0.3;
                                  audio.play().catch(error => {
                                    if (process.env.NODE_ENV !== "production") console.log('Click audio play failed:', error);
                                  });
                                } catch (error) {
                                  if (process.env.NODE_ENV !== "production") console.log('Click audio creation failed:', error);
                                }
                                
                                // Only allow transfers between authenticated users
                                if (!user || !profile?.name || selectedUser.id === 'anonymous' || selectedUser.id === user.id) {
                                  DEBUG && console.log('HeartCoin transfer not allowed for anonymous users or self-transfers');
                                  return;
                                }
                                
                                DEBUG && console.log('Sending 1 HeartCoin to:', selectedUser.name);
                                
                                // Import and use the transfer function
                                try {
                                  const { transferHeartCoins } = await import('@/utils/heartcoins');
                                  const { supabaseClient } = await import('@/lib/supabaseClient');
                                  
                                  const result = await transferHeartCoins(
                                    supabaseClient,
                                    user.id,
                                    selectedUser.id,
                                    1,
                                    `HeartCoin sent to ${selectedUser.name} via chat`
                                  );
                                  
                                  if (result.success) {
                                    DEBUG && console.log('✅ HeartCoin transfer successful:', result.transfer);
                                    setShowSendHeartCoin(false); // Hide interface after successful sending
                                    
                                    // Play success sound
                                    try {
                                      const successAudio = new Audio('/audio/success.mp3');
                                      successAudio.volume = 0.5;
                                      successAudio.play().catch(error => {
                                        if (process.env.NODE_ENV !== "production") console.log('Success audio play failed:', error);
                                      });
                                    } catch (error) {
                                      if (process.env.NODE_ENV !== "production") console.log('Success audio creation failed:', error);
                                    }
                                    
                                    // Optionally refresh user's profile to show updated balance
                                    // This could trigger a context refresh if available
                                    DEBUG && console.log('💛 HeartCoin transfer logged to heartcoin_transfers table');
                                    
                                  } else {
                                    console.error('❌ HeartCoin transfer failed:', result.error);
                                    
                                    // Show user-friendly error message
                                    let errorMessage = 'Transfer failed';
                                    if (result.error === 'Insufficient HeartCoins') {
                                      errorMessage = 'Not enough HeartCoins to send!';
                                    } else if (result.error === 'Receiver not found') {
                                      errorMessage = 'User not found';
                                    } else if (result.error === 'Not authenticated') {
                                      errorMessage = 'Please log in to send HeartCoins';
                                    }
                                    
                                    // Play error sound
                                    try {
                                      const errorAudio = new Audio('/audio/error.mp3');
                                      errorAudio.volume = 0.3;
                                      errorAudio.play().catch(error => {
                                        if (process.env.NODE_ENV !== "production") console.log('Error audio play failed:', error);
                                      });
                                    } catch (error) {
                                      if (process.env.NODE_ENV !== "production") console.log('Error audio creation failed:', error);
                                    }
                                    
                                    // TODO: Show error message to user in UI
                                    DEBUG && console.log('User error message:', errorMessage);
                                  }
                                } catch (error) {
                                  console.error('Error importing transfer function:', error);
                                }
                              }}
                              className="flex items-center space-x-2 px-6 py-3 bg-pink-500/20 border border-pink-400/60 hover:border-pink-400/80 rounded-lg transition-all duration-200 hover:bg-pink-500/30"
                              style={{
                                background: 'rgba(255, 105, 180, 0.1)',
                                color: '#FF69B4',
                                textShadow: '0 0 8px rgba(255, 105, 180, 0.6)',
                                boxShadow: '0 0 15px rgba(255, 105, 180, 0.3)',
                              }}
                            >
                              <span className="text-lg font-bold">SEND</span>
                              <img 
                                src="/elements/heart-coin.webp" 
                                alt="Heart Coin" 
                                className="w-6 h-6"
                                draggable={false}
                              />
                              <span className="text-lg font-bold">1</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Floating Room Reactions */}
          <FloatingRoomReactions
            reactions={roomReactions}
            onReactionComplete={handleRoomReactionComplete}
          />
        </>
      )}

      {/* Card Popup Modal */}
      {selectedCardPopup && (
        <div
          className="absolute inset-0 z-[2147483647] flex items-start justify-center pt-2 px-4 pb-4"
          style={{
            background: 'rgba(0, 0, 0, 0.8)'
          }}
          onClick={() => {
            setSelectedCardPopup(null);
            setCardFlipped(false);
          }}
        >
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
            style={{
              height: 'min(384px, calc(100% - 2rem))',
              aspectRatio: '2 / 3',
              maxWidth: '100%',
              perspective: '1000px',
              animation: 'cardPulse 2s ease-in-out infinite'
            }}
          >
            <TiltSpinCard
              className="w-full h-full"
              enableSpin={true}
              spinSensitivity={0.8}
              onRotationChange={(rotation) => setCardRotation(rotation)}
              onClick={() => {
                try {
                  const audio = new Audio('/audio/flip.mp3');
                  audio.volume = 0.8;
                  audio.play().catch(() => {});
                } catch {}
                setIsCardAnimatingFlip(true);
                setCardRotation((prev) => prev + 180);
                setTimeout(() => setIsCardAnimatingFlip(false), 500);
              }}
              style={{ cursor: 'grab', perspective: '1000px' }}
            >
              <div
                className="relative w-full h-full preserve-3d"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${cardRotation}deg)`,
                  transition: isCardAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                }}
              >
              {/* Front of card */}
              <div
                className="absolute inset-0 rounded-lg backface-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  background: `
                    linear-gradient(135deg, 
                      rgba(0, 0, 0, 0.05) 0%,
                      rgba(0, 20, 40, 0.03) 50%,
                      rgba(0, 0, 0, 0.05) 100%
                    )
                  `,
                  boxShadow: `
                    0 0 50px rgba(242, 239, 29, 0.08),
                    inset 0 0 100px rgba(242, 239, 29, 0.01),
                    0 0 30px rgba(255, 105, 180, 0.3)
                  `,
                  backdropFilter: 'blur(2px)',
                  border: '2px solid rgba(255, 105, 180, 0.4)'
                }}
              >
                {/* Card front image */}
                <div className="w-full h-full rounded-lg overflow-hidden relative">
                  <img
                    src={selectedCardPopup.image}
                    alt={selectedCardPopup.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                    style={{
                      boxShadow: '0 0 30px rgba(255,105,180,0.6)',
                    }}
                    onError={(e) => {
                      // Fallback display if image fails to load
                      const target = e.target;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const elementDisplay = getElementDisplay(selectedCardPopup.element);
                        parent.innerHTML = `
                          <div class="w-full h-full rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-400/50 flex flex-col items-center justify-center p-4">
                            <div class="text-6xl mb-4" style="color: ${elementDisplay?.color || '#FFB6C1'}; filter: drop-shadow(0 0 8px rgba(255,182,193,0.8))">
                              ${elementDisplay?.icon || '🎵'}
                            </div>
                            <div class="text-xl font-bold text-center leading-tight" style="color: #FFB6C1; text-shadow: 0 0 8px rgba(255,182,193,0.6)">
                              ${selectedCardPopup.name}
                            </div>
                            <div class="text-sm mt-2" style="color: #FFB6C1; opacity: 0.8">
                              ${selectedCardPopup.element} • ${selectedCardPopup.rarity}
                            </div>
                          </div>
                        `;
                      }
                    }}
                  />
                </div>
              </div>

              {/* Back of card */}
              <div
                className="absolute inset-0 rounded-lg backface-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: `
                    linear-gradient(135deg, 
                      rgba(0, 0, 0, 0.05) 0%,
                      rgba(0, 20, 40, 0.03) 50%,
                      rgba(0, 0, 0, 0.05) 100%
                    )
                  `,
                  boxShadow: `
                    0 0 50px rgba(242, 239, 29, 0.08),
                    inset 0 0 100px rgba(242, 239, 29, 0.01),
                    0 0 30px rgba(255, 105, 180, 0.3)
                  `,
                  backdropFilter: 'blur(2px)',
                  border: '2px solid rgba(255, 105, 180, 0.4)'
                }}
              >
                {/* Card back image */}
                <div className="w-full h-full rounded-lg overflow-hidden relative">
                  <img
                    src={getCardImageUrl('BACK')}
                    alt="Card Back"
                    className="w-full h-full object-cover"
                    draggable={false}
                    style={{
                      boxShadow: '0 0 30px rgba(255,105,180,0.6)',
                    }}
                  />
                </div>
              </div>
              </div>
            </TiltSpinCard>
          
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                try {
                  const audio = new Audio('/audio/click.mp3');
                  audio.volume = 0.3;
                  audio.play().catch(error => {
                    if (process.env.NODE_ENV !== "production") console.log('Click audio play failed:', error);
                  });
                } catch (error) {
                  if (process.env.NODE_ENV !== "production") console.log('Click audio creation failed:', error);
                }
                setSelectedCardPopup(null);
                setCardFlipped(false);
                setCardRotation(0);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
              style={{
                background: 'rgba(242, 239, 29, 0.2)',
                border: '1px solid rgba(242, 239, 29, 0.6)',
                color: '#F2EF1D',
                boxShadow: '0 0 10px rgba(242, 239, 29, 0.3)',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Badge Popup Modal */}
      {selectedBadgePopup && (
        <div
          className="absolute inset-0 z-[2147483647] flex items-center justify-center p-3"
          style={{ background: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => {
            setSelectedBadgePopup(null);
            setBadgeRotation(0); // Reset rotation when closing
          }}
        >
          <div
            className="relative w-full h-full max-h-[90%] rounded-lg p-4 flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 0 30px rgba(255, 105, 180, 0.25)'
            }}
          >
            {/* Close button - top right */}
            <button
              onClick={() => {
                try {
                  const audio = new Audio('/audio/close.mp3');
                  audio.volume = 0.3;
                  audio.play().catch(error => {
                    if (process.env.NODE_ENV !== "production") console.log('Close audio play failed:', error);
                  });
                } catch (error) {
                  if (process.env.NODE_ENV !== "production") console.log('Close audio creation failed:', error);
                }
                setSelectedBadgePopup(null);
                setBadgeRotation(0); // Reset rotation when closing
              }}
              onMouseEnter={() => {
                try {
                  const audio = new Audio('/audio/hover.mp3');
                  audio.volume = 0.3;
                  audio.play().catch(error => {
                    if (process.env.NODE_ENV !== "production") console.log('Hover audio play failed:', error);
                  });
                } catch (error) {
                  if (process.env.NODE_ENV !== "production") console.log('Hover audio creation failed:', error);
                }
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
              style={{
                background: 'rgba(242, 239, 29, 0.15)',
                border: '2px solid rgba(242, 239, 29, 0.6)',
                color: '#F2EF1D',
                boxShadow: '0 0 10px rgba(242, 239, 29, 0.3)'
              }}
            >
              <span className="text-lg font-bold leading-none">×</span>
            </button>
            {(() => {
              const getCategoryColors = (category) => {
                switch(category) {
                  case 'soul': return { bg: '#FFD700', border: '#FFA500' };
                  case 'collector': return { bg: '#38B6FF', border: '#0EA5E9' };
                  case 'community': return { bg: '#10B981', border: '#059669' };
                  case 'elemental-streak': return { bg: '#FC54AF', border: '#EC4899' };
                  case 'currency': return { bg: '#FFD700', border: '#FFA500' };
                  case 'listening': return { bg: '#9333EA', border: '#7C3AED' };
                  default: return { bg: '#FFD700', border: '#FFA500' };
                }
              };
              const colors = getCategoryColors(selectedBadgePopup.category);
              const fallbackEmoji = (() => {
                switch(selectedBadgePopup.category) {
                  case 'soul': return '⭐';
                  case 'collector': return '🏆';
                  case 'community': return '🌐';
                  case 'elemental-streak': return '💠';
                  case 'currency': return '💰';
                  case 'listening': return '🎵';
                  default: return '🏆';
                }
              })();

              // Helper to find claimed date for this badge (earned_at/awarded_at)
              const getClaimedAt = (badgeId) => {
                try {
                  const fromUserBadges = (userBadges || []).find((ub) => ub.badge_id === badgeId);
                  if (fromUserBadges?.earned_at) return fromUserBadges.earned_at;
                } catch {}
                try {
                  const fromProfile = (profile?.badges || []).find((b) => b.badge_id === badgeId);
                  if (fromProfile?.awarded_at) return fromProfile.awarded_at;
                } catch {}
                return null;
              };

              const claimedAtRaw = getClaimedAt(selectedBadgePopup.id);
              const formatClaimedDate = (dateString) => {
                if (!dateString) return '';
                const d = new Date(dateString);
                const mm = d.getMonth() + 1;
                const dd = d.getDate();
                const yyyy = d.getFullYear();
                return `${mm}/${dd}/${yyyy}`;
              };
              const claimedDateStr = formatClaimedDate(claimedAtRaw);
              const claimedName = (profile?.name || selectedUser?.name || 'You');
              return (
                <>
                  <div className="flex items-center justify-center mb-6 flex-1">
                    {/* TiltSpinCard wrapper for drag-to-spin interaction */}
                    <TiltSpinCard
                      enableSpin={true}
                      spinSensitivity={0.8}
                      onRotationChange={(rotation) => setBadgeRotation(rotation)}
                      onClick={() => {
                        try {
                          const audio = new Audio('/audio/flip.mp3');
                          audio.volume = 0.8;
                          audio.play().catch(() => {});
                        } catch {}
                        setIsBadgeAnimatingFlip(true);
                        setBadgeRotation((prev) => prev + 180);
                        setTimeout(() => setIsBadgeAnimatingFlip(false), 500);
                      }}
                      style={{ cursor: 'grab' }}
                    >
                      <div
                        className="relative"
                        style={{
                          width: '200px',
                          height: '200px',
                          transformStyle: 'preserve-3d',
                          perspective: '1000px'
                        }}
                      >
                        {/* Front of badge */}
                        <div
                          className="absolute inset-0 rounded-full flex items-center justify-center border-4 overflow-hidden"
                          style={{
                            width: '200px',
                            height: '200px',
                            background: `linear-gradient(135deg, ${colors.bg}, ${colors.border})`,
                            borderColor: colors.border,
                            boxShadow: `0 0 40px ${colors.border}60, 0 0 60px ${colors.border}30`,
                            transform: `rotateY(${badgeRotation}deg)`,
                            backfaceVisibility: 'hidden',
                            transition: isBadgeAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                          }}
                        >
                          {selectedBadgePopup.icon_url ? (
                            <img
                              src={selectedBadgePopup.icon_url}
                              alt={selectedBadgePopup.badge_name || 'Badge'}
                              className="w-full h-full object-cover"
                              draggable={false}
                              style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.8))', animation: 'cardPulse 2s ease-in-out infinite' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <span className="text-7xl" style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.8))' }}>
                              {fallbackEmoji}
                            </span>
                          )}
                        </div>
                        {/* Back of badge */}
                        <div
                          className="absolute inset-0 rounded-full flex items-center justify-center border-4 overflow-hidden"
                          style={{
                            width: '200px',
                            height: '200px',
                            background: `linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)`,
                            borderColor: colors.border,
                            boxShadow: `0 0 40px ${colors.border}60, 0 0 60px ${colors.border}30`,
                            transform: `rotateY(${badgeRotation + 180}deg)`,
                            backfaceVisibility: 'hidden',
                            transition: isBadgeAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                          }}
                        >
                          {claimedDateStr ? (
                            <div className="flex flex-col items-center justify-center text-center px-3">
                              <div className="text-white font-bold text-sm truncate max-w-[140px]" style={{ textShadow: '0 0 8px rgba(56,182,255,0.8)' }}>
                                {claimedName}
                              </div>
                              <div className="text-base font-semibold mt-1 tracking-wider" style={{ color: '#39FF14', textShadow: '0 0 8px #39FF14, 0 0 14px #39FF14' }}>CLAIMED</div>
                              <div className="text-white/80 text-sm mt-0.5">
                                {claimedDateStr}
                              </div>
                            </div>
                          ) : (
                            <span
                              className="text-5xl font-bold"
                              style={{
                                color: 'rgba(255,255,255,0.2)',
                                textShadow: '0 0 4px rgba(255,255,255,0.25)'
                              }}
                            >
                              {fallbackEmoji}
                            </span>
                          )}
                        </div>
                      </div>
                    </TiltSpinCard>
                  </div>
                  <div className="text-center mt-4">
                    <div className="text-2xl font-bold text-white mb-2">
                      {selectedBadgePopup.badge_name}
                    </div>
                    {selectedBadgePopup.description && (
                      <div className="text-base text-white/80">
                        {selectedBadgePopup.description}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Scanner Effect */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 pointer-events-none z-[105]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(242, 239, 29, 0.1) 50%, transparent 100%)',
              width: '2px',
              height: '100vh',
              animation: 'scan 8s linear infinite'
            }}
          />
          <style jsx>{`
            @keyframes scan {
              0% { transform: translateY(-100%); }
              100% { transform: translateY(100vh); }
            }
            @keyframes neonBlink {
              0%, 50% { 
                opacity: 1;
                box-shadow: 0 0 15px rgba(242, 239, 29, 0.8), 0 0 25px rgba(242, 239, 29, 0.6);
              }
              25%, 75% { 
                opacity: 0.3;
                box-shadow: 0 0 5px rgba(242, 239, 29, 0.4);
              }
            }
            @keyframes cardPulse {
              0% { 
                transform: scale(1);
                filter: brightness(1) drop-shadow(0 0 20px rgba(255, 105, 180, 0.3));
              }
              50% { 
                transform: scale(1.02);
                filter: brightness(1.1) drop-shadow(0 0 30px rgba(255, 105, 180, 0.5));
              }
              100% { 
                transform: scale(1);
                filter: brightness(1) drop-shadow(0 0 20px rgba(255, 105, 180, 0.3));
              }
            }
            .preserve-3d {
              transform-style: preserve-3d;
            }
            .backface-hidden {
              backface-visibility: hidden;
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}
