export type ElementId = 'HEART' | 'WATER' | 'LIGHTNING' | 'DARKNESS';

export interface PlanetBase {
  id: string;
  name: string;
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
    orbitRadius: 12,
    orbitSpeed: 0.12,
    texturePath: '/textures/planet_heart.webp',
  },
  {
    id: 'WATER',
    name: 'Water Planet',
    kind: 'element',
    elementId: 'WATER',
    orbitRadius: 12,
    orbitSpeed: 0.10,
    texturePath: '/textures/planet_water.webp',
  },
  {
    id: 'LIGHTNING',
    name: 'Lightning Planet',
    kind: 'element',
    elementId: 'LIGHTNING',
    orbitRadius: 12,
    orbitSpeed: 0.14,
    texturePath: '/textures/planet_lightning.webp',
  },
  {
    id: 'DARKNESS',
    name: 'Darkness Planet',
    kind: 'element',
    elementId: 'DARKNESS',
    orbitRadius: 12,
    orbitSpeed: 0.08,
    texturePath: '/textures/planet_darkness.webp',
  },
];

export const songPlanets: SongPlanet[] = [
  // Heart songs
  {
    id: 'HEART_SONG_1',
    name: 'Love Awakens',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 4,
    orbitSpeed: 0.15,
    released: true,
    texturePath: '/textures/song_heart_1.webp',
  },
  {
    id: 'HEART_SONG_2',
    name: 'Sacred Bond',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 4.5,
    orbitSpeed: 0.12,
    released: true,
  },
  {
    id: 'HEART_SONG_3',
    name: 'Future Heart',
    kind: 'song',
    elementId: 'HEART',
    orbitRadius: 5,
    orbitSpeed: 0.18,
    released: false,
  },
  
  // Water songs
  {
    id: 'WATER_SONG_1',
    name: 'Ocean Dreams',
    kind: 'song',
    elementId: 'WATER',
    orbitRadius: 4,
    orbitSpeed: 0.13,
    released: true,
  },
  {
    id: 'WATER_SONG_2',
    name: 'Tidal Flow',
    kind: 'song',
    elementId: 'WATER',
    orbitRadius: 4.8,
    orbitSpeed: 0.11,
    released: false,
  },
  {
    id: 'WATER_SONG_3',
    name: 'Deep Current',
    kind: 'song',
    elementId: 'WATER',
    orbitRadius: 5.2,
    orbitSpeed: 0.16,
    released: true,
  },
  
  // Lightning songs
  {
    id: 'LIGHTNING_SONG_1',
    name: 'Electric Storm',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 3.8,
    orbitSpeed: 0.20,
    released: true,
  },
  {
    id: 'LIGHTNING_SONG_2',
    name: 'Thunder Call',
    kind: 'song',
    elementId: 'LIGHTNING',
    orbitRadius: 4.5,
    orbitSpeed: 0.17,
    released: false,
  },
  
  // Darkness songs
  {
    id: 'DARKNESS_SONG_1',
    name: 'Shadow Realm',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 4.2,
    orbitSpeed: 0.09,
    released: true,
  },
  {
    id: 'DARKNESS_SONG_2',
    name: 'Void Dance',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 5.5,
    orbitSpeed: 0.07,
    released: false,
  },
  {
    id: 'DARKNESS_SONG_3',
    name: 'Night Whispers',
    kind: 'song',
    elementId: 'DARKNESS',
    orbitRadius: 3.5,
    orbitSpeed: 0.12,
    released: true,
  },
];

export const allPlanets: Planet[] = [
  centerPlanet,
  ...elementPlanets,
  ...songPlanets,
];