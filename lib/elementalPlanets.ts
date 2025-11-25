// Static mapping for the four elemental planet PNGs in public/textures
// These are frontend-only assets; do not use Supabase for planets.
export const ELEMENTAL_PLANETS: Record<string, string> = {
  heart: "/textures/planet_heart.png",
  water: "/textures/planet_water.png",
  lightning: "/textures/planet_lightning.png",
  darkness: "/textures/planet_darkness.png",
};

// Helper: resolve a planet image by element key
export function getElementalPlanetImage(element: string) {
  return ELEMENTAL_PLANETS[element] || null;
}

