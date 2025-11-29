"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService } from '@/lib/supabase/chat';
import { useProfile } from '@/contexts/ProfileContext';
// import { useLiveStatus } from '@/hooks/useLiveStatus'; // Removed since chat is always available
import UserList from './UserList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ProfileModal from './ProfileModal';

/**
 * Main Chat Panel Component
 * Slides in from the left side when live streaming is active
 */
export default function ChatPanel({ isOpen, onClose }) {
  const { profile, user } = useProfile();
  
  // Debug logging
  console.log('🔥 ChatPanel render:', { isOpen, profile: !!profile, user: !!user });

  // Store alien name consistently for the session - initialize immediately
  const [alienName, setAlienName] = useState(() => {
    // Generate alien name once on component mount
    const alienNumber = Math.floor(Math.random() * 99999999) + 1;
    const paddedNumber = alienNumber.toString().padStart(8, '0');
    const newAlienName = `ALIEN${paddedNumber}`;
    console.log('🔥 Generated initial alien name:', newAlienName);
    return newAlienName;
  });

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
  const [showUserBadges, setShowUserBadges] = useState(false);
  const [showUserBinder, setShowUserBinder] = useState(false);
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
    if (isOpen && !user && alienName) {
      console.log('🔥 Chat opened - ensuring anonymous user exists:', alienName);
      
      // Check if anonymous user is already in the list
      setChatUsers(prev => {
        const hasAnonymous = prev.some(u => u.id === 'anonymous');
        if (!hasAnonymous) {
          console.log('🔥 Anonymous user missing, adding to list');
          const anonymousUser = {
            id: 'anonymous',
            name: alienName,
            element: 'alien',
            avatar_badge_id: null,
            last_seen: new Date().toISOString()
          };
          return [anonymousUser, ...prev];
        }
        return prev;
      });
    }
  }, [isOpen, user, alienName]);

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
    
    // For anonymous users, always use the consistent alien name
    if (userId === 'anonymous') {
      user = {
        id: 'anonymous',
        name: alienName, // Always use the stored alien name
        element: 'alien',
        avatar_badge_id: null,
        last_seen: new Date().toISOString()
      };
      console.log('🔥 Using consistent alien user:', user);
    }
    
    if (user) {
      setSelectedUser(user);
      setShowUserBadges(false); // Reset badge view when switching users
      setShowUserBinder(false); // Reset binder view when switching users
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
            className="fixed left-0 top-0 bottom-0 z-[110] flex"
            variants={panelVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div
              className="w-[32rem] h-full border-r-2 border-yellow-400/50 flex flex-col"
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
                  className={`border-r border-cyan-400/20 transition-all duration-300 ease-in-out ${
                    isUserPanelCollapsed ? 'w-8' : 'w-48'
                  }`}
                >
                  {/* Collapse Toggle Button */}
                  <div className="h-full flex flex-col">
                    <button
                      onClick={() => setIsUserPanelCollapsed(!isUserPanelCollapsed)}
                      className="w-full p-2 hover:bg-yellow-400/10 transition-colors duration-200 border-b border-cyan-400/20 flex flex-col items-center justify-center relative"
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
                        const usersToShow = chatUsers.length === 0 && !user ? [{
                          id: 'anonymous',
                          name: alienName || 'ALIEN00000000',
                          element: 'alien',
                          avatar_badge_id: null,
                          last_seen: new Date().toISOString()
                        }] : chatUsers;
                        console.log('🔥 Rendering UserList with:', { usersToShow, chatUsers, alienName, user: !!user });
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
                <div className="flex-1 flex flex-col">
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
                  
                  {/* Profile View - shown above message input when user is selected */}
                  {console.log('🔥 Rendering profile check - selectedUser:', selectedUser)}
                  {selectedUser && (
                    <div className="border-t border-yellow-400/30 px-3" style={{ paddingTop: 0, paddingBottom: 0, marginTop: 0 }}>
                      {/* Profile Header with Icons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {/* User Icon */}
                          <div 
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              background: 'rgba(0, 255, 0, 0.2)',
                              border: '1px solid rgba(0, 255, 0, 0.5)',
                              boxShadow: '0 0 8px rgba(0, 255, 0, 0.3)'
                            }}
                          >
                            {selectedUser.id === 'anonymous' ? (
                              <span className="text-xs">👽</span>
                            ) : (
                              <span className="text-xs">👤</span>
                            )}
                          </div>
                          
                          <h3 
                            className="text-sm font-bold truncate"
                            style={{
                              color: '#F2EF1D',
                              textShadow: '0 0 8px #F2EF1D',
                              maxWidth: '200px'
                            }}
                          >
                            {(() => {
                              const profileName = selectedUser.id === 'anonymous' ? alienName : (selectedUser.name || 'Anonymous');
                              console.log('🔥 Profile displaying name:', profileName);
                              console.log('🔥 Selected user:', selectedUser);
                              console.log('🔥 Stored alien name:', alienName);
                              return profileName;
                            })()}
                          </h3>
                          
                          {/* Action Icons */}
                          <div className="flex items-center space-x-1">
                            {/* Heart Coins */}
                            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-black/20 border border-pink-400/30">
                              <img 
                                src="/elements/heart-coin.webp" 
                                alt="Heart Coins" 
                                className="w-3 h-3"
                              />
                              <span className="text-xs text-pink-400 font-bold">0</span>
                            </div>
                            
                            {/* Send Heart Coin Button */}
                            <button 
                              className="w-6 h-6 rounded flex items-center justify-center bg-black/20 border border-pink-400/30 hover:bg-pink-400/20 transition-colors"
                              title="Send Heart Coin"
                              onClick={() => {
                                // TODO: Implement heart coin sending
                                console.log('Send heart coin to:', selectedUser.name);
                              }}
                            >
                              <span className="text-xs">💖</span>
                            </button>
                            
                            {/* Badges Button */}
                            <button 
                              className="w-6 h-6 rounded flex items-center justify-center bg-black/20 border border-purple-400/30 hover:bg-purple-400/10 transition-colors"
                              onClick={() => setShowUserBadges(!showUserBadges)}
                              title="View Badges"
                            >
                              <img 
                                src="/elements/badges.webp" 
                                alt="Badges" 
                                className="w-4 h-4"
                              />
                            </button>
                            
                            {/* Binder Button */}
                            <button 
                              className="w-6 h-6 rounded flex items-center justify-center bg-black/20 border border-blue-400/30 hover:bg-blue-400/10 transition-colors"
                              title="View Cards"
                              onClick={() => setShowUserBinder(!showUserBinder)}
                            >
                              <img 
                                src="/elements/binder.webp" 
                                alt="Cards" 
                                className="w-4 h-4"
                              />
                            </button>
                          </div>
                        </div>
                        
                        {/* Total Heart Coins - top right */}
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 px-2 py-1 rounded bg-black/30 border border-pink-400/40">
                            <span className="text-xs text-white/80 font-medium">TOTAL</span>
                            <img 
                              src="/elements/heart-coin.webp" 
                              alt="Total Heart Coins" 
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-pink-400 font-bold">42</span>
                          </div>
                          
                          <button
                            onClick={() => {
                              setSelectedUser(null);
                              setShowUserBadges(false);
                              setShowUserBinder(false);
                            }}
                            className="text-white/70 hover:text-white transition-colors text-xs px-2 py-1 rounded"
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      
                      
                      {/* User Badges - shown when badges button is clicked */}
                      {showUserBadges && (
                        <div className="mt-3 pt-3 border-t border-white/20">
                          <h4 className="text-xs text-white/80 font-semibold mb-2 flex items-center">
                            <img src="/elements/badges.webp" alt="Badges" className="w-3 h-3 mr-1" />
                            BADGES EARNED
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {/* Sample badges - replace with actual user badges */}
                            <div className="flex flex-col items-center p-2 rounded bg-black/30 border border-purple-400/30">
                              <div className="w-6 h-6 rounded flex items-center justify-center bg-purple-400/20">
                                <span className="text-xs">🏆</span>
                              </div>
                              <span className="text-xs text-white/70 mt-1 text-center">First Message</span>
                            </div>
                            
                            <div className="flex flex-col items-center p-2 rounded bg-black/30 border border-green-400/30">
                              <div className="w-6 h-6 rounded flex items-center justify-center bg-green-400/20">
                                <span className="text-xs">👽</span>
                              </div>
                              <span className="text-xs text-white/70 mt-1 text-center">Alien Visitor</span>
                            </div>
                            
                            <div className="flex flex-col items-center p-2 rounded bg-black/30 border border-yellow-400/30">
                              <div className="w-6 h-6 rounded flex items-center justify-center bg-yellow-400/20">
                                <span className="text-xs">⭐</span>
                              </div>
                              <span className="text-xs text-white/70 mt-1 text-center">Signal Explorer</span>
                            </div>
                            
                            {/* Locked badge placeholder */}
                            <div className="flex flex-col items-center p-2 rounded bg-black/20 border border-gray-500/30 opacity-50">
                              <div className="w-6 h-6 rounded flex items-center justify-center bg-gray-500/20">
                                <span className="text-xs">🔒</span>
                              </div>
                              <span className="text-xs text-white/50 mt-1 text-center">Mystery</span>
                            </div>
                            
                            <div className="flex flex-col items-center p-2 rounded bg-black/20 border border-gray-500/30 opacity-50">
                              <div className="w-6 h-6 rounded flex items-center justify-center bg-gray-500/20">
                                <span className="text-xs">🔒</span>
                              </div>
                              <span className="text-xs text-white/50 mt-1 text-center">Secret</span>
                            </div>
                            
                            <div className="flex flex-col items-center p-2 rounded bg-black/20 border border-gray-500/30 opacity-50">
                              <div className="w-6 h-6 rounded flex items-center justify-center bg-gray-500/20">
                                <span className="text-xs">🔒</span>
                              </div>
                              <span className="text-xs text-white/50 mt-1 text-center">Hidden</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* User Binder - shown when binder button is clicked */}
                      {showUserBinder && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          <h4 className="text-xs text-white/80 font-semibold mb-2 flex items-center">
                            <img src="/elements/binder.webp" alt="Cards" className="w-3 h-3 mr-1" />
                            CARD COLLECTION
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Actual Song Cards - matching main binder */}
                            <div className="relative p-2 rounded bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-400/40">
                              <div className="absolute top-1 right-1 text-xs text-purple-300">★</div>
                              <div className="w-full h-12 bg-purple-400/20 rounded mb-1 flex items-center justify-center">
                                <span className="text-xs text-purple-200">💜</span>
                              </div>
                              <div className="text-xs text-white/90 font-medium truncate">CHEERLEADER</div>
                              <div className="text-xs text-purple-300">HEART</div>
                            </div>
                            
                            <div className="relative p-2 rounded bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-400/40">
                              <div className="absolute top-1 right-1 text-xs text-blue-300">★</div>
                              <div className="w-full h-12 bg-blue-400/20 rounded mb-1 flex items-center justify-center">
                                <span className="text-xs text-blue-200">⚡</span>
                              </div>
                              <div className="text-xs text-white/90 font-medium truncate">BLUE</div>
                              <div className="text-xs text-blue-300">LIGHTNING</div>
                            </div>
                            
                            <div className="relative p-2 rounded bg-gradient-to-br from-pink-900/30 to-purple-900/30 border border-pink-400/40">
                              <div className="absolute top-1 right-1 text-xs text-pink-300">★</div>
                              <div className="w-full h-12 bg-pink-400/20 rounded mb-1 flex items-center justify-center">
                                <span className="text-xs text-pink-200">💜</span>
                              </div>
                              <div className="text-xs text-white/90 font-medium truncate">ALWAYS ON MY MIND</div>
                              <div className="text-xs text-pink-300">HEART</div>
                            </div>
                            
                            {/* Empty slot */}
                            <div className="p-2 rounded bg-black/20 border border-gray-500/30 opacity-50 flex items-center justify-center h-20">
                              <div className="text-center">
                                <div className="text-xs text-white/50">Empty Slot</div>
                                <div className="text-xs text-white/30">Find more cards!</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                      
                  {/* Message Input - always shown */}
                  <MessageInput 
                    onSendMessage={handleSendMessage}
                    onTyping={handleTyping}
                    disabled={loading}
                    placeholder="Type a message..."
                  />
                </div>
              </div>

              {/* Holographic scan lines overlay */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  background: `
                    repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 2px,
                      rgba(0, 255, 255, 0.1) 2px,
                      rgba(0, 255, 255, 0.1) 4px
                    )
                  `,
                  animation: 'scan 3s linear infinite'
                }}
              />
            </div>
          </motion.div>


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