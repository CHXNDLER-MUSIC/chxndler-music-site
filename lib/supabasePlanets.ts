import { fetchReleasedSongs } from "./songs";
import { AUDIO_ASSETS_BY_SLUG } from "@/data/audioAssets";
import { SONG_ELEMENT_MAPPING } from "@/data/songElements";
import type { SongRow, ElementType } from "@/types/song";

export interface SupabaseSongPlanet {
  id: string;
  title: string;
  slug: string;
  element: ElementType;
  isReleased: boolean;
  audioSrc?: string;
  coverSrc?: string;
  planet: {
    orbitRadius: number;
    orbitSpeed: number;
    size: number;
    color: string;
  };
}

// Planet configuration based on element type
const ELEMENT_PLANET_CONFIG = {
  heart: {
    orbitRadius: 5.5,
    baseSpeed: 0.11,
    color: "#FC54AF",
    size: 0.7
  },
  water: {
    orbitRadius: 6.5,
    baseSpeed: 0.25,
    color: "#38B6FF",
    size: 0.8
  },
  lightning: {
    orbitRadius: 7.0,
    baseSpeed: 0.20,
    color: "#F2EF1D",
    size: 0.75
  },
  darkness: {
    orbitRadius: 6.0,
    baseSpeed: 0.15,
    color: "#6A4C93",
    size: 0.7
  }
};

export async function buildSupabaseSongPlanets(): Promise<SupabaseSongPlanet[]> {
  try {
    const songs = await fetchReleasedSongs();
    
    return songs.map((song, index) => {
      const element = SONG_ELEMENT_MAPPING[song.slug] || 'heart';
      const elementConfig = ELEMENT_PLANET_CONFIG[element];
      const asset = AUDIO_ASSETS_BY_SLUG[song.slug];
      
      // Vary orbit parameters slightly for visual variety
      const speedVariation = (index * 0.02) % 0.1 - 0.05; // ±0.05 variation
      const radiusVariation = (index * 0.3) % 1.0 - 0.5; // ±0.5 variation
      
      return {
        id: song.id,
        title: song.title,
        slug: song.slug,
        element,
        isReleased: song.is_released,
        audioSrc: asset?.src,
        coverSrc: asset?.cover,
        planet: {
          orbitRadius: elementConfig.orbitRadius + radiusVariation,
          orbitSpeed: elementConfig.baseSpeed + speedVariation,
          size: elementConfig.size,
          color: elementConfig.color
        }
      };
    });
  } catch (error) {
    console.error("Error building Supabase song planets:", error);
    return [];
  }
}

// Get song planets grouped by element
export async function getSongPlanetsByElement(): Promise<Record<ElementType, SupabaseSongPlanet[]>> {
  const planets = await buildSupabaseSongPlanets();
  
  const grouped: Record<ElementType, SupabaseSongPlanet[]> = {
    heart: [],
    water: [],
    lightning: [],
    darkness: []
  };
  
  planets.forEach(planet => {
    grouped[planet.element].push(planet);
  });
  
  return grouped;
}

// Get only released song planets
export async function getReleasedSongPlanets(): Promise<SupabaseSongPlanet[]> {
  const planets = await buildSupabaseSongPlanets();
  return planets.filter(planet => planet.isReleased);
}