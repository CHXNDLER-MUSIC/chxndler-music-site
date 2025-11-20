"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3, Object3D } from "three";
import HeartPlanet from "./HeartPlanet";
import ElementalPlanet from "./ElementalPlanet";
import SongPlanet from "./SongPlanet";
import Starfield from "./Starfield";
import { buildPlanetSongs, type Element, ELEMENT_COLORS } from "@/lib/planets";

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

  // Define elemental planet positions (four corners around center)
  const elementalPlanetPositions = useMemo(() => {
    return {
      heart: new Vector3(-15, 10, 0),      // Top left
      water: new Vector3(15, 10, 0),       // Top right  
      lightning: new Vector3(15, -10, 0),  // Bottom right
      darkness: new Vector3(-15, -10, 0),  // Bottom left
    };
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
      
      {/* Core Heart Planet at center (0,0,0) */}
      <HeartPlanet />
      
      {/* Four Large Elemental Planets - only render if they have songs */}
      {activeElements.map((element) => (
        <ElementalPlanet
          key={element}
          element={element as Element}
          position={elementalPlanetPositions[element as keyof typeof elementalPlanetPositions]}
          size={8} // Significantly larger than song planets
          glowIntensity={1.5}
        />
      ))}
      
      {/* Song Planets orbiting their respective elemental planets */}
      {Object.entries(songsByElement).map(([element, elementSongs]) => {
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