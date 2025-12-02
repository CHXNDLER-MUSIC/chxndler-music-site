"use client";

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * MessageInput Component
 * Input field for sending chat messages with emoji picker and formatting
 */
export default function MessageInput({ onSendMessage, disabled, placeholder = "Type a message...", onTyping }) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Quick emoji options themed to Heartverse elements
  const quickEmojis = [
    '💖', '❤️', '💕', '💗', // Heart
    '🌊', '💧', '🏄‍♀️', '🏄', // Water
    '⚡', '🌩️', '⛈️', '🌪️', // Lightning  
    '🌑', '🌚', '🖤', '⭐', // Darkness
    '🎵', '🎶', '🎤', '🎧', // Music
    '✨', '💫', '🌟', '🔥', // General
    '👋', '😊', '😍', '🥰', // Reactions
    '🙌', '👏', '💯', '🚀'  // Celebration
  ];

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

  const insertEmoji = (emoji) => {
    const newMessage = message + emoji;
    setMessage(newMessage);
    setShowEmojis(false);
    inputRef.current?.focus();
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
                height: '36px',
                minHeight: '36px',
                maxHeight: '36px',
                background: 'rgba(0, 0, 0, 0.6)',
                border: `2px solid ${isFocused ? '#F2EF1D' : 'rgba(242, 239, 29, 0.3)'}`,
                color: '#F2EF1D',
                textShadow: '0 0 8px rgba(242, 239, 29, 0.6)',
                boxShadow: isFocused 
                  ? '0 0 20px rgba(242, 239, 29, 0.4), inset 0 0 20px rgba(242, 239, 29, 0.1)' 
                  : '0 0 10px rgba(242, 239, 29, 0.2)',
                overflow: 'hidden',
                resize: 'none',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis'
              }}
              onInput={(e) => {
                // Ensure textarea stays at fixed height
                e.target.style.height = '36px';
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

          {/* Send Button */}
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="px-3 py-1.5 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
            style={{
              height: '36px',
              minHeight: '36px',
              width: 'auto',
              minWidth: '60px',
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
                : '0 0 20px rgba(242, 239, 29, 0.4), inset 0 0 10px rgba(242, 239, 29, 0.1)'
            }}
          >
            {disabled ? 'Chat Disabled' : 'Send'}
          </button>
        </div>

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
