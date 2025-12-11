"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { MessageReactionCount, ReactionType, REACTION_CONFIG } from '@/lib/reactions';
import { useState } from 'react';

interface MessageReactionsProps {
  reactions: MessageReactionCount;
  messageId: string;
  className?: string;
}

export default function MessageReactions({ reactions, messageId, className = "" }: MessageReactionsProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Convert reactions to sorted array
  const reactionEntries = Object.entries(reactions)
    .filter(([_, count]) => count > 0)
    .sort(([a], [b]) => {
      // Sort by the order defined in REACTION_CONFIG
      const order = ['heart_pulse', 'water_ripple', 'lightning_spark', 'shadow_glow', 'alien_wave', 'soul_star'];
      return order.indexOf(a as ReactionType) - order.indexOf(b as ReactionType);
    });

  if (reactionEntries.length === 0) {
    return null;
  }

  const maxVisible = 3;
  const visibleReactions = showAll ? reactionEntries : reactionEntries.slice(0, maxVisible);
  const hiddenCount = reactionEntries.length - maxVisible;

  return (
    <motion.div
      className={`flex items-center gap-1 mt-1 ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <AnimatePresence>
        {visibleReactions.map(([reaction, count]) => {
          const config = REACTION_CONFIG[reaction as ReactionType];
          
          return (
            <motion.div
              key={reaction}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 border border-white/20 backdrop-blur-sm"
              style={{
                borderColor: `${config.color}30`
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              whileHover={{ 
                scale: 1.05,
                borderColor: `${config.color}60`,
                boxShadow: `0 0 8px ${config.color}40`
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <span className="text-sm">{config.icon}</span>
              <span 
                className="text-xs font-medium"
                style={{ color: config.color }}
              >
                {count}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      {/* Show "+N more" if there are hidden reactions */}
      {!showAll && hiddenCount > 0 && (
        <motion.button
          onClick={() => setShowAll(true)}
          className="px-2 py-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          +{hiddenCount}
        </motion.button>
      )}
      
      {/* Show "show less" if all are visible */}
      {showAll && hiddenCount > 0 && (
        <motion.button
          onClick={() => setShowAll(false)}
          className="px-2 py-1 text-xs text-cyan-400/60 hover:text-cyan-300 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          less
        </motion.button>
      )}
    </motion.div>
  );
}