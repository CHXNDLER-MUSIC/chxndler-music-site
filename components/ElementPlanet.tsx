'use client';

import React, { forwardRef } from 'react';
import { Billboard } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

interface ElementPlanetProps {
  texturePath: string;
  position?: [number, number, number];
  size?: number;
  scale?: number;
  isActive?: boolean;
  children?: React.ReactNode;
}

export const ElementPlanet = forwardRef<THREE.Group, ElementPlanetProps>(
  ({ texturePath, position, size = 4, scale = 1, isActive = false, children }, ref) => {
    const texture = useLoader(THREE.TextureLoader, texturePath);

    // Configure texture for transparency
    texture.colorSpace = THREE.SRGBColorSpace;

    return (
      <group ref={ref} position={position} scale={scale}>
        <Billboard>
          <planeGeometry args={[size, size]} />
          <meshStandardMaterial
            map={texture}
            transparent={true}
            alphaTest={0.2}
            side={THREE.DoubleSide}
            emissive={isActive ? new THREE.Color(0x333333) : new THREE.Color(0x111111)}
            emissiveIntensity={isActive ? 0.2 : 0.1}
            roughness={0.7}
            metalness={0.3}
          />
        </Billboard>
        {isActive && (
          <Billboard>
            <planeGeometry args={[size * 1.1, size * 1.1]} />
            <meshBasicMaterial 
              color={0x6366f1} 
              transparent 
              opacity={0.3}
            />
          </Billboard>
        )}
        {children}
      </group>
    );
  }
);

ElementPlanet.displayName = 'ElementPlanet';