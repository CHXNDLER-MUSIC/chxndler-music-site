"use client";

import { useState, useEffect, useCallback } from 'react';
import { chatService } from '@/lib/supabase/chat';

/**
 * Hook to track CHXNDLER's live streaming status
 * Checks both Supabase profile flag and can integrate with Twitch API
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
      
      // Method 2: Optionally check Twitch API (if you have client ID)
      // const twitchStatus = await checkTwitchAPI();
      
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

  /**
   * Optional: Check Twitch API directly
   * Requires NEXT_PUBLIC_TWITCH_CLIENT_ID in your .env.local
   */
  const checkTwitchAPI = useCallback(async () => {
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const username = 'chxndlerthealien'; // Your Twitch username
    
    if (!clientId) {
      if (process.env.NODE_ENV !== "production") console.warn('Twitch client ID not configured');
      return false;
    }

    try {
      // Get app access token
      const tokenResponse = await fetch(`https://id.twitch.tv/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: process.env.NEXT_PUBLIC_TWITCH_CLIENT_SECRET || '',
          grant_type: 'client_credentials'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get Twitch token');
      }

      const { access_token } = await tokenResponse.json();

      // Check if user is live
      const streamResponse = await fetch(`https://api.twitch.tv/helix/streams?user_login=${username}`, {
        headers: {
          'Client-Id': clientId,
          'Authorization': `Bearer ${access_token}`
        }
      });

      if (!streamResponse.ok) {
        throw new Error('Failed to check Twitch stream status');
      }

      const streamData = await streamResponse.json();
      return streamData.data && streamData.data.length > 0;

    } catch (error) {
      console.error('Error checking Twitch API:', error);
      return false;
    }
  }, []);

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