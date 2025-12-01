"use client";

import { useEffect, useRef, useState } from 'react';
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
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Check if user is near bottom of chat
  const checkIfNearBottom = () => {
    if (!scrollContainerRef.current) return true;
    
    const container = scrollContainerRef.current;
    const threshold = 100; // pixels from bottom
    const isNear = container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
    setIsNearBottom(isNear);
    return isNear;
  };

  // Auto-scroll to bottom only for initial load (disabled auto-scroll for new messages)
  useEffect(() => {
    if (messages.length === 0) return;
    
    // Only scroll for the very first message load (initial load)
    if (messages.length <= 1) {
      scrollToBottom();
    }
    // Removed auto-scroll for new messages to prevent awkward page scrolling
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
      className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0, 255, 255, 0.3) transparent'
      }}
      onScroll={checkIfNearBottom}
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
  // Get text color based on element, default to yellow for anonymous users
  const textColor = userProfile?.element ? elementColor : '#F2EF1D';
  const timestamp = formatChatTimestamp(message.created_at);
  const sanitizedMessage = sanitizeMessage(message.message);

  // System messages (join/leave/system announcements)
  if (message.message_type === 'join' || message.message_type === 'leave' || message.user_id === 'system') {
    // Special styling for different system message types
    let systemStyle = {
      background: 'rgba(0, 255, 255, 0.1)',
      border: '1px solid rgba(0, 255, 255, 0.2)',
      color: '#00FFFF'
    };

    // Different styling based on message content for system events
    if (sanitizedMessage.includes('✨') && sanitizedMessage.includes('connected to the Heartverse')) {
      // Welcome message styling
      systemStyle = {
        background: 'rgba(255, 105, 180, 0.15)',
        border: '1px solid rgba(255, 105, 180, 0.4)',
        color: '#FF69B4',
        boxShadow: '0 0 15px rgba(255, 105, 180, 0.3)'
      };
    } else if (sanitizedMessage.includes('⭐') && sanitizedMessage.includes('First Transmission Received')) {
      // First message styling
      systemStyle = {
        background: 'rgba(255, 215, 0, 0.15)',
        border: '1px solid rgba(255, 215, 0, 0.4)',
        color: '#FFD700',
        boxShadow: '0 0 15px rgba(255, 215, 0, 0.3)'
      };
    } else if (sanitizedMessage.includes('💛') && sanitizedMessage.includes('sent a HeartCoin')) {
      // HeartCoin transfer styling
      systemStyle = {
        background: 'rgba(242, 239, 29, 0.15)',
        border: '1px solid rgba(242, 239, 29, 0.4)',
        color: '#F2EF1D',
        boxShadow: '0 0 15px rgba(242, 239, 29, 0.3)',
        animation: 'heartCoinGlow 2s ease-in-out'
      };
    }

    return (
      <div className="flex justify-center my-3">
        <div 
          className="px-4 py-2 rounded-full text-sm font-semibold"
          style={systemStyle}
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
            style={{ 
              color: textColor,
              textShadow: `0 0 4px ${textColor}40`
            }}
            dangerouslySetInnerHTML={{
              __html: formatMessageText(sanitizedMessage, textColor)
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
function formatMessageText(text, textColor = '#F2EF1D') {
  return text
    // Bold text **text**
    .replace(/\*\*(.*?)\*\*/g, `<strong style="color: ${textColor}; text-shadow: 0 0 4px ${textColor}60;">$1</strong>`)
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

// CSS for animations
const animationKeyframes = `
  @keyframes heartbeat {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  
  @keyframes heartCoinGlow {
    0%, 100% { 
      box-shadow: 0 0 15px rgba(242, 239, 29, 0.3);
      transform: scale(1);
    }
    50% { 
      box-shadow: 0 0 25px rgba(242, 239, 29, 0.6), 0 0 35px rgba(242, 239, 29, 0.3);
      transform: scale(1.02);
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('chat-message-styles')) {
  const style = document.createElement('style');
  style.id = 'chat-message-styles';
  style.textContent = animationKeyframes;
  document.head.appendChild(style);
}