"use client";

import { track } from "./analytics";

// Secure analytics that sends data to your backend instead of storing locally
export class SecureAnalytics {
  private static instance: SecureAnalytics;
  private apiEndpoint: string;
  private isEnabled: boolean;

  constructor() {
    this.apiEndpoint = process.env.NEXT_PUBLIC_ANALYTICS_API || '/api/analytics';
    this.isEnabled = typeof window !== 'undefined';
  }

  static getInstance(): SecureAnalytics {
    if (!SecureAnalytics.instance) {
      SecureAnalytics.instance = new SecureAnalytics();
    }
    return SecureAnalytics.instance;
  }

  // Send analytics to secure backend
  async trackSecure(event: string, data: Record<string, any>) {
    if (!this.isEnabled) return;

    try {
      // Still call the original track function for immediate analytics (GA4, etc.)
      track(event, data);

      // Send to secure backend
      const payload = {
        event,
        data,
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
      };

      // Use fetch to send to your backend
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // Silently fail - don't interrupt user experience
      console.warn('[SecureAnalytics] Failed to send event:', error);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('secure_session_id');
    if (!sessionId) {
      sessionId = `secure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('secure_session_id', sessionId);
    }
    return sessionId;
  }

  // Batch send multiple events (more efficient)
  async trackBatch(events: Array<{ event: string; data: Record<string, any> }>) {
    if (!this.isEnabled || events.length === 0) return;

    try {
      const payload = {
        events: events.map(({ event, data }) => ({
          event,
          data,
          timestamp: Date.now(),
          sessionId: this.getSessionId(),
        })),
        metadata: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          referrer: document.referrer,
        },
      };

      await fetch(`${this.apiEndpoint}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn('[SecureAnalytics] Failed to send batch events:', error);
    }
  }
}

// Convenience functions
export const secureAnalytics = SecureAnalytics.getInstance();

export function trackSecure(event: string, data: Record<string, any> = {}) {
  return secureAnalytics.trackSecure(event, data);
}

export function trackMusicSecure(event: string, songData: {
  song_id?: string;
  song_title?: string;
  song_icon?: string;
  cover_src?: string;
  hover_method?: string;
}) {
  return secureAnalytics.trackSecure(event, songData);
}