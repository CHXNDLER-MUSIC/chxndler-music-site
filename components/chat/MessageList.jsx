"use client";

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ElementIcon } from '@/lib/elementIcons';
import { getElementColor, formatChatTimestamp, sanitizeMessage } from '@/lib/supabase/chat';

/**
 * MessageList Component
 * Displays chat messages with real-time updates and auto-scroll
 */
export default function MessageList({ messages, onUserClick, loading }) {
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div 
            className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3"
          />
          <p className="text-sm text-white/60">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto p-3 space-y-2"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0, 255, 255, 0.3) transparent'
      }}
    >
      <AnimatePresence initial={false}>
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
              mass: 0.8
            }}
          >
            <ChatMessage 
              message={message}
              onUserClick={onUserClick}
              isConsecutive={
                index > 0 && 
                messages[index - 1].user_id === message.user_id &&
                messages[index - 1].message_type === 'message' &&
                message.message_type === 'message' &&
                (new Date(message.created_at) - new Date(messages[index - 1].created_at)) < 60000 // Within 1 minute
              }
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Empty state */}
      {messages.length === 0 && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400/20 to-pink-400/20 border border-cyan-400/30 flex items-center justify-center mx-auto mb-4"
            >
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-white/60 text-sm">
              Welcome to the live chat!
            </p>
            <p className="text-white/40 text-xs mt-1">
              Be the first to say hello 👋
            </p>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}

/**
 * Individual Chat Message Component
 */
function ChatMessage({ message, onUserClick, isConsecutive }) {
  const userProfile = message.user_profile;
  const displayName = userProfile?.name || 'Anonymous';
  const elementColor = getElementColor(userProfile?.element);
  const timestamp = formatChatTimestamp(message.created_at);
  const sanitizedMessage = sanitizeMessage(message.message);

  // System messages (join/leave)
  if (message.message_type === 'join' || message.message_type === 'leave') {
    return (
      <div className="flex justify-center my-2">
        <div 
          className="px-3 py-1 rounded-full text-xs"
          style={{
            background: 'rgba(0, 255, 255, 0.1)',
            border: '1px solid rgba(0, 255, 255, 0.2)',
            color: '#00FFFF'
          }}
        >
          {sanitizedMessage}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group hover:bg-white/5 rounded-lg transition-colors duration-200 ${
        isConsecutive ? 'py-1 px-3' : 'py-2 px-3'
      }`}
    >
      <div className="flex items-start space-x-2">
        {/* Avatar (only show for non-consecutive messages) */}
        {!isConsecutive && (
          <button
            onClick={() => onUserClick(message.user_id)}
            className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform duration-200"
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: `${elementColor}30`,
                border: `1px solid ${elementColor}`,
                boxShadow: `0 0 8px ${elementColor}60`
              }}
            >
              {userProfile?.avatar_badge_id ? (
                // Custom badge avatar
                <span className="text-xs">🏆</span>
              ) : userProfile?.element ? (
                // Element icon
                <ElementIcon 
                  name={userProfile.element} 
                  width={14} 
                  height={14}
                  className="opacity-90"
                />
              ) : (
                // Default avatar
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ 
                    background: `linear-gradient(45deg, ${elementColor}, #FFFFFF)`,
                    opacity: 0.8
                  }}
                />
              )}
            </div>
          </button>
        )}

        {/* Spacer for consecutive messages */}
        {isConsecutive && <div className="w-6" />}

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Username and timestamp (only for non-consecutive) */}
          {!isConsecutive && (
            <div className="flex items-baseline space-x-2 mb-1">
              <button
                onClick={() => onUserClick(message.user_id)}
                className="font-semibold text-sm hover:underline transition-colors duration-200"
                style={{
                  color: elementColor,
                  textShadow: `0 0 8px ${elementColor}60`
                }}
              >
                {displayName}
              </button>
              <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors duration-200">
                {timestamp}
              </span>
            </div>
          )}

          {/* Message text */}
          <div 
            className="text-sm leading-relaxed break-words"
            style={{ color: '#FFFFFF' }}
            dangerouslySetInnerHTML={{
              __html: formatMessageText(sanitizedMessage)
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Format message text with basic markdown-like formatting
 */
function formatMessageText(text) {
  return text
    // Bold text **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #00FFFF; text-shadow: 0 0 6px rgba(0, 255, 255, 0.6);">$1</strong>')
    // Italic text *text*
    .replace(/\*(.*?)\*/g, '<em style="color: #FC54AF;">$1</em>')
    // Code `text`
    .replace(/`(.*?)`/g, '<code style="background: rgba(255, 255, 255, 0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace; color: #F2EF1D;">$1</code>')
    // Heart emoji enhancement
    .replace(/❤️|💖|💝|💕|💗/g, '<span style="color: #FC54AF; text-shadow: 0 0 8px rgba(252, 84, 175, 0.8); animation: heartbeat 1s ease-in-out infinite;">$&</span>')
    // Water/ocean emojis
    .replace(/🌊|💧|🏄‍♀️|🏄‍♂️|🏄/g, '<span style="color: #38B6FF; text-shadow: 0 0 8px rgba(56, 182, 255, 0.8);">$&</span>')
    // Lightning emojis  
    .replace(/⚡|🌩️|⛈️/g, '<span style="color: #F2EF1D; text-shadow: 0 0 8px rgba(242, 239, 29, 0.8);">$&</span>')
    // Dark/night emojis
    .replace(/🌑|🌚|🖤|⚫/g, '<span style="color: #6B46C1; text-shadow: 0 0 8px rgba(107, 70, 193, 0.8);">$&</span>');
}

// CSS for heart animation
const heartbeatKeyframes = `
  @keyframes heartbeat {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('chat-message-styles')) {
  const style = document.createElement('style');
  style.id = 'chat-message-styles';
  style.textContent = heartbeatKeyframes;
  document.head.appendChild(style);
}