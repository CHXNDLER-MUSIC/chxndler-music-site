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

export default function HeartSignalLive({ isOpen = true, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const { profile, user } = useProfile();
  const [messages, setMessages] = useState<HeartSignalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load all existing messages on component mount
  const loadMessages = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('heart_signal_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setMessages(data || []);
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
            const newMessage = payload.new as HeartSignalMessage;
            setMessages((prev) => [...prev, newMessage]);
            setTimeout(scrollToBottom, 100); // Delay to ensure DOM update
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
          console.log('✅ Heart Signal Live subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Heart Signal Live subscription error');
        }
      });
  };

  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    
    setIsSending(true);
    try {
      // Get username from profile or fallback to user email
      const username = profile?.name || user?.email || 'Anonymous';
      const userId = user?.id;

      if (!userId) {
        console.error('User not authenticated');
        return;
      }

      // Insert message into heart_signal_messages table
      const { data, error } = await supabaseClient
        .from('heart_signal_messages')
        .insert({
          user_id: userId,
          username: username,
          message: newMessage.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return;
      }

      setNewMessage('');
      console.log('Message sent successfully:', data);
    } catch (error) {
      console.error('Error in sendMessage:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Send system message for user connection
  const sendSystemMessage = async (message: string) => {
    try {
      const { error } = await supabaseClient
        .from('heart_signal_messages')
        .insert({
          user_id: 'system',
          username: 'SYSTEM',
          message: message,
          is_system: true
        });

      if (error) {
        console.error('Error sending system message:', error);
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

  // Initialize component
  useEffect(() => {
    loadMessages();
    subscribeToMessages();

    // Send connection message when user joins
    if (user && profile?.name) {
      sendSystemMessage(`${profile.name} connected to the signal`);
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
    <motion.div
      initial={{ opacity: 0, x: -300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -300 }}
      transition={{ duration: 0.3 }}
      className="fixed left-0 top-0 h-full w-80 bg-black/90 border-r border-purple-500/30 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-purple-500/30 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Heart Signal Live</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-purple-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                  msg.is_system || msg.user_id === 'system'
                    ? 'bg-purple-900/30 border-l-4 border-purple-500'
                    : msg.user_id === user?.id
                    ? 'bg-blue-900/30 ml-4'
                    : 'bg-gray-800/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-medium ${
                    msg.is_system || msg.user_id === 'system'
                      ? 'text-purple-400'
                      : msg.user_id === user?.id
                      ? 'text-blue-400'
                      : 'text-green-400'
                  }`}>
                    {msg.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <div className="text-white text-sm break-words">
                  {msg.message}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-purple-500/30">
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
    </motion.div>
  );
}