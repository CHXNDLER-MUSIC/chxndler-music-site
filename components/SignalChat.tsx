"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseClient } from '@/lib/supabaseClient';
import ProfileModal from '@/components/chat/ProfileModal';
import { useProfile } from '@/contexts/ProfileContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface HeartSignalMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
  is_system?: boolean;
}

interface SignalChatProps {
  isVisible?: boolean;
  onToggle?: () => void;
  className?: string;
}

export default function SignalChat({ 
  isVisible = false, 
  onToggle,
  className = ""
}: SignalChatProps) {
  const { profile, user } = useProfile();
  const [messages, setMessages] = useState<HeartSignalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [userElementMap, setUserElementMap] = useState<Record<string, string>>({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; element?: string | null } | null>(null);

  const elementToColor = (element?: string | null) => {
    const el = (element || '').toString().toLowerCase();
    switch (el) {
      case 'water':
        return '#38B6FF';
      case 'heart':
        return '#F91880';
      case 'lightning':
        return '#F2EF1D';
      case 'darkness':
        return '#8B5CF6';
      default:
        // No forced default color; inherit site default
        return undefined as unknown as string;
    }
  };

  const getUserTextColor = (userId?: string) => {
    if (!userId) return undefined as unknown as string;
    // Only use profile color if we have both user and profile
    if (user?.id && profile && userId === user.id) {
      return elementToColor(profile.element);
    }
    return userElementMap[userId] || (undefined as unknown as string);
  };

  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

  const openProfileForMessage = (msg: HeartSignalMessage) => {
    if (!msg?.user_id || msg.user_id === SYSTEM_USER_ID) return;
    const nameFromMessage = (msg.message?.includes('connected to the signal')
      ? msg.message.split(' connected to the signal')[0].trim()
      : undefined) || msg.username || 'User';
    setSelectedUser({ id: msg.user_id, name: nameFromMessage });
    setShowProfileModal(true);
  };

  const fetchElementsForUsers = async (userIds: string[]) => {
    const ids = Array.from(new Set(userIds.filter(id => id && id !== '00000000-0000-0000-0000-000000000000')));
    if (ids.length === 0) return;
    try {
      const { data, error } = await supabaseClient
        .rpc('get_public_chat_profiles_by_ids', { p_ids: ids });
      if (error) return;
      const next: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        next[row.id] = elementToColor(row.element);
      });
      setUserElementMap(prev => ({ ...prev, ...next }));
    } catch {}
  };

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load all messages
  const loadAllMessages = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('heart_signal_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const msgs = data || [];
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error in loadAllMessages:', error);
    }
  };

  // Subscribe to global heart signal messages
  const subscribeToGlobalSignal = () => {
    if (channelRef.current) {
      supabaseClient.removeChannel(channelRef.current);
    }

    channelRef.current = supabaseClient
      .channel('heart-signal')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'heart_signal_messages',
        },
        (payload) => {
          console.log('NEW MESSAGE', payload.new);
          setMessages(prev => [...prev, payload.new as HeartSignalMessage]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Global Heart Signal subscription active');
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Global Heart Signal subscription error');
          setIsConnected(false);
        }
      });
  };

  // Send message to global chat via API
  const sendGlobalMessage = async () => {
    if (!newMessage.trim() || isSending || !user) return;

    setIsSending(true);
    try {
      const username = profile?.name || user?.email || 'Anonymous';

      const response = await fetch('/api/heart-signal-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage.trim(),
          username: username,
          is_system: false
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        console.error('Error sending global message:', result.error);
        return;
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error in sendGlobalMessage:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Send system connection message via API
  const sendConnectionMessage = async () => {
    if (!user || !profile?.name) return;

    try {
      const response = await fetch('/api/heart-signal-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${profile.name} connected to the signal`,
          is_system: true
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        console.error('Error sending connection message:', result.error);
      }
    } catch (error) {
      console.error('Error sending connection message:', error);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendGlobalMessage();
    }
  };

  // Initialize when visible
  useEffect(() => {
    if (isVisible) {
      loadAllMessages();
      subscribeToGlobalSignal();
      
      // Send connection message when user opens chat
      if (user && profile?.name) {
        sendConnectionMessage();
      }
    }

    return () => {
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
      }
    };
  }, [isVisible, user?.id]);

  // Auto scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={`relative ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full z-50 transition-all duration-300 ${
          isVisible 
            ? 'bg-red-600 hover:bg-red-700' 
            : 'bg-purple-600 hover:bg-purple-700'
        } ${isConnected ? 'ring-2 ring-green-500/50' : ''} shadow-lg`}
      >
        <span className="text-white text-xl">
          {isVisible ? '✕' : '💜'}
        </span>
        {isConnected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 50, y: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 50, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed right-4 sm:right-6 w-[90vw] max-w-[20rem] sm:w-80 h-[60vh] sm:h-96 bg-black/95 border border-purple-500/50 rounded-lg shadow-2xl z-40 flex flex-col"
            // Keep the panel above the toggle and respect safe-area on mobile
            style={{
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)'
            }}
          >
            {/* Header */}
            <div className="p-3 border-b border-purple-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold text-sm">Heart Signal Global</h3>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              <span className="text-xs text-gray-400">
                {messages.length} signals
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-purple-400 py-8 text-sm">
                  Listening for heart signals...
                </div>
              ) : (
                messages.map((msg) => {
                  // Fallback for missing username
                  const displayName = msg.username || 'ALIEN';
                  const isSystemMsg = msg.is_system || msg.user_id === SYSTEM_USER_ID;
                  const isOwnMessage = user?.id && msg.user_id === user.id;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-xs rounded p-2 ${
                        isSystemMsg
                          ? 'bg-purple-900/30 border-l-2 border-purple-500'
                          : isOwnMessage
                          ? 'bg-blue-900/30 ml-2'
                          : 'bg-gray-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          type="button"
                          onClick={() => openProfileForMessage(msg)}
                          className="font-medium text-left"
                          style={{ color: getUserTextColor(msg.user_id) }}
                          title="View profile"
                          disabled={!msg?.user_id}
                        >
                          {displayName}
                        </button>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {(isSystemMsg && (msg.message || '').includes('connected to the signal')) ? (
                        <button
                          type="button"
                          onClick={() => openProfileForMessage(msg)}
                          className="break-words text-left"
                          style={{ color: getUserTextColor(msg.user_id) }}
                          title="View profile"
                          disabled={!msg?.user_id}
                        >
                          {msg.message}
                        </button>
                      ) : (
                        <div className="break-words" style={{ color: getUserTextColor(msg.user_id) }}>{msg.message}</div>
                      )}
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              className="p-3 border-t border-purple-500/30"
              // Prevent iOS home indicator/toolbar from overlapping the input
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)' }}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Send to the Heartverse..."
                  disabled={!user || isSending || !isConnected}
                  className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-white text-xs placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={sendGlobalMessage}
                  disabled={!newMessage.trim() || !user || isSending || !isConnected}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
                >
                  {isSending ? '...' : '💜'}
                </button>
              </div>
              {!user && (
                <p className="text-xs text-yellow-400 mt-1">
                  Please log in to send signals
                </p>
              )}
              {!isConnected && user && (
                <p className="text-xs text-red-400 mt-1">
                  Connecting to the signal...
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    
    {/* Profile modal for clicked users */}
    <ProfileModal
      user={selectedUser || undefined as any}
      isOpen={showProfileModal}
      onClose={() => setShowProfileModal(false)}
      isOwnProfile={!!(user?.id && selectedUser?.id && user.id === selectedUser.id)}
    />
  );
}
