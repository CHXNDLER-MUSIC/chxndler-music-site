"use client";

import { track } from "./analytics";

export interface ABTestConfig {
  name: string;
  variants: string[];
  weights?: number[]; // Optional weights for variants (must sum to 1.0)
}

export interface ABTestAssignment {
  test: string;
  variant: string;
  timestamp: number;
  sessionId: string;
}

// Simple hash function for consistent variant assignment
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function getSessionId(): string {
  if (typeof window === "undefined") return 'server-session';
  
  let sessionId = sessionStorage.getItem('ab_session_id');
  if (!sessionId) {
    sessionId = `ab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('ab_session_id', sessionId);
  }
  return sessionId;
}

export function assignABTestVariant(config: ABTestConfig): string {
  const sessionId = getSessionId();
  const testKey = `ab_test_${config.name}`;
  
  // Check if user already has an assignment
  if (typeof window !== "undefined") {
    const existingAssignment = localStorage.getItem(testKey);
    if (existingAssignment) {
      try {
        const parsed: ABTestAssignment = JSON.parse(existingAssignment);
        return parsed.variant;
      } catch {
        // Invalid stored data, will reassign
      }
    }
  }
  
  // Assign variant using deterministic hash based on session ID
  const hash = simpleHash(sessionId + config.name);
  const hashRatio = (hash % 10000) / 10000; // 0.0000 to 0.9999
  
  let variant: string;
  if (config.weights && config.weights.length === config.variants.length) {
    // Use custom weights
    let cumulative = 0;
    for (let i = 0; i < config.variants.length; i++) {
      cumulative += config.weights[i];
      if (hashRatio <= cumulative) {
        variant = config.variants[i];
        break;
      }
    }
    variant = variant || config.variants[config.variants.length - 1];
  } else {
    // Equal distribution
    const variantIndex = Math.floor(hashRatio * config.variants.length);
    variant = config.variants[variantIndex];
  }
  
  // Store assignment
  const assignment: ABTestAssignment = {
    test: config.name,
    variant,
    timestamp: Date.now(),
    sessionId,
  };
  
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(testKey, JSON.stringify(assignment));
      
      // Also store in a master list
      const allTests = localStorage.getItem('ab_test_assignments');
      const assignments: ABTestAssignment[] = allTests ? JSON.parse(allTests) : [];
      
      // Remove old assignment for this test if exists
      const filteredAssignments = assignments.filter(a => a.test !== config.name);
      filteredAssignments.push(assignment);
      
      localStorage.setItem('ab_test_assignments', JSON.stringify(filteredAssignments));
    } catch {
      // Storage failed, continue with variant
    }
  }
  
  // Track assignment
  track("ab_test_assigned", {
    test_name: config.name,
    variant: variant,
    session_id: sessionId
  });
  
  return variant;
}

export function trackABTestConversion(testName: string, conversionType: string = 'default', value?: number) {
  const sessionId = getSessionId();
  const testKey = `ab_test_${testName}`;
  
  let variant = 'unknown';
  if (typeof window !== "undefined") {
    try {
      const assignment = localStorage.getItem(testKey);
      if (assignment) {
        const parsed: ABTestAssignment = JSON.parse(assignment);
        variant = parsed.variant;
      }
    } catch {
      // Failed to get assignment
    }
  }
  
  track("ab_test_conversion", {
    test_name: testName,
    variant: variant,
    conversion_type: conversionType,
    value: value,
    session_id: sessionId
  });
}

export function getAllABTestAssignments(): ABTestAssignment[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem('ab_test_assignments');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearABTestAssignments(): void {
  if (typeof window === "undefined") return;
  
  try {
    // Clear individual test assignments
    const assignments = getAllABTestAssignments();
    assignments.forEach(assignment => {
      localStorage.removeItem(`ab_test_${assignment.test}`);
    });
    
    // Clear master list
    localStorage.removeItem('ab_test_assignments');
    localStorage.removeItem('ab_session_id');
    sessionStorage.removeItem('ab_session_id');
  } catch {
    // Failed to clear
  }
}

// Example A/B tests for your music site
export const MUSIC_AB_TESTS = {
  COVER_ART_SIZE: {
    name: 'cover_art_size',
    variants: ['small', 'medium', 'large'],
    weights: [0.33, 0.34, 0.33] // Equal distribution
  },
  
  SONG_DROPDOWN_STYLE: {
    name: 'song_dropdown_style',
    variants: ['compact', 'expanded'],
    weights: [0.5, 0.5]
  },
  
  START_BUTTON_POSITION: {
    name: 'start_button_position',
    variants: ['center', 'right', 'left'],
    weights: [0.5, 0.3, 0.2]
  }
} as const;

// User flow tracking
export interface UserFlowEvent {
  step: string;
  timestamp: number;
  sessionId: string;
  metadata?: Record<string, any>;
}

export function trackUserFlowStep(step: string, metadata?: Record<string, any>) {
  const sessionId = getSessionId();
  
  const flowEvent: UserFlowEvent = {
    step,
    timestamp: Date.now(),
    sessionId,
    metadata
  };
  
  // Store in session flow
  if (typeof window !== "undefined") {
    try {
      const flowKey = 'user_flow_session';
      const existingFlow = sessionStorage.getItem(flowKey);
      const flow: UserFlowEvent[] = existingFlow ? JSON.parse(existingFlow) : [];
      
      flow.push(flowEvent);
      
      // Keep only last 50 steps per session
      if (flow.length > 50) {
        flow.splice(0, flow.length - 50);
      }
      
      sessionStorage.setItem(flowKey, JSON.stringify(flow));
    } catch {
      // Failed to store flow
    }
  }
  
  // Track event
  track("user_flow_step", {
    step: step,
    session_id: sessionId,
    ...metadata
  });
}

export function getUserFlowSession(): UserFlowEvent[] {
  if (typeof window === "undefined") return [];
  
  try {
    const flowKey = 'user_flow_session';
    const stored = sessionStorage.getItem(flowKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Common flow steps for your music site
export const USER_FLOW_STEPS = {
  SITE_LOADED: 'site_loaded',
  HUD_VIEWED: 'hud_viewed',
  SONG_DROPDOWN_OPENED: 'song_dropdown_opened',
  SONG_HOVERED: 'song_hovered',
  SONG_SELECTED: 'song_selected',
  COVER_ART_CLICKED: 'cover_art_clicked',
  COVER_ART_VIEWED: 'cover_art_viewed',
  CARD_FLIPPED: 'card_flipped',
  COLLECT_BUTTON_CLICKED: 'collect_button_clicked',
  MUSIC_STARTED: 'music_started',
  SESSION_END: 'session_end'
} as const;