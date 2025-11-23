import { tracks } from "@/lib/songs-consolidated";
import type { SongPlanet } from "@/components/PlanetSystem";

// Map your existing ElementKind to the PlanetSystem's ElementKey
const ELEMENT_MAP: Record<string, "heart" | "water" | "lightning" | "darkness"> = {
  "HEART": "heart",
  "WATER": "water", 
  "LIGHTNING": "lightning",
  "DARKNESS": "darkness",
  // Default fallbacks for unmapped elements
  "FIRE": "heart",
  "EARTH": "heart", 
  "AIR": "lightning"
};

export function transformTracksToSongs(): SongPlanet[] {
  return tracks.map((track, index) => {
    // Map element from your existing system to PlanetSystem format
    const element = ELEMENT_MAP[track.element] || "heart";
    
    // Use primary color from your track theme, or default based on element
    const elementColors = {
      heart: "#FC54AF",
      water: "#38B6FF", 
      lightning: "#F2EF1D",
      darkness: "#222033"
    };
    const color = track.theme?.['--color-primary'] || elementColors[element];
    
    // Generate some variety in planet sizing and positioning
    const size = 0.25 + (index % 5) * 0.05; // 0.25 to 0.45
    const orbitRadius = 2.2 + (index % 4) * 0.3; // 2.2 to 3.1
    const orbitSpeed = 0.5 + (index % 7) * 0.1; // Some variety in speeds
    
    return {
      id: track.slug,
      title: track.title,
      elementKey: element, // Changed from 'element' to 'elementKey'
      released: true, // Assume all tracks are released
      size,
      color,
      orbitRadius,
      orbitSpeed
    };
  });
}