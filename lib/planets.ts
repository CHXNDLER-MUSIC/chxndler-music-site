import { tracks } from "@/lib/songs-consolidated";
import { slugify } from "@/lib/slug";

export type Element = "water" | "fire" | "earth" | "air" | "heart" | "lightning" | "darkness";

export const ELEMENT_COLORS: Record<Element, string> = {
  water: "#38B6FF",    // cyan/blue
  fire: "#FC54AF",     // neon magenta (brand-leaning fire)
  earth: "#F2EF1D",    // neon yellow
  air: "#8BF9FF",      // light cyan
  heart: "#FC54AF",    // bright pink
  lightning: "#F2EF1D", // neon yellow
  darkness: "#000000",  // deep black
};

function pickElement(slug: string, index: number): Element {
  const s = slug.toLowerCase();
  
  // Darkness songs
  if (s.includes("alone") || s.includes("cheerleader") || s.includes("little-black-heart") || 
      s.includes("mr-brightside") || s.includes("paris")) return "darkness";
  
  // Heart songs  
  if (s.includes("always-on-my-mind") || s.includes("baby") || s.includes("be-my-bee") ||
      s.includes("collide") || s.includes("colors-of-our-home") || s.includes("i-might-fall-in-love") ||
      s.includes("love-me") || s.includes("somebody-to-love") || s.includes("tienes-un-amigo") ||
      s.includes("we-re-just-friends")) return "heart";
  
  // Lightning songs
  if (s.includes("american-dream") || s.includes("blue") || s.includes("brain-freeze") ||
      s.includes("feeling-this") || s.includes("game-boy-heart") || s.includes("home") ||
      s.includes("house-party") || s.includes("kid-forever") || s.includes("pokemon")) return "lightning";
  
  // Water songs
  if (s.includes("letting-go") || s.includes("ocean-girl")) return "water";
  
  // Legacy fallback for unmapped songs
  if (s.includes("heart") || s.includes("love") || s.includes("friends")) return "heart";
  if (s.includes("lightning") || s.includes("electric") || s.includes("neon")) return "lightning";
  if (s.includes("dark") || s.includes("black") || s.includes("midnight")) return "darkness";
  if (s.includes("ocean") || s.includes("tide") || s.includes("wave") || s.includes("sea")) return "water";
  
  // fallback: cycle for variety
  const cycle: Element[] = ["water", "heart", "lightning", "darkness", "fire", "earth", "air"];
  return cycle[index % cycle.length];
}

// Comprehensive planet data based on detailed mapping
export const SONG_PLANET_DATA: Record<string, {
  element: Element;
  color: string;
  surface: string;
  atmosphere: string;
  shape: string;
  surfaceElements: string;
}> = {
  // DARKNESS PLANETS
  "alone": {
    element: "darkness",
    color: "#000000",
    surface: "Jagged obsidian crust with deep canyons glowing faint red, fractured tectonic plates",
    atmosphere: "Thin grey fog, cold starlight reflection, faint aurora in monochrome",
    shape: "Irregular sphere, fractured into floating chunks",
    surfaceElements: "Deep cracks, barren plains, no vegetation"
  },
  "cheerleader": {
    element: "darkness", 
    color: "#000000",
    surface: "Black asphalt terrain with faded white lines like abandoned stadium floor",
    atmosphere: "Faint echo of crowd cheers in static, neon scoreboard flashes glitching",
    shape: "Round, smooth but with flat plateau tops",
    surfaceElements: "Stadium-like markings, empty bleachers carved into terrain"
  },
  "little-black-heart": {
    element: "darkness",
    color: "#000000", 
    surface: "Volcanic rock cracked with violet magma veins shaped like arteries",
    atmosphere: "Smoke plumes venting upward, sparks raining like falling stars",
    shape: "Jagged orb with volcanic ridges",
    surfaceElements: "Lava rivers, no trees, moth-like life"
  },
  "mr-brightside": {
    element: "darkness",
    color: "#000000",
    surface: "Smooth black mirrored plains broken by jagged silver shards",
    atmosphere: "Blinding camera-flash storms, cold metallic haze", 
    shape: "Shiny reflective sphere",
    surfaceElements: "Mirror-like surfaces, scattered crystal towers"
  },
  "paris": {
    element: "darkness",
    color: "#000000",
    surface: "Black cobblestone terrain glistening with rain, glowing Eiffel Tower fissures",
    atmosphere: "Golden mist curling like cigarette smoke, subtle neon reflections",
    shape: "Rounded globe with soft edges",
    surfaceElements: "Stone streets, faint Parisian-style arches, rain puddles"
  },

  // HEART PLANETS  
  "always-on-my-mind": {
    element: "heart",
    color: "#FC54AF",
    surface: "Rose-pink velvet plains shimmering under soft light",
    atmosphere: "Haze of glowing hearts breaking and reforming in slow motion",
    shape: "Soft rounded orb",
    surfaceElements: "Fabric-like valleys, glowing heart-shaped lakes"
  },
  "always-on-my-mind-remix": {
    element: "heart",
    color: "#FC54AF",
    surface: "Bright pink velvet plains glowing more intensely",
    atmosphere: "Bright glowing haze of hearts breaking and reforming",
    shape: "Soft rounded orb",
    surfaceElements: "Glowing heart-shaped lakes, more saturated pink plains"
  },
  "baby": {
    element: "heart",
    color: "#FC54AF", 
    surface: "Pastel pink terrain with toy block mountains and carousel-striped craters",
    atmosphere: "Cotton-candy clouds and bubblegum bursts popping outward",
    shape: "Rounded sphere with playful bumps",
    surfaceElements: "Carousel ridges, toy block mountains"
  },
  "be-my-bee": {
    element: "heart",
    color: "#FC54AF",
    surface: "Golden honeycomb crust glowing from within, dripping molten honey",
    atmosphere: "Warm pollen mist shimmering like glitter", 
    shape: "Hex-patterned globe",
    surfaceElements: "Honeycomb surface, flower meadows, nectar pools"
  },
  "be-my-bee-acoustic": {
    element: "heart",
    color: "#FC54AF",
    surface: "Golden honeycomb crust with pink nectar pools replacing green",
    atmosphere: "Warm pollen mist shimmering pinkish gold",
    shape: "Hex-patterned globe",
    surfaceElements: "Pink flower meadows, honeycombs"
  },
  "collide": {
    element: "heart",
    color: "#FC54AF",
    surface: "Crystalline pink ridges colliding at sharp angles, glowing fractures",
    atmosphere: "Starbursts of comet-like sparks streaking across skies",
    shape: "Angular jagged orb", 
    surfaceElements: "Crystal mountains, fault lines"
  },
  "colors-of-our-home": {
    element: "heart",
    color: "#FC54AF",
    surface: "Warm pink base veined with pastel rainbow rivers",
    atmosphere: "Aurora borealis in golden and violet hues",
    shape: "Rounded sphere",
    surfaceElements: "Rainbow rivers, pastel forests, glowing hills"
  },
  "colors-of-our-home-bluma-game-soundtrack": {
    element: "heart",
    color: "#FC54AF",
    surface: "Pink and blue terrain blending together like game-level tiles",
    atmosphere: "Blue and pink auroras in sky",
    shape: "Rounded orb",
    surfaceElements: "Blue rivers, pink forests, glowing pastel hills"
  },
  "i-might-fall-in-love-with-you": {
    element: "heart", 
    color: "#FC54AF",
    surface: "Pastel rose surface with swirling golden brushstrokes",
    atmosphere: "Cartoon-like doodle clouds drifting in slow motion",
    shape: "Soft orb with smooth swirls",
    surfaceElements: "Cartoon-like hills, record-shaped plateaus"
  },
  "love-me": {
    element: "heart",
    color: "#FC54AF",
    surface: "Pink crust fractured with glowing violet rivers of light",
    atmosphere: "Drifting neon rose petals",
    shape: "Cracked orb",
    surfaceElements: "Canyons glowing violet, rose gardens sprouting"
  },
  "pink-moon": {
    element: "heart",
    color: "#FC54AF",
    surface: "Bright pink glowing terrain illuminated with neon lights",
    atmosphere: "Neon glow mist orbiting like auroras",
    shape: "Rounded neon orb",
    surfaceElements: "Pink neon valleys, glowing craters"
  },
  "somebody-to-love": {
    element: "heart",
    color: "#FC54AF", 
    surface: "Pink marble terrain with handprint depressions etched in gold",
    atmosphere: "Faint echoes of voices, silhouettes flickering like mirages",
    shape: "Smooth marble orb",
    surfaceElements: "Handprint-shaped valleys, golden pools"
  },
  "tienes-un-amigo": {
    element: "heart",
    color: "#FC54AF",
    surface: "Glowing pink surface veined with golden rivers forming constellation-like maps",
    atmosphere: "Warm golden haze like candlelight",
    shape: "Round glowing globe",
    surfaceElements: "Golden rivers, friendly tree groves"
  },
  "were-just-friends": {
    element: "heart", 
    color: "#FC54AF",
    surface: "Pink terrain shattered into crystal shards glowing white along cracks", 
    atmosphere: "Sparks and static crackling between pieces",
    shape: "Fragmented sphere",
    surfaceElements: "Floating shards, canyon ridges"
  },
  "were-just-friends-dmvrco-remix": {
    element: "heart", 
    color: "#FC54AF",
    surface: "Pink terrain shattered into crystal shards with more vibrant glowing cracks", 
    atmosphere: "Bright sparks and neon static crackling between shards",
    shape: "Fragmented sphere",
    surfaceElements: "Floating shards glowing in vibrant pink and purple"
  },
  "were-just-friends-mickey-jas-remix": {
    element: "heart", 
    color: "#FC54AF",
    surface: "Pink terrain with softened cracks, matte pastel texture for lo-fi vibe", 
    atmosphere: "Gentle static haze with muted pastel sparks",
    shape: "Fragmented soft orb",
    surfaceElements: "Canyons and shards with muted pastel colors"
  },

  // LIGHTNING PLANETS
  "american-dream": {
    element: "lightning",
    color: "#F2EF1D",
    surface: "Neon yellow skyscraper formations like jagged teeth covered in glowing billboards",
    atmosphere: "Smog of green lightning bolts shaped like dollar signs",
    shape: "Jagged high-rise sphere", 
    surfaceElements: "Skyscrapers, digital billboards"
  },
  "blue": {
    element: "lightning",
    color: "#F2EF1D",
    surface: "Yellow crust covered with stormy sapphire-blue clouds",
    atmosphere: "Electric rain flashing between blue and gold",
    shape: "Rounded glowing orb",
    surfaceElements: "Ocean-like storm seas, thundercloud valleys"
  },
  "brain-freeze": {
    element: "lightning",
    color: "#F2EF1D",
    surface: "Yellow frozen crust cracked with glowing icy fissures", 
    atmosphere: "Mist of crystalline frost particles sparkling like diamonds",
    shape: "Icy globe",
    surfaceElements: "Glaciers, frozen rivers, neon icebergs"
  },
  "feeling-this": {
    element: "lightning",
    color: "#F2EF1D",
    surface: "Jagged punk-graffiti terrain in neon yellow and black stripes",
    atmosphere: "Spray-paint storms and neon sparks flashing",
    shape: "Angular jagged orb",
    surfaceElements: "Graffiti walls, skate-park craters"
  },
  "feeling-this-cosmic": {
    element: "lightning",
    color: "#F2EF1D",
    surface: "Jagged punk-graffiti terrain with neon graffiti art sprayed across",
    atmosphere: "Spacey cosmic spray-paint storms with glowing graffiti tags",
    shape: "Angular jagged orb",
    surfaceElements: "Graffiti walls, cosmic skate-park craters"
  },
  "game-boy-heart": {
    element: "lightning",
    color: "#F2EF1D",
    surface: "Pixel-mapped yellow terrain with giant 8-bit blocks",
    atmosphere: "Glowing pixel clouds flickering like loading screens",
    shape: "Blocky cube-like sphere",
    surfaceElements: "Pixel platforms, arcade hills"
  },
  "home": {
    element: "lightning",
    color: "#F2EF1D", 
    surface: "Golden stitched quilt patches glowing softly",
    atmosphere: "Amber lantern haze and warm smoke drifting",
    shape: "Round cozy orb",
    surfaceElements: "Patchwork lands, lantern-lit cottages"
  },
  "home-acoustic": {
    element: "lightning",
    color: "#F2EF1D", 
    surface: "Golden quilt patches mixed with pink and blue accents",
    atmosphere: "Amber lantern haze with pink-blue smoke drifting",
    shape: "Round cozy orb",
    surfaceElements: "Patchwork lands accented pink and blue"
  },
  "alien-house-party": {
    element: "lightning",
    color: "#F2EF1D",
    surface: "Neon cracked dance floor tiles flashing on/off",
    atmosphere: "Strobe beams projecting into void",
    shape: "Bumpy spherical dance-floor",
    surfaceElements: "Dance tiles, glowing stairways"
  },
  "kid-forever": {
    element: "lightning",
    color: "#F2EF1D",
    surface: "Yellow graffiti-covered terrain like cosmic playground",
    atmosphere: "Glow-in-the-dark doodle clouds (dinosaurs, stars, spaceships)",
    shape: "Playful rounded orb",
    surfaceElements: "Playgrounds, neon treehouses, cartoon slides"
  },
  "pokemon": {
    element: "lightning", 
    color: "#F2EF1D",
    surface: "Neon yellow surface textured like a glowing Poké Ball grid",
    atmosphere: "Pixelated spark clouds bursting in 8-bit",
    shape: "Perfectly round sphere", 
    surfaceElements: "Poké Ball craters, digital forests"
  },

  // WATER PLANETS
  "letting-go": {
    element: "water",
    color: "#38B6FF",
    surface: "Deep swirling oceans with glowing whirlpools",
    atmosphere: "White foam clouds twisting like feathers",
    shape: "Watery sphere",
    surfaceElements: "Endless seas, glowing whirlpools"
  },
  "ocean-girl": {
    element: "water",
    color: "#38B6FF",
    surface: "Turquoise waves frozen mid-crest, liquid glass reflection",
    atmosphere: "Pink horizon glow with seaspray drifting like mist",
    shape: "Oceanic orb",
    surfaceElements: "Coral reefs, seashell ridges, tidal valleys"
  },
  "ocean-girl-acoustic": {
    element: "water",
    color: "#38B6FF",
    surface: "Turquoise waves with purple accents flowing through water",
    atmosphere: "Pink horizon glow with purple seaspray drifting like mist",
    shape: "Oceanic orb",
    surfaceElements: "Coral reefs with purple coral, seashell ridges, tidal valleys"
  },
  "ocean-girl-remix": {
    element: "water",
    color: "#38B6FF",
    surface: "Turquoise waves with black streaks flowing across surface",
    atmosphere: "Pink horizon glow with black mist over seaspray",
    shape: "Oceanic orb",
    surfaceElements: "Coral reefs with black coral, dark tidal valleys"
  }
};

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
        moons: 0, // Removed moons per user request
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
        moons: 0, // Removed moons per user request
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
        moons: 0, // Removed moons per user request
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
        moons: 0, // Removed moons per user request
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
        moons: 0, // Removed moons per user request
        radius,
        weather: generateWeatherSystem(type, element),
        geometry: generatePlanetGeometry(type, element, index)
      };
  }
}

// Data shape for HUD list component
export type HudSong = { id: string; title: string; icon: Element; color: string; spotify?: string; apple?: string; youtube?: string; karaoke?: string; hasLyrics?: boolean; is_released?: boolean };

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
    // Deterministic visual seed so the same song always looks the same
    seed?: number;
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
    // Optional visual motifs to drive shader patterns
    motifs?: { name: PlanetMotifName; color?: string; intensity?: number }[];
  };
};

// Dramatic visual motifs supported by the planet shader
export type PlanetMotifName =
  | 'cracks'           // glowing fracture lines
  | 'honeycomb'        // hex grid + warm emissive cells
  | 'pixel'            // blocky 8-bit quantization
  | 'tiles'            // tiled dancefloor/grid
  | 'quilt'            // patchwork squares with seams
  | 'graffiti'         // stripes + spray splatter
  | 'cobblestone'      // rounded stones, wet look
  | 'mirror'           // metallic mirror-like side
  | 'skyscraper'       // vertical neon billboard bands
  | 'heart_lakes'      // heart-shaped lake mask
  | 'aurora'           // atmospheric aurora tint
  | 'coral'            // coral speckles and reefs
  | 'shards'           // faceted shard highlight lines
  | 'dollar_bolts'     // green $-shaped lightning accents
  | 'petals'           // drifting neon petal tint
  | 'rivers'           // flowing colored rivers
  | 'stadium_lines'    // field/track markings
  | 'velvet'           // soft velvet shading
  ;

function inferMotifsFromDescriptor(slug: string): { name: PlanetMotifName; color?: string; intensity?: number }[] | undefined {
  // Try direct slug, then a few common alias variants
  let d = SONG_PLANET_DATA[slug];
  if (!d) {
    const aliases = [
      slug.replace(/-killers-cover$/, ''),
      slug.replace(/-blink-182-cover$/, ''),
      slug.replace(/^alien-/, ''),
      slug.replace(/\(.*\)$/, '').replace(/--+/g, '-').replace(/-$/, ''),
    ];
    for (const a of aliases) { if (SONG_PLANET_DATA[a]) { d = SONG_PLANET_DATA[a]; break; } }
  }
  if (!d) return undefined;
  const src = `${d.surface} ${d.atmosphere} ${d.surfaceElements}`.toLowerCase();
  const motifs: { name: PlanetMotifName; color?: string; intensity?: number }[] = [];

  const push = (name: PlanetMotifName, color?: string, intensity?: number) => motifs.push({ name, color, intensity });

  // Heuristic keyword mapping from descriptors → motifs
  if (src.includes('honeycomb')) push('honeycomb', d.color);
  if (src.includes('pixel') || src.includes('8-bit') || src.includes('grid')) push('pixel', d.color);
  if (src.includes('dance floor') || src.includes('tiles') || src.includes('tile')) push('tiles', d.color);
  if (src.includes('quilt') || src.includes('patch')) push('quilt', '#F2EF1D');
  if (src.includes('graffiti') || src.includes('spray')) push('graffiti', '#F2EF1D');
  if (src.includes('cobblestone')) push('cobblestone', '#444444');
  if (src.includes('mirror')) push('mirror', '#C0C0C0', 1.0);
  if (src.includes('skyscraper') || src.includes('billboard')) push('skyscraper', d.color);
  if (src.includes('heart') && src.includes('lake')) push('heart_lakes', '#FC54AF');
  if (src.includes('aurora')) push('aurora', '#FF77FF');
  if (src.includes('coral')) push('coral', '#FF7F50');
  if (src.includes('shard') || src.includes('crystal')) push('shards', '#FFFFFF');
  if (src.includes('dollar')) push('dollar_bolts', '#32CD32');
  if (src.includes('petal')) push('petals', '#FF66CC');
  if (src.includes('river')) push('rivers', '#8bf9ff');
  if (src.includes('stadium') || src.includes('bleachers') || src.includes('lines')) push('stadium_lines', '#FFFFFF');
  if (src.includes('velvet')) push('velvet');

  // Cracks/fractures
  if (src.includes('crack') || src.includes('fracture') || src.includes('shattered') || src.includes('fragment')) {
    // Try to derive glow color from element color
    const crackColor = d.element === 'heart' ? '#FF77FF' : d.element === 'water' ? '#66CCFF' : d.element === 'lightning' ? '#FFF26A' : '#FF3355';
    push('cracks', crackColor, 1.0);
  }

  return motifs.length ? motifs : undefined;
}

export function buildPlanetSongs(): { hudSongs: HudSong[]; holoSongs: HoloSong[] } {
  // build process start
  // Deterministic numeric seed from slug (stable across reloads)
  const seedFromSlug = (slug: string) => {
    let h = 2166136261; // FNV-1a base
    for (let i = 0; i < slug.length; i++) {
      h ^= slug.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // Map to 0..1000 range for shader seed usage
    return Math.abs(h % 1000) + 1;
  };

  // Per-song personality overrides to give each world a unique vibe
  const SONG_OVERRIDES: Record<string, Partial<{
    type: PlanetType;
    atmosphere: { color: string; density: number; glow: number };
    surface: { roughness: number; metallic: number; emissive: string; normalStrength: number };
    rings: { innerRadius: number; outerRadius: number; color: string; opacity: number } | null;
    moons: number;
    weather: WeatherSystem;
    geometry: PlanetGeometry;
  }>> = {
    'ocean-girl': {
      type: 'ocean',
      atmosphere: { color: '#19E3FF', density: 0.55, glow: 1.1 },
      surface: { roughness: 0.12, metallic: 0.02, emissive: '#002244', normalStrength: 0.6 },
      rings: null, // clean ocean world
      moons: 2,
    },
    'mr-brightside': {
      type: 'volcanic',
      atmosphere: { color: '#FF4444', density: 0.6, glow: 1.4 },
      surface: { roughness: 0.9, metallic: 0.15, emissive: '#FF2200', normalStrength: 1.2 },
      rings: { innerRadius: 1.18, outerRadius: 1.65, color: '#FF6B6B', opacity: 0.35 },
      moons: 0,
    },
    'game-boy-heart': {
      type: 'crystal',
      atmosphere: { color: '#F2EF1D', density: 0.45, glow: 1.6 },
      surface: { roughness: 0.35, metallic: 0.65, emissive: '#1B1B1B', normalStrength: 0.9 },
      rings: { innerRadius: 1.35, outerRadius: 1.95, color: '#F2EF1D', opacity: 0.5 },
      moons: 1,
    },
    'kid-forever': {
      type: 'gas_giant',
      atmosphere: { color: '#F2EF1D', density: 0.75, glow: 1.4 },
      rings: { innerRadius: 1.25, outerRadius: 1.9, color: '#F2EF1D', opacity: 0.45 },
      moons: 4,
    },
    'brain-freeze': {
      type: 'ice_world',
      atmosphere: { color: '#8BF9FF', density: 0.5, glow: 1.0 },
      surface: { roughness: 0.28, metallic: 0.05, emissive: '#001122', normalStrength: 0.95 },
      rings: null,
      moons: 1,
    },
    'house-party': {
      type: 'crystal',
      atmosphere: { color: '#F2EF1D', density: 0.6, glow: 1.8 },
      surface: { roughness: 0.42, metallic: 0.5, emissive: '#2e1e00', normalStrength: 0.8 },
      rings: { innerRadius: 1.2, outerRadius: 1.8, color: '#F2EF1D', opacity: 0.55 },
      moons: 2,
    },
    'alone': {
      type: 'volcanic',
      atmosphere: { color: '#8B5A8B', density: 0.45, glow: 1.2 },
      surface: { roughness: 0.8, metallic: 0.2, emissive: '#2a002a', normalStrength: 1.1 },
      rings: null,
      moons: 1,
    }
  };
  // Explicit song→element mapping (by title); favors precise control over heuristics
  const PAIRS: Array<[string, Element]> = [
    // HEART ELEMENT SONGS
    ["ALWAYS ON MY MIND", "heart"],
    ["ALWAYS ON MY MIND (ACOUSTIC)", "heart"],
    ["ALWAYS ON MY MIND (REMIX)", "heart"],
    ["BABY", "heart"],
    ["BE MY BEE", "heart"],
    ["BE MY BEE (ACOUSTIC)", "heart"],
    ["COLLIDE", "heart"],
    ["COLORS OF OUR HOME", "heart"],
    ["COLORS OF OUR HOME (ACOUSTIC)", "heart"],
    ["COLORS OF OUR HOME (BLUMA Game Soundtrack)", "heart"],
    ["I MIGHT FALL IN LOVE WITH YOU", "heart"],
    ["I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)", "heart"],
    ["LOVE ME", "heart"],
    ["LOVE ME (ACOUSTIC)", "heart"],
    ["PINK MOON", "heart"],
    ["SOMEBODY TO LOVE", "heart"],
    ["TIENES UN AMIGO", "heart"],
    ["WE'RE JUST FRIENDS", "heart"],
    ["WE'RE JUST FRIENDS (ACOUSTIC)", "heart"],
    ["WE'RE JUST FRIENDS (DMVRCO REMIX)", "heart"],
    ["WE'RE JUST FRIENDS (mickey jas REMIX)", "heart"],
    
    // WATER ELEMENT SONGS
    ["LETTING GO", "water"],
    ["OCEAN GIRL", "water"],
    ["OCEAN GIRL (ACOUSTIC)", "water"],
    ["OCEAN GIRL (REMIX)", "water"],
    
    // LIGHTNING ELEMENT SONGS
    ["AMERICAN DREAM", "lightning"],
    ["BLUE", "lightning"],
    ["BLUE (ACOUSTIC)", "lightning"],
    ["BRAIN FREEZE", "lightning"],
    ["FEELING THIS", "lightning"],
    ["GAME BOY HEART", "lightning"],
    ["HOME", "lightning"],
    ["HOME (ACOUSTIC)", "lightning"],
    ["HOUSE PARTY", "lightning"],
    ["HOUSE PARTY (ACOUSTIC)", "lightning"],
    ["KID FOREVER", "lightning"],
    ["POKÉMON", "lightning"],
    
    // DARKNESS ELEMENT SONGS
    ["ALONE", "darkness"],
    ["LITTLE BLACK HEART", "darkness"],
    ["MR. BRIGHTSIDE", "darkness"],
    ["PARIS", "darkness"],
    
    // Legacy mappings (keeping for compatibility)
    ["BELIEVE IN ME", "heart"],
    ["LOVE", "heart"],
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

    hudSongs.push({ id, title: t.title, icon: element, color, spotify: t.spotify, apple: t.apple, youtube: (t as any).youtube, karaoke: (t as any).karaoke, hasLyrics: (t as any).hasLyrics !== false });

    // orbit spacing and speed with variety - increased distance from central heart planet
    const orbitRadius = 12.0 + (i % 8) * 2.0 + (i % 3) * 1.0;
    const orbitSpeed = 0.28 + ((i % 7) * 0.03);
    const tilt = 0.12 + ((i % 5) * 0.03);
    const radius = baseRadius + ((i % 5) * (radiusJitter / 5));

    const planetType = pickPlanetType(element, id);
    const planetProps = generatePlanetProperties(element, planetType, radius, i);
    // Merge song-specific overrides for more personality
    const override = SONG_OVERRIDES[id] || {};
    const merged = {
      type: override.type || planetType,
      atmosphere: override.atmosphere || planetProps.atmosphere,
      surface: override.surface || planetProps.surface,
      rings: (override.rings === null) ? undefined : (override.rings || planetProps.rings),
      moons: override.moons ?? planetProps.moons,
      weather: override.weather || planetProps.weather,
      geometry: override.geometry || planetProps.geometry,
    };
    
    // Infer dramatic motifs from rich descriptors, if available
    const inferredMotifs = inferMotifsFromDescriptor(id);

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
        type: merged.type,
        seed: seedFromSlug(id),
        atmosphere: merged.atmosphere,
        surface: merged.surface,
        rings: merged.rings,
        moons: merged.moons,
        weather: merged.weather,
        geometry: merged.geometry,
        motifs: inferredMotifs,
      },
    });
  });

  
  
  return { hudSongs, holoSongs };
}
