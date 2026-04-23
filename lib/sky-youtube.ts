// Central mapping of per-song background YouTube skies.
// Add entries as: slug => full YouTube URL
// Example: 'baby': 'https://youtu.be/d45RXW32C2o'

export const YOUTUBE_SKIES: Record<string, string> = {
  // Updated mappings from provided list
  alone: 'https://youtu.be/tssS0HvhWz8',
  'alone-acoustic': 'https://youtu.be/tssS0HvhWz8',
  'always-on-my-mind': 'https://youtu.be/OuBRUhgOUmU',
  'always-on-my-mind-acoustic': 'https://youtu.be/OuBRUhgOUmU',
  'always-on-my-mind-remix': 'https://youtu.be/lWuHXFPi4mA',
  baby: 'https://youtu.be/d45RXW32C2o',
  'be-my-bee': 'https://youtu.be/gUPRdW0sOkU',
  'be-my-bee-acoustic': 'https://youtu.be/gUPRdW0sOkU',
  'brain-freeze': 'https://youtu.be/eDsXZxWB66Y',
  collide: 'https://youtu.be/8qtq8DlS8ws',
  'colors-of-our-home': 'https://youtu.be/LkEXzg-84Rw',
  'colors-of-our-home-acoustic': 'https://youtu.be/LkEXzg-84Rw',
  'colors-of-our-home-bluma-game-soundtrack': 'https://youtu.be/LkEXzg-84Rw',
  'feeling-this': 'https://youtu.be/vQo8TaVJuec',
  'feeling-this-blink-182-cover': 'https://youtu.be/vQo8TaVJuec',
  'game-boy-heart': 'https://youtu.be/xbwh3MdCIIg',
  home: 'https://youtu.be/PaNTntT5tQk',
  'home-acoustic': 'https://youtu.be/i298OKwH9MQ',
  'house-party': 'https://youtu.be/7Wld93-xCiI',
  'house-party-acoustic': 'https://youtu.be/tvg7P50YP2k',
  // Also map alternate title variant used elsewhere
  'alien-house-party': 'https://youtu.be/7Wld93-xCiI',
  // MR. BRIGHTSIDE
  'mr-brightside': 'https://youtu.be/vQo8TaVJuec',
  'mr-brightside-killers-cover': 'https://youtu.be/vQo8TaVJuec',
  'i-might-fall-in-love-with-you': 'https://youtu.be/Udds92-CRyQ',
  'i-might-fall-in-love-with-you-acoustic': 'https://youtu.be/Udds92-CRyQ',
  'kid-forever': 'https://youtu.be/pVKgCGjKMN8',
  'little-black-heart': 'https://youtu.be/eDS0mj9IsQ0',
  'little-black-heart-acoustic': 'https://youtu.be/eDS0mj9IsQ0',
  'ocean-girl': 'https://youtu.be/6baiJYNeXEM',
  'ocean-girl-acoustic': 'https://youtu.be/3W9axkul8IM',
  'ocean-girl-remix': 'https://youtu.be/hhTlDdfvZK8',
  paris: 'https://youtu.be/KQKklANZ0g0',
  pokemon: 'https://youtu.be/cWIb3C54sD4',
  'somebody-to-love': 'https://youtu.be/bsDhnZz8dlE',
  'tienes-un-amigo': 'https://youtu.be/xS-a7rWzYYw',
  'were-just-friends': 'https://youtu.be/EMwPpuhs3fs',
  'were-just-friends-acoustic': 'https://youtu.be/EMwPpuhs3fs',
  'were-just-friends-dmvrco-remix': 'https://youtu.be/EMwPpuhs3fs',
  'were-just-friends-mickey-jas-remix': 'https://youtu.be/EMwPpuhs3fs',
};

export function youtubeSkyFor(slug?: string): string | undefined {
  if (!slug) return undefined;
  const key = String(slug).toLowerCase();
  return YOUTUBE_SKIES[key];
}

// Default YouTube clip for home/lightspeed background when HUD is unlocked
// Removed hardcoded fallback YouTube sky.
export const HOME_YOUTUBE_SKY = '';
