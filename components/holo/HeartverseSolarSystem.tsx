"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import Starfield from "./Starfield";
import { PlanetSystem } from "../../PlanetSystem";
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
  
  // Transform tracks data to PlanetSystem format
  const planetSongs = useMemo(() => {
    return transformTracksToSongs();
  }, []);

  // System rotation animation
  useFrame((_, delta) => {
    if (systemRef.current) {
      systemRef.current.rotation.y += delta * 0.05; // Slow system rotation
    }
  });

  return (
    <group ref={systemRef}>
      {/* Subtle starfield background */}
      <Starfield />
      
      {/* New PlanetSystem with your tracks */}
      <PlanetSystem songs={planetSongs} showDebug={false} />
    </group>
  );
}