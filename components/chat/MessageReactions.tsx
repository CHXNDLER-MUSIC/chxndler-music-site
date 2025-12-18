"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { MessageReactionCount, ReactionType, REACTION_CONFIG } from '@/lib/reactions';
import Image from 'next/image';

interface MessageReactionsProps {
  reactions: MessageReactionCount;
  messageId: string;
  className?: string;
}

export default function MessageReactions({ reactions, messageId, className = "" }: MessageReactionsProps) {
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

  // Show all 6 reaction types without truncation
  const visibleReactions = reactionEntries;

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
              <div className="w-7 h-7 flex items-center justify-center">
                <Image
                  src={config.image}
                  alt={config.description}
                  width={28}
                  height={28}
                  className="object-contain"
                  draggable={false}
                  style={{ 
                    filter: `drop-shadow(0 0 10px ${config.color}60)`
                  }}
                />
              </div>
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
    </motion.div>
  );
}