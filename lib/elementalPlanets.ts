// Static mapping for the four elemental planet PNGs in public/textures
// These are frontend-only assets; do not use Supabase for planets.
export const ELEMENT_KEYS = ["heart", "water", "lightning", "darkness"] as const;

export const ELEMENTAL_PLANETS: Record<string, string> = {
  heart: "/textures/planet_heart.png",
  water: "/textures/planet_water.png",
  lightning: "/textures/planet_lightning .png", // Note: extra space before .png in actual file
  darkness: "/textures/planet_darkness.png",
};

export const ELEMENT_TO_PLANET_TEXTURE = ELEMENTAL_PLANETS;

// Helper: resolve a planet image by element key
export function getElementalPlanetImage(element: string) {
  return ELEMENTAL_PLANETS[element] || null;
}

export function getElementalPlanetTexture(element: string): string | null {
  return ELEMENT_TO_PLANET_TEXTURE[element] ?? null;
}

export type ElementKey = typeof ELEMENT_KEYS[number];

