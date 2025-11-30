"use client";

import React from "react";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/sfx";
import { PLANET_CONFIGS, getPlanetsByType, getPlanetsByElement, ELEMENT_POSITIONS, ELEMENT_COLORS, SONG_ORBIT_RADIUS, type ElementType } from "@/lib/planetConfig";

interface ElementPosition {
  code: "heart" | "water" | "lightning" | "darkness";
  label: string;
  position: [number, number, number];
  color: string;
  glowColor: string;
}

interface SongPlanet {
  id: string;
  title: string;
  element: "heart" | "water" | "lightning" | "darkness";
  color: string;
  surface: string;
  atmosphere: string;
  shape: string;
  surfaceElements: string;
  isReleased?: boolean;
  [key: string]: any;
}

interface Song {
  id: string;
  title: string;
  [key: string]: any;
}

interface PlanetMinimapProps {
  currentMainId?: string | null;
  hoverId?: string | null;
  songs?: Song[];
  onClose?: () => void;
  onPlanetClick?: (planetId: string) => void;
}

// Get element configurations from unified config
const ELEMENTS = getPlanetsByType('element').map(planet => ({
  code: planet.element!,
  label: planet.name,
  position: planet.position!,
  color: planet.color,
  glowColor: planet.color
}));

// Comprehensive song planet data with detailed characteristics
const SONG_PLANETS: SongPlanet[] = [
  { id: "alone", title: "ALONE", element: "darkness", color: "#000000", surface: "Jagged obsidian crust with deep canyons glowing faint red, fractured tectonic plates", atmosphere: "Thin grey fog, cold starlight reflection, faint aurora in monochrome", shape: "Irregular sphere, fractured into floating chunks", surfaceElements: "Deep cracks, barren plains, no vegetation", isReleased: false },
  { id: "alone-acoustic", title: "ALONE (ACOUSTIC)", element: "darkness", color: "#000000", surface: "Midnight‑purple cityscape silhouette with glowing teal light between buildings", atmosphere: "Cosmic swirl of turquoise and violet nebula clouds, faint drifting star particles", shape: "Tall vertical city‑pillar formations rising from a flat ledge", surfaceElements: "Skyscraper silhouettes, rooftop ledge, faint cosmic backglow", isReleased: false },
  { id: "always-on-my-mind", title: "ALWAYS ON MY MIND", element: "heart", color: "#FC54AF", surface: "Rose-pink velvet plains shimmering under soft light", atmosphere: "Haze of glowing hearts breaking and reforming in slow motion", shape: "Soft rounded orb", surfaceElements: "Fabric-like valleys, glowing heart-shaped lakes" },
  { id: "always-on-my-mind-acoustic", title: "ALWAYS ON MY MIND (ACOUSTIC)", element: "heart", color: "#FC54AF", surface: "Soft twilight-blue suburban terrain with smooth asphalt roads and gently glowing windows", atmosphere: "Calm pastel sky with blue-pink cloud streaks drifting slowly", shape: "Rounded, slightly flattened suburban orb with low rooftops", surfaceElements: "Neighborhood houses, curving roads" },
  { id: "always-on-my-mind-remix", title: "ALWAYS ON MY MIND (REMIX)", element: "heart", color: "#FC54AF", surface: "Neon pink suburban terrain glowing like cotton candy, roads tinted magenta", atmosphere: "Hot pink and orange sunset haze filling the sky with dreamy warmth", shape: "Rounded suburban orb glowing intensely", surfaceElements: "Pink-lit houses, vivid sunset clouds, dangling neon heart charm" },
  { id: "american-dream", title: "AMERICAN DREAM", element: "lightning", color: "#F2EF1D", surface: "Neon yellow skyscraper formations like jagged teeth covered in glowing billboards", atmosphere: "Smog of green lightning bolts shaped like dollar signs", shape: "Jagged high-rise sphere", surfaceElements: "Skyscrapers, digital billboards" },
  { id: "baby", title: "BABY", element: "heart", color: "#FC54AF", surface: "Pastel pink terrain with toy block mountains and carousel-striped craters", atmosphere: "Cotton-candy clouds and bubblegum bursts popping outward", shape: "Rounded sphere with playful bumps", surfaceElements: "Carousel ridges, toy block mountains" },
  { id: "be-my-bee", title: "BE MY BEE", element: "heart", color: "#FC54AF", surface: "Golden honeycomb crust glowing from within, dripping molten honey", atmosphere: "Warm pollen mist shimmering like glitter", shape: "Hex-patterned globe", surfaceElements: "Honeycomb surface, flower meadows, nectar pools" },
  { id: "be-my-bee-acoustic", title: "BE MY BEE (ACOUSTIC)", element: "heart", color: "#FC54AF", surface: "Golden honeycomb crust with pink nectar pools replacing green", atmosphere: "Warm pollen mist shimmering pinkish gold", shape: "Hex-patterned globe", surfaceElements: "Pink flower meadows, honeycombs" },
  { id: "blue-acoustic", title: "BLUE (ACOUSTIC)", element: "lightning", color: "#F2EF1D", surface: "Hyper‑pink snow‑textured terrain with cotton‑candy hills and crystalline frost", atmosphere: "Pink fog haze illuminated by neon flame glow", shape: "Rounded frost‑coated orb with soft hills and fluffy terrain", surfaceElements: "Frost dunes, neon trees, glowing flame reflections" },
  { id: "blue", title: "BLUE", element: "lightning", color: "#F2EF1D", surface: "Yellow crust covered with stormy sapphire-blue clouds", atmosphere: "Electric rain flashing between blue and gold", shape: "Rounded glowing orb", surfaceElements: "Ocean-like storm seas, thundercloud valleys" },
  { id: "brain-freeze", title: "BRAIN FREEZE", element: "lightning", color: "#F2EF1D", surface: "Yellow frozen crust cracked with glowing icy fissures", atmosphere: "Mist of crystalline frost particles sparkling like diamonds", shape: "Icy globe", surfaceElements: "Glaciers, frozen rivers, neon icebergs" },
  { id: "cheerleader", title: "CHEERLEADER", element: "darkness", color: "#000000", surface: "Black asphalt terrain with faded white lines like abandoned stadium floor", atmosphere: "Faint echo of crowd cheers in static, neon scoreboard flashes glitching", shape: "Round, smooth but with flat plateau tops", surfaceElements: "Stadium-like markings, empty bleachers carved into terrain" },
  { id: "collide", title: "COLLIDE", element: "heart", color: "#FC54AF", surface: "Crystalline pink ridges colliding at sharp angles, glowing fractures", atmosphere: "Starbursts of comet-like sparks streaking across skies", shape: "Angular jagged orb", surfaceElements: "Crystal mountains, fault lines" },
  { id: "colors-of-our-home", title: "COLORS OF OUR HOME", element: "heart", color: "#FC54AF", surface: "Warm pink base veined with pastel rainbow rivers", atmosphere: "Aurora borealis in golden and violet hues", shape: "Rounded sphere", surfaceElements: "Rainbow rivers, pastel forests, glowing hills" },
  { id: "colors-of-our-home-acoustic", title: "COLORS OF OUR HOME (ACOUSTIC)", element: "heart", color: "#FC54AF", surface: "Soft pink‑violet forest floor with glowing grassy patches", atmosphere: "Magenta twilight haze with floating sparkles and warm glowing moon", shape: "Rounded orb with soft forest ridges", surfaceElements: "Trees, sparkles, glowing grass, gentle magical lighting" },
  { id: "colors-of-our-home-bluma", title: "COLORS OF OUR HOME (BLUMA Game Soundtrack)", element: "heart", color: "#FC54AF", surface: "Pink and blue terrain blending together like game-level tiles", atmosphere: "Blue and pink auroras in sky", shape: "Rounded orb", surfaceElements: "Blue rivers, pink forests, glowing pastel hills" },
  { id: "feeling-this", title: "FEELING THIS", element: "lightning", color: "#F2EF1D", surface: "Jagged punk-graffiti terrain with neon graffiti art sprayed across", atmosphere: "Spacey cosmic spray-paint storms with glowing graffiti tags", shape: "Angular jagged orb", surfaceElements: "Graffiti walls, cosmic skate-park craters" },
  { id: "game-boy-heart", title: "GAME BOY HEART", element: "lightning", color: "#F2EF1D", surface: "Pixel-mapped yellow terrain with giant 8-bit blocks", atmosphere: "Glowing pixel clouds flickering like loading screens", shape: "Blocky cube-like sphere", surfaceElements: "Pixel platforms, arcade hills" },
  { id: "home", title: "HOME", element: "lightning", color: "#F2EF1D", surface: "Golden stitched quilt patches glowing softly", atmosphere: "Amber lantern haze and warm smoke drifting", shape: "Round cozy orb", surfaceElements: "Patchwork lands, lantern-lit cottages" },
  { id: "home-acoustic", title: "HOME (ACOUSTIC)", element: "lightning", color: "#F2EF1D", surface: "Golden quilt patches mixed with pink and blue accents", atmosphere: "Amber lantern haze with pink-blue smoke drifting", shape: "Round cozy orb", surfaceElements: "Patchwork lands accented pink and blue" },
  { id: "house-party", title: "HOUSE PARTY", element: "lightning", color: "#F2EF1D", surface: "Neon cracked dance floor tiles flashing on/off", atmosphere: "Strobe beams projecting into void", shape: "Bumpy spherical dance-floor", surfaceElements: "Dance tiles, glowing stairways" },
  { id: "house-party-acoustic", title: "HOUSE PARTY (ACOUSTIC)", element: "lightning", color: "#F2EF1D", surface: "Neon cracked dance floor tiles with yellow accents instead of pink", atmosphere: "Soft strobe beams with yellow haze", shape: "Bumpy spherical dance-floor", surfaceElements: "Dance tiles accented with yellow neon" },
  { id: "i-might-fall-in-love-with-you", title: "I MIGHT FALL IN LOVE WITH YOU", element: "heart", color: "#FC54AF", surface: "Pastel rose surface with swirling golden brushstrokes", atmosphere: "Cartoon-like doodle clouds drifting in slow motion", shape: "Soft orb with smooth swirls", surfaceElements: "Cartoon-like hills, record-shaped plateaus" },
  { id: "i-might-fall-in-love-with-you-acoustic", title: "I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)", element: "heart", color: "#FC54AF", surface: "Smooth blue‑toned cartoon terrain resembling soft vinyl", atmosphere: "Dreamy blue sky with floating stars and cartoon sparkles", shape: "Rounded soft orb with curved cartoon edges", surfaceElements: "TV‑frame border, clouds, floating hearts, character silhouettes" },
  { id: "kid-forever", title: "KID FOREVER", element: "lightning", color: "#F2EF1D", surface: "Yellow graffiti-covered terrain like cosmic playground", atmosphere: "Glow-in-the-dark doodle clouds (dinosaurs, stars, spaceships)", shape: "Playful rounded orb", surfaceElements: "Playgrounds, neon treehouses, cartoon slides" },
  { id: "letting-go", title: "LETTING GO", element: "water", color: "#38B6FF", surface: "Deep swirling oceans with glowing whirlpools", atmosphere: "White foam clouds twisting like feathers", shape: "Watery sphere", surfaceElements: "Endless seas, glowing whirlpools" },
  { id: "little-black-heart", title: "LITTLE BLACK HEART", element: "darkness", color: "#000000", surface: "Volcanic rock cracked with violet magma veins shaped like arteries", atmosphere: "Smoke plumes venting upward, sparks raining like falling stars", shape: "Jagged orb with volcanic ridges", surfaceElements: "Lava rivers, no trees, moth-like life" },
  { id: "little-black-heart-acoustic", title: "LITTLE BLACK HEART (ACOUSTIC)", element: "darkness", color: "#000000", surface: "Stone‑grey cemetery terrain with cracked tombstone texture", atmosphere: "Violet moon glow casting cold drifting mist", shape: "Tombstone monolith on a flat plane", surfaceElements: "Heart‑shaped cutout, dead grass, moonlit fog" },
  { id: "love-me", title: "LOVE ME", element: "heart", color: "#FC54AF", surface: "Pink crust fractured with glowing violet rivers of light", atmosphere: "Drifting neon rose petals", shape: "Cracked orb", surfaceElements: "Canyons glowing violet, rose gardens sprouting" },
  { id: "love-me-acoustic", title: "LOVE ME (ACOUSTIC)", element: "heart", color: "#FC54AF", surface: "Jet-black neon surface with glowing blue fractured heart symbol at the center", atmosphere: "Electric blue aura radiating around the heart, pink neon backlight", shape: "Flat sign-plate floating against darkness", surfaceElements: "Cracks, stitched heart seams, neon drips, crossed bandage marks" },
  { id: "mr-brightside", title: "MR. BRIGHTSIDE", element: "darkness", color: "#000000", surface: "Smooth black mirrored plains broken by jagged silver shards", atmosphere: "Blinding camera-flash storms, cold metallic haze", shape: "Shiny reflective sphere", surfaceElements: "Mirror-like surfaces, scattered crystal towers" },
  { id: "ocean-girl", title: "OCEAN GIRL", element: "water", color: "#38B6FF", surface: "Turquoise waves frozen mid-crest, liquid glass reflection", atmosphere: "Pink horizon glow with seaspray drifting like mist", shape: "Oceanic orb", surfaceElements: "Coral reefs, seashell ridges, tidal valleys" },
  { id: "ocean-girl-acoustic", title: "OCEAN GIRL (ACOUSTIC)", element: "water", color: "#38B6FF", surface: "Turquoise waves with purple accents flowing through water", atmosphere: "Pink horizon glow with purple seaspray drifting like mist", shape: "Oceanic orb", surfaceElements: "Coral reefs with purple coral, seashell ridges, tidal valleys" },
  { id: "ocean-girl-remix", title: "OCEAN GIRL (REMIX)", element: "water", color: "#38B6FF", surface: "Turquoise waves with black streaks flowing across surface", atmosphere: "Pink horizon glow with black mist over seaspray", shape: "Oceanic orb", surfaceElements: "Coral reefs with black coral, dark tidal valleys" },
  { id: "paris", title: "PARIS", element: "darkness", color: "#000000", surface: "Black cobblestone terrain glistening with rain, glowing Eiffel Tower fissures", atmosphere: "Golden mist curling like cigarette smoke, subtle neon reflections", shape: "Rounded globe with soft edges", surfaceElements: "Stone streets, faint Parisian-style arches, rain puddles" },
  { id: "pink-moon", title: "PINK MOON", element: "heart", color: "#FC54AF", surface: "Bright pink glowing terrain illuminated with neon lights", atmosphere: "Neon glow mist orbiting like auroras", shape: "Rounded neon orb", surfaceElements: "Pink neon valleys, glowing craters" },
  { id: "pokemon", title: "POKÉMON", element: "lightning", color: "#F2EF1D", surface: "Neon yellow surface textured like a glowing Poké Ball grid", atmosphere: "Pixelated spark clouds bursting in 8-bit", shape: "Perfectly round sphere", surfaceElements: "Poké Ball craters, digital forests" },
  { id: "somebody-to-love", title: "SOMEBODY TO LOVE", element: "heart", color: "#FC54AF", surface: "Pink marble terrain with handprint depressions etched in gold", atmosphere: "Faint echoes of voices, silhouettes flickering like mirages", shape: "Smooth marble orb", surfaceElements: "Handprint-shaped valleys, golden pools" },
  { id: "tienes-un-amigo", title: "TIENES UN AMIGO", element: "heart", color: "#FC54AF", surface: "Glowing pink surface veined with golden rivers forming constellation-like maps", atmosphere: "Warm golden haze like candlelight", shape: "Round glowing globe", surfaceElements: "Golden rivers, friendly tree groves" },
  { id: "were-just-friends", title: "WE'RE JUST FRIENDS", element: "heart", color: "#FC54AF", surface: "Pink terrain shattered into crystal shards glowing white along cracks", atmosphere: "Sparks and static crackling between pieces", shape: "Fragmented sphere", surfaceElements: "Floating shards, canyon ridges" },
  { id: "were-just-friends-acoustic", title: "WE'RE JUST FRIENDS (ACOUSTIC)", element: "heart", color: "#FC54AF", surface: "Pastel blue-pink road curving through bubblegum-colored landscape", atmosphere: "Soft evening sky with stars twinkling gently above the city", shape: "Smooth rounded landscape orb with pastel terrain", surfaceElements: "Palm trees, skyline glow" },
  { id: "were-just-friends-dmvrco-remix", title: "WE'RE JUST FRIENDS (DMVRCO Remix)", element: "heart", color: "#FC54AF", surface: "Bright neon orange-pink terrain with hyper-saturated hills and palm trees", atmosphere: "Intense golden sunset glow, purple-blue night sky above", shape: "Rounded landscape orb with sharp neon accents", surfaceElements: "Orange mountains, neon city skyline" },
  { id: "were-just-friends-mickey-jas-remix", title: "WE'RE JUST FRIENDS (mickey jas Remix)", element: "heart", color: "#FC54AF", surface: "Soft pastel teal landscape with cotton-candy pink land ridges", atmosphere: "Cool blue dusk sky with soft moonlight and glowing city reflections", shape: "Smooth curved orb with gentle gradient hills", surfaceElements: "pastel skyline, teal palm trees" }
];

export default function PlanetMinimap({ currentMainId, hoverId, songs = [], onClose, onPlanetClick }: PlanetMinimapProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(true); // Default to collapsed
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);
  const [selectedPlanet, setSelectedPlanet] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Find the parent container of the 3D display instead of document.body
    const planetSystemContainer = document.querySelector('[data-planet-system]');
    if (planetSystemContainer) {
      setPortalContainer(planetSystemContainer as HTMLElement);
    } else {
      // Fallback to document.body if container not found
      setPortalContainer(document.body);
    }
  }, []);

  const handleClose = () => {
    sfx.play('close', 0.8);
    if (onClose) {
      onClose();
    }
  };

  const handleToggleCollapse = () => {
    sfx.play('close', 0.8);
    setIsCollapsed(!isCollapsed);
  };

  // Distribute song planets by their designated elements
  const songsPerElement = React.useMemo(() => {
    const distribution: { [key: string]: SongPlanet[] } = {
      water: [],
      lightning: [],
      heart: [],
      darkness: []
    };

    // Filter to only released songs - MATCHING 3D SYSTEM LOGIC
    const releasedSongs = songs.filter(song => song.status !== "locked" && song.status !== "coming_soon");
    
    releasedSongs.forEach(song => {
      const element = song.planet?.element ?? "heart";
      if (element && distribution[element]) {
        // Create songPlanet object using song data directly
        const songPlanet = {
          id: song.id,
          title: song.title,
          element: element,
          color: song.planet?.color || "#FC54AF",
          surface: "Procedurally generated surface",
          atmosphere: "Atmospheric effects",
          shape: "Spherical", 
          surfaceElements: "Various terrain features",
          isReleased: true
        };
        distribution[element].push(songPlanet);
      }
    });

    return distribution;
  }, [songs]);

  // Convert 3D positions to 2D minimap coordinates (top-down view)
  const convertTo2D = (position: [number, number, number]): { x: number; y: number } => {
    const [x, y, z] = position;
    // Scale down and center in minimap (240px minimap size) 
    // For top-down view: X maps to X, Z maps to Y (Y is height, ignored in top view)
    const scale = 2.0;  // Further reduced scale for better orbital view
    return {
      x: 120 + (x * scale),  // X axis (left-right)
      y: 120 + (z * scale)   // Z axis becomes Y axis (forward-back becomes up-down)
    };
  };

  // Calculate true geometric center of the 4 elemental planets
  const centerPosition = React.useMemo(() => {
    const center2D = convertTo2D([0, 0, 0]); // Should be the true center
    return center2D;
  }, []);

  const minimapContent = (
    <div 
      className={`absolute bg-black/80 backdrop-blur-sm border-4 border-cyan-400 rounded-lg transition-all duration-300 ${
        isCollapsed ? 'w-12 h-12' : 'w-60 h-60'
      }`} 
      style={{ 
        top: '1rem',
        right: '1rem',
        zIndex: 999999, 
        boxShadow: '0 0 20px rgba(56, 182, 255, 0.8)',
        pointerEvents: 'auto',
        position: 'absolute'
      }}
    >
      {/* Toggle Collapse Button */}
      <button
        onClick={handleToggleCollapse}
        className="absolute top-1 right-1 w-6 h-6 bg-cyan-400/20 hover:bg-cyan-400/40 border border-cyan-400/50 rounded text-cyan-400 text-xs font-bold transition-colors duration-200 flex items-center justify-center"
        style={{ 
          zIndex: 999999, 
          pointerEvents: 'auto'
        }}
        title={isCollapsed ? "Expand minimap" : "Collapse minimap"}
      >
        {isCollapsed ? "+" : "−"}
      </button>
      
      {!isCollapsed && (
        <div className="relative w-full h-full p-2">
      {/* Minimap background */}
      <div className="relative w-full h-full bg-gradient-radial from-blue-900/20 to-transparent rounded">
        
        {/* Center heart planet - positioned at TRUE geometric center */}
        <div 
          className="absolute w-4 h-4 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2"
          style={{ 
            left: `${centerPosition.x}px`, 
            top: `${centerPosition.y}px`,
            backgroundColor: "#FC54AF60",
            borderColor: "#FC54AF",
            boxShadow: "0 0 12px #FC54AF"
          }}
        >
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-white" style={{textShadow: "0 0 4px black"}}>
            Heartverse
          </div>
        </div>

        {/* Elemental planets */}
        {ELEMENTS.map((element) => {
          const pos2D = convertTo2D(element.position);
          
          return (
            <div
              key={element.code}
              className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
              style={{
                left: `${pos2D.x}px`,
                top: `${pos2D.y}px`,
                backgroundColor: element.color + "80",
                border: `2px solid ${element.color}`,
                boxShadow: `0 0 10px ${element.glowColor}60`,
              }}
            >
              {/* Element full label */}
              <div 
                className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-[9px] font-bold text-white whitespace-nowrap"
                style={{ 
                  filter: "drop-shadow(0 0 3px black)",
                  color: element.color
                }}
              >
                {element.label}
              </div>
            </div>
          );
        })}

        {/* Orbiting song planets around each elemental planet */}
        {ELEMENTS.map((element) => {
          const orbitRadius = SONG_ORBIT_RADIUS; // Use config value for consistency
          const elementSongs = songsPerElement[element.code] || [];
          
          return elementSongs.map((songPlanet, i) => {
            const angle = (i / Math.max(elementSongs.length, 12)) * Math.PI * 2;
            // For top-down view, orbit in the X-Z plane (horizontal plane)
            const x = element.position[0] + Math.cos(angle) * orbitRadius;
            const y = element.position[1]; // Keep same height as elemental planet
            const z = element.position[2] + Math.sin(angle) * orbitRadius;
            
            const pos2D = convertTo2D([x, y, z]);
            
            // Determine shape-based styling (keeping shape variety but uniform size)
            const getShapeClass = (shape: string) => {
              if (shape.includes("cube") || shape.includes("blocky")) return "rounded-none";
              if (shape.includes("jagged") || shape.includes("angular")) return "rounded-sm";
              if (shape.includes("hex")) return "rounded-md";
              return "rounded-full";
            };
            
            // Determine colors based on release status
            const isReleased = songPlanet.isReleased !== false; // Default to released if not specified
            const planetColor = isReleased 
              ? (songPlanet.color === "#000000" ? "#6A4C93" : songPlanet.color)
              : "#666666"; // Grey for unreleased
            
            return (
              <div
                key={`${element.code}-song-${i}`}
                className={`absolute w-1.5 h-1.5 ${getShapeClass(songPlanet.shape)} transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-150 transition-all duration-200 group`}
                style={{
                  left: `${pos2D.x}px`,
                  top: `${pos2D.y}px`,
                  backgroundColor: planetColor + "80",
                  border: `1px solid ${planetColor}`,
                  boxShadow: `0 0 4px ${planetColor}40`,
                }}
                title={songPlanet.title + (isReleased ? "" : " (Unreleased)")}
                onClick={() => {
                  console.log('🎯 Planet clicked:', songPlanet.id, songPlanet.title);
                  sfx.play('close', 0.5);
                  setSelectedPlanet(songPlanet.title + (isReleased ? "" : " (Unreleased)"));
                  // Auto-hide the selected planet name after 3 seconds
                  setTimeout(() => setSelectedPlanet(null), 3000);
                  // Call the callback to highlight planet in 3D view
                  if (onPlanetClick) {
                    console.log('🚀 Calling onPlanetClick with:', songPlanet.id);
                    onPlanetClick(songPlanet.id);
                  } else {
                    console.log('❌ No onPlanetClick callback provided');
                  }
                }}
              >
                {/* Enhanced tooltip with planet details */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-[7px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-48">
                  <div className="font-bold text-[8px] mb-1" style={{ color: songPlanet.color === "#000000" ? "#6A4C93" : songPlanet.color }}>
                    {songPlanet.title}
                  </div>
                  <div className="text-gray-300 mb-0.5">
                    Element: {songPlanet.element.toUpperCase()}
                  </div>
                  <div className="text-gray-400 text-[6px] leading-tight">
                    {songPlanet.surface.slice(0, 80)}...
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/90"></div>
                </div>
              </div>
            );
          });
        })}

        {/* Orbit paths for each elemental planet */}
        {ELEMENTS.map((element) => {
          const elementPos2D = convertTo2D(element.position);
          const orbitRadiusScaled = SONG_ORBIT_RADIUS * 2.0; // Use config value scaled for minimap
          
          return (
            <div
              key={`${element.code}-orbit`}
              className="absolute rounded-full border border-opacity-20 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${elementPos2D.x}px`,
                top: `${elementPos2D.y}px`,
                width: `${orbitRadiusScaled * 2}px`,
                height: `${orbitRadiusScaled * 2}px`,
                borderColor: element.color + "30",
              }}
            />
          );
        })}

        {/* Grid lines for reference */}
        <div className="absolute inset-0 opacity-20">
          {/* Horizontal center line */}
          <div 
            className="absolute w-full h-px bg-cyan-400/40"
            style={{ top: "50%" }}
          />
          {/* Vertical center line */}
          <div 
            className="absolute h-full w-px bg-cyan-400/40"
            style={{ left: "50%" }}
          />
        </div>

        {/* Minimap label */}
        <div className="absolute -bottom-2 left-0 text-[10px] text-cyan-400/90 font-mono font-bold">
          PLANET MAP
        </div>

        {/* Status indicator */}
        <div className="absolute bottom-0 right-0 text-[8px] text-green-400/70 font-mono">
          ● ACTIVE
        </div>
      </div>
        </div>
      )}
      
      {/* Selected planet name display - Enhanced */}
      {selectedPlanet && (
        <div className="absolute bottom-4 left-4 right-4 bg-black/95 border-2 border-cyan-400 rounded-lg px-3 py-2 text-center z-20 shadow-lg">
          <div className="text-cyan-400 text-sm font-bold drop-shadow-lg">
            🎵 {selectedPlanet}
          </div>
          <div className="text-cyan-300 text-xs mt-1">
            Click to highlight in 3D view
          </div>
        </div>
      )}
      
      {/* Collapsed state indicator */}
      {isCollapsed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );

  // Render using portal to ensure it's above Three.js Canvas
  return portalContainer ? createPortal(minimapContent, portalContainer) : null;
}