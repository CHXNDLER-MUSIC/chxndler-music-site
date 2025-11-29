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
  console.log('ChatPanel render:', { isOpen, profile: !!profile, user: !!user });

  // Store alien name consistently for the session
  const [alienName, setAlienName] = useState(null);

  /**
   * Get display name for user - logged in name or anonymous alien name
   */
  const getDisplayName = () => {
    if (profile?.name) {
      return profile.name;
    }
    
    // Generate and store alien name for this session
    if (!alienName) {
      const alienNumber = Math.floor(Math.random() * 9999) + 1;
      const newAlienName = `ALIEN [${alienNumber}]`;
      setAlienName(newAlienName);
      return newAlienName;
    }
    
    return alienName;
  };
  const [messages, setMessages] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const channelRef = useRef(null);

  // Initialize chat when panel opens
  useEffect(() => {
    if (isOpen) {
      initializeChat();
    } else {
      cleanupChat();
    }
  }, [isOpen]);

  // Ensure anonymous users appear immediately when chat opens
  useEffect(() => {
    if (isOpen) {
      const displayName = getDisplayName();
      console.log('🔥 Chat opened - user state:', { user: !!user, profile: !!profile, displayName });
      
      // Force add anonymous user immediately for any non-authenticated user
      if (!user) {
        console.log('🔥 FORCE Adding anonymous user to list:', displayName);
        
        // Always add/update the anonymous user entry
        setChatUsers(prev => {
          console.log('🔥 Current users before update:', prev);
          const filteredUsers = prev.filter(u => u.id !== 'anonymous'); // Remove any existing anonymous
          const newUsers = [{
            id: 'anonymous',
            name: displayName,
            element: null,
            avatar_badge_id: null,
            last_seen: new Date().toISOString()
          }, ...filteredUsers];
          console.log('🔥 New users after update:', newUsers);
          return newUsers;
        });
      }
    }
  }, [isOpen, user]);

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

      // Load current chat users
      const users = await chatService.getChatUsers();
      setChatUsers(users);

      // Subscribe to new messages
      channelRef.current = await chatService.subscribeToChat(
        (newMessage) => {
          setMessages(prev => [...prev, newMessage]);
          
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
    try {
      const displayName = getDisplayName();
      const message = await chatService.sendMessage(messageText, 'message', displayName);
      if (message) {
        // For anonymous users, add message locally since it won't come through real-time
        if (!user) {
          setMessages(prev => [...prev, message]);
        }
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  /**
   * Handle user profile click
   */
  const handleUserClick = (userId) => {
    const user = chatUsers.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
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
              className="w-80 h-full bg-black/60 backdrop-blur-xl border-r-2 border-cyan-400/50 flex flex-col"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(0, 0, 0, 0.7) 0%,
                    rgba(0, 20, 40, 0.6) 50%,
                    rgba(0, 0, 0, 0.7) 100%
                  )
                `,
                boxShadow: `
                  0 0 50px rgba(0, 255, 255, 0.3),
                  inset 0 0 100px rgba(0, 255, 255, 0.1)
                `,
              }}
            >
              {/* Header */}
              <div className="p-4 border-b border-cyan-400/30 flex items-center">
                <div className="flex items-center space-x-3 flex-1 mr-4">
                  <div 
                    className="w-3 h-3 rounded-full animate-pulse flex-shrink-0"
                    style={{
                      background: 'linear-gradient(45deg, #FC54AF, #38B6FF)',
                      boxShadow: '0 0 15px rgba(252, 84, 175, 0.6)'
                    }}
                  />
                  <h2 
                    className="text-lg font-bold whitespace-nowrap"
                    style={{
                      color: '#00FFFF',
                      textShadow: '0 0 10px #00FFFF, 0 0 20px #00FFFF',
                      letterSpacing: '0.05em'
                    }}
                  >
                    HEART SIGNAL LIVE
                  </h2>
                  {/* Extended glow line */}
                  <div 
                    className="flex-1 h-px ml-4"
                    style={{
                      background: 'linear-gradient(90deg, rgba(0, 255, 255, 0.6), rgba(0, 255, 255, 0.2), transparent)',
                      boxShadow: '0 0 8px rgba(0, 255, 255, 0.4)'
                    }}
                  />
                </div>
                
                <button
                  onClick={handleClose}
                  className="text-white/70 hover:text-white transition-colors p-1 flex-shrink-0"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex">
                {/* User List */}
                <div className="w-20 border-r border-cyan-400/20">
                  <UserList 
                    users={chatUsers}
                    onUserClick={handleUserClick}
                    loading={loading}
                  />
                </div>

                {/* Messages Area */}
                <div className="flex-1 flex flex-col">
                  {selectedUser ? (
                    /* User Profile View */
                    <div className="flex-1 flex flex-col">
                      {/* Profile Header */}
                      <div className="p-4 border-b border-cyan-400/20 flex items-center justify-between">
                        <h3 
                          className="text-lg font-bold"
                          style={{
                            color: '#00FFFF',
                            textShadow: '0 0 10px #00FFFF'
                          }}
                        >
                          {selectedUser.name || 'Anonymous'}
                        </h3>
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="text-white/70 hover:text-white transition-colors p-1 rounded"
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          ← Back to Chat
                        </button>
                      </div>
                      
                      {/* Profile Content */}
                      <div className="flex-1 p-4 overflow-y-auto">
                        <div className="text-center">
                          <div 
                            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                            style={{
                              background: 'rgba(0, 255, 255, 0.2)',
                              border: '2px solid rgba(0, 255, 255, 0.5)',
                              boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
                            }}
                          >
                            {selectedUser.id === 'anonymous' ? (
                              <span className="text-2xl">👽</span>
                            ) : (
                              <span className="text-2xl">👤</span>
                            )}
                          </div>
                          
                          <p className="text-white/80 text-sm mb-6">
                            {selectedUser.id === 'anonymous' 
                              ? `${selectedUser.name} - A mysterious entity exploring the Heart Signal dimensions.`
                              : `Profile for ${selectedUser.name}`}
                          </p>
                          
                          {/* Profile Stats */}
                          <div className="space-y-3 text-left">
                            <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.05))', border: '1px solid rgba(0, 255, 255, 0.2)' }}>
                              <span className="text-white/70 text-sm">Status:</span>
                              <span className="text-green-400 text-sm font-semibold">
                                <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                                Connected
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.05))', border: '1px solid rgba(0, 255, 255, 0.2)' }}>
                              <span className="text-white/70 text-sm">Identity:</span>
                              <span className="text-purple-400 text-sm font-semibold">
                                {selectedUser.id === 'anonymous' ? 'Interdimensional Visitor' : (selectedUser.element || 'Unknown')}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.05))', border: '1px solid rgba(0, 255, 255, 0.2)' }}>
                              <span className="text-white/70 text-sm">Origin:</span>
                              <span className="text-white/90 text-sm font-semibold">
                                {selectedUser.id === 'anonymous' ? 'Unknown Dimension' : 'Heart Signal Universe'}
                              </span>
                            </div>

                            {selectedUser.id === 'anonymous' && (
                              <div className="mt-6 p-4 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(252, 84, 175, 0.1), rgba(56, 182, 255, 0.1))', border: '1px solid rgba(252, 84, 175, 0.3)' }}>
                                <p className="text-pink-300 text-xs text-center leading-relaxed">
                                  ✨ This ALIEN visitor carries the essence of distant worlds, temporarily connected to our Heart Signal frequency. Their presence here is both mysterious and welcome. ✨
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Normal Chat View */
                    <>
                      <MessageList 
                        messages={messages}
                        onUserClick={handleUserClick}
                        loading={loading}
                      />
                      
                      {/* Message Input */}
                      <MessageInput 
                        onSendMessage={handleSendMessage}
                        disabled={loading}
                        placeholder="Type a message..."
                      />
                    </>
                  )}
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
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}