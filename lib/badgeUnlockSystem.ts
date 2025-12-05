"use client";

import { supabaseClient } from '@/lib/supabaseClient';
import { REQUIREMENT_TYPES } from '@/types/badges_updated';

interface BadgeUnlockEvent {
  userId: string;
  eventType: keyof typeof REQUIREMENT_TYPES;
  value?: string | number;
  metadata?: Record<string, any>;
}

class BadgeUnlockSystem {
  private static instance: BadgeUnlockSystem;

  static getInstance(): BadgeUnlockSystem {
    if (!BadgeUnlockSystem.instance) {
      BadgeUnlockSystem.instance = new BadgeUnlockSystem();
    }
    return BadgeUnlockSystem.instance;
  }

  // Main function to check and award badges based on user activity
  async checkAndAwardBadges(event: BadgeUnlockEvent): Promise<string[]> {
    const { userId, eventType, value, metadata } = event;
    const awardedBadges: string[] = [];

    try {
      // Get all badges that match this requirement type
      const { data: badges, error: badgesError } = await supabaseClient
        .from('badges')
        .select('*')
        .eq('requirement_type', eventType);

      if (badgesError) {
        console.error('Error fetching badges:', badgesError);
        return awardedBadges;
      }

      // Get user's current badges
      const { data: userBadges, error: userBadgesError } = await supabaseClient
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId);

      if (userBadgesError) {
        console.error('Error fetching user badges:', userBadgesError);
        return awardedBadges;
      }

      const unlockedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);

      // Get current user progress
      const userProgress = await this.getUserProgress(userId);

      // Check each badge for unlock conditions
      for (const badge of badges || []) {
        if (unlockedBadgeIds.has(badge.id)) continue;

        const shouldUnlock = await this.checkBadgeUnlockCondition(
          badge,
          userProgress,
          eventType,
          value,
          metadata
        );

        if (shouldUnlock) {
          const success = await this.awardBadge(userId, badge.id);
          if (success) {
            awardedBadges.push(badge.id);
            console.log(`Badge awarded: ${badge.title} to user ${userId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error in badge unlock system:', error);
    }

    return awardedBadges;
  }

  // Check if a specific badge should be unlocked
  private async checkBadgeUnlockCondition(
    badge: any,
    userProgress: any,
    eventType: string,
    value?: string | number,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const reqValue = badge.requirement_value;
    
    switch (badge.requirement_type) {
      case REQUIREMENT_TYPES.SOUL_ENTRIES:
        return userProgress.soul_entries >= parseInt(reqValue);
        
      case REQUIREMENT_TYPES.TRACKS_LISTENED:
        if (reqValue === 'all') {
          return userProgress.tracks_listened >= 50; // Total discography size
        }
        return userProgress.tracks_listened >= parseInt(reqValue);
        
      case REQUIREMENT_TYPES.DAILY_QUESTS:
        return userProgress.daily_quests >= parseInt(reqValue);
        
      case REQUIREMENT_TYPES.ELEMENT_STREAK:
        const [streakDays, element] = reqValue.split(':');
        return (userProgress.element_streaks[element] || 0) >= parseInt(streakDays);
        
      case REQUIREMENT_TYPES.HEARTCOINS_EARNED:
        return userProgress.heartcoins_earned >= parseInt(reqValue);
        
      case REQUIREMENT_TYPES.HEARTCOINS_SPENT:
        return userProgress.heartcoins_spent >= parseInt(reqValue);
        
      case REQUIREMENT_TYPES.LOGIN_STREAK:
        return userProgress.login_streak >= parseInt(reqValue);
        
      case REQUIREMENT_TYPES.PROFILE_CREATED:
        return true; // Always true if user exists
        
      case REQUIREMENT_TYPES.ITEMS_COLLECTED:
        return userProgress.items_collected >= parseInt(reqValue);
        
      case REQUIREMENT_TYPES.LIVE_EVENTS:
        return userProgress.live_events >= parseInt(reqValue);
        
      case REQUIREMENT_TYPES.MERCH_PURCHASES:
        return userProgress.merch_purchases >= parseInt(reqValue);
        
      case REQUIREMENT_TYPES.COMMUNITY_DAYS:
        return userProgress.community_days >= parseInt(reqValue);
        
      case REQUIREMENT_TYPES.SHARES_MADE:
        return userProgress.shares_made >= parseInt(reqValue);
        
      case REQUIREMENT_TYPES.FRIENDS_INVITED:
        return userProgress.friends_invited >= parseInt(reqValue);
        
      case REQUIREMENT_TYPES.EVENTS_HOSTED:
        return userProgress.events_hosted >= parseInt(reqValue);
        
      case REQUIREMENT_TYPES.LIVE_STREAMS:
        return userProgress.live_streams >= parseInt(reqValue);
        
      default:
        return false;
    }
  }

  // Get user's current progress from various tables
  private async getUserProgress(userId: string): Promise<any> {
    // This would be expanded to query multiple tables for real progress data
    const progress = {
      soul_entries: 0,
      tracks_listened: 0,
      daily_quests: 0,
      items_collected: 0,
      live_events: 0,
      heartcoins_earned: 0,
      heartcoins_spent: 0,
      merch_purchases: 0,
      community_days: 0,
      shares_made: 0,
      friends_invited: 0,
      events_hosted: 0,
      login_streak: 0,
      live_streams: 0,
      element_streaks: {}
    };

    try {
      // Example: Get soul journal entries
      const { data: soulEntries } = await supabaseClient
        .from('soul_journal')
        .select('id')
        .eq('user_id', userId);
      progress.soul_entries = soulEntries?.length || 0;

      // Example: Get heartcoins from profile
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('heartcoins')
        .eq('id', userId)
        .single();
      progress.heartcoins_earned = profile?.heartcoins || 0;

      // Add other progress queries here
      
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }

    return progress;
  }

  // Award a badge to a user
  private async awardBadge(userId: string, badgeId: string): Promise<boolean> {
    try {
      const { error } = await supabaseClient
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badgeId
        });

      if (error) {
        // Ignore duplicate key errors
        if (error.code === '23505') {
          return false;
        }
        console.error('Error awarding badge:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error awarding badge:', error);
      return false;
    }
  }

  // Convenience methods for common events
  async onSoulJournalEntry(userId: string): Promise<string[]> {
    return this.checkAndAwardBadges({
      userId,
      eventType: 'SOUL_ENTRIES'
    });
  }

  async onTrackListen(userId: string, trackId?: string): Promise<string[]> {
    return this.checkAndAwardBadges({
      userId,
      eventType: 'TRACKS_LISTENED',
      metadata: { trackId }
    });
  }

  async onDailyQuestComplete(userId: string): Promise<string[]> {
    return this.checkAndAwardBadges({
      userId,
      eventType: 'DAILY_QUESTS'
    });
  }

  async onElementStreak(userId: string, element: string, streakDays: number): Promise<string[]> {
    return this.checkAndAwardBadges({
      userId,
      eventType: 'ELEMENT_STREAK',
      value: `${streakDays}:${element}`
    });
  }

  async onHeartcoinsEarned(userId: string, amount: number): Promise<string[]> {
    return this.checkAndAwardBadges({
      userId,
      eventType: 'HEARTCOINS_EARNED',
      value: amount
    });
  }

  async onHeartcoinsSpent(userId: string, amount: number): Promise<string[]> {
    return this.checkAndAwardBadges({
      userId,
      eventType: 'HEARTCOINS_SPENT',
      value: amount
    });
  }

  async onProfileCreated(userId: string): Promise<string[]> {
    return this.checkAndAwardBadges({
      userId,
      eventType: 'PROFILE_CREATED'
    });
  }

  async onLoginStreak(userId: string, streakDays: number): Promise<string[]> {
    return this.checkAndAwardBadges({
      userId,
      eventType: 'LOGIN_STREAK',
      value: streakDays
    });
  }

  async onLiveEventAttend(userId: string): Promise<string[]> {
    return this.checkAndAwardBadges({
      userId,
      eventType: 'LIVE_EVENTS'
    });
  }

  async onMerchPurchase(userId: string): Promise<string[]> {
    return this.checkAndAwardBadges({
      userId,
      eventType: 'MERCH_PURCHASES'
    });
  }

  async onFriendInvite(userId: string): Promise<string[]> {
    return this.checkAndAwardBadges({
      userId,
      eventType: 'FRIENDS_INVITED'
    });
  }
}

export const badgeUnlockSystem = BadgeUnlockSystem.getInstance();

// Example usage in quest completion:
export async function handleQuestCompletion(userId: string, questType: string) {
  const badges = await badgeUnlockSystem.onDailyQuestComplete(userId);
  
  if (badges.length > 0) {
    // Show badge notification
    console.log('New badges unlocked:', badges);
    // You could trigger a toast notification here
  }
}

// Example usage in soul journal:
export async function handleSoulJournalEntry(userId: string) {
  const badges = await badgeUnlockSystem.onSoulJournalEntry(userId);
  
  if (badges.length > 0) {
    console.log('New soul star badges unlocked:', badges);
  }
}