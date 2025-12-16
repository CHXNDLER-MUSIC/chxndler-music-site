'use client';

import React, { useRef, useMemo } from 'react';
import { usePlanetPositions } from '../planet-positions-context';
import { 
  centerPlanet, 
  elementPlanets, 
  songPlanets, 
  ElementPlanet as ElementPlanetData, 
  SongPlanet 
} from '../planet-data';
import { ElementPlanet } from '../ElementPlanet';
import { CAMERA_BASE_DISTANCE, CAMERA_ZOOM_LERP } from './assets';

// Import Three.js and R3F hooks dynamically to avoid SSR issues
let useFrame: any;
let useThree: any;
let useTexture: any;
let THREE: any;

if (typeof window !== 'undefined') {
  import('@react-three/fiber').then(module => {
    useFrame = module.useFrame;
    useThree = module.useThree;
  });
  import('@react-three/drei').then(module => {
    useTexture = module.useTexture;
  });
  import('three').then(module => {
    THREE = module;
  });
}

interface PlanetsProps {
  zoomLevel: number;
}

function CenterPlanet() {
  const meshRef = useRef<THREE.Mesh>(null);
  const centerTexture = useTexture('/textures/center-planet.webp');
  const { updatePosition, activePlanetId } = usePlanetPositions();

  useFrame(() => {
    if (meshRef.current) {
      updatePosition(centerPlanet.id, {
        x: 0,
        y: 0,
        z: 0,
        data: centerPlanet
      });
    }
  });

  const isActive = activePlanetId === centerPlanet.id;

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} scale={isActive ? 1.2 : 1}>
      <sphereGeometry args={[3.5, 32, 32]} />
      <meshStandardMaterial 
        map={centerTexture} 
        emissive={isActive ? new THREE.Color(0x444444) : new THREE.Color(0x000000)}
      />
      {isActive && (
        <mesh scale={1.1}>
          <sphereGeometry args={[3.5, 32, 32]} />
          <meshBasicMaterial 
            color={0x6366f1} 
            transparent 
            opacity={0.3} 
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </mesh>
  );
}

function ElementPlanetMesh({ planet }: { planet: ElementPlanetData }) {
  const groupRef = useRef<THREE.Group>(null);
  const { updatePosition, activePlanetId } = usePlanetPositions();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime();
      const angle = time * planet.orbitSpeed;
      const x = Math.cos(angle) * planet.orbitRadius;
      const z = Math.sin(angle) * planet.orbitRadius;
      
      groupRef.current.position.set(x, 0, z);
      
      updatePosition(planet.id, {
        x,
        y: 0,
        z,
        data: planet
      });
    }
  });

  const isActive = activePlanetId === planet.id;

  return (
    <ElementPlanet
      ref={groupRef}
      texturePath={planet.texturePath}
      size={4}
      scale={isActive ? 1.2 : 1}
      isActive={isActive}
    />
  );
}

function SongPlanetMesh({ song }: { song: SongPlanet }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = song.texturePath ? useTexture(song.texturePath) : null;
  const { updatePosition, activePlanetId, positions } = usePlanetPositions();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const elementPosition = positions.get(song.elementId);
      if (elementPosition) {
        const time = clock.getElapsedTime();
        const angle = time * song.orbitSpeed;
        const localX = Math.cos(angle) * song.orbitRadius;
        const localZ = Math.sin(angle) * song.orbitRadius;
        
        const x = elementPosition.x + localX;
        const z = elementPosition.z + localZ;
        
        meshRef.current.position.set(x, 0, z);
        
        updatePosition(song.id, {
          x,
          y: 0,
          z,
          data: song
        });
      }
    }
  });

  const isActive = activePlanetId === song.id;
  const scale = song.released ? (isActive ? 1.3 : 1) : (isActive ? 1.1 : 0.8);

  return (
    <mesh ref={meshRef} scale={scale}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial 
        map={texture}
        color={song.released ? 0xffffff : 0x666666}
        opacity={song.released ? 1 : 0.7}
        transparent={!song.released}
        emissive={isActive ? new THREE.Color(0x222222) : new THREE.Color(0x000000)}
      />
      {isActive && (
        <mesh scale={1.2}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial 
            color={song.released ? 0x6366f1 : 0x9ca3af} 
            transparent 
            opacity={0.3} 
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </mesh>
  );
}

export function Planets({ zoomLevel }: PlanetsProps) {
  const { camera } = useThree();

  useFrame(() => {
    const targetDistance = CAMERA_BASE_DISTANCE / zoomLevel;
    const currentDistance = camera.position.length();
    const newDistance = THREE.MathUtils.lerp(currentDistance, targetDistance, CAMERA_ZOOM_LERP);
    
    camera.position.normalize().multiplyScalar(newDistance);
    camera.lookAt(0, 0, 0);
  });

  const songsByElement = useMemo(() => {
    return songPlanets.reduce((acc, song) => {
      if (!acc[song.elementId]) acc[song.elementId] = [];
      acc[song.elementId].push(song);
      return acc;
    }, {} as Record<string, SongPlanet[]>);
  }, []);

  return (
    <group>
      <CenterPlanet />
      
      {elementPlanets.map((planet) => (
        <ElementPlanetMesh key={planet.id} planet={planet} />
      ))}
      
      {Object.entries(songsByElement).map(([elementId, songs]) =>
        songs.map((song) => (
          <SongPlanetMesh key={song.id} song={song} />
        ))
      )}
    </group>
  );
}