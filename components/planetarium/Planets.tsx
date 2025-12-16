'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { usePlanetPositions } from '../planet-positions-context';
import { 
  centerPlanet, 
  elementPlanets, 
  songPlanets, 
  ElementPlanet as ElementPlanetData, 
  SongPlanet 
} from '../planet-data';
import { ElementPlanet } from '../ElementPlanet';
import { 
  CAMERA_BASE_DISTANCE, 
  CAMERA_ZOOM_LERP,
  getCenterPlanet,
  getElementPlanets,
  ACTIVE_SCALE_FACTOR,
  ACTIVE_GLOW_SCALE,
  ACTIVE_GLOW_OPACITY,
  ACTIVE_GLOW_COLOR,
  SONG_PLANET_RADIUS,
  SONG_PLANET_SEGMENTS,
  type PlanetConfig
} from './assets';

interface PlanetsProps {
  zoomLevel: number;
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

const CenterPlanet = React.memo(() => {
  const meshRef = useRef<THREE.Mesh>(null);
  const config = getCenterPlanet();
  const { updatePosition, activePlanetId } = usePlanetPositions();
  
  const centerTexture = useTexture(config.texturePath!);

  // Memoize geometry to avoid recreation
  const geometry = useMemo(() => [config.radius!, config.segments!, config.segments!] as const, [config]);

  useFrame(() => {
    if (meshRef.current) {
      updatePosition(config.id, {
        x: config.position!.x,
        y: config.position!.y,
        z: config.position!.z,
        data: centerPlanet
      });
    }
  });

  const isActive = activePlanetId === config.id;

  // Memoize emissive color to avoid object creation
  const emissiveColor = useMemo(() => 
    isActive ? new THREE.Color(0x444444) : new THREE.Color(0x000000), 
    [isActive]
  );

  return (
    <mesh 
      ref={meshRef} 
      position={[config.position!.x, config.position!.y, config.position!.z]} 
      scale={isActive ? ACTIVE_SCALE_FACTOR : 1}
    >
      <sphereGeometry args={geometry} />
      <meshStandardMaterial 
        map={centerTexture} 
        emissive={emissiveColor}
      />
      {isActive && (
        <mesh scale={ACTIVE_GLOW_SCALE}>
          <sphereGeometry args={geometry} />
          <meshBasicMaterial 
            color={ACTIVE_GLOW_COLOR} 
            transparent 
            opacity={ACTIVE_GLOW_OPACITY} 
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </mesh>
  );
});

function ElementPlanetMesh({ planet, phaseOffset }: { planet: ElementPlanetData; phaseOffset: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const { updatePosition, activePlanetId } = usePlanetPositions();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime();
      const angle = time * planet.orbitSpeed + phaseOffset;
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
      size={planet.texturePath ? 4 : 4} // Keep existing size for now
      scale={isActive ? ACTIVE_SCALE_FACTOR : 1}
      isActive={isActive}
      elementId={planet.elementId}
    />
  );
}

const SongPlanetMesh = React.memo(({ song }: { song: SongPlanet }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { updatePosition, activePlanetId, positions } = usePlanetPositions();
  
  const texture = song.texturePath ? useTexture(song.texturePath) : null;

  // Memoize geometry to avoid recreation
  const geometry = useMemo(() => [SONG_PLANET_RADIUS, SONG_PLANET_SEGMENTS, SONG_PLANET_SEGMENTS] as const, []);

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

  // Memoize emissive color to avoid object creation
  const emissiveColor = useMemo(() => 
    isActive ? new THREE.Color(0x222222) : new THREE.Color(0x000000), 
    [isActive]
  );

  return (
    <mesh ref={meshRef} scale={scale}>
      <sphereGeometry args={geometry} />
      <meshStandardMaterial 
        map={texture}
        color={song.released ? 0xffffff : 0x666666}
        opacity={song.released ? 1 : 0.7}
        transparent={!song.released}
        emissive={emissiveColor}
      />
      {isActive && (
        <mesh scale={ACTIVE_GLOW_SCALE}>
          <sphereGeometry args={geometry} />
          <meshBasicMaterial 
            color={song.released ? ACTIVE_GLOW_COLOR : 0x9ca3af} 
            transparent 
            opacity={ACTIVE_GLOW_OPACITY} 
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </mesh>
  );
});

export function Planets({ zoomLevel, initialActivePlanet, onPlanetSelect, worldId }: PlanetsProps) {
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
      
      {elementPlanets.map((planet, index) => (
        <ElementPlanetMesh 
          key={planet.id} 
          planet={planet} 
          phaseOffset={index * (Math.PI * 2) / elementPlanets.length}
        />
      ))}
      
      {Object.entries(songsByElement).map(([elementId, songs]) =>
        songs.map((song) => (
          <SongPlanetMesh key={song.id} song={song} />
        ))
      )}
    </group>
  );
}