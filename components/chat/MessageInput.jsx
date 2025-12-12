"use client";

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '@/lib/sfx';
import ReactionTray from './ReactionTray';

/**
 * MessageInput Component
 * Input field for sending chat messages with emoji picker and formatting
 */
export default function MessageInput({ onSendMessage, disabled, placeholder = "Send a Heart Signal…", onTyping, onRoomReaction, showRoomReactionTray, setShowRoomReactionTray, user }) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Handle typing indicators
  const handleTyping = () => {
    if (!isTyping && onTyping) {
      setIsTyping(true);
      onTyping(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (onTyping) onTyping(false);
    }, 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      // Play send sound effect
      try {
        const audio = new Audio('/audio/change-channel.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
      // Stop typing indicator immediately when sending
      if (isTyping && onTyping) {
        setIsTyping(false);
        onTyping(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
      
      onSendMessage(trimmedMessage);
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };


  const insertFormatting = (format) => {
    const input = inputRef.current;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = message.substring(start, end);
    
    let formattedText = selectedText;
    let newCursorPos = start;

    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        newCursorPos = start + (selectedText ? 2 : 2);
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        newCursorPos = start + (selectedText ? 1 : 1);
        break;
      case 'code':
        formattedText = `\`${selectedText}\``;
        newCursorPos = start + (selectedText ? 1 : 1);
        break;
    }

    const newMessage = message.substring(0, start) + formattedText + message.substring(end);
    setMessage(newMessage);

    // Set cursor position after React updates
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos + (selectedText ? selectedText.length : 0));
    }, 0);
  };

  return (
    <div className="border-t border-cyan-400/20 p-2 bg-black/20 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="relative">

        {/* Message Input */}
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={500}
              rows={1}
              className="w-full resize-none rounded-lg px-3 py-1.5 text-sm transition-all duration-200 focus:outline-none"
              style={{
                height: '44px',
                minHeight: '44px',
                maxHeight: '44px',
                background: 'rgba(0, 0, 0, 0.6)',
                border: `2px solid #F2EF1D`,
                color: '#F2EF1D',
                textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
                boxShadow: isFocused 
                  ? '0 0 25px rgba(242, 239, 29, 0.6), 0 0 50px rgba(242, 239, 29, 0.3), inset 0 0 20px rgba(242, 239, 29, 0.1)' 
                  : '0 0 15px rgba(242, 239, 29, 0.4), 0 0 30px rgba(242, 239, 29, 0.2)',
                overflow: 'hidden',
                resize: 'none',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis'
              }}
              onInput={(e) => {
                // Ensure textarea stays at fixed height
                e.target.style.height = '44px';
              }}
            />
            
            {/* Character counter */}
            {message.length > 400 && (
              <div 
                className="absolute bottom-1 right-2 text-xs pointer-events-none"
                style={{
                  color: message.length > 480 ? '#FF6B6B' : '#FFA500'
                }}
              >
                {500 - message.length}
              </div>
            )}
          </div>

          {/* Room Reaction Button */}
          <motion.button
            type="button"
            onClick={() => {
              // Play sound effect
              try {
                const audio = new Audio('/audio/change-channel.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {});
              } catch {}
              
              setShowRoomReactionTray(!showRoomReactionTray);
            }}
            disabled={disabled}
            onMouseEnter={() => {
              if (!disabled) {
                try { sfx.play('hover', 0.3); } catch {}
              }
            }}
            className="px-3 py-2 rounded-lg text-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0 relative"
            style={{
              height: '44px',
              minHeight: '44px',
              width: '44px',
              background: showRoomReactionTray 
                ? 'rgba(242, 239, 29, 0.2)'
                : 'rgba(242, 239, 29, 0.1)',
              color: '#F2EF1D',
              textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
              border: '2px solid #F2EF1D',
              boxShadow: showRoomReactionTray
                ? '0 0 20px rgba(242, 239, 29, 0.6), 0 0 40px rgba(242, 239, 29, 0.3)'
                : '0 0 12px rgba(242, 239, 29, 0.4)'
            }}
            title="React to the room"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            💫
          </motion.button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            onMouseEnter={() => {
              if (!disabled && message.trim()) {
                try { sfx.play('hover', 0.3); } catch {}
              }
            }}
            className="px-4 py-2 rounded-lg font-semibold text-base transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
            style={{
              height: '44px',
              minHeight: '44px',
              width: 'auto',
              minWidth: '80px',
              background: disabled || !message.trim() 
                ? 'rgba(128, 128, 128, 0.1)'
                : 'transparent',
              color: '#F2EF1D',
              textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
              border: disabled || !message.trim()
                ? '2px solid rgba(128, 128, 128, 0.3)'
                : '2px solid #F2EF1D',
              boxShadow: disabled || !message.trim()
                ? 'none'
                : '0 0 25px rgba(242, 239, 29, 0.6), 0 0 50px rgba(242, 239, 29, 0.3), inset 0 0 15px rgba(242, 239, 29, 0.2)'
            }}
          >
            {disabled ? 'Chat Disabled' : 'Send'}
          </button>
        </div>

        {/* Room Reaction Tray */}
        {showRoomReactionTray && (
          <div className="absolute bottom-full left-0 right-0 mb-2 z-20 flex justify-center">
            <ReactionTray
              onReact={(reaction) => {
                onRoomReaction(reaction);
                setShowRoomReactionTray(false);
              }}
              userId={user?.id || 'anonymous'}
              className="shadow-lg w-full max-w-md"
            />
          </div>
        )}

      </form>
    </div>
  );
}

/**
 * Toolbar Button Component
 */
function ToolbarButton({ children, onClick, title, disabled, isActive = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="w-8 h-8 rounded flex items-center justify-center text-xs transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: isActive 
          ? 'rgba(0, 255, 255, 0.3)' 
          : 'rgba(255, 255, 255, 0.1)',
        border: `1px solid ${isActive ? '#00FFFF' : 'rgba(255, 255, 255, 0.2)'}`,
        color: isActive ? '#00FFFF' : '#FFFFFF'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.target.style.background = 'rgba(0, 255, 255, 0.2)';
          e.target.style.borderColor = '#00FFFF';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.target.style.background = isActive 
            ? 'rgba(0, 255, 255, 0.3)' 
            : 'rgba(255, 255, 255, 0.1)';
          e.target.style.borderColor = isActive ? '#00FFFF' : 'rgba(255, 255, 255, 0.2)';
        }
      }}
    >
      {children}
    </button>
  );
}
