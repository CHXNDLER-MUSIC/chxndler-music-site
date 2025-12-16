"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService } from '@/lib/supabase/chat';
import { useProfile } from '@/contexts/ProfileContext';
import { sfx } from '@/lib/sfx';
// import { useLiveStatus } from '@/hooks/useLiveStatus'; // Removed since chat is always available
import UserList from './UserList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ProfileModal from './ProfileModal';
import VotingPanel from './VotingPanel';
import ReactionTray from './ReactionTray';
import FloatingRoomReactions from './FloatingRoomReactions';
import { RATE_LIMITS, markSoulStarUsed } from '@/lib/reactions';

// Debug flag to control console logging
const DEBUG = process.env.NODE_ENV === 'development' && true;

// Global alien name storage - persists across component remounts
let globalAlienName = null;

// Function to get or create alien name
const getGlobalAlienName = () => {
  if (globalAlienName) {
    return globalAlienName;
  }
  
  // Check session storage first
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('alienName');
    if (stored) {
      globalAlienName = stored;
      return stored;
    }
  }
  
  // Generate new alien name
  const alienNumber = Math.floor(Math.random() * 99999999) + 1;
  const paddedNumber = alienNumber.toString().padStart(8, '0');
  const newAlienName = `ALIEN${paddedNumber}`;
  
  // Store globally and in session storage
  globalAlienName = newAlienName;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('alienName', newAlienName);
  }
  
  DEBUG && console.log('🔥 Generated global alien name:', newAlienName);
  return newAlienName;
};

/**
 * Main Chat Panel Component
 * Slides in from the left side when live streaming is active
 */
export default function ChatPanel({ isOpen, onClose }) {
  const { profile, user, unlockedBadges, badgesLoading, badgesError } = useProfile();
  
  // Debug logging for badges
  DEBUG && console.log('🔥 ChatPanel badges debug:', { 
    unlockedBadges, 
    badgesLoading, 
    badgesError,
    unlockedBadgesLength: unlockedBadges?.length 
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
      'ALWAYS ON MY MIND': '/cards/HEART.webp',
      'ALWAYS ON MY MIND (REMIX)': '/cards/ALWAYS ON MY MIND (REMIX).webp',
      'ALONE': '/cards/ALONE.webp',
      'ALONE (ACOUSTIC)': '/cards/ALONE.webp',
      'AMERICAN DREAM': '/cards/AMERICAN DREAM.webp',
      'BABY': '/cards/BABY.webp',
      'BE MY BEE': '/cards/BE MY BEE.webp',
      'BE MY BEE (ACOUSTIC)': '/cards/BE MY BEE (ACOUSTIC).webp',
      'BLUE (ACOUSTIC)': '/cards/BLUE (ACOUSTIC).webp',
      'BLUE': '/cards/BLUE.webp',
      'BRAIN FREEZE': '/cards/BRAIN FREEZE.webp',
      'CHEERLEADER': '/cards/CHEERLEADER.webp',
      'CHEERLEADER (ACOUSTIC)': '/cards/CHEERLEADER (ACOUSTIC).webp',
      'CHXNDLER': '/cards/CHXNDLER.webp',
      'COLLIDE': '/cards/COLLIDE.webp',
      'COLORS OF OUR HOME': '/cards/COLORS OF OUR HOME.webp',
      'COLORS OF OUR HOME (ACOUSTIC)': '/cards/COLORS OF OUR HOME (ACOUSTIC).webp',
      'COLORS OF OUR HOME (BLUMA Game Soundtrack)': '/cards/COLORS OF OUR HOME (BLUMA Game Soundtrack).webp',
      'DARKNESS': '/cards/DARKNESS.webp',
      'FEELING THIS': '/cards/FEELING THIS.webp',
      'GAME BOY HEART': '/cards/GAME BOY HEART.webp',
      'HEART': '/cards/HEART.webp',
      'HOME': '/cards/HOME.webp',
      'HOME (ACOUSTIC)': '/cards/HOME (ACOUSTIC).webp',
      'HOUSE PARTY': '/cards/HOUSE PARTY.webp',
      'HOUSE PARTY (ACOUSTIC)': '/cards/HOUSE PARTY (ACOUSTIC).webp',
      'I MIGHT FALL IN LOVE WITH YOU': '/cards/I MIGHT FALL IN LOVE WITH YOU.webp',
      'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)': '/cards/I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC).webp',
      'KID FOREVER': '/cards/KID FOREVER.webp',
      'LETTING GO': '/cards/LETTING GO.webp',
      'LIGHTNING': '/cards/LIGHTNING.webp',
      'LITTLE BLACK HEART': '/cards/LITTLE BLACK HEART.webp',
      'LITTLE BLACK HEART (ACOUSTIC)': '/cards/LITTLE BLACK HEART (ACOUSTIC).webp',
      'LOVE ME': '/cards/LOVE ME.webp',
      'LOVE ME (ACOUSTIC)': '/cards/LOVE ME (ACOUSTIC).webp',
      'MAKE BELIEVE': '/cards/MAKE BELIEVE.webp',
      'MR. BRIGHTSIDE': '/cards/MR. BRIGHTSIDE.webp',
      'OCEAN GIRL': '/cards/OCEAN GIRL.webp',
      'OCEAN GIRL (ACOUSTIC)': '/cards/OCEAN GIRL (ACOUSTIC).webp',
      'OCEAN GIRL (REMIX)': '/cards/OCEAN GIRL (REMIX).webp',
      'PARIS': '/cards/PARIS.webp',
      'PINK MOON': '/cards/PINK MOON.webp',
      'POKÉMON': '/cards/POKEMON.webp',
      'SOMEBODY TO LOVE': '/cards/SOMEBODY TO LOVE.webp',
      'TIENES UN AMIGO': '/cards/TIENES UN AMIGO.webp',
      'WATER': '/cards/WATER.webp',
      'WE\'RE JUST FRIENDS': '/cards/WE\'RE JUST FRIENDS.webp',
      'WE\'RE JUST FRIENDS (ACOUSTIC)': '/cards/WE\'RE JUST FRIENDS (ACOUSTIC).webp',
      'WE\'RE JUST FRIENDS (DMVRCO REMIX)': '/cards/WE\'RE JUST FRIENDS (DMVRCO REMIX).webp',
      'WE\'RE JUST FRIENDS (mickey jas REMIX)': '/cards/WE\'RE JUST FRIENDS (MICKEY JAS REMIX).webp',
    };

    // Return the specific song image if available
    if (songImages[songName]) {
      return songImages[songName];
    }

    // Fallback to element image
    const elementImages = {
      'HEART': '/cards/HEART.webp',
      'WATER': '/cards/WATER.webp',
      'LIGHTNING': '/cards/LIGHTNING.webp',
      'DARKNESS': '/cards/DARKNESS.webp'
    };

    return elementImages[element] || elementImages['HEART'];
  };
  
  // Debug logging
  DEBUG && console.log('🔥 ChatPanel render:', { isOpen, profile: !!profile, user: !!user });

  // Use the global alien name function
  const alienName = getGlobalAlienName();

  /**
   * Get display name for user - logged in name or anonymous alien name
   */
  const getDisplayName = () => {
    // If user is authenticated and has a profile with a name, use it
    if (user && profile?.name) {
      DEBUG && console.log('🔥 Using authenticated user profile name:', profile.name);
      return profile.name;
    }
    
    // For unauthenticated users or users without names, use alien name
    DEBUG && console.log('🔥 Using stored alien name (not authenticated or no profile name):', alienName);
    return alienName;
  };
  const [messages, setMessages] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isUserPanelCollapsed, setIsUserPanelCollapsed] = useState(false); // Start expanded by default
  
  // Reaction state
  const [messageReactions, setMessageReactions] = useState({});
  const [roomReactions, setRoomReactions] = useState([]);
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
  const [selectedBadgePopup, setSelectedBadgePopup] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'voting', 'badges', 'cards'
  const [isVotingPanelCollapsed, setIsVotingPanelCollapsed] = useState(true); // Start collapsed by default
  const channelRef = useRef(null);

  // Initialize chat users when chat opens - either authenticated user or anonymous
  useEffect(() => {
    if (isOpen) {
      if (user && profile?.name) {
        // For authenticated users with complete profile, add them to chat users
        DEBUG && console.log('🚀 IMMEDIATE: Using authenticated user:', profile.name);
        const authenticatedUser = {
          id: user.id,
          name: profile.name,
          element: profile.element || null,
          avatar_badge_id: profile.avatar_badge_id || null,
          profile_image_url: profile.profile_image_url || null,
          last_seen: new Date().toISOString()
        };
        setChatUsers([authenticatedUser]);
        DEBUG && console.log('🚀 Set initial chat users with authenticated user:', [authenticatedUser]);
      } else {
        // For unauthenticated users, use alien name
        DEBUG && console.log('🚀 IMMEDIATE: Using stored alien name:', alienName);
        const anonymousUser = {
          id: 'anonymous',
          name: alienName,
          element: 'alien',
          avatar_badge_id: null,
          last_seen: new Date().toISOString()
        };
        setChatUsers([anonymousUser]);
        DEBUG && console.log('🚀 Set initial chat users with anonymous user:', [anonymousUser]);
      }
    }
  }, [user, profile?.name, profile?.id, isOpen, alienName]);

  // Initialize chat when panel opens
  useEffect(() => {
    if (isOpen) {
      initializeChat();
      // Reset profile-related states when chat opens
      setSelectedUser(null);
      setShowUserBadges(false);
      setShowUserBinder(false);
      setShowSendHeartCoin(false);
      setSelectedCardPopup(null);
      setSelectedBadgePopup(null);
      setCardFlipped(false);
    } else {
      cleanupChat();
    }
  }, [isOpen]);

  // Update chat users when authentication state changes
  useEffect(() => {
    if (isOpen) {
      if (user && profile?.name) {
        // For authenticated users, ensure they're properly represented
        DEBUG && console.log('🔥 Chat opened - ensuring authenticated user exists:', profile.name);
        setChatUsers(prev => {
          const otherUsers = prev.filter(u => u.id !== user.id && u.id !== 'anonymous');
          const authenticatedUser = {
            id: user.id,
            name: profile.name,
            element: profile.element || null,
            avatar_badge_id: profile.avatar_badge_id || null,
            profile_image_url: profile.profile_image_url || null,
            last_seen: new Date().toISOString()
          };
          DEBUG && console.log('🔥 Setting authenticated user:', authenticatedUser);
          return [authenticatedUser, ...otherUsers];
        });
      } else if (alienName) {
        // For unauthenticated users, ensure anonymous user exists
        DEBUG && console.log('🔥 Chat opened - ensuring anonymous user exists with name:', alienName);
        setChatUsers(prev => {
          const otherUsers = prev.filter(u => u.id !== 'anonymous');
          const anonymousUser = {
            id: 'anonymous',
            name: alienName,
            element: 'alien',
            avatar_badge_id: null,
            last_seen: new Date().toISOString()
          };
          DEBUG && console.log('🔥 Setting anonymous user with consistent name:', anonymousUser);
          return [anonymousUser, ...otherUsers];
        });
      }
    }
  }, [isOpen, user, profile?.id, profile?.name, alienName]);

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
                // Add room reaction for animation
                const roomReaction = {
                  id: `${reactionEvent.user_id}_${Date.now()}`,
                  reaction: reactionEvent.reaction,
                  user_id: reactionEvent.user_id,
                  created_at: reactionEvent.created_at
                };
                setRoomReactions(prev => [...prev, roomReaction]);
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

      // Load recent messages
      const recentMessages = await chatService.loadRecentMessages(50);
      setMessages(recentMessages);

      // Load current chat users from database
      const databaseUsers = await chatService.getChatUsers();
      
      // Handle user representation based on authentication state
      if (user && profile?.name) {
        // For authenticated users, add them to the users list
        DEBUG && console.log('🔥 InitializeChat: Adding authenticated user:', profile.name);
        const authenticatedUser = {
          id: user.id,
          name: profile.name,
          element: profile.element || null,
          avatar_badge_id: profile.avatar_badge_id || null,
          profile_image_url: profile.profile_image_url || null,
          last_seen: new Date().toISOString()
        };
        setChatUsers([authenticatedUser, ...databaseUsers.filter(u => u.id !== user.id)]);
      } else if (!user || !profile?.name) {
        // For unauthenticated users, use anonymous user
        DEBUG && console.log('🔥 InitializeChat: Using consistent alien name:', alienName);
        const anonymousUser = {
          id: 'anonymous',
          name: alienName,
          element: 'alien',
          avatar_badge_id: null,
          last_seen: new Date().toISOString()
        };
        DEBUG && console.log('🔥 Creating consistent anonymous user:', anonymousUser);
        setChatUsers([anonymousUser, ...databaseUsers]);
      } else {
        setChatUsers(databaseUsers);
      }

      // Subscribe to new messages
      channelRef.current = await chatService.subscribeToChat(
        (newMessage) => {
          setMessages(prev => [...prev, newMessage]);
          
          // Play notification sound for new messages (not our own)
          if (newMessage.user_id !== 'anonymous' && newMessage.message_type === 'message') {
            try {
              const audio = new Audio('/notification.mp3');
              audio.volume = 0.3;
              audio.play().catch(error => {
                console.log('Notification sound failed:', error);
              });
            } catch (error) {
              console.log('Audio creation failed:', error);
            }
          }
          
          // Update user list if it's a join message
          if (newMessage.message_type === 'join' || newMessage.message_type === 'message') {
            setChatUsers(prev => {
              const existingUser = prev.find(u => u.id === newMessage.user_id);
              if (existingUser) {
                return prev.map(u => 
                  u.id === newMessage.user_id 
                    ? { ...u, last_seen: newMessage.created_at }
                    : u
                );
              } else if (newMessage.user_profile) {
                return [...prev, {
                  id: newMessage.user_id,
                  name: newMessage.user_profile.name,
                  element: newMessage.user_profile.element,
                  avatar_badge_id: newMessage.user_profile.avatar_badge_id,
                  profile_image_url: newMessage.user_profile.profile_image_url,
                  last_seen: newMessage.created_at
                }];
              }
              return prev;
            });
          }
        },
        (error) => {
          console.error('Chat subscription error:', error);
        },
        (typingData) => {
          DEBUG && console.log('🔥 Typing event:', typingData);
          // Update typing users
          setTypingUsers(prev => {
            const filtered = prev.filter(u => u.user_id !== typingData.user_id);
            if (typingData.is_typing) {
              return [...filtered, typingData];
            }
            return filtered;
          });
        }
      );

      // Send sync message if not already joined
      if (!hasJoined) {
        const displayName = getDisplayName();
        DEBUG && console.log('🔥 Joining chat with name:', displayName);
        
        // Trigger first-time connection check for authenticated users
        if (user && profile?.name) {
          await chatService.handleFirstTimeConnection(user.id, profile.name);
        }
        
        const syncMessage = await chatService.sendSyncMessage(displayName);
        DEBUG && console.log('🔥 Sync message result:', syncMessage);
        
        // For anonymous users, add the message locally and add to user list
        if (!user && syncMessage) {
          DEBUG && console.log('🔥 Adding anonymous message locally:', syncMessage);
          setMessages(prev => {
            const newMessages = [...prev, syncMessage];
            DEBUG && console.log('🔥 Updated messages:', newMessages);
            return newMessages;
          });
          
          // Add anonymous user to chat users list if not already present
          setChatUsers(prev => {
            const existingAnonymous = prev.find(u => u.id === 'anonymous');
            if (existingAnonymous) {
              // Update existing anonymous user
              return prev.map(u => 
                u.id === 'anonymous' 
                  ? { ...u, name: displayName, last_seen: new Date().toISOString() }
                  : u
              );
            } else {
              // Add new anonymous user
              return [...prev, {
                id: 'anonymous',
                name: displayName,
                element: null,
                avatar_badge_id: null,
                last_seen: new Date().toISOString()
              }];
            }
          });
        } else if (!user) {
          // Fallback: ensure anonymous user is in list even if sync message fails
          const displayName = getDisplayName();
          setChatUsers(prev => {
            const existingAnonymous = prev.find(u => u.id === 'anonymous');
            if (!existingAnonymous) {
              return [...prev, {
                id: 'anonymous',
                name: displayName,
                element: null,
                avatar_badge_id: null,
                last_seen: new Date().toISOString()
              }];
            }
            return prev;
          });
        }
        
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

    if (channelRef.current) {
      await chatService.unsubscribe();
      channelRef.current = null;
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
      userObject: user, 
      profile: !!profile,
      profileName: profile?.name,
      shouldUseProfileName: user && profile?.name
    });
    
    // For authenticated users with complete profiles, send via service
    if (user && profile?.name) {
      // Add message locally immediately for instant feedback
      const authenticatedMessage = {
        id: `auth-${user.id}-${Date.now()}`,
        user_id: user.id,
        message: messageText.trim(),
        message_type: 'message',
        created_at: new Date().toISOString(),
        user_profile: {
          name: profile.name,
          element: profile.element || null,
          avatar_badge_id: profile.avatar_badge_id || null
        }
      };
      
      DEBUG && console.log('🔥 Adding authenticated message locally:', authenticatedMessage);
      setMessages(prev => [...prev, authenticatedMessage]);
      
      try {
        const message = await chatService.sendMessage(messageText, 'message', displayName);
        DEBUG && console.log('🔥 Authenticated user message result:', message);
        
        if (!message) {
          console.error('Failed to send message for authenticated user');
        }
      } catch (error) {
        console.error('Error sending message for authenticated user:', error);
      }
      return; // Exit early for authenticated users
    }
    
    // For anonymous users (unauthenticated or incomplete profiles), add message locally
    const anonymousMessage = {
      id: `anonymous-${Date.now()}`,
      user_id: 'anonymous',
      message: messageText.trim(),
      message_type: 'message',
      created_at: new Date().toISOString(),
      user_profile: {
        name: displayName,
        element: 'alien',
        avatar_badge_id: null
      }
    };
    
    DEBUG && console.log('🔥 Adding anonymous message locally:', anonymousMessage);
    setMessages(prev => {
      const newMessages = [...prev, anonymousMessage];
      DEBUG && console.log('🔥 Updated messages:', newMessages);
      return newMessages;
    });
    
    // Ensure anonymous user is in the users list
    setChatUsers(prev => {
      const existingAnonymous = prev.find(u => u.id === 'anonymous');
      if (!existingAnonymous) {
        DEBUG && console.log('🔥 Adding anonymous user to list');
        return [{
          id: 'anonymous',
          name: displayName,
          element: 'alien',
          avatar_badge_id: null,
          last_seen: new Date().toISOString()
        }, ...prev];
      }
      return prev;
    });
    
    // Try to send to service in background (optional)
    try {
      const message = await chatService.sendMessage(messageText, 'message', displayName);
      DEBUG && console.log('🔥 Background service result:', message);
    } catch (error) {
      DEBUG && console.log('🔥 Background service failed (expected for anonymous):', error);
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
      const audio = new Audio('/click.mp3');
      audio.volume = 0.3;
      audio.play().catch(error => {
        console.log('Click audio play failed:', error);
      });
    } catch (error) {
      console.log('Click audio creation failed:', error);
    }
    
    // Toggle profile - if clicking on same user, close profile
    if (selectedUser && selectedUser.id === userId) {
      DEBUG && console.log('🔥 Closing profile for same user');
      setSelectedUser(null);
      setShowUserBadges(false);
      setShowUserBinder(false);
      setShowSendHeartCoin(false);
      return;
    }
    
    let user = chatUsers.find(u => u.id === userId);
    DEBUG && console.log('🔥 Found user in chatUsers:', user);
    DEBUG && console.log('🔥 Current chatUsers:', chatUsers);
    
    // For anonymous users, always use the global alien name
    if (userId === 'anonymous') {
      user = {
        id: 'anonymous',
        name: getGlobalAlienName(), // Always use the global alien name function
        element: 'alien',
        avatar_badge_id: null,
        last_seen: new Date().toISOString()
      };
      DEBUG && console.log('🔥 Using global alien user:', user);
    }
    
    if (user) {
      setSelectedUser(user);
      setShowUserBadges(false); // Reset badge view when switching users
      setShowUserBinder(false); // Reset binder view when switching users
      setShowSendHeartCoin(false); // Reset heart coin view when switching users
      setIsUserPanelCollapsed(true); // Auto-collapse left panel when profile opens
      DEBUG && console.log('🔥 Set selected user:', user);
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
        console.log('Audio play failed:', error);
      });
    } catch (error) {
      console.log('Audio creation failed:', error);
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
      console.log('Rate limited: too fast');
      return;
    }

    if (reaction === 'lightning_spark' && now - lastLightningTime < RATE_LIMITS.lightning_spark) {
      console.log('Rate limited: lightning too fast');
      return;
    }

    if (messageId) {
      const cooldownKey = `${messageId}_${reaction}`;
      const lastMessageReaction = messageReactionCooldowns[cooldownKey] || 0;
      if (now - lastMessageReaction < RATE_LIMITS.message_repeat) {
        console.log('Rate limited: same reaction on same message');
        return;
      }
    }

    // Soul star special handling
    if (reaction === 'soul_star') {
      markSoulStarUsed(currentUserId);
    }

    try {
      // Send reaction via chat service
      await chatService.sendReaction(reaction, messageId, currentUserId);

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
        const roomReaction = {
          id: `${currentUserId}_${now}`,
          reaction,
          user_id: currentUserId,
          created_at: new Date().toISOString()
        };
        setRoomReactions(prev => [...prev, roomReaction]);
      }

      console.log(`✨ ${reaction} sent for ${messageId ? 'message' : 'room'}`);
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
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-[100]"
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={onClose}
          />

          {/* Chat Panel */}
          <motion.div
            className="absolute inset-0 z-[110] flex overflow-hidden"
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
                WebkitUserSelect: 'none'
              }}
            >
              {/* Header */}
              <div className="p-4 border-b border-yellow-400/30 flex items-center">
                <div className="flex items-center space-x-3 flex-1 mr-4 ml-20">
                  <div 
                    className="w-3 h-3 rounded-full animate-pulse flex-shrink-0"
                    style={{
                      background: '#F2EF1D',
                      boxShadow: '0 0 15px rgba(242, 239, 29, 0.8)',
                      animation: 'neonBlink 1s infinite'
                    }}
                  />
                  <h2 
                    className="text-xl font-bold whitespace-nowrap"
                    style={{
                      color: '#F2EF1D !important',
                      textShadow: '0 0 10px #F2EF1D, 0 0 20px #F2EF1D, 0 0 30px #F2EF1D',
                      letterSpacing: '0.05em',
                      fontWeight: 'bold'
                    }}
                  >
                    HEART SIGNAL CHAT
                  </h2>
                  
                  {/* Extended glow line */}
                  <div 
                    className="flex-1 h-px ml-4"
                    style={{
                      background: 'linear-gradient(90deg, rgba(242, 239, 29, 0.6), rgba(242, 239, 29, 0.2), transparent)',
                      boxShadow: '0 0 8px rgba(242, 239, 29, 0.4)'
                    }}
                  />
                </div>
                
                <button
                  onClick={handleClose}
                  onMouseEnter={() => {
                    try { sfx.play('hover', 0.3); } catch {}
                  }}
                  className="text-yellow-400 hover:text-yellow-300 transition-all duration-200 p-2 flex-shrink-0 hover:scale-110"
                  style={{
                    background: 'rgba(242, 239, 29, 0.2)',
                    borderRadius: '8px',
                    border: '2px solid rgba(242, 239, 29, 0.6)',
                    color: '#F2EF1D',
                    textShadow: '0 0 12px rgba(242, 239, 29, 0.8)',
                    boxShadow: '0 0 16px rgba(242, 239, 29, 0.4)',
                    fontSize: '18px',
                    minWidth: '40px',
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ◀
                </button>
              </div>

              {/* Content Area */}
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
                            console.log('Collapse audio play failed:', error);
                          });
                        } catch (error) {
                          console.log('Collapse audio creation failed:', error);
                        }
                        setIsUserPanelCollapsed(!isUserPanelCollapsed);
                      }}
                      className="w-full p-2 hover:bg-yellow-400/10 transition-colors duration-200 border-b border-cyan-400/20 flex items-center justify-between relative"
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
                        // If no users and not authenticated, show alien user
                        else if (chatUsers.length === 0 && (!user || !profile?.name)) {
                          usersToShow = [{
                            id: 'anonymous',
                            name: alienName,
                            element: 'alien', 
                            avatar_badge_id: null,
                            last_seen: new Date().toISOString()
                          }];
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
                    <div className="border-t border-cyan-400/20">
                      <button
                        onClick={() => {
                          try {
                            const audio = new Audio('/audio/close.mp3');
                            audio.volume = 0.5;
                            audio.play().catch(error => {
                              console.log('Vote toggle audio play failed:', error);
                            });
                          } catch (error) {
                            console.log('Vote toggle audio creation failed:', error);
                          }
                          setIsVotingPanelCollapsed(!isVotingPanelCollapsed);
                        }}
                        className="w-full p-2 hover:bg-yellow-400/10 transition-colors duration-200 border-b border-cyan-400/20 flex items-center justify-between relative"
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
                            transform: isVotingPanelCollapsed ? 'rotate(0deg)' : 'rotate(90deg)'
                          }}
                        >
                          ◀
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
                <div className={`flex flex-col transition-all duration-300 ${selectedUser ? 'hidden' : 'flex-1'} min-h-0 h-full overflow-hidden`}>
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
                    />
                  </div>
                  
                  {/* Bottom Fixed Section - typing indicators and input */}
                  <div className="flex-shrink-0 sticky bottom-0 bg-inherit">
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
                                
                                {/* Element name with action buttons */}
                                <div className="mt-1 flex items-center gap-2">
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
                                  
                                  {/* Action buttons next to element */}
                                  {selectedUser?.id !== 'anonymous' && user && profile && (
                                    <div className="flex items-center gap-1 ml-2 sm:gap-2">
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
                                          try { sfx.play('hover.mp3', 0.3); } catch {}
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
                                          try { sfx.play('hover.mp3', 0.3); } catch {}
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

                                      {/* Heart Coin Button */}
                                      <button
                                        onClick={() => {
                                          try { sfx.play('click', 0.8); } catch {}
                                          // Trigger heart coin modal
                                          window.dispatchEvent(new CustomEvent('openHeartCoinModal'));
                                        }}
                                        onMouseEnter={(e) => {
                                          try { sfx.play('hover.mp3', 0.3); } catch {}
                                          e.currentTarget.style.transform = 'scale(1.1)';
                                          const img = e.currentTarget.querySelector('img');
                                          if (img) {
                                            img.style.filter = 'drop-shadow(0 0 8px rgba(255, 105, 180, 0.8)) drop-shadow(0 0 16px rgba(255, 105, 180, 0.4)) drop-shadow(0 0 20px rgba(255, 105, 180, 0.8))';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'scale(1)';
                                          const img = e.currentTarget.querySelector('img');
                                          if (img) {
                                            img.style.filter = 'drop-shadow(0 0 4px rgba(255, 105, 180, 0.6))';
                                          }
                                        }}
                                        className="w-12 h-12 sm:w-14 sm:h-14 rounded transition-all duration-200 flex-shrink-0"
                                        title="Open Heart Coins"
                                      >
                                        <img
                                          src="/elements/heart-coin.webp"
                                          alt="Heart Coins"
                                          className="w-full h-full object-cover rounded"
                                          draggable={false}
                                          style={{
                                            filter: 'drop-shadow(0 0 4px rgba(255, 105, 180, 0.6))'
                                          }}
                                          draggable={false}
                                        />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Action icons moved below header for full-width centering */}
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
                                console.log('Close audio play failed:', error);
                              });
                            } catch (error) {
                              console.log('Close audio creation failed:', error);
                            }
                            setSelectedUser(null);
                            setShowUserBadges(false);
                            setShowUserBinder(false);
                            setShowSendHeartCoin(false);
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
                          <div className="flex items-center space-x-1 px-2 py-1 rounded bg-black/40 border border-pink-400/30">
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
                          </div>
                          <div className="text-[10px] text-white/80 text-center bg-black/30 px-1 py-0.5 rounded">
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
                          <h4 className="text-sm font-semibold mb-3 flex items-center animate-pulse" 
                              style={{ 
                                color: '#1E90FF',
                                textShadow: '0 0 10px rgba(0,255,255,0.8), 0 0 20px rgba(0,255,255,0.6), 0 0 30px rgba(0,255,255,0.4)',
                                filter: 'brightness(1.2)',
                                WebkitTextStroke: '1px rgba(0,255,255,0.3)'
                              }}>
                            <img src="/elements/badges.webp" alt="Badges" className="w-4 h-4 mr-2" draggable={false} />
                            BADGES UNLOCKED
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
                                    <div className="text-sm text-white/60 mb-2">
                                      {isViewingAnonymous ? 'Anonymous users don\'t have badges' : 'Can only view your own badges'}
                                    </div>
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
                                            console.log('Click audio play failed:', error);
                                          });
                                        } catch (error) {
                                          console.log('Click audio creation failed:', error);
                                        }
                                        setBadgeStartIndex(Math.max(0, badgeStartIndex - 4));
                                      }}
                                      disabled={!badgesToShow || badgesToShow.length === 0 || badgeStartIndex === 0}
                                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-yellow-400 hover:text-yellow-300 disabled:text-yellow-400/30 transition-colors"
                                      style={{
                                        textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
                                        fontSize: '14px',
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
                                        className="w-12 h-12 rounded-full mb-1 flex items-center justify-center border-2 transition-all duration-300 cursor-pointer hover:scale-110"
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
                                              console.log('Hover audio play failed:', error);
                                            });
                                          } catch (error) {
                                            console.log('Hover audio creation failed:', error);
                                          }
                                        }}
                                        onClick={() => {
                                          try {
                                            const audio = new Audio('/audio/click.mp3');
                                            audio.volume = 0.3;
                                            audio.play().catch(error => {
                                              console.log('Click audio play failed:', error);
                                            });
                                          } catch (error) {
                                            console.log('Click audio creation failed:', error);
                                          }
                                          setSelectedBadgePopup(badge);
                                        }}
                                      >
                                        {badge.icon_url ? (
                                          <>
                                            <img 
                                              src={badge.icon_url} 
                                              alt={badge.badge_name || 'Badge'}
                                              className="w-6 h-6"
                                              draggable={false}
                                              style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }}
                                              onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                              }}
                                            />
                                            <span 
                                              className="text-lg" 
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
                                            className="text-lg" 
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
                                            console.log('Click audio play failed:', error);
                                          });
                                        } catch (error) {
                                          console.log('Click audio creation failed:', error);
                                        }
                                        setBadgeStartIndex(Math.min(Math.max(0, (badgesToShow?.length || 0) - 4), badgeStartIndex + 4));
                                      }}
                                      disabled={!badgesToShow || badgesToShow.length <= 4 || badgeStartIndex + 4 >= badgesToShow.length}
                                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-yellow-400 hover:text-yellow-300 disabled:text-yellow-400/30 transition-colors"
                                      style={{
                                        textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
                                        fontSize: '14px',
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
                        <div className="pt-2 border-t border-white/20">
                          <h4 className="text-base font-semibold mb-3 flex items-center" style={{ color: '#FF69B4' }}>
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
                                    console.log('Click audio play failed:', error);
                                  });
                                } catch (error) {
                                  console.log('Click audio creation failed:', error);
                                }
                                setBinderStartIndex(Math.max(0, binderStartIndex - 5));
                              }}
                              onMouseEnter={() => {
                                try { sfx.play('hover', 0.3); } catch {}
                              }}
                              disabled={binderStartIndex === 0}
                              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-yellow-400 hover:text-yellow-300 disabled:text-yellow-400/30 transition-colors"
                              style={{
                                textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
                                fontSize: '14px',
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
                              {/* Display user's owned cards from songCollection */}
                              {Array.from({ length: 4 }, (_, index) => {
                                // Get owned cards by filtering songCollection
                                const ownedCards = songCollection.filter(song => isCardOwned(song.name));
                                
                                // Always include CHXNDLER as first card for everyone
                                const chxndlerCard = songCollection.find(song => song.name === 'CHXNDLER');
                                const cardsToShow = [chxndlerCard, ...ownedCards.filter(card => card.name !== 'CHXNDLER')];
                                
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
                                            console.log('Hover audio play failed:', error);
                                          });
                                        } catch (error) {
                                          console.log('Hover audio creation failed:', error);
                                        }
                                      }
                                    }}
                                    onClick={() => {
                                      if (hasCard && cardSong) {
                                        try {
                                          const audio = new Audio('/audio/click.mp3');
                                          audio.volume = 0.3;
                                          audio.play().catch(error => {
                                            console.log('Click audio play failed:', error);
                                          });
                                        } catch (error) {
                                          console.log('Click audio creation failed:', error);
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
                                    console.log('Click audio play failed:', error);
                                  });
                                } catch (error) {
                                  console.log('Click audio creation failed:', error);
                                }
                                // Get owned cards count for pagination
                                const ownedCards = songCollection.filter(song => isCardOwned(song.name));
                                const chxndlerCard = songCollection.find(song => song.name === 'CHXNDLER');
                                const cardsToShow = [chxndlerCard, ...ownedCards.filter(card => card.name !== 'CHXNDLER')];
                                const totalCards = cardsToShow.length;
                                setBinderStartIndex(Math.min(Math.max(0, totalCards - 5), binderStartIndex + 5));
                              }}
                              onMouseEnter={() => {
                                try { sfx.play('hover', 0.3); } catch {}
                              }}
                              disabled={(() => {
                                const ownedCards = songCollection.filter(song => isCardOwned(song.name));
                                const chxndlerCard = songCollection.find(song => song.name === 'CHXNDLER');
                                const cardsToShow = [chxndlerCard, ...ownedCards.filter(card => card.name !== 'CHXNDLER')];
                                return binderStartIndex + 5 >= cardsToShow.length;
                              })()}
                              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-yellow-400 hover:text-yellow-300 disabled:text-yellow-400/30 transition-colors"
                              style={{
                                textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
                                fontSize: '14px',
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
                                    console.log('Click audio play failed:', error);
                                  });
                                } catch (error) {
                                  console.log('Click audio creation failed:', error);
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
                                        console.log('Success audio play failed:', error);
                                      });
                                    } catch (error) {
                                      console.log('Success audio creation failed:', error);
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
                                        console.log('Error audio play failed:', error);
                                      });
                                    } catch (error) {
                                      console.log('Error audio creation failed:', error);
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
          className="absolute inset-0 z-[120] flex items-center justify-center p-4"
          style={{
            background: 'rgba(0, 0, 0, 0.8)'
          }}
          onClick={() => {
            setSelectedCardPopup(null);
            setCardFlipped(false);
          }}
        >
          <div
            className="relative w-64 aspect-[2/3] max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
            style={{
              perspective: '1000px',
              animation: 'cardPulse 2s ease-in-out infinite'
            }}
          >
            <div
              className="w-full h-full transition-transform duration-700 preserve-3d cursor-pointer"
              style={{
                transformStyle: 'preserve-3d',
                transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
              }}
              onClick={() => {
                try {
                  const audio = new Audio('/audio/click.mp3');
                  audio.volume = 0.3;
                  audio.play().catch(error => {
                    console.log('Click audio play failed:', error);
                  });
                } catch (error) {
                  console.log('Click audio creation failed:', error);
                }
                setCardFlipped(!cardFlipped);
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
                    src="/cards/BACK.webp"
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

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                try {
                  const audio = new Audio('/audio/click.mp3');
                  audio.volume = 0.3;
                  audio.play().catch(error => {
                    console.log('Click audio play failed:', error);
                  });
                } catch (error) {
                  console.log('Click audio creation failed:', error);
                }
                setSelectedCardPopup(null);
                setCardFlipped(false);
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
          className="absolute inset-0 z-[130] flex items-center justify-center p-6"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setSelectedBadgePopup(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-lg p-5"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 0 30px rgba(255, 105, 180, 0.25)',
              animation: 'cardPulse 2s ease-in-out infinite'
            }}
          >
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
              return (
                <>
                  <div className="flex items-center justify-center mb-4">
                    <div
                      className="w-28 h-28 rounded-full flex items-center justify-center border-4"
                      style={{
                        background: `linear-gradient(135deg, ${colors.bg}, ${colors.border})`,
                        borderColor: colors.border,
                        boxShadow: `0 0 25px ${colors.border}60, 0 0 45px ${colors.border}30`
                      }}
                    >
                      {selectedBadgePopup.icon_url ? (
                        <img
                          src={selectedBadgePopup.icon_url}
                          alt={selectedBadgePopup.badge_name || 'Badge'}
                          className="w-16 h-16"
                          draggable={false}
                          style={{ filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.8))' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.8))' }}>
                          {fallbackEmoji}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white mb-1">
                      {selectedBadgePopup.badge_name}
                    </div>
                    {selectedBadgePopup.description && (
                      <div className="text-sm text-white/80">
                        {selectedBadgePopup.description}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedBadgePopup(null)}
                    className="mt-4 w-full py-2 rounded-md text-sm font-medium transition-colors"
                    style={{
                      background: 'rgba(242, 239, 29, 0.15)',
                      border: '1px solid rgba(242, 239, 29, 0.4)',
                      color: '#F2EF1D'
                    }}
                  >
                    Close
                  </button>
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
