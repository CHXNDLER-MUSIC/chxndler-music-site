type EventParams = Record<string, any>;

export interface ClickData {
  id: string;
  timestamp: number;
  element: {
    tagName: string;
    className: string;
    id: string;
    textContent: string;
    href?: string;
    role?: string;
    ariaLabel?: string;
  };
  position: {
    x: number;
    y: number;
    screenX: number;
    screenY: number;
  };
  viewport: {
    width: number;
    height: number;
  };
  page: {
    url: string;
    title: string;
  };
  userAgent: string;
  enhancedLabel?: string;
}

export function track(event: string, params: EventParams = {}) {
  // GA4
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", event, params);
  } else if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", event, params);
  }

  // Meta Pixel (trackCustom)
  if (typeof window !== "undefined" && (window as any).fbq) {
    try {
      (window as any).fbq("trackCustom", event, params);
    } catch {}
  }
}

function getEnhancedElementLabel(element: ClickData['element']): string {
  const text = element.textContent?.toLowerCase() || '';
  const className = element.className?.toLowerCase() || '';
  const href = element.href?.toLowerCase() || '';
  
  // Social media buttons
  if (text.includes('instagram') || href.includes('instagram') || className.includes('instagram')) return '📱 Instagram';
  if (text.includes('tiktok') || href.includes('tiktok') || className.includes('tiktok')) return '🎵 TikTok';
  if (text.includes('youtube') || href.includes('youtube') || className.includes('youtube')) return '▶️ YouTube';
  if (text.includes('spotify') || href.includes('spotify') || className.includes('spotify')) return '🎧 Spotify';
  if (text.includes('apple music') || href.includes('apple') || text.includes('apple')) return '🍎 Apple Music';
  
  // Navigation/Action buttons
  if (text.includes('comms') || className.includes('comms')) return '📡 Comms';
  if (text.includes('join aliens') || text.includes('join') || className.includes('join')) return '👽 Join Aliens';
  
  // Song interactions
  if (element.tagName === 'img' && (href || className.includes('cover'))) return '🎨 Album Cover';
  if (className.includes('song') || text.match(/\w+\s+\w+/) && element.tagName === 'button') return '🎵 Song Selection';
  
  // Default formatting
  let display = element.tagName;
  if (element.className) display += `.${element.className.split(' ')[0]}`;
  if (element.textContent && element.textContent.length > 0) {
    display += ` "${element.textContent.slice(0, 30)}"`;
  }
  return display;
}

export function trackClick(clickData: ClickData) {
  const enhancedLabel = getEnhancedElementLabel(clickData.element);
  
  // Send to existing analytics with enhanced labels
  track("click", {
    element_tag: clickData.element.tagName,
    element_class: clickData.element.className,
    element_text: clickData.element.textContent?.slice(0, 50),
    element_label: enhancedLabel,
    click_x: clickData.position.x,
    click_y: clickData.position.y,
    page_url: clickData.page.url,
  });

  // Store locally for dashboard
  storeClickData({ ...clickData, enhancedLabel });
}

function storeClickData(clickData: ClickData) {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem("click_analytics");
    const clicks: ClickData[] = stored ? JSON.parse(stored) : [];
    
    clicks.push(clickData);
    
    // Keep only last 1000 clicks to avoid storage bloat
    const maxClicks = 1000;
    if (clicks.length > maxClicks) {
      clicks.splice(0, clicks.length - maxClicks);
    }
    
    localStorage.setItem("click_analytics", JSON.stringify(clicks));
  } catch (error) {
    console.warn("[analytics] Failed to store click data:", error);
  }
}

export function getClickAnalytics(): ClickData[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem("click_analytics");
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn("[analytics] Failed to retrieve click data:", error);
    return [];
  }
}

export function clearClickAnalytics(): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem("click_analytics");
  } catch (error) {
    console.warn("[analytics] Failed to clear click data:", error);
  }
}

export function generateClickId(): string {
  return `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
