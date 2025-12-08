"use client";

import React from "react";

/**
 * ⚠️ 3D PLANET COMPONENT TEMPORARILY DISABLED
 * 
 * This component has been temporarily disabled to remove React Three Fiber and 3D planet rendering.
 * The original implementation included:
 * - Complex 3D mesh geometry and materials
 * - React Three Fiber hooks (useFrame, useLoader, etc.)
 * - Three.js textures, lighting, and effects
 * - Planet orbital mechanics and animations
 * - depthFactor and other 3D-specific calculations
 * 
 * This no-op implementation prevents:
 * - "depthFactor is not defined" runtime errors
 * - React Three Fiber import errors
 * - Three.js dependency issues
 * - 3D rendering overhead
 * 
 * To re-enable: restore the original implementation from git history
 */

interface PlanetProps {
  song?: any;
  isMain?: boolean;
  isHover?: boolean;
  isMoon?: boolean;
  isMuted?: boolean;
  ringBaseOverride?: number;
  isHighlighted?: boolean;
  [key: string]: any; // Accept any additional props
}

export function Planet(props: PlanetProps) {
  // Return null to completely disable 3D planet rendering
  // No mesh, no materials, no Three.js, no depthFactor usage
  return null;
}

export default Planet;