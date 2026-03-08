"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabaseClient } from '@/lib/supabaseClient';
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

interface ChatBoxProps {
  className?: string;
  maxMessages?: number;
  showInput?: boolean;
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

export default function ChatBox({
  className = "",
  maxMessages = 50,
  showInput = true
}: ChatBoxProps) {
  const { profile, user } = useProfile();
  const [messages, setMessages] = useState<HeartSignalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load recent messages with optional cursor for pagination (reads from combined view)
  const loadMessages = async (cursor?: string) => {
    try {
      setFetchError(null);

      let query = supabaseClient
        .from('heart_signal_messages_public')
        .select(MESSAGE_COLS)
        .order('created_at', { ascending: false })
        .limit(cursor ? PAGE_SIZE : maxMessages);

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

      if (rows.length < (cursor ? PAGE_SIZE : maxMessages)) {
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

      const updated = [...prev, incoming];
      return updated.slice(-maxMessages);
    });
    setTimeout(scrollToBottom, 100);
  };

  // Subscribe to both tables so guest and auth messages appear in realtime
  const subscribeToMessages = () => {
    if (channelRef.current) {
      supabaseClient.removeChannel(channelRef.current);
    }

    channelRef.current = supabaseClient
      .channel('heart-signal-chatbox')
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
      .subscribe();
  };

  // Optimistic send via POST API
  const sendMessage = async () => {
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

  // Initialize
  useEffect(() => {
    loadMessages();
    subscribeToMessages();

    return () => {
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Auto scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={`flex flex-col bg-black/80 border border-purple-500/30 rounded-lg ${className}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[400px]">
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
            No messages yet...
          </div>
        ) : (
          messages.map((msg) => {
            const isPending = msg.status === 'pending';
            const isFailed = msg.status === 'failed';

            return (
              <motion.div
                // Source-aware key prevents auth/guest UUID collisions
                key={msg.client_id || `${msg.source ?? 'auth'}-${msg.id}` || 'm'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isPending ? 0.6 : 1, y: 0 }}
                className={`text-sm rounded p-2 ${
                  msg.is_system || msg.user_id === '00000000-0000-0000-0000-000000000000'
                    ? 'bg-purple-900/20 text-purple-300 border-l-2 border-purple-500'
                    : msg.user_id === user?.id
                    ? 'bg-blue-900/20 text-blue-300'
                    : 'bg-gray-800/30 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-medium text-xs ${
                    msg.is_system || msg.user_id === '00000000-0000-0000-0000-000000000000'
                      ? 'text-purple-400'
                      : msg.user_id === user?.id
                      ? 'text-blue-400'
                      : 'text-green-400'
                  }`}>
                    {msg.username || 'ALIEN'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="text-white">{msg.message}</div>

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
      {showInput && (
        <div className="p-3 border-t border-purple-500/30">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={user ? 'Type a message...' : 'Log in to transmit.'}
              disabled={!user || isSending}
              className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !user || isSending}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
            >
              {isSending ? '...' : '→'}
            </button>
          </div>
          {!user && (
            <p className="text-xs text-yellow-400 mt-1">
              Log in to transmit.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
