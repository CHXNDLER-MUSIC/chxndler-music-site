'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SongWithElement } from '@/hooks/useSongs';

interface OrbitGroupProps {
  elementPosition: [number, number, number];
  songs: SongWithElement[];
  elementType: 'heart' | 'water' | 'lightning' | 'darkness';
  orbitSpeed: number;
  quality: 'low' | 'high';
  onPlanetSelect?: (planetId: string) => void;
}

export const OrbitGroup = React.memo(({ 
  elementPosition, 
  songs, 
  elementType, 
  orbitSpeed,
  quality,
  onPlanetSelect 
}: OrbitGroupProps) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Memoized song planet configurations
  const songConfigs = useMemo(() => {
    if (!songs.length) return [];
    
    const configs = songs.map((song, index) => {
      // Distribute songs in concentric rings
      const songsPerRing = Math.ceil(Math.sqrt(songs.length));
      const ringIndex = Math.floor(index / songsPerRing);
      const positionInRing = index % songsPerRing;
      
      const angle = (positionInRing / songsPerRing) * Math.PI * 2;
      const radius = 5.5 + ringIndex * 1.5;
      
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      
      return {
        id: song.id,
        position: [x, 0, z] as [number, number, number],
        isReleased: song.is_released,
        title: song.title
      };
    });
    
    return configs;
  }, [songs]);
  
  // Memoized materials
  const materials = useMemo(() => {
    const elementColors = {
      heart: 0xff69b4,
      water: 0x00bfff, 
      lightning: 0xffff00,
      darkness: 0x8a2be2
    };
    
    const releasedMaterial = new THREE.MeshStandardMaterial({
      color: elementColors[elementType],
      emissive: new THREE.Color(elementColors[elementType]),
      emissiveIntensity: 0.3,
      metalness: 0.1,
      roughness: 0.3
    });
    
    const unreleasedMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      emissive: new THREE.Color(0x333333),
      emissiveIntensity: 0.1,
      metalness: 0.3,
      roughness: 0.8
    });
    
    return { releasedMaterial, unreleasedMaterial };
  }, [elementType]);
  
  // Memoized geometry
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(0.4, quality === 'high' ? 16 : 8, quality === 'high' ? 16 : 8);
  }, [quality]);
  
  // Orbit animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * orbitSpeed;
    }
  });
  
  const handleClick = React.useCallback((songId: string) => {
    if (onPlanetSelect) {
      onPlanetSelect(songId);
    }
  }, [onPlanetSelect]);
  
  if (songConfigs.length === 0) return null;
  
  return (
    <group ref={groupRef} position={elementPosition}>
      {songConfigs.map((config) => (
        <group key={config.id} position={config.position}>
          {/* Main planet */}
          <mesh
            geometry={geometry}
            material={config.isReleased ? materials.releasedMaterial : materials.unreleasedMaterial}
            onClick={() => handleClick(config.id)}
            userData={{ songId: config.id, title: config.title }}
          />
          
          {/* Cheap halo effect for released songs */}
          {config.isReleased && quality === 'high' && (
            <mesh position={[0, 0, 0]} scale={1.3}>
              <sphereGeometry args={[0.4, 8, 8]} />
              <meshBasicMaterial
                color={elementType === 'heart' ? 0xff69b4 : 
                       elementType === 'water' ? 0x00bfff :
                       elementType === 'lightning' ? 0xffff00 : 0x8a2be2}
                transparent
                opacity={0.2}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
});

OrbitGroup.displayName = 'OrbitGroup';