"use client";

import { useState } from "react";

interface BadgeCategoryButtonProps {
  category: {
    id: string;
    name: string;
    emoji: string;
    color?: string;
  };
  onClick: () => void;
  disabled?: boolean;
}

export default function BadgeCategoryButton({ category, onClick, disabled = false }: BadgeCategoryButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    if (!disabled) {
      setIsPressed(true);
      setTimeout(() => setIsPressed(false), 150);
      onClick();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Circular button with same styling as binder cards */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          relative w-16 h-16 sm:w-20 sm:h-20 rounded-full
          border-2 backdrop-blur-sm transition-all duration-300
          ${disabled 
            ? 'border-white/20 cursor-not-allowed opacity-50' 
            : 'border-white/40 hover:border-white/60 cursor-pointer group hover:scale-105'
          }
          ${isPressed ? 'scale-95' : ''}
        `}
        style={{
          boxShadow: disabled 
            ? '0 0 5px rgba(255,105,180,0.1)' 
            : '0 0 8px rgba(255,105,180,0.3), 0 0 15px rgba(255,105,180,0.2)',
          background: disabled
            ? 'linear-gradient(135deg, rgba(255,105,180,0.05), rgba(128,90,213,0.05))'
            : 'linear-gradient(135deg, rgba(255,105,180,0.15), rgba(128,90,213,0.15))',
        }}
      >
        {/* Gradient background matching binder card slots */}
        <div 
          className={`
            absolute inset-1 rounded-full transition-all duration-300
            ${disabled 
              ? 'bg-gradient-to-br from-pink-500/5 to-purple-500/5' 
              : 'bg-gradient-to-br from-pink-500/20 to-purple-500/20 group-hover:from-pink-500/30 group-hover:to-purple-500/30'
            }
          `}
        />
        
        {/* Category emoji */}
        <div 
          className={`
            relative z-10 flex items-center justify-center w-full h-full
            text-2xl sm:text-3xl transition-all duration-300
            ${disabled ? 'opacity-40' : 'group-hover:scale-110'}
          `}
        >
          {category.emoji}
        </div>

        {/* Hover glow effect matching binder */}
        {!disabled && (
          <div 
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,105,180,0.2) 0%, transparent 70%)',
              filter: 'blur(8px)',
            }}
          />
        )}

        {/* Press animation overlay */}
        {isPressed && !disabled && (
          <div 
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              background: 'radial-gradient(circle, rgba(255,105,180,0.4) 0%, transparent 70%)',
            }}
          />
        )}

        {/* Locked state overlay */}
        {disabled && (
          <div className="absolute inset-1 bg-black/40 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white/20 rounded-full" />
          </div>
        )}
      </button>
      
      {/* Category label with neon pink text matching binder */}
      <div 
        className={`
          text-xs sm:text-sm font-bold text-center leading-tight max-w-20 sm:max-w-24
          transition-all duration-300
          ${disabled ? 'opacity-40' : ''}
        `}
        style={{ 
          color: disabled ? 'rgba(255,182,193,0.4)' : '#FFB6C1',
          textShadow: disabled ? 'none' : '0 0 4px rgba(255,182,193,0.6)',
        }}
      >
        {category.name}
      </div>
    </div>
  );
}