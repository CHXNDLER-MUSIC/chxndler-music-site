// Badge management utilities for the application

import { AchievementType, Element, Badge } from './badges';
import { unlockAchievement, setUserElement, loadUserProgress, updateStreak } from './userProgress';

// Global badge manager for easy access throughout the app
export class BadgeManager {
  private static instance: BadgeManager;
  private unlockQueue: Badge[] = [];
  private showNotificationCallback?: (badge: Badge) => void;

  static getInstance(): BadgeManager {
    if (!BadgeManager.instance) {
      BadgeManager.instance = new BadgeManager();
    }
    return BadgeManager.instance;
  }

  // Set callback for showing badge unlock notifications
  setNotificationCallback(callback: (badge: Badge) => void): void {
    this.showNotificationCallback = callback;
  }

  // Check and potentially unlock achievement
  unlockAchievement(type: AchievementType): void {
    const result = unlockAchievement(type);
    
    if (result.newBadge && !result.alreadyUnlocked) {
      this.queueNotification(result.newBadge);
    }
  }

  // Update user's element
  setElement(element: Element): void {
    setUserElement(element);
    // Re-check element-based streak badges
    this.checkStreakBadges();
  }

  // Check streak badges (called on daily visit)
  checkStreakBadges(): void {
    const progress = loadUserProgress();
    const { newBadges } = updateStreak(progress);
    
    newBadges.forEach(badge => {
      this.queueNotification(badge);
    });
  }

  // Queue a badge notification
  private queueNotification(badge: Badge): void {
    this.unlockQueue.push(badge);
    
    if (this.showNotificationCallback) {
      // Show notification immediately if callback is set
      this.showNotificationCallback(badge);
    }
  }

  // Get pending notifications
  getPendingNotifications(): Badge[] {
    return [...this.unlockQueue];
  }

  // Clear notifications queue
  clearNotifications(): void {
    this.unlockQueue = [];
  }

  // Convenience methods for common achievements
  onFirstListen(): void {
    this.unlockAchievement('first_listen');
  }

  onFirstSoulSky(): void {
    this.unlockAchievement('first_soul_sky');
  }

  onFirstCardPurchase(): void {
    this.unlockAchievement('first_card_purchase');
  }

  onFirstLivestream(): void {
    this.unlockAchievement('first_livestream');
  }

  onFirstShow(): void {
    this.unlockAchievement('first_show');
  }

  onFirstMerch(): void {
    this.unlockAchievement('first_merch');
  }

  // Get current user stats for display
  getUserStats(): {
    currentStreak: number;
    longestStreak: number;
    element: Element;
    totalBadges: number;
    unlockedBadges: number;
    achievementsCompleted: number;
  } {
    const progress = loadUserProgress();
    const achievements = Object.values(progress.achievements);
    
    return {
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      element: progress.element,
      totalBadges: 0, // Will be calculated by badge component
      unlockedBadges: 0, // Will be calculated by badge component
      achievementsCompleted: achievements.filter(Boolean).length
    };
  }
}

// Export singleton instance
export const badgeManager = BadgeManager.getInstance();

// Hook for React components to use badge manager
export function useBadgeManager() {
  return badgeManager;
}

// Helper function to simulate achievements for testing
export function simulateAchievements() {
  console.log('🎵 Simulating first listen...');
  badgeManager.onFirstListen();
  
  setTimeout(() => {
    console.log('🌌 Simulating first SOUL Sky...');
    badgeManager.onFirstSoulSky();
  }, 2000);
  
  setTimeout(() => {
    console.log('🃏 Simulating first card purchase...');
    badgeManager.onFirstCardPurchase();
  }, 4000);
  
  setTimeout(() => {
    console.log('📺 Simulating first livestream...');
    badgeManager.onFirstLivestream();
  }, 6000);
}

// Helper function to simulate streak progress
export function simulateStreakProgress(days: number) {
  const progress = loadUserProgress();
  
  // Simulate visiting for multiple days
  for (let i = 0; i < days; i++) {
    const fakeDate = new Date();
    fakeDate.setDate(fakeDate.getDate() - (days - i - 1));
    
    // Manually update progress for simulation
    progress.currentStreak = i + 1;
    progress.longestStreak = Math.max(progress.longestStreak, progress.currentStreak);
    progress.lastVisit = fakeDate;
  }
  
  // Check for newly unlocked badges
  badgeManager.checkStreakBadges();
  
  console.log(`🔥 Simulated ${days} day streak!`);
}

// Debug function to reset all progress
export function resetAllProgress() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('heartverse_user_progress');
    console.log('🔄 All progress reset!');
    window.location.reload();
  }
}