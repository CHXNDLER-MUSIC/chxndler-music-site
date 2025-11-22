"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3, Object3D } from "three";
import HeartPlanet from "./HeartPlanet";
import ElementalPlanet from "./ElementalPlanet";
import SongPlanet from "./SongPlanet";
import Starfield from "./Starfield";
import { buildPlanetSongs, type Element, ELEMENT_COLORS } from "@/lib/planets";

// Element planet data structure
type ElementId = "heart" | "water" | "lightning" | "darkness";

type ElementPlanet = {
  id: ElementId;
  label: string;
  color: string;
  orbitRadius: number;
  initialAngle: number;
};

// Using your brand colors
const ELEMENT_PLANETS: ElementPlanet[] = [
  { id: "heart", label: "Heart", color: "#FC54AF", orbitRadius: 6, initialAngle: 0 },
  { id: "water", label: "Water", color: "#19E3FF", orbitRadius: 6, initialAngle: Math.PI / 2 },
  { id: "lightning", label: "Lightning", color: "#F2EF1D", orbitRadius: 6, initialAngle: Math.PI },
  { id: "darkness", label: "Darkness", color: "#E8E8E8", orbitRadius: 6, initialAngle: (3 * Math.PI) / 2 },
];

interface HeartverseSolarSystemProps {
  songs?: Array<{ id: string; title: string; element?: Element }>;
  onSongClick?: (songId: string) => void;
}

export default function HeartverseSolarSystem({ 
  songs: propSongs, 
  onSongClick = () => {} 
}: HeartverseSolarSystemProps) {
  const systemRef = useRef<Group>(null);
  const orbitRefs = useRef<{ [key: string]: Group }>({});
  
  // Define song mapping with explicit element assignments
  const songMapping = useMemo(() => {
    return {
      heart: [
        "I MIGHT FALL IN LOVE WITH YOU",
        "HOME", 
        "BE MY BEE",
        "SOMEBODY TO LOVE",
        "WE'RE JUST FRIENDS"
      ],
      water: [
        "OCEAN GIRL",
        "LETTING GO", 
        "KID FOREVER"
      ],
      lightning: [
        "ALIEN (HOUSE PARTY)",
        "LITTLE BLACK HEART"
      ],
      darkness: [
        "TIENES UN AMIGO"
      ]
    };
  }, []);

  // Create songs array from mapping
  const songs = useMemo(() => {
    if (propSongs) return propSongs;
    
    const allSongs: Array<{ id: string; title: string; element: Element }> = [];
    Object.entries(songMapping).forEach(([element, titles]) => {
      titles.forEach((title, index) => {
        allSongs.push({
          id: `${element}-${index}`,
          title,
          element: element as Element
        });
      });
    });
    
    return allSongs;
  }, [propSongs, songMapping]);

  // Group songs by element type
  const songsByElement = useMemo(() => {
    const groups: Record<Element, typeof songs> = {
      heart: [],
      water: [],
      lightning: [],
      darkness: [],
      fire: [],
      earth: [],
      air: []
    };
    
    songs.forEach(song => {
      const element = song.element || 'heart';
      groups[element].push(song);
    });
    
    return groups;
  }, [songs]);

  // Define elemental planet positions (circle around center)
  const elementalPlanetPositions = useMemo(() => {
    const positions: { [key in ElementId]: Vector3 } = {} as any;
    
    ELEMENT_PLANETS.forEach((planet) => {
      const x = Math.cos(planet.initialAngle) * planet.orbitRadius;
      const z = Math.sin(planet.initialAngle) * planet.orbitRadius;
      positions[planet.id] = new Vector3(x, 0, z);
    });
    
    return positions;
  }, []);

  // Only show elemental planets that have songs
  const activeElements = useMemo(() => {
    return Object.keys(elementalPlanetPositions).filter(element => 
      songsByElement[element as Element]?.length > 0
    );
  }, [songsByElement, elementalPlanetPositions]);

  // Generate randomized orbit parameters for each song
  const orbitParameters = useMemo(() => {
    const params: { [songId: string]: { radius: number; speed: number; yOffset: number; initialRotation: number } } = {};
    
    Object.entries(songsByElement).forEach(([element, elementSongs]) => {
      const songCount = elementSongs.length;
      const baseRadius = songCount > 3 ? 5 : 4; // Adjust base radius based on song count
      
      elementSongs.forEach((song, index) => {
        // Create deterministic "random" values using song id as seed
        const seed = song.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const random1 = (Math.sin(seed * 0.1) + 1) / 2;
        const random2 = (Math.sin(seed * 0.2) + 1) / 2;
        const random3 = (Math.sin(seed * 0.3) + 1) / 2;
        const random4 = (Math.sin(seed * 0.4) + 1) / 2;
        
        params[song.id] = {
          radius: baseRadius + (random1 * 3), // 3-7 units radius variation
          speed: 0.2 + (random2 * 0.8), // 0.2-1.0 rotation speed
          yOffset: (random3 - 0.5) * 4, // -2 to +2 vertical offset
          initialRotation: random4 * Math.PI * 2 // Random starting angle
        };
      });
    });
    
    return params;
  }, [songsByElement]);

  // System rotation animation and orbit animations
  useFrame((_, delta) => {
    if (systemRef.current) {
      systemRef.current.rotation.y += delta * 0.05; // Slow system rotation
    }

    // Animate each orbit group
    Object.entries(orbitRefs.current).forEach(([songId, orbitGroup]) => {
      if (orbitGroup && orbitParameters[songId]) {
        orbitGroup.rotation.y += delta * orbitParameters[songId].speed;
      }
    });
  });

  return (
    <group ref={systemRef}>
      {/* Subtle starfield background */}
      <Starfield />
      
      {/* Core Heart Planet at center (0,0,0) - keep existing idle rotation */}
      <HeartPlanet />
      
      {/* Four Elemental Planets in orbit around heart */}
      {ELEMENT_PLANETS.map((elementPlanet) => {
        const position = elementalPlanetPositions[elementPlanet.id];
        return (
          <group key={elementPlanet.id} position={[position.x, position.y, position.z]}>
            <mesh>
              <sphereGeometry args={[0.6, 32, 32]} />
              <meshStandardMaterial 
                color={elementPlanet.color} 
                emissive={elementPlanet.color} 
                emissiveIntensity={0.5} 
              />
            </mesh>
            {/* Optional floating label */}
            <mesh position={[0, 1.2, 0]}>
              <planeGeometry args={[2, 0.5]} />
              <meshBasicMaterial 
                color={elementPlanet.color}
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>
        );
      })}
      
      {/* Song planet rendering temporarily commented out */}
      {/* TODO: Will implement song planets orbiting elemental planets in next phase */}
      {false && Object.entries(songsByElement).map(([element, elementSongs]) => {
        if (elementSongs.length === 0) return null;
        
        const elementalPosition = elementalPlanetPositions[element as keyof typeof elementalPlanetPositions];
        if (!elementalPosition) return null;
        
        return elementSongs.map((song) => {
          const params = orbitParameters[song.id];
          if (!params) return null;
          
          return (
            <group 
              key={`${song.id}-orbit`}
              position={[elementalPosition.x, elementalPosition.y + params.yOffset, elementalPosition.z]}
              rotation={[0, params.initialRotation, 0]}
              ref={(ref) => {
                if (ref) orbitRefs.current[song.id] = ref;
              }}
            >
              <group position={[params.radius, 0, 0]}>
                <SongPlanet
                  songId={song.id}
                  title={song.title}
                  element={song.element || 'heart'}
                  position={new Vector3(0, 0, 0)}
                  size={1.5} // Small planets
                  onClick={() => onSongClick(song.id)}
                />
              </group>
            </group>
          );
        });
      })}
    </group>
  );
}