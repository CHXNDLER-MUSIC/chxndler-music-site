"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseClient } from '@/lib/supabaseClient';
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
    if (userId === user?.id) return elementToColor(profile?.element);
    return userElementMap[userId] || '#FFD700';
  };

  const fetchElementsForUsers = async (userIds: string[]) => {
    const ids = Array.from(new Set(userIds.filter(id => id && id !== '00000000-0000-0000-0000-000000000000')));
    if (ids.length === 0) return;
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, element')
        .in('id', ids);
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
      // Preload author element colors before rendering
      const ids = msgs.map(m => m.user_id).filter(Boolean) as string[];
      await fetchElementsForUsers(ids);
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
      .channel('heart-signal-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'heart_signal_messages' },
        (payload) => {
          console.log('Global signal received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as HeartSignalMessage;
            setMessages((prev) => [...prev, newMessage]);
            if (newMessage?.user_id && !userElementMap[newMessage.user_id]) {
              fetchElementsForUsers([newMessage.user_id]);
            }
            setTimeout(scrollToBottom, 100);
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as HeartSignalMessage;
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
            className="fixed bottom-24 right-6 w-80 h-96 bg-black/95 border border-purple-500/50 rounded-lg shadow-2xl z-40 flex flex-col"
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
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xs rounded p-2 ${
                      msg.is_system || msg.user_id === '00000000-0000-0000-0000-000000000000'
                        ? 'bg-purple-900/30 border-l-2 border-purple-500'
                        : msg.user_id === user?.id
                        ? 'bg-blue-900/30 ml-2'
                        : 'bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {msg.username}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <div className="break-words">{msg.message}</div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-purple-500/30">
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
  );
}
