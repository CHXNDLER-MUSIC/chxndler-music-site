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
  const [heartSignalSent, setHeartSignalSent] = useState(false);
  const [heartSignalLoading, setHeartSignalLoading] = useState(false);
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