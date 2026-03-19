"use client";

import { useState, useEffect, useCallback } from 'react';
import { chatService } from '@/lib/supabase/chat';

/**
 * Hook to track CHXNDLER's live streaming status
 * Currently checks Supabase profile flag only.
 */
export function useLiveStatus() {
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  /**
   * Check live status from multiple sources
   */
  const checkLiveStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Method 1: Check Supabase profile flag
      const supabaseStatus = await chatService.checkLiveStatus();
      
      // External live providers are not queried here.
      
      // For now, use Supabase status
      // You can combine multiple sources here
      setIsLive(supabaseStatus);
      setLastChecked(new Date());
      
    } catch (err) {
      console.error('Error checking live status:', err);
      setError(err.message || 'Failed to check live status');
      // Default to false on error
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Twitch API integration removed.

  /**
   * Manually refresh the live status
   */
  const refreshStatus = useCallback(() => {
    checkLiveStatus();
  }, [checkLiveStatus]);

  /**
   * Toggle live status (admin function for testing)
   */
  const toggleLiveStatus = useCallback(async () => {
    try {
      // This would require an admin endpoint to update the Supabase profile
      const response = await fetch('/api/admin/toggle-live-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await checkLiveStatus();
      }
    } catch (error) {
      console.error('Error toggling live status:', error);
    }
  }, [checkLiveStatus]);

  // Check status on mount and set up polling
  useEffect(() => {
    checkLiveStatus();

    // Poll every 2 minutes to check live status
    const interval = setInterval(() => {
      checkLiveStatus();
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [checkLiveStatus]);

  // Return hook interface
  return {
    isLive,
    loading,
    error,
    lastChecked,
    refreshStatus,
    checkLiveStatus,
    toggleLiveStatus, // For admin/testing
    
    // Computed values
    canOpenChat: isLive && !loading && !error,
    statusText: loading 
      ? 'Checking live status...' 
      : error 
        ? 'Error checking status'
        : isLive 
          ? 'CHXNDLER is live! 🔴'
          : 'Chat will open when CHXNDLER goes live',
    
    // Utility functions
    getTimeUntilNextCheck: () => {
      if (!lastChecked) return null;
      const nextCheck = new Date(lastChecked.getTime() + (2 * 60 * 1000));
      const timeUntil = nextCheck.getTime() - Date.now();
      return Math.max(0, Math.floor(timeUntil / 1000));
    }
  };
}

/**
 * Simplified hook just for checking if chat should be enabled
 */
export function useChatEnabled() {
  const { isLive, loading, error } = useLiveStatus();
  return {
    chatEnabled: isLive && !loading && !error,
    loading,
    error
  };
}
