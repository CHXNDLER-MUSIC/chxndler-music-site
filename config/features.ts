// Feature flags for CHXNDLER music site
// This file controls which features are enabled/disabled globally

/**
 * TEMPORARY 3D SYSTEM SHUTDOWN
 * 
 * The 3D Heartverse planet system was causing runtime errors:
 * - "Cannot read properties of undefined (reading 'ReactCurrentOwner')" from React Three Fiber
 * - "Uncaught ReferenceError: depthFactor is not defined" in Planet.tsx
 * - App crashes preventing Start button interaction
 * 
 * Set ENABLE_HEARTVERSE_3D = true to re-enable the 3D system when ready.
 * When false, no React Three Fiber Canvas will be created and no 3D components will mount.
 */
export const ENABLE_HEARTVERSE_3D = false;

// Other feature flags can be added here as needed
export const ENABLE_ANALYTICS_DASHBOARD = true;
export const ENABLE_ADVANCED_AUDIO_CONTROLS = true;