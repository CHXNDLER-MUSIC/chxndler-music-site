"use client";

import React from "react";

/**
 * ⚠️ 3D SYSTEM TEMPORARILY DISABLED
 * 
 * This component has been temporarily disabled to remove React Three Fiber and 3D rendering.
 * The original 3D Heartverse planet system has been replaced with a no-op component that returns null.
 * 
 * To re-enable the 3D system:
 * 1. Set ENABLE_HEARTVERSE_3D = true in config/features.ts
 * 2. Restore the original implementation from git history
 * 3. Ensure React Three Fiber dependencies are installed
 */

interface HeartverseSystemWrapperProps {
  showAll?: boolean;
  hideUntilPlaying?: boolean;
  onSongClick?: (songId: string) => void;
}

export default function HeartverseSystemWrapper({ 
  showAll = false, 
  hideUntilPlaying = false,
  onSongClick
}: HeartverseSystemWrapperProps) {
  // Return null to completely disable 3D rendering
  // No React Three Fiber Canvas, no planet system, no 3D dependencies
  return null;
}