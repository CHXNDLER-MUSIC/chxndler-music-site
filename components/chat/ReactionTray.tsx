"use client";

import { motion } from 'framer-motion';
import { ReactionType, REACTION_CONFIG, canUseSoulStar, getSoulStarCooldownRemaining } from '@/lib/reactions';
import { useState } from 'react';
import Image from 'next/image';

interface ReactionTrayProps {
  onReact: (reaction: ReactionType) => void;
  userId: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function ReactionTray({ onReact, userId, disabled = false, className = "", style = {} }: ReactionTrayProps) {
  const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null);
  
  const handleReactionClick = (reaction: ReactionType) => {
    if (disabled) return;
    
    // Check soul star availability
    if (reaction === 'soul_star' && !canUseSoulStar(userId)) {
      const remainingMs = getSoulStarCooldownRemaining(userId);
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      // Show tooltip - we'll implement this in the parent component
      console.log(`⭐ You can give one Soul Star per day. ${remainingHours}h remaining.`);
      return;
    }
    
    onReact(reaction);
  };

  const reactionOrder: ReactionType[] = [
    'heart_pulse',
    'water_ripple', 
    'lightning_spark',
    'shadow_glow',
    'alien_wave'
  ];

  return (
    <motion.div
      className={`flex items-center gap-1 p-1 rounded-lg bg-black/80 backdrop-blur-md border-2 ${className}`}
      style={{
        borderColor: '#F2EF1D',
        boxShadow: '0 0 20px rgba(242, 239, 29, 0.6), 0 0 40px rgba(242, 239, 29, 0.3)',
        minWidth: 'fit-content',
        overflowX: 'visible',
        ...style
      }}
      onClick={(e) => { e.stopPropagation(); }}
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {reactionOrder.map((reaction) => {
        const config = REACTION_CONFIG[reaction];
        const isSoulStar = reaction === 'soul_star';
        const canUseSoul = isSoulStar ? canUseSoulStar(userId) : true;
        
        return (
          <motion.button
            key={reaction}
            onClick={(e) => { e.stopPropagation(); handleReactionClick(reaction); }}
            onMouseEnter={() => {
              setHoveredReaction(reaction);
              // Play hover sound effect
              if (!disabled && (reaction !== 'soul_star' || canUseSoul)) {
                try {
                  const audio = new Audio('/audio/hover.mp3');
                  audio.volume = 0.3;
                  audio.play().catch(() => {});
                } catch {}
              }
            }}
            onMouseLeave={() => setHoveredReaction(null)}
            disabled={disabled || (isSoulStar && !canUseSoul)}
            className={`
              relative flex items-center justify-center w-12 h-12 rounded-lg
              transition-all duration-200 transform
              hover:scale-110 active:scale-95
              ${disabled || (isSoulStar && !canUseSoul) 
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer hover:bg-white/10'
              }
            `}
            whileHover={!disabled && canUseSoul ? { scale: 1.12 } : {}}
            whileTap={!disabled && canUseSoul ? { scale: 0.95 } : {}}
          >
            <div
              className="w-10 h-10 relative flex items-center justify-center"
              style={{ 
                filter: hoveredReaction === reaction 
                  ? `drop-shadow(0 0 40px ${config.color}) brightness(1.8)` 
                  : `drop-shadow(0 0 24px ${config.color}60)`
              }}
            >
              <Image
                src={config.image}
                alt={config.description}
                width={36}
                height={36}
                className="object-contain"
                draggable={false}
              />
            </div>
            
            {/* Glow effect for hovered reaction */}
            {hoveredReaction === reaction && (
              <motion.div
                className="absolute inset-0 rounded-lg opacity-20"
                style={{ backgroundColor: config.color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            )}
            
            {/* Special indicator for soul star */}
            {isSoulStar && canUseSoul && (
              <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.button>
        );
      })}
      
      {/* Tooltip for hovered reaction */}
      {hoveredReaction && (
        <motion.div
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black/90 border border-cyan-400/50 rounded text-xs text-cyan-400 whitespace-nowrap pointer-events-none z-10"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
        >
          {REACTION_CONFIG[hoveredReaction].description}
          {hoveredReaction === 'soul_star' && !canUseSoulStar(userId) && (
            <span className="text-yellow-400"> (1/day limit)</span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
