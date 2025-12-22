'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
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
import HologramGrid from './HologramGrid';
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
import {
  HologramPlanetMaterial,
  updateHologramTime,
  getHologramPreset,
} from '@/utils/hologramPlanetMaterial';

// Extend Three.js with the hologram material for JSX usage
extend({ HologramPlanetMaterial });

// Add type declaration for the extended material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      hologramPlanetMaterial: any;
    }
  }
}

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

  // Get center preset colors
  const preset = useMemo(() => getHologramPreset('center'), []);

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

  return (
    <group position={[config.position!.x, config.position!.y, config.position!.z]}>
      {/* Hologram planet mesh */}
      <mesh
        ref={meshRef}
        scale={isActive ? ACTIVE_SCALE_FACTOR : 1}
      >
        <sphereGeometry args={geometry} />
        <hologramPlanetMaterial
          preset="center"
          alpha={isActive ? 1.0 : 0.9}
        />
      </mesh>
      {/* Active glow */}
      {isActive && (
        <mesh scale={ACTIVE_GLOW_SCALE * (isActive ? ACTIVE_SCALE_FACTOR : 1)}>
          <sphereGeometry args={geometry} />
          <meshBasicMaterial
            color={ACTIVE_GLOW_COLOR}
            transparent
            opacity={ACTIVE_GLOW_OPACITY}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
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

  // Memoize geometry to avoid recreation (slightly more segments for hologram effect)
  const geometry = useMemo(() => [SONG_PLANET_RADIUS, 24, 24] as const, []);

  // Get element preset for this song
  const elementPreset = useMemo(() => song.elementId.toLowerCase(), [song.elementId]);

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
      <sphereGeometry args={geometry} />
      <hologramPlanetMaterial
        preset={song.released ? elementPreset : 'center'}
        alpha={song.released ? (isActive ? 1.0 : 0.92) : 0.6}
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

  useFrame((state) => {
    // Drive the shared hologram planet time uniform
    updateHologramTime(state.clock.getElapsedTime());
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
      {/* Lightweight hologram grid behind planets */}
      <HologramGrid 
        width={100}
        height={100}
        cellSize={2}
        textureSize={64}
        baseZ={-0.28}
        zOffset={-0.04}
        baseOpacity={0.16}
        secondaryOpacity={0.08}
      />
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
