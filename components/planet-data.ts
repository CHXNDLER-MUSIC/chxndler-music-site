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
    orbitSpeed: 0.1, // Same speed for all elements
    texturePath: '/textures/planet_heart.webp',
  },
  {
    id: 'WATER',
    name: 'Water Planet',
    kind: 'element',
    elementId: 'WATER',
    orbitRadius: 18,
    orbitSpeed: 0.1, // Same speed for all elements
    texturePath: '/textures/planet_water.webp',
  },
  {
    id: 'LIGHTNING',
    name: 'Lightning Planet',
    kind: 'element',
    elementId: 'LIGHTNING',
    orbitRadius: 18,
    orbitSpeed: 0.1, // Same speed for all elements
    texturePath: '/textures/planet_lightning.webp',
  },
  {
    id: 'DARKNESS',
    name: 'Darkness Planet',
    kind: 'element',
    elementId: 'DARKNESS',
    orbitRadius: 18,
    orbitSpeed: 0.1, // Same speed for all elements
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
    orbitSpeed: 0.3,
    released: true,
  },
  {
    id: 'ALWAYS_ON_MY_MIND_ACOUSTIC',
    name: 'ALWAYS ON MY MIND (ACOUSTIC)',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 5.5,
    orbitSpeed: 0.25,
    released: true,
  },
  {
    id: 'ALWAYS_ON_MY_MIND_REMIX',
    name: 'ALWAYS ON MY MIND (REMIX)',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 5.5,
    orbitSpeed: 0.35,
    released: true,
  },
  {
    id: 'BABY',
    name: 'BABY',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 5.5,
    orbitSpeed: 0.28,
    released: true,
  },
  {
    id: 'BE_MY_BEE',
    name: 'BE MY BEE',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 5.5,
    orbitSpeed: 0.32,
    released: true,
  },
  {
    id: 'BE_MY_BEE_ACOUSTIC',
    name: 'BE MY BEE (ACOUSTIC)',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 6.5,
    orbitSpeed: 0.27,
    released: true,
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
    released: true,
  },
  {
    id: 'I_MIGHT_FALL_IN_LOVE_WITH_YOU',
    name: 'I MIGHT FALL IN LOVE WITH YOU',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 6.5,
    orbitSpeed: 0.34,
    released: true,
  },
  {
    id: 'I_MIGHT_FALL_IN_LOVE_WITH_YOU_ACOUSTIC',
    name: 'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 7.5,
    orbitSpeed: 0.24,
    released: true,
  },
  {
    id: 'LOVE_ME',
    name: 'LOVE ME',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 7.5,
    orbitSpeed: 0.36,
    released: true,
  },
  {
    id: 'LOVE_ME_ACOUSTIC',
    name: 'LOVE ME (ACOUSTIC)',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 7.5,
    orbitSpeed: 0.23,
    released: true,
  },
  {
    id: 'PINK_MOON',
    name: 'PINK MOON',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 7.5,
    orbitSpeed: 0.37,
    released: true,
  },
  {
    id: 'SOMEBODY_TO_LOVE',
    name: 'SOMEBODY TO LOVE',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 7.5,
    orbitSpeed: 0.22,
    released: true,
  },
  {
    id: 'TIENES_UN_AMIGO',
    name: 'TIENES UN AMIGO',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 8.5,
    orbitSpeed: 0.38,
    released: true,
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
    orbitSpeed: 0.35,
    released: true,
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
    orbitSpeed: 0.25,
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
    orbitSpeed: 0.45,
    released: true,
  },
  {
    id: 'BLUE_ACOUSTIC',
    name: 'BLUE (ACOUSTIC)',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 5.5,
    orbitSpeed: 0.40,
    released: true,
  },
  {
    id: 'BLUE',
    name: 'BLUE',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 5.5,
    orbitSpeed: 0.35,
    released: true,
  },
  {
    id: 'BRAIN_FREEZE',
    name: 'BRAIN FREEZE',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 5.5,
    orbitSpeed: 0.50,
    released: true,
  },
  {
    id: 'FEELING_THIS',
    name: 'FEELING THIS',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 6.8,
    orbitSpeed: 0.30,
    released: true,
  },
  {
    id: 'GAME_BOY_HEART',
    name: 'GAME BOY HEART',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 6.8,
    orbitSpeed: 0.55,
    released: true,
  },
  {
    id: 'HOME',
    name: 'HOME',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 6.8,
    orbitSpeed: 0.25,
    released: true,
  },
  {
    id: 'HOME_ACOUSTIC',
    name: 'HOME (ACOUSTIC)',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 6.8,
    orbitSpeed: 0.60,
    released: true,
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
    orbitSpeed: 0.65,
    released: true,
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
    orbitSpeed: 0.70,
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
    released: true,
  },
  {
    id: 'ALONE_ACOUSTIC',
    name: 'ALONE (ACOUSTIC)',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 6.0,
    orbitSpeed: 0.22,
    released: true,
  },
  {
    id: 'CHEERLEADER',
    name: 'CHEERLEADER',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 6.0,
    orbitSpeed: 0.15,
    released: true,
  },
  {
    id: 'LITTLE_BLACK_HEART',
    name: 'LITTLE BLACK HEART',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 6.0,
    orbitSpeed: 0.26,
    released: true,
  },
  {
    id: 'LITTLE_BLACK_HEART_ACOUSTIC',
    name: 'LITTLE BLACK HEART (ACOUSTIC)',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 7.5,
    orbitSpeed: 0.12,
    released: true,
  },
  {
    id: 'MR_BRIGHTSIDE',
    name: 'MR. BRIGHTSIDE',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 7.5,
    orbitSpeed: 0.30,
    released: true,
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