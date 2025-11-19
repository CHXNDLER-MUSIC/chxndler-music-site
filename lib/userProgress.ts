// User progress tracking for badges and streaks

import { UserProgress, Element, AchievementType, checkStreakBadgeUnlock, checkAchievementBadgeUnlock } from './badges';

const STORAGE_KEY = 'heartverse_user_progress';

// Default user progress
export const defaultUserProgress: UserProgress = {
  currentStreak: 0,
  longestStreak: 0,
  element: 'fire', // Default element
  achievements: {
    first_listen: false,
    first_soul_sky: false,
    first_card_purchase: false,
    first_livestream: false,
    first_show: false,
    first_merch: false
  },
  lastVisit: undefined
};

// Load user progress from localStorage
export function loadUserProgress(): UserProgress {
  try {
    if (typeof window === 'undefined') return defaultUserProgress;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultUserProgress;
    
    const parsed = JSON.parse(stored);
    
    // Convert lastVisit back to Date object if it exists
    if (parsed.lastVisit) {
      parsed.lastVisit = new Date(parsed.lastVisit);
    }
    
    // Merge with default to ensure all properties exist
    return {
      ...defaultUserProgress,
      ...parsed
    };
  } catch (error) {
    console.error('Failed to load user progress:', error);
    return defaultUserProgress;
  }
}

// Save user progress to localStorage
export function saveUserProgress(progress: UserProgress): void {
  try {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save user progress:', error);
  }
}

// Update streak based on current visit
export function updateStreak(progress: UserProgress): { 
  updatedProgress: UserProgress; 
  newBadges: any[]; 
  streakBroken: boolean; 
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let updatedProgress = { ...progress };
  let streakBroken = false;
  
  if (!progress.lastVisit) {
    // First visit ever
    updatedProgress.currentStreak = 1;
    updatedProgress.longestStreak = 1;
    updatedProgress.lastVisit = now;
  } else {
    const lastVisitDate = new Date(
      progress.lastVisit.getFullYear(), 
      progress.lastVisit.getMonth(), 
      progress.lastVisit.getDate()
    );
    
    const daysDifference = Math.floor((today.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference === 0) {
      // Same day visit - no streak change
      updatedProgress.lastVisit = now;
    } else if (daysDifference === 1) {
      // Consecutive day - increment streak
      updatedProgress.currentStreak += 1;
      updatedProgress.longestStreak = Math.max(updatedProgress.longestStreak, updatedProgress.currentStreak);
      updatedProgress.lastVisit = now;
    } else {
      // Streak broken - reset to 1
      streakBroken = updatedProgress.currentStreak > 0;
      updatedProgress.currentStreak = 1;
      updatedProgress.lastVisit = now;
    }
  }
  
  // Check for newly unlocked badges
  const newBadges = checkStreakBadgeUnlock(updatedProgress);
  
  // Save updated progress
  saveUserProgress(updatedProgress);
  
  return {
    updatedProgress,
    newBadges,
    streakBroken
  };
}

// Set user's element
export function setUserElement(element: Element): UserProgress {
  const progress = loadUserProgress();
  const updatedProgress = {
    ...progress,
    element
  };
  saveUserProgress(updatedProgress);
  return updatedProgress;
}

// Unlock achievement
export function unlockAchievement(achievementType: AchievementType): { 
  updatedProgress: UserProgress; 
  newBadge: any | null; 
  alreadyUnlocked: boolean; 
} {
  const progress = loadUserProgress();
  
  // Check if already unlocked
  if (progress.achievements[achievementType]) {
    return {
      updatedProgress: progress,
      newBadge: null,
      alreadyUnlocked: true
    };
  }
  
  // Unlock the achievement
  const updatedProgress = {
    ...progress,
    achievements: {
      ...progress.achievements,
      [achievementType]: true
    }
  };
  
  // Check for newly unlocked badge
  const newBadge = checkAchievementBadgeUnlock(achievementType);
  
  // Save updated progress
  saveUserProgress(updatedProgress);
  
  return {
    updatedProgress,
    newBadge,
    alreadyUnlocked: false
  };
}

// Get current streak info
export function getStreakInfo(progress?: UserProgress): {
  currentStreak: number;
  longestStreak: number;
  daysUntilNextBadge: number;
  nextBadgeName: string;
} {
  const userProgress = progress || loadUserProgress();
  
  // Find next streak milestone
  const streakMilestones = [1, 3, 7, 14, 21, 30, 60, 90, 120, 180, 270, 365];
  const nextMilestone = streakMilestones.find(milestone => milestone > userProgress.currentStreak);
  
  return {
    currentStreak: userProgress.currentStreak,
    longestStreak: userProgress.longestStreak,
    daysUntilNextBadge: nextMilestone ? nextMilestone - userProgress.currentStreak : 0,
    nextBadgeName: nextMilestone ? `${nextMilestone} Day Badge` : 'Max Badge Earned'
  };
}

// Reset progress (for testing or user request)
export function resetUserProgress(): UserProgress {
  const fresh = { ...defaultUserProgress };
  saveUserProgress(fresh);
  return fresh;
}

// Export for debugging
export function exportUserProgress(): string {
  const progress = loadUserProgress();
  return JSON.stringify(progress, null, 2);
}

// Import progress (for syncing across devices)
export function importUserProgress(progressJson: string): boolean {
  try {
    const progress = JSON.parse(progressJson);
    
    // Validate the structure
    if (!progress || typeof progress !== 'object') {
      throw new Error('Invalid progress format');
    }
    
    // Convert dates
    if (progress.lastVisit) {
      progress.lastVisit = new Date(progress.lastVisit);
    }
    
    // Merge with defaults and save
    const validatedProgress = {
      ...defaultUserProgress,
      ...progress
    };
    
    saveUserProgress(validatedProgress);
    return true;
  } catch (error) {
    console.error('Failed to import progress:', error);
    return false;
  }
}