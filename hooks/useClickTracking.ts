"use client";

import { useEffect } from "react";
import { trackClick, generateClickId, storeClickData, type ClickData } from "../lib/analytics";

// Enhanced element identification function
function identifyElement(element: HTMLElement): string {
  const text = element.textContent?.toLowerCase().trim() || '';
  const className = String(element.className || '').toLowerCase();
  const href = element.getAttribute('href')?.toLowerCase() || '';
  const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
  const title = element.getAttribute('title')?.toLowerCase() || '';
  const tagName = element.tagName.toLowerCase();

  // Social Media Buttons
  if (text.includes('instagram') || href.includes('instagram') || className.includes('instagram') || title.includes('instagram')) {
    return '📱 Instagram';
  }
  if (text.includes('tiktok') || href.includes('tiktok') || className.includes('tiktok') || title.includes('tiktok')) {
    return '📱 TikTok';
  }
  if (text.includes('youtube') || href.includes('youtube') || className.includes('youtube') || title.includes('youtube')) {
    return '📱 YouTube';
  }
  if (text.includes('spotify') || href.includes('spotify') || className.includes('spotify') || title.includes('spotify')) {
    return '🎵 Spotify';
  }
  if ((text.includes('apple') && (text.includes('music') || href.includes('music'))) || href.includes('apple') || className.includes('apple') || title.includes('apple')) {
    return '🎵 Apple Music';
  }

  // Control Buttons
  if (text.includes('power') || className.includes('power') || ariaLabel.includes('power') || title.includes('power')) {
    return '⚡ Power Button';
  }
  if (text.includes('join') || className.includes('join') || title.includes('join') || text.includes('alien')) {
    return '🚀 Join Aliens';
  }
  if (text.includes('comms') || className.includes('comms') || title.includes('comms')) {
    return '📡 Comms Hub';
  }
  if ((text.includes('start') || className.includes('start')) && !text.includes('music')) {
    return '🎮 Start Button';
  }
  if (text.includes('play') || text.includes('pause') || className.includes('wheel-play') || className.includes('play')) {
    return '▶️ Play/Pause';
  }

  // Song/Music Related
  if (text.includes('ocean girl') || text.includes('oceangirl') || href.includes('ocean-girl')) {
    if (text.includes('collect') || className.includes('collect') || className.includes('btn-ocean')) {
      return '🎴 Collect Card: Ocean Girl';
    }
    if (tagName === 'img' || className.includes('cover')) {
      return '🖼️ Cover Art: Ocean Girl';
    }
    return '🎧 Song: Ocean Girl';
  }

  // Generic collect card
  if (text.includes('collect card') || className.includes('collect') || className.includes('btn-ocean')) {
    return '🎴 Collect Card';
  }

  // Cover art (generic)
  if (tagName === 'img' && (className.includes('cover') || className.includes('album'))) {
    return '🖼️ Cover Art';
  }

  // Analytics buttons
  if (text.includes('analytics') || className.includes('analytics')) {
    return '📊 Analytics';
  }

  // Default fallback
  if (text) {
    return `${tagName}: ${text.slice(0, 30)}${text.length > 30 ? '...' : ''}`;
  }
  if (className) {
    return `${tagName}.${className.split(' ')[0]}`;
  }
  return tagName;
}

export function useClickTracking() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target || !target.tagName || typeof target.tagName !== 'string') return;

      // Skip tracking for certain elements if needed
      if (target.closest('[data-no-track]')) return;

      // Enhanced element identification
      const enhancedLabel = identifyElement(target);
      
      const clickData: ClickData = {
        id: generateClickId(),
        timestamp: Date.now(),
        element: {
          tagName: target.tagName.toLowerCase(),
          className: String(target.className || ""),
          id: target.id || "",
          textContent: target.textContent?.trim().slice(0, 100) || "",
          href: target.getAttribute('href') || undefined,
          role: target.getAttribute('role') || undefined,
          ariaLabel: target.getAttribute('aria-label') || undefined,
        },
        position: {
          x: event.clientX,
          y: event.clientY,
          screenX: event.screenX,
          screenY: event.screenY,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        page: {
          url: window.location.href,
          title: document.title,
        },
        userAgent: navigator.userAgent,
        enhancedLabel,
      };

      // Store locally for dashboard
      storeClickData(clickData);
      // Send to server for analytics
      trackClick(clickData);
    }

    // Add global click listener
    document.addEventListener('click', handleClick, { capture: true });

    // Cleanup
    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, []);
}