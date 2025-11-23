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
  elementKey: ElementKey; // Changed from 'element' to 'elementKey'
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

// Define the 4 elemental planets that orbit the heart
const ELEMENTS: ElementKey[] = ["water", "heart", "lightning", "darkness"];

// Constants for orbital mechanics
const HEART_POSITION = new THREE.Vector3(0, 0, 0);
const ELEMENT_ORBIT_RADIUS = 6;
const SONG_ORBIT_RADIUS = 2.5;

// Element configuration with base angles
const ELEMENT_STYLES: Record<
  ElementKey,
  {
    label: string;
    color: string;
    glowColor: string;
    baseAngle: number; // degrees
  }
> = {
  water: {
    label: "Water",
    color: "#38B6FF",
    glowColor: "#7FD0FF",
    baseAngle: 0,
  },
  heart: {
    label: "Heart",
    color: "#FC54AF",
    glowColor: "#FF8AD1",
    baseAngle: 90,
  },
  lightning: {
    label: "Lightning",
    color: "#F2EF1D",
    glowColor: "#FFF873",
    baseAngle: 180,
  },
  darkness: {
    label: "Darkness",
    color: "#222033",
    glowColor: "#7C4DFF",
    baseAngle: 270,
  },
};

// Helper function to get element position at time t
function getElementPosition(elementKey: ElementKey, t: number): THREE.Vector3 {
  const config = ELEMENT_STYLES[elementKey];
  const baseAngleRad = (config.baseAngle * Math.PI) / 180;
  const rotationSpeed = 0.1; // slow rotation over time
  
  const angle = baseAngleRad + t * rotationSpeed;
  
  const x = HEART_POSITION.x + Math.cos(angle) * ELEMENT_ORBIT_RADIUS;
  const z = HEART_POSITION.z + Math.sin(angle) * ELEMENT_ORBIT_RADIUS;
  const y = HEART_POSITION.y;
  
  return new THREE.Vector3(x, y, z);
}

const SHOW_ORBITS_DEFAULT = false;

// Simple neon glow plane used behind planets
const GlowPlane: React.FC<{
  color: string;
  scale?: number;
  renderOrder?: number;
}> = ({ color, scale = 3, renderOrder = 2 }) => {
  const meshRef = useRef<Mesh>(null);

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={renderOrder}
    >
      <circleGeometry args={[scale, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.7}
        depthWrite={false}
        depthTest
        blending={AdditiveBlending}
        side={DoubleSide}
      />
    </mesh>
  );
};

// Debug ring to show orbits
const OrbitRing: React.FC<{ radius: number; color?: string }> = ({
  radius,
  color = "#7fffd4",
}) => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
      <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} />
      <meshBasicMaterial
        color={color}
        opacity={0.35}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
};

// Component for rendering individual element planets
const ElementPlanet: React.FC<{
  elementKey: ElementKey;
  position: THREE.Vector3;
}> = ({ elementKey, position }) => {
  const config = ELEMENT_STYLES[elementKey];

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh renderOrder={1}>
        <sphereGeometry args={[0.9, 48, 48]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={0.8}
          metalness={0.25}
          roughness={0.3}
          transparent={false}
          depthWrite
          depthTest
        />
      </mesh>

      <GlowPlane color={config.glowColor} scale={2.5} renderOrder={2} />

      {SHOW_ORBIT_GIZMOS && (
        <OrbitRing radius={SONG_ORBIT_RADIUS} color={config.glowColor} />
      )}
    </group>
  );
};

// Component for rendering individual song planets
const SongPlanet: React.FC<{
  song: SongPlanet;
  elementPosition: THREE.Vector3;
  songIndex: number;
  totalSongsForElement: number;
  time: number;
}> = ({ song, elementPosition, songIndex, totalSongsForElement, time }) => {
  const elementConfig = ELEMENT_STYLES[song.elementKey];
  const released = song.released ?? true;
  
  // Calculate song position as orbit around element
  const baseSongAngle = (songIndex / Math.max(totalSongsForElement, 1)) * Math.PI * 2;
  const songOrbitSpeed = 0.3; // songs orbit faster than elements
  const angle = baseSongAngle + time * songOrbitSpeed;
  
  const x = elementPosition.x + Math.cos(angle) * SONG_ORBIT_RADIUS;
  const z = elementPosition.z + Math.sin(angle) * SONG_ORBIT_RADIUS;
  const y = elementPosition.y + (songIndex % 3) * 0.25 - 0.25; // slight vertical offset

  const size = song.size ?? 0.32;
  const color = song.color ?? elementConfig.color;

  return (
    <group position={[x, y, z]} renderOrder={3}>
      <mesh>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={released ? color : "#555777"}
          emissiveIntensity={released ? 0.85 : 0.2}
          metalness={0.2}
          roughness={0.4}
          transparent={true}
          opacity={released ? 1.0 : 0.4}
          depthWrite
          depthTest
        />
      </mesh>

      {/* Optional halo only if released */}
      {released && (
        <GlowPlane
          color={elementConfig.glowColor}
          scale={size * 3}
          renderOrder={4}
        />
      )}

      {/* Debug outline for unreleased songs */}
      {!released && SHOW_ORBIT_GIZMOS && (
        <OrbitRing radius={size * 1.5} color="#aaaaaa" />
      )}
    </group>
  );
};

export const PlanetSystem: React.FC<PlanetSystemProps> = ({
  songs,
  showDebug = SHOW_ORBITS_DEFAULT,
}) => {
  const timeRef = useRef(0);

  // Group songs by element
  const songsByElement = useMemo(() => {
    const grouped: Record<ElementKey, SongPlanet[]> = {
      heart: [],
      water: [],
      lightning: [],
      darkness: [],
    };
    for (const song of songs) {
      if (grouped[song.elementKey]) {
        grouped[song.elementKey].push(song);
      }
    }
    return grouped;
  }, [songs]);

  useFrame((state, delta) => {
    timeRef.current += delta;
  });

  const currentTime = timeRef.current;

  return (
    <group>
      {/* Central heart core */}
      <group>
        <HeartStarPlanet size={180} />

        {/* Debug: show element orbit ring around heart */}
        {SHOW_ORBIT_GIZMOS && (
          <OrbitRing radius={ELEMENT_ORBIT_RADIUS} color="#ffffff" />
        )}
      </group>

      {/* Element planets orbiting the heart */}
      {ELEMENTS.map((elementKey) => {
        const elementPosition = getElementPosition(elementKey, currentTime);
        
        return (
          <ElementPlanet
            key={elementKey}
            elementKey={elementKey}
            position={elementPosition}
          />
        );
      })}

      {/* Song planets orbiting their assigned elements (only if not in debug mode) */}
      {!SHOW_ONLY_ELEMENTS && 
        ELEMENTS.map((elementKey) => {
          const elementPosition = getElementPosition(elementKey, currentTime);
          const elementSongs = songsByElement[elementKey];
          
          return elementSongs.map((song, songIndex) => (
            <SongPlanet
              key={song.id}
              song={song}
              elementPosition={elementPosition}
              songIndex={songIndex}
              totalSongsForElement={elementSongs.length}
              time={currentTime}
            />
          ));
        })
      }
    </group>
  );
};