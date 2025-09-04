/**
 * Build per-track sky paths with safe fallbacks based on assets we actually ship.
 * - When the current track is any "ocean-girl" variant, use the Ocean Girl sky.
 * - Otherwise, fall back to the space sky.
 */
export function skyFor(slug?: string) {
  // Known skies we ship; prefer mp4-first since not all tracks have webm
  // Use distinct keys to force video remounts for reliable onplaying events
  const OCEAN_GIRL = { key: "ocean-girl-sky", webm: "", mp4: "/skies/ocean-girl.mp4" };
  const KID_FOREVER = { key: "kid-forever-sky", webm: "", mp4: "/skies/kid-forever.mp4" };
  const BRAIN_FREEZE = { key: "brain-freeze-sky", webm: "", mp4: "/skies/brain-freeze.mp4" };
  const ALONE = { key: "alone-sky", webm: "", mp4: "/skies/alone.mp4" };
  const SPACE = { key: "space-sky", webm: "/skies/space.webm", mp4: "/skies/space.mp4" };
  const ALIEN_HOUSE = { key: "alien-house-party-sky", webm: "", mp4: "/skies/alien-house-party.mp4" };

  if (!slug) return SPACE;
  if (slug.startsWith("ocean-girl")) return OCEAN_GIRL;
  if (slug.startsWith("alien-house-party") || slug.startsWith("house-party")) return ALIEN_HOUSE;
  if (slug.startsWith("kid-forever")) return KID_FOREVER;
  if (slug.startsWith("brain-freeze")) return BRAIN_FREEZE;
  if (slug.startsWith("alone")) return ALONE;
  return SPACE;
}

// Use the lightspeed warp as the initial looping sky
export const introSky = { key: "lightspeed", webm: "", mp4: "/skies/lightspeed.mp4" };
