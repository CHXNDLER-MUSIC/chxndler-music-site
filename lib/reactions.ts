export type ReactionType = 'heart_pulse' | 'water_ripple' | 'lightning_spark' | 'shadow_glow' | 'alien_wave' | 'soul_star';

export interface ReactionEvent {
  type: 'message_reaction' | 'room_reaction';
  reaction: ReactionType;
  message_id?: string;
  user_id: string;
  created_at: string;
}

export interface RoomReaction {
  id: string;
  reaction: ReactionType;
  user_id: string;
  created_at: string;
}

export interface MessageReactionCount {
  [key: string]: number; // reaction type -> count
}

export interface MessageReactions {
  [messageId: string]: MessageReactionCount;
}

export const REACTION_CONFIG = {
  heart_pulse: {
    icon: '💖',
    color: '#FC54AF',
    duration: 1200,
    description: 'Heart Pulse'
  },
  water_ripple: {
    icon: '🌊',
    color: '#38B6FF',
    duration: 1400,
    description: 'Water Ripple'
  },
  lightning_spark: {
    icon: '⚡',
    color: '#F2EF1D',
    duration: 500,
    description: 'Lightning Spark'
  },
  shadow_glow: {
    icon: '🌑',
    color: '#8B5A9F',
    duration: 2000,
    description: 'Shadow Glow'
  },
  alien_wave: {
    icon: '👽',
    color: '#00FF00',
    duration: 900,
    description: 'Alien Wave'
  },
  soul_star: {
    icon: '⭐',
    color: '#FFD700',
    duration: 1800,
    description: 'Soul Star',
    special: true
  }
} as const;

export const RATE_LIMITS = {
  global: 600, // 600ms between any reactions
  lightning_spark: 1200, // 1.2s for lightning
  message_repeat: 3000, // 3s before same reaction on same message
  soul_star_cooldown: 24 * 60 * 60 * 1000 // 24 hours
} as const;

// Soul star localStorage key helper
export const getSoulStarKey = (userId: string) => `soul_star_last_used_${userId}`;

// Check if user can use soul star
export const canUseSoulStar = (userId: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  const key = getSoulStarKey(userId);
  const lastUsed = localStorage.getItem(key);
  
  if (!lastUsed) return true;
  
  const lastUsedTime = parseInt(lastUsed, 10);
  const now = Date.now();
  
  return (now - lastUsedTime) >= RATE_LIMITS.soul_star_cooldown;
};

// Mark soul star as used
export const markSoulStarUsed = (userId: string): void => {
  if (typeof window === 'undefined') return;
  
  const key = getSoulStarKey(userId);
  localStorage.setItem(key, Date.now().toString());
};

// Get time remaining for soul star cooldown
export const getSoulStarCooldownRemaining = (userId: string): number => {
  if (typeof window === 'undefined') return 0;
  
  const key = getSoulStarKey(userId);
  const lastUsed = localStorage.getItem(key);
  
  if (!lastUsed) return 0;
  
  const lastUsedTime = parseInt(lastUsed, 10);
  const now = Date.now();
  const elapsed = now - lastUsedTime;
  
  return Math.max(0, RATE_LIMITS.soul_star_cooldown - elapsed);
};