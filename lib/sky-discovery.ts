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
 * Hardcoded list of available sky videos (for client-side usage)
 * In a real implementation, this could be generated at build time
 */
const AVAILABLE_SKY_VIDEOS: SkyVideoFile[] = [
  { filename: 'alien-house-party-acoustic.mp4', path: '/skies/alien-house-party-acoustic.mp4', slug: 'alien-house-party', variant: 'acoustic' },
  { filename: 'alien-house-party.mp4', path: '/skies/alien-house-party.mp4', slug: 'alien-house-party' },
  { filename: 'alone.mp4', path: '/skies/alone.mp4', slug: 'alone' },
  { filename: 'always-on-my-mind-remix.mp4', path: '/skies/always-on-my-mind-remix.mp4', slug: 'always-on-my-mind', variant: 'remix' },
  { filename: 'always-on-my-mind.mp4', path: '/skies/always-on-my-mind.mp4', slug: 'always-on-my-mind' },
  { filename: 'american-dream.mp4', path: '/skies/american-dream.mp4', slug: 'american-dream' },
  { filename: 'baby.mp4', path: '/skies/baby.mp4', slug: 'baby' },
  { filename: 'be-my-bee-acoustic.mp4', path: '/skies/be-my-bee-acoustic.mp4', slug: 'be-my-bee', variant: 'acoustic' },
  { filename: 'be-my-bee.mp4', path: '/skies/be-my-bee.mp4', slug: 'be-my-bee' },
  { filename: 'brain-freeze.mp4', path: '/skies/brain-freeze.mp4', slug: 'brain-freeze' },
  { filename: 'collide.mp4', path: '/skies/collide.mp4', slug: 'collide' },
  { filename: 'colors-of-our-home-bluma.mp4', path: '/skies/colors-of-our-home-bluma.mp4', slug: 'colors-of-our-home', variant: 'bluma' },
  { filename: 'colors-of-our-home.mp4', path: '/skies/colors-of-our-home.mp4', slug: 'colors-of-our-home' },
  { filename: 'feeling-this.mp4', path: '/skies/feeling-this.mp4', slug: 'feeling-this' },
  { filename: 'game-boy-heart.mp4', path: '/skies/game-boy-heart.mp4', slug: 'game-boy-heart' },
  { filename: 'home-acoustic.mp4', path: '/skies/home-acoustic.mp4', slug: 'home', variant: 'acoustic' },
  { filename: 'home.mp4', path: '/skies/home.mp4', slug: 'home' },
  { filename: 'i-might-fall-in-love-with-you.mp4', path: '/skies/i-might-fall-in-love-with-you.mp4', slug: 'i-might-fall-in-love-with-you' },
  { filename: 'kid-forever.mp4', path: '/skies/kid-forever.mp4', slug: 'kid-forever' },
  { filename: 'letting-go.mp4', path: '/skies/letting-go.mp4', slug: 'letting-go' },
  { filename: 'lightspeed.mp4', path: '/skies/lightspeed.mp4', slug: 'lightspeed' },
  { filename: 'little-black-heart.mp4', path: '/skies/little-black-heart.mp4', slug: 'little-black-heart' },
  { filename: 'ocean-girl-acoustic.mp4', path: '/skies/ocean-girl-acoustic.mp4', slug: 'ocean-girl', variant: 'acoustic' },
  { filename: 'ocean-girl-remix.mp4', path: '/skies/ocean-girl-remix.mp4', slug: 'ocean-girl', variant: 'remix' },
  { filename: 'ocean-girl.mp4', path: '/skies/ocean-girl.mp4', slug: 'ocean-girl' },
  { filename: 'paris.mp4', path: '/skies/paris.mp4', slug: 'paris' },
  { filename: 'pink-moon.mp4', path: '/skies/pink-moon.mp4', slug: 'pink-moon' },
  { filename: 'pokemon.mp4', path: '/skies/pokemon.mp4', slug: 'pok-mon' },
  { filename: 'somebody-to-love.mp4', path: '/skies/somebody-to-love.mp4', slug: 'somebody-to-love' },
  { filename: 'space.mp4', path: '/skies/space.mp4', slug: 'space' },
  { filename: 'tienes-un-amigo.mp4', path: '/skies/tienes-un-amigo.mp4', slug: 'tienes-un-amigo' },
  { filename: 'were-just-friends-acoustic.mp4', path: '/skies/were-just-friends-acoustic.mp4', slug: 'were-just-friends', variant: 'acoustic' },
  { filename: 'were-just-friends-dmvrco-remix.mp4', path: '/skies/were-just-friends-dmvrco-remix.mp4', slug: 'were-just-friends', variant: 'dmvrco-remix' },
  { filename: 'were-just-friends-mickey-jas-remix.mp4', path: '/skies/were-just-friends-mickey-jas-remix.mp4', slug: 'were-just-friends', variant: 'mickey-jas-remix' },
  { filename: 'were-just-friends.mp4', path: '/skies/were-just-friends.mp4', slug: 'were-just-friends' }
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