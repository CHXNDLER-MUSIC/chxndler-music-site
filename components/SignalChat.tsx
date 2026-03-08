"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseClient } from '@/lib/supabaseClient';
import ProfileModal from '@/components/chat/ProfileModal';
import { useProfile } from '@/contexts/ProfileContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

const PAGE_SIZE = 50;

// Read from the combined public view (auth + guest messages)
const MESSAGE_COLS = 'id, username, message, created_at, is_system, source';

interface HeartSignalMessage {
  id: string;
  user_id: string | null;
  username: string;
  message: string;
  created_at: string;
  is_system?: boolean;
  source?: 'auth' | 'guest';
  // Client-only fields for optimistic UI
  client_id?: string;
  status?: 'pending' | 'failed';
}

interface SignalChatProps {
  isVisible?: boolean;
  onToggle?: () => void;
  className?: string;
}

const normalizeRow = (row: any, sourceOverride?: 'auth' | 'guest'): HeartSignalMessage => {
  const source: 'auth' | 'guest' = sourceOverride ?? row.source ?? 'auth';
  return {
    id: row.id,
    user_id: row.user_id ?? null,
    username: row.username ?? 'ALIEN',
    message: row.message,
    created_at: row.created_at,
    is_system: row.is_system,
    source,
    // Stable client_id scoped by source so auth and guest IDs never collide as React keys
    client_id: row.client_id ?? (row.id ? `${source}-${row.id}` : undefined),
  };
};

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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
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
        return undefined as unknown as string;
    }
  };

  const getUserTextColor = (userId?: string) => {
    if (!userId) return undefined as unknown as string;
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages with optional cursor for pagination (reads from combined view)
  const loadMessages = async (cursor?: string) => {
    try {
      setFetchError(null);

      let query = supabaseClient
        .from('heart_signal_messages_public')
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
        setMessages(prev => [...rows, ...prev]);
      } else {
        setMessages(rows);
      }

      if (!cursor) {
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error in loadMessages:', error);
      if (!cursor) setFetchError('Signal unstable.');
    } finally {
      setLoadingOlder(false);
    }
  };

  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    const oldest = messages.find(m => !m.client_id);
    await loadMessages(oldest?.created_at);
  };

  const retryInitialLoad = async () => {
    setFetchError(null);
    await loadMessages();
  };

  // Shared handler for incoming realtime inserts from either table
  const handleIncomingMessage = (incoming: HeartSignalMessage) => {
    setMessages(prev => {
      // Dedup by source-scoped id
      if (prev.some(m => m.id === incoming.id && m.source === incoming.source)) return prev;

      // Reconcile optimistic: match by user_id+message for auth, or username+message for guest
      const optIdx = prev.findIndex(m =>
        m.status === 'pending' &&
        m.message === incoming.message &&
        (incoming.source === 'auth'
          ? m.user_id === incoming.user_id
          : m.username === incoming.username)
      );

      if (optIdx >= 0) {
        const next = [...prev];
        next[optIdx] = { ...incoming, client_id: prev[optIdx].client_id };
        return next;
      }

      return [...prev, incoming];
    });
    setTimeout(scrollToBottom, 100);
  };

  // Subscribe to both tables so guest and auth messages appear in realtime
  const subscribeToGlobalSignal = () => {
    if (channelRef.current) {
      supabaseClient.removeChannel(channelRef.current);
    }

    channelRef.current = supabaseClient
      .channel('heart-signal')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'heart_signal_messages' },
        (payload) => {
          handleIncomingMessage(normalizeRow(payload.new, 'auth'));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'heart_signal_guest_messages' },
        (payload) => {
          handleIncomingMessage(normalizeRow(payload.new, 'guest'));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });
  };

  // Optimistic send via POST API
  const sendGlobalMessage = async () => {
    if (!newMessage.trim() || isSending || !user) return;

    const clientId = crypto.randomUUID();
    const optimistic: HeartSignalMessage = {
      id: undefined as any,
      client_id: clientId,
      status: 'pending',
      created_at: new Date().toISOString(),
      user_id: user.id,
      username: profile?.name || 'CHXNDLER',
      message: newMessage.trim(),
      is_system: false,
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

      const serverRow = normalizeRow(result.message);
      setMessages(prev => {
        if (prev.some(m => m.id === serverRow.id && !m.client_id)) {
          return prev.filter(m => m.client_id !== clientId);
        }
        return prev.map(m =>
          m.client_id === clientId ? { ...serverRow, client_id: clientId } : m
        );
      });
    } catch (error) {
      console.error('Error in sendGlobalMessage:', error);
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
      sendGlobalMessage();
    }
  };

  // Initialize when visible
  useEffect(() => {
    if (isVisible) {
      loadMessages();
      subscribeToGlobalSignal();
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
    <>
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
            key="signal-chat-panel"
            initial={{ opacity: 0, scale: 0.8, x: 50, y: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 50, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed right-4 sm:right-6 w-[90vw] max-w-[20rem] sm:w-80 h-[60vh] sm:h-96 bg-black/95 border border-purple-500/50 rounded-lg shadow-2xl z-40 flex flex-col"
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
              {/* Error banner */}
              {fetchError && (
                <div className="text-center py-2 px-3 bg-red-900/40 border border-red-500/40 rounded flex items-center justify-between">
                  <span className="text-xs text-red-300">{fetchError}</span>
                  <button
                    onClick={retryInitialLoad}
                    className="ml-2 text-xs text-red-200 underline hover:text-white"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Load older */}
              {hasMore && !fetchError && messages.length > 0 && (
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

              {messages.length === 0 && !fetchError ? (
                <div className="text-center text-purple-400 py-8 text-sm">
                  Listening for heart signals...
                </div>
              ) : (
                messages.map((msg) => {
                  const displayName = msg.username || 'ALIEN';
                  const isSystemMsg = msg.is_system || msg.user_id === SYSTEM_USER_ID;
                  const isOwnMessage = user?.id && msg.user_id === user.id;
                  const isPending = msg.status === 'pending';
                  const isFailed = msg.status === 'failed';

                  return (
                    <motion.div
                      // Source-aware key prevents auth/guest UUID collisions
                      key={msg.client_id || `${msg.source ?? 'auth'}-${msg.id}` || 'm'}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: isPending ? 0.6 : 1, y: 0 }}
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
                      {(isSystemMsg && (msg.message || '').includes('connected to the signal')) ? (
                        <button
                          type="button"
                          onClick={() => openProfileForMessage(msg)}
                          className="break-words text-left"
                          style={{ color: getUserTextColor(msg.user_id) }}
                          title="View profile"
                          disabled={!msg?.user_id || msg.user_id === SYSTEM_USER_ID}
                        >
                          {msg.message}
                        </button>
                      ) : (
                        <div className="break-words" style={{ color: getUserTextColor(msg.user_id) }}>{msg.message}</div>
                      )}

                      {/* Failed message retry */}
                      {isFailed && msg.client_id && (
                        <button
                          onClick={() => retryMessage(msg.client_id!)}
                          className="text-xs text-red-400 hover:text-red-200 mt-1 underline"
                        >
                          Failed — tap to retry
                        </button>
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
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)' }}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={user ? 'Send to the Heartverse...' : 'Log in to transmit.'}
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
                  Log in to transmit.
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
    </>
  );
}
