import { planetAppearances } from './planet-appearances';

export type ElementId = 'HEART' | 'WATER' | 'LIGHTNING' | 'DARKNESS';

export interface PlanetVisualAppearance {
  primaryColor: string;
  surface: string;
  atmosphere: string;
  shape: string;
  surfaceElements: string;
}

export interface PlanetBase {
  id: string;
  name: string;
  appearance?: PlanetVisualAppearance;
}

export interface CenterPlanet extends PlanetBase {
  kind: 'center';
}

export interface ElementPlanet extends PlanetBase {
  kind: 'element';
  elementId: ElementId;
  orbitRadius: number;
  orbitSpeed: number; // radians per second
  texturePath: string; // public/textures/...
}

export interface SongPlanet extends PlanetBase {
  kind: 'song';
  elementId: ElementId;
  orbitRadius: number;
  orbitSpeed: number; // around its element
  released: boolean;
  texturePath?: string;
}

export type Planet = CenterPlanet | ElementPlanet | SongPlanet;

export const centerPlanet: CenterPlanet = {
  id: 'CENTER',
  name: 'Heartverse Core',
  kind: 'center',
};

export const elementPlanets: ElementPlanet[] = [
  {
    id: 'HEART',
    name: 'Heart Planet',
    kind: 'element',
    elementId: 'HEART',
    orbitRadius: 18,
    orbitSpeed: 0.08, // Even slower, more contemplative orbit movement
    texturePath: '/textures/planet_heart.webp',
  },
  {
    id: 'WATER',
    name: 'Water Planet',
    kind: 'element',
    elementId: 'WATER',
    orbitRadius: 18,
    orbitSpeed: 0.08, // Even slower, more contemplative orbit movement
    texturePath: '/textures/planet_water.webp',
  },
  {
    id: 'LIGHTNING',
    name: 'Lightning Planet',
    kind: 'element',
    elementId: 'LIGHTNING',
    orbitRadius: 18,
    orbitSpeed: 0.08, // Even slower, more contemplative orbit movement
    texturePath: '/textures/planet_lightning.webp',
  },
  {
    id: 'DARKNESS',
    name: 'Darkness Planet',
    kind: 'element',
    elementId: 'DARKNESS',
    orbitRadius: 18,
    orbitSpeed: 0.08, // Even slower, more contemplative orbit movement
    texturePath: '/textures/planet_darkness.webp',
  },
];

const baseSongPlanets: Omit<SongPlanet, 'appearance'>[] = [
  // Heart songs (21 songs) - distributed across 4 concentric rings for better spacing
  {
    id: 'ALWAYS_ON_MY_MIND',
    name: 'ALWAYS ON MY MIND',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 5.5,
    orbitSpeed: 0.12,
    released: false,
  },
  {
    id: 'ALWAYS_ON_MY_MIND_ACOUSTIC',
    name: 'ALWAYS ON MY MIND (ACOUSTIC)',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 5.5,
    orbitSpeed: 0.10,
    released: false,
  },
  {
    id: 'ALWAYS_ON_MY_MIND_REMIX',
    name: 'ALWAYS ON MY MIND (REMIX)',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 5.5,
    orbitSpeed: 0.14,
    released: false,
  },
  {
    id: 'BABY',
    name: 'BABY',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 5.5,
    orbitSpeed: 0.11,
    released: true,
  },
  {
    id: 'BE_MY_BEE',
    name: 'BE MY BEE',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 5.5,
    orbitSpeed: 0.13,
    released: true,
  },
  {
    id: 'BE_MY_BEE_ACOUSTIC',
    name: 'BE MY BEE (ACOUSTIC)',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 6.5,
    orbitSpeed: 0.27,
    released: false,
  },
  {
    id: 'COLLIDE',
    name: 'COLLIDE',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 6.5,
    orbitSpeed: 0.33,
    released: true,
  },
  {
    id: 'COLORS_OF_OUR_HOME',
    name: 'COLORS OF OUR HOME',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 6.5,
    orbitSpeed: 0.26,
    released: true,
  },
  {
    id: 'COLORS_OF_OUR_HOME_ACOUSTIC',
    name: 'COLORS OF OUR HOME (ACOUSTIC)',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 6.5,
    orbitSpeed: 0.31,
    released: true,
  },
  {
    id: 'COLORS_OF_OUR_HOME_BLUMA',
    name: 'COLORS OF OUR HOME (BLUMA Game Soundtrack)',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 6.5,
    orbitSpeed: 0.29,
    released: false,
  },
  {
    id: 'I_MIGHT_FALL_IN_LOVE_WITH_YOU',
    name: 'I MIGHT FALL IN LOVE WITH YOU',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 6.5,
    orbitSpeed: 0.34,
    released: false,
  },
  {
    id: 'I_MIGHT_FALL_IN_LOVE_WITH_YOU_ACOUSTIC',
    name: 'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 7.5,
    orbitSpeed: 0.24,
    released: false,
  },
  {
    id: 'LOVE_ME',
    name: 'LOVE ME',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 7.5,
    orbitSpeed: 0.36,
    released: false,
  },
  {
    id: 'LOVE_ME_ACOUSTIC',
    name: 'LOVE ME (ACOUSTIC)',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 7.5,
    orbitSpeed: 0.23,
    released: false,
  },
  {
    id: 'PINK_MOON',
    name: 'PINK MOON',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 7.5,
    orbitSpeed: 0.37,
    released: false,
  },
  {
    id: 'SOMEBODY_TO_LOVE',
    name: 'SOMEBODY TO LOVE',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 7.5,
    orbitSpeed: 0.22,
    released: false,
  },
  {
    id: 'TIENES_UN_AMIGO',
    name: 'TIENES UN AMIGO',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 8.5,
    orbitSpeed: 0.38,
    released: false,
  },
  {
    id: 'WERE_JUST_FRIENDS',
    name: "WE'RE JUST FRIENDS",
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 8.5,
    orbitSpeed: 0.21,
    released: true,
  },
  {
    id: 'WERE_JUST_FRIENDS_ACOUSTIC',
    name: "WE'RE JUST FRIENDS (ACOUSTIC)",
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 8.5,
    orbitSpeed: 0.39,
    released: true,
  },
  {
    id: 'WERE_JUST_FRIENDS_DMVRCO',
    name: "WE'RE JUST FRIENDS (DMVRCO Remix)",
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 8.5,
    orbitSpeed: 0.20,
    released: true,
  },
  {
    id: 'WERE_JUST_FRIENDS_MICKEY_JAS',
    name: "WE'RE JUST FRIENDS (mickey jas Remix)",
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 8.5,
    orbitSpeed: 0.40,
    released: true,
  },

  // Water songs (4 songs) - evenly distributed in one ring
  {
    id: 'LETTING_GO',
    name: 'LETTING GO',
    kind: 'song',
    elementId: 'WATER',
    orbitRadius: 6.5,
    orbitSpeed: 0.14,
    released: false,
  },
  {
    id: 'OCEAN_GIRL',
    name: 'OCEAN GIRL',
    kind: 'song',
    elementId: 'WATER',
    orbitRadius: 6.5,
    orbitSpeed: 0.30,
    released: true,
  },
  {
    id: 'OCEAN_GIRL_ACOUSTIC',
    name: 'OCEAN GIRL (ACOUSTIC)',
    kind: 'song',
    elementId: 'WATER',
    orbitRadius: 6.5,
    orbitSpeed: 0.10,
    released: true,
  },
  {
    id: 'OCEAN_GIRL_REMIX',
    name: 'OCEAN GIRL (REMIX)',
    kind: 'song',
    elementId: 'WATER',
    orbitRadius: 6.5,
    orbitSpeed: 0.40,
    released: true,
  },

  // Lightning songs (12 songs) - distributed across 3 rings (4 songs each)
  {
    id: 'AMERICAN_DREAM',
    name: 'AMERICAN DREAM',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 5.5,
    orbitSpeed: 0.18,
    released: false,
  },
  {
    id: 'BLUE_ACOUSTIC',
    name: 'BLUE (ACOUSTIC)',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 5.5,
    orbitSpeed: 0.40,
    released: false,
  },
  {
    id: 'BLUE',
    name: 'BLUE',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 5.5,
    orbitSpeed: 0.14,
    released: false,
  },
  {
    id: 'BRAIN_FREEZE',
    name: 'BRAIN FREEZE',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 5.5,
    orbitSpeed: 0.20,
    released: true,
  },
  {
    id: 'FEELING_THIS',
    name: 'FEELING THIS',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 6.8,
    orbitSpeed: 0.30,
    released: false,
  },
  {
    id: 'GAME_BOY_HEART',
    name: 'GAME BOY HEART',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 6.8,
    orbitSpeed: 0.22,
    released: true,
  },
  {
    id: 'HOME',
    name: 'HOME',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 6.8,
    orbitSpeed: 0.10,
    released: false,
  },
  {
    id: 'HOME_ACOUSTIC',
    name: 'HOME (ACOUSTIC)',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 6.8,
    orbitSpeed: 0.24,
    released: false,
  },
  {
    id: 'HOUSE_PARTY',
    name: 'HOUSE PARTY',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 8.1,
    orbitSpeed: 0.20,
    released: true,
  },
  {
    id: 'HOUSE_PARTY_ACOUSTIC',
    name: 'HOUSE PARTY (ACOUSTIC)',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 8.1,
    orbitSpeed: 0.26,
    released: false,
  },
  {
    id: 'KID_FOREVER',
    name: 'KID FOREVER',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 8.1,
    orbitSpeed: 0.15,
    released: true,
  },
  {
    id: 'POKEMON',
    name: 'POKÉMON',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 8.1,
    orbitSpeed: 0.28,
    released: true,
  },

  // Darkness songs (7 songs) - distributed across 2 rings for better spacing
  {
    id: 'ALONE',
    name: 'ALONE',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 6.0,
    orbitSpeed: 0.18,
    released: false,
  },
  {
    id: 'ALONE_ACOUSTIC',
    name: 'ALONE (ACOUSTIC)',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 6.0,
    orbitSpeed: 0.22,
    released: false,
  },
  {
    id: 'CHEERLEADER',
    name: 'CHEERLEADER',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 6.0,
    orbitSpeed: 0.15,
    released: false,
  },
  {
    id: 'LITTLE_BLACK_HEART',
    name: 'LITTLE BLACK HEART',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 6.0,
    orbitSpeed: 0.26,
    released: false,
  },
  {
    id: 'LITTLE_BLACK_HEART_ACOUSTIC',
    name: 'LITTLE BLACK HEART (ACOUSTIC)',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 7.5,
    orbitSpeed: 0.12,
    released: false,
  },
  {
    id: 'MR_BRIGHTSIDE',
    name: 'MR. BRIGHTSIDE',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 7.5,
    orbitSpeed: 0.30,
    released: false,
  },
  {
    id: 'PARIS',
    name: 'PARIS',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 7.5,
    orbitSpeed: 0.09,
    released: true,
  },
];

// Merge song planets with their appearance data
export const songPlanets: SongPlanet[] = baseSongPlanets.map(planet => ({
  ...planet,
  appearance: planetAppearances[planet.id] || {
    primaryColor: planet.elementId === 'HEART' ? '#FC54AF' : 
                  planet.elementId === 'WATER' ? '#38B6FF' :
                  planet.elementId === 'LIGHTNING' ? '#F2EF1D' : '#000000',
    surface: 'Generic planetary surface',
    atmosphere: 'Clear atmosphere',
    shape: 'Rounded sphere',
    surfaceElements: 'Basic terrain features'
  }
}));

export const allPlanets: Planet[] = [
  centerPlanet,
  ...elementPlanets,
  ...songPlanets,
];