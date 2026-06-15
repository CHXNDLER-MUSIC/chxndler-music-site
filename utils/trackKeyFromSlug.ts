// Maps existing song slugs to AudioManager TRACKS keys.
// Extend as needed to cover all choices in the HUD.

export function trackKeyFromSlug(slug?: string): string | null {
  if (!slug) return null;
  const s = String(slug).toLowerCase();
  const map: Record<string, string> = {
    "alone": "ALONE",
    "baby": "BABY",
    "be-my-bee": "BE_MY_BEE",
    "brain-freeze": "BRAIN_FREEZE",
    "collide": "COLLIDE",
    "mr-brightside": "MR_BRIGHTSIDE",
    "colors-of-our-home": "COLORS_HOME",
    "colors-of-our-home-acoustic": "COLORS_HOME_ACOUSTIC",
    "colors-of-our-home-bluma-game-soundtrack": "COLORS_HOME_BLUMA",
    "game-boy-heart": "GAME_BOY_HEART",
    "house-party": "HOUSE_PARTY",
    "kid-forever": "KID_FOREVER",
    "ocean-girl": "OCEAN_GIRL",
    "ocean-girl-acoustic": "OCEAN_GIRL_ACOUSTIC",
    "ocean-girl-remix": "OCEAN_GIRL_REMIX",
    "paris": "PARIS",
    "pokemon": "POKEMON",
    "were-just-friends": "WJF",
    "were-just-friends-dmvrco-remix": "WJF_DMVRCO",
    "were-just-friends-mickey-jas-remix": "WJF_MICKEY_JAS",
    "sugar-were-going-down": "SUGAR_WERE_GOING_DOWN",
    // Element planet tracks
    "water": "WATER",
    "lightning": "LIGHTNING",
    "darkness": "DARKNESS",
    "heart": "HEART",
    "center": "CENTER",
    // Ambient / voiceover tracks kept local
    "space-music": "SPACE_MUSIC",
  };
  return map[s] || null;
}
