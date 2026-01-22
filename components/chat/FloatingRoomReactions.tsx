"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { RoomReaction, REACTION_CONFIG } from '@/lib/reactions';
import safeKey from '@/utils/safeKey';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface FloatingRoomReactionsProps {
  reactions: RoomReaction[];
  onReactionComplete: (reactionId: string) => void;
}

interface FloatingReactionProps {
  reaction: RoomReaction;
  index: number;
  onComplete: () => void;
}

function FloatingReaction({ reaction, index, onComplete }: FloatingReactionProps) {
  const config = REACTION_CONFIG[reaction.reaction];
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, config.duration);
    
    return () => clearTimeout(timer);
  }, [config.duration, onComplete]);

  // Create random starting position and animation path
  const startX = Math.random() * 80 + 10; // Random X position between 10% and 90%
  const startY = Math.random() * 60 + 20; // Random Y position between 20% and 80%
  const xOffset = (Math.random() - 0.5) * 40; // Random horizontal drift
  const rotationDirection = index % 2 === 0 ? 1 : -1;
  
  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
      }}
      initial={{ 
        opacity: 0, 
        y: 0, 
        x: 0,
        scale: 0.8,
        rotate: 0
      }}
      animate={{ 
        opacity: [0, 1, 1, 0], 
        y: -120,
        x: xOffset + (rotationDirection * 30),
        scale: [0.8, 1.2, 1, 0.8],
        rotate: rotationDirection * 15
      }}
      exit={{ 
        opacity: 0, 
        scale: 0.5 
      }}
      transition={{
        duration: config.duration / 1000,
        ease: [0.25, 0.46, 0.45, 0.94],
        times: [0, 0.2, 0.8, 1] // Control opacity timing
      }}
    >
      <div className="relative">
        {/* Main reaction icon */}
        <div 
          className="w-20 h-20 flex items-center justify-center"
          style={{ 
            filter: `drop-shadow(0 0 24px ${config.color}) brightness(1.5)`
          }}
        >
          <Image
            src={config.image}
            alt={config.description}
            width={80}
            height={80}
            className="object-contain"
            draggable={false}
          />
        </div>
        
        {/* Special effects for different reactions */}
        {reaction.reaction === 'heart_pulse' && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ 
              background: `radial-gradient(circle, ${config.color}40 0%, transparent 70%)`,
            }}
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.6, 0.2, 0]
            }}
            transition={{ 
              duration: config.duration / 1000,
              repeat: 1,
              repeatType: 'loop'
            }}
          />
        )}
        
        {reaction.reaction === 'water_ripple' && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0 border-2 rounded-full"
                style={{ borderColor: config.color }}
                animate={{ 
                  scale: [1, 2 + i * 0.5],
                  opacity: [0.8, 0]
                }}
                transition={{ 
                  duration: config.duration / 1000,
                  delay: i * 0.1,
                  ease: 'easeOut'
                }}
              />
            ))}
          </>
        )}
        
        {reaction.reaction === 'lightning_spark' && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: config.color }}
            animate={{ 
              scale: [1, 1.8, 1],
              opacity: [0, 0.8, 0]
            }}
            transition={{ 
              duration: 0.2,
              repeat: 2,
              repeatType: 'mirror'
            }}
          />
        )}
        
        {reaction.reaction === 'shadow_glow' && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ 
              background: `radial-gradient(circle, ${config.color}30 0%, transparent 80%)`,
            }}
            animate={{ 
              scale: [1, 2, 2.5],
              opacity: [0, 0.4, 0]
            }}
            transition={{ 
              duration: config.duration / 1000,
              ease: 'easeInOut'
            }}
          />
        )}
        
        {reaction.reaction === 'alien_wave' && (
          <motion.div
            className="absolute inset-0"
            animate={{ 
              rotate: [0, 10, -10, 5, -5, 0]
            }}
            transition={{ 
              duration: config.duration / 1000,
              ease: 'easeInOut'
            }}
          />
        )}
        
        {reaction.reaction === 'soul_star' && (
          <>
            {/* Golden glow */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ 
                background: `radial-gradient(circle, ${config.color}50 0%, transparent 70%)`,
              }}
              animate={{ 
                scale: [1, 2, 3],
                opacity: [0.8, 0.4, 0]
              }}
              transition={{ 
                duration: config.duration / 1000,
                ease: 'easeOut'
              }}
            />
            {/* Sparkle particles */}
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{ 
                  backgroundColor: config.color,
                  top: `${20 + i * 15}%`,
                  left: `${20 + i * 20}%`
                }}
                animate={{ 
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{ 
                  duration: config.duration / 1000 / 2,
                  delay: i * 0.1,
                  repeat: 1,
                  repeatType: 'mirror'
                }}
              />
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function FloatingRoomReactions({ reactions, onReactionComplete }: FloatingRoomReactionsProps) {
  const [activeReactions, setActiveReactions] = useState<RoomReaction[]>([]);

  // Update active reactions when new ones come in
  useEffect(() => {
    setActiveReactions(prev => {
      // Merge new reactions, keeping only recent ones
      const merged = [...prev, ...reactions].slice(-10); // Keep last 10
      return merged;
    });
  }, [reactions]);

  const handleReactionComplete = (reactionId: string) => {
    setActiveReactions(prev => prev.filter(r => r.id !== reactionId));
    onReactionComplete(reactionId);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      <AnimatePresence>
        {activeReactions.map((reaction, index) => (
          <FloatingReaction
            key={safeKey('room-reaction', reaction.id, reaction.user_id, reaction.reaction, index)}
            reaction={reaction}
            index={index}
            onComplete={() => handleReactionComplete(reaction.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
