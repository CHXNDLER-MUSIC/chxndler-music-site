/**
 * Build per-track sky paths with safe fallbacks based on assets we actually ship.
 * Now uses dynamic discovery to automatically detect available sky videos.
 */

import { findSkyVideoForTrack, getAllDiscoveredSkyMappings, getSkyVideoCoverage } from './sky-discovery';

// Sky verification system
type SkyVideoInfo = {
  key: string;
  webm: string;
  mp4: string;
  youtubeUrl?: string;
};

type VerificationResult = {
  hasMatchingSky: boolean;
  skyKey: string;
  videoPath: string;
  isDefault: boolean;
};
export function skyFor(slug?: string) {
  // Safe fallback when no sky videos exist - return empty paths to avoid 404s
  const DEFAULT_FALLBACK = { key: "space-sky", webm: "", mp4: "" };
  
  if (!slug) return DEFAULT_FALLBACK;
  
  // Special mapping for space-music to use space-sky (YouTube embed)
  if (slug === "space-music") {
    return { key: "space-sky", webm: "", mp4: "", youtubeUrl: "https://youtu.be/gHDxkhQ4FbY" };
  }
  
  try {
    // Try dynamic discovery first
    const discoveredSky = findSkyVideoForTrack(slug);
    // dev logging removed
    if (discoveredSky && discoveredSky.mp4) {
      return {
        key: discoveredSky.key,
        webm: discoveredSky.webm || "",
        mp4: discoveredSky.mp4
      };
    }
    
    // Legacy fallbacks for specific patterns that might not match exactly
    if (slug.startsWith("house-party")) {
      const alienHouseSky = findSkyVideoForTrack("alien-house-party");
      if (alienHouseSky && alienHouseSky.mp4) {
        return {
          key: alienHouseSky.key,
          webm: alienHouseSky.webm || "",
          mp4: alienHouseSky.mp4
        };
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.warn('Error in dynamic sky discovery for slug:', slug, error);
  }
  
  // Final fallback - no video to avoid 404s
  return DEFAULT_FALLBACK;
}

// Use the lightspeed warp as the initial looping sky
// Use YouTube-based lightspeed overlay by default; avoid 404 for missing local mp4
export const introSky = { key: "lightspeed", webm: "", mp4: "" };

/**
 * Verifies if a track has a corresponding sky video
 */
export function verifySkyForTrack(slug: string): VerificationResult {
  const sky = skyFor(slug);
  const isDefault = sky.key === "space-sky";
  
  return {
    hasMatchingSky: !isDefault,
    skyKey: sky.key,
    videoPath: sky.mp4 || sky.webm,
    isDefault
  };
}

/**
 * Verifies all tracks using dynamic discovery and logs missing sky videos
 * Returns a summary of verification results
 */
export function verifyAllTrackSkies(tracks: Array<{ slug: string; title: string }>): {
  total: number;
  withCustomSky: number;
  usingDefault: number;
  missingSkies: Array<{ slug: string; title: string; expectedPath: string }>;
} {
  // Use dynamic discovery for coverage analysis
  const coverage = getSkyVideoCoverage(tracks.map(t => t.slug));
  
  const results = tracks.map(track => ({
    track,
    verification: verifySkyForTrack(track.slug)
  }));
  
  const missingSkies = coverage.missing.map(slug => {
    const track = tracks.find(t => t.slug === slug);
    return {
      slug,
      title: track?.title || slug,
      expectedPath: `/skies/${slug}.mp4`
    };
  });
  
  const summary = {
    total: tracks.length,
    withCustomSky: coverage.covered,
    usingDefault: coverage.missing.length,
    missingSkies
  };
  
  // Log results in development only when debug is enabled
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' &&
      (typeof (window as any).__CHX_DEBUG !== 'undefined' ? !!(window as any).__CHX_DEBUG : (process.env.NEXT_PUBLIC_MEDIA_DEBUG === '1'))) {
    console.group('🎬 Sky Video Verification (Dynamic Discovery)');
    // console output removed
    
    // Show discovered mappings
    const discoveredMappings = getAllDiscoveredSkyMappings();
    console.group(`🗺️  Discovered ${Object.keys(discoveredMappings).length} sky mappings:`);
    Object.entries(discoveredMappings).forEach(([key, mapping]) => {
      // console output removed
    });
    console.groupEnd();
    
    if (summary.missingSkies.length > 0) {
      console.group('❌ Missing sky videos:');
      summary.missingSkies.forEach(missing => {
        // console output removed
      });
      console.groupEnd();
    } else {
      // console output removed
    }
    
    console.groupEnd();
  }
  
  return summary;
}

/**
 * Gets all available sky video mappings for debugging (now uses dynamic discovery)
 */
export function getAllSkyMappings(): Record<string, SkyVideoInfo> {
  const discoveredMappings = getAllDiscoveredSkyMappings();
  const result: Record<string, SkyVideoInfo> = {};
  
  // Convert discovered mappings to the expected format
  Object.entries(discoveredMappings).forEach(([key, mapping]) => {
    result[key] = {
      key: mapping.key,
      webm: mapping.webm,
      mp4: mapping.mp4
    };
  });
  
  // Ensure space sky is always available as fallback (YouTube embed)
  result['space'] = { key: "space-sky", webm: "", mp4: "", youtubeUrl: "https://youtu.be/gHDxkhQ4FbY" };
  
  return result;
}
