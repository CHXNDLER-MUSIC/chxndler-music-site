"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import Starfield from "./Starfield";
import PlanetSystem from "./PlanetSystem";
import { transformTracksToSongs } from "@/lib/transformTracksToSongs";
import { type Element } from "@/lib/planets";

interface HeartverseSolarSystemProps {
  songs?: Array<{ id: string; title: string; element?: Element }>;
  onSongClick?: (songId: string) => void;
}

export default function HeartverseSolarSystem({ 
  songs: propSongs, 
  onSongClick = () => {} 
}: HeartverseSolarSystemProps) {
  const systemRef = useRef<Group>(null);
  
  try {
    // System rotation animation
    useFrame((_, delta) => {
      if (systemRef.current) {
        systemRef.current.rotation.y += delta * 0.05; // Slow system rotation
      }
    });

    return (
      <group ref={systemRef}>
        {/* Temporarily comment out Starfield to isolate the error */}
        {/* <Starfield /> */}
        
        {/* Temporarily comment out PlanetSystem to isolate the error */}
        {/* <PlanetSystem showAll={true} hideUntilPlaying={false} /> */}
        
        {/* Simple test mesh to verify 3D rendering works */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="red" />
        </mesh>
      </group>
    );
  } catch (error) {
    console.error('HeartverseSolarSystem error:', error);
    return <group ref={systemRef}><Starfield /></group>;
  }
}