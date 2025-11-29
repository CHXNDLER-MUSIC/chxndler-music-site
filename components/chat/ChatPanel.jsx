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
  
  // Real song collection data from BinderModal
  const songCollection = [
    { name: 'MR. BRIGHTSIDE', element: 'DARKNESS', rarity: 'Common' },
    { name: 'CHEERLEADER (ACOUSTIC)', element: 'HEART', rarity: 'Common' },
    { name: 'ALONE', element: 'DARKNESS', rarity: 'Common' },
    { name: 'LITTLE BLACK HEART', element: 'DARKNESS', rarity: 'Common' },
    { name: 'ALWAYS ON MY MIND', element: 'HEART', rarity: 'Common' },
    { name: 'BE MY BEE', element: 'HEART', rarity: 'Common' },
    { name: 'BLUE', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'BRAIN FREEZE', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'GAME BOY HEART', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'HOME', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'OCEAN GIRL', element: 'WATER', rarity: 'Common' },
    { name: 'LETTING GO', element: 'WATER', rarity: 'Common' },
    { name: 'WATER', element: 'WATER', rarity: 'Rare' },
    { name: 'HEART', element: 'HEART', rarity: 'Rare' },
    { name: 'LIGHTNING', element: 'LIGHTNING', rarity: 'Rare' },
    { name: 'DARKNESS', element: 'DARKNESS', rarity: 'Rare' },
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
    // Force anonymous mode - always use alien name if no authenticated user
    if (!user || !profile?.id) {
      console.log('🔥 Using stored alien name (no user or profile):', alienName);
      return alienName;
    }
    
    if (profile?.name) {
      console.log('🔥 Using profile name:', profile.name);
      return profile.name;
    }
    
    // Fallback to alien name
    console.log('🔥 Using stored alien name (fallback):', alienName);
    return alienName;
  };
  const [messages, setMessages] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isUserPanelCollapsed, setIsUserPanelCollapsed] = useState(false); // Start expanded so user can see their alien name
  
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
  const [badgeStartIndex, setBadgeStartIndex] = useState(0);
  const [binderStartIndex, setBinderStartIndex] = useState(0);
  const channelRef = useRef(null);

  // Initialize anonymous user immediately when chat opens
  useEffect(() => {
    if ((!user || !profile?.id) && isOpen) {
      console.log('🚀 IMMEDIATE: Using stored alien name:', alienName);
      
      // Always use the pre-initialized alien name
      const anonymousUser = {
        id: 'anonymous',
        name: alienName, // Always use the stored alien name
        element: 'alien',
        avatar_badge_id: null,
        last_seen: new Date().toISOString()
      };
      
      setChatUsers([anonymousUser]);
      console.log('🚀 Set initial chat users with consistent name:', [anonymousUser]);
    }
  }, [user, isOpen, alienName]); // Add alienName as dependency

  // Initialize chat when panel opens
  useEffect(() => {
    if (isOpen) {
      initializeChat();
    } else {
      cleanupChat();
    }
  }, [isOpen]);

  // Ensure anonymous user is maintained when chat state changes
  useEffect(() => {
    if (isOpen && (!user || !profile?.id) && alienName) {
      console.log('🔥 Chat opened - ensuring anonymous user exists with name:', alienName);
      
      // Always refresh the anonymous user with the correct alien name
      setChatUsers(prev => {
        const otherUsers = prev.filter(u => u.id !== 'anonymous');
        const anonymousUser = {
          id: 'anonymous',
          name: alienName, // Always use the stored alien name
          element: 'alien',
          avatar_badge_id: null,
          last_seen: new Date().toISOString()
        };
        console.log('🔥 Setting anonymous user with consistent name:', anonymousUser);
        return [anonymousUser, ...otherUsers];
      });
    }
  }, [isOpen, user, profile?.id, alienName]);

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
      
      // If user is not authenticated, preserve/ensure the anonymous user
      if (!user) {
        console.log('🔥 InitializeChat: Using consistent alien name:', alienName);
        
        setChatUsers(prev => {
          // Always use the consistent alien name
          const anonymousUser = {
            id: 'anonymous',
            name: alienName, // Use stored alien name directly
            element: 'alien',
            avatar_badge_id: null,
            last_seen: new Date().toISOString()
          };
          console.log('🔥 Creating consistent anonymous user:', anonymousUser);
          return [anonymousUser, ...databaseUsers];
        });
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
    
    // For anonymous users, always add message locally first  
    if (!user || !profile?.id) {
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
      
      return; // Exit early for anonymous users
    }
    
    // For authenticated users, try service first
    try {
      const message = await chatService.sendMessage(messageText, 'message', displayName);
      console.log('🔥 Authenticated user message result:', message);
      
      if (!message) {
        console.error('Failed to send message for authenticated user');
      }
    } catch (error) {
      console.error('Error sending message for authenticated user:', error);
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
      const audio = new Audio('/close.mp3');
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
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={onClose}
          />

          {/* Chat Panel */}
          <motion.div
            className="fixed left-0 top-0 bottom-0 z-[110] flex max-w-[100vw] overflow-hidden"
            variants={panelVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div
              className={`w-full h-full border-r-2 border-yellow-400/50 flex flex-col ${
                selectedUser 
                  ? 'max-w-[95vw] sm:max-w-[85vw] md:max-w-[75vw] lg:max-w-[60vw] xl:max-w-[50vw]' 
                  : 'max-w-[90vw] sm:max-w-[32rem]'
              } min-w-[18rem]`}
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
                backdropFilter: 'blur(10px)'
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
                  ×
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
                        const usersToShow = (chatUsers.length === 0 && (!user || !profile?.id)) ? [{
                          id: 'anonymous',
                          name: alienName, // Always use stored alien name
                          element: 'alien', 
                          avatar_badge_id: null,
                          last_seen: new Date().toISOString()
                        }] : chatUsers;
                        console.log('🔥 Rendering UserList with consistent alien name:', { usersToShow, alienName, user: !!user });
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
                                {selectedUser.id === 'anonymous' ? alienName : selectedUser.name}
                              </h3>
                            </div>
                            
                            {/* Total Heart Coins */}
                            <div className="flex items-center space-x-1 px-2 py-1 rounded bg-black/30 flex-shrink-0">
                              <span className="text-xs text-white/80 font-medium">TOTAL</span>
                              <img 
                                src="/elements/heart-coin.webp" 
                                alt="Total Heart Coins" 
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-pink-400 font-bold">{selectedUser.total_heart_coins || 42}</span>
                            </div>
                          </div>
                          
                          {/* Badges, Binder Icons, and Send Heart Coin Row */}
                          <div className="flex items-center space-x-3 mt-2 ml-8">
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
                                  setBadgeStartIndex(0); // Reset to first page when closing
                                }
                                setShowUserBadges(!showUserBadges);
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
                                  setBinderStartIndex(0); // Reset to first page when closing
                                }
                                setShowUserBinder(!showUserBinder);
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
                                console.log('Send heart coin to:', selectedUser.name);
                              }}
                            >
                              <span className="text-xs">💖</span>
                            </button>
                          </div>
                        </div>
                        
                        {/* Close Profile Button */}
                        <button
                          onClick={() => {
                            try {
                              const audio = new Audio('/close.mp3');
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
                          }}
                          className="text-white/70 hover:text-white transition-colors text-sm px-1 py-1 rounded flex-shrink-0 ml-1"
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          ×
                        </button>
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
                                textShadow: '0 0 8px rgba(242, 239, 29, 0.6)'
                              }}
                            >
                              ◀
                            </button>

                            {/* Badges Grid */}
                            <div className="flex-1 grid grid-cols-5 gap-2">
                              {/* Display completed user badges */}
                              {userBadges && userBadges.length > 0 ? (
                                userBadges.slice(badgeStartIndex, badgeStartIndex + 5).map((userBadge, index) => (
                                  <div key={badgeStartIndex + index} className="flex flex-col items-center">
                                    <div className="w-12 h-12 bg-yellow-400/20 rounded-full mb-1 flex items-center justify-center">
                                      {userBadge.badge?.icon_url ? (
                                        <img 
                                          src={userBadge.badge.icon_url} 
                                          alt={userBadge.badge.name} 
                                          className="w-8 h-8 rounded-full" 
                                        />
                                      ) : (
                                        <span className="text-sm">🏆</span>
                                      )}
                                    </div>
                                    <span className="text-xs text-white/70 text-center">{userBadge.badge?.name || 'Badge'}</span>
                                  </div>
                                ))
                              ) : (
                                // Show message when no badges earned yet
                                <div className="col-span-5 text-center text-white/50 text-xs py-4">
                                  No badges earned yet
                                </div>
                              )}
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
                                setBadgeStartIndex(Math.min(Math.max(0, userBadges.length - 5), badgeStartIndex + 5));
                              }}
                              disabled={!userBadges || badgeStartIndex + 5 >= userBadges.length}
                              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-yellow-400 hover:text-yellow-300 disabled:text-yellow-400/30 transition-colors"
                              style={{
                                textShadow: '0 0 8px rgba(242, 239, 29, 0.6)'
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
                                textShadow: '0 0 8px rgba(242, 239, 29, 0.6)'
                              }}
                            >
                              ◀
                            </button>

                            {/* Cards Grid */}
                            <div className="flex-1 grid grid-cols-5 gap-2">
                              {/* Display sample cards */}
                              {sampleCards.slice(binderStartIndex, binderStartIndex + 5).map((card, index) => (
                                <div key={binderStartIndex + index} className="relative p-1 rounded bg-black/30">
                                  <div className="absolute top-0.5 right-0.5 text-xs text-yellow-300">★</div>
                                  <div className={`w-full h-16 bg-${card.color}/20 rounded mb-1 flex items-center justify-center`}>
                                    <span className="text-sm">{card.icon}</span>
                                  </div>
                                  <span className="text-xs text-white/70 block truncate text-center">{card.name}</span>
                                </div>
                              ))}
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
                              disabled={binderStartIndex + 5 >= sampleCards.length}
                              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-yellow-400 hover:text-yellow-300 disabled:text-yellow-400/30 transition-colors"
                              style={{
                                textShadow: '0 0 8px rgba(242, 239, 29, 0.6)'
                              }}
                            >
                              ▶
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
