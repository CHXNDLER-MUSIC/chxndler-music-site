"use client";

import React from "react";

/**
 * ⚠️ 3D PLANET SYSTEM TEMPORARILY DISABLED
 * 
 * This component has been temporarily disabled to remove React Three Fiber and all 3D planet rendering.
 * The original implementation included:
 * - React Three Fiber Canvas
 * - 3D planet meshes and materials
 * - Orbital mechanics and animations
 * - Three.js lighting and effects
 * 
 * This no-op implementation prevents:
 * - "depthFactor is not defined" errors
 * - React Three Fiber imports and dependencies
 * - 3D rendering overhead
 * - Console logs like "HOLO PLANETSYSTEM.TSX IS RENDERING!!!"
 * 
 * To re-enable: restore the original implementation from git history
 */

interface PlanetSystemProps {
  showAll?: boolean;
  hideUntilPlaying?: boolean;
}

export function PlanetSystem({ showAll, hideUntilPlaying }: PlanetSystemProps) {
  // Return null to completely disable 3D planet system
  // No Canvas, no planets, no React Three Fiber, no console logs
  return null;
}

export default PlanetSystem;