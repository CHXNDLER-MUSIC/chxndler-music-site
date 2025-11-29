"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService } from '@/lib/supabase/chat';
import { useProfile } from '@/contexts/ProfileContext';
import { useLiveStatus } from '@/hooks/useLiveStatus';
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
  const { isLive, statusText } = useLiveStatus();
  const [messages, setMessages] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const channelRef = useRef(null);

  // Initialize chat when panel opens
  useEffect(() => {
    if (isOpen && isLive && user && profile) {
      initializeChat();
    } else if (!isOpen || !isLive) {
      cleanupChat();
    }
  }, [isOpen, isLive, user, profile]);

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

      // Send join message if not already joined
      if (!hasJoined && profile?.name) {
        await chatService.sendJoinMessage(profile.name);
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
    if (hasJoined && profile?.name) {
      try {
        await chatService.sendLeaveMessage(profile.name);
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
      const message = await chatService.sendMessage(messageText, 'message');
      if (!message) {
        console.error('Failed to send message');
      }
      // Message will be added via real-time subscription
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

  if (!isLive) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={onClose}
          />

          {/* Chat Panel */}
          <motion.div
            className="fixed left-0 top-0 bottom-0 z-50 flex"
            variants={panelVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div
              className="w-80 h-full bg-black/80 backdrop-blur-xl border-r-2 border-cyan-400/50 flex flex-col"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(0, 0, 0, 0.95) 0%,
                    rgba(0, 20, 40, 0.9) 50%,
                    rgba(0, 0, 0, 0.95) 100%
                  )
                `,
                boxShadow: `
                  0 0 50px rgba(0, 255, 255, 0.3),
                  inset 0 0 100px rgba(0, 255, 255, 0.1)
                `,
              }}
            >
              {/* Header */}
              <div className="p-4 border-b border-cyan-400/30 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{
                      background: 'linear-gradient(45deg, #FC54AF, #38B6FF)',
                      boxShadow: '0 0 15px rgba(252, 84, 175, 0.6)'
                    }}
                  />
                  <h2 
                    className="text-lg font-bold"
                    style={{
                      color: '#00FFFF',
                      textShadow: '0 0 10px #00FFFF, 0 0 20px #00FFFF'
                    }}
                  >
                    LIVE CHAT
                  </h2>
                </div>
                
                <button
                  onClick={onClose}
                  className="text-white/70 hover:text-white transition-colors p-1"
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
                  <MessageList 
                    messages={messages}
                    onUserClick={handleUserClick}
                    loading={loading}
                  />
                  
                  {/* Message Input */}
                  <MessageInput 
                    onSendMessage={handleSendMessage}
                    disabled={!profile?.name || loading}
                    placeholder={profile?.name ? "Type a message..." : "Please set your name to chat"}
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

          {/* Profile Modal */}
          <ProfileModal
            user={selectedUser}
            isOpen={!!selectedUser}
            onClose={() => setSelectedUser(null)}
            isOwnProfile={selectedUser?.id === user?.id}
          />

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