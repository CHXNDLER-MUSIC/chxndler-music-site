"use client";

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * MessageInput Component
 * Input field for sending chat messages with emoji picker and formatting
 */
export default function MessageInput({ onSendMessage, disabled, placeholder = "Type a message..." }) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef(null);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
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
    <div className="border-t border-cyan-400/20 p-3">
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Formatting and Emoji Toolbar */}
        <div className="flex items-center justify-between">
          {/* Formatting buttons */}
          <div className="flex space-x-1">
            <ToolbarButton
              onClick={() => insertFormatting('bold')}
              title="Bold (**text**)"
              disabled={disabled}
            >
              <strong>B</strong>
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => insertFormatting('italic')}
              title="Italic (*text*)"
              disabled={disabled}
            >
              <em>I</em>
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => insertFormatting('code')}
              title="Code (`text`)"
              disabled={disabled}
            >
              <code>&lt;/&gt;</code>
            </ToolbarButton>
          </div>

          {/* Emoji button */}
          <ToolbarButton
            onClick={() => setShowEmojis(!showEmojis)}
            title="Add emoji"
            disabled={disabled}
            isActive={showEmojis}
          >
            😊
          </ToolbarButton>
        </div>

        {/* Emoji Picker */}
        {showEmojis && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-8 gap-1 p-2 rounded-lg"
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(0, 255, 255, 0.3)'
            }}
          >
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="p-1 rounded hover:bg-white/10 transition-colors text-lg"
                title={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}

        {/* Message Input */}
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={500}
              rows={1}
              className="w-full resize-none rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:outline-none"
              style={{
                background: 'rgba(0, 0, 0, 0.6)',
                border: `2px solid ${isFocused ? '#00FFFF' : 'rgba(255, 255, 255, 0.2)'}`,
                color: '#FFFFFF',
                boxShadow: isFocused 
                  ? '0 0 20px rgba(0, 255, 255, 0.3), inset 0 0 20px rgba(0, 255, 255, 0.1)' 
                  : 'none'
              }}
              onInput={(e) => {
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            
            {/* Character counter */}
            {message.length > 400 && (
              <div 
                className="absolute bottom-1 right-2 text-xs"
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
            className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: disabled || !message.trim() 
                ? 'rgba(128, 128, 128, 0.3)'
                : 'linear-gradient(45deg, #FC54AF, #38B6FF)',
              color: disabled || !message.trim() ? '#888' : '#FFFFFF',
              border: disabled || !message.trim()
                ? '1px solid rgba(128, 128, 128, 0.3)'
                : '1px solid transparent',
              boxShadow: disabled || !message.trim()
                ? 'none'
                : '0 0 20px rgba(252, 84, 175, 0.4)'
            }}
          >
            {disabled ? 'Chat Disabled' : 'Send'}
          </button>
        </div>

        {/* Help text */}
        {!disabled && (
          <p className="text-xs text-white/40 text-center">
            **bold** • *italic* • `code` • Enter to send • Shift+Enter for new line
          </p>
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