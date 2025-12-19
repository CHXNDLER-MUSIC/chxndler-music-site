"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseClient } from '@/lib/supabaseClient';
import ProfileModal from '@/components/chat/ProfileModal';
import { useProfile } from '@/contexts/ProfileContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Generate or retrieve anonymous ALIEN name
const getAnonymousName = (): string => {
  if (typeof window === 'undefined') return 'ALIEN00000000';

  // Check if we already have a stored name in session storage
  const stored = sessionStorage.getItem('heartSignalAlienName');
  if (stored) return stored;

  // Generate new ALIEN name with 8 digits
  const alienNumber = Math.floor(Math.random() * 99999999) + 1;
  const paddedNumber = String(alienNumber).padStart(8, '0');
  const alienName = `ALIEN${paddedNumber}`;

  // Store for this session
  sessionStorage.setItem('heartSignalAlienName', alienName);
  return alienName;
};

// Emoji types for reactions
type EmojiType = 'heart' | 'water' | 'lightning' | 'darkness' | 'alien';

// Emoji configuration with display info
const EMOJI_CONFIG: Record<EmojiType, { emoji: string; label: string; color: string }> = {
  heart: { emoji: '💖', label: 'Heart', color: '#FF69B4' },
  water: { emoji: '🌊', label: 'Water', color: '#00BFFF' },
  lightning: { emoji: '⚡', label: 'Lightning', color: '#FFD700' },
  darkness: { emoji: '🌑', label: 'Darkness', color: '#8B5CF6' },
  alien: { emoji: '👽', label: 'Alien', color: '#00FF7F' },
};

interface HeartSignalMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
  is_system?: boolean;
  // Reaction counts
  heart_count: number;
  water_count: number;
  lightning_count: number;
  darkness_count: number;
  alien_count: number;
}

// User's reactions for messages (message_id -> set of emoji types)
type UserReactionsMap = Map<string, Set<EmojiType>>;

export default function HeartSignalLive({ isOpen = true, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const { profile, user } = useProfile();
  const [messages, setMessages] = useState<HeartSignalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [heartSignalSent, setHeartSignalSent] = useState(false);
  const [heartSignalLoading, setHeartSignalLoading] = useState(false);
  const [userReactions, setUserReactions] = useState<UserReactionsMap>(new Map());
  const [togglingReactions, setTogglingReactions] = useState<Set<string>>(new Set()); // Track in-flight toggles
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
        return profile?.element ? elementToColor(profile.element) : '#FFFFFF';
    }
  };

  const getUserTextColor = (userId?: string) => {
    if (!userId) return '#FFD700';
    return userElementMap[userId] || '#FFD700';
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

  // Seed current user's element color to avoid flicker for own messages
  useEffect(() => {
    if (user?.id && profile?.element) {
      setUserElementMap(prev => ({ ...prev, [user.id]: elementToColor(profile.element) }));
    }
  }, [user?.id, profile?.element]);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load user's reactions for a set of message IDs
  const loadUserReactions = useCallback(async (messageIds: string[]) => {
    if (!user?.id || messageIds.length === 0) return;

    try {
      const { data, error } = await supabaseClient
        .from('heart_signal_message_reactions')
        .select('message_id, emoji')
        .eq('user_id', user.id)
        .in('message_id', messageIds);

      if (error) {
        console.error('Error loading user reactions:', error);
        return;
      }

      // Build reactions map
      const reactionsMap = new Map<string, Set<EmojiType>>();
      (data || []).forEach((reaction: { message_id: string; emoji: string }) => {
        const msgReactions = reactionsMap.get(reaction.message_id) || new Set<EmojiType>();
        msgReactions.add(reaction.emoji as EmojiType);
        reactionsMap.set(reaction.message_id, msgReactions);
      });

      setUserReactions(reactionsMap);
    } catch (error) {
      console.error('Error in loadUserReactions:', error);
    }
  }, [user?.id]);

  // Toggle a reaction for a message using RPC
  const toggleReaction = useCallback(async (messageId: string, emoji: EmojiType) => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    // Prevent double-clicking
    const toggleKey = `${messageId}-${emoji}`;
    if (togglingReactions.has(toggleKey)) return;

    setTogglingReactions(prev => new Set(prev).add(toggleKey));

    // Play reaction sound
    try {
      const audioMap: Record<EmojiType, string> = {
        heart: '/audio/heart-pulse.MP3',
        water: '/audio/water-ripple.MP3',
        lightning: '/audio/lightning-spark.MP3',
        darkness: '/audio/shadow-glow.MP3',
        alien: '/audio/alien-wave.MP3',
      };
      const src = audioMap[emoji];
      if (src) {
        const audio = new Audio(src);
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }
    } catch {}

    // Optimistic update
    const wasReacted = userReactions.get(messageId)?.has(emoji) || false;
    const countField = `${emoji}_count` as keyof HeartSignalMessage;

    // Update user reactions optimistically
    setUserReactions(prev => {
      const newMap = new Map(prev);
      const msgReactions = new Set(newMap.get(messageId) || []);
      if (wasReacted) {
        msgReactions.delete(emoji);
      } else {
        msgReactions.add(emoji);
      }
      newMap.set(messageId, msgReactions);
      return newMap;
    });

    // Update message count optimistically
    setMessages(prev =>
      prev.map(msg => {
        if (msg.id !== messageId) return msg;
        const currentCount = (msg[countField] as number) || 0;
        return {
          ...msg,
          [countField]: wasReacted ? Math.max(0, currentCount - 1) : currentCount + 1,
        };
      })
    );

    try {
      const { data: isNowReacted, error } = await supabaseClient.rpc('toggle_heart_signal_reaction', {
        p_message_id: messageId,
        p_emoji: emoji,
      });

      if (error) {
        console.error('Error toggling reaction:', error);
        // Revert optimistic update on error
        setUserReactions(prev => {
          const newMap = new Map(prev);
          const msgReactions = new Set(newMap.get(messageId) || []);
          if (wasReacted) {
            msgReactions.add(emoji);
          } else {
            msgReactions.delete(emoji);
          }
          newMap.set(messageId, msgReactions);
          return newMap;
        });
        setMessages(prev =>
          prev.map(msg => {
            if (msg.id !== messageId) return msg;
            const currentCount = (msg[countField] as number) || 0;
            return {
              ...msg,
              [countField]: wasReacted ? currentCount + 1 : Math.max(0, currentCount - 1),
            };
          })
        );
        return;
      }

      console.log(`Reaction ${emoji} on message ${messageId}: ${isNowReacted ? 'ON' : 'OFF'}`);
    } catch (error) {
      console.error('Error in toggleReaction:', error);
    } finally {
      setTogglingReactions(prev => {
        const newSet = new Set(prev);
        newSet.delete(toggleKey);
        return newSet;
      });
    }
  }, [user?.id, userReactions, togglingReactions]);

  // Load the latest 50 messages on component mount
  const loadMessages = async () => {
    try {
      // Fetch latest 50 messages ordered by created_at desc, then reverse for display
      const { data, error } = await supabaseClient
        .from('heart_signal_messages')
        .select('id, user_id, username, message, created_at, is_system, heart_count, water_count, lightning_count, darkness_count, alien_count')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      // Reverse to show oldest first (for chat display)
      const messagesData = (data || []).reverse().map(msg => ({
        ...msg,
        heart_count: msg.heart_count || 0,
        water_count: msg.water_count || 0,
        lightning_count: msg.lightning_count || 0,
        darkness_count: msg.darkness_count || 0,
        alien_count: msg.alien_count || 0,
      }));

      // Load element colors for authors first to avoid color flicker
      const authorIds = messagesData.map(m => m.user_id).filter(Boolean) as string[];
      await fetchElementsForUsers(authorIds);

      setMessages(messagesData);

      // Load user's reactions for these messages
      if (messagesData.length > 0) {
        const messageIds = messagesData.map(m => m.id);
        await loadUserReactions(messageIds);
      }
    } catch (error) {
      console.error('Error in loadMessages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to real-time changes on heart_signal_messages table
  const subscribeToMessages = () => {
    // Clean up existing subscription
    if (channelRef.current) {
      supabaseClient.removeChannel(channelRef.current);
    }

    // Create new global subscription
    channelRef.current = supabaseClient
      .channel('heart-signal-chat')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'heart_signal_messages' },
        (payload) => {
          console.log('Real-time message received:', payload);

        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as any;
          const newMessage: HeartSignalMessage = {
            ...newMsg,
              heart_count: newMsg.heart_count || 0,
              water_count: newMsg.water_count || 0,
              lightning_count: newMsg.lightning_count || 0,
              darkness_count: newMsg.darkness_count || 0,
              alien_count: newMsg.alien_count || 0,
            };
          setMessages((prev) => [...prev, newMessage]);
          // fetch element color for new author if unknown
          if (newMsg?.user_id && !userElementMap[newMsg.user_id]) {
            fetchElementsForUsers([newMsg.user_id]);
          }
            setTimeout(scrollToBottom, 100); // Delay to ensure DOM update
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as any;
            const updatedMessage: HeartSignalMessage = {
              ...updatedMsg,
              heart_count: updatedMsg.heart_count || 0,
              water_count: updatedMsg.water_count || 0,
              lightning_count: updatedMsg.lightning_count || 0,
              darkness_count: updatedMsg.darkness_count || 0,
              alien_count: updatedMsg.alien_count || 0,
            };
            setMessages((prev) =>
              prev.map((msg) => msg.id === updatedMessage.id ? updatedMessage : msg)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedMessage = payload.old as HeartSignalMessage;
            setMessages((prev) => prev.filter((msg) => msg.id !== deletedMessage.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Heart Signal Live subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Heart Signal Live subscription error');
        }
      });
  };

  // Send a new message via API to bypass RLS
  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      if (!user) {
        console.error('User not authenticated');
        return;
      }

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

      const result = await response.json();

      if (!response.ok) {
        console.error('Error sending message:', result.error);
        return;
      }

      setNewMessage('');
      console.log('Message sent successfully:', result.data);
    } catch (error) {
      console.error('Error in sendMessage:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Send system message via API
  const sendSystemMessage = async (message: string) => {
    try {
      const response = await fetch('/api/heart-signal-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          is_system: true
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        console.error('Error sending system message:', result.error);
      }
    } catch (error) {
      console.error('Error in sendSystemMessage:', error);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Send a heart signal 
  const sendHeartSignal = async () => {
    if (heartSignalLoading) return;
    
    setHeartSignalLoading(true);
    try {
      const response = await fetch('/api/heart-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Heart signal from HeartSignalLive',
        }),
      });

      if (response.ok) {
        setHeartSignalSent(true);
        // Also send a system message to the chat
        await sendSystemMessage(`💖 Heart signal sent to the Heartverse!`);
      } else {
        console.error('Failed to send heart signal');
      }
    } catch (error) {
      console.error('Heart signal error:', error);
    } finally {
      setHeartSignalLoading(false);
    }
  };

  // Initialize component
  useEffect(() => {
    loadMessages();
    subscribeToMessages();

    // Send connection message when user joins
    if (user && profile?.name) {
      // Authenticated user - send system message to database
      sendSystemMessage(`${profile.name} connected to the signal`);
    } else {
      // Anonymous user - add local connection message
      const anonymousName = getAnonymousName();
      const localConnectionMessage: HeartSignalMessage = {
        id: `local-connection-${Date.now()}`,
        user_id: '00000000-0000-0000-0000-000000000000',
        username: 'SYSTEM',
        message: `${anonymousName} connected to the signal`,
        created_at: new Date().toISOString(),
        is_system: true,
        heart_count: 0,
        water_count: 0,
        lightning_count: 0,
        darkness_count: 0,
        alien_count: 0,
      };
      setMessages((prev) => [...prev, localConnectionMessage]);
    }

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
      }
    };
  }, [user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, x: -300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -300 }}
        transition={{ duration: 0.3 }}
        className="fixed left-0 top-0 h-full w-80 bg-black/90 border-r border-purple-500/30 z-50 flex flex-col"
      >
      {/* Header */}
      <div className="p-4 border-b border-purple-500/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center flex-1">
            <h2 
              className="text-xl font-bold whitespace-nowrap"
              style={{
                color: '#FC54AF !important',
                textShadow: '0 0 10px #FC54AF, 0 0 20px #FC54AF, 0 0 30px #FC54AF',
                letterSpacing: '0.05em',
                fontWeight: 'bold'
              }}
            >
              HEART SIGNAL
            </h2>
            
            {/* Extended glow line */}
            <div 
              className="flex-1 h-px ml-4"
              style={{
                background: 'linear-gradient(90deg, rgba(252, 84, 175, 0.6), rgba(252, 84, 175, 0.2), transparent)',
                boxShadow: '0 0 8px rgba(252, 84, 175, 0.4)'
              }}
            />
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-purple-400 hover:text-white transition-colors ml-4"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isLoading ? (
          <div className="text-center text-purple-400 py-8">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-purple-400 py-8">
            No messages yet. Be the first to send a heart signal!
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg p-3 ${
                  msg.is_system || msg.user_id === '00000000-0000-0000-0000-000000000000'
                    ? 'bg-purple-900/30 border-l-4 border-purple-500'
                    : msg.user_id === user?.id
                    ? 'bg-blue-900/30 ml-4'
                    : 'bg-gray-800/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => openProfileForMessage(msg)}
                    className="text-left"
                    style={{
                      color: msg.is_system ? '#C084FC' : getUserTextColor(msg.user_id),
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}
                    onMouseEnter={() => {
                      try {
                        const audio = new Audio('/audio/hover.mp3');
                        audio.volume = 0.3;
                        audio.play().catch(() => {});
                      } catch {}
                    }}
                    title="View profile"
                    disabled={!msg?.user_id || msg.user_id === SYSTEM_USER_ID}
                  >
                    {msg.username}
                  </button>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {msg.is_system && (msg.message || '').includes('connected to the signal') ? (
                  <button
                    type="button"
                    onClick={() => openProfileForMessage(msg)}
                    className="text-sm break-words"
                    style={{ color: '#C084FC', textAlign: 'left' }}
                    onMouseEnter={() => {
                      try {
                        const audio = new Audio('/audio/hover.mp3');
                        audio.volume = 0.3;
                        audio.play().catch(() => {});
                      } catch {}
                    }}
                    title="View profile"
                    disabled={!msg?.user_id || msg.user_id === SYSTEM_USER_ID}
                  >
                    {msg.message}
                  </button>
                ) : (
                  <div 
                    className="text-sm break-words"
                    style={{ color: msg.is_system ? '#C084FC' : getUserTextColor(msg.user_id) }}
                    onMouseEnter={() => {
                      try {
                        const audio = new Audio('/audio/hover.mp3');
                        audio.volume = 0.3;
                        audio.play().catch(() => {});
                      } catch {}
                    }}
                  >
                    {msg.message}
                  </div>
                )}

                {/* Reaction buttons - only show for non-system messages */}
                {!(msg.is_system || msg.user_id === '00000000-0000-0000-0000-000000000000') && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {(Object.keys(EMOJI_CONFIG) as EmojiType[]).map((emojiType) => {
                      const config = EMOJI_CONFIG[emojiType];
                      const countField = `${emojiType}_count` as keyof HeartSignalMessage;
                      const count = (msg[countField] as number) || 0;
                      const isReacted = userReactions.get(msg.id)?.has(emojiType) || false;
                      const isToggling = togglingReactions.has(`${msg.id}-${emojiType}`);

                      return (
                        <button
                          key={emojiType}
                          onClick={() => toggleReaction(msg.id, emojiType)}
                          disabled={!user || isToggling}
                          className={`
                            flex items-center gap-1 px-2 py-1 rounded-full text-xs
                            transition-all duration-200 ease-out
                            ${isReacted
                              ? 'bg-opacity-30 scale-105'
                              : 'bg-gray-700/50 hover:bg-gray-600/50'
                            }
                            ${!user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                            ${isToggling ? 'opacity-70' : ''}
                          `}
                          style={{
                            backgroundColor: isReacted ? `${config.color}30` : undefined,
                            borderWidth: '1px',
                            borderColor: isReacted ? config.color : 'transparent',
                            boxShadow: isReacted ? `0 0 8px ${config.color}40` : undefined,
                          }}
                          title={`${config.label}${!user ? ' (login required)' : ''}`}
                        >
                          <span className="text-sm">{config.emoji}</span>
                          {count > 0 && (
                            <span
                              className="text-xs font-medium"
                              style={{ color: isReacted ? config.color : '#9CA3AF' }}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Heart Signal Section */}
      <div className="px-4 pt-1 pb-0 border-t border-purple-500/30 space-y-1" style={{ marginBottom: '-12px' }}>
        {/* Stay Connected Text */}
        <div className="text-center">
          <div 
            style={{ 
              color: '#00FFFF',
              fontSize: '16px',
              fontWeight: '600',
              textShadow: '0 0 8px rgba(0, 255, 255, 0.6)'
            }}
          >
            Stay connected to the Heartverse.
          </div>
        </div>

        {/* Send Heart Signal Button */}
        <div className="flex justify-center" style={{ marginBottom: '-16px' }}>
          <button
            onClick={sendHeartSignal}
            disabled={heartSignalLoading || heartSignalSent}
            style={{
              width: '80%',
              padding: '12px 24px',
              background: 'transparent',
              border: heartSignalSent
                ? '2px solid #00FF00'
                : heartSignalLoading 
                  ? '2px solid rgba(128, 128, 128, 0.3)' 
                  : '2px solid #00FFFF',
              borderRadius: '8px',
              color: heartSignalSent
                ? '#00FF00'
                : heartSignalLoading 
                  ? 'rgba(128, 128, 128, 0.6)' 
                  : '#00FFFF',
              fontSize: '16px',
              fontWeight: '600',
              cursor: heartSignalLoading || heartSignalSent ? 'not-allowed' : 'pointer',
              textShadow: heartSignalSent
                ? '0 0 8px rgba(0, 255, 0, 0.6)'
                : !heartSignalLoading 
                  ? '0 0 8px rgba(0, 255, 255, 0.6)' 
                  : 'none',
              transition: 'all 0.3s ease',
              opacity: heartSignalLoading || heartSignalSent ? 0.7 : 1
            }}
          >
            {heartSignalLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid currentColor',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Sending...
              </div>
            ) : heartSignalSent ? (
              "Heart signal sent"
            ) : (
              "Send Heart Signal"
            )}
          </button>
        </div>
      </div>
      
      {/* Profile modal for clicked users */}
      <ProfileModal
        user={selectedUser || undefined as any}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        isOwnProfile={!!(user?.id && selectedUser?.id && user.id === selectedUser.id)}
      />

      {/* Message Input */}
      <div className="p-4 border-t border-purple-500/30 mt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Send a heart signal..."
            disabled={!user || isSending}
            className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || !user || isSending}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isSending ? '...' : '💜'}
          </button>
        </div>
        {!user && (
          <p className="text-sm text-yellow-400 mt-2">
            Please log in to send messages
          </p>
        )}
      </div>

      {/* $ Button - positioned in bottom right corner */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          width: '55px',
          height: '55px',
          zIndex: 1000,
          pointerEvents: 'auto'
        }}
      >
        <button
          onClick={() => {
            // Add tip functionality here
            console.log('Tip button clicked in HeartSignalLive');
          }}
          style={{
            width: '100%',
            height: '100%',
            background: 'rgba(252, 84, 175, 0.1)',
            border: '2px solid #FC54AF',
            borderRadius: '50%',
            color: '#FC54AF',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 300ms ease',
            outline: 'none',
            textShadow: '0 0 8px #FC54AF',
            boxShadow: '0 0 15px rgba(252, 84, 175, 0.3)',
            position: 'relative',
            zIndex: 1001
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.1)';
            e.target.style.background = 'rgba(252, 84, 175, 0.2)';
            e.target.style.boxShadow = '0 0 25px rgba(252, 84, 175, 0.6)';
            e.target.style.textShadow = '0 0 15px #FC54AF, 0 0 25px #FC54AF';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.background = 'rgba(252, 84, 175, 0.1)';
            e.target.style.boxShadow = '0 0 15px rgba(252, 84, 175, 0.3)';
            e.target.style.textShadow = '0 0 8px #FC54AF';
          }}
        >
          $
        </button>
      </div>
      </motion.div>
    </>
  );
}
