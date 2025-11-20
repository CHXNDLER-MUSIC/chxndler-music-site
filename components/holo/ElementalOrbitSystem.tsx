"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import SongPlanetSphere from "@/components/holo/SongPlanetSphere";
import { type HoloSong, type Element } from "@/lib/planets";

interface ElementalOrbitSystemProps {
  elementalPosition: [number, number, number];
  element: Element;
  songs: HoloSong[];
  mainId: string | null;
  hoverId: string | null;
}

interface OrbitGroup {
  songId: string;
  radius: number;
  angle: number;
  yOffset: number;
  rotationSpeed: number;
}

export default function ElementalOrbitSystem({ 
  elementalPosition, 
  element, 
  songs, 
  mainId, 
  hoverId 
}: ElementalOrbitSystemProps) {
  // Filter songs that belong to this element
  const elementSongs = songs.filter(song => song.planet.element === element);
  
  // Create deterministic orbit configuration based on song count and element
  const orbitGroups = useMemo<OrbitGroup[]>(() => {
    const songCount = elementSongs.length;
    if (songCount === 0) return [];
    
    // Create deterministic random generator based on element name for consistency
    let seed = element.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const deterministicRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    return elementSongs.map((song, index) => {
      // Distribute songs evenly around the circle
      const angle = (index / songCount) * Math.PI * 2;
      
      // Randomize radius between 3-7 units based on song count
      const baseRadius = songCount <= 4 ? 4 : songCount <= 10 ? 5 : 6;
      const radiusVariation = deterministicRandom() * 2 - 1; // -1 to 1
      const radius = Math.max(3, Math.min(7, baseRadius + radiusVariation));
      
      // Y offset variation to prevent overlap
      const yOffset = (deterministicRandom() - 0.5) * 2; // -1 to 1
      
      // Slightly randomized rotation speed
      const baseSpeed = 0.3;
      const speedVariation = deterministicRandom() * 0.2 - 0.1; // -0.1 to 0.1
      const rotationSpeed = baseSpeed + speedVariation;
      
      return {
        songId: song.id,
        radius,
        angle,
        yOffset,
        rotationSpeed
      };
    });
  }, [elementSongs, element]);
  
  // Individual orbit group refs for rotation
  const orbitGroupRefs = useRef<(THREE.Group | null)[]>([]);
  
  // Animate each orbit group independently
  useFrame((_, dt) => {
    orbitGroups.forEach((orbitGroup, index) => {
      const ref = orbitGroupRefs.current[index];
      if (ref) {
        ref.rotation.y += orbitGroup.rotationSpeed * dt;
      }
    });
  });
  
  return (
    <group position={elementalPosition}>
      {orbitGroups.map((orbitGroup, index) => {
        const song = elementSongs.find(s => s.id === orbitGroup.songId);
        if (!song) return null;
        
        return (
          <group 
            key={orbitGroup.songId}
            ref={(el) => orbitGroupRefs.current[index] = el}
          >
            {/* Position the song planet at its orbit radius */}
            <group position={[orbitGroup.radius, orbitGroup.yOffset, 0]}>
              <SongPlanetSphere
                element={element}
                songId={orbitGroup.songId}
                isMain={mainId === orbitGroup.songId}
                isHover={hoverId === orbitGroup.songId}
              />
            </group>
          </group>
        );
      })}
    </group>
  );
}