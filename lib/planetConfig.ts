// Unified Planet Configuration System
// This is the single source of truth for positions, radii, and basic styling used by:
// - 3D system (components/holo/PlanetSystem.tsx)
// - 2D minimap (components/holo/PlanetMinimap.tsx)
//
// How to tweak:
// - Adjust ELEMENT_ORBIT_RADIUS to move the four elemental planets closer/farther from center.
// - Adjust SONG_ORBIT_RADIUS to change how far songs orbit around their element.
// - Per-element visual color/texture lives here via ELEMENT_COLORS and texture paths.
// - 3D orbit speed is controlled in components/holo/PlanetSystem.tsx (systemRef + per-element song speeds).
// - Camera initial position and zoom limits are in components/holo/PlanetSystem.tsx (Canvas camera + OrbitControls).
// - To add a new song planet, insert a new row in Supabase (or extend data/songs or songs-consolidated),
//   ensuring it has an element mapping; the 3D and minimap read from the same runtime song list.

export type PlanetType = 'center' | 'element' | 'song';
export type ElementType = 'heart' | 'water' | 'lightning' | 'darkness';

export interface PlanetConfig {
  id: string;
  name: string;          // song or element name
  type: PlanetType;
  element?: ElementType; // for both element + song planets
  size: number;          // base size
  orbitRadius?: number;  // distance from its orbit center
  orbitSpeed?: number;
  parentId?: string;     // id of the planet it orbits around (center or an element)
  color: string;
  position?: [number, number, number]; // for fixed-position planets (center, elements)
}

// Size constants for consistency
export const PLANET_SIZES = {
  CENTER: 2.5,    // Largest - center Heartverse planet
  ELEMENT: 1.5,   // Medium - same for all 4 element planets  
  SONG: 0.7       // Smallest - all song planets
} as const;

// Orbit radius for elements around center - matching 3D layout exactly
export const ELEMENT_ORBIT_RADIUS = 25;
export const SONG_ORBIT_RADIUS = 8;

// Colors for elements
export const ELEMENT_COLORS: Record<ElementType, string> = {
  heart: "#FC54AF",
  water: "#38B6FF", 
  lightning: "#F2EF1D",
  darkness: "#6A4C93" // Using the purple-blue for visibility instead of pure black
};

// Per-element song orbit speeds (radians per frame-tick), used by 3D + minimap
export const ELEMENT_SONG_ORBIT_SPEEDS: Record<ElementType, number> = {
  lightning: 0.0015,
  water: 0.0012,
  heart: 0.0010,
  darkness: 0.0008,
};

// Fixed positions for elements - matching 3D layout exactly:
// Based on PlanetSystem.tsx: Heart = right, Lightning = left, Water = back, Darkness = front
export const ELEMENT_POSITIONS: Record<ElementType, [number, number, number]> = {
  heart:     [ELEMENT_ORBIT_RADIUS, 0, 0],  // right (matches [25, 0, 0])
  lightning: [-ELEMENT_ORBIT_RADIUS, 0, 0], // left (matches [-25, 0, 0])
  water:     [0, 0, ELEMENT_ORBIT_RADIUS],  // back (matches [0, 0, 25])
  darkness:  [0, 0, -ELEMENT_ORBIT_RADIUS] // front (matches [0, 0, -25])
};

// Song to element mapping based on existing data
export const SONG_ELEMENT_MAPPING: Record<string, ElementType> = {
  // Darkness songs
  "alone": "darkness",
  "alone-acoustic": "darkness",
  
  // Heart songs  
  "always-on-my-mind": "heart",
  "always-on-my-mind-acoustic": "heart", 
  "always-on-my-mind-remix": "heart",
  "baby": "heart",
  "be-my-bee": "heart",
  "collide": "heart",
  "colors-of-our-home": "heart",
  "i-might-fall-in-love": "heart",
  "love-me": "heart",
  "somebody-to-love": "heart",
  "tienes-un-amigo": "heart",
  "were-just-friends": "heart",
  "were-just-friends-dmvrco-remix": "heart",
  "were-just-friends-mickey-jas-remix": "heart",
  
  // Lightning songs
  "american-dream": "lightning",
  "brain-freeze": "lightning", 
  "feeling-this": "lightning",
  "game-boy-heart": "lightning",
  "home": "lightning",
  "house-party": "lightning",
  "kid-forever": "lightning",
  "pokemon": "lightning",
  "blue": "lightning",
  
  // Water songs
  "ocean-girl": "water",
  "letting-go": "water",
  "night-drive": "water",
  "starlight": "water", 
  "horizon": "water",
  "afterglow": "water",
  "midnight": "water",
  "tidal": "water",
  "drift": "water",
};

// Generate planet configs from existing song data
import { songs } from "@/data/songs";

function generatePlanetConfigs(): PlanetConfig[] {
  const configs: PlanetConfig[] = [];
  
  // 1. Center planet
  configs.push({
    id: "heartverse-center",
    name: "Heartverse",
    type: "center",
    size: PLANET_SIZES.CENTER,
    color: "#FF69B4",
    position: [0, 0, 0]
  });
  
  // 2. Element planets
  const elements: ElementType[] = ["heart", "water", "lightning", "darkness"];
  elements.forEach(element => {
    configs.push({
      id: `element-${element}`,
      name: element.charAt(0).toUpperCase() + element.slice(1),
      type: "element",
      element: element,
      size: PLANET_SIZES.ELEMENT,
      color: ELEMENT_COLORS[element],
      position: ELEMENT_POSITIONS[element],
      parentId: "heartverse-center",
      orbitRadius: ELEMENT_ORBIT_RADIUS
    });
  });
  
  // 3. Song planets
  songs.forEach(song => {
    const element = SONG_ELEMENT_MAPPING[song.id];
    if (element) {
      configs.push({
        id: song.id,
        name: song.title,
        type: "song", 
        element: element,
        size: PLANET_SIZES.SONG,
        color: song.planet.color,
        parentId: `element-${element}`,
        orbitRadius: SONG_ORBIT_RADIUS,
        orbitSpeed: song.planet.orbitSpeed
      });
    }
  });
  
  return configs;
}

export const PLANET_CONFIGS = generatePlanetConfigs();

// Helper functions
export function getPlanetConfig(id: string): PlanetConfig | undefined {
  return PLANET_CONFIGS.find(p => p.id === id);
}

export function getPlanetsByType(type: PlanetType): PlanetConfig[] {
  return PLANET_CONFIGS.filter(p => p.type === type);
}

export function getPlanetsByElement(element: ElementType): PlanetConfig[] {
  return PLANET_CONFIGS.filter(p => p.element === element);
}

export function getPlanetsByParent(parentId: string): PlanetConfig[] {
  return PLANET_CONFIGS.filter(p => p.parentId === parentId);
}
