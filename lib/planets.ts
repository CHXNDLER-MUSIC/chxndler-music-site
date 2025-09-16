import { tracks } from "@/config/tracks";
import { slugify } from "@/lib/slug";

export type Element = "water" | "fire" | "earth" | "air" | "heart" | "lightning" | "darkness";

export const ELEMENT_COLORS: Record<Element, string> = {
  water: "#38B6FF", // cyan/blue
  fire: "#FC54AF",  // neon magenta (brand-leaning fire)
  earth: "#F2EF1D", // neon yellow
  air: "#8BF9FF",   // light cyan
  heart: "#FC54AF", // pink/magenta
  lightning: "#F2EF1D", // bright bolt yellow
  darkness: "#000000", // deep black
};

function pickElement(slug: string, index: number): Element {
  const s = slug.toLowerCase();
  // Specific themes first
  if (s.includes("ocean") || s.includes("tide") || s.includes("wave") || s.includes("sea")) return "water";
  if (s.includes("heart") || s.includes("love") || s.includes("friends") || s.includes("somebody-to-love")) return "heart";
  if (s.includes("lightning") || s.includes("lighting") || s.includes("electric") || s.includes("neon") || s.includes("collide") || s.includes("brain") || s.includes("kid") || s.includes("game")) return "lightning";
  if (s.includes("dark") || s.includes("black") || s.includes("alone") || s.includes("midnight")) return "darkness";
  // Legacy element mapping
  if (s.includes("fire") || s.includes("burn")) return "fire";
  if (s.includes("home") || s.includes("earth") || s.includes("paris") || s.includes("bee")) return "earth";
  if (s.includes("air") || s.includes("sky")) return "air";
  // fallback: cycle for variety
  const cycle: Element[] = ["water", "heart", "lightning", "darkness", "fire", "earth", "air"];
  return cycle[index % cycle.length];
}

function pickPlanetType(element: Element, slug: string): PlanetType {
  const s = slug.toLowerCase();
  
  // Specific overrides based on song themes
  if (s.includes("ocean") || s.includes("tide")) return "ocean";
  if (s.includes("brain") && s.includes("freeze")) return "ice_world";
  if (s.includes("dark") || s.includes("alone") || s.includes("black")) return "volcanic";
  if (s.includes("crystal") || s.includes("bright")) return "crystal";
  if (s.includes("desert") || s.includes("sand")) return "desert";
  if (s.includes("metal") || s.includes("game")) return "metal";
  
  // Element-based defaults
  switch (element) {
    case "water": return "ocean";
    case "fire": return "volcanic";
    case "earth": return "terrestrial";
    case "air": return "gas_giant";
    case "heart": return "terrestrial";
    case "lightning": return "crystal";
    case "darkness": return "volcanic";
    default: return "terrestrial";
  }
}

function generateWeatherSystem(type: PlanetType, _element: Element): WeatherSystem | undefined {
  switch (type) {
    case "gas_giant":
      return {
        cloudLayers: [
          { count: 3, speed: 0.02, density: 0.8, color: '#FFFFFF', height: 1.02, turbulence: 0.5 },
          { count: 2, speed: 0.01, density: 0.6, color: '#FFE4B5', height: 1.04, turbulence: 0.3 },
          { count: 1, speed: 0.005, density: 0.4, color: '#87CEEB', height: 1.06, turbulence: 0.7 }
        ],
        storms: [
          { frequency: 0.3, intensity: 0.8, color: '#FF6B6B', size: 0.2, duration: 50, type: 'hurricane' }
        ],
        atmospheric: {
          winds: { speed: 0.05, direction: 0, variation: 0.3 },
          pressure: 2.5,
          temperature: -120
        }
      };
      
    case "ocean":
      return {
        cloudLayers: [
          { count: 2, speed: 0.015, density: 0.6, color: '#FFFFFF', height: 1.03, turbulence: 0.4 },
          { count: 1, speed: 0.008, density: 0.3, color: '#E0F6FF', height: 1.05, turbulence: 0.6 }
        ],
        storms: [
          { frequency: 0.2, intensity: 0.6, color: '#4A90E2', size: 0.15, duration: 30, type: 'hurricane' }
        ],
        atmospheric: {
          winds: { speed: 0.02, direction: 0, variation: 0.2 },
          pressure: 1.2,
          temperature: 15
        }
      };
      
    case "volcanic":
      return {
        cloudLayers: [
          { count: 2, speed: 0.03, density: 0.9, color: '#8B0000', height: 1.02, turbulence: 0.8 },
          { count: 1, speed: 0.02, density: 0.7, color: '#FF4500', height: 1.04, turbulence: 0.9 }
        ],
        storms: [
          { frequency: 0.4, intensity: 0.9, color: '#FF0000', size: 0.1, duration: 20, type: 'plasma' }
        ],
        atmospheric: {
          winds: { speed: 0.04, direction: 0, variation: 0.5 },
          pressure: 0.8,
          temperature: 800
        }
      };
      
    case "ice_world":
      return {
        cloudLayers: [
          { count: 1, speed: 0.01, density: 0.4, color: '#F0F8FF', height: 1.02, turbulence: 0.2 }
        ],
        storms: [
          { frequency: 0.15, intensity: 0.5, color: '#B0E0E6', size: 0.25, duration: 40, type: 'ice' }
        ],
        atmospheric: {
          winds: { speed: 0.015, direction: 0, variation: 0.1 },
          pressure: 0.3,
          temperature: -80
        }
      };
      
    case "desert":
      return {
        cloudLayers: [
          { count: 1, speed: 0.025, density: 0.3, color: '#DEB887', height: 1.015, turbulence: 0.7 }
        ],
        storms: [
          { frequency: 0.25, intensity: 0.7, color: '#CD853F', size: 0.3, duration: 25, type: 'dust' }
        ],
        atmospheric: {
          winds: { speed: 0.03, direction: 0, variation: 0.4 },
          pressure: 0.7,
          temperature: 45
        }
      };
      
    case "terrestrial":
      return {
        cloudLayers: [
          { count: 2, speed: 0.012, density: 0.5, color: '#FFFFFF', height: 1.025, turbulence: 0.3 },
          { count: 1, speed: 0.006, density: 0.3, color: '#F5F5F5', height: 1.04, turbulence: 0.4 }
        ],
        storms: [
          { frequency: 0.18, intensity: 0.4, color: '#708090', size: 0.12, duration: 35, type: 'electrical' }
        ],
        atmospheric: {
          winds: { speed: 0.018, direction: 0, variation: 0.25 },
          pressure: 1.0,
          temperature: 22
        }
      };
      
    case "toxic":
      return {
        cloudLayers: [
          { count: 2, speed: 0.02, density: 0.8, color: '#9ACD32', height: 1.02, turbulence: 0.6 },
          { count: 1, speed: 0.035, density: 0.9, color: '#ADFF2F', height: 1.03, turbulence: 0.8 }
        ],
        storms: [
          { frequency: 0.35, intensity: 0.8, color: '#32CD32', size: 0.18, duration: 15, type: 'plasma' }
        ],
        atmospheric: {
          winds: { speed: 0.04, direction: 0, variation: 0.6 },
          pressure: 1.8,
          temperature: 150
        }
      };
      
    default:
      return undefined;
  }
}

function generatePlanetGeometry(type: PlanetType, element: Element, _index: number): PlanetGeometry {
  const baseSegments = 128; // High-definition base
  
  switch (type) {
    case "gas_giant":
      return {
        shape: 'gaseous',
        deformation: 0.15 + Math.random() * 0.1,
        poleFlattening: 0.2 + Math.random() * 0.15, // Significant flattening
        surfaceRoughness: 0.05, // Smooth gas surface
        craterDensity: 0.0,
        segments: {
          widthSegments: baseSegments * 1.5, // Extra detail for gas bands
          heightSegments: baseSegments
        },
        scale: {
          x: 1.8 + Math.random() * 0.4, // Much larger
          y: 1.6 + Math.random() * 0.3, // Flattened
          z: 1.8 + Math.random() * 0.4
        }
      };
      
    case "ice_world":
      return {
        shape: 'irregular',
        deformation: 0.08 + Math.random() * 0.05,
        poleFlattening: 0.05,
        surfaceRoughness: 0.3, // Icy ridges and cracks
        craterDensity: 0.6,
        segments: {
          widthSegments: baseSegments,
          heightSegments: baseSegments
        },
        scale: {
          x: 0.8 + Math.random() * 0.3,
          y: 0.9 + Math.random() * 0.2,
          z: 0.8 + Math.random() * 0.3
        }
      };
      
    case "volcanic":
      return {
        shape: 'rocky',
        deformation: 0.2 + Math.random() * 0.15,
        poleFlattening: 0.03,
        surfaceRoughness: 0.8, // Very rough volcanic surface
        craterDensity: 0.4,
        segments: {
          widthSegments: baseSegments * 1.2,
          heightSegments: baseSegments * 1.2
        },
        scale: {
          x: 1.1 + Math.random() * 0.2,
          y: 1.0 + Math.random() * 0.3,
          z: 1.1 + Math.random() * 0.2
        }
      };
      
    case "crystal":
      return {
        shape: 'irregular',
        deformation: 0.25 + Math.random() * 0.1,
        poleFlattening: 0.0,
        surfaceRoughness: 0.6, // Crystalline facets
        craterDensity: 0.1,
        segments: {
          widthSegments: baseSegments * 0.8, // Fewer segments for faceted look
          heightSegments: baseSegments * 0.8
        },
        scale: {
          x: 0.7 + Math.random() * 0.2,
          y: 0.8 + Math.random() * 0.4,
          z: 0.7 + Math.random() * 0.2
        }
      };
      
    case "ocean":
      return {
        shape: 'sphere',
        deformation: 0.02,
        poleFlattening: 0.08, // Slight flattening
        surfaceRoughness: 0.15, // Ocean waves
        craterDensity: 0.05, // Mostly underwater
        segments: {
          widthSegments: baseSegments,
          heightSegments: baseSegments
        },
        scale: {
          x: 1.2 + Math.random() * 0.2,
          y: 1.15 + Math.random() * 0.1,
          z: 1.2 + Math.random() * 0.2
        }
      };
      
    case "desert":
      return {
        shape: 'oblate',
        deformation: 0.1 + Math.random() * 0.08,
        poleFlattening: 0.12,
        surfaceRoughness: 0.4, // Sand dunes
        craterDensity: 0.3,
        segments: {
          widthSegments: baseSegments,
          heightSegments: baseSegments
        },
        scale: {
          x: 1.0 + Math.random() * 0.2,
          y: 0.95 + Math.random() * 0.1,
          z: 1.0 + Math.random() * 0.2
        }
      };
      
    case "metal":
      return {
        shape: 'irregular',
        deformation: 0.15 + Math.random() * 0.1,
        poleFlattening: 0.02,
        surfaceRoughness: 0.7, // Industrial surface
        craterDensity: 0.8, // Heavily mined
        segments: {
          widthSegments: baseSegments * 1.1,
          heightSegments: baseSegments * 1.1
        },
        scale: {
          x: 0.7 + Math.random() * 0.15,
          y: 0.8 + Math.random() * 0.2,
          z: 0.7 + Math.random() * 0.15
        }
      };
      
    case "toxic":
      return {
        shape: 'oblate',
        deformation: 0.12 + Math.random() * 0.08,
        poleFlattening: 0.15,
        surfaceRoughness: 0.5, // Toxic bubbling surface
        craterDensity: 0.25,
        segments: {
          widthSegments: baseSegments,
          heightSegments: baseSegments
        },
        scale: {
          x: 1.1 + Math.random() * 0.2,
          y: 1.0 + Math.random() * 0.15,
          z: 1.1 + Math.random() * 0.2
        }
      };
      
    default: // terrestrial
      return {
        shape: 'sphere',
        deformation: 0.05 + Math.random() * 0.03,
        poleFlattening: 0.06,
        surfaceRoughness: 0.5, // Earth-like terrain
        craterDensity: 0.2,
        segments: {
          widthSegments: baseSegments,
          heightSegments: baseSegments
        },
        scale: {
          x: 1.0 + Math.random() * 0.15,
          y: 1.0 + Math.random() * 0.1,
          z: 1.0 + Math.random() * 0.15
        }
      };
  }
}

function generatePlanetProperties(element: Element, type: PlanetType, baseRadius: number, index: number): {
  atmosphere?: { color: string; density: number; glow: number };
  surface?: { roughness: number; metallic: number; emissive: string; normalStrength: number };
  rings?: { innerRadius: number; outerRadius: number; color: string; opacity: number };
  moons?: number;
  radius: number;
  weather?: WeatherSystem;
  geometry?: PlanetGeometry;
} {
  const elementColor = ELEMENT_COLORS[element];
  let radius = baseRadius;
  
  // Type-specific properties
  switch (type) {
    case "gas_giant":
      radius *= 1.8; // Much larger
      return {
        atmosphere: {
          color: elementColor,
          density: 0.8,
          glow: 1.2
        },
        surface: {
          roughness: 0.1,
          metallic: 0.0,
          emissive: elementColor,
          normalStrength: 0.3
        },
        rings: Math.random() > 0.7 ? {
          innerRadius: 1.2,
          outerRadius: 1.8,
          color: elementColor,
          opacity: 0.6
        } : undefined,
        moons: Math.floor(Math.random() * 4) + 2,
        radius,
        weather: generateWeatherSystem(type, element),
        geometry: generatePlanetGeometry(type, element, index)
      };
      
    case "ice_world":
      radius *= 0.9;
      return {
        atmosphere: {
          color: "#8BF9FF",
          density: 0.3,
          glow: 0.6
        },
        surface: {
          roughness: 0.2,
          metallic: 0.1,
          emissive: "#001122",
          normalStrength: 0.8
        },
        moons: Math.random() > 0.5 ? 1 : 0,
        radius,
        weather: generateWeatherSystem(type, element),
        geometry: generatePlanetGeometry(type, element, index)
      };
      
    case "volcanic":
      radius *= 1.1;
      return {
        atmosphere: {
          color: "#FF4444",
          density: 0.5,
          glow: 1.5
        },
        surface: {
          roughness: 0.9,
          metallic: 0.2,
          emissive: "#FF2200",
          normalStrength: 1.2
        },
        moons: 0,
        radius,
        weather: generateWeatherSystem(type, element),
        geometry: generatePlanetGeometry(type, element, index)
      };
      
    case "crystal":
      radius *= 0.8;
      return {
        atmosphere: {
          color: elementColor,
          density: 0.2,
          glow: 2.0
        },
        surface: {
          roughness: 0.0,
          metallic: 0.9,
          emissive: elementColor,
          normalStrength: 0.5
        },
        moons: 0,
        radius,
        weather: generateWeatherSystem(type, element),
        geometry: generatePlanetGeometry(type, element, index)
      };
      
    case "ocean":
      radius *= 1.2;
      return {
        atmosphere: {
          color: "#38B6FF",
          density: 0.6,
          glow: 0.8
        },
        surface: {
          roughness: 0.3,
          metallic: 0.1,
          emissive: "#001144",
          normalStrength: 0.6
        },
        moons: Math.random() > 0.6 ? 1 : 0,
        radius,
        weather: generateWeatherSystem(type, element),
        geometry: generatePlanetGeometry(type, element, index)
      };
      
    case "desert":
      radius *= 1.0;
      return {
        atmosphere: {
          color: "#FFAA44",
          density: 0.4,
          glow: 0.5
        },
        surface: {
          roughness: 0.7,
          metallic: 0.0,
          emissive: "#221100",
          normalStrength: 0.9
        },
        moons: Math.random() > 0.8 ? 1 : 0,
        radius,
        weather: generateWeatherSystem(type, element),
        geometry: generatePlanetGeometry(type, element, index)
      };
      
    case "metal":
      radius *= 0.7;
      return {
        atmosphere: {
          color: "#CCCCCC",
          density: 0.1,
          glow: 0.3
        },
        surface: {
          roughness: 0.4,
          metallic: 1.0,
          emissive: "#333333",
          normalStrength: 0.4
        },
        moons: 0,
        radius,
        weather: generateWeatherSystem(type, element),
        geometry: generatePlanetGeometry(type, element, index)
      };
      
    case "toxic":
      radius *= 1.1;
      return {
        atmosphere: {
          color: "#88FF44",
          density: 0.9,
          glow: 1.0
        },
        surface: {
          roughness: 0.6,
          metallic: 0.0,
          emissive: "#224400",
          normalStrength: 0.7
        },
        moons: 0,
        radius,
        weather: generateWeatherSystem(type, element),
        geometry: generatePlanetGeometry(type, element, index)
      };
      
    default: // terrestrial
      radius *= 1.0;
      return {
        atmosphere: {
          color: "#66AAFF",
          density: 0.5,
          glow: 0.4
        },
        surface: {
          roughness: 0.5,
          metallic: 0.1,
          emissive: "#000000",
          normalStrength: 1.0
        },
        moons: Math.random() > 0.7 ? 1 : 0,
        radius,
        weather: generateWeatherSystem(type, element),
        geometry: generatePlanetGeometry(type, element, index)
      };
  }
}

// Data shape for HUD list component
export type HudSong = { id: string; title: string; icon: Element; color: string };

// Data shape for hologram 3D system (store/usePlayerStore)
export type PlanetType = "terrestrial" | "gas_giant" | "ice_world" | "desert" | "ocean" | "volcanic" | "crystal" | "toxic" | "metal";

export type WeatherSystem = {
  cloudLayers: {
    count: number;
    speed: number;
    density: number;
    color: string;
    height: number;
    turbulence: number;
  }[];
  storms?: {
    frequency: number;
    intensity: number;
    color: string;
    size: number;
    duration: number;
    type: 'hurricane' | 'electrical' | 'dust' | 'plasma' | 'ice';
  }[];
  atmospheric?: {
    winds: {
      speed: number;
      direction: number;
      variation: number;
    };
    pressure: number;
    temperature: number;
  };
};

export type PlanetGeometry = {
  shape: 'sphere' | 'oblate' | 'irregular' | 'rocky' | 'gaseous';
  deformation: number; // 0-1, how much the planet deviates from perfect sphere
  poleFlattening: number; // 0-1, flattening at poles (for gas giants)
  surfaceRoughness: number; // 0-1, surface height variation
  craterDensity: number; // 0-1, how many craters/features
  segments: {
    widthSegments: number;
    heightSegments: number;
  };
  scale: {
    x: number;
    y: number;
    z: number;
  };
};

export type HoloSong = {
  id: string;
  title: string;
  oneLiner: string;
  planet: { 
    radius: number; 
    color: string; 
    orbitRadius: number; 
    orbitSpeed: number; 
    tilt: number; 
    textureUrl?: string; 
    element?: Element;
    type: PlanetType;
    atmosphere?: {
      color: string;
      density: number;
      glow: number;
    };
    surface?: {
      roughness: number;
      metallic: number;
      emissive: string;
      normalStrength: number;
    };
    rings?: {
      innerRadius: number;
      outerRadius: number;
      color: string;
      opacity: number;
    };
    moons?: number;
    weather?: WeatherSystem;
    geometry?: PlanetGeometry;
  };
};

export function buildPlanetSongs(): { hudSongs: HudSong[]; holoSongs: HoloSong[] } {
  // Explicit song→element mapping (by title); favors precise control over heuristics
  const PAIRS: Array<[string, Element]> = [
    ["ALONE", "darkness"],
    ["MR. BRIGHTSIDE", "darkness"],
    ["ALWAYS ON MY MIND", "heart"],
    ["BABY", "heart"],
    ["BE MY BEE", "heart"],
    ["BE MY BEE (ACOUSTIC)", "heart"],
    ["BRAIN FREEZE", "lightning"],
    ["HOME", "lightning"],
    ["LETTING GO", "water"],
    ["OCEAN GIRL", "water"],
    ["OCEAN GIRL (ACOUSTIC)", "water"],
    ["OCEAN GIRL (REMIX)", "water"],
    ["LITTLE BLACK HEART", "darkness"],
    ["COLORS OF OUR HOME", "heart"],
    ["WE'RE JUST FRIENDS", "heart"],
    ["WE'RE JUST FRIENDS (DMVRCO REMIX)", "heart"],
    ["GAME BOY HEART", "lightning"],
    ["KID FOREVER", "lightning"],
    ["COLLIDE", "heart"],
    ["I MIGHT FALL IN LOVE WITH YOU", "heart"],
    ["SOMEBODY TO LOVE", "heart"],
    ["TIENES UN AMIGO", "heart"],
    ["WE'RE JUST FRIENDS (mickey jas REMIX)", "heart"],
    ["PARIS", "darkness"],
    ["BELIEVE IN ME", "heart"],
    ["LOVE", "heart"],
    ["WE'RE JUST FRIENDS (ACOUSTIC)", "heart"],
    ["FEELING THIS", "lightning"],
    ["HOME (ACOUSTIC)", "lightning"],
    ["HOUSE PARTY", "lightning"],
    ["HOUSE PARTY (ACOUSTIC)", "lightning"],
    ["POKÉMON", "lightning"],
  ];
  // Build a map by slug; include some alternates for common cover variants
  const TITLE_ELEMENT_MAP: Record<string, Element> = {};
  for (const [title, el] of PAIRS) {
    const s = slugify(title);
    TITLE_ELEMENT_MAP[s] = el;
    // Add common alternates
    if (s === "mr-brightside") TITLE_ELEMENT_MAP["mr-brightside-killers-cover"] = el;
    if (s === "feeling-this") TITLE_ELEMENT_MAP["feeling-this-blink-182-cover"] = el;
    if (s === "house-party") TITLE_ELEMENT_MAP["alien-house-party"] = el; // alias used in some assets
  }
  const hudSongs: HudSong[] = [];
  const holoSongs: HoloSong[] = [];

  const baseRadius = 0.8; // base planet radius
  const radiusJitter = 0.35; // add variety

  // Order tracks alphabetically by title for UI friendliness
  const ordered = [...tracks].sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }));
  ordered.forEach((t, i) => {
    const id = (t.slug || `track-${i + 1}`);
    const element = TITLE_ELEMENT_MAP[id] ?? pickElement(id, i);
    const color = ELEMENT_COLORS[element];

    hudSongs.push({ id, title: t.title, icon: element, color });

    // orbit spacing and speed with variety
    const orbitRadius = 1.6 + (i % 8) * 0.5 + (i % 3) * 0.15;
    const orbitSpeed = 0.28 + ((i % 7) * 0.03);
    const tilt = 0.12 + ((i % 5) * 0.03);
    const radius = baseRadius + ((i % 5) * (radiusJitter / 5));

    const planetType = pickPlanetType(element, id);
    const planetProps = generatePlanetProperties(element, planetType, radius, i);
    
    holoSongs.push({
      id,
      title: t.title,
      oneLiner: t.subtitle || "",
      // Planets should look like realistic worlds with element colors — no cover textures
      planet: { 
        radius: planetProps.radius, 
        color, 
        orbitRadius, 
        orbitSpeed, 
        tilt, 
        element,
        type: planetType,
        atmosphere: planetProps.atmosphere,
        surface: planetProps.surface,
        rings: planetProps.rings,
        moons: planetProps.moons
      },
    });
  });

  return { hudSongs, holoSongs };
}
