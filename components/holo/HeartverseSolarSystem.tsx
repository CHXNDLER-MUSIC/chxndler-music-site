"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
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
  
  // Use provided songs or generate from buildPlanetSongs
  const songs = useMemo(() => {
    if (propSongs) return propSongs;
    const { holoSongs } = buildPlanetSongs();
    return holoSongs.map(song => ({
      id: song.id,
      title: song.title,
      element: song.planet.element || 'heart' as Element
    }));
  }, [propSongs]);

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

  // Define elemental planet positions (four corners around center) - responsive
  const elementalPlanetPositions = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const distance = isMobile ? 45 : 60; // Closer on mobile for better visibility
    return {
      heart: new Vector3(-distance * 0.7, 0, -distance * 0.7),     // Top left
      water: new Vector3(distance * 0.7, 0, -distance * 0.7),      // Top right  
      lightning: new Vector3(distance * 0.7, 0, distance * 0.7),   // Bottom right
      darkness: new Vector3(-distance * 0.7, 0, distance * 0.7),   // Bottom left
    };
  }, []);

  // Only show elemental planets that have songs
  const activeElements = useMemo(() => {
    return Object.keys(elementalPlanetPositions).filter(element => 
      songsByElement[element as Element]?.length > 0
    );
  }, [songsByElement, elementalPlanetPositions]);

  // System rotation animation
  useFrame((_, delta) => {
    if (systemRef.current) {
      systemRef.current.rotation.y += delta * 0.05; // Slow system rotation
    }
  });

  // Calculate orbit positions for song planets around their elemental planet
  const getSongOrbitPositions = (element: Element, songs: typeof songsByElement[Element]) => {
    const positions: Vector3[] = [];
    const basePosition = elementalPlanetPositions[element as keyof typeof elementalPlanetPositions];
    if (!basePosition) return positions;

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const orbitRadius = isMobile ? 12 : 15; // Closer orbits on mobile
    const verticalSpread = isMobile ? 6 : 8; // Less vertical variation on mobile
    
    songs.forEach((_, index) => {
      const angle = (index / songs.length) * Math.PI * 2;
      // Add some orbital variation for more natural look
      const radiusVariation = orbitRadius + (Math.sin(index * 2.3) * 3);
      const x = basePosition.x + Math.cos(angle) * radiusVariation;
      const z = basePosition.z + Math.sin(angle) * radiusVariation;
      const y = basePosition.y + (Math.sin(index * 1.7) * verticalSpread * 0.5);
      positions.push(new Vector3(x, y, z));
    });

    return positions;
  };

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
        
        const orbitPositions = getSongOrbitPositions(element as Element, elementSongs);
        
        return elementSongs.map((song, index) => {
          const position = orbitPositions[index];
          if (!position) return null;
          
          return (
            <SongPlanet
              key={song.id}
              songId={song.id}
              title={song.title}
              element={song.element || 'heart'}
              position={position}
              size={2} // Much smaller than elemental planets
              onClick={() => onSongClick(song.id)}
            />
          );
        });
      })}
    </group>
  );
}