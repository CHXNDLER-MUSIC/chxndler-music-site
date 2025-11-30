import { supabase } from './supabase';
import { Badge, UserBadge, BadgeWithProgress } from '../types/badges';

export class SupabaseBadgeService {
  
  static async getAllBadges(): Promise<Badge[]> {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching badges:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching badges:', error);
      return [];
    }
  }

  static async getBadgesByCategory(category: string): Promise<Badge[]> {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .ilike('requirement', `%${category}%`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching badges by category:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching badges by category:', error);
      return [];
    }
  }

  static async getUserBadges(userId: string): Promise<UserBadge[]> {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badge:badge_id (*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) {
        console.error('Error fetching user badges:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching user badges:', error);
      return [];
    }
  }

  static async awardBadge(userId: string, badgeId: string): Promise<boolean> {
    try {
      const existingBadge = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_id', badgeId)
        .single();

      if (existingBadge.data) {
        return true;
      }

      const { error } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badgeId,
          earned_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error awarding badge:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception awarding badge:', error);
      return false;
    }
  }

  static async createBadge(badge: Omit<Badge, 'id' | 'created_at'>): Promise<Badge | null> {
    try {
      const { data, error } = await supabase
        .from('badges')
        .insert([badge])
        .select()
        .single();

      if (error) {
        console.error('Error creating badge:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception creating badge:', error);
      return null;
    }
  }

  static async getBadgesWithProgress(userId?: string): Promise<BadgeWithProgress[]> {
    try {
      const badges = await this.getAllBadges();
      let userBadges: UserBadge[] = [];

      if (userId) {
        userBadges = await this.getUserBadges(userId);
      }

      const userBadgeIds = new Set(userBadges.map(ub => ub.badge_id));

      return badges.map(badge => ({
        ...badge,
        unlocked: userBadgeIds.has(badge.id),
        progress: this.calculateProgress(badge, userId),
        current: 0,
        total: this.getBadgeRequirement(badge)
      }));
    } catch (error) {
      console.error('Exception getting badges with progress:', error);
      return [];
    }
  }

  private static calculateProgress(badge: Badge, userId?: string): number {
    if (!userId) return 0;
    
    return Math.floor(Math.random() * 100);
  }

  private static getBadgeRequirement(badge: Badge): number {
    const requirement = badge.requirement?.toLowerCase() || '';
    
    const numberMatch = requirement.match(/(\d+)/);
    if (numberMatch) {
      return parseInt(numberMatch[1]);
    }
    
    return 1;
  }

  static async getBadgesByCategories(): Promise<{ [category: string]: BadgeWithProgress[] }> {
    try {
      const badges = await this.getBadgesWithProgress();
      
      const categories: { [key: string]: BadgeWithProgress[] } = {
        'soul-star': [],
        'achievements': [],
        'elemental-streak': [],
        'listening': [],
        'heartcoin': [],
        'community': []
      };

      badges.forEach(badge => {
        const requirement = badge.requirement?.toLowerCase() || '';
        const badgeName = badge.badge_name.toLowerCase();
        const description = badge.description?.toLowerCase() || '';

        if (badgeName.includes('soul') || requirement.includes('reflection')) {
          categories['soul-star'].push(badge);
        } else if (badgeName.includes('listen') || badgeName.includes('track') || badgeName.includes('song')) {
          categories['listening'].push(badge);
        } else if (badgeName.includes('streak') || requirement.includes('days')) {
          categories['elemental-streak'].push(badge);
        } else if (badgeName.includes('heart') && badgeName.includes('coin')) {
          categories['heartcoin'].push(badge);
        } else if (badgeName.includes('community') || badgeName.includes('invite') || badgeName.includes('follow')) {
          categories['community'].push(badge);
        } else {
          categories['achievements'].push(badge);
        }
      });

      return categories;
    } catch (error) {
      console.error('Exception getting badges by categories:', error);
      return {};
    }
  }

  static async initializeDefaultBadges(): Promise<void> {
    try {
      const existingBadges = await this.getAllBadges();
      if (existingBadges.length > 0) {
        return;
      }

      const defaultBadges = [
        {
          badge_name: 'First Listen',
          description: 'Listened to your first track in the Heartverse',
          requirement: 'Listen to 1 track',
          icon_url: '/badges/listening.webp'
        },
        {
          badge_name: 'Soul Star',
          description: 'First reflection',
          requirement: '1 reflection',
          icon_url: null
        },
        {
          badge_name: 'Deep Listener',
          description: 'Listened to 10 unique tracks',
          requirement: '10 unique tracks',
          icon_url: '/badges/listening.webp'
        },
        {
          badge_name: 'Digital Collector',
          description: 'Collected your first 5 digital cards',
          requirement: 'Collect 5 cards',
          icon_url: '/badges/collector.webp'
        },
        {
          badge_name: 'First HeartCoin',
          description: 'Earned your first HeartCoin',
          requirement: 'Earn 1 HeartCoin',
          icon_url: '/badges/currency.webp'
        },
        {
          badge_name: 'Portal Opener',
          description: 'Invited your first friend to the Heartverse',
          requirement: 'Invite 1 friend',
          icon_url: null
        }
      ];

      for (const badge of defaultBadges) {
        await this.createBadge(badge);
      }

    } catch (error) {
      console.error('Exception initializing default badges:', error);
    }
  }
}

export default SupabaseBadgeService;