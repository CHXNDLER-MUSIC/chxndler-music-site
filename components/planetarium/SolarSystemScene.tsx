'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { OrbitGroup } from './OrbitGroup';
import { InstancedStars } from './InstancedStars';
import { HoloGrid } from './HoloGrid';
import { OrbitRings } from './OrbitRings';
import type { SongWithElement } from '@/hooks/useSongs';

interface SolarSystemSceneProps {
  songs: SongWithElement[];
  songsByElement: Record<string, SongWithElement[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
  quality: 'low' | 'high';
}

export const SolarSystemScene = React.memo(({ 
  songs, 
  songsByElement, 
  zoomLevel, 
  onPlanetSelect,
  quality 
}: SolarSystemSceneProps) => {
  console.log('🌌 SolarSystemScene rendering with:', { songCount: songs.length, quality });
  const { camera } = useThree();
  const centerPlanetRef = useRef<THREE.Group>(null);
  const elementOrbitRef = useRef<THREE.Group>(null);
  
  // Memoized planet configurations
  const planetConfigs = useMemo(() => {
    const configs = [
      {
        id: 'center',
        type: 'center' as const,
        position: [0, 0, 0] as [number, number, number],
        radius: 3,
        color: 0xffaa00,
        orbitRadius: 0,
        orbitSpeed: 0
      },
      {
        id: 'heart',
        type: 'heart' as const,
        position: [0, 0, 18] as [number, number, number],
        radius: 2,
        color: 0xff6b9d,
        orbitRadius: 18,
        orbitSpeed: 0.008
      },
      {
        id: 'water', 
        type: 'water' as const,
        position: [18, 0, 0] as [number, number, number],
        radius: 2,
        color: 0x4fc3f7,
        orbitRadius: 18,
        orbitSpeed: 0.008
      },
      {
        id: 'lightning',
        type: 'lightning' as const,
        position: [0, 0, -18] as [number, number, number],
        radius: 2,
        color: 0xffeb3b,
        orbitRadius: 18,
        orbitSpeed: 0.008
      },
      {
        id: 'darkness',
        type: 'darkness' as const,
        position: [-18, 0, 0] as [number, number, number],
        radius: 2,
        color: 0x9c27b0,
        orbitRadius: 18,
        orbitSpeed: 0.008
      }
    ];
    
    return configs;
  }, []);
  
  // Memoized geometries and materials
  const { geometries, materials } = useMemo(() => {
    const geoms = {
      center: new THREE.SphereGeometry(3, quality === 'high' ? 32 : 16, quality === 'high' ? 32 : 16),
      element: new THREE.SphereGeometry(2, quality === 'high' ? 24 : 12, quality === 'high' ? 24 : 12)
    };
    
    const mats = planetConfigs.reduce((acc, config) => {
      if (config.type === 'center') {
        acc[config.id] = new THREE.MeshStandardMaterial({
          color: config.color,
          emissive: new THREE.Color(config.color),
          emissiveIntensity: 0.2,
          metalness: 0.1,
          roughness: 0.8
        });
      } else {
        acc[config.id] = new THREE.MeshStandardMaterial({
          color: config.color,
          emissive: new THREE.Color(config.color),
          emissiveIntensity: 0.3,
          metalness: config.type === 'water' ? 0.8 : 0.1,
          roughness: config.type === 'water' ? 0.1 : 0.8,
          transparent: config.type === 'water',
          opacity: config.type === 'water' ? 0.9 : 1.0
        });
      }
      return acc;
    }, {} as Record<string, THREE.Material>);
    
    return { geometries: geoms, materials: mats };
  }, [planetConfigs, quality]);
  
  // Memoized element positions for orbit groups
  const elementPositions = useMemo(() => {
    return planetConfigs
      .filter(config => config.type !== 'center')
      .reduce((acc, config) => {
        acc[config.type] = config.position;
        return acc;
      }, {} as Record<string, [number, number, number]>);
  }, [planetConfigs]);
  
  // Animation for element planet orbits
  useFrame((state) => {
    if (elementOrbitRef.current) {
      elementOrbitRef.current.rotation.y = state.clock.elapsedTime * 0.008;
    }
  });
  
  // Update camera zoom
  React.useEffect(() => {
    const targetDistance = 25 / zoomLevel;
    const currentDistance = camera.position.length();
    const direction = camera.position.clone().normalize();
    camera.position.copy(direction.multiplyScalar(targetDistance));
  }, [zoomLevel, camera]);
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Controls */}
      <OrbitControls 
        enablePan={false}
        minDistance={10}
        maxDistance={100}
        enableDamping
        dampingFactor={0.05}
      />
      
      {/* Stars */}
      <InstancedStars
        count={quality === 'high' ? 1000 : 500}
        quality={quality}
      />

      {/* Holographic Background Grid - subtle perspective grid behind planets */}
      <HoloGrid
        opacity={0.08}
        color="#00d4aa"
        gridSize={2.5}
        fadeRadius={0.85}
        position={[0, -8, 0]}
        rotation={[-Math.PI / 2.3, 0, 0]}
        scale={100}
        enableParallax={true}
      />

      {/* Optional: Faint Orbital Rings for depth */}
      <OrbitRings
        color="#00d4aa"
        baseOpacity={0.05}
        position={[0, 0, 0]}
        ringConfigs={[
          { radius: 22, opacity: 0.06, rotationSpeed: 0.002, tilt: Math.PI / 14 },
          { radius: 32, opacity: 0.04, rotationSpeed: -0.0015, tilt: Math.PI / 20 },
          { radius: 42, opacity: 0.025, rotationSpeed: 0.001, tilt: Math.PI / 28 }
        ]}
      />

      {/* Simplified test - just render some basic spheres first */}
      {/* Center Planet */}
      <mesh position={[0, 0, 0]} onClick={() => onPlanetSelect?.('center')}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshStandardMaterial 
          color={0xffaa00}
          emissive={0xffaa00}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Test planet to make sure something renders */}
      <mesh position={[0, 0, 18]} onClick={() => onPlanetSelect?.('heart')}>
        <sphereGeometry args={[2, 24, 24]} />
        <meshStandardMaterial 
          color={0xff6b9d}
          emissive={0xff6b9d}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      <mesh position={[18, 0, 0]} onClick={() => onPlanetSelect?.('water')}>
        <sphereGeometry args={[2, 24, 24]} />
        <meshStandardMaterial 
          color={0x4fc3f7}
          emissive={0x4fc3f7}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      <mesh position={[0, 0, -18]} onClick={() => onPlanetSelect?.('lightning')}>
        <sphereGeometry args={[2, 24, 24]} />
        <meshStandardMaterial 
          color={0xffeb3b}
          emissive={0xffeb3b}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      <mesh position={[-18, 0, 0]} onClick={() => onPlanetSelect?.('darkness')}>
        <sphereGeometry args={[2, 24, 24]} />
        <meshStandardMaterial 
          color={0x9c27b0}
          emissive={0x9c27b0}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Element Planets with Orbiting Groups */}
      <group ref={elementOrbitRef}>
        {planetConfigs
          .filter(config => config.type !== 'center')
          .map((config) => (
            <group key={config.id}>
              {/* Song Orbit Group */}
              <OrbitGroup
                elementPosition={config.position}
                songs={songsByElement[config.type] || []}
                elementType={config.type}
                orbitSpeed={0.1}
                quality={quality}
                onPlanetSelect={onPlanetSelect}
              />
            </group>
          ))}
      </group>
    </>
  );
});

SolarSystemScene.displayName = 'SolarSystemScene';