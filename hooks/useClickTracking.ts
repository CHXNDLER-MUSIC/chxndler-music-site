"use client";

import { useEffect } from "react";
import { trackClick, generateClickId, type ClickData } from "../lib/analytics";

export function useClickTracking() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target || !target.tagName || typeof target.tagName !== 'string') return;

      // Skip tracking for certain elements if needed
      if (target.closest('[data-no-track]')) return;

      const clickData: ClickData = {
        id: generateClickId(),
        timestamp: Date.now(),
        element: {
          tagName: target.tagName.toLowerCase(),
          className: target.className || "",
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
      };

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