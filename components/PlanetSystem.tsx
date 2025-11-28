// components/PlanetSystem.tsx
import React, { useMemo, useRef } from "react";
import { Group, Mesh, AdditiveBlending, DoubleSide, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import HeartStarPlanet from "./HeartStarPlanet";
import { getElementalPlanetTexture } from "@/lib/elementalPlanets";

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

// Elemental planets configuration as per requirements - ENHANCED VISIBILITY
const ELEMENTAL_PLANETS = [
  { type: "water" as ElementKey, color: "#38B6FF", radius: 3.0, position: [8, 0, 0] as [number, number, number] },
  { type: "heart" as ElementKey, color: "#FC54AF", radius: 3.0, position: [-8, 0, 0] as [number, number, number] },
  { type: "lightning" as ElementKey, color: "#F2EF1D", radius: 3.0, position: [0, 8, 0] as [number, number, number] },
  { type: "darkness" as ElementKey, color: "#6A4C93", radius: 3.0, position: [0, -8, 0] as [number, number, number] }
];

// Orbit helper function as requested
function orbitAround(parentPosition: [number, number, number], time: number, distance: number): [number, number, number] {
  return [
    parentPosition[0] + Math.cos(time) * distance,
    parentPosition[1],
    parentPosition[2] + Math.sin(time) * distance
  ];
}

// ElementPlanet component with texture mapping
const ElementPlanet: React.FC<{
  type: ElementKey;
  color: string;
  position: [number, number, number];
  radius: number;
}> = ({ type, color, position, radius }) => {
  const [texture, setTexture] = React.useState<THREE.Texture | null>(null);
  
  // Load the appropriate texture for each element
  React.useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    const texturePath = getElementalPlanetTexture(type);
    
    if (texturePath) {
      textureLoader.load(
        texturePath,
        (loadedTexture) => {
          loadedTexture.wrapS = loadedTexture.wrapT = THREE.RepeatWrapping;
          setTexture(loadedTexture);
        },
        undefined,
        (error) => {
          console.warn(`Failed to load texture for ${type}:`, error);
        }
      );
    }
  }, [type]);
  
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          map={texture}
          color={texture ? "#ffffff" : color}
          emissive={color}
          emissiveIntensity={1.5}
          metalness={0.1}
          roughness={0.2}
        />
      </mesh>
      {/* Add atmospheric glow - ENHANCED */}
      <mesh renderOrder={-1}>
        <sphereGeometry args={[radius * 1.3, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.8}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Add EXTRA outer glow */}
      <mesh renderOrder={-2}>
        <sphereGeometry args={[radius * 1.6, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          blending={AdditiveBlending}
          depthWrite={false}
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
  console.log("🚨🚨🚨 MAIN PLANETSYSTEM.TSX IS RENDERING!!! 🚨🚨🚨");
  console.log("Songs passed:", songs?.length || 0);
  console.log("ELEMENTAL_PLANETS:", ELEMENTAL_PLANETS);
  
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

      {/* Render elemental planets BEFORE song planets - ENHANCED VISIBILITY */}
      {ELEMENTAL_PLANETS.map((p) => (
        <group key={p.type}>
          <ElementPlanet
            type={p.type}
            color={p.color}
            position={p.position}
            radius={p.radius}
          />
          {/* Add text label above the planet */}
          <Html
            position={[p.position[0], p.position[1] + p.radius + 2, p.position[2]]}
            center
            distanceFactor={5}
          >
            <div style={{
              color: p.color,
              fontSize: '24px',
              fontWeight: 'bold',
              textAlign: 'center',
              textTransform: 'uppercase',
              textShadow: `0 0 12px ${p.color}`,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `2px solid ${p.color}`,
              backdropFilter: 'blur(8px)'
            }}>
              {p.type}
            </div>
          </Html>
          {/* DEBUG SPHERE - SHOULD BE CLEARLY VISIBLE */}
          <mesh position={[p.position[0], p.position[1] + 5, p.position[2]]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color="#FF0000" />
          </mesh>
        </group>
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