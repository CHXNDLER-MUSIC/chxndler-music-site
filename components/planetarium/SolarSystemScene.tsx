'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { OrbitGroup } from './OrbitGroup';
import { InstancedStars } from './InstancedStars';
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
      
      {/* Center Planet */}
      <group ref={centerPlanetRef}>
        <mesh
          geometry={geometries.center}
          material={materials.center}
          onClick={() => onPlanetSelect?.('center')}
        />
        
        {/* Center planet halo */}
        {quality === 'high' && (
          <mesh scale={1.2}>
            <sphereGeometry args={[3, 16, 16]} />
            <meshBasicMaterial
              color={0xffaa00}
              transparent
              opacity={0.1}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
      
      {/* Element Planets with Orbiting Groups */}
      <group ref={elementOrbitRef}>
        {planetConfigs
          .filter(config => config.type !== 'center')
          .map((config) => (
            <group key={config.id}>
              {/* Element Planet */}
              <mesh
                position={config.position}
                geometry={geometries.element}
                material={materials[config.id]}
                onClick={() => onPlanetSelect?.(config.id)}
              />
              
              {/* Element planet halo */}
              {quality === 'high' && (
                <mesh position={config.position} scale={1.3}>
                  <sphereGeometry args={[2, 12, 12]} />
                  <meshBasicMaterial
                    color={config.color}
                    transparent
                    opacity={0.15}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>
              )}
              
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