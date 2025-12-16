export function getElementColor(elementId: string): number {
  switch (elementId) {
    case 'HEART': return 0xff6b9d;
    case 'WATER': return 0x4fc3f7;
    case 'LIGHTNING': return 0xffeb3b;
    case 'DARKNESS': return 0x9c27b0;
    default: return 0x888888;
  }
}

export function getElementEmissive(elementId: string): number {
  switch (elementId) {
    case 'HEART': return 0x330a15;
    case 'WATER': return 0x0a1a33;
    case 'LIGHTNING': return 0x332a0a;
    case 'DARKNESS': return 0x1a0a33;
    default: return 0x111111;
  }
}

export function getElementGlowColor(elementId: string): number {
  switch (elementId) {
    case 'HEART': return 0xff1493;    // Bright pink light
    case 'WATER': return 0x4169e1;    // Bright blue light  
    case 'LIGHTNING': return 0xffff00; // Bright yellow light
    case 'DARKNESS': return 0xffffff;  // Bright white light
    default: return 0x888888;
  }
}

export function getElementLightColor(elementId: string): number {
  switch (elementId) {
    case 'HEART': return 0xff69b4;    // Pink light emission
    case 'WATER': return 0x87ceeb;    // Blue light emission
    case 'LIGHTNING': return 0xffd700; // Yellow light emission  
    case 'DARKNESS': return 0xffffff;  // White light emission
    default: return 0x888888;
  }
}

// Orbital constants
export const ELEMENT_ORBIT_RADIUS = 18;
export const ELEMENT_ORBIT_SPEED = 0.08;

// Camera constants  
export const CAMERA_BASE_DISTANCE = 30;
export const CAMERA_ZOOM_LERP = 0.1;

// Planet rendering constants
export const CENTER_PLANET_RADIUS = 3.5;
export const CENTER_PLANET_SEGMENTS = 32;
export const ELEMENT_PLANET_SIZE = 4;
export const SONG_PLANET_RADIUS = 1;
export const SONG_PLANET_SEGMENTS = 16;

// Active planet scaling
export const ACTIVE_SCALE_FACTOR = 1.2;
export const ACTIVE_GLOW_SCALE = 1.1;
export const ACTIVE_GLOW_OPACITY = 0.3;
export const ACTIVE_GLOW_COLOR = 0x6366f1;

// Element IDs type
export type ElementId = 'HEART' | 'WATER' | 'LIGHTNING' | 'DARKNESS';

// Planet configuration types
export interface PlanetConfig {
  id: string;
  name: string;
  kind: 'center' | 'element' | 'song';
  elementId?: ElementId;
  texturePath?: string;
  position?: { x: number; y: number; z: number };
  orbitRadius?: number;
  orbitSpeed?: number;
  radius?: number;
  segments?: number;
  released?: boolean;
}

// Central planet configuration
export const PLANET_CONFIG: Record<string, PlanetConfig> = {
  // Center planet
  CENTER: {
    id: 'CENTER',
    name: 'Heartverse Core',
    kind: 'center',
    texturePath: '/textures/center-planet.webp',
    position: { x: 0, y: 0, z: 0 },
    radius: CENTER_PLANET_RADIUS,
    segments: CENTER_PLANET_SEGMENTS,
  },

  // Element planets
  HEART: {
    id: 'HEART',
    name: 'Heart Planet',
    kind: 'element',
    elementId: 'HEART',
    texturePath: '/textures/planet_heart.webp',
    orbitRadius: ELEMENT_ORBIT_RADIUS,
    orbitSpeed: ELEMENT_ORBIT_SPEED,
    radius: ELEMENT_PLANET_SIZE,
  },

  WATER: {
    id: 'WATER',
    name: 'Water Planet',
    kind: 'element',
    elementId: 'WATER',
    texturePath: '/textures/planet_water.webp',
    orbitRadius: ELEMENT_ORBIT_RADIUS,
    orbitSpeed: ELEMENT_ORBIT_SPEED,
    radius: ELEMENT_PLANET_SIZE,
  },

  LIGHTNING: {
    id: 'LIGHTNING',
    name: 'Lightning Planet',
    kind: 'element',
    elementId: 'LIGHTNING',
    texturePath: '/textures/planet_lightning.webp',
    orbitRadius: ELEMENT_ORBIT_RADIUS,
    orbitSpeed: ELEMENT_ORBIT_SPEED,
    radius: ELEMENT_PLANET_SIZE,
  },

  DARKNESS: {
    id: 'DARKNESS',
    name: 'Darkness Planet',
    kind: 'element',
    elementId: 'DARKNESS',
    texturePath: '/textures/planet_darkness.webp',
    orbitRadius: ELEMENT_ORBIT_RADIUS,
    orbitSpeed: ELEMENT_ORBIT_SPEED,
    radius: ELEMENT_PLANET_SIZE,
  },
};

// Helper functions to get config
export const getPlanetConfig = (id: string): PlanetConfig | undefined => {
  return PLANET_CONFIG[id];
};

export const getElementPlanets = (): PlanetConfig[] => {
  return Object.values(PLANET_CONFIG).filter(p => p.kind === 'element');
};

export const getCenterPlanet = (): PlanetConfig => {
  return PLANET_CONFIG.CENTER;
};