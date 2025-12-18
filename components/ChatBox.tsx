"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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

interface ChatBoxProps {
  className?: string;
  maxMessages?: number;
  showInput?: boolean;
}

export default function ChatBox({ 
  className = "",
  maxMessages = 50,
  showInput = true 
}: ChatBoxProps) {
  const { profile, user } = useProfile();
  const [messages, setMessages] = useState<HeartSignalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load recent messages
  const loadMessages = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('heart_signal_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxMessages);

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      // Reverse to show oldest first
      setMessages((data || []).reverse());
    } catch (error) {
      console.error('Error in loadMessages:', error);
    }
  };

  // Subscribe to real-time messages
  const subscribeToMessages = () => {
    if (channelRef.current) {
      supabaseClient.removeChannel(channelRef.current);
    }

    channelRef.current = supabaseClient
      .channel('heart-signal-chatbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'heart_signal_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as HeartSignalMessage;
            setMessages((prev) => {
              const updated = [...prev, newMessage];
              // Keep only the latest maxMessages
              return updated.slice(-maxMessages);
            });
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe();
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || isSending || !user) return;
    
    setIsSending(true);
    try {
      const username = profile?.name || user?.email || 'Anonymous';
      
      const { error } = await supabaseClient
        .from('heart_signal_messages')
        .insert({
          user_id: user.id,
          username: username,
          message: newMessage.trim()
        });

      if (error) {
        console.error('Error sending message:', error);
        return;
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error in sendMessage:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
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
        {messages.length === 0 ? (
          <div className="text-center text-purple-400 py-8 text-sm">
            No messages yet...
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
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
                  {msg.username}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <div className="text-white">{msg.message}</div>
            </motion.div>
          ))
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
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
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
              Please log in to send messages
            </p>
          )}
        </div>
      )}
    </div>
  );
}