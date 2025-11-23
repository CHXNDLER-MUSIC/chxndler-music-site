// components/PlanetSystem.tsx
import React, { useMemo, useRef } from "react";
import { Group, Mesh, AdditiveBlending, DoubleSide, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import HeartStarPlanet from "./HeartStarPlanet";

type ElementKey = "water" | "heart" | "lightning" | "darkness";

// Debug flags
const SHOW_ONLY_ELEMENTS = false;   // when true, hide all songs
const SHOW_ORBIT_GIZMOS = false;    // when true, draw orbit rings for elements and songs

export type SongPlanet = {
  id: string;
  title?: string;
  element_primary?: ElementKey; // Updated to match Supabase field
  elementKey?: ElementKey; // Keep for backward compatibility
  released?: boolean;
  size?: number;
  color?: string;
  orbitRadius?: number;
  orbitSpeed?: number;
};

type PlanetSystemProps = {
  songs: SongPlanet[];
  showDebug?: boolean;
};

// Elemental planets configuration as per requirements
const ELEMENTAL_PLANETS = [
  { type: "water" as ElementKey, color: "#38B6FF", radius: 2.0, position: [6, 0, 0] as [number, number, number] },
  { type: "heart" as ElementKey, color: "#FC54AF", radius: 2.0, position: [-6, 0, 0] as [number, number, number] },
  { type: "lightning" as ElementKey, color: "#F2EF1D", radius: 2.0, position: [0, 6, 0] as [number, number, number] },
  { type: "darkness" as ElementKey, color: "#000000", radius: 2.0, position: [0, -6, 0] as [number, number, number] }
];

// Orbit helper function as requested
function orbitAround(parentPosition: [number, number, number], time: number, distance: number): [number, number, number] {
  return [
    parentPosition[0] + Math.cos(time) * distance,
    parentPosition[1],
    parentPosition[2] + Math.sin(time) * distance
  ];
}

// ElementPlanet component with proper glow effects
const ElementPlanet: React.FC<{
  type: ElementKey;
  color: string;
  position: [number, number, number];
  radius: number;
}> = ({ type, color, position, radius }) => {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          metalness={0.1}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
};

// SongPlanet component that orbits around elemental planets
const SongPlanet: React.FC<{
  song: SongPlanet;
  elapsedTime: number;
  songIndex: number;
}> = ({ song, elapsedTime, songIndex }) => {
  // Get element from song data (prioritize element_primary from Supabase)
  const element = song.element_primary || song.elementKey || "heart";
  
  // Find the matching elemental planet position
  const parent = ELEMENTAL_PLANETS.find(p => p.type === element);
  const basePos = parent?.position || [0, 0, 0];
  
  // Calculate orbit parameters
  const speed = 0.5 + (songIndex * 0.1); // Vary speed slightly per song
  const distance = 3.5;
  
  // Get orbiting position
  const pos = orbitAround(basePos, elapsedTime * speed, distance);
  
  const size = song.size ?? 0.4;
  const color = song.color ?? parent?.color ?? "#FC54AF";
  const released = song.released ?? true;

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={released ? 0.4 : 0.1}
          metalness={0.1}
          roughness={0.3}
          transparent={!released}
          opacity={released ? 1.0 : 0.5}
        />
      </mesh>
    </group>
  );
};

export const PlanetSystem: React.FC<PlanetSystemProps> = ({
  songs,
  showDebug = false,
}) => {
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    timeRef.current += delta;
  });

  const elapsedTime = timeRef.current;

  return (
    <group>
      {/* Central heart planet as the sun at [0,0,0] */}
      <group position={[0, 0, 0]}>
        <HeartStarPlanet size={180} />
      </group>

      {/* Render elemental planets BEFORE song planets */}
      {ELEMENTAL_PLANETS.map((p) => (
        <ElementPlanet
          key={p.type}
          type={p.type}
          color={p.color}
          position={p.position}
          radius={p.radius}
        />
      ))}

      {/* Render song planets orbiting around their elemental planets */}
      {!SHOW_ONLY_ELEMENTS &&
        songs.map((song, songIndex) => (
          <SongPlanet
            key={song.id}
            song={song}
            elapsedTime={elapsedTime}
            songIndex={songIndex}
          />
        ))
      }
    </group>
  );
};