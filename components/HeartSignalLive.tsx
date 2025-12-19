"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseClient } from '@/lib/supabaseClient';
import { createAnonClient } from '@/lib/supabase-anon';
import ProfileModal from '@/components/chat/ProfileModal';
import { useProfile } from '@/contexts/ProfileContext';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

// Generate or retrieve anonymous ALIEN name
const getAnonymousName = (): string => {
  if (typeof window === 'undefined') return 'ALIEN00000000';

  const stored = sessionStorage.getItem('heartSignalAlienName');
  if (stored) return stored;

  const alienNumber = Math.floor(Math.random() * 99999999) + 1;
  const paddedNumber = String(alienNumber).padStart(8, '0');
  const alienName = `ALIEN${paddedNumber}`;

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
  heart_count: number;
  water_count: number;
  lightning_count: number;
  darkness_count: number;
  alien_count: number;
}

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
  const [togglingReactions, setTogglingReactions] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; element?: string | null } | null>(null);
  const [activeClient, setActiveClient] = useState<SupabaseClient | null>(null);
  const [aliensOnline, setAliensOnline] = useState<string[]>([]);
  const [aliensLoading, setAliensLoading] = useState(false);

  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

  const openProfileForMessage = (msg: HeartSignalMessage) => {
    if (!msg?.user_id || msg.user_id === SYSTEM_USER_ID) return;
    const nameFromMessage = (msg.message?.includes('connected to the signal')
      ? msg.message.split(' connected to the signal')[0].trim()
      : undefined) || msg.username || 'User';
    setSelectedUser({ id: msg.user_id, name: nameFromMessage });
    setShowProfileModal(true);
  };

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Get display name for sender with fallback
  const getDisplayName = (msg: HeartSignalMessage): string => {
    if (msg.username) return msg.username;
    if (msg.user_id) return 'ALIEN';
    return 'ALIEN';
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

    const wasReacted = userReactions.get(messageId)?.has(emoji) || false;
    const countField = `${emoji}_count` as keyof HeartSignalMessage;

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

  // Load messages - works for anon and authed
  const loadMessages = async (client: SupabaseClient) => {
    try {
      console.log('📨 Loading Heart Signal messages...');
      const { data, error } = await client
        .from('heart_signal_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const messagesData = (data || []).map(msg => ({
        ...msg,
        heart_count: msg.heart_count || 0,
        water_count: msg.water_count || 0,
        lightning_count: msg.lightning_count || 0,
        darkness_count: msg.darkness_count || 0,
        alien_count: msg.alien_count || 0,
      }));

      console.log(`✅ Loaded ${messagesData.length} messages`);
      setMessages(messagesData);

      // Load user's reactions for these messages
      if (messagesData.length > 0 && user?.id) {
        const messageIds = messagesData.map(m => m.id);
        await loadUserReactions(messageIds);
      }

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error in loadMessages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to real-time messages - works for anon and authed
  const subscribeToMessages = (client: SupabaseClient) => {
    if (channelRef.current) {
      client.removeChannel(channelRef.current);
    }

    console.log('🔌 Subscribing to Heart Signal realtime...');

    channelRef.current = client
      .channel('heart_signal_messages_public')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'heart_signal_messages',
        },
        (payload) => {
          console.log('NEW MESSAGE', payload.new);
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
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe((status) => {
        console.log('🔔 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Heart Signal Live subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Heart Signal Live subscription error');
        }
      });
  };

  // Load aliens online from recent message senders (last 10 minutes)
  const loadAliensOnline = async (client: SupabaseClient) => {
    setAliensLoading(true);
    try {
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

      const { data, error } = await client
        .from('heart_signal_messages')
        .select('username, user_id')
        .gte('created_at', tenMinutesAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading aliens online:', error);
        setAliensOnline(['ALIEN']); // Fallback
        return;
      }

      // Get unique senders
      const uniqueSenders = new Map<string, string>();
      (data || []).forEach((msg: any) => {
        const displayName = msg.username || 'ALIEN';
        if (!uniqueSenders.has(msg.user_id)) {
          uniqueSenders.set(msg.user_id, displayName);
        }
      });

      const aliens = Array.from(uniqueSenders.values()).slice(0, 20);
      setAliensOnline(aliens.length > 0 ? aliens : ['ALIEN']);
    } catch (error) {
      console.error('Error in loadAliensOnline:', error);
      setAliensOnline(['ALIEN']); // Fallback
    } finally {
      setAliensLoading(false);
    }
  };

  // Send message via API
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
    let client: SupabaseClient;
    let mounted = true;

    const init = async () => {
      // Determine which client to use based on auth state
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (session?.user) {
        console.log('🔐 Using authenticated client');
        client = supabaseClient;
      } else {
        console.log('👽 Using anonymous client');
        client = createAnonClient();
      }

      if (!mounted) return;

      setActiveClient(client);

      // Load messages
      await loadMessages(client);

      // Subscribe to realtime
      subscribeToMessages(client);

      // Load aliens online with 1s timeout
      const aliensTimeout = setTimeout(() => {
        if (aliensLoading) {
          console.warn('⚠️ Aliens online loading timeout');
          setAliensLoading(false);
          setAliensOnline(['ALIEN']);
        }
      }, 1000);

      loadAliensOnline(client).finally(() => clearTimeout(aliensTimeout));

      // Send connection message
      if (user && profile?.name) {
        sendSystemMessage(`${profile.name} connected to the signal`);
      } else {
        const anonymousName = getAnonymousName();
        const localConnectionMessage: HeartSignalMessage = {
          id: `local-connection-${Date.now()}`,
          user_id: SYSTEM_USER_ID,
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
    };

    init();

    return () => {
      mounted = false;
      if (channelRef.current && client) {
        client.removeChannel(channelRef.current);
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

        {/* Aliens Online */}
        <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded">
          <div className="text-xs font-bold text-green-400 mb-1">ALIENS ONLINE</div>
          <div className="text-xs text-green-300/80 max-h-16 overflow-y-auto">
            {aliensLoading ? (
              <div>Loading...</div>
            ) : aliensOnline.length > 0 ? (
              aliensOnline.join(', ')
            ) : (
              'ALIEN'
            )}
          </div>
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
            {messages.map((msg) => {
              const displayName = getDisplayName(msg);
              const isSystemMsg = msg.is_system || msg.user_id === SYSTEM_USER_ID;
              const isOwnMessage = user?.id && msg.user_id === user.id;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-lg p-3 ${
                    isSystemMsg
                      ? 'bg-purple-900/30 border-l-4 border-purple-500'
                      : isOwnMessage
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
                        color: isSystemMsg ? '#C084FC' : '#FFD700',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}
                      title="View profile"
                      disabled={!msg?.user_id || isSystemMsg}
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
                  {isSystemMsg && (msg.message || '').includes('connected to the signal') ? (
                    <button
                      type="button"
                      onClick={() => openProfileForMessage(msg)}
                      className="text-sm break-words"
                      style={{ color: '#C084FC', textAlign: 'left' }}
                      title="View profile"
                      disabled={!msg?.user_id || isSystemMsg}
                    >
                      {msg.message}
                    </button>
                  ) : (
                    <div
                      className="text-sm break-words"
                      style={{ color: isSystemMsg ? '#C084FC' : '#FFD700' }}
                    >
                      {msg.message}
                    </div>
                  )}

                  {/* Reaction buttons */}
                  {!isSystemMsg && (
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
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Heart Signal Section */}
      <div className="px-4 pt-1 pb-0 border-t border-purple-500/30 space-y-1" style={{ marginBottom: '-12px' }}>
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
          onMouseEnter={(e: any) => {
            e.target.style.transform = 'scale(1.1)';
            e.target.style.background = 'rgba(252, 84, 175, 0.2)';
            e.target.style.boxShadow = '0 0 25px rgba(252, 84, 175, 0.6)';
            e.target.style.textShadow = '0 0 15px #FC54AF, 0 0 25px #FC54AF';
          }}
          onMouseLeave={(e: any) => {
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
