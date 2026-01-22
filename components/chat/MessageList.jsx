"use client";

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ElementIcon } from '@/lib/elementIcons';
import { getElementColor, formatChatTimestamp, sanitizeMessage } from '@/lib/supabase/chat';
import ReactionTray from './ReactionTray';
import MessageReactions from './MessageReactions';
// import { ReactionType } from '@/lib/reactions'; // Types not needed in JSX

/**
 * MessageList Component
 * Displays chat messages with real-time updates and auto-scroll
 */
export default function MessageList({ messages, onUserClick, loading, messageReactions, onReact, currentUserId, currentUserElement = null, onUserClickByName, currentUserProfileImageUrl = null, userProfilesById = {} }) {
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const isInitialMount = useRef(true);

  // Check if user is near bottom of chat
  const checkIfNearBottom = () => {
    if (!scrollContainerRef.current) return true;

    const container = scrollContainerRef.current;
    const threshold = 100; // pixels from bottom
    const isNear = container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
    setIsNearBottom(isNear);
    return isNear;
  };

  // Always auto-scroll to the newest message
  useEffect(() => {
    if (messages.length === 0) return;

    // Use instant scroll on initial load, smooth scroll for new messages
    const shouldUseInstant = isInitialMount.current;
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }

    scrollToBottom(shouldUseInstant ? 'instant' : 'smooth');
  }, [messages]);

  const scrollToBottom = (behavior = 'smooth') => {
    // Prefer scrolling the container to avoid layout shift
    const container = scrollContainerRef.current;
    if (container) {
      // Use requestAnimationFrame to ensure layout is updated before scrolling
      requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior });
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
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
        scrollbarColor: 'rgba(0, 255, 255, 0.3) transparent',
        overscrollBehavior: 'contain'
      }}
      onScroll={checkIfNearBottom}
    >
      <AnimatePresence initial={false}>
        {messages.map((message, index) => (
          <motion.div
            key={message.clientKey || message.id || `msg-${index}`}
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
              reactions={messageReactions?.[message.id] || {}}
              onReact={onReact}
              currentUserId={currentUserId}
              currentUserElement={currentUserElement}
              currentUserProfileImageUrl={currentUserProfileImageUrl}
              userProfilesById={userProfilesById}
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
function ChatMessage({ message, onUserClick, onUserClickByName, reactions, onReact, currentUserId, currentUserElement = null, currentUserProfileImageUrl = null, userProfilesById = {}, isConsecutive }) {
  const [showReactionTray, setShowReactionTray] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const reactionTrayTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  
  const userProfile = message.user_profile;
  const displayName = userProfile?.name || 'Anonymous';
  // Resolve element/profile image from message, known users, or current user
  // Guests always have 'alien' element
  const isGuestMessage = !!message.guest_id;
  const senderId = message.guest_id || message.user_id;
  const resolvedElement = isGuestMessage ? 'alien' : ((userProfile?.element) || (userProfilesById?.[senderId]?.element) || ((senderId === currentUserId) ? currentUserElement : null));
  const elementColor = resolvedElement ? getElementColor(resolvedElement) : undefined;
  const textColor = elementColor;
  const resolvedProfileImageUrl = isGuestMessage ? null : ((userProfile?.profile_image_url) || (userProfilesById?.[senderId]?.profile_image_url) || ((senderId === currentUserId) ? currentUserProfileImageUrl : null));
  const timestamp = formatChatTimestamp(message.created_at);
  const sanitizedMessage = sanitizeMessage(message.message);

  // Show reaction tray only on explicit click (no hover)
  const handleMessageClick = () => {
    if (message.message_type !== 'message') return;
    setShowReactionTray((prev) => !prev);
  };

  // Hide reaction tray when clicking outside this message
  useEffect(() => {
    if (!showReactionTray) return;
    const handleDocumentClick = (e) => {
      const node = containerRef.current;
      if (!node) return;
      if (!node.contains(e.target)) {
        setShowReactionTray(false);
      }
    };
    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [showReactionTray]);

  // Hide reaction tray on Escape key
  useEffect(() => {
    if (!showReactionTray) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowReactionTray(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showReactionTray]);

  // Handle long press for mobile
  const handleTouchStart = () => {
    if (message.message_type !== 'message') return;
    
    const timer = setTimeout(() => {
      setShowReactionTray(true);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Handle reaction click
  const handleReaction = (reaction) => {
    onReact(reaction, message.id);
    setShowReactionTray(false);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (reactionTrayTimeoutRef.current) {
        clearTimeout(reactionTrayTimeoutRef.current);
      }
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  // System messages (join/leave/system announcements)
  if (message.message_type === 'join' || message.message_type === 'leave' || message.user_id === '00000000-0000-0000-0000-000000000000') {
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

    // If it's a "connected to the signal" message, make clickable to open that user's profile
    const isConnectMsg = sanitizedMessage.includes('connected to the signal');
    const tryOpenUserFromMessage = () => {
      if (!isConnectMsg || !onUserClickByName) return;
      const name = sanitizedMessage.split(' connected to the signal')[0].trim();
      if (name) onUserClickByName(name);
    };
    return (
      <div className="flex justify-center my-3">
        <button 
          className="px-4 py-2 rounded-full text-sm font-semibold"
          style={{ cursor: isConnectMsg ? 'pointer' : 'default', ...systemStyle }}
          onMouseEnter={() => {
            try {
              const audio = new Audio('/audio/hover.mp3');
              audio.volume = 0.3;
              audio.play().catch(() => {});
            } catch {}
          }}
          onClick={tryOpenUserFromMessage}
          title={isConnectMsg ? 'View profile' : undefined}
        >
          {sanitizedMessage}
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`group hover:bg-white/5 rounded-lg transition-colors duration-200 relative ${
        isConsecutive ? 'py-1 px-3' : 'py-2 px-3'
      }`}
      ref={containerRef}
      onClick={handleMessageClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-start space-x-2">
        {/* Avatar (only show for non-consecutive messages) */}
        {!isConsecutive && (
          <button
            onClick={() => onUserClick(message.guest_id || message.user_id)}
            className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform duration-200"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: elementColor ? `${elementColor}30` : 'rgba(255,255,255,0.05)',
                border: elementColor ? `1px solid ${elementColor}` : '1px solid rgba(255,255,255,0.2)',
                boxShadow: elementColor ? `0 0 8px ${elementColor}60` : 'none'
              }}
            >
              {(message.guest_id || message.user_id === 'anonymous') ? (
                // Always show alien.webp for guest users
                <img
                  src="/elements/alien.webp"
                  alt="Guest User"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to emoji if alien.webp fails to load
                    e.target.style.display = 'none';
                    const parent = e.target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center"><span class="text-xs">👽</span></div>`;
                    }
                  }}
                />
              ) : resolvedProfileImageUrl ? (
                // Show actual profile image for authenticated users
                <img
                  src={resolvedProfileImageUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to element icon if profile image fails to load
                    e.target.style.display = 'none';
                    const parent = e.target.parentElement;
                    if (parent && userProfile?.element) {
                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center"></div>`;
                      // Insert ElementIcon fallback
                      const iconContainer = parent.querySelector('div');
                      if (iconContainer) {
                        if (userProfile.element === 'alien') {
                          iconContainer.innerHTML = '<span class="text-xs">👽</span>';
                        } else {
                          // For other elements, show the element icon
                          iconContainer.innerHTML = '<span class="text-xs">⭐</span>';
                        }
                      }
                    }
                  }}
                />
              ) : userProfile?.element ? (
                // Element icon fallback for authenticated users without profile images
                userProfile.element === 'alien' ? (
                  <img
                    src="/elements/alien.webp"
                    alt="Alien Element"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const parent = e.target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="w-full h-full flex items-center justify-center"><span class="text-xs">👽</span></div>`;
                      }
                    }}
                  />
                ) : (
                  <ElementIcon 
                    name={userProfile.element} 
                    width={14} 
                    height={14}
                    className="opacity-90"
                  />
                )
              ) : (
                // Default avatar for users without element or profile image
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
                onClick={() => onUserClick(message.guest_id || message.user_id)}
                className="font-semibold text-sm hover:underline transition-colors duration-200"
                style={elementColor ? { color: elementColor } : undefined}
                onMouseEnter={() => {
                  try {
                    const audio = new Audio('/audio/hover.mp3');
                    audio.volume = 0.3;
                    audio.play().catch(() => {});
                  } catch {}
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
            style={textColor ? { color: textColor } : undefined}
            onMouseEnter={() => {
              try {
                const audio = new Audio('/audio/hover.mp3');
                audio.volume = 0.3;
                audio.play().catch(() => {});
              } catch {}
            }}
            dangerouslySetInnerHTML={{
              __html: formatMessageText(sanitizedMessage, textColor)
            }}
          />
          
          {/* Message reactions summary */}
          {reactions && Object.keys(reactions).length > 0 && (
            <MessageReactions
              reactions={reactions}
              messageId={message.id}
              className="mt-1"
            />
          )}
        </div>
      </div>
      
      {/* Reaction tray */}
      <AnimatePresence>
        {showReactionTray && (
          <div className="absolute top-0 right-2 z-10">
            <ReactionTray
              onReact={handleReaction}
              userId={currentUserId}
              className="shadow-lg"
            />
          </div>
        )}
      </AnimatePresence>
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
