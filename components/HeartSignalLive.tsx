"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseClient } from '@/lib/supabaseClient';
import { createAnonClient } from '@/lib/supabase-anon';
import ProfileModal from '@/components/chat/ProfileModal';
import { useProfile } from '@/contexts/ProfileContext';
import { sfx } from '@/lib/sfx';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

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

type EmojiType = 'heart' | 'water' | 'lightning' | 'darkness' | 'alien';

const EMOJI_CONFIG: Record<EmojiType, { emoji: string; label: string; color: string }> = {
  heart: { emoji: '💖', label: 'Heart', color: '#FF69B4' },
  water: { emoji: '🌊', label: 'Water', color: '#00BFFF' },
  lightning: { emoji: '⚡', label: 'Lightning', color: '#FFD700' },
  darkness: { emoji: '🌑', label: 'Darkness', color: '#8B5CF6' },
  alien: { emoji: '👽', label: 'Alien', color: '#00FF7F' },
};

const PAGE_SIZE = 50;

const MESSAGE_COLS =
  'id, user_id, username, message, created_at, is_system, heart_count, water_count, lightning_count, darkness_count, alien_count';

interface HeartSignalMessage {
  id: string;
  created_at: string;
  user_id: string;
  username: string;
  message: string;
  is_system?: boolean;
  heart_count: number;
  water_count: number;
  lightning_count: number;
  darkness_count: number;
  alien_count: number;
  // Client-only fields for optimistic UI
  client_id?: string;
  status?: 'pending' | 'failed';
}

type UserReactionsMap = Map<string, Set<EmojiType>>;

export default function HeartSignalLive({ isOpen = true, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const { profile, user } = useProfile();
  const [messages, setMessages] = useState<HeartSignalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
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
    const nameFromMessage = msg.username || 'ALIEN';
    setSelectedUser({ id: msg.user_id, name: nameFromMessage });
    setShowProfileModal(true);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getDisplayName = (msg: HeartSignalMessage): string => {
    return msg.username || 'ALIEN';
  };

  const normalizeRow = (row: any): HeartSignalMessage => ({
    id: row.id,
    created_at: row.created_at,
    user_id: row.user_id,
    username: row.username ?? 'ALIEN',
    message: row.message,
    is_system: row.is_system,
    heart_count: row.heart_count || 0,
    water_count: row.water_count || 0,
    lightning_count: row.lightning_count || 0,
    darkness_count: row.darkness_count || 0,
    alien_count: row.alien_count || 0,
  });

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

  const toggleReaction = useCallback(async (messageId: string, emoji: EmojiType) => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    const toggleKey = `${messageId}-${emoji}`;
    if (togglingReactions.has(toggleKey)) return;

    setTogglingReactions(prev => new Set(prev).add(toggleKey));

    try {
      const sfxMap: Record<EmojiType, string> = {
        heart: 'heart-pulse',
        water: 'water-ripple',
        lightning: 'lightning-spark',
        darkness: 'shadow-glow',
        alien: 'alien-wave',
      };
      sfx.setEnabled(true);
      sfx.play(sfxMap[emoji], 0.5);
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

      if (process.env.NODE_ENV !== "production") console.log(`Reaction ${emoji} on message ${messageId}: ${isNowReacted ? 'ON' : 'OFF'}`);
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

  // Load messages with optional cursor for pagination
  const loadMessages = async (client: SupabaseClient, cursor?: string) => {
    try {
      setFetchError(null);

      let query = client
        .from('heart_signal_messages')
        .select(MESSAGE_COLS)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading messages:', error);
        if (!cursor) setFetchError('Signal unstable.');
        return;
      }

      const rows = (data || []).map(normalizeRow).reverse();

      if (rows.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (cursor) {
        // Prepend older messages
        setMessages(prev => [...rows, ...prev]);
      } else {
        setMessages(rows);
      }

      if (rows.length > 0 && user?.id) {
        const messageIds = rows.map(m => m.id);
        await loadUserReactions(messageIds);
      }

      if (!cursor) {
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error in loadMessages:', error);
      if (!cursor) setFetchError('Signal unstable.');
    } finally {
      setIsLoading(false);
      setLoadingOlder(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!activeClient || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    const oldest = messages.find(m => !m.client_id);
    const cursor = oldest?.created_at;
    await loadMessages(activeClient, cursor);
  };

  const retryInitialLoad = async () => {
    if (!activeClient) return;
    setIsLoading(true);
    setFetchError(null);
    await loadMessages(activeClient);
  };

  // Subscribe to INSERT events — deduplicate by id and reconcile optimistic messages
  const subscribeToMessages = (client: SupabaseClient) => {
    if (channelRef.current) {
      client.removeChannel(channelRef.current);
    }

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
          const incoming = normalizeRow(payload.new);
          setMessages(prev => {
            // Already have this row by id — skip
            if (prev.some(m => m.id === incoming.id)) return prev;

            // Check if we have a pending optimistic message that matches
            const optIdx = prev.findIndex(
              m => m.status === 'pending' && m.user_id === incoming.user_id && m.message === incoming.message
            );

            if (optIdx >= 0) {
              const next = [...prev];
              next[optIdx] = { ...incoming, client_id: prev[optIdx].client_id };
              return next;
            }

            return [...prev, incoming];
          });
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (process.env.NODE_ENV !== "production") console.log('Heart Signal Live subscription active');
        }
      });
  };

  // Aliens Online from recent messages
  const loadAliensOnline = async (client: SupabaseClient) => {
    setAliensLoading(true);

    const timeout = setTimeout(() => {
      setAliensLoading(false);
    }, 1000);

    try {
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

      const { data, error } = await client
        .from('heart_signal_messages')
        .select('user_id, username')
        .gte('created_at', tenMinutesAgo.toISOString())
        .order('created_at', { ascending: false });

      clearTimeout(timeout);

      if (error) {
        console.error('Error loading aliens online:', error);
        setAliensLoading(false);
        return;
      }

      const uniqueSenders = new Map<string, string>();
      (data || []).forEach((msg: any) => {
        const senderId = msg.user_id;
        if (!senderId || uniqueSenders.has(senderId)) return;
        uniqueSenders.set(senderId, msg.username ?? 'ALIEN');
      });

      const aliens = Array.from(uniqueSenders.values()).slice(0, 20);

      setAliensOnline(prev => {
        const merged = new Set([...prev, ...aliens]);
        return Array.from(merged).slice(0, 20);
      });
    } catch (error) {
      clearTimeout(timeout);
      console.error('Error in loadAliensOnline:', error);
    } finally {
      setAliensLoading(false);
    }
  };

  // Optimistic send via POST API
  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    if (!user) return;

    const clientId = crypto.randomUUID();
    const optimistic: HeartSignalMessage = {
      id: '',
      client_id: clientId,
      status: 'pending',
      created_at: new Date().toISOString(),
      user_id: user.id,
      username: profile?.name || 'CHXNDLER',
      message: newMessage.trim(),
      is_system: false,
      heart_count: 0,
      water_count: 0,
      lightning_count: 0,
      darkness_count: 0,
      alien_count: 0,
    };

    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');
    setIsSending(true);

    try {
      const response = await fetch('/api/heart-signal-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: optimistic.message }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        console.error('Error sending message:', result.error);
        setMessages(prev =>
          prev.map(m => m.client_id === clientId ? { ...m, status: 'failed' as const } : m)
        );
        return;
      }

      // Replace optimistic with server row
      const serverRow = normalizeRow(result.message);
      setMessages(prev => {
        // If realtime already delivered this row, remove the optimistic one
        if (prev.some(m => m.id === serverRow.id && !m.client_id)) {
          return prev.filter(m => m.client_id !== clientId);
        }
        return prev.map(m =>
          m.client_id === clientId ? { ...serverRow, client_id: clientId } : m
        );
      });
    } catch (error) {
      console.error('Error in sendMessage:', error);
      setMessages(prev =>
        prev.map(m => m.client_id === clientId ? { ...m, status: 'failed' as const } : m)
      );
    } finally {
      setIsSending(false);
    }
  };

  const retryMessage = async (clientId: string) => {
    const msg = messages.find(m => m.client_id === clientId);
    if (!msg || !user) return;

    setMessages(prev =>
      prev.map(m => m.client_id === clientId ? { ...m, status: 'pending' as const } : m)
    );

    try {
      const response = await fetch('/api/heart-signal-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg.message }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setMessages(prev =>
          prev.map(m => m.client_id === clientId ? { ...m, status: 'failed' as const } : m)
        );
        return;
      }

      const serverRow = normalizeRow(result.message);
      setMessages(prev => {
        if (prev.some(m => m.id === serverRow.id && !m.client_id)) {
          return prev.filter(m => m.client_id !== clientId);
        }
        return prev.map(m =>
          m.client_id === clientId ? { ...serverRow, client_id: clientId } : m
        );
      });
    } catch {
      setMessages(prev =>
        prev.map(m => m.client_id === clientId ? { ...m, status: 'failed' as const } : m)
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
      } else {
        console.error('Failed to send heart signal');
      }
    } catch (error) {
      console.error('Heart signal error:', error);
    } finally {
      setHeartSignalLoading(false);
    }
  };

  // Initialize — use anon client when logged out
  useEffect(() => {
    let client: SupabaseClient;
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (session?.user) {
        client = supabaseClient;
      } else {
        client = createAnonClient();
      }

      if (!mounted) return;

      setActiveClient(client);

      const currentUserName = user && profile?.name
        ? profile.name
        : getAnonymousName();

      setAliensOnline([currentUserName]);

      await loadMessages(client);
      subscribeToMessages(client);

      loadAliensOnline(client).then(() => {
        setAliensOnline(prev => {
          if (prev.includes(currentUserName)) return prev;
          return [currentUserName, ...prev];
        });
      });

      // Local-only connection message (not persisted to DB)
      if (!user) {
        const anonymousName = getAnonymousName();
        const localMsg: HeartSignalMessage = {
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
          user_id: SYSTEM_USER_ID,
          username: 'SYSTEM',
          message: `${anonymousName} connected to the signal`,
          is_system: true,
          heart_count: 0,
          water_count: 0,
          lightning_count: 0,
          darkness_count: 0,
          alien_count: 0,
        };
        setMessages(prev => [...prev, localMsg]);
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

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Error banner */}
        {fetchError && (
          <div className="text-center py-2 px-3 bg-red-900/40 border border-red-500/40 rounded-lg flex items-center justify-between">
            <span className="text-sm text-red-300">{fetchError}</span>
            <button
              onClick={retryInitialLoad}
              className="ml-2 text-xs text-red-200 underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Load older */}
        {hasMore && !isLoading && !fetchError && messages.length > 0 && (
          <div className="text-center">
            <button
              onClick={loadOlderMessages}
              disabled={loadingOlder}
              className="text-xs text-purple-400 hover:text-purple-200 transition-colors disabled:opacity-50"
            >
              {loadingOlder ? 'Loading...' : 'Load older'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-purple-400 py-8">
            Loading messages...
          </div>
        ) : messages.length === 0 && !fetchError ? (
          <div className="text-center text-purple-400 py-8">
            No messages yet. Be the first to send a heart signal!
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg) => {
              const displayName = getDisplayName(msg);
              const isSystemMsg = msg.is_system || msg.user_id === SYSTEM_USER_ID;
              const isOwnMessage = user?.id && msg.user_id === user.id;
              const isPending = msg.status === 'pending';
              const isFailed = msg.status === 'failed';

              return (
                <motion.div
                  key={msg.id || msg.client_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: isPending ? 0.6 : 1, y: 0 }}
                  className={`rounded-lg p-3 ${
                    isSystemMsg
                      ? 'bg-purple-900/30 border-l-4 border-purple-500'
                      : isOwnMessage
                      ? 'bg-blue-900/30 ml-4'
                      : 'bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {/* Profile Image - alien.webp for logged-out users */}
                    {!isSystemMsg && (
                      <img
                        src="/elements/alien.webp"
                        alt="Profile"
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ objectFit: 'cover' }}
                      />
                    )}
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
                      disabled={!msg?.user_id || msg.user_id === SYSTEM_USER_ID}
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
                      disabled={!msg?.user_id || msg.user_id === SYSTEM_USER_ID}
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

                  {/* Failed message retry */}
                  {isFailed && msg.client_id && (
                    <button
                      onClick={() => retryMessage(msg.client_id!)}
                      className="text-xs text-red-400 hover:text-red-200 mt-1 underline"
                    >
                      Failed to send — tap to retry
                    </button>
                  )}

                  {!isSystemMsg && !isPending && !isFailed && (
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

      <div className="px-4 pt-0 pb-0 border-t border-purple-500/30" style={{ marginBottom: '-12px' }}>
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

      <div
        className="p-4 border-t border-purple-500/30 mt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={user ? 'Send a heart signal...' : 'Log in to transmit.'}
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
            Log in to transmit.
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
            if (process.env.NODE_ENV !== "production") console.log('Tip button clicked in HeartSignalLive');
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
