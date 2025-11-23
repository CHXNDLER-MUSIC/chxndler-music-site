"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import SongPlanetGated from "@/components/holo/SongPlanetGated";
import { type HoloSong, type Element } from "@/lib/planets";
import { type ElementKey } from "@/utils/planetStyles";
import { getCardGateState, type CardGateState } from "@/types/card";
import { useProfile } from "@/contexts/ProfileContext";

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
  const { profile } = useProfile();
  
  // Filter songs that belong to this element
  const elementSongs = songs.filter(song => song.planet.element === element);
  
  // Helper function to get card gate state for a song
  const getSongGateState = (songId: string): CardGateState => {
    // Create a mock card object from the song data
    const mockCard = {
      id: songId,
      card_name: songId,
      element: element,
      is_released: true, // For now, assume all songs are released
      min_tier: "wanderer" as const, // Default to lowest tier for now
    };
    
    // Convert profile cards to the expected format
    const userCards = profile?.cards?.map(cardRow => ({
      user_id: profile.id,
      card_id: cardRow.card_id,
      card_name: cardRow.cards?.card_name || cardRow.card_id,
    })) || [];
    
    return getCardGateState(mockCard, profile, userCards);
  };
  
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
      
      // Smaller orbit radius around elemental planets (was 3-7, now 1.5-3)
      const baseRadius = songCount <= 4 ? 2.0 : songCount <= 10 ? 2.5 : 3.0;
      const radiusVariation = deterministicRandom() * 1 - 0.5; // -0.5 to 0.5
      const radius = Math.max(1.5, Math.min(3.0, baseRadius + radiusVariation));
      
      // Y offset variation to prevent overlap (reduced for tighter clustering)
      const yOffset = (deterministicRandom() - 0.5) * 0.8; // -0.4 to 0.4
      
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
        
        const gateState = getSongGateState(orbitGroup.songId);
        const elementKey = element as ElementKey;
        
        return (
          <group 
            key={orbitGroup.songId}
            ref={(el) => orbitGroupRefs.current[index] = el}
          >
            {/* Position the song planet at its orbit radius */}
            <group position={[orbitGroup.radius, orbitGroup.yOffset, 0]}>
              <SongPlanetGated
                songId={orbitGroup.songId}
                elementKey={elementKey}
                gateState={gateState}
                position={[0, 0, 0]}
                radius={0.3}
                isMain={mainId === orbitGroup.songId}
                isHover={hoverId === orbitGroup.songId}
                onClick={() => {
                  // Handle song selection if needed
                  console.log(`Clicked song: ${orbitGroup.songId}, state: ${gateState}`);
                }}
              />
            </group>
          </group>
        );
      })}
    </group>
  );
}