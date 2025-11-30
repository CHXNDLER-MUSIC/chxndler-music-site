"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService } from '@/lib/supabase/chat';
import { useProfile } from '@/contexts/ProfileContext';
import { useBadges } from '@/hooks/useBadges';
// import { useLiveStatus } from '@/hooks/useLiveStatus'; // Removed since chat is always available
import UserList from './UserList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ProfileModal from './ProfileModal';

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
  
  console.log('🔥 Generated global alien name:', newAlienName);
  return newAlienName;
};

/**
 * Main Chat Panel Component
 * Slides in from the left side when live streaming is active
 */
export default function ChatPanel({ isOpen, onClose }) {
  const { profile, user } = useProfile();
  const { userBadges } = useBadges();
  
  // Real song collection data from BinderModal - exact match
  const songCollection = [
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
    { name: 'CHXNDLER', element: 'ALL', rarity: 'Common', is_released: true, min_tier: 'wanderer' },
  ];

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
  
  // Debug logging
  console.log('🔥 ChatPanel render:', { isOpen, profile: !!profile, user: !!user });

  // Use the global alien name function
  const alienName = getGlobalAlienName();

  /**
   * Get display name for user - logged in name or anonymous alien name
   */
  const getDisplayName = () => {
    // If user is authenticated and has a profile with a name, use it
    if (user && profile?.name) {
      console.log('🔥 Using authenticated user profile name:', profile.name);
      return profile.name;
    }
    
    // If user is authenticated but profile is incomplete, still check for name
    if (user && profile?.id && profile?.name) {
      console.log('🔥 Using profile name for authenticated user:', profile.name);
      return profile.name;
    }
    
    // For unauthenticated or incomplete profiles, use alien name
    if (!user || !profile?.id || !profile?.name) {
      console.log('🔥 Using stored alien name (no authenticated user with name):', alienName);
      return alienName;
    }
    
    // Final fallback
    console.log('🔥 Using stored alien name (final fallback):', alienName);
    return alienName;
  };
  const [messages, setMessages] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isUserPanelCollapsed, setIsUserPanelCollapsed] = useState(true); // Start collapsed by default
  
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
  const channelRef = useRef(null);

  // Initialize chat users when chat opens - either authenticated user or anonymous
  useEffect(() => {
    if (isOpen) {
      if (user && profile?.name) {
        // For authenticated users with complete profile, add them to chat users
        console.log('🚀 IMMEDIATE: Using authenticated user:', profile.name);
        const authenticatedUser = {
          id: user.id,
          name: profile.name,
          element: profile.element || null,
          avatar_badge_id: profile.avatar_badge_id || null,
          last_seen: new Date().toISOString()
        };
        setChatUsers([authenticatedUser]);
        console.log('🚀 Set initial chat users with authenticated user:', [authenticatedUser]);
      } else if (!user || !profile?.id || !profile?.name) {
        // For unauthenticated users or incomplete profiles, use alien name
        console.log('🚀 IMMEDIATE: Using stored alien name:', alienName);
        const anonymousUser = {
          id: 'anonymous',
          name: alienName,
          element: 'alien',
          avatar_badge_id: null,
          last_seen: new Date().toISOString()
        };
        setChatUsers([anonymousUser]);
        console.log('🚀 Set initial chat users with anonymous user:', [anonymousUser]);
      }
    }
  }, [user, profile?.name, profile?.id, isOpen, alienName]);

  // Initialize chat when panel opens
  useEffect(() => {
    if (isOpen) {
      initializeChat();
    } else {
      cleanupChat();
    }
  }, [isOpen]);

  // Update chat users when authentication state changes
  useEffect(() => {
    if (isOpen) {
      if (user && profile?.name) {
        // For authenticated users, ensure they're properly represented
        console.log('🔥 Chat opened - ensuring authenticated user exists:', profile.name);
        setChatUsers(prev => {
          const otherUsers = prev.filter(u => u.id !== user.id && u.id !== 'anonymous');
          const authenticatedUser = {
            id: user.id,
            name: profile.name,
            element: profile.element || null,
            avatar_badge_id: profile.avatar_badge_id || null,
            last_seen: new Date().toISOString()
          };
          console.log('🔥 Setting authenticated user:', authenticatedUser);
          return [authenticatedUser, ...otherUsers];
        });
      } else if ((!user || !profile?.id || !profile?.name) && alienName) {
        // For unauthenticated users, ensure anonymous user exists
        console.log('🔥 Chat opened - ensuring anonymous user exists with name:', alienName);
        setChatUsers(prev => {
          const otherUsers = prev.filter(u => u.id !== 'anonymous');
          const anonymousUser = {
            id: 'anonymous',
            name: alienName,
            element: 'alien',
            avatar_badge_id: null,
            last_seen: new Date().toISOString()
          };
          console.log('🔥 Setting anonymous user with consistent name:', anonymousUser);
          return [anonymousUser, ...otherUsers];
        });
      }
    }
  }, [isOpen, user, profile?.id, profile?.name, alienName]);

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
        console.log('🔥 InitializeChat: Adding authenticated user:', profile.name);
        const authenticatedUser = {
          id: user.id,
          name: profile.name,
          element: profile.element || null,
          avatar_badge_id: profile.avatar_badge_id || null,
          last_seen: new Date().toISOString()
        };
        setChatUsers([authenticatedUser, ...databaseUsers.filter(u => u.id !== user.id)]);
      } else if (!user || !profile?.name) {
        // For unauthenticated users, use anonymous user
        console.log('🔥 InitializeChat: Using consistent alien name:', alienName);
        const anonymousUser = {
          id: 'anonymous',
          name: alienName,
          element: 'alien',
          avatar_badge_id: null,
          last_seen: new Date().toISOString()
        };
        console.log('🔥 Creating consistent anonymous user:', anonymousUser);
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
          console.log('🔥 Typing event:', typingData);
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
        console.log('🔥 Joining chat with name:', displayName);
        const syncMessage = await chatService.sendSyncMessage(displayName);
        console.log('🔥 Sync message result:', syncMessage);
        
        // For anonymous users, add the message locally and add to user list
        if (!user && syncMessage) {
          console.log('🔥 Adding anonymous message locally:', syncMessage);
          setMessages(prev => {
            const newMessages = [...prev, syncMessage];
            console.log('🔥 Updated messages:', newMessages);
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
    console.log('🔥 Sending message:', { messageText, displayName, user: !!user, userObject: user, profile: !!profile });
    
    // For authenticated users with complete profiles, send via service
    if (user && profile?.name) {
      try {
        const message = await chatService.sendMessage(messageText, 'message', displayName);
        console.log('🔥 Authenticated user message result:', message);
        
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
    
    console.log('🔥 Adding anonymous message locally:', anonymousMessage);
    setMessages(prev => {
      const newMessages = [...prev, anonymousMessage];
      console.log('🔥 Updated messages:', newMessages);
      return newMessages;
    });
    
    // Ensure anonymous user is in the users list
    setChatUsers(prev => {
      const existingAnonymous = prev.find(u => u.id === 'anonymous');
      if (!existingAnonymous) {
        console.log('🔥 Adding anonymous user to list');
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
      console.log('🔥 Background service result:', message);
    } catch (error) {
      console.log('🔥 Background service failed (expected for anonymous):', error);
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
    console.log('🔥 User clicked:', userId);
    
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
      console.log('🔥 Closing profile for same user');
      setSelectedUser(null);
      setShowUserBadges(false);
      setShowUserBinder(false);
      setShowSendHeartCoin(false);
      return;
    }
    
    let user = chatUsers.find(u => u.id === userId);
    console.log('🔥 Found user in chatUsers:', user);
    console.log('🔥 Current chatUsers:', chatUsers);
    
    // For anonymous users, always use the global alien name
    if (userId === 'anonymous') {
      user = {
        id: 'anonymous',
        name: getGlobalAlienName(), // Always use the global alien name function
        element: 'alien',
        avatar_badge_id: null,
        last_seen: new Date().toISOString()
      };
      console.log('🔥 Using global alien user:', user);
    }
    
    if (user) {
      setSelectedUser(user);
      setShowUserBadges(false); // Reset badge view when switching users
      setShowUserBinder(false); // Reset binder view when switching users
      setShowSendHeartCoin(false); // Reset heart coin view when switching users
      setIsUserPanelCollapsed(true); // Auto-collapse left panel when profile opens
      console.log('🔥 Set selected user:', user);
    } else {
      console.log('🔥 No user found for ID:', userId);
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
              className="w-full h-full flex flex-col"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(0, 0, 0, 0.15) 0%,
                    rgba(0, 20, 40, 0.1) 50%,
                    rgba(0, 0, 0, 0.15) 100%
                  )
                `,
                boxShadow: `
                  0 0 50px rgba(242, 239, 29, 0.15),
                  inset 0 0 100px rgba(242, 239, 29, 0.03)
                `,
                backdropFilter: 'blur(3px)'
              }}
            >
              {/* Header */}
              <div className="p-4 border-b border-yellow-400/30 flex items-center">
                <div className="flex items-center space-x-3 flex-1 mr-4">
                  <div 
                    className="w-3 h-3 rounded-full animate-pulse flex-shrink-0"
                    style={{
                      background: '#F2EF1D',
                      boxShadow: '0 0 15px rgba(242, 239, 29, 0.8)',
                      animation: 'neonBlink 1s infinite'
                    }}
                  />
                  <h2 
                    className="text-lg font-bold whitespace-nowrap"
                    style={{
                      color: '#F2EF1D !important',
                      textShadow: '0 0 10px #F2EF1D, 0 0 20px #F2EF1D, 0 0 30px #F2EF1D',
                      letterSpacing: '0.05em',
                      fontWeight: 'bold'
                    }}
                  >
                    HEART SIGNAL LIVE
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
                  className="text-yellow-400 hover:text-yellow-300 transition-colors p-1 flex-shrink-0"
                  style={{
                    background: 'rgba(242, 239, 29, 0.1)',
                    borderRadius: '4px',
                    border: '1px solid rgba(242, 239, 29, 0.3)',
                    color: '#F2EF1D',
                    textShadow: '0 0 8px rgba(242, 239, 29, 0.6)'
                  }}
                >
                  ◀
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex">
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
                          className="text-xs font-semibold"
                          style={{
                            color: '#F2EF1D',
                            textShadow: '0 0 8px rgba(242, 239, 29, 0.6)'
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
                        
                        console.log('🔥 Rendering UserList:', { usersToShow, user: !!user, profileName: profile?.name });
                        return (
                          <UserList 
                            users={usersToShow}
                            onUserClick={handleUserClick}
                            loading={loading}
                          />
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className={`flex flex-col transition-all duration-300 ${selectedUser ? 'flex-1' : 'flex-1'}`}>
                  {/* Always show messages */}
                  <MessageList 
                    messages={messages}
                    onUserClick={handleUserClick}
                    loading={loading}
                  />
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
                    />
                  )}
                </div>

                {/* Profile Panel - full right side when user is selected */}
                {selectedUser && (
                  <div className="w-full max-w-96 min-w-64 sm:min-w-72 border-l border-yellow-400/30 flex flex-col overflow-hidden">
                    {/* Profile Header */}
                    <div className="p-2 sm:p-3 border-b border-yellow-400/30">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col flex-1 min-w-0">
                          {/* User Icon and Name Row */}
                          <div className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {/* User Icon */}
                              {selectedUser.id === 'anonymous' ? (
                                <img src="/elements/alien.webp" alt="Alien" className="w-6 h-6 flex-shrink-0" />
                              ) : profile?.profile_image_url ? (
                                <img 
                                  src={profile.profile_image_url} 
                                  alt="Profile" 
                                  className="w-6 h-6 rounded-full flex-shrink-0 object-cover"
                                  style={{
                                    border: '1px solid rgba(242, 239, 29, 0.5)',
                                    boxShadow: '0 0 8px rgba(242, 239, 29, 0.3)'
                                  }}
                                />
                              ) : (
                                <div 
                                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{
                                    background: 'rgba(242, 239, 29, 0.2)',
                                    border: '1px solid rgba(242, 239, 29, 0.5)',
                                    boxShadow: '0 0 8px rgba(242, 239, 29, 0.3)'
                                  }}
                                >
                                  <span className="text-sm">👤</span>
                                </div>
                              )}
                              
                              <h3 
                                className="text-base font-bold truncate flex-1"
                                style={{
                                  color: '#F2EF1D',
                                  textShadow: '0 0 8px #F2EF1D'
                                }}
                              >
                                {selectedUser.id === 'anonymous' ? alienName : (selectedUser.name || getDisplayName())}
                              </h3>
                            </div>
                            
                            {/* Total Heart Coins */}
                            <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                              <div className="flex items-center space-x-1 px-2 py-1 rounded bg-black/30">
                                <span className="text-xs text-white/80 font-medium">TOTAL</span>
                                <img 
                                  src="/elements/heart-coin.webp" 
                                  alt="Total Heart Coins" 
                                  className="w-4 h-4"
                                />
                                <span className="text-sm text-pink-400 font-bold">{selectedUser.total_heart_coins ? selectedUser.total_heart_coins : 42}</span>
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
                                  className="text-yellow-400 hover:text-yellow-300 transition-colors text-sm px-1 py-1 rounded flex-shrink-0 ml-1"
                                  style={{
                                    background: 'rgba(242, 239, 29, 0.1)',
                                    border: '1px solid rgba(242, 239, 29, 0.3)',
                                    color: '#F2EF1D',
                                    textShadow: '0 0 8px rgba(242, 239, 29, 0.6)'
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                              {/* Days Streak */}
                              <div className="flex items-center space-x-1 px-2 py-1 text-xs text-white/70">
                                <span className="text-yellow-400 font-bold">{selectedUser.days_streak ? selectedUser.days_streak : 7}</span>
                                <span>Days Streak</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Badges, Binder Icons, and Send Heart Coin Row */}
                          <div className="flex items-center space-x-3 mt-1 ml-8">
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
                                if (showUserBadges) {
                                  // If badges are already showing, hide them
                                  setBadgeStartIndex(0);
                                  setShowUserBadges(false);
                                } else {
                                  // Show badges and hide other panels
                                  setBadgeStartIndex(0);
                                  setShowUserBadges(true);
                                  setShowUserBinder(false);
                                  setShowSendHeartCoin(false);
                                  setBinderStartIndex(0);
                                }
                              }}
                              className="hover:scale-110 transition-transform"
                              title="View Badges"
                            >
                              <img 
                                src="/elements/badges.webp" 
                                alt="Badges" 
                                className="w-5 h-5"
                              />
                            </button>
                            
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
                                if (showUserBinder) {
                                  // If binder is already showing, hide it
                                  setBinderStartIndex(0);
                                  setShowUserBinder(false);
                                } else {
                                  // Show binder and hide other panels
                                  setBinderStartIndex(0);
                                  setShowUserBinder(true);
                                  setShowUserBadges(false);
                                  setShowSendHeartCoin(false);
                                  setBadgeStartIndex(0);
                                }
                              }}
                              className="hover:scale-110 transition-transform"
                              title="View Cards"
                            >
                              <img 
                                src="/elements/binder.webp" 
                                alt="Cards" 
                                className="w-5 h-5"
                              />
                            </button>
                            
                            {/* Send Heart Coin Button */}
                            <button 
                              className="w-6 h-6 rounded flex items-center justify-center bg-black/20 border border-pink-400/30 hover:bg-pink-400/20 transition-colors hover:scale-110"
                              title="Send Heart Coin"
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
                                // Show send heart coin interface and hide others
                                setShowSendHeartCoin(true);
                                setShowUserBadges(false);
                                setShowUserBinder(false);
                                setBadgeStartIndex(0);
                                setBinderStartIndex(0);
                              }}
                            >
                              <span className="text-xs">💖</span>
                            </button>
                          </div>
                        </div>
                        {/* Removed right-side arrow close button to declutter UI near streak */}
                      </div>
                    </div>

                    {/* Profile Content - scrollable */}
                    <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-4">


                      {/* Badges Section */}
                      {showUserBadges && (
                        <div className="pt-2 border-t border-white/20">
                          <h4 className="text-sm text-white/80 font-semibold mb-3 flex items-center">
                            <img src="/elements/badges.webp" alt="Badges" className="w-4 h-4 mr-2" />
                            User Badges
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
                                setBadgeStartIndex(Math.max(0, badgeStartIndex - 5));
                              }}
                              disabled={badgeStartIndex === 0}
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

                            {/* Badges Grid */}
                            <div className="flex-1 grid grid-cols-5 gap-2">
                              {/* Always show 5 blank badge placeholders */}
                              {Array.from({ length: 5 }, (_, index) => {
                                return (
                                  <div key={`placeholder-${badgeStartIndex}-${index}`} className="flex flex-col items-center">
                                    <div className="w-12 h-12 bg-gray-600/20 rounded-full mb-1 flex items-center justify-center border-2 border-gray-600/30">
                                      <span className="text-gray-500/50 text-sm">○</span>
                                    </div>
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
                                setBadgeStartIndex(badgeStartIndex + 5);
                              }}
                              disabled={badgeStartIndex >= 30}
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

                      {/* Binder Section */}
                      {showUserBinder && (
                        <div className="pt-2 border-t border-white/20">
                          <h4 className="text-sm text-white/80 font-semibold mb-3 flex items-center">
                            <img src="/elements/binder.webp" alt="Cards" className="w-4 h-4 mr-2" />
                            Card Collection
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
                            <div className="flex-1 grid grid-cols-5 gap-2">
                              {/* Display real song cards */}
                              {songCollection.slice(binderStartIndex, binderStartIndex + 5).map((song, index) => {
                                const elementDisplay = getElementDisplay(song.element);
                                return (
                                  <div 
                                    key={binderStartIndex + index} 
                                    className="rounded-lg border border-white/20 backdrop-blur-sm transition-all duration-300"
                                    style={{
                                      boxShadow: '0 0 10px rgba(255,105,180,0.3)',
                                      background: 'rgba(0, 0, 0, 0.4)'
                                    }}
                                  >
                                    <div className="w-full h-16 rounded-lg flex items-center justify-center">
                                    </div>
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
                                setBinderStartIndex(Math.min(Math.max(0, songCollection.length - 5), binderStartIndex + 5));
                              }}
                              disabled={binderStartIndex + 5 >= songCollection.length}
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
                          <h4 className="text-sm text-white/80 font-semibold mb-3 flex items-center">
                            <span className="text-sm mr-2">💖</span>
                            Send Heart Coin
                          </h4>
                          <div className="flex flex-col items-center space-y-4 p-4 bg-black/20 rounded-lg border border-pink-400/30">
                            {/* Current Heart Coins Display */}
                            <div className="flex items-center space-x-2">
                              <img 
                                src="/elements/heart-coin.webp" 
                                alt="Heart Coins" 
                                className="w-8 h-8"
                              />
                              <span className="text-lg text-pink-400 font-bold">{profile?.heartcoin_balance || 42}</span>
                            </div>
                            
                            {/* Send Button */}
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
                                console.log('Sending 1 heart coin to:', selectedUser.name);
                                // TODO: Implement actual heart coin sending logic
                                setShowSendHeartCoin(false); // Hide interface after sending
                              }}
                              className="flex items-center space-x-2 px-4 py-2 bg-pink-500/20 border border-pink-400/60 hover:border-pink-400/80 rounded-lg transition-all duration-200 hover:bg-pink-500/30"
                              style={{
                                background: 'rgba(255, 105, 180, 0.1)',
                                color: '#FF69B4',
                                textShadow: '0 0 8px rgba(255, 105, 180, 0.6)',
                                boxShadow: '0 0 15px rgba(255, 105, 180, 0.3)',
                              }}
                            >
                              <span className="text-sm font-bold">SEND</span>
                              <img 
                                src="/elements/heart-coin.webp" 
                                alt="Heart Coin" 
                                className="w-4 h-4"
                              />
                              <span className="text-sm font-bold">1</span>
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
        </>
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
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}
