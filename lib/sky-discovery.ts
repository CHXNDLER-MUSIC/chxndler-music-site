/**
 * Dynamic sky discovery system
 * Automatically detects available sky videos and matches them to tracks
 */

export type SkyVideoFile = {
  filename: string;
  path: string;
  slug: string;
  variant?: string; // e.g., 'acoustic', 'remix', 'dmvrco-remix'
};

export type SkyMapping = {
  key: string;
  webm: string;
  mp4: string;
  variant?: string;
};

/**
 * Available sky videos (currently none exist in /public/skies/, so using empty list)
 * This prevents 404 errors. Videos should be added here when actual files exist.
 * In a real implementation, this could be generated at build time from actual files.
 */
const AVAILABLE_SKY_VIDEOS: SkyVideoFile[] = [
  // No sky videos currently exist in /public/skies/
  // Add entries here when video files are actually uploaded to public/skies/
  // Example: { filename: 'space.mp4', path: '/skies/space.mp4', slug: 'space' },
];

/**
 * Parse a sky video filename to extract slug and variant
 */
export function parseSkySpoiler(filename: string): { slug: string; variant?: string } {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.(mp4|webm)$/i, '');
  
  // Common variants to detect
  const variants = [
    'acoustic',
    'remix', 
    'dmvrco-remix',
    'mickey-jas-remix',
    'bluma'
  ];
  
  // Check for variants at the end
  for (const variant of variants) {
    if (nameWithoutExt.endsWith(`-${variant}`)) {
      const slug = nameWithoutExt.slice(0, -(variant.length + 1));
      return { slug, variant };
    }
  }
  
  // No variant found, entire name is the slug
  return { slug: nameWithoutExt };
}

/**
 * Get all available sky videos grouped by slug
 */
export function getAvailableSkyVideos(): Record<string, SkyVideoFile[]> {
  const grouped: Record<string, SkyVideoFile[]> = {};
  
  for (const video of AVAILABLE_SKY_VIDEOS) {
    if (!grouped[video.slug]) {
      grouped[video.slug] = [];
    }
    grouped[video.slug].push(video);
  }
  
  return grouped;
}

/**
 * Find the best sky video for a given track slug
 * Prefers: exact match > starts with > any variant
 */
export function findSkyVideoForTrack(trackSlug: string, preferVariant?: string): SkyMapping | null {
  const availableVideos = getAvailableSkyVideos();
  
  // Direct slug match
  if (availableVideos[trackSlug]) {
    const videos = availableVideos[trackSlug];
    
    // If a specific variant is preferred, try to find it
    if (preferVariant) {
      const variantVideo = videos.find(v => v.variant === preferVariant);
      if (variantVideo) {
        return {
          key: `${trackSlug}-${preferVariant}-sky`,
          webm: '',
          mp4: variantVideo.path,
          variant: preferVariant
        };
      }
    }
    
    // Prefer main version (no variant) over variants
    const mainVideo = videos.find(v => !v.variant);
    if (mainVideo) {
      return {
        key: `${trackSlug}-sky`,
        webm: '',
        mp4: mainVideo.path
      };
    }
    
    // Fall back to first available variant
    const firstVideo = videos[0];
    return {
      key: `${trackSlug}-${firstVideo.variant || 'default'}-sky`,
      webm: '',
      mp4: firstVideo.path,
      variant: firstVideo.variant
    };
  }
  
  // Check for tracks that start with the slug (e.g., 'house-party' matches 'alien-house-party')
  for (const [slug, videos] of Object.entries(availableVideos)) {
    if (slug.startsWith(trackSlug) || trackSlug.startsWith(slug)) {
      const mainVideo = videos.find(v => !v.variant) || videos[0];
      return {
        key: `${slug}-sky`,
        webm: '',
        mp4: mainVideo.path,
        variant: mainVideo.variant
      };
    }
  }
  
  return null;
}

/**
 * Get all discovered sky mappings
 */
export function getAllDiscoveredSkyMappings(): Record<string, SkyMapping> {
  const mappings: Record<string, SkyMapping> = {};
  const availableVideos = getAvailableSkyVideos();
  
  for (const [slug, videos] of Object.entries(availableVideos)) {
    // Add main version
    const mainVideo = videos.find(v => !v.variant);
    if (mainVideo) {
      mappings[slug] = {
        key: `${slug}-sky`,
        webm: '',
        mp4: mainVideo.path
      };
    }
    
    // Add variants
    videos.filter(v => v.variant).forEach(video => {
      const key = `${slug}-${video.variant}`;
      mappings[key] = {
        key: `${slug}-${video.variant}-sky`,
        webm: '',
        mp4: video.path,
        variant: video.variant
      };
    });
  }
  
  return mappings;
}

/**
 * Check if a track has any available sky video
 */
export function hasAvailableSkyVideo(trackSlug: string): boolean {
  return findSkyVideoForTrack(trackSlug) !== null;
}

/**
 * Get statistics about sky video coverage
 */
export function getSkyVideoCoverage(trackSlugs: string[]): {
  total: number;
  covered: number;
  missing: string[];
  coverage: number;
} {
  const missing: string[] = [];
  let covered = 0;
  
  for (const slug of trackSlugs) {
    if (hasAvailableSkyVideo(slug)) {
      covered++;
    } else {
      missing.push(slug);
    }
  }
  
  return {
    total: trackSlugs.length,
    covered,
    missing,
    coverage: trackSlugs.length > 0 ? (covered / trackSlugs.length) * 100 : 0
  };
}
